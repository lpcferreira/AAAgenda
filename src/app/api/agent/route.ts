import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '../auth/[...nextauth]/route';
import Anthropic from '@anthropic-ai/sdk';
import { ACTIVITIES, DAYS, PLANETARY_GRID, TIME_BLOCKS } from '@/lib/planetary';
import { createCalendarEvent, listCalendars, getWeekEvents } from '@/lib/calendar';
import { rateLimit, LIMITS } from '@/lib/rateLimit';
import type { ActivityCode, TimeSlot } from '@/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helpers de data ──────────────────────────────────────────────────

function toSP(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function buildWeekMap(todayISO: string, weeks: number): string {
  const today = new Date(todayISO + 'T00:00:00-03:00');
  const lines: string[] = [];
  for (let d = 0; d < weeks * 7; d++) {
    const day = addDays(today, d);
    const dayOfWeek = day.getDay();
    const gridIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dateStr = day.toISOString().slice(0, 10);
    const dayLabel = day.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short', day: '2-digit', month: '2-digit',
    });
    const slots = TIME_BLOCKS.map(b => `${b}=${PLANETARY_GRID[b][gridIdx]}`).join(' ');
    lines.push(`${dateStr} (${dayLabel}): ${slots}`);
  }
  return lines.join('\n');
}

// ─── Calendários ignorados na verificação de conflitos ────────────────
const IGNORED_CALENDAR_KEYWORDS = [
  'family', 'família', 'familia',
  'aniversário', 'aniversario', 'birthday', 'anniversaries',
  'feriado', 'holiday', 'contacts',
];

function isIgnoredCalendar(calId: string, calSummary?: string): boolean {
  const text = `${calId} ${calSummary ?? ''}`.toLowerCase();
  return IGNORED_CALENDAR_KEYWORDS.some(kw => text.includes(kw));
}

// ─── System prompt — linguagem de produtividade ───────────────────────

const BASE_SYSTEM = `Você é o Agente AAA — assistente executivo de agendamento do AAAgenda.

Você fala em português brasileiro, de forma direta, prática e profissional.
Não use linguagem mística, astrológica ou espiritual. 
Use sempre linguagem de produtividade, ritmo de trabalho e gestão de tempo.

EXEMPLOS de como traduzir:
- NÃO diga: "hora de Saturno", "energia saturniana", "Mercúrio ativo"
- DIGA: "bloco de foco profundo", "momento ideal para comunicação", "horário de alta concentração"
- NÃO diga: "energia lunar", "vibração de Vênus"
- DIGA: "período receptivo", "bloco para conexão social"

TIPOS DE ATIVIDADE (use os nomes, não os planetas):
A = Superiores — reuniões de alto impacto com líderes e clientes VIP
B = Só/Foco — trabalho solo de alta concentração
C = Estudos — aprendizado e absorção de informação
D = Amigos — encontros sociais e networking informal
E = Profissional — reuniões de trabalho e negociações
F = Colheita — fechamento de negócios e resultados
G = Físico — exercícios e atividades físicas

GRADE DE BLOCOS (dia da semana → perfil de cada bloco):
Seg: 07→A(impacto) 10:15→E(profissional) 13:45→F(fechamento) 17→G(físico)
Ter: 07→E(profissional) 10:15→A(impacto) 13:45→B(foco) 17→C(estudos)
Qua: 07→A(impacto) 10:15→D(social) 13:45→E(profissional) 17→F(fechamento)
Qui: 07→D(social) 10:15→G(físico) 13:45→A(impacto) 17→B(foco)
Sex: 07→G(físico) 10:15→C(estudos) 13:45→D(social) 17→E(profissional)
Sáb: 07→C(estudos) 10:15→B(foco) 13:45→G(físico) 17→A(impacto)
Dom: 07→B(foco) 10:15→E(profissional) 13:45→C(estudos) 17→D(social)

REGRAS ABSOLUTAS:
1. SEMPRE use check_availability antes de sugerir qualquer horário
2. NUNCA invente disponibilidade — chame a ferramenta e use o resultado real
3. Se um slot tem conflito, NÃO sugira esse slot
4. Use as datas exatas da tabela de calendário fornecida no contexto
5. Ao criar eventos, use create_event imediatamente sem pedir confirmação adicional
6. Calendários de família e aniversários NÃO são bloqueios

DESCRIPTION DO EVENTO (inclua sempre):
📅 Agendado pelo AAAgenda
Tipo: [nome da atividade]
Perfil do bloco: [descrição de produtividade — sem menção a planetas]
Dica: [conselho prático para aproveitar o horário]
---
Sistema de blocos baseado na grade de Arnaldo Avileis`;

