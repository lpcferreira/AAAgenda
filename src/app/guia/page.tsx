import styles from './guia.module.css';
import { ACTIVITIES, ACTIVITY_COLORS } from '@/lib/planetary';

const SECTIONS = [
  {
    titulo: 'O que é o AAAgenda?',
    conteudo: `O AAAgenda é um sistema de agendamento inteligente que cruza dois dados: sua disponibilidade real nas agendas Google e a grade de blocos de Arnaldo Avileis.

A ideia é simples — cada bloco do dia tem um perfil natural para certos tipos de atividade. Quando você alinha o tipo de compromisso com o perfil do horário, as coisas tendem a fluir melhor: menos atrito, mais resultado.

O Agente AAA verifica todas as suas agendas conectadas simultaneamente antes de sugerir qualquer horário. Nada de chute — só slots realmente livres.`,
  },
  {
    titulo: 'A grade de Arnaldo Avileis',
    conteudo: `A grade semanal do AAAgenda foi desenvolvida por Arnaldo Avileis — uma síntese pessoal de anos de observação sobre ritmos de trabalho, energia pessoal e produtividade ao longo do dia e da semana.

O sistema divide o dia em 4 janelas (07h, 10h15, 13h45 e 17h) e mapeia para cada uma delas o perfil de atividade que tende a render mais. Essa estrutura se repete ao longo dos 7 dias com variações calculadas para criar ritmo e equilíbrio ao longo da semana.

Não é uma fórmula rígida — é uma bússola. O AAAgenda usa essa grade como referência para rankear slots disponíveis e sugerir o momento certo para cada tipo de compromisso.`,
  },
  {
    titulo: 'Como ler a grade',
    conteudo: `A grade semanal tem 4 linhas (blocos de horário) e 7 colunas (dias da semana). Cada célula mostra uma letra que indica o perfil daquele bloco:

A = Superiores — alta visibilidade, impacto, presença
B = Só/Foco — concentração profunda, trabalho solo
C = Estudos — aprendizado, leitura, absorção
D = Amigos — conexão social, networking leve
E = Profissional — reuniões, negociações, contratos
F = Colheita — fechamentos, resultados, lançamentos
G = Físico — exercícios, movimento, energia

Cores amarelas indicam blocos de alta energia e ação. Cores rosadas indicam blocos mais receptivos e relacionais.`,
  },
  {
    titulo: 'Como o Agente AAA funciona',
    conteudo: `Quando você descreve o que precisa agendar, o agente:

1. Identifica o tipo de atividade (A a G) pela descrição
2. Encontra todos os slots com esse perfil nas próximas semanas
3. Verifica cada slot em TODAS as suas agendas conectadas
4. Filtra os que têm conflito
5. Apresenta apenas os slots realmente disponíveis, ordenados por qualidade
6. Cria o evento na agenda que você escolher, com convidados se necessário

Você pode falar naturalmente — "preciso de um bloco de foco para desenvolvimento" ou "quero marcar almoço com o cliente" — e o agente interpreta, verifica e agenda.`,
  },
  {
    titulo: 'Dica: use como bússola, não como prisão',
    conteudo: `A grade é uma referência, não uma regra. Nem sempre será possível agendar no slot ideal — e tudo bem.

Use o AAAgenda para:
→ Dar preferência ao melhor slot quando houver opção
→ Entender por que certos blocos do dia rendem mais que outros para você
→ Criar padrões semanais sustentáveis de trabalho

Com o tempo, você vai notar seus próprios padrões. O AAAgenda ajuda a tornar isso visível.`,
  },
];

export default function GuiaPage() {
  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <a href="/agenda" className={styles.back}>← agenda</a>
        <div className={styles.logo}>AA<span>A</span>genda</div>
      </header>

      <div className={styles.hero}>
        <h1>Guia do AAAgenda</h1>
        <p>Como funciona o sistema de blocos e como tirar o máximo do agendamento inteligente.</p>
      </div>

      <div className={styles.activityRef}>
        {Object.values(ACTIVITIES).map((act) => {
          const colors = ACTIVITY_COLORS[act.code];
          return (
            <div key={act.code} className={styles.actCard}
              style={{ background: colors.hex, color: colors.darkHex }}>
              <span className={styles.actCode}>{act.code}</span>
              <span className={styles.actName}>{act.name}</span>
            </div>
          );
        })}
      </div>

      {SECTIONS.map((sec, i) => (
        <section key={i} className={styles.section}>
          <h2>{sec.titulo}</h2>
          {sec.conteudo.split('\n\n').map((para, j) => (
            <p key={j} className={styles.para}>{para}</p>
          ))}
        </section>
      ))}

      <div className={styles.originCard}>
        <div className={styles.originPhotoWrap}>
          <img src="/arnaldo-grade.jpg" alt="Grade original de Arnaldo Avileis" className={styles.originPhoto} />
        </div>
        <div className={styles.originText}>
          <div className={styles.originTitle}>A origem do sistema</div>
          <p className={styles.originDesc}>
            A grade de blocos do AAAgenda é baseada no sistema desenvolvido por Arnaldo Avileis —
            uma síntese pessoal construída ao longo de anos de prática e observação sobre
            ritmos de trabalho e produtividade.
          </p>
          <span className={styles.originCredit}>sistema original de Arnaldo Avileis</span>
        </div>
      </div>

      <div className={styles.footer}>
        <a href="/glossario" className={styles.glossLink}>
          Ver glossário completo →
        </a>
      </div>
    </main>
  );
}
