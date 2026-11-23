/**
 * Serviços do portal — ÚNICO ponto de acesso a dados das telas.
 *
 * Cada método tem dois caminhos:
 *   - `useApi()` verdadeiro  → chama a API real via `http` (rota indicada no TODO(api)).
 *   - caso contrário         → usa o estado simulado (`mockDb`) com latência artificial.
 * O Dockerfile define VITE_DATA_SOURCE=api para usar os endpoints reais.
 * As regras de negócio aplicadas aqui no mock (ex.: limite de vagas) devem ser
 * replicadas/validadas no servidor — o front não é fonte de verdade.
 */
import { canMoveTask, taskSteps, isEligible } from '@/lib/taskWorkflow';
import { appConfig } from '@/config';
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
  FinanceSummary,
  Investment,
  InvestmentInput,
  NewsInput,
  NewsItem,
  NewsSlot,
  Payment,
  PaymentInput,
  PaymentKind,
  Project,
  Role,
  Shortcut,
  ShortcutInput,
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
  /** Usuário logado. API: GET /auth/me */
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
  /** API: GET /users */
  async list(): Promise<Member[]> {
    if (useApi()) return http.get('/users');
    return simulate(() => db().members);
  },
  /** API: POST /users  (Back-end envia convite/define senha) */
  async create(input: MemberInput): Promise<Member & { inviteToken?: string }> {
    if (useApi()) return http.post('/users', input);
    const s = db();
    if (s.members.some((m) => m.email.toLowerCase() === input.email.toLowerCase()))
      throw new ServiceError('Já existe um usuário com este e-mail.', 'CONFLICT');
    const { senha: _password, ...profile } = input;
    const m: Member = {
      ...profile,
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
  /** API: PATCH /users/:id */
  async update(id: string, patch: Partial<Pick<Member, 'name' | 'email' | 'title' | 'bio' | 'role' | 'active' | 'areas' | 'financeAccess'>> & { senha?: string; confirmacaoSenha?: string; senhaAtual?: string }): Promise<Member> {
    if (useApi()) return http.patch(`/users/${id}`, patch);
    mockDb.update((d) => {
      const m = d.members.find((x) => x.id === id);
      if (!m) return;
      const { senha: _password, confirmacaoSenha: _confirmation, senhaAtual: _current, ...profile } = patch;
      Object.assign(m, profile);
      if (patch.name) m.initials = initialsOf(patch.name);
    });
    return simulate(() => db().members.find((x) => x.id === id)!);
  },
};

/** Foto de perfil (V1.9). API: PUT/DELETE /users/:id/photo */
export const photoService = {
  async save(id: string, image: string): Promise<Member> {
    if (useApi()) return http.request(`/users/${id}/photo`, { method: 'PUT', body: JSON.stringify({ image }) });
    mockDb.update((d) => { const m = d.members.find((x) => x.id === id); if (m) m.avatarUrl = image; });
    return simulate(() => db().members.find((x) => x.id === id)!);
  },
  async remove(id: string): Promise<Member> {
    if (useApi()) return http.del(`/users/${id}/photo`);
    mockDb.update((d) => { const m = d.members.find((x) => x.id === id); if (m) m.avatarUrl = null; });
    return simulate(() => db().members.find((x) => x.id === id)!);
  },
};

/* ================= Projetos ================= */

export const projectsService = {
  async remove(id: string): Promise<void> {
    if (useApi()) return http.del(`/projects/${id}`);
    const state = db();
    if (!['admin', 'superadmin'].includes(state.viewAsRole)) throw new ServiceError('Sem permissão.', 'FORBIDDEN');
    if (!state.projects.some(p => p.id === id)) throw new ServiceError('Projeto não encontrado.', 'NOT_FOUND');
    mockDb.update(d => { d.projects = d.projects.filter(p => p.id !== id); d.tasks.forEach(t => { if (t.projectId === id) t.projectId = null; }); });
  },
  async update(id: string, patch: Partial<Omit<Project,'id'|'startDate'|'progress'>>): Promise<Project> {
    if (useApi()) return http.patch(`/projects/${id}`,patch);
    mockDb.update(d=>{const item=d.projects.find(p=>p.id===id);if(item)Object.assign(item,patch);});
    return this.get(id);
  },
  /** API: GET /projects */
  async list(): Promise<Project[]> {
    if (useApi()) return http.get('/projects');
    return simulate(() => db().projects);
  },
  /** API: GET /projects/:id */
  async get(id: string): Promise<Project> {
    if (useApi()) return http.get(`/projects/${id}`);
    return simulate(() => {
      const p = db().projects.find((x) => x.id === id);
      if (!p) throw new ServiceError('Projeto não encontrado.', 'NOT_FOUND');
      return p;
    });
  },
  /** API: PATCH /projects/:id/milestones/:milestoneId  { done } */
  async toggleMilestone(projectId: string, milestoneId: string): Promise<Project> {
    if (useApi()) return http.patch(`/projects/${projectId}/milestones/${milestoneId}`, {});
    mockDb.update((d) => {
      const m = d.projects.find((p) => p.id === projectId)?.milestones.find((x) => x.id === milestoneId);
      if (m) m.done = !m.done;
    });
    return this.get(projectId);
  },
  /** API: POST /projects */
  async create(input: Pick<Project, 'name' | 'subtitle' | 'description' | 'icon' | 'color' | 'dueDate' | 'ownerIds'> & Pick<Project,'category'|'brand'> & Partial<Pick<Project,'status'|'milestones'>>): Promise<Project> {
    if (useApi()) return http.post('/projects', input);
    const project: Project = { ...input, id: uid('p'), status: input.status ?? 'planejamento', milestones: input.milestones ?? [], startDate: today(), progress: 0 };
    mockDb.update((d) => {
      d.projects.push(project);
    });
    return simulate(() => project);
  },
};

/* ================= Tarefas ================= */
function validateMockTransition(task: Task, status: TaskStatus) {
  const state = db();
  if (!canMoveTask(task, { id: state.currentUserId, role: state.viewAsRole })) throw new ServiceError('Você só pode mover tarefas em que é responsável.', 'FORBIDDEN');
  if (status !== task.status && !taskSteps(task.status).some(step => step.status === status)) throw new ServiceError('Use a próxima etapa ou a anterior. No Backlog, use Aceitar tarefa.', 'INVALID_INPUT');
}


export const tasksService = {
  /** API: GET /tasks   (filtros opcionais: ?projectId=&assigneeId=&status=) */
  async list(): Promise<Task[]> {
    if (useApi()) return http.get('/tasks');
    return simulate(() => [...db().tasks].filter(task => db().viewAsRole !== 'usuario' || task.assigneeIds.includes(db().currentUserId) || (task.status==='backlog' && task.open && isEligible(task,db().currentUserId))).sort((a, b) => a.order - b.order));
  },
  /** Criar tarefa (admin, dentro de um projeto). API: POST /tasks */
  async create(input: TaskInput): Promise<Task> {
    if (useApi()) return http.post('/tasks', input);
    const s = db();
    if (!['backlog', 'a_fazer'].includes(input.status)) throw new ServiceError('Crie a tarefa no Backlog ou em A fazer.', 'INVALID_INPUT');
    const task: Task = {
      ...input,
      eligibleAssigneeIds: input.eligibleAssigneeIds ?? (input.status==='backlog' ? input.assigneeIds : []),
      assigneeIds: input.status==='backlog' ? [] : input.assigneeIds,
      open: input.status==='backlog',
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
  /** API: PATCH /tasks/:id */
  async update(id: string, patch: Partial<Task>): Promise<Task> {
    if (useApi()) return http.patch(`/tasks/${id}`, patch);
    const current = db().tasks.find(t => t.id === id);
    if (current && patch.status && patch.status !== current.status) validateMockTransition(current, patch.status);
    if (current?.status==='backlog' && patch.assigneeIds && JSON.stringify(patch.assigneeIds)!==JSON.stringify(current.assigneeIds)) throw new ServiceError('Os responsáveis do Backlog são definidos pelos aceites.', 'INVALID_INPUT');
    if (current && current.assigneeIds.length>(patch.maxAssignees??current.maxAssignees)) throw new ServiceError('O limite não pode ser menor que o número de aceites confirmados.','INVALID_INPUT');
    mockDb.update((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (t) {
        Object.assign(t, patch, { updatedAt: today() });
        t.open=t.status==='backlog' && t.assigneeIds.length<t.maxAssignees;
        if(t.status==='backlog' && t.assigneeIds.length===t.maxAssignees)t.status='a_fazer';
      }
    });
    return simulate(() => db().tasks.find((x) => x.id === id)!);
  },
  /** Move uma etapa usando os botões do Kanban. API: PATCH /tasks/:id/move  { status, beforeId } */
  async move(id: string, status: TaskStatus, beforeId: string | null): Promise<void> {
    if (useApi()) return http.patch(`/tasks/${id}/move`, { status, beforeId });
    const current = db().tasks.find(t => t.id === id);
    if (!current) throw new ServiceError('Tarefa não encontrada.', 'NOT_FOUND');
    validateMockTransition(current, status);
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
   * Usuário logado aceita uma vaga. API: POST /tasks/:id/accept
   * Regras: tarefa precisa estar aberta e com vaga (assigneeIds.length < maxAssignees).
   * Ao lotar, a tarefa fecha (open=false) e sai do Backlog para "A fazer".
   */
  async accept(id: string): Promise<Task> {
    if (useApi()) return http.post(`/tasks/${id}/accept`, {});
    const t0 = db().tasks.find((x) => x.id === id);
    if (!t0) throw new ServiceError('Tarefa não encontrada.', 'NOT_FOUND');
    if (t0.assigneeIds.includes(db().currentUserId)) return simulate(() => t0);
    if (!isEligible(t0,db().currentUserId)) throw new ServiceError('Você não está na lista de pessoas que podem aceitar.', 'FORBIDDEN');
    if (t0.status!=='backlog' || !t0.open || t0.assigneeIds.length >= t0.maxAssignees) throw new ServiceError('Não há vagas nesta tarefa.', 'NO_SLOTS');
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
  /** Desistir de uma vaga. API: POST /tasks/:id/leave */
  async leave(id: string): Promise<Task> {
    if (useApi()) return http.post(`/tasks/${id}/leave`, {});
    mockDb.update((d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (!t) return;
      t.assigneeIds = t.assigneeIds.filter((a) => a !== d.currentUserId);
      t.open=t.status==='backlog';
    });
    return simulate(() => db().tasks.find((x) => x.id === id)!);
  },
  /** API: PUT /tasks/:id/checklist */
  async setChecklist(id: string, checklist: ChecklistItem[]): Promise<Task> {
    return this.update(id, { checklist });
  },
  /** API: DELETE /tasks/:id */
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
  /** API: GET /library/folders */
  async folders(): Promise<LibraryFolder[]> {
    if (useApi()) return http.get('/library/folders');
    return simulate(() => db().folders);
  },
  /** API: GET /library/files */
  async files(): Promise<LibraryFile[]> {
    if (useApi()) return http.get('/library/files');
    return simulate(() => db().files);
  },
  /** API: POST /library/files, conteúdo persistido no PostgreSQL (até 5 MB). */
  async remove(id: string): Promise<void> { return http.del(`/library/files/${id}`); },
  async addLocal(file: File, folderId: string): Promise<LibraryFile> {
    if (useApi()) {
      if (!file.size || file.size > 5 * 1024 * 1024) throw new ServiceError('Envie um arquivo de até 5 MB.','INVALID_INPUT');
      const content = await new Promise<string>((resolve,reject) => {
        const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Não foi possível ler o arquivo.'));reader.readAsDataURL(file);
      });
      return http.post('/library/files',{name:file.name,folderId,mediaType:file.type,content});
    }
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

export const NEWS_LIMITS: Record<NewsSlot, number> = { principal: 1, secundaria: 3, geral: 5 };
const slotOrder: Record<NewsSlot, number> = { principal: 0, secundaria: 1, geral: 2 };
const sortNews = (list: NewsItem[]) =>
  [...list].sort((a, b) => slotOrder[a.slot ?? 'geral'] - slotOrder[b.slot ?? 'geral'] || b.publishedAt.localeCompare(a.publishedAt));

/** Radar manual (V1.9): até 9 notícias, limites conferidos também no servidor. */
export const newsService = {
  /** API: GET /news (principal, secundárias e gerais publicadas). */
  async list(): Promise<NewsItem[]> {
    if (useApi()) return http.get('/news');
    return simulate(() => sortNews(db().news.filter((n) => n.slot)));
  },
  /** API: POST /news */
  async create(input: NewsInput): Promise<NewsItem> {
    if (useApi()) return http.post('/news', input);
    const used = db().news.filter((n) => n.slot === input.slot).length;
    if (used >= NEWS_LIMITS[input.slot]) throw new ServiceError('Não há vaga disponível nesta categoria.', 'CONFLICT');
    const item: NewsItem = {
      id: uid('n'), title: input.title, summary: input.summary, body: input.body.split(/\n\s*\n|\n/).filter((p) => p.trim()),
      slot: input.slot, source: input.sourceName ?? '', url: input.sourceUrl ?? '', imageUrl: input.image || undefined,
      publishedAt: input.publishedAt ?? today(), readMinutes: 1, featured: input.slot === 'principal', category: 'ciberseguranca', cover: 'lock', isDemo: true,
    };
    mockDb.update((d) => { d.news.unshift(item); });
    return simulate(() => item);
  },
  /** API: PATCH /news/:id */
  async update(id: string, input: Partial<NewsInput>): Promise<NewsItem> {
    if (useApi()) return http.patch(`/news/${id}`, input);
    mockDb.update((d) => {
      const n = d.news.find((x) => x.id === id);
      if (!n) return;
      if (input.title !== undefined) n.title = input.title;
      if (input.summary !== undefined) n.summary = input.summary;
      if (input.body !== undefined) n.body = input.body.split(/\n\s*\n|\n/).filter((p) => p.trim());
      if (input.slot) { n.slot = input.slot; n.featured = input.slot === 'principal'; }
      if (input.image !== undefined) n.imageUrl = input.image || undefined;
      if (input.sourceName !== undefined) n.source = input.sourceName;
      if (input.sourceUrl !== undefined) n.url = input.sourceUrl;
      if (input.publishedAt) n.publishedAt = input.publishedAt;
    });
    return simulate(() => db().news.find((x) => x.id === id)!);
  },
  /** API: DELETE /news/:id */
  async remove(id: string): Promise<void> {
    if (useApi()) { await http.del(`/news/${id}`); return; }
    mockDb.update((d) => { d.news = d.news.filter((n) => n.id !== id); });
    return simulate(() => undefined);
  },
};

/* ================= Ideias ================= */

export const ideasService = {
  /** API: GET /ideas  (votedByMe calculado para o usuário logado) */
  async list(): Promise<Idea[]> {
    if (useApi()) return http.get('/ideas');
    return simulate(() => db().ideas);
  },
  /** API: POST /ideas */
  async create(input: IdeaInput): Promise<Idea> {
    if (useApi()) return http.post('/ideas', input);
    const idea: Idea = { ...input, id: uid('i'), status: 'nova', authorId: db().currentUserId, votes: 0, votedByMe: false, createdAt: today() };
    mockDb.update((d) => {
      d.ideas.unshift(idea);
    });
    return simulate(() => idea);
  },
  /** Admin muda status. API: PATCH /ideas/:id  { status } */
  async setStatus(id: string, status: IdeaStatus): Promise<void> {
    if (useApi()) return http.patch(`/ideas/${id}`, { status });
    mockDb.update((d) => {
      const i = d.ideas.find((x) => x.id === id);
      if (i) i.status = status;
    });
    return simulate(() => undefined);
  },
  /** Exclusão definitiva (V1.9). API: DELETE /ideas/:id */
  async remove(id: string): Promise<void> {
    if (useApi()) { await http.del(`/ideas/${id}`); return; }
    mockDb.update((d) => { d.ideas = d.ideas.filter((i) => i.id !== id); });
    return simulate(() => undefined);
  },
  /** "Gostei" (um por usuário). API: POST /ideas/:id/vote  (alternar) */
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
  /** API: GET /notifications  (futuro: tempo real via WebSocket/SSE) */
  async list(): Promise<AppNotification[]> {
    if (useApi()) return http.get('/notifications');
    return simulate(() => db().notifications);
  },
  /** API: POST /notifications/:id/read */
  async markRead(id: string): Promise<void> {
    if (useApi()) { await http.post(`/notifications/${id}/read`, {}); return; }
    mockDb.update((d) => { const n = d.notifications.find((x) => x.id === id); if (n) n.read = true; });
    return simulate(() => undefined);
  },
  /** API: POST /notifications/read-all */
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
  /** Atalhos do "Acesso rápido". API: GET /settings/shortcuts */
  async shortcuts(): Promise<Shortcut[]> {
    if (useApi()) return http.get('/settings/shortcuts');
    return simulate(() => db().shortcuts);
  },
  async saveShortcut(id: string, url: string): Promise<Shortcut> {
    return settingsService.updateShortcut(id, { url });
  },
  /** Cria um atalho no fim da lista. API: POST /settings/shortcuts */
  async createShortcut(input: ShortcutInput): Promise<Shortcut> {
    if (useApi()) return http.post('/settings/shortcuts', input);
    const item: Shortcut = { id: uid('sc'), icon: 'link', label: input.label?.trim() || 'Novo atalho', url: input.url ?? '', image: input.image ?? '' };
    mockDb.update(d => { d.shortcuts = [...d.shortcuts, item]; });
    return simulate(() => item);
  },
  /** Edita nome, link e/ou logo. API: PATCH /settings/shortcuts/:id */
  async updateShortcut(id: string, input: ShortcutInput): Promise<Shortcut> {
    if (useApi()) return http.patch(`/settings/shortcuts/${id}`, input);
    mockDb.update(d => { d.shortcuts = d.shortcuts.map(s => s.id === id ? { ...s, ...input } : s); });
    return simulate(() => db().shortcuts.find(s=>s.id===id)!);
  },
  /** API: DELETE /settings/shortcuts/:id */
  async removeShortcut(id: string): Promise<void> {
    if (useApi()) { await http.del(`/settings/shortcuts/${id}`); return; }
    mockDb.update(d => { d.shortcuts = d.shortcuts.filter(s => s.id !== id); });
    return simulate(() => undefined);
  },
  /** API: PUT /settings/shortcuts */
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
  async load(): Promise<UserPreferences> {
    return useApi() ? http.get('/me/preferences') : db().preferences;
  },
  async save(prefs: UserPreferences): Promise<UserPreferences> {
    if (useApi()) return http.request('/me/preferences', {method:'PUT',body:JSON.stringify(prefs)});
    mockDb.update(d => { d.preferences=prefs; });
    return prefs;
  },
};

export { mockDb, devFlags } from './core';
export { uid } from './core';

/* Agenda usa a API persistida. Não simula geração automática no navegador. */
export const agendaService = {
  list: () => http.get<import('@/types/models').TaskSchedule[]>('/agenda'),
  create: (input: import('@/types/models').ScheduleInput) => http.post<import('@/types/models').TaskSchedule>('/agenda', input),
  update: (id: string, input: import('@/types/models').ScheduleInput) => http.request<import('@/types/models').TaskSchedule>(`/agenda/${id}`, {method:'PUT',body:JSON.stringify(input)}),
  active: (id: string, active: boolean) => http.patch(`/agenda/${id}/active`,{active}),
  remove: (id: string) => http.del(`/agenda/${id}`),
};

/* ================= Financeiro (V1.9) ================= */

const financeOnlyApi = () => Promise.reject(new ServiceError('O Financeiro funciona somente conectado à API (dados reais).', 'UNAVAILABLE'));

export const financeService = {
  /** API: GET /finance/summary */
  summary(): Promise<FinanceSummary> { return useApi() ? http.get('/finance/summary') : financeOnlyApi(); },
  /** API: GET /finance/investments */
  investments(): Promise<Investment[]> { return useApi() ? http.get('/finance/investments') : financeOnlyApi(); },
  /** Histórico de cobranças de um investimento. API: GET /finance/investments/:id/payments */
  investmentPayments(id: string): Promise<Payment[]> { return useApi() ? http.get(`/finance/investments/${id}/payments`) : financeOnlyApi(); },
  createInvestment(input: InvestmentInput): Promise<Investment> { return useApi() ? http.post('/finance/investments', input) : financeOnlyApi(); },
  updateInvestment(id: string, input: InvestmentInput): Promise<Investment> { return useApi() ? http.patch(`/finance/investments/${id}`, input) : financeOnlyApi(); },
  async removeInvestment(id: string): Promise<void> { if (!useApi()) return financeOnlyApi(); await http.del(`/finance/investments/${id}`); },
  /** API: GET /finance/payments?kind=pix|boleto */
  payments(kind: PaymentKind): Promise<Payment[]> { return useApi() ? http.get(`/finance/payments?kind=${kind}`) : financeOnlyApi(); },
  createPayment(input: PaymentInput): Promise<Payment> { return useApi() ? http.post('/finance/payments', input) : financeOnlyApi(); },
  updatePayment(id: string, input: PaymentInput): Promise<Payment> { return useApi() ? http.patch(`/finance/payments/${id}`, input) : financeOnlyApi(); },
  /** Marca como pago (manual, após confirmação). API: POST /finance/payments/:id/pay */
  pay(id: string, paidAt: string, receipt?: { data: string; name: string }): Promise<Payment> {
    return useApi() ? http.post(`/finance/payments/${id}/pay`, { paidAt, ...(receipt ? { receipt: receipt.data, receiptName: receipt.name } : {}) }) : financeOnlyApi();
  },
  async removePayment(id: string): Promise<void> { if (!useApi()) return financeOnlyApi(); await http.del(`/finance/payments/${id}`); },
  /** Abre o anexo/comprovante numa nova aba (a sessão vai pelo cookie). */
  fileUrl(id: string, which: 'attachment' | 'receipt') { return `${appConfig.apiBaseUrl}/finance/payments/${id}/${which}`; },
};
