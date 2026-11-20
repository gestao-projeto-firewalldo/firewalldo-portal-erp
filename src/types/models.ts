/**
 * Modelos de dados do Portal Firewalldo.
 * Estes tipos são o CONTRATO entre o Front-end e o Back-end.
 * Os endpoints devem retornar objetos neste formato (ou ser adaptados em `src/services`).
 * Datas: ISODate = "AAAA-MM-DD". Timestamps: ISO 8601 completo.
 */

export type ID = string;
export type ISODate = string; // ex.: "2026-11-20"

/* ---------------- Usuários ---------------- */

/** Perfis de acesso. "usuario" = colaborador comum. */
export type Role = 'superadmin' | 'admin' | 'usuario';
/** Presença (o Back-end define a regra de online/offline). */
export type PresenceStatus = 'online' | 'offline';

export interface Member {
  id: ID;
  name: string;
  initials: string;
  email: string;
  role: Role;
  title: string; // função, ex.: "Desenvolvedor Front-end"
  areas: Category[]; // áreas de atuação
  status: PresenceStatus;
  color: string; // cor do avatar (hex)
  /** Foto de perfil (V1.9). Sem foto, o avatar mostra as iniciais. */
  avatarUrl?: string | null;
  /** Acesso individual ao Financeiro (administradores sempre têm). */
  financeAccess?: boolean;
  bio?: string;
  /** Conta desativada não pode ser atribuída a tarefas. */
  active: boolean;
  pendingInvite?: boolean;
}

export type MemberInput = Pick<Member, 'name' | 'email' | 'role' | 'title'> & { senha: string; bio?: string; areas?: Category[] };

/* ---------------- Tarefas ---------------- */

export type Category =
  | 'programacao'
  | 'design'
  | 'conteudo'
  | 'marketing'
  | 'infraestrutura'
  | 'gestao';

/** Colunas do Kanban. "backlog" = vagas abertas para aceitar. */
export type TaskStatus = 'backlog' | 'a_fazer' | 'em_andamento' | 'concluido';
export type Priority = 'baixa' | 'media' | 'alta' | 'critica';

export interface ChecklistItem {
  id: ID;
  text: string;
  done: boolean;
}

export interface Task {
  ticketNumber?: number;
  scheduleId?: ID | null;
  scheduledFor?: string | null;
  scheduleIndividual?: boolean;
  finalizedAt?: string | null;
  finalizedBy?: ID | null;
  finalizedByName?: string | null;
  finalizedProjectName?: string | null;
  id: ID;
  title: string;
  description: string;
  projectId: ID | null;
  category: Category;
  status: TaskStatus;
  priority: Priority;
  assigneeIds: ID[];
  /** Pessoas autorizadas a aceitar. Vazio = qualquer usuário ativo. Não ocupa vagas. */
  eligibleAssigneeIds?: ID[];
  /** Inscrição aberta no Backlog, até atingir o número de aceites. */
  open: boolean;
  /** Limite de responsáveis ("Lim. 1/3" = 1 aceitou de 3 vagas). */
  maxAssignees: number;
  dueDate: ISODate | null;
  checklist: ChecklistItem[];
  createdBy: ID;
  createdAt: ISODate;
  updatedAt: ISODate;
  order: number;
}

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'createdBy' | 'scheduleId' | 'scheduledFor' | 'scheduleIndividual' | 'ticketNumber' | 'finalizedAt' | 'finalizedBy' | 'finalizedByName' | 'finalizedProjectName'>;

/* ---------------- Projetos ---------------- */

export type ProjectStatus = 'planejamento' | 'em_andamento' | 'pausado' | 'concluido';

export interface Milestone {
  id: ID;
  title: string;
  dueDate: ISODate;
  done: boolean;
}

export interface Project {
  category?: Category | null;
  brand?: string;
  id: ID;
  name: string;
  subtitle: string;
  description: string;
  icon: 'code' | 'smartphone' | 'play' | 'globe' | 'palette' | 'shield' | 'server' | 'layout';
  color: string;
  status: ProjectStatus;
  /** Colaboradores do projeto. */
  ownerIds: ID[];
  milestones: Milestone[];
  startDate: ISODate;
  dueDate: ISODate;
  /** Progresso exibido (0–100). Sugestão: calcular no Back-end pelas tarefas concluídas. */
  progress: number;
}

