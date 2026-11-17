/**
 * DADOS SIMULADOS (MOCK) — Front-end V1.2.
 * Nada aqui vem de servidor. Estes registros só demonstram a interface e serão
 * substituídos pelas respostas da API do Back-end (mesmo formato de `src/types/models.ts`).
 * Nomes e e-mails são fictícios (domínio reservado .example).
 */
import type {
  AppNotification,
  Idea,
  LibraryFile,
  LibraryFolder,
  Member,
  NewsItem,
  Project,
  RadarSource,
  Shortcut,
  Task,
} from '@/types/models';

/** Usuário "logado" na demonstração. TODO(api): vem de GET /auth/me. */
export const CURRENT_USER_ID = 'u-victor';

const member = (m: Omit<Member, 'initials' | 'active' | 'areas'> & Partial<Pick<Member, 'areas'>>): Member => ({
  areas: [],
  active: true,
  initials: m.name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join(''),
  ...m,
});

export const members: Member[] = [
  member({ id: 'u-victor', name: 'Victor Pereira', email: 'victor.pereira@firewalldo.example', role: 'admin', title: 'Desenvolvedor Back-end', status: 'online', color: '#2563eb', areas: ['programacao', 'infraestrutura'], bio: 'Banco de dados, autenticação, APIs e integrações.' }),
  member({ id: 'u-maria', name: 'Maria Silva', email: 'maria.silva@firewalldo.example', role: 'admin', title: 'Gestora de Projetos', status: 'offline', color: '#8b5cf6', areas: ['gestao'] }),
  member({ id: 'u-wesley', name: 'Wesley Albino', email: 'wesley.albino@firewalldo.example', role: 'usuario', title: 'Desenvolvedor Front-end', status: 'online', color: '#16a34a', areas: ['programacao', 'design'], bio: 'Telas, componentes e experiência do portal.' }),
  member({ id: 'u-matheus', name: 'Matheus Alves', email: 'matheus.alves@firewalldo.example', role: 'usuario', title: 'Designer de Produto', status: 'online', color: '#d97706', areas: ['design'] }),
  member({ id: 'u-kailon', name: 'Kailon Costa', email: 'kailon.costa@firewalldo.example', role: 'usuario', title: 'Editor de Vídeo', status: 'offline', color: '#db2777', areas: ['conteudo'] }),
  member({ id: 'u-ana', name: 'Ana Oliveira', email: 'ana.oliveira@firewalldo.example', role: 'usuario', title: 'Product Owner', status: 'online', color: '#0d9488', areas: ['gestao', 'marketing'] }),
  member({ id: 'u-camila', name: 'Camila Souza', email: 'camila.souza@firewalldo.example', role: 'usuario', title: 'UX/UI Designer', status: 'offline', color: '#e11d48', areas: ['design'] }),
  member({ id: 'u-rafael', name: 'Rafael Martins', email: 'rafael.martins@firewalldo.example', role: 'usuario', title: 'Analista de Redes', status: 'offline', color: '#0891b2', areas: ['infraestrutura', 'conteudo'] }),
];

