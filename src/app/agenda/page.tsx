'use client';
import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { PLANETARY_GRID, TIME_BLOCKS, DAYS, ACTIVITIES, ACTIVITY_COLORS } from '@/lib/planetary';
import type { ActivityCode, TimeSlot, AgentMessage, CalendarInfo, CalendarEvent } from '@/types';
import styles from './agenda.module.css';
import { SplashScreen } from '@/components/SplashScreen';

// ─── Componente principal ─────────────────────────────────────────────

export default function AgendaPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [selectedActivity, setSelectedActivity] = useState<ActivityCode | null>(null);
  const [selectedSlot, setSelectedSlot]         = useState<TimeSlot | null>(null);
  const [slots, setSlots]                       = useState<TimeSlot[]>([]);
  const [calendars, setCalendars]               = useState<CalendarInfo[]>([]);
  const [messages, setMessages]                 = useState<AgentMessage[]>([]);
  const [chatInput, setChatInput]               = useState('');
  const [isThinking, setIsThinking]             = useState(false);
  const [showCreateForm, setShowCreateForm]     = useState(false);
  const [evtTitle, setEvtTitle]                 = useState('');
  const [evtCalendar, setEvtCalendar]           = useState('');
  const [evtGuests, setEvtGuests]               = useState('');
  const [linkedEmails, setLinkedEmails]         = useState<string[]>([]);
  const [isCreating, setIsCreating]             = useState(false);
  const [toast, setToast]                       = useState<string | null>(null);
  const [showSplash, setShowSplash]             = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  const searchParams = useSearchParams();

  // Força refresh da sessão UMA VEZ quando volta do link-account
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (searchParams.get('update') !== '1') return;
    // Remove ?update=1 da URL para evitar loop
    const url = new URL(window.location.href);
    url.searchParams.delete('update');
    url.searchParams.delete('linked');
    window.history.replaceState({}, '', url.toString());
    // Dispara update uma única vez
    update();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // intencional: só roda na montagem/autenticação

  // Sincroniza linkedEmails sempre que a sessão mudar (incluindo após update())
  useEffect(() => {
    if (status !== 'authenticated') return;
    const linked = (session as unknown as Record<string, unknown>).linkedEmails as string[] ?? [];
    setLinkedEmails(linked);
  }, [status, session]);

  // Dispara splash uma única vez quando sessão autentica pela primeira vez
  const splashShown = React.useRef(false);
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (splashShown.current) return;
    splashShown.current = true;
    setShowSplash(true);
  }, [status]);

  // Load calendars on mount
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/calendar')
      .then((r) => r.json())
      .then((data) => {
        setCalendars(data.calendars ?? []);
        if (data.calendars?.length) setEvtCalendar(data.calendars[0].id);
      });

    // Mensagem de boas-vindas
    const todayName = format(new Date(), 'EEEE', { locale: ptBR });
    addAgentMessage(`Bom dia! Hoje é ${todayName} — selecione um tipo de atividade para ver os melhores horários desta semana, ou me diga o que você precisa agendar.`);
  }, [status]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Funções ────────────────────────────────────────────────────────

  function addAgentMessage(content: string, slotSuggestion?: TimeSlot) {
    setMessages((prev) => [...prev, {
      id:        crypto.randomUUID(),
      role:      'agent',
      content,
      timestamp: new Date(),
      slotSuggestion,
    }]);
  }

  function addUserMessage(content: string) {
    setMessages((prev) => [...prev, {
      id:        crypto.randomUUID(),
      role:      'user',
      content,
      timestamp: new Date(),
    }]);
  }

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  async function selectActivity(code: ActivityCode) {
    setSelectedActivity(code);
    setSelectedSlot(null);
    setShowCreateForm(false);

    // Busca slots com dados reais do calendário
    const res  = await fetch(`/api/calendar?activity=${code}`);
    const data = await res.json();
    setSlots(data.slots ?? []);

    // Pede ao agente para comentar
    await sendToAgent(
      `Quero agendar: ${ACTIVITIES[code].name}`,
      code,
      data.slots ?? []
    );
  }

  async function sendToAgent(
    userText: string,
    actCode?: ActivityCode,
    availSlots?: TimeSlot[]
  ) {
    setIsThinking(true);

    const allMessages = [
      ...messages.filter((m) => m.role !== 'agent' || !m.content.startsWith('Bom dia')),
      { role: 'user' as const, content: userText },
    ].map((m) => ({ role: m.role === 'agent' ? 'assistant' : 'user', content: m.content }));

    // Busca token do JWT para o agente poder criar eventos
    let agentToken: string | undefined;
    try {
      const tokenRes = await fetch('/api/auth/token');
      if (tokenRes.ok) { const t = await tokenRes.json(); agentToken = t.accessToken; }
    } catch { /* sem token, agente opera em modo sugestão */ }

    try {
      const res = await fetch('/api/agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: allMessages,
          accessToken: agentToken,
          context: {
            selectedActivity: actCode ?? selectedActivity,
            availableSlots:   availSlots ?? slots,
            weekStart:        weekStart.toISOString(),
            userEmail:        session?.user?.email,
            calendars:        calendars.map((c) => ({ id: c.id, summary: c.summary })),
            today:            new Date().toISOString(),
          },
        }),
      });
      const data = await res.json();

      // Slot sugerido
      let suggestedSlot: TimeSlot | undefined;
      if (data.slotSuggestion && slots.length) {
        suggestedSlot = slots.find(
          (s) => s.dayIndex === data.slotSuggestion.dayIndex &&
                 s.blockLabel === data.slotSuggestion.block
        );
      }

      // Feedback de eventos criados
      if (data.actionResult?.events?.length) {
        const count = data.actionResult.events.length;
        const ok    = data.actionResult.events.filter((e: Record<string,unknown>) => e.id).length;
        const fail  = count - ok;
        let confirmMsg = data.text;
        if (ok > 0) confirmMsg += `

✅ ${ok} evento${ok > 1 ? 's criados' : ' criado'} na agenda.`;
        if (fail > 0) confirmMsg += `
⚠️ ${fail} evento${fail > 1 ? 's com erro' : ' com erro'} — verifique as permissões.`;
        addAgentMessage(confirmMsg, suggestedSlot);
      } else {
        addAgentMessage(data.text, suggestedSlot);
      }
    } catch {
      addAgentMessage('Desculpe, tive um problema para processar. Tente novamente.');
    } finally {
      setIsThinking(false);
    }
  }

  async function handleChatSend() {
    const text = chatInput.trim();
    if (!text || isThinking) return;
    setChatInput('');
    addUserMessage(text);
    await sendToAgent(text);
  }

  function selectSlot(slot: TimeSlot) {
    setSelectedSlot(slot);
    setShowCreateForm(true);
  }

  async function createEvent() {
    if (!selectedSlot || !evtTitle.trim()) return;
    setIsCreating(true);

    const dayDate = addDays(weekStart, selectedSlot.dayIndex);
    const [sh, sm] = selectedSlot.startTime.split(':').map(Number);
    const [eh, em] = selectedSlot.endTime.split(':').map(Number);

    const start = new Date(dayDate); start.setHours(sh, sm, 0, 0);
    const end   = new Date(dayDate); end.setHours(eh, em, 0, 0);

    const event: CalendarEvent = {
      title:        evtTitle,
      start:        start.toISOString(),
      end:          end.toISOString(),
      calendarId:   evtCalendar,
      accountEmail: session?.user?.email ?? '',
      guestEmails:  evtGuests ? evtGuests.split(',').map((e) => e.trim()).filter(Boolean) : [],
      activityCode: selectedSlot.activity,
      planetaryNote: `Bloco de ${ACTIVITIES[selectedSlot.activity].name} — ${ACTIVITIES[selectedSlot.activity].description}`,
    };

    try {
      const res = await fetch('/api/calendar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(event),
      });
      const data = await res.json();
      if (data.id) {
        showToast(`✅ Evento criado com sucesso!`);
        addAgentMessage(
          `Perfeito! "${evtTitle}" está agendado para ${DAYS[selectedSlot.dayIndex]} às ${selectedSlot.startTime}. ` +
          `Perfeito! "${evtTitle}" agendado para ${DAYS[selectedSlot.dayIndex]} às ${selectedSlot.startTime}. Bloco de ${ACTIVITIES[selectedSlot.activity].name}.`
        );
        setShowCreateForm(false);
        setEvtTitle('');
        setEvtGuests('');
        setSelectedSlot(null);
      }
    } catch {
      showToast('Erro ao criar evento. Tente novamente.');
    } finally {
      setIsCreating(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────

  if (status === 'loading') return <div className={styles.loading}>Carregando...</div>;

  if (showSplash) return (
    <SplashScreen
      onDone={() => setShowSplash(false)}
      calendars={calendars}
      userEmail={session?.user?.email ?? undefined}
      linkedEmails={linkedEmails}
    />
  );

  const today = new Date();
  const todayDayOfWeek = (today.getDay() + 6) % 7; // 0=Seg

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTexture} aria-hidden="true" />
        <div className={styles.logo}><span className={styles.logoOrange}>AA</span>Agenda</div>
        <div className={styles.headerRight}>
          <span className={styles.headerDate}>
            {format(today, "EEE, dd MMM", { locale: ptBR })}
          </span>
          <div className={styles.userMenu}>
            <span className={styles.userEmail}>{session?.user?.email}</span>
            {linkedEmails.map((email) => (
              <span key={email} className={styles.linkedPill} title={email}>
                {email.split('@')[1]}
              </span>
            ))}
            <button className={styles.linkBtn} onClick={() => window.location.href = '/api/auth/link-account'}>
              + conta
            </button>
            <button className={styles.signOutBtn} onClick={() => signOut({ callbackUrl: '/login' })}>sair</button>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        {/* Coluna esquerda: grade + tipos */}
        <aside className={styles.sidebar}>
          {/* Grade semanal */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>grade semanal</div>
            <div className={styles.gridWrap}>
            <div className={styles.grid}>
              {/* Cabeçalho dos dias */}
              <div />
              {DAYS.map((d, i) => (
                <div key={d} className={`${styles.dayHead} ${i === todayDayOfWeek ? styles.today : ''}`}>{d}</div>
              ))}
              {/* Blocos */}
              {TIME_BLOCKS.map((block) => (
                <React.Fragment key={block}>
                  <div className={styles.timeLabel}>{block}</div>
                  {PLANETARY_GRID[block].map((code, dayIdx) => {
                    const colors = ACTIVITY_COLORS[code];
                    const isActive = selectedActivity === code;
                    const isHighlighted = selectedSlot?.dayIndex === dayIdx && selectedSlot?.blockLabel === block;
                    return (
                      <div
                        key={`${block}-${dayIdx}`}
                        className={`${styles.cell} ${isActive ? styles.cellActive : ''} ${isHighlighted ? styles.cellHighlighted : ''}`}
                        style={{ background: colors.hex, color: colors.darkHex }}
                        onClick={() => selectActivity(code)}
                        title={`${DAYS[dayIdx]} ${block} — ${ACTIVITIES[code].name}`}
                      >
                        <span className={styles.cellLetter}>{code}</span>
                        <span className={styles.cellSub}>{ACTIVITIES[code].rhythm.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            </div>
          </section>

          {/* Seletor de tipo */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>tipo de atividade</div>
            <div className={styles.typeGrid}>
              {Object.values(ACTIVITIES).map((act) => {
                const colors = ACTIVITY_COLORS[act.code];
                return (
                  <button
                    key={act.code}
                    className={`${styles.typeCard} ${selectedActivity === act.code ? styles.typeCardActive : ''}`}
                    style={{ background: colors.hex, color: colors.darkHex }}
                    onClick={() => selectActivity(act.code)}
                  >
                    <span className={styles.typeCode}>{act.code}</span>
                    <span className={styles.typeName}>{act.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Links de glossário */}
          <nav className={styles.navLinks}>
            <a href="/guia">📖 guia</a>
            <a href="/glossario">🪐 glossário</a>
          </nav>
        </aside>

        {/* Coluna direita: slots + agente */}
        <main className={styles.main}>
          {/* Slots rankeados */}
          {selectedActivity && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>
                melhores horários — {ACTIVITIES[selectedActivity].name}
              </div>
              <div className={styles.slotList}>
                {slots.map((slot, i) => {
                  const colors = ACTIVITY_COLORS[slot.activity];
                  return (
                    <div
                      key={`${slot.dayIndex}-${slot.blockLabel}`}
                      className={`${styles.slotRow} ${slot.isBest ? styles.slotBest : ''} ${selectedSlot?.dayIndex === slot.dayIndex && selectedSlot?.blockLabel === slot.blockLabel ? styles.slotSelected : ''}`}
                      onClick={() => selectSlot(slot)}
                    >
                      <span className={styles.slotDay}>{slot.dayName}</span>
                      <span className={styles.slotTime}>{slot.startTime}</span>
                      <span className={styles.slotDesc}>
                        {slot.isBest && <span className={styles.bestBadge}>⭐ melhor opção · </span>}
                        bloco de {ACTIVITIES[slot.activity].name}
                        {slot.conflictCount > 0 && (
                          <span className={styles.conflictBadge}>{slot.conflictCount} conflito{slot.conflictCount > 1 ? 's' : ''}</span>
                        )}
                      </span>
                      <span
                        className={styles.planetPill}
                        style={{ background: colors.hex, color: colors.darkHex }}
                      >
                        {ACTIVITIES[slot.activity].name}
                      </span>
                    </div>
                  );
                })}
                {slots.length === 0 && (
                  <p className={styles.emptySlots}>Buscando disponibilidade...</p>
                )}
              </div>

              {/* Formulário de criação */}
              {showCreateForm && selectedSlot && (
                <div className={styles.createForm}>
                  <div className={styles.createFormHeader}>
                    Criar evento — {DAYS[selectedSlot.dayIndex]} às {selectedSlot.startTime}
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>título</label>
                      <input
                        value={evtTitle}
                        onChange={(e) => setEvtTitle(e.target.value)}
                        placeholder="Ex: Reunião com cliente"
                        onKeyDown={(e) => { if (e.key === 'Enter') createEvent(); }}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>agenda</label>
                      <select value={evtCalendar} onChange={(e) => setEvtCalendar(e.target.value)}>
                        {calendars.map((cal) => (
                          <option key={cal.id} value={cal.id}>{cal.summary} ({cal.accountEmail})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>convidados (emails, separados por vírgula)</label>
                    <input
                      value={evtGuests}
                      onChange={(e) => setEvtGuests(e.target.value)}
                      placeholder="email1@exemplo.com, email2@exemplo.com"
                    />
                  </div>
                  <button
                    className={styles.confirmBtn}
                    onClick={createEvent}
                    disabled={isCreating || !evtTitle.trim()}
                  >
                    {isCreating ? 'Criando...' : '📅 criar na agenda'}
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Agente */}
          <section className={styles.agentPanel}>
            <div className={styles.agentHeader}>
              <div className={styles.agentAvatar}>☉</div>
              <div>
                <div className={styles.agentName}>Agente AAA</div>
                <div className={styles.agentStatus}>{isThinking ? 'pensando...' : 'ativo'}</div>
              </div>
            </div>

            <div className={styles.messages}>
              {messages.map((msg) => (
                <div key={msg.id} className={`${styles.msg} ${msg.role === 'agent' ? styles.msgAgent : styles.msgUser}`}>
                  {msg.content}
                </div>
              ))}
              {isThinking && (
                <div className={`${styles.msg} ${styles.msgAgent} ${styles.thinking}`}>
                  <span>•</span><span>•</span><span>•</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className={styles.inputRow}>
              <input
                className={styles.chatInput}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleChatSend(); }}
                placeholder="Descreva o que precisa agendar..."
                disabled={isThinking}
              />
              <button
                className={styles.sendBtn}
                onClick={handleChatSend}
                disabled={isThinking || !chatInput.trim()}
              >
                enviar ↗
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
