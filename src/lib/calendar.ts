import { google } from 'googleapis';
import type { CalendarEvent, CalendarInfo, TimeSlot } from '@/types';
import { ACTIVITIES, getBlockEndTime, TIME_BLOCKS, type TimeBlock } from './planetary';

// ─── Cliente OAuth2 ───────────────────────────────────────────────────

export function makeOAuthClient(accessToken: string, refreshToken?: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/link-account/callback`
  );
  oauth2.setCredentials({
    access_token:  accessToken,
    refresh_token: refreshToken,
  });
  return oauth2;
}

// ─── Listar calendários da conta ──────────────────────────────────────

export async function listCalendars(accessToken: string, accountEmail: string): Promise<CalendarInfo[]> {
  const auth     = makeOAuthClient(accessToken);
  const calendar = google.calendar({ version: 'v3', auth });

  const { data } = await calendar.calendarList.list();
  return (data.items ?? []).map((item) => ({
    id:           item.id!,
    summary:      item.summary ?? item.id!,
    accountEmail,
    colorId:      item.colorId ?? undefined,
    primary:      !!item.primary,
  }));
}

// ─── Buscar eventos da semana ──────────────────────────────────────────

export async function getWeekEvents(
  accessToken: string,
  calendarId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<CalendarEvent[]> {
  const auth     = makeOAuthClient(accessToken);
  const calendar = google.calendar({ version: 'v3', auth });

  const { data } = await calendar.events.list({
    calendarId,
    timeMin:      weekStart.toISOString(),
    timeMax:      weekEnd.toISOString(),
    singleEvents: true,
    orderBy:      'startTime',
    maxResults:   250,
  });

  return (data.items ?? []).map((e) => ({
    id:            e.id!,
    title:         e.summary ?? '(sem título)',
    start:         e.start?.dateTime ?? e.start?.date ?? '',
    end:           e.end?.dateTime   ?? e.end?.date   ?? '',
    calendarId,
    accountEmail:  '',
    guestEmails:   (e.attendees ?? []).map((a) => a.email!).filter(Boolean),
  }));
}

// ─── Verificar conflitos num slot ──────────────────────────────────────

export function countConflicts(slot: TimeSlot, events: CalendarEvent[], weekStart: Date): number {
  const block = slot.blockLabel as TimeBlock;
  const startH = parseInt(block.split(':')[0]);
  const startM = parseInt(block.split(':')[1]);
  const endBlock = getBlockEndTime(block);
  const endH   = parseInt(endBlock.split(':')[0]);
  const endM   = parseInt(endBlock.split(':')[1]);

  const slotDay  = new Date(weekStart);
  slotDay.setDate(slotDay.getDate() + slot.dayIndex);

  const slotStart = new Date(slotDay);
  slotStart.setHours(startH, startM, 0, 0);

  const slotEnd = new Date(slotDay);
  slotEnd.setHours(endH, endM, 0, 0);

  return events.filter((e) => {
    if (!e.start) return false;
    const evStart = new Date(e.start);
    const evEnd   = new Date(e.end);
    // sobreposição
    return evStart < slotEnd && evEnd > slotStart;
  }).length;
}

// ─── Criar evento ─────────────────────────────────────────────────────

export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<{ id: string; htmlLink: string }> {
  const auth     = makeOAuthClient(accessToken);
  const calendar = google.calendar({ version: 'v3', auth });

  const attendees = (event.guestEmails ?? []).map((email) => ({ email }));

  const { data } = await calendar.events.insert({
    calendarId:        event.calendarId,
    sendNotifications: true,
    requestBody: {
      summary:     event.title,
      description: event.description,
      start:       { dateTime: event.start, timeZone: 'America/Sao_Paulo' },
      end:         { dateTime: event.end,   timeZone: 'America/Sao_Paulo' },
      attendees:   attendees.length ? attendees : undefined,
      extendedProperties: event.activityCode ? {
        private: {
          aaaActivityCode: event.activityCode,
          aaaNotes:        event.planetaryNote ?? '',
        },
      } : undefined,
    },
  });

  return { id: data.id!, htmlLink: data.htmlLink! };
}

// ─── Calcular score de um slot ────────────────────────────────────────
// Score simples: começa em 100, penaliza conflitos e horários mais tarde

export function scoreSlot(
  dayIndex: number,
  blockIdx: number,
  conflicts: number
): number {
  // Penalidade por conflito
  const conflictPenalty = conflicts * 30;
  // Leve preferência por blocos matutinos
  const blockPenalty    = blockIdx * 5;
  // Leve preferência por dias de semana sobre fim de semana
  const weekendPenalty  = dayIndex >= 5 ? 10 : 0;

  return Math.max(0, 100 - conflictPenalty - blockPenalty - weekendPenalty);
}