export const projects: Project[] = [
  {
    id: 'p-app', name: 'App · Front-end', subtitle: 'Interface do app da plataforma de cursos',
    description: 'Telas, componentes e fluxos do aplicativo da plataforma de cursos.',
    icon: 'code', color: '#3b82f6', status: 'em_andamento', progress: 50,
    ownerIds: ['u-victor', 'u-wesley', 'u-matheus', 'u-camila', 'u-ana'],
    startDate: '2026-09-01', dueDate: '2027-03-15',
    milestones: [
      { id: 'm1', title: 'Protótipo navegável', dueDate: '2026-10-01', done: true },
      { id: 'm2', title: 'Fluxos de conta (cadastro, login, senha)', dueDate: '2026-12-05', done: false },
      { id: 'm3', title: 'Versão beta', dueDate: '2027-02-20', done: false },
    ],
  },
  {
    id: 'p-landing', name: 'Landing page', subtitle: 'Página de apresentação e inscrições',
    description: 'Site institucional com inscrição para o beta.',
    icon: 'layout', color: '#3b82f6', status: 'em_andamento', progress: 75,
    ownerIds: ['u-wesley', 'u-matheus', 'u-ana'],
    startDate: '2026-09-20', dueDate: '2026-12-15',
    milestones: [
      { id: 'm1', title: 'Wireframes', dueDate: '2026-10-10', done: true },
      { id: 'm2', title: 'Layout final', dueDate: '2026-11-20', done: false },
      { id: 'm3', title: 'Publicação', dueDate: '2026-12-15', done: false },
    ],
  },
  {
    id: 'p-lancamento', name: 'Conteúdo de lançamento', subtitle: 'Campanha e materiais do lançamento',
    description: 'Peças, pautas e roteiros para a campanha de lançamento.',
    icon: 'play', color: '#3b82f6', status: 'em_andamento', progress: 60,
    ownerIds: ['u-camila', 'u-rafael', 'u-ana'],
    startDate: '2026-10-01', dueDate: '2027-01-10',
    milestones: [
      { id: 'm1', title: 'Plano de conteúdo', dueDate: '2026-10-20', done: true },
      { id: 'm2', title: 'Peças da campanha', dueDate: '2026-12-01', done: false },
    ],
  },
  {
    id: 'p-canal', name: 'Canal Firewalldo', subtitle: 'Vídeos educativos de cibersegurança',
    description: 'Série "Fundamentos de Cibersegurança" e vídeos curtos.',
    icon: 'play', color: '#3b82f6', status: 'em_andamento', progress: 35,
    ownerIds: ['u-kailon', 'u-rafael'],
    startDate: '2026-10-15', dueDate: '2027-02-01',
    milestones: [
      { id: 'm1', title: 'Episódio 1', dueDate: '2026-11-10', done: true },
      { id: 'm2', title: 'Episódio 2', dueDate: '2026-12-05', done: false },
    ],
  },
  {
    id: 'p-newsletter', name: 'Newsletter', subtitle: 'Resumo semanal de segurança',
    description: 'Curadoria semanal com base no Radar de notícias.',
    icon: 'globe', color: '#3b82f6', status: 'planejamento', progress: 20,
    ownerIds: ['u-ana', 'u-maria'],
    startDate: '2026-11-01', dueDate: '2027-01-30',
    milestones: [{ id: 'm1', title: 'Modelo de e-mail', dueDate: '2026-11-28', done: false }],
  },
];

let t = 0;
const task = (p: Partial<Task> & Pick<Task, 'title' | 'status'>): Task => {
  t += 1;
  return {
    id: `t-${t}`,
    description: '',
    projectId: 'p-app',
    category: 'programacao',
    priority: 'media',
    assigneeIds: [],
    open: false,
    maxAssignees: 3,
    dueDate: null,
    checklist: [],
    createdBy: 'u-victor',
    createdAt: '2026-11-03',
    updatedAt: '2026-11-10',
    order: t,
    ...p,
  };
};
const cl = (...items: [string, boolean][]) => items.map(([text, done], i) => ({ id: `c${i + 1}`, text, done }));

