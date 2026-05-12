import type { ActivityCode, ActivityType, PlanetName, EnergyType } from '@/types';

// ─── Grade Semanal (da grade de Arnaldo Avileis) ─────────────────────
// Linhas = blocos de horário, Colunas = dias (Seg=0 … Dom=6)
export const PLANETARY_GRID: Record<string, ActivityCode[]> = {
  '07:00': ['A', 'E', 'A', 'D', 'G', 'C', 'B'],
  '10:15': ['E', 'A', 'D', 'G', 'C', 'B', 'E'],
  '13:45': ['F', 'B', 'E', 'A', 'D', 'G', 'C'],
  '17:00': ['G', 'C', 'F', 'B', 'E', 'A', 'D'],
};

export const TIME_BLOCKS = ['07:00', '10:15', '13:45', '17:00'] as const;
export type TimeBlock = typeof TIME_BLOCKS[number];

export const BLOCK_DURATION: Record<TimeBlock, number> = {
  '07:00': 195,
  '10:15': 210,
  '13:45': 195,
  '17:00': 180,
};

export const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;
export type DayLabel = typeof DAYS[number];

// ─── Perfil de cada bloco ─────────────────────────────────────────────
// Mantém referência ao sistema original mas usa linguagem de produtividade
export const BLOCK_PROFILE: Record<PlanetName, { rhythm: string; energy: EnergyType }> = {
  'Sol':      { rhythm: 'alta visibilidade e impacto',     energy: 'solar' },
  'Marte':    { rhythm: 'ação rápida e execução física',   energy: 'solar' },
  'Júpiter':  { rhythm: 'expansão e fechamento',           energy: 'solar' },
  'Saturno':  { rhythm: 'foco profundo e concentração',    energy: 'solar' },
  'Mercúrio': { rhythm: 'comunicação e aprendizado',       energy: 'solar' },
  'Lua':      { rhythm: 'conexão emocional e cuidado',     energy: 'lunar' },
  'Vênus':    { rhythm: 'relacionamento e harmonia social', energy: 'lunar' },
};

export const PLANET_ENERGY: Record<PlanetName, EnergyType> = {
  'Sol':      'solar',
  'Marte':    'solar',
  'Júpiter':  'solar',
  'Saturno':  'solar',
  'Lua':      'lunar',
  'Vênus':    'lunar',
  'Mercúrio': 'solar',
};

export const ACTIVITY_COLORS: Record<ActivityCode, { hex: string; darkHex: string; cssClass: string }> = {
  A: { hex: '#F5C842', darkHex: '#7A5F00', cssClass: 'act-a' },
  B: { hex: '#D4C4A8', darkHex: '#4A3820', cssClass: 'act-b' },
  C: { hex: '#7FC8A9', darkHex: '#1B6B4A', cssClass: 'act-c' },
  D: { hex: '#E8A0BF', darkHex: '#8B3060', cssClass: 'act-d' },
  E: { hex: '#7FC8A9', darkHex: '#1B6B4A', cssClass: 'act-e' },
  F: { hex: '#7BA7D4', darkHex: '#1A3F6A', cssClass: 'act-f' },
  G: { hex: '#E07060', darkHex: '#7A2010', cssClass: 'act-g' },
};

