import styles from './glossario.module.css';

const GLOSSARIO = [
  {
    termo: 'AAAgenda',
    cor: '#F5C842', corTexto: '#7A5F00',
    definicao: 'Sistema de agendamento inteligente que cruza sua disponibilidade real nas agendas Google com a grade de blocos de Arnaldo Avileis — sugerindo o melhor horário para cada tipo de atividade.',
    analogia: 'Como ter um assistente executivo que conhece seu ritmo de trabalho e nunca esquece de checar todos os seus calendários.',
    tags: ['conceito base'],
  },
  {
    termo: 'Grade de Blocos',
    cor: '#F3F1EC', corTexto: '#4A4A40',
    definicao: 'Sistema semanal desenvolvido por Arnaldo Avileis que divide o dia em 4 janelas de tempo (07h, 10h15, 13h45, 17h), cada uma com um perfil de produtividade diferente. A lógica foi construída empiricamente ao longo de anos de observação sobre ritmos de trabalho e energia pessoal.',
    analogia: 'Como a curva de produtividade do dia — cada janela tem uma "temperatura" natural para certos tipos de tarefa.',
    tags: ['conceito base', 'Arnaldo Avileis'],
  },
  {
    termo: 'Bloco A — Superiores',
    cor: '#F5C842', corTexto: '#7A5F00',
    definicao: 'Janela de alta visibilidade e impacto. Perfil ideal para reuniões com líderes, pitches, apresentações estratégicas e qualquer situação que exija presença e autoridade.',
    analogia: 'O holofote do dia — quando ele está aceso, é hora de estar no palco.',
    tags: ['tipo A'],
  },
  {
    termo: 'Bloco B — Só / Foco',
    cor: '#D4C4A8', corTexto: '#4A3820',
    definicao: 'Janela de foco profundo e concentração. Perfil ideal para trabalho solo, desenvolvimento, escrita técnica, revisões e qualquer tarefa que exija raciocínio sustentado sem interrupções.',
    analogia: 'O silêncio produtivo — quando o ruído externo some e a mente entra em modo de entrega.',
    tags: ['tipo B'],
  },
  {
    termo: 'Bloco C — Estudos',
    cor: '#7FC8A9', corTexto: '#1B6B4A',
    definicao: 'Janela de aprendizado e absorção. Perfil ideal para cursos, leitura técnica, pesquisa e qualquer atividade de aquisição de conhecimento.',
    analogia: 'A mente em modo de download — receptiva, curiosa, pronta para absorver.',
    tags: ['tipo C'],
  },
  {
    termo: 'Bloco D — Amigos',
    cor: '#E8A0BF', corTexto: '#8B3060',
    definicao: 'Janela de conexão social e networking. Perfil ideal para encontros, confraternizações e interações que fortalecem vínculos pessoais e profissionais de forma leve.',
    analogia: 'O momento em que a conversa flui naturalmente — sem agenda pesada, só presença.',
    tags: ['tipo D'],
  },
  {
    termo: 'Bloco E — Profissional',
    cor: '#7FC8A9', corTexto: '#1B6B4A',
    definicao: 'Janela de comunicação e negociação. Perfil ideal para reuniões de trabalho, contratos, propostas e qualquer troca que exija clareza e precisão.',
    analogia: 'Banda larga no cérebro — tudo flui mais rápido e sem ruído.',
    tags: ['tipo E'],
  },
  {
    termo: 'Bloco F — Colheita',
    cor: '#7BA7D4', corTexto: '#1A3F6A',
    definicao: 'Janela de fechamento e expansão. Perfil ideal para finalizar negócios, receber resultados, lançar projetos e celebrar conquistas.',
    analogia: 'O vento em popa — amplifica o que você já construiu.',
    tags: ['tipo F'],
  },
  {
    termo: 'Bloco G — Físico',
    cor: '#E07060', corTexto: '#7A2010',
    definicao: 'Janela de energia física e ação. Perfil ideal para exercícios, esportes, trabalho braçal e tarefas que exigem disposição e movimento.',
    analogia: 'O café forte antes de encarar um desafio — energia disponível, hora de usar.',
    tags: ['tipo G'],
  },
  {
    termo: 'Verificação de Disponibilidade',
    cor: '#F3F1EC', corTexto: '#4A4A40',
    definicao: 'Antes de sugerir qualquer horário, o Agente AAA consulta simultaneamente todas as agendas Google conectadas — verificando conflitos reais antes de recomendar um slot.',
    analogia: 'Como um assistente que abre todos os seus calendários ao mesmo tempo antes de marcar qualquer coisa.',
    tags: ['funcionalidade'],
  },
];

export default function GlossarioPage() {
  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <a href="/agenda" className={styles.back}>← agenda</a>
        <div className={styles.logo}>AA<span>A</span>genda</div>
      </header>

      <div className={styles.hero}>
        <h1>Glossário</h1>
        <p>Entenda o significado de cada bloco e conceito do sistema de agendamento.</p>
      </div>

      <div className={styles.grid}>
        {GLOSSARIO.map((item) => (
          <article key={item.termo} className={styles.card} style={{ borderTopColor: item.cor }}>
            <div className={styles.cardHeader}>
              <span className={styles.termo} style={{ color: item.corTexto }}>{item.termo}</span>
              <div className={styles.tags}>
                {item.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>
            <p className={styles.definicao}>{item.definicao}</p>
            <div className={styles.analogia}>
              <span className={styles.analogiaLabel}>analogia</span>
              <span>{item.analogia}</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
