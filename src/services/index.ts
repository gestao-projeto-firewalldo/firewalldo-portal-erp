/**
 * Serviços do portal — ÚNICO ponto de acesso a dados das telas.
 *
 * Cada método tem dois caminhos:
 *   - `useApi()` verdadeiro  → chama a API real via `http` (rota indicada no TODO(api)).
 *   - caso contrário         → usa o estado simulado (`mockDb`) com latência artificial.
 * Para integrar o Back-end: definir VITE_DATA_SOURCE=api e implementar as rotas abaixo.
 * As regras de negócio aplicadas aqui no mock (ex.: limite de vagas) devem ser
 * replicadas/validadas no servidor — o front não é fonte de verdade.
 */
import { http, mockDb, simulate, today, uid, useApi, ServiceError } from './core';
import type {
  AppNotification,
  ChecklistItem,
  Idea,
  IdeaInput,
  IdeaStatus,
  LibraryFile,
  LibraryFolder,
  Member,
  MemberInput,
  NewsItem,
  Project,
  RadarSource,
  Role,
  Shortcut,
  Task,
  TaskInput,
  TaskStatus,
  UserPreferences,
} from '@/types/models';

const db = () => mockDb.get();
const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('');

/* ================= Sessão ================= */

export const authService = {
  /** Usuário logado. TODO(api): GET /auth/me */
  async me(): Promise<Member> {
    if (useApi()) return http.get('/auth/me');
    return simulate(() => {
      const s = db();
      const m = s.members.find((x) => x.id === s.currentUserId)!;
      return { ...m, role: s.viewAsRole };
    });
  },
  /** Somente demonstração: alterna o perfil para testar permissões na interface. */
  setViewAsRole(role: Role) {
    mockDb.update((d) => {
      d.viewAsRole = role;
    });
  },
};

/* ================= Usuários ================= */

const PALETTE = ['#2563eb', '#8b5cf6', '#16a34a', '#d97706', '#db2777', '#0d9488', '#e11d48', '#0891b2'];

export const membersService = {
  /** TODO(api): GET /users */
  async list(): Promise<Member[]> {
    if (useApi()) return http.get('/users');
    return simulate(() => db().members);
  },
  /** TODO(api): POST /users  (Back-end envia convite/define senha) */
  async create(input: MemberInput): Promise<Member & { inviteToken?: string }> {
    if (useApi()) return http.post('/users', input);
    const s = db();
    if (s.members.some((m) => m.email.toLowerCase() === input.email.toLowerCase()))
      throw new ServiceError('Já existe um usuário com este e-mail.', 'CONFLICT');
    const m: Member = {
      ...input,
      id: uid('u'),
      initials: initialsOf(input.name),
      areas: [],
      status: 'offline',
      color: PALETTE[s.members.length % PALETTE.length],
      active: true,
    };
    mockDb.update((d) => {
      d.members.push(m);
    });
    return simulate(() => m);
  },
  /** TODO(api): PATCH /users/:id */
  async update(id: string, patch: Partial<Pick<Member, 'name' | 'title' | 'bio' | 'role' | 'active' | 'areas'>>): Promise<Member> {
    if (useApi()) return http.patch(`/users/${id}`, patch);
    mockDb.update((d) => {
      const m = d.members.find((x) => x.id === id);
      if (!m) return;
      Object.assign(m, patch);
      if (patch.name) m.initials = initialsOf(patch.name);
    });
    return simulate(() => db().members.find((x) => x.id === id)!);
  },
};

/* ================= Projetos ================= */