export const tasks: Task[] = [
  /* ----- Backlog: vagas para aceitar ----- */
  task({ title: 'Levantar requisitos do novo módulo', status: 'backlog', open: true, maxAssignees: 3, assigneeIds: ['u-camila'], dueDate: '2026-12-01', priority: 'media', category: 'gestao', description: 'Mapear necessidades do módulo de trilhas com a equipe de conteúdo.' }),
  task({ title: 'Atualizar documentação da API', status: 'backlog', open: true, maxAssignees: 2, dueDate: '2026-12-04', priority: 'media', category: 'programacao' }),
  task({ title: 'Revisar onboarding', status: 'backlog', open: true, maxAssignees: 4, dueDate: '2026-12-08', priority: 'baixa', category: 'design' }),
  task({ title: 'Implementar tela de onboarding', status: 'backlog', open: true, maxAssignees: 3, assigneeIds: ['u-wesley'], dueDate: '2026-12-05', priority: 'media' }),
  task({ title: 'Ajustar textos e microcopys', status: 'backlog', open: true, maxAssignees: 1, projectId: 'p-landing', dueDate: '2026-12-08', category: 'conteudo', priority: 'baixa' }),

  /* ----- A fazer ----- */
  task({ title: 'Revisar fluxo de cadastro', status: 'a_fazer', assigneeIds: ['u-ana'], dueDate: '2026-11-28', category: 'gestao' }),
  task({ title: 'Planejar pauta sobre ransomware no Brasil', status: 'a_fazer', projectId: 'p-lancamento', assigneeIds: ['u-rafael'], dueDate: '2026-11-30', category: 'conteudo' }),
  task({ title: 'Definir roteiro do próximo vídeo da série "Fundamentos de Cibersegurança"', status: 'a_fazer', projectId: 'p-canal', assigneeIds: ['u-kailon'], category: 'conteudo' }),
  task({ title: 'Desenvolver fluxo de recuperação de senha', status: 'a_fazer', priority: 'alta', assigneeIds: ['u-wesley', 'u-camila', 'u-victor'], dueDate: '2026-11-20', checklist: cl(['Tela de solicitação', true], ['E-mail de redefinição', false], ['Tela de nova senha', false]) }),
  task({ title: 'Criar componente de tabs', status: 'a_fazer', assigneeIds: ['u-wesley', 'u-matheus'], dueDate: '2026-11-22' }),
  task({ title: 'Implementar validação de formulários', status: 'a_fazer', assigneeIds: ['u-wesley', 'u-camila'], dueDate: '2026-11-25' }),
  task({ title: 'Ajustar responsividade do cabeçalho', status: 'a_fazer', projectId: 'p-landing', assigneeIds: ['u-wesley', 'u-matheus'], dueDate: '2026-11-27', priority: 'baixa' }),
  task({ title: 'Integrar serviço de notificações', status: 'a_fazer', assigneeIds: ['u-victor', 'u-wesley'], dueDate: '2026-12-02', category: 'infraestrutura' }),
  task({ title: 'Criar página de configurações da conta', status: 'a_fazer', assigneeIds: ['u-wesley', 'u-camila'], dueDate: '2026-12-06' }),

  /* ----- Em andamento ----- */
  task({ title: 'Ajustar tela de ranking', status: 'em_andamento', assigneeIds: ['u-matheus'], dueDate: '2026-11-24', checklist: cl(['Layout', true], ['Pontuação semanal', false]) }),
  task({ title: 'Editar vídeo "Como funciona um SOC?"', status: 'em_andamento', projectId: 'p-canal', assigneeIds: ['u-kailon'], dueDate: '2026-11-26', category: 'conteudo' }),
  task({ title: 'Revisar e publicar newsletter semanal', status: 'em_andamento', projectId: 'p-newsletter', assigneeIds: ['u-ana'], dueDate: '2026-11-14', category: 'marketing' }),
  task({ title: 'Definir arquitetura da API', status: 'em_andamento', priority: 'critica', assigneeIds: ['u-victor'], dueDate: '2026-11-18', category: 'infraestrutura', checklist: cl(['Entidades', true], ['Rotas', true], ['Permissões', false]) }),
  task({ title: 'Corrigir bugs de navegação', status: 'em_andamento', priority: 'alta', assigneeIds: ['u-wesley'], dueDate: '2026-11-16' }),

  /* ----- Concluídas ----- */
  task({ title: 'Validar versão mobile', status: 'concluido', assigneeIds: ['u-matheus'], dueDate: '2026-11-08', updatedAt: '2026-11-08' }),
  task({ title: 'Publicar notícia sobre novo alerta de segurança', status: 'concluido', projectId: 'p-newsletter', assigneeIds: ['u-ana'], dueDate: '2026-11-06', updatedAt: '2026-11-06', category: 'conteudo' }),
  task({ title: 'Finalizar artes da campanha do novo curso', status: 'concluido', projectId: 'p-lancamento', assigneeIds: ['u-camila'], dueDate: '2026-11-07', updatedAt: '2026-11-07', category: 'marketing' }),
  task({ title: 'Configurar repositório do front-end', status: 'concluido', assigneeIds: ['u-wesley'], dueDate: '2026-11-04', updatedAt: '2026-11-04' }),
  task({ title: 'Tela de login', status: 'concluido', assigneeIds: ['u-wesley'], dueDate: '2026-10-20', updatedAt: '2026-10-20' }),
  task({ title: 'Tela de cadastro', status: 'concluido', assigneeIds: ['u-wesley', 'u-camila'], dueDate: '2026-10-24', updatedAt: '2026-10-24' }),
  task({ title: 'Biblioteca de componentes base', status: 'concluido', assigneeIds: ['u-wesley', 'u-matheus'], dueDate: '2026-10-15', updatedAt: '2026-10-15' }),
  task({ title: 'Tema escuro e tokens de cor', status: 'concluido', assigneeIds: ['u-camila'], dueDate: '2026-10-12', updatedAt: '2026-10-12', category: 'design' }),
  task({ title: 'Catálogo de cursos', status: 'concluido', assigneeIds: ['u-wesley'], dueDate: '2026-10-30', updatedAt: '2026-10-30' }),
  task({ title: 'Player de aulas', status: 'concluido', assigneeIds: ['u-wesley', 'u-victor'], dueDate: '2026-11-02', updatedAt: '2026-11-02' }),
  task({ title: 'Seção de depoimentos', status: 'concluido', projectId: 'p-landing', assigneeIds: ['u-matheus'], dueDate: '2026-11-01', updatedAt: '2026-11-01', category: 'design' }),
  task({ title: 'Formulário de inscrição no beta', status: 'concluido', projectId: 'p-landing', assigneeIds: ['u-wesley'], dueDate: '2026-11-05', updatedAt: '2026-11-05' }),
  task({ title: 'Plano de conteúdo do lançamento', status: 'concluido', projectId: 'p-lancamento', assigneeIds: ['u-ana', 'u-rafael'], dueDate: '2026-10-20', updatedAt: '2026-10-20', category: 'conteudo' }),
  task({ title: 'Roteiro do episódio 1', status: 'concluido', projectId: 'p-canal', assigneeIds: ['u-kailon'], dueDate: '2026-11-03', updatedAt: '2026-11-03', category: 'conteudo' }),
  task({ title: 'Wireframes da landing page', status: 'concluido', projectId: 'p-landing', assigneeIds: ['u-matheus'], dueDate: '2026-10-10', updatedAt: '2026-10-10', category: 'design' }),
];

