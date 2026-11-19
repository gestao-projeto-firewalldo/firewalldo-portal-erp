import type {
  Category,
  FileKind,
  IdeaCategory,
  IdeaStatus,
  Role,
  NewsCategory,
  Priority,
  ProjectStatus,
  TaskStatus,
} from '@/types/models';

export const categoryLabel: Record<Category, string> = {
  programacao: 'Programação',
  design: 'Design',
  conteudo: 'Conteúdo',
  marketing: 'Marketing',
  infraestrutura: 'Infraestrutura',
  gestao: 'Gestão',
};

export const categoryColor: Record<Category, string> = {
  programacao: '#22d3ee',
  design: '#f472b6',
  conteudo: '#fbbf24',
  marketing: '#34d399',
  infraestrutura: '#fb923c',
  gestao: '#a78bfa',
};

export const statusLabel: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  concluido: 'Concluídas',
};

export const statusOrder: TaskStatus[] = ['backlog', 'a_fazer', 'em_andamento', 'concluido'];

export const statusColor: Record<TaskStatus, string> = {
  backlog: '#3b82f6',
  a_fazer: '#f97316',
  em_andamento: '#eab308',
  concluido: '#22c55e',
};

export const priorityLabel: Record<Priority, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

export const priorityTone: Record<Priority, string> = {
  baixa: 'p-baixa',
  media: 'p-media',
  alta: 'p-alta',
  critica: 'p-critica',
};

export const projectStatusLabel: Record<ProjectStatus, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
};

export const roleLabel: Record<Role, string> = {
  superadmin: 'Administrador geral',
  admin: 'Administrador',
  usuario: 'Usuário',
};

export const newsCategoryLabel: Record<NewsCategory, string> = {
  ciberseguranca: 'Cibersegurança',
  redes: 'Redes',
  informatica: 'Informática',
  programacao: 'Programação',
  ia: 'IA',
  privacidade: 'Privacidade',
};

export const newsCategoryColor: Record<NewsCategory, string> = {
  ciberseguranca: '#ef4444',
  redes: '#3b82f6',
  informatica: '#8b5cf6',
  programacao: '#22d3ee',
  ia: '#14b8a6',
  privacidade: '#f59e0b',
};

export const ideaStatusLabel: Record<IdeaStatus, string> = {
  nova: 'Nova',
  em_analise: 'Em análise',
  aprovada: 'Aprovada',
  arquivada: 'Arquivada',
};

export const ideaCategoryLabel: Record<IdeaCategory, string> = {
  video: 'Vídeo',
  educacao: 'Educação',
  redes_sociais: 'Redes sociais',
  pratica: 'Mão na prática',
  guia: 'Guia',
  bastidores: 'Bastidores',
};

export const fileKindLabel: Record<FileKind, string> = {
  image: 'Imagem',
  pdf: 'PDF',
  video: 'Vídeo',
  audio: 'Áudio',
  doc: 'Documento',
  design: 'Design',
  other: 'Arquivo',
};

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function shortDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

export function newsDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1]}. de ${y}`;
}

export function longDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function relativeDay(iso: string) {
  const diff = daysUntil(iso);
  if (diff === 0) return 'Hoje';
  if (diff === -1) return 'Ontem';
  if (diff < 0) return `há ${-diff} dias`;
  return shortDate(iso);
}

export function daysUntil(iso: string) {
  const now = new Date();
  const base = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - base) / 86_400_000);
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Global launch number, assigned by the database, never by the browser. */
export const ticketLabel = (task: {ticketNumber?: number}) => task.ticketNumber ? `ticket${String(task.ticketNumber).padStart(2,'0')}` : '';