export const projectsService = {
  /** TODO(api): GET /projects */
  async list(): Promise<Project[]> {
    if (useApi()) return http.get('/projects');
    return simulate(() => db().projects);
  },
  /** TODO(api): GET /projects/:id */
  async get(id: string): Promise<Project> {
    if (useApi()) return http.get(`/projects/${id}`);
    return simulate(() => {
      const p = db().projects.find((x) => x.id === id);
      if (!p) throw new ServiceError('Projeto não encontrado.', 'NOT_FOUND');
      return p;
    });
  },
  /** TODO(api): PATCH /projects/:id/milestones/:milestoneId  { done } */
  async toggleMilestone(projectId: string, milestoneId: string): Promise<Project> {
    if (useApi()) return http.patch(`/projects/${projectId}/milestones/${milestoneId}`, {});
    mockDb.update((d) => {
      const m = d.projects.find((p) => p.id === projectId)?.milestones.find((x) => x.id === milestoneId);
      if (m) m.done = !m.done;
    });
    return this.get(projectId);
  },
  /** TODO(api): POST /projects */
  async create(input: Pick<Project, 'name' | 'subtitle' | 'description' | 'icon' | 'color' | 'dueDate' | 'ownerIds'>): Promise<Project> {
    if (useApi()) return http.post('/projects', input);
    const project: Project = { ...input, id: uid('p'), status: 'planejamento', milestones: [], startDate: today(), progress: 0 };
    mockDb.update((d) => {
      d.projects.push(project);
    });
    return simulate(() => project);
  },
};

/* ================= Tarefas ================= */

export const tasksService = {
  /** TODO(api): GET /tasks   (filtros opcionais: ?projectId=&assigneeId=&status=) */
  async list(): Promise<Task[]> {
    if (useApi()) return http.get('/tasks');
    return simulate(() => [...db().tasks].sort((a, b) => a.order - b.order));
  },
  /** Criar tarefa (admin, dentro de um projeto). TODO(api): POST /tasks */
  async create(input: TaskInput): Promise<Task> {
    if (useApi()) return http.post('/tasks', input);
    const s = db();
    const task: Task = {
      ...input,
      id: uid('t'),
      createdBy: s.currentUserId,
      createdAt: today(),
      updatedAt: today(),
      order: Math.max(0, ...s.tasks.map((x) => x.order)) + 1,
    };
    mockDb.update((d) => {
      d.tasks.push(task);
    });
    return simulate(() => task);
  },
  /** TODO(api): PATCH /tasks/:id */
  async update(id: string, patch: Partial<Task>): Promise<Task> {
    if (useApi()) return http.patch(`/tasks/${id}`, patch);
    mockDb.update((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (t) Object.assign(t, patch, { updatedAt: today() });
    });
    return simulate(() => db().tasks.find((x) => x.id === id)!);
  },
  /** Muda coluna/ordem (arrastar no Kanban). TODO(api): PATCH /tasks/:id/move  { status, beforeId } */
  async move(id: string, status: TaskStatus, beforeId: string | null): Promise<void> {
    if (useApi()) return http.patch(`/tasks/${id}/move`, { status, beforeId });
    mockDb.update((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (!t) return;
      t.status = status;
      t.updatedAt = today();
      const col = d.tasks.filter((x) => x.status === status && x.id !== id).sort((a, b) => a.order - b.order);
      const idx = beforeId ? col.findIndex((x) => x.id === beforeId) : -1;
      col.splice(idx < 0 ? col.length : idx, 0, t);
      col.forEach((x, i) => (x.order = i + 1));
    });
    return simulate(() => undefined);
  },
  /**
   * Usuário logado aceita uma vaga. TODO(api): POST /tasks/:id/accept
   * Regras: tarefa precisa estar aberta e com vaga (assigneeIds.length < maxAssignees).
   * Ao lotar, a tarefa fecha (open=false) e sai do Backlog para "A fazer".
   */
  async accept(id: string): Promise<Task> {
    if (useApi()) return http.post(`/tasks/${id}/accept`, {});
    const t0 = db().tasks.find((x) => x.id === id);
    if (!t0) throw new ServiceError('Tarefa não encontrada.', 'NOT_FOUND');
    if (!t0.open || t0.assigneeIds.length >= t0.maxAssignees) throw new ServiceError('Não há vagas nesta tarefa.', 'NO_SLOTS');
    mockDb.update((d) => {
      const t = d.tasks.find((x) => x.id === id)!;
      if (!t.assigneeIds.includes(d.currentUserId)) t.assigneeIds.push(d.currentUserId);
      if (t.assigneeIds.length >= t.maxAssignees) {
        t.open = false;
        if (t.status === 'backlog') t.status = 'a_fazer';
      }
      t.updatedAt = today();
    });
    return simulate(() => db().tasks.find((x) => x.id === id)!);
  },
  /** Desistir de uma vaga. TODO(api): POST /tasks/:id/leave */
  async leave(id: string): Promise<Task> {
    if (useApi()) return http.post(`/tasks/${id}/leave`, {});
    mockDb.update((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (!t) return;
      t.assigneeIds = t.assigneeIds.filter((a) => a !== d.currentUserId);
    });
    return simulate(() => db().tasks.find((x) => x.id === id)!);
  },
  /** TODO(api): PUT /tasks/:id/checklist */
  async setChecklist(id: string, checklist: ChecklistItem[]): Promise<Task> {
    return this.update(id, { checklist });
  },
  /** TODO(api): DELETE /tasks/:id */
  async remove(id: string): Promise<void> {
    if (useApi()) return http.del(`/tasks/${id}`);
    mockDb.update((d) => {
      d.tasks = d.tasks.filter((x) => x.id !== id);
    });
    return simulate(() => undefined);
  },
};

