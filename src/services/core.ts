/**
 * Núcleo da camada de serviços.
 *
 * - `mockDb`: banco em memória com persistência local (localStorage) para que as
 *   interações (mover tarefas, criar ideias etc.) sobrevivam ao recarregar a página.
 *   NÃO é um banco de dados real — é apenas o estado local do navegador.
 * - `simulate`: envolve as respostas com latência e falha opcional, imitando a rede.
 * - `http`: cliente pronto para o Back-end. Na V1 não é usado.
 */
import { appConfig } from '@/config';
import * as seed from '@/mocks/data';
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
  UserPreferences,
} from '@/types/models';

export interface MockState {
  members: Member[];
  projects: Project[];
  tasks: Task[];
  news: NewsItem[];
  savedNewsIds: string[];
  folders: LibraryFolder[];
  files: LibraryFile[];
  ideas: Idea[];
  notifications: AppNotification[];
  radarSources: RadarSource[];
  shortcuts: Shortcut[];
  preferences: UserPreferences;
  currentUserId: string;
  /** Visualizar o portal como outro papel (somente demonstração de permissões). */
  viewAsRole: 'superadmin' | 'admin' | 'usuario';
}

export const defaultPreferences: UserPreferences = {
  theme: 'dark',
  reducedMotion: false,
  notifications: {
    taskAssigned: true,
    taskDue: true,
    projectUpdates: true,
    newsDigest: false,
    email: false,
  },
};

const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function seedState(): MockState {
  return clone({
    members: seed.members,
    projects: seed.projects,
    tasks: seed.tasks,
    // V1.9: o Radar mostra até 9 notícias (1 principal, 3 secundárias, 5 gerais).
    news: seed.news.map((n, i) => ({ ...n, slot: i === 0 ? 'principal' : i < 4 ? 'secundaria' : i < 9 ? 'geral' : null })),
    savedNewsIds: ['n-4'],
    folders: seed.folders,
    files: seed.files,
    ideas: seed.ideas,
    notifications: seed.notifications,
    radarSources: seed.radarSources,
    shortcuts: seed.shortcuts,
    preferences: defaultPreferences,
    currentUserId: seed.CURRENT_USER_ID,
    viewAsRole: 'admin',
  });
}

function load(): MockState {
  try {
    const raw = localStorage.getItem(appConfig.storageKey);
    if (raw) return { ...seedState(), ...JSON.parse(raw) } as MockState;
  } catch {
    /* storage indisponível: segue com seed */
  }
  return seedState();
}

let state: MockState = load();
const listeners = new Set<() => void>();

export const mockDb = {
  get: () => state,
  update(mutator: (draft: MockState) => void) {
    const draft = clone(state);
    mutator(draft);
    state = draft;
    try {
      localStorage.setItem(appConfig.storageKey, JSON.stringify(state));
    } catch {
      /* ignora */
    }
    listeners.forEach((l) => l());
  },
  reset() {
    state = seedState();
    try {
      localStorage.removeItem(appConfig.storageKey);
    } catch {
      /* ignora */
    }
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

/** Dispara a recarga silenciosa de todas as telas abertas (useQuery). */
export function notifyDataChanged() {
  listeners.forEach((l) => l());
}

/** Ferramenta de desenvolvimento: força erros para testar estados de falha. */
export const devFlags = { forceError: false };

export class ServiceError extends Error {
  constructor(message: string, public code = 'MOCK_ERROR') {
    super(message);
  }
}

export function simulate<T>(producer: () => T): Promise<T> {
  const { min, max } = appConfig.mockLatency;
  const ms = Math.round(min + Math.random() * (max - min));
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (devFlags.forceError) {
        reject(new ServiceError('Falha simulada de comunicação com o servidor.'));
        return;
      }
      try {
        resolve(clone(producer()));
      } catch (e) {
        reject(e);
      }
    }, ms);
  });
}

export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const today = () => new Date().toISOString().slice(0, 10);

/** Cliente HTTP da API do portal. O navegador gerencia o cookie de sessão. */
export const http = {
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    let device='';try{device=localStorage.getItem('firewalldo:push-device') || '';}catch{}
    const res = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(device?{'X-Push-Device':device}:{}), ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      let message = `Erro ${res.status} em ${path}`;
      let code = String(res.status);
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
        if (body?.code) code = body.code;
      } catch {
        /* corpo não é JSON */
      }
      if (res.status === 401 && code === 'UNAUTHENTICATED' && path !== '/auth/me') {
        window.dispatchEvent(new Event('firewalldo:session-expired'));
      }
      throw new ServiceError(message, code);
    }
    const method = (init?.method ?? 'GET').toUpperCase();
    const data = res.status === 204 ? (undefined as T) : ((await res.json()) as T);
    // Após qualquer escrita, avisa as telas para recarregarem os dados (mesmo mecanismo do mock).
    if (method !== 'GET') notifyDataChanged();
    return data;
  },
  get: <T,>(path: string) => http.request<T>(path),
  post: <T,>(path: string, body: unknown) => http.request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T,>(path: string, body: unknown) => http.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T,>(path: string) => http.request<T>(path, { method: 'DELETE' }),
};

export const useApi = () => appConfig.dataSource === 'api';