/* ---------------- Biblioteca (fora do menu na V1.2) ---------------- */

export type FileKind = 'image' | 'pdf' | 'video' | 'audio' | 'doc' | 'design' | 'other';

export interface LibraryFolder {
  id: ID;
  name: string;
  category: Category | 'geral';
  color: string;
}

export interface LibraryFile {
  id: ID;
  name: string;
  folderId: ID;
  kind: FileKind;
  sizeBytes: number;
  updatedAt: ISODate;
  ownerId: ID;
  previewUrl?: string;
  driveUrl?: string;
  tags: string[];
}

/* ---------------- Radar de notícias ---------------- */

export type NewsCategory = 'ciberseguranca' | 'redes' | 'informatica' | 'programacao' | 'ia' | 'privacidade';

/** Posição da notícia no Radar (V1.9): 1 principal, 3 secundárias e 5 gerais. */
export type NewsSlot = 'principal' | 'secundaria' | 'geral';

export interface NewsInput {
  title: string;
  summary: string;
  /** Texto completo; parágrafos separados por linha em branco. */
  body: string;
  slot: NewsSlot;
  /** Data URL da imagem nova; "" remove; ausente mantém a atual. */
  image?: string;
  sourceName?: string;
  sourceUrl?: string;
  publishedAt?: ISODate;
}

export interface NewsItem {
  slot?: NewsSlot | null;
  updatedAt?: string;
  publicationStatus?: 'draft' | 'published';
  importedAt?: string | null;
  references?: {url: string; title: string}[];
  imageCredit?: string;
  imageSourceUrl?: string;
  imageIllustrative?: boolean;
  id: ID;
  title: string;
  summary: string;
  body: string[];
  category: NewsCategory;
  source: string;
  /** Link da matéria original (vem da coleta RSS/API). */
  url?: string;
  /** Imagem de capa (vem da coleta). Sem imagem, o front desenha uma capa pelo `cover`. */
  imageUrl?: string;
  publishedAt: ISODate;
  readMinutes: number;
  featured: boolean;
  cover: 'lock' | 'router' | 'chip' | 'ai' | 'code' | 'eye' | 'wifi' | 'bug';
  /** true enquanto as notícias forem fictícias (V1). */
  isDemo: boolean;
}

/** Fonte configurada para o Radar (a coleta real é do Back-end). */
export interface RadarSource {
  id: ID;
  name: string;
  description: string;
  url: string;
  /** Sigla exibida no lugar do logo. */
  short: string;
  active: boolean;
}

/* ---------------- Ideias ---------------- */

export type IdeaStatus = 'nova' | 'em_analise' | 'aprovada' | 'arquivada';
/** Formato de conteúdo proposto pela ideia. */
export type IdeaCategory = 'video' | 'educacao' | 'redes_sociais' | 'pratica' | 'guia' | 'bastidores';

export interface Idea {
  id: ID;
  title: string;
  description: string;
  category: IdeaCategory;
  status: IdeaStatus;
  authorId: ID;
  /** Total de "Gostei". */
  votes: number;
  /** Se o usuário logado deu "Gostei". */
  votedByMe: boolean;
  createdAt: ISODate;
}

export type IdeaInput = Pick<Idea, 'title' | 'description' | 'category'>;

/* ---------------- Notificações / Configurações ---------------- */

export interface AppNotification {
  id: ID;
  title: string;
  description: string;
  createdAt: string;
  /** Data/hora ISO (V1.9) para ordenar e detectar notificações novas. */
  createdAtIso?: string;
  read: boolean;
  kind: 'tarefa' | 'projeto' | 'noticia' | 'sistema';
}

/** Atalho do "Acesso rápido" (editável direto na Visão geral). */
export interface Shortcut {
  id: ID;
  label: string;
  url: string;
  icon: 'drive' | 'youtube' | 'instagram' | 'tiktok' | 'landing' | 'mindmap' | 'link';
  /** Logo enviada pela equipe (data URL). Quando existe, substitui o ícone padrão. */
  image?: string;
}

