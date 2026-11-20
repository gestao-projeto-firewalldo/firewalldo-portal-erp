import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { authService, membersService, projectsService } from '@/services';
import { useApi } from '@/services/core';
import { useQuery } from '@/hooks/useQuery';
import type { Member, Permission, Project, Role } from '@/types/models';

const adminPermissions: Permission[] = [
  'tarefas.criar', 'tarefas.editar_todas', 'tarefas.aceitar', 'projetos.gerenciar',
  'biblioteca.enviar', 'usuarios.gerenciar', 'noticias.curar', 'relatorios.ver',
  'configuracoes.integracoes', 'auditoria.ver', 'financeiro.acessar',
];
export const rolePermissions: Record<Role, Permission[]> = {
  superadmin: [...adminPermissions, 'administradores.gerenciar'],
  admin: adminPermissions,
  usuario: ['tarefas.aceitar', 'biblioteca.enviar', 'relatorios.ver'],
};

interface SessionCtx {
  me: Member | undefined;
  members: Member[];
  membersById: Record<string, Member>;
  projects: Project[];
  projectsById: Record<string, Project>;
  can: (p: Permission) => boolean;
  loading: boolean;
  error: Error | null;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const me = useQuery(() => authService.me());
  const members = useQuery(() => membersService.list());
  const projects = useQuery(() => projectsService.list());

  useEffect(() => {
    if (!useApi()) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void authService.me().catch(() => {});
        members.refetch();
      }
    }, 120_000);
    return () => window.clearInterval(timer);
  }, []);

  const value = useMemo<SessionCtx>(() => {
    const ms = members.data ?? [];
    const ps = projects.data ?? [];
    const role = me.data?.role ?? 'usuario';
    return {
      me: me.data,
      members: ms,
      membersById: Object.fromEntries(ms.map((m) => [m.id, m])),
      projects: ps,
      projectsById: Object.fromEntries(ps.map((p) => [p.id, p])),
      // Financeiro: administradores ou usuários com acesso individual concedido (financeAccess).
      can: (p) => rolePermissions[role].includes(p) || (p === 'financeiro.acessar' && !!me.data?.financeAccess),
      loading: me.loading || members.loading || projects.loading,
      error: me.error || members.error || projects.error,
    };
  }, [me.data, me.loading, me.error, members.data, members.loading, members.error, projects.data, projects.loading, projects.error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSession fora do SessionProvider');
  return c;
}
