// ─── Tipos Planetários ──────────────────────────────────────────────

export type PlanetName = 'Sol' | 'Lua' | 'Mercúrio' | 'Vênus' | 'Marte' | 'Júpiter' | 'Saturno';

export type ActivityCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface ActivityType {
  code: ActivityCode;
  name: string;
  planet: PlanetName;
  rhythm: string;        // descrição de produtividade sem referência a planetas
  colorClass: string;       // CSS class name
  colorHex: string;         // hex for inline use
  colorDarkHex: string;
  description: string;
  examples: string[];
  bestTimes: string[];      // horários ideais
  avoid: string[];
}

export interface PlanetaryHour {
  blockLabel: string;       // "07:00", "10:15", etc.
  blockIndex: number;       // 0-3
  dayIndex: number;         // 0=Seg … 6=Dom
  activity: ActivityCode;
  planet: PlanetName;
  startTime: string;        // HH:mm
  endTime: string;          // HH:mm
}

export type EnergyType = 'solar' | 'lunar';

// ─── Agenda / Google Calendar ────────────────────────────────────────

export interface GoogleAccount {
  id: string;               // email address used as ID
  email: string;
  displayName: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken: string;
  isPrimary: boolean;
}

export interface CalendarInfo {
  id: string;
  summary: string;          // display name
  accountEmail: string;
  colorId?: string;
  primary: boolean;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  start: string;            // ISO 8601
  end: string;              // ISO 8601
  calendarId: string;
  accountEmail: string;
  guestEmails?: string[];
  activityCode?: ActivityCode;
  planetaryNote?: string;   // justificativa gerada pelo agente
  description?: string;
}

export interface TimeSlot {
  dayIndex: number;         // 0=Seg … 6=Dom
  dayName: string;
  blockLabel: string;
  startTime: string;        // HH:mm
  endTime: string;
  activity: ActivityCode;
  planet: PlanetName;
  energyType: EnergyType;
  score: number;            // 0-100, calculado pelo agente
  isBest: boolean;
  conflictCount: number;    // eventos já existentes nesse slot
  available: boolean;
}

// ─── Agente ──────────────────────────────────────────────────────────

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  slotSuggestion?: TimeSlot;
  activityCode?: ActivityCode;
}

export interface AgentContext {
  selectedActivity?: ActivityCode;
  selectedSlot?: TimeSlot;
  availableSlots?: TimeSlot[];
  userTimezone: string;
  weekStart: string;        // ISO date
}

// ─── Session / Auth ──────────────────────────────────────────────────

export interface AAAUser {
  id: string;
  primaryEmail: string;
  primaryName: string;
  primaryAvatar?: string;
  linkedAccounts: GoogleAccount[];
  timezone: string;
  createdAt: Date;
}