export const news: NewsItem[] = [
  {
    id: 'n-1', category: 'ciberseguranca', cover: 'lock', featured: true, isDemo: true,
    title: 'Nova falha em navegadores pode expor seus dados',
    summary: 'Pesquisadores descrevem vulnerabilidade que permitiria a sites maliciosos ler dados de outras abas.',
    source: 'Portal Exemplo', publishedAt: '2026-11-11', readMinutes: 4,
    body: [
      'Este é um texto de demonstração criado para testar a área de leitura do Radar de Notícias.',
      'No cenário fictício, uma falha no isolamento entre abas permitiria que páginas maliciosas acessassem informações de outras sessões abertas.',
      'Recomendações gerais: mantenha o navegador atualizado, revise extensões instaladas e desconfie de links recebidos por mensagens.',
    ],
  },
  {
    id: 'n-2', category: 'redes', cover: 'router', featured: true, isDemo: true,
    title: 'Atualização corrige vulnerabilidade em roteadores',
    summary: 'Fabricante fictício libera firmware que corrige acesso remoto indevido ao painel do roteador.',
    source: 'Rede Demo', publishedAt: '2026-11-11', readMinutes: 3,
    body: [
      'Notícia de demonstração. O conteúdo não se refere a um fabricante real.',
      'A atualização de firmware bloquearia o acesso ao painel administrativo pela internet, que estaria habilitado por padrão.',
      'Boa prática: troque a senha padrão do roteador e desative o gerenciamento remoto quando não for necessário.',
    ],
  },
  {
    id: 'n-3', category: 'informatica', cover: 'chip', featured: false, isDemo: true,
    title: 'Novos processadores prometem mais desempenho e eficiência',
    summary: 'Geração fictícia de chips aposta em núcleos dedicados a IA e menor consumo de energia.',
    source: 'Tech Exemplo', publishedAt: '2026-11-10', readMinutes: 5,
    body: [
      'Conteúdo de demonstração para o Radar de Notícias.',
      'A nova geração traria núcleos especializados para tarefas de inteligência artificial executadas localmente.',
    ],
  },
  {
    id: 'n-4', category: 'ia', cover: 'ai', featured: true, isDemo: true,
    title: 'Assistentes de IA ganham recursos de verificação de golpes',
    summary: 'Ferramentas passam a analisar mensagens suspeitas e explicar sinais de fraude.',
    source: 'Portal Exemplo', publishedAt: '2026-11-09', readMinutes: 6,
    body: [
      'Notícia fictícia usada para demonstrar a interface.',
      'Assistentes analisariam mensagens recebidas e destacariam sinais comuns de golpe, como urgência e links encurtados.',
      'Pauta sugerida para um episódio do Firewalldo News.',
    ],
  },
  {
    id: 'n-5', category: 'programacao', cover: 'code', featured: false, isDemo: true,
    title: 'Biblioteca popular corrige falha de injeção de código',
    summary: 'Mantenedores recomendam atualizar dependências o quanto antes.',
    source: 'Dev Demo', publishedAt: '2026-11-08', readMinutes: 4,
    body: [
      'Texto de demonstração.',
      'A falha fictícia permitiria execução de código ao processar entradas não validadas.',
      'Lembrete para a equipe: manter dependências atualizadas e revisar alertas de segurança do repositório.',
    ],
  },
  {
    id: 'n-6', category: 'privacidade', cover: 'eye', featured: false, isDemo: true,
    title: 'Aplicativos de lanterna coletando localização: como se proteger',
    summary: 'Guia rápido para revisar permissões de apps no celular.',
    source: 'Rede Demo', publishedAt: '2026-11-07', readMinutes: 3,
    body: [
      'Conteúdo de demonstração.',
      'Revise periodicamente as permissões concedidas aos aplicativos e remova as que não fazem sentido para a função do app.',
    ],
  },
  {
    id: 'n-7', category: 'redes', cover: 'wifi', featured: false, isDemo: true,
    title: 'Wi-Fi público: o que muda com o novo padrão de criptografia',
    summary: 'Redes abertas passam a oferecer criptografia individual por dispositivo.',
    source: 'Tech Exemplo', publishedAt: '2026-11-06', readMinutes: 5,
    body: ['Notícia de demonstração sobre redes sem fio e criptografia oportunista.'],
  },
  {
    id: 'n-8', category: 'ciberseguranca', cover: 'bug', featured: false, isDemo: true,
    title: 'Campanha de phishing imita entregas de encomendas',
    summary: 'Mensagens falsas pedem pagamento de taxa para liberar pacote.',
    source: 'Portal Exemplo', publishedAt: '2026-11-05', readMinutes: 3,
    body: [
      'Notícia de demonstração.',
      'Golpes com falsas taxas de entrega são um tema recorrente e ótimo para conteúdo educativo.',
    ],
  },
  {
    id: 'n-9', category: 'ia', cover: 'chip', featured: false, isDemo: true,
    title: 'Modelos de IA locais chegam aos notebooks de entrada',
    summary: 'Processamento no próprio aparelho reduz envio de dados para a nuvem.',
    source: 'Dev Demo', publishedAt: '2026-11-04', readMinutes: 4,
    body: ['Texto de demonstração sobre IA executada localmente e privacidade.'],
  },
  {
    id: 'n-10', category: 'privacidade', cover: 'lock', featured: false, isDemo: true,
    title: 'Vazamentos de dados: como saber se seu e-mail foi exposto',
    summary: 'Passo a passo para verificar e reagir a vazamentos.',
    source: 'Tech Exemplo', publishedAt: '2026-11-03', readMinutes: 4,
    body: ['Conteúdo de demonstração com orientações gerais sobre vazamentos de dados.'],
  },
];