// ─── Definições das atividades — linguagem de produtividade ──────────
export const ACTIVITIES: Record<ActivityCode, ActivityType> = {
  A: {
    code: 'A',
    name: 'superiores',
    planet: 'Sol',
    rhythm: 'alta visibilidade e impacto',
    colorClass: 'act-a',
    colorHex: '#F5C842',
    colorDarkHex: '#7A5F00',
    description: 'Reuniões de alto impacto com líderes, clientes VIP e apresentações estratégicas.',
    examples: [
      'Reunião com diretor ou sócio',
      'Pitch para investidor',
      'Apresentação de resultados',
      'Negociação com cliente estratégico',
      'Entrevista de emprego',
    ],
    bestTimes: ['Segunda 07:00', 'Quarta 07:00', 'Quinta 13:45'],
    avoid: [
      'Assuntos que exijam sigilo ou discrição',
      'Tarefas de bastidores sem visibilidade',
    ],
  },
  B: {
    code: 'B',
    name: 'só / foco',
    planet: 'Saturno',
    rhythm: 'foco profundo e concentração',
    colorClass: 'act-b',
    colorHex: '#D4C4A8',
    colorDarkHex: '#4A3820',
    description: 'Trabalho solo de alta concentração — ideal para entregas complexas e revisões.',
    examples: [
      'Escrita de relatório ou proposta',
      'Revisão de contrato',
      'Planejamento estratégico',
      'Organização financeira',
      'Desenvolvimento e código',
    ],
    bestTimes: ['Quarta 10:15', 'Sábado 07:00', 'Domingo 10:15'],
    avoid: [
      'Reuniões em grupo',
      'Atividades que exijam muita interação social',
    ],
  },
  C: {
    code: 'C',
    name: 'estudos',
    planet: 'Mercúrio',
    rhythm: 'comunicação e aprendizado',
    colorClass: 'act-c',
    colorHex: '#7FC8A9',
    colorDarkHex: '#1B6B4A',
    description: 'Aprendizado, leitura técnica, cursos e absorção de novas informações.',
    examples: [
      'Aula ou curso online',
      'Leitura de livro ou artigo técnico',
      'Treinamento de equipe',
      'Workshop ou webinar',
      'Pesquisa e coleta de dados',
    ],
    bestTimes: ['Sábado 07:00', 'Terça 17:00', 'Domingo 13:45'],
    avoid: [
      'Multitarefa durante o aprendizado',
    ],
  },
  D: {
    code: 'D',
    name: 'amigos',
    planet: 'Vênus',
    rhythm: 'conexão social e harmonia',
    colorClass: 'act-d',
    colorHex: '#E8A0BF',
    colorDarkHex: '#8B3060',
    description: 'Encontros sociais, confraternizações e networking informal.',
    examples: [
      'Almoço ou jantar com amigos',
      'Happy hour ou evento social',
      'Networking descontraído',
      'Celebração de equipe',
      'Encontro familiar',
    ],
    bestTimes: ['Segunda 13:45', 'Quinta 07:00', 'Sexta 17:00'],
    avoid: [
      'Pautas de negócio formais',
      'Ambientes de alta pressão',
    ],
  },
  E: {
    code: 'E',
    name: 'profissional',
    planet: 'Mercúrio',
    rhythm: 'comunicação e aprendizado',
    colorClass: 'act-e',
    colorHex: '#7FC8A9',
    colorDarkHex: '#1B6B4A',
    description: 'Reuniões de trabalho, negociações e comunicação profissional.',
    examples: [
      'Reunião com cliente ou fornecedor',
      'Negociação e assinatura de contrato',
      'Apresentação de proposta comercial',
      'Videochamada de negócio',
      'Onboarding de colaborador',
    ],
    bestTimes: ['Segunda 07:00', 'Terça 07:00', 'Quarta 13:45'],
    avoid: [
      'Decisões sem informação suficiente',
    ],
  },
  F: {
    code: 'F',
    name: 'colheita',
    planet: 'Júpiter',
    rhythm: 'expansão e fechamento',
    colorClass: 'act-f',
    colorHex: '#7BA7D4',
    colorDarkHex: '#1A3F6A',
    description: 'Fechamento de negócios, resultados e lançamentos.',
    examples: [
      'Fechar proposta ou contrato',
      'Receber pagamento ou resultado financeiro',
      'Lançamento de produto ou serviço',
      'Anunciar parceria estratégica',
      'Comemorar conquista de meta',
    ],
    bestTimes: ['Segunda 13:45', 'Quinta 13:45', 'Sábado 10:15'],
    avoid: [
      'Gastos impulsivos',
      'Tarefas de detalhamento minucioso',
    ],
  },
  G: {
    code: 'G',
    name: 'físico',
    planet: 'Marte',
    rhythm: 'ação e energia física',
    colorClass: 'act-g',
    colorHex: '#E07060',
    colorDarkHex: '#7A2010',
    description: 'Exercícios, esportes e atividades físicas.',
    examples: [
      'Treino na academia',
      'Corrida ou esporte',
      'Yoga ou pilates',
      'Trabalho físico ou braçal',
      'Competição esportiva',
    ],
    bestTimes: ['Segunda 17:00', 'Terça 13:45', 'Quarta 07:00'],
    avoid: [
      'Decisões irreversíveis em estado de adrenalina',
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────

export function getSlotsForActivity(code: ActivityCode): Array<{ dayIndex: number; block: string }> {
  const slots: Array<{ dayIndex: number; block: string }> = [];
  for (const [block, row] of Object.entries(PLANETARY_GRID)) {
    row.forEach((c, dayIndex) => {
      if (c === code) slots.push({ dayIndex, block });
    });
  }
  return slots;
}

export function getBlockEndTime(startBlock: TimeBlock): string {
  const idx = TIME_BLOCKS.indexOf(startBlock);
  if (idx < TIME_BLOCKS.length - 1) return TIME_BLOCKS[idx + 1];
  return '20:00';
}

export function slotToDate(weekStart: Date, dayIndex: number, block: TimeBlock): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayIndex);
  const [h, m] = block.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}