export interface ShortcutInput {
  label?: string;
  url?: string;
  image?: string;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  reducedMotion: boolean;
  notifications: {
    taskAssigned: boolean;
    taskDue: boolean;
    projectUpdates: boolean;
    newsDigest: boolean;
    email: boolean;
  };
}

export type Permission =
  | 'tarefas.criar'
  | 'tarefas.editar_todas'
  | 'tarefas.aceitar'
  | 'projetos.gerenciar'
  | 'biblioteca.enviar'
  | 'usuarios.gerenciar'
  | 'administradores.gerenciar'
  | 'auditoria.ver'
  | 'noticias.curar'
  | 'relatorios.ver'
  | 'configuracoes.integracoes'
  | 'financeiro.acessar';

/* ---------------- Agenda de tarefas ---------------- */
export type ScheduleKind = 'recurring' | 'weekly' | 'scheduled';
export interface ScheduleInput {
  initialStatus: 'backlog' | 'a_fazer';
  maxAssignees: number;
  title: string;
  description: string;
  projectId: ID | null;
  category: Category;
  priority: Priority;
  assigneeIds: ID[];
  kind: ScheduleKind;
  intervalDays: number;
  startDate: ISODate;
  endDate: ISODate | null;
  openingTime: string;
  weekdays: number[];
  dates: ISODate[];
  deadlineDays: number;
  checklist: ChecklistItem[];
}
export interface TaskSchedule extends ScheduleInput {
  id: ID;
  active: boolean;
  nextRunAt: string | null;
  upcoming: string[];
  createdBy: ID;
  createdAt: string;
  updatedAt: string;
}

/* ---------------- Financeiro (V1.9) ---------------- */
export type FinanceCategory = 'infraestrutura' | 'ferramentas' | 'servicos' | 'publicidade' | 'equipamentos' | 'pessoal' | 'impostos' | 'outros';
export type Billing = 'unica' | 'recorrente';
export type Frequency = 'mensal' | 'trimestral' | 'semestral' | 'anual';
export type InvestmentStatus = 'ativo' | 'pausado' | 'encerrado';
export type PaymentKind = 'pix' | 'boleto';
export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
/** "vencido" é calculado pelo servidor: pendente com vencimento já passado. */
export type PaymentStatus = 'pendente' | 'pago' | 'vencido' | 'cancelado';

export interface InvestmentInput {
  name: string;
  supplierName: string;
  legalName: string;
  document: string;
  category: FinanceCategory;
  description: string;
  ownerId: ID | null;
  amountCents: number;
  billing: Billing;
  frequency: Frequency | null;
  startDate: ISODate;
  dueDay: number | null;
  endDate: ISODate | null;
  status: InvestmentStatus;
  paymentMethod: PaymentKind;
  pixKeyType: PixKeyType | null;
  pixKey: string;
  notes: string;
}

export interface Investment extends InvestmentInput {
  id: ID;
  monthlyCents: number | null;
  paidCents: number;
  pendingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: ID;
  kind: PaymentKind;
  investmentId: ID | null;
  investmentName: string | null;
  period: string | null;
  beneficiary: string;
  document: string;
  description: string;
  amountCents: number;
  dueDate: ISODate;
  paidAt: ISODate | null;
  status: PaymentStatus;
  storedStatus: 'pendente' | 'pago' | 'cancelado';
  pixKeyType: PixKeyType | null;
  pixKey: string;
  barcode: string;
  hasAttachment: boolean;
  attachmentName: string;
  hasReceipt: boolean;
  receiptName: string;
  createdAt: string;
}

export interface PaymentInput {
  kind: PaymentKind;
  investmentId: ID | null;
  beneficiary: string;
  document: string;
  description: string;
  amountCents: number;
  dueDate: ISODate;
  pixKeyType?: PixKeyType | null;
  pixKey?: string;
  barcode?: string;
  status?: 'pendente' | 'pago' | 'cancelado';
  paidAt?: ISODate | null;
  /** Data URL; "" remove; ausente mantém. */
  attachment?: string;
  attachmentName?: string;
  receipt?: string;
  receiptName?: string;
}

export interface FinanceSummary {
  monthlyCents: number;
  activeCount: number;
  paidCents: number;
  pendingCents: number;
  overdueCents: number;
  overdueCount: number;
  period: string;
  upcoming: Payment[];
}