export const folders: LibraryFolder[] = [
  { id: 'f-design', name: 'Design', category: 'design', color: '#f472b6' },
  { id: 'f-video', name: 'Vídeos e Episódios', category: 'conteudo', color: '#a78bfa' },
  { id: 'f-roteiros', name: 'Roteiros', category: 'conteudo', color: '#fbbf24' },
  { id: 'f-marca', name: 'Marca e Guias', category: 'marketing', color: '#34d399' },
  { id: 'f-tec', name: 'Documentação Técnica', category: 'programacao', color: '#22d3ee' },
  { id: 'f-audio', name: 'Áudios e Trilhas', category: 'geral', color: '#fb923c' },
];

const DRIVE_EXAMPLE = 'https://drive.google.com/';

export const files: LibraryFile[] = [
  { id: 'a-1', name: 'teaser_lancamento_v1.mp4', folderId: 'f-video', kind: 'video', sizeBytes: 48_300_000, updatedAt: '2026-11-03', ownerId: 'u-matheus', driveUrl: DRIVE_EXAMPLE, tags: ['lançamento', 'vídeo'] },
  { id: 'a-2', name: 'news_ep01_final.mp4', folderId: 'f-video', kind: 'video', sizeBytes: 212_000_000, updatedAt: '2026-11-05', ownerId: 'u-kailon', driveUrl: DRIVE_EXAMPLE, tags: ['news', 'episódio'] },
  { id: 'a-3', name: 'vinheta_abertura.mp4', folderId: 'f-video', kind: 'video', sizeBytes: 9_800_000, updatedAt: '2026-11-08', ownerId: 'u-ana', driveUrl: DRIVE_EXAMPLE, tags: ['news', 'vinheta'] },
  { id: 'a-4', name: 'paleta_cores.svg', folderId: 'f-design', kind: 'image', sizeBytes: 1_200, updatedAt: '2026-11-02', ownerId: 'u-ana', previewUrl: '/demo/paleta-cores.svg', driveUrl: DRIVE_EXAMPLE, tags: ['marca', 'cores'] },
  { id: 'a-5', name: 'wireframe_landing.svg', folderId: 'f-design', kind: 'image', sizeBytes: 1_400, updatedAt: '2026-11-02', ownerId: 'u-wesley', previewUrl: '/demo/wireframe-landing.svg', driveUrl: DRIVE_EXAMPLE, tags: ['site', 'wireframe'] },
  { id: 'a-6', name: 'banner_redes.svg', folderId: 'f-marca', kind: 'image', sizeBytes: 900, updatedAt: '2026-11-02', ownerId: 'u-matheus', previewUrl: '/demo/banner-redes.svg', driveUrl: DRIVE_EXAMPLE, tags: ['redes sociais'] },
  { id: 'a-7', name: 'icones_app_v1.fig', folderId: 'f-design', kind: 'design', sizeBytes: 8_400_000, updatedAt: '2026-10-21', ownerId: 'u-ana', driveUrl: DRIVE_EXAMPLE, tags: ['ícones'] },
  { id: 'a-8', name: 'Roteiro_News_EP01_final.pdf', folderId: 'f-roteiros', kind: 'pdf', sizeBytes: 412_000, updatedAt: '2026-10-02', ownerId: 'u-kailon', driveUrl: DRIVE_EXAMPLE, tags: ['news', 'roteiro'] },
  { id: 'a-9', name: 'Roteiro_News_EP02_rascunho.docx', folderId: 'f-roteiros', kind: 'doc', sizeBytes: 64_000, updatedAt: '2026-11-10', ownerId: 'u-kailon', driveUrl: DRIVE_EXAMPLE, tags: ['news', 'roteiro'] },
  { id: 'a-10', name: 'Guia_de_Marca_v0.9.pdf', folderId: 'f-marca', kind: 'pdf', sizeBytes: 5_200_000, updatedAt: '2026-11-09', ownerId: 'u-ana', driveUrl: DRIVE_EXAMPLE, tags: ['marca'] },
  { id: 'a-11', name: 'Paleta_cores_impressao.pdf', folderId: 'f-marca', kind: 'pdf', sizeBytes: 180_000, updatedAt: '2026-10-28', ownerId: 'u-ana', driveUrl: DRIVE_EXAMPLE, tags: ['marca', 'cores'] },
  { id: 'a-12', name: 'Arquitetura_API_v1.pdf', folderId: 'f-tec', kind: 'pdf', sizeBytes: 920_000, updatedAt: '2026-11-08', ownerId: 'u-victor', driveUrl: DRIVE_EXAMPLE, tags: ['api', 'back-end'] },
  { id: 'a-13', name: 'Contrato_de_servicos_frontend.md', folderId: 'f-tec', kind: 'doc', sizeBytes: 18_000, updatedAt: '2026-11-11', ownerId: 'u-wesley', driveUrl: DRIVE_EXAMPLE, tags: ['front-end'] },
  { id: 'a-14', name: 'vinheta_news_trilha.mp3', folderId: 'f-audio', kind: 'audio', sizeBytes: 2_100_000, updatedAt: '2026-11-06', ownerId: 'u-kailon', driveUrl: DRIVE_EXAMPLE, tags: ['news', 'áudio'] },
  { id: 'a-15', name: 'narracao_ep01.wav', folderId: 'f-audio', kind: 'audio', sizeBytes: 18_400_000, updatedAt: '2026-10-04', ownerId: 'u-kailon', driveUrl: DRIVE_EXAMPLE, tags: ['news', 'narração'] },
  { id: 'a-16', name: 'Kit_midia_redes.zip', folderId: 'f-marca', kind: 'other', sizeBytes: 34_000_000, updatedAt: '2026-11-01', ownerId: 'u-matheus', driveUrl: DRIVE_EXAMPLE, tags: ['redes sociais'] },
];

