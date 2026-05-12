/**
 * Rate limiter em memória — sem dependências externas.
 * Para produção com múltiplas instâncias, substituir por Redis (Upstash).
 * 
 * Limites:
 * - /api/agent: 20 mensagens por usuário por hora
 * - /api/calendar: 60 requisições por usuário por hora
 */

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

// Limpeza periódica para não vazar memória
setInterval(() => {
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (entry.resetAt < now) store.delete(key);
  });
}, 5 * 60 * 1000); // a cada 5 minutos

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  identifier: string,  // email do usuário ou IP
  route: string,
  limitPerHour: number
): RateLimitResult {
  const key     = `${route}:${identifier}`;
  const now     = Date.now();
  const resetAt = now + 60 * 60 * 1000; // 1 hora

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // Janela nova
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limitPerHour - 1, resetAt };
  }

  if (entry.count >= limitPerHour) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limitPerHour - entry.count, resetAt: entry.resetAt };
}

// Limites por rota
export const LIMITS = {
  agent:    40,  // mensagens Claude por hora por usuário (tool use multiplica chamadas)
  calendar: 60,  // leituras/escritas Google Calendar por hora por usuário
} as const;
