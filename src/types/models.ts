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
export type Role = 'admin' | 'usuario';
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
  avatarUrl?: string; // foto (opcional, futura)
  bio?: string;
  /** Conta desativada não pode ser atribuída a tarefas. */
  active: boolean;
  pendingInvite?: boolean;
}

export type MemberInput = Pick<Member, 'name' | 'email' | 'role' | 'title'>;

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
  id: ID;
  title: string;
  description: string;
  projectId: ID | null;
  category: Category;
  status: TaskStatus;
  priority: Priority;
  assigneeIds: ID[];
  /** Tarefa aberta: qualquer usuário pode aceitar enquanto houver vaga. */
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

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'createdBy'>;

/* ---------------- Projetos ---------------- */

export type ProjectStatus = 'planejamento' | 'em_andamento' | 'pausado' | 'concluido';

export interface Milestone {
  id: ID;
  title: string;
  dueDate: ISODate;
  done: boolean;
}

export interface Project {
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

export interface NewsItem {
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
  read: boolean;
  kind: 'tarefa' | 'projeto' | 'noticia' | 'sistema';
}

/** Atalho do "Acesso rápido" (editável em Configurações → Integrações). */
export interface Shortcut {
  id: ID;
  label: string;
  url: string;
  icon: 'drive' | 'youtube' | 'instagram' | 'tiktok' | 'landing' | 'mindmap' | 'link';
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
  | 'noticias.curar'
  | 'relatorios.ver'
  | 'configuracoes.integracoes';