export const ideas: Idea[] = [
  { id: 'i-1', title: 'Série sobre golpes no Pix', description: 'Série de vídeos explicando os golpes mais comuns no Pix, como identificar e se proteger.', category: 'video', status: 'aprovada', authorId: 'u-camila', votes: 12, votedByMe: false, createdAt: '2026-11-10' },
  { id: 'i-2', title: 'Quiz de redes', description: 'Quiz interativo sobre conceitos básicos de redes, com perguntas práticas e explicações.', category: 'educacao', status: 'em_analise', authorId: 'u-rafael', votes: 8, votedByMe: true, createdAt: '2026-11-09' },
  { id: 'i-3', title: 'Reels sobre phishing', description: 'Sequência de Reels curtos mostrando exemplos de phishing e dicas rápidas.', category: 'redes_sociais', status: 'aprovada', authorId: 'u-ana', votes: 19, votedByMe: false, createdAt: '2026-11-07' },
  { id: 'i-4', title: 'Desafio de firewall', description: 'Desafio prático para configurar regras de firewall em um cenário realista e seguro.', category: 'pratica', status: 'em_analise', authorId: 'u-wesley', votes: 6, votedByMe: false, createdAt: '2026-11-06' },
  { id: 'i-5', title: 'Guia para iniciantes', description: 'Guia completo e didático para quem está começando na cibersegurança.', category: 'guia', status: 'aprovada', authorId: 'u-maria', votes: 14, votedByMe: true, createdAt: '2026-11-04' },
  { id: 'i-6', title: 'Bastidores do app', description: 'Conteúdo de bastidores mostrando o processo de criação do nosso app e da equipe.', category: 'bastidores', status: 'em_analise', authorId: 'u-matheus', votes: 4, votedByMe: false, createdAt: '2026-11-03' },
  { id: 'i-7', title: 'Podcast semanal de segurança', description: 'Episódios curtos comentando os destaques do Radar de notícias.', category: 'video', status: 'nova', authorId: 'u-kailon', votes: 2, votedByMe: false, createdAt: '2026-11-11' },
  { id: 'i-8', title: 'Animação 3D no site', description: 'Elemento 3D leve para a landing page.', category: 'bastidores', status: 'arquivada', authorId: 'u-wesley', votes: 1, votedByMe: false, createdAt: '2026-10-15' },
];

