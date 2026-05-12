# AAAgenda 🪐

Agendamento inteligente sincronizado com as Horas Planetárias.  
Conecte suas agendas Google, deixe o Agente AAA sugerir o melhor horário para cada tipo de atividade.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | NextAuth.js v4 + Google OAuth |
| Calendário | Google Calendar API v3 |
| IA (Agente) | Claude Sonnet via Anthropic SDK |
| Estilo | CSS Modules + Google Fonts |
| Deploy | Vercel (recomendado) |

---

## Setup local (passo a passo)

### 1. Clone e instale

```bash
git clone <seu-repo>
cd aaagenda
npm install
```

### 2. Configure o Google OAuth

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie um projeto (ex: `aaagenda`)
3. Vá em **APIs & Services → Library** e ative:
   - **Google Calendar API**
   - **Google People API** (para foto de perfil)
4. Vá em **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Tipo: **Web application**
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (desenvolvimento)
   - `https://seudominio.com/api/auth/callback/google` (produção)
7. Copie `Client ID` e `Client Secret`

### 3. Configure as variáveis de ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e preencha:

```env
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
NEXTAUTH_SECRET=gere_com_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sua_chave_anthropic_aqui
```

> **Gerar NEXTAUTH_SECRET:**  
> ```bash
> openssl rand -base64 32
> ```

### 4. Rode em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## Vincular contas Google adicionais

Após o login com a conta principal, clique em **"+ conta"** no header.  
Você será redirecionado para o OAuth do Google com `prompt=select_account` — escolha a conta adicional e autorize.

O token da nova conta fica armazenado de forma segura no JWT criptografado do NextAuth.  
Na interface de criação de evento, todas as agendas de todas as contas vinculadas aparecem no seletor.

---

## Deploy no Vercel

```bash
npm install -g vercel
vercel
```

Configure as mesmas variáveis de ambiente no painel do Vercel.  
Não esqueça de atualizar o `NEXTAUTH_URL` para sua URL de produção e adicionar o redirect URI no Google Console.

---

## Estrutura do projeto

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # NextAuth + link-account OAuth flow
│   │   ├── agent/         # Claude API — agente de IA
│   │   └── calendar/      # Google Calendar API — leitura e criação
│   ├── agenda/            # Página principal
│   ├── login/             # Tela de login
│   ├── guia/              # Guia das Horas Planetárias
│   ├── glossario/         # Glossário de conceitos planetários
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── Providers.tsx      # SessionProvider
├── lib/
│   ├── planetary.ts       # Grade, atividades, cores, helpers
│   └── calendar.ts        # Google Calendar API wrapper
└── types/
    └── index.ts           # Tipos TypeScript globais
```

---

## A grade semanal

| Horário | Seg | Ter | Qua | Qui | Sex | Sáb | Dom |
|---------|-----|-----|-----|-----|-----|-----|-----|
| 07:00   |  A  |  E  |  A  |  D  |  G  |  C  |  B  |
| 10:15   |  E  |  A  |  D  |  G  |  C  |  B  |  E  |
| 13:45   |  F  |  B  |  E  |  A  |  D  |  G  |  C  |
| 17:00   |  G  |  C  |  F  |  B  |  E  |  A  |  D  |

**Legenda:** A=Superiores (Sol) · B=Foco (Saturno) · C=Estudos (Mercúrio) · D=Amigos (Vênus) · E=Profissional (Mercúrio) · F=Colheita (Júpiter) · G=Físico (Marte)

---

## Roadmap

- [ ] **v0.1** — MVP funcional (este repositório)
- [ ] **v0.2** — Suporte a múltiplas contas com refresh automático de tokens
- [ ] **v0.3** — Notificações: agente avisa proativamente sobre bons slots do dia
- [ ] **v0.4** — Mobile (PWA ou React Native)
- [ ] **v1.0** — Crystal API (Phase 2): cruzar perfil DISC do convidado com a hora planetária
