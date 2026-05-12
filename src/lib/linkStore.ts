/**
 * Store temporária server-side para contas vinculadas pendentes.
 * Quando o usuário autoriza uma conta adicional via OAuth:
 * 1. callback salva aqui com chave = email primário
 * 2. jwt() callback lê aqui e injeta no token
 * 3. entrada é deletada após consumo
 *
 * Em memória — sobrevive ao processo Node mas não a restarts.
 * Para produção multi-instância: substituir por Redis.
 */

interface PendingLink {
  email:        string;
  displayName:  string;
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number;
  savedAt:      number;
}

const store = new Map<string, PendingLink[]>();

// Limpeza de entradas antigas (> 5 minutos)
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000;
  Array.from(store.entries()).forEach(([key, links]) => {
    const fresh = links.filter((l: PendingLink) => l.savedAt > cutoff);
    if (fresh.length === 0) store.delete(key);
    else store.set(key, fresh);
  });
}, 60_000);

export function savePendingLink(primaryEmail: string, link: Omit<PendingLink, 'savedAt'>) {
  const existing = store.get(primaryEmail) ?? [];
  // Evita duplicatas pelo email vinculado
  const filtered = existing.filter((l) => l.email !== link.email);
  store.set(primaryEmail, [...filtered, { ...link, savedAt: Date.now() }]);
}

export function consumePendingLinks(primaryEmail: string): Omit<PendingLink, 'savedAt'>[] {
  const links = store.get(primaryEmail) ?? [];
  store.delete(primaryEmail);
  return links.map(({ savedAt: _s, ...rest }) => rest);
}

export function hasPendingLinks(primaryEmail: string): boolean {
  return (store.get(primaryEmail) ?? []).length > 0;
}