export const notifications: AppNotification[] = [
  { id: 'nt-1', kind: 'tarefa', title: 'Tarefa concluída', description: '"Validar versão mobile" foi concluída por Matheus Alves.', createdAt: 'há 23 min', read: false },
  { id: 'nt-2', kind: 'projeto', title: 'Marco concluído', description: 'Canal Firewalldo · Episódio 1', createdAt: 'há 1 h', read: false },
  { id: 'nt-3', kind: 'tarefa', title: 'Nova tarefa aberta', description: '"Revisar onboarding" tem 4 vagas para aceitar.', createdAt: 'ontem', read: true },
  { id: 'nt-4', kind: 'sistema', title: 'Modo demonstração', description: 'Os dados deste portal são simulados nesta versão.', createdAt: 'ontem', read: true },
];

/** Fontes sugeridas para o Radar. A coleta (RSS/API) será implementada no Back-end. */
export const radarSources: RadarSource[] = [
  { id: 'src-cert', name: 'CERT.br', short: 'CB', url: 'https://www.cert.br/', description: 'Centro de Estudos, Resposta e Tratamento de Incidentes de Segurança no Brasil.', active: true },
  { id: 'src-msrc', name: 'Microsoft Security Response Center', short: 'MS', url: 'https://msrc.microsoft.com/', description: 'Avisos, vulnerabilidades e orientações de segurança da Microsoft.', active: true },
  { id: 'src-bc', name: 'BleepingComputer', short: 'BC', url: 'https://www.bleepingcomputer.com/', description: 'Notícias, análises e alertas sobre segurança da informação.', active: false },
];

/** Atalhos do "Acesso rápido". Links genéricos até a equipe configurar os definitivos. */
export const shortcuts: Shortcut[] = [
  { id: 'sc-drive', label: 'Google Drive', icon: 'drive', url: 'https://drive.google.com/' },
  { id: 'sc-youtube', label: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/' },
  { id: 'sc-instagram', label: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/' },
  { id: 'sc-tiktok', label: 'TikTok', icon: 'tiktok', url: 'https://www.tiktok.com/' },
  { id: 'sc-landing', label: 'Landing page', icon: 'landing', url: '' },
  { id: 'sc-mindmap', label: 'Mapa mental', icon: 'mindmap', url: '' },
];