/* ================= Biblioteca (fora do menu) ================= */

export const libraryService = {
  /** TODO(api): GET /library/folders */
  async folders(): Promise<LibraryFolder[]> {
    if (useApi()) return http.get('/library/folders');
    return simulate(() => db().folders);
  },
  /** TODO(api): GET /library/files */
  async files(): Promise<LibraryFile[]> {
    if (useApi()) return http.get('/library/files');
    return simulate(() => db().files);
  },
  /** V1: só registra localmente (sem upload). TODO(api): POST /library/files (multipart) → Google Drive */
  async addLocal(file: File, folderId: string): Promise<LibraryFile> {
    const kind: LibraryFile['kind'] = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : file.type === 'application/pdf'
            ? 'pdf'
            : 'other';
    const entry: LibraryFile = {
      id: uid('a'),
      name: file.name,
      folderId,
      kind,
      sizeBytes: file.size,
      updatedAt: today(),
      ownerId: db().currentUserId,
      previewUrl: URL.createObjectURL(file),
      tags: ['local'],
    };
    mockDb.update((d) => {
      d.files.unshift({ ...entry, previewUrl: undefined });
    });
    return simulate(() => entry);
  },
};

/* ================= Radar de notícias ================= */

export const newsService = {
  /** V1: notícias de demonstração. TODO(api): GET /news (coleta das fontes ativas) */
  async list(): Promise<NewsItem[]> {
    if (useApi()) return http.get('/news');
    return simulate(() => db().news);
  },
  /** TODO(api): GET /news/saved  → string[] de ids */
  async savedIds(): Promise<string[]> {
    if (useApi()) return http.get('/news/saved');
    return simulate(() => db().savedNewsIds);
  },
  /** Alterna "salvar". TODO(api): POST /news/:id/save  → string[] atualizado */
  async toggleSave(id: string): Promise<string[]> {
    if (useApi()) return http.post(`/news/${id}/save`, {});
    mockDb.update((d) => {
      d.savedNewsIds = d.savedNewsIds.includes(id) ? d.savedNewsIds.filter((x) => x !== id) : [...d.savedNewsIds, id];
    });
    return simulate(() => db().savedNewsIds);
  },
};

/* ================= Ideias ================= */