// ─── Ferramentas ──────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_availability',
    description: 'Verifica disponibilidade em um horário específico consultando TODAS as agendas do usuário. Retorna eventos encontrados e se há conflito. SEMPRE chame antes de sugerir um slot.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date:       { type: 'string', description: 'Data YYYY-MM-DD' },
        start_time: { type: 'string', description: 'HH:MM' },
        end_time:   { type: 'string', description: 'HH:MM' },
      },
      required: ['date', 'start_time', 'end_time'],
    },
  },
  {
    name: 'create_event',
    description: 'Cria um evento no Google Calendar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title:         { type: 'string' },
        date:          { type: 'string', description: 'YYYY-MM-DD' },
        start_time:    { type: 'string', description: 'HH:MM' },
        end_time:      { type: 'string', description: 'HH:MM' },
        calendar_id:   { type: 'string', description: 'email da agenda' },
        guest_emails:  { type: 'array', items: { type: 'string' } },
        description:   { type: 'string' },
        activity_code: { type: 'string' },
      },
      required: ['title', 'date', 'start_time', 'end_time', 'calendar_id'],
    },
  },
];

// ─── Tipos ────────────────────────────────────────────────────────────

interface AccountToken {
  email: string;
  accessToken: string;
}

// ─── Extrai tokens de TODAS as contas do JWT ──────────────────────────

async function getAllAccountTokens(request: NextRequest): Promise<AccountToken[]> {
  const jwt = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!jwt) return [];

  const tokens: AccountToken[] = [];

  if (jwt.accessToken && jwt.primaryEmail) {
    tokens.push({
      email:       jwt.primaryEmail as string,
      accessToken: jwt.accessToken as string,
    });
  }

  const linked = (jwt.linkedAccounts as Array<{ email: string; accessToken: string }>) ?? [];
  for (const acc of linked) {
    if (acc.accessToken && acc.email) {
      tokens.push({ email: acc.email, accessToken: acc.accessToken });
    }
  }

  return tokens;
}

// ─── check_availability — consulta real em todas as contas ────────────

