import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/authOptions';
import { listCalendars, getWeekEvents, createCalendarEvent, countConflicts, scoreSlot } from '@/lib/calendar';
import { PLANETARY_GRID, TIME_BLOCKS, DAYS, ACTIVITIES, getBlockEndTime } from '@/lib/planetary';
import { rateLimit, LIMITS } from '@/lib/rateLimit';
import type { ActivityCode, TimeSlot, CalendarEvent } from '@/types';
import { startOfWeek, endOfWeek, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TZ = 'America/Sao_Paulo';

// Resolve access token — aceita tanto JWT de sessão quanto token interno do agente
async function resolveToken(request: NextRequest): Promise<string | null> {
  // Chamada interna do agente (server-to-server)
  const internalToken = request.headers.get('x-internal-token');
  if (internalToken) return internalToken;

  // Chamada do cliente via sessão NextAuth
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  return (token?.accessToken as string) ?? null;
}

// ─── GET /api/calendar ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const limit = rateLimit(session.user.email, 'calendar', LIMITS.calendar);
  if (!limit.allowed) return NextResponse.json({ error: 'Limite de requisições atingido' }, { status: 429 });

  const accessToken = await resolveToken(request);
  if (!accessToken) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const activityCode = searchParams.get('activity') as ActivityCode | null;

  const now       = toZonedTime(new Date(), TZ);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(now,   { weekStartsOn: 1 });

  try {
    const calendars = await listCalendars(accessToken, session.user.email);

    const allEvents: CalendarEvent[] = [];
    for (const cal of calendars.filter((c) => c.primary)) {
      const events = await getWeekEvents(accessToken, cal.id, weekStart, weekEnd);
      allEvents.push(...events.map((e) => ({ ...e, accountEmail: cal.accountEmail })));
    }

    let slots: TimeSlot[] = [];
    if (activityCode) {
      TIME_BLOCKS.forEach((block, blockIdx) => {
        const row = PLANETARY_GRID[block];
        row.forEach((code, dayIndex) => {
          if (code !== activityCode) return;
          const conflicts = countConflicts({ dayIndex, blockLabel: block } as TimeSlot, allEvents, weekStart);
          const score     = scoreSlot(dayIndex, blockIdx, conflicts);
          slots.push({
            dayIndex, dayName: DAYS[dayIndex], blockLabel: block,
            startTime: block, endTime: getBlockEndTime(block),
            activity: activityCode, planet: ACTIVITIES[activityCode].planet,
            energyType: 'solar', score, isBest: false,
            conflictCount: conflicts, available: conflicts === 0,
          });
        });
      });
      slots.sort((a, b) => b.score - a.score);
      if (slots.length > 0) slots[0].isBest = true;
    }

    return NextResponse.json({ calendars, slots, weekStart: weekStart.toISOString(), weekEnd: weekEnd.toISOString(), eventCount: allEvents.length });
  } catch (err) {
    console.error('Erro na API de calendário:', err);
    return NextResponse.json({ error: 'Erro ao buscar calendário' }, { status: 500 });
  }
}

// ─── POST /api/calendar ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const limit = rateLimit(session.user.email, 'calendar', LIMITS.calendar);
  if (!limit.allowed) return NextResponse.json({ error: 'Limite de requisições atingido' }, { status: 429 });

  const accessToken = await resolveToken(request);
  if (!accessToken) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const body = await request.json() as CalendarEvent;
  if (!body.title || !body.start || !body.end || !body.calendarId) {
    return NextResponse.json({ error: 'Campos obrigatórios: title, start, end, calendarId' }, { status: 400 });
  }

  const safeGuests = (body.guestEmails ?? [])
    .filter((e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    .slice(0, 50);

  try {
    const result = await createCalendarEvent(accessToken, { ...body, guestEmails: safeGuests });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Erro ao criar evento:', err);
    return NextResponse.json({ error: 'Erro ao criar evento' }, { status: 500 });
  }
}