export const ideasService = {
  /** TODO(api): GET /ideas  (votedByMe calculado para o usuário logado) */
  async list(): Promise<Idea[]> {
    if (useApi()) return http.get('/ideas');
    return simulate(() => db().ideas);
  },
  /** TODO(api): POST /ideas */
  async create(input: IdeaInput): Promise<Idea> {
    if (useApi()) return http.post('/ideas', input);
    const idea: Idea = { ...input, id: uid('i'), status: 'nova', authorId: db().currentUserId, votes: 0, votedByMe: false, createdAt: today() };
    mockDb.update((d) => {
      d.ideas.unshift(idea);
    });
    return simulate(() => idea);
  },
  /** Admin muda status. TODO(api): PATCH /ideas/:id  { status } */
  async setStatus(id: string, status: IdeaStatus): Promise<void> {
    if (useApi()) return http.patch(`/ideas/${id}`, { status });
    mockDb.update((d) => {
      const i = d.ideas.find((x) => x.id === id);
      if (i) i.status = status;
    });
    return simulate(() => undefined);
  },
  /** "Gostei" (um por usuário). TODO(api): POST /ideas/:id/vote  (alternar) */
  async toggleVote(id: string): Promise<void> {
    if (useApi()) return http.post(`/ideas/${id}/vote`, {});
    mockDb.update((d) => {
      const i = d.ideas.find((x) => x.id === id);
      if (!i) return;
      i.votedByMe = !i.votedByMe;
      i.votes += i.votedByMe ? 1 : -1;
    });
    return simulate(() => undefined);
  },
};

/* ================= Notificações ================= */

export const notificationsService = {
  /** TODO(api): GET /notifications  (futuro: tempo real via WebSocket/SSE) */
  async list(): Promise<AppNotification[]> {
    if (useApi()) return http.get('/notifications');
    return simulate(() => db().notifications);
  },
  /** TODO(api): POST /notifications/read-all */
  async markAllRead(): Promise<void> {
    if (useApi()) return http.post('/notifications/read-all', {});
    mockDb.update((d) => {
      d.notifications.forEach((n) => (n.read = true));
    });
    return simulate(() => undefined);
  },
};

/* ================= Configurações (integrações) ================= */

export const settingsService = {
  /** TODO(api): GET /settings/radar-sources */
  async radarSources(): Promise<RadarSource[]> {
    if (useApi()) return http.get('/settings/radar-sources');
    return simulate(() => db().radarSources);
  },
  /** Salva a lista inteira (ativar/pausar, adicionar). TODO(api): PUT /settings/radar-sources */
  async saveRadarSources(list: RadarSource[]): Promise<RadarSource[]> {
    if (useApi()) return http.request('/settings/radar-sources', { method: 'PUT', body: JSON.stringify(list) });
    mockDb.update((d) => {
      d.radarSources = list;
    });
    return simulate(() => db().radarSources);
  },
  /** Atalhos do "Acesso rápido". TODO(api): GET /settings/shortcuts */
  async shortcuts(): Promise<Shortcut[]> {
    if (useApi()) return http.get('/settings/shortcuts');
    return simulate(() => db().shortcuts);
  },
  /** TODO(api): PUT /settings/shortcuts */
  async saveShortcuts(list: Shortcut[]): Promise<Shortcut[]> {
    if (useApi()) return http.request('/settings/shortcuts', { method: 'PUT', body: JSON.stringify(list) });
    mockDb.update((d) => {
      d.shortcuts = list;
    });
    return simulate(() => db().shortcuts);
  },
};

/* ================= Preferências pessoais ================= */

export const preferencesService = {
  get(): UserPreferences {
    return db().preferences;
  },
  /** V1: salvo só neste navegador. TODO(api): PATCH /me/preferences */
  save(prefs: UserPreferences) {
    mockDb.update((d) => {
      d.preferences = prefs;
    });
  },
};

export { mockDb, devFlags } from './core';
export { uid } from './core';