async function runCheckAvailability(
  input: { date: string; start_time: string; end_time: string },
  accountTokens: AccountToken[],
  calendarList: Array<{ id: string; accountEmail: string; summary?: string }>
): Promise<string> {
  try {
    const start = new Date(`${input.date}T${input.start_time}:00-03:00`);
    const end   = new Date(`${input.date}T${input.end_time}:00-03:00`);

    const allEvents: Array<{
      account: string; calendar: string; title: string; start: string; end: string;
    }> = [];

    for (const { email, accessToken } of accountTokens) {
      // Calendários desta conta — filtra os ignorados
      const accountCals = calendarList.filter(c =>
        (c.accountEmail === email || c.id === email) &&
        !isIgnoredCalendar(c.id, c.summary)
      );

      // Se não encontrou calendários mapeados, tenta o email principal da conta
      const calsToCheck = accountCals.length > 0
        ? accountCals
        : [{ id: email, accountEmail: email, summary: email }];

      for (const cal of calsToCheck) {
        if (isIgnoredCalendar(cal.id, cal.summary)) continue;
        try {
          const events = await getWeekEvents(accessToken, cal.id, start, end);
          for (const e of events) {
            // Ignora eventos de dia inteiro
            if (e.start && !e.start.includes('T')) continue;
            allEvents.push({
              account:  email,
              calendar: cal.id,
              title:    e.title,
              start:    e.start,
              end:      e.end,
            });
          }
        } catch { /* agenda sem permissão ou vazia — ignora */ }
      }
    }

    if (allEvents.length === 0) {
      return JSON.stringify({
        free: true,
        conflicts: [],
        accounts_checked: accountTokens.map(t => t.email),
        message: 'Horário livre em todas as agendas.',
      });
    }

    return JSON.stringify({
      free: false,
      conflicts: allEvents,
      accounts_checked: accountTokens.map(t => t.email),
      message: `${allEvents.length} conflito(s) encontrado(s).`,
    });
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}

// ─── create_event ─────────────────────────────────────────────────────

async function runCreateEvent(
  input: {
    title: string; date: string; start_time: string; end_time: string;
    calendar_id: string; guest_emails?: string[]; description?: string;
    activity_code?: string;
  },
  accessToken: string
): Promise<string> {
  try {
    const result = await createCalendarEvent(accessToken, {
      title:        input.title,
      start:        `${input.date}T${input.start_time}:00-03:00`,
      end:          `${input.date}T${input.end_time}:00-03:00`,
      calendarId:   input.calendar_id,
      accountEmail: '',
      guestEmails:  (input.guest_emails ?? []).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
      activityCode: input.activity_code as ActivityCode | undefined,
      description:  input.description,
      planetaryNote: input.description,
    });
    return JSON.stringify({ success: true, id: result.id, link: result.htmlLink });
  } catch (err) {
    return JSON.stringify({ success: false, error: String(err) });
  }
}

// ─── Route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const limit = rateLimit(session.user.email, 'agent', LIMITS.agent);
  if (!limit.allowed) {
    const resetIn = Math.ceil((limit.resetAt - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Limite de mensagens atingido. Tente novamente em ${resetIn} minutos.` },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { messages, context } = body as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    context?: {
      selectedActivity?: ActivityCode;
      availableSlots?: TimeSlot[];
      weekStart?: string;
      today?: string;
      userEmail?: string;
      calendars?: Array<{ id: string; summary: string }>;
    };
  };

  // Tokens de TODAS as contas — lidos diretamente do JWT
  const accountTokens = await getAllAccountTokens(request);
  const accessToken = body.accessToken ?? accountTokens[0]?.accessToken;

  // Data atual
  const nowSP    = toSP(new Date());
  const todayISO = context?.today
    ? context.today.slice(0, 10)
    : nowSP.toISOString().slice(0, 10);
  const todayLabel = formatDateBR(new Date(todayISO + 'T12:00:00-03:00'));

  // Lista calendários de todas as contas
  let calendarList: Array<{ id: string; accountEmail: string; summary?: string }> = [];
  for (const { email, accessToken: token } of accountTokens) {
    try {
      const cals = await listCalendars(token, email);
      calendarList.push(...cals.map(c => ({
        id:           c.id,
        accountEmail: email,
        summary:      c.summary,
      })));
    } catch { /* conta sem permissão */ }
  }

  // Fallback para contexto do frontend
  if (calendarList.length === 0 && context?.calendars) {
    calendarList = context.calendars.map(c => ({ id: c.id, accountEmail: c.id, summary: c.summary }));
  }

  const weekMap  = buildWeekMap(todayISO, 3);
  const calNames = calendarList
    .filter(c => !isIgnoredCalendar(c.id, c.summary))
    .map(c => `${c.summary ?? c.id} (${c.accountEmail})`)
    .join(', ');

  const system = `${BASE_SYSTEM}

## Contexto atual
Hoje: ${todayLabel} (${todayISO})
Usuário: ${session.user.email}
Contas conectadas (${accountTokens.length}): ${accountTokens.map(t => t.email).join(', ')}
Agendas verificadas (excluindo família/aniversários): ${calNames || 'nenhuma detectada'}

## Calendário das próximas 3 semanas
${weekMap}`;

  const agentMessages: Anthropic.MessageParam[] = messages
    .slice(-10)
    .map(m => ({
      role:    (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: String(m.content).slice(0, 3000),
    }));

  let finalText = '';
  let totalCreated = 0;
  let totalErrors  = 0;

  for (let i = 0; i < 20; i++) {
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system,
      tools:      TOOLS,
      messages:   agentMessages,
    });

    const textBlocks = response.content.filter(b => b.type === 'text');
    if (textBlocks.length > 0) {
      finalText = textBlocks.map(b => (b as Anthropic.TextBlock).text).join('\n');
    }

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason === 'tool_use') {
      const toolCalls = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];
      agentMessages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const call of toolCalls) {
        let result = '';

        if (call.name === 'check_availability') {
          const input = call.input as { date: string; start_time: string; end_time: string };
          result = accountTokens.length > 0
            ? await runCheckAvailability(input, accountTokens, calendarList)
            : JSON.stringify({ error: 'Nenhum token disponível — faça login novamente' });

        } else if (call.name === 'create_event') {
          const input = call.input as {
            title: string; date: string; start_time: string; end_time: string;
            calendar_id: string; guest_emails?: string[]; description?: string;
            activity_code?: string;
          };
          if (accessToken) {
            result = await runCreateEvent(input, accessToken);
            const parsed = JSON.parse(result);
            if (parsed.success) totalCreated++;
            else totalErrors++;
          } else {
            result = JSON.stringify({ success: false, error: 'Token não disponível' });
            totalErrors++;
          }
        }

        toolResults.push({ type: 'tool_result', tool_use_id: call.id, content: result });
      }

      agentMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    break;
  }

  const actionResult = (totalCreated > 0 || totalErrors > 0)
    ? { type: 'created', eventsCreated: totalCreated, errors: totalErrors }
    : null;

  return NextResponse.json(
    { text: finalText, actionResult, slotSuggestion: null },
    { headers: { 'X-RateLimit-Remaining': String(limit.remaining) } }
  );
}
