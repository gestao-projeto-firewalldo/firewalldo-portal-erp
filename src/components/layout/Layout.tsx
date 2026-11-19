import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ChevronRight,
  FileText,
  Home,
  Layers,
  Lightbulb,
  LogOut,
  Menu,
  Newspaper,
  Settings,
  ShieldCheck,
  SquareCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { Avatar, Logo, Modal } from '@/components/ui';
import { useSession } from '@/context/SessionContext';
import { bindPushAccount, unsubscribeLocal } from '@/services/push';
import { useQuery } from '@/hooks/useQuery';
import { appConfig } from '@/config';
import { http, useApi } from '@/services/core';
import { useToast } from '@/context/ToastContext';
import { notificationsService, tasksService } from '@/services';
import { cx, roleLabel } from '@/lib/labels';

/** Telas fora do menu (acessíveis por link): /biblioteca e /relatorios. */
export const extraRoutes = [
  { to: '/biblioteca', label: 'Biblioteca' },
  { to: '/relatorios', label: 'Relatórios' },
];

export const navItems = [
  { to: '/', label: 'Início', crumb: 'Visão geral', icon: Home, end: true },
  { to: '/radar', label: 'Radar de notícias', icon: Newspaper },
  { to: '/ideias', label: 'Ideias', icon: Lightbulb },
  { to: '/projetos', label: 'Projetos', icon: Layers },
  { to: '/tarefas', label: 'Tarefas', icon: SquareCheck },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/usuarios', label: 'Usuários', icon: Users },
  { to: '/auditoria', label: 'Auditoria', icon: ShieldCheck },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [loc.pathname]);

  return (
    <div className="shell">
      <a href="#main" className="sr-only">Pular para o conteúdo</a>
      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}
      <Sidebar open={menuOpen} />
      <div className="content">
        <Header onMenu={() => setMenuOpen(true)} />
        <main className="main" id="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Sidebar({ open }: { open: boolean }) {
  const q = useQuery(() => tasksService.list());
  const { me, can } = useSession();
  const nav = useNavigate();
  const mine = (q.data ?? []).filter((t) => me && t.assigneeIds.includes(me.id) && t.status !== 'concluido').length;
  return (
    <aside className={cx('sidebar', open && 'open')} aria-label="Navegação principal">
      <Link to="/" className="brand" aria-label={appConfig.appName}>
        <Logo />
        <span className="brand-name">{appConfig.appName}</span>
      </Link>
      <nav className="nav">
        {navItems.filter(item => item.to !== '/auditoria' || can('auditoria.ver')).map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => cx('nav-link', isActive && 'active')} title={label}>
            <Icon />
            <span>{label}</span>
            {to === '/tarefas' && mine > 0 && <em className="count">{mine}</em>}
          </NavLink>
        ))}
      </nav>
      <button className="sidebar-user" style={{ marginTop: 'auto' }} onClick={() => nav('/configuracoes?perfil=editar')} title="Perfil e configurações">
        {me && <Avatar member={me} size={50} />}
        <div className="who">
          <div className="name">{me?.name ?? '…'}</div>
          <div className="role">{roleLabel[me?.role ?? 'usuario']}</div>
        </div>
      </button>
    </aside>
  );
}

function useClickOutside(ref: React.RefObject<HTMLElement>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && cb();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, cb]);
}

function Crumbs() {
  const { pathname } = useLocation();
  const { projectsById } = useSession();
  const parts: { label: string; to?: string }[] = [];
  if (pathname === '/') parts.push({ label: 'Visão geral' });
  else {
    const item = [...navItems, ...extraRoutes].find((n) => n.to !== '/' && pathname.startsWith(n.to));
    if (item) {
      const detail = pathname.slice(item.to.length).replace(/^\//, '');
      if (detail) {
        parts.push({ label: item.label, to: item.to });
        parts.push({ label: projectsById[detail]?.name ?? 'Detalhes' });
      } else parts.push({ label: item.label });
    } else parts.push({ label: 'Página não encontrada' });
  }
  return (
    <nav className="crumbs" aria-label="Você está em">
      {parts.length > 1 ? (
        <Link to="/" className="crumb-root" aria-label="Início">
          <Home size={22} />
        </Link>
      ) : (
        <Link to="/" className="crumb-root">Início</Link>
      )}
      {parts.map((p, i) => (
        <span key={i} className="row" style={{ gap: 10, minWidth: 0 }}>
          <ChevronRight size={18} className="crumb-sep" />
          {p.to ? <Link to={p.to} className="crumb-link">{p.label}</Link> : <span className="crumb-current">{p.label}</span>}
        </span>
      ))}
    </nav>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const toast = useToast();
  const logout = async () => {
    try {
      await http.post('/auth/logout', {});
      await bindPushAccount(null).catch(()=>{});
      await unsubscribeLocal().catch(()=>{});
      window.location.assign('/');
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível sair', description: (error as Error).message });
    }
  };
  const { me } = useSession();
  const [panel, setPanel] = useState<null | 'notif' | 'user'>(null);
  const [help, setHelp] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const close = () => setPanel(null);
  useClickOutside(notifRef, () => panel === 'notif' && close());
  useClickOutside(userRef, () => panel === 'user' && close());
  const notifs = useQuery(() => notificationsService.list());
  const unread = (notifs.data ?? []).filter((n) => !n.read).length;
  const nav = useNavigate();

  return (
    <header className="header">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Abrir menu">
        <Menu />
      </button>
      <Crumbs />
      <div className="header-actions">
        <span className="header-version" title="Versão do portal">{appConfig.version}</span>
        {!useApi() && <button className="demo-chip" onClick={() => setHelp(true)} title="Esta versão usa dados simulados" style={{ background: 'transparent' }}>
          <i /> <span className="txt">Modo demonstração</span>
        </button>}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button className="icon-btn" aria-label={`Notificações (${unread} novas)`} onClick={() => setPanel(panel === 'notif' ? null : 'notif')}>
            <Bell />
            {unread > 0 && <i className="dot" />}
          </button>
          {panel === 'notif' && (
            <div className="dropdown">
              <div className="dropdown-head">
                Notificações
                <button className="btn ghost sm" onClick={() => notificationsService.markAllRead()} disabled={!unread}>
                  Marcar como lidas
                </button>
              </div>
              {(notifs.data ?? []).map((n) => (
                <button key={n.id} className="dropdown-item" onClick={close} style={{ alignItems: 'flex-start' }}>
                  <i style={{ width: 8, height: 8, borderRadius: 99, marginTop: 7, flex: 'none', background: n.read ? 'transparent' : 'var(--primary)' }} />
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{n.title}</div>
                    <small style={{ display: 'block' }}>{n.description}</small>
                    <small style={{ color: 'var(--muted)' }}>{n.createdAt}</small>
                  </div>
                </button>
              ))}
              <div className="small muted" style={{ padding: '10px 14px' }}>Notificações da sua conta. Atualizadas ao recarregar a página.</div>
            </div>
          )}
        </div>
        <span className="header-divider" />
        <div ref={userRef} style={{ position: 'relative' }}>
          <button className="icon-btn" style={{ width: 44, height: 44, borderRadius: 99 }} onClick={() => setPanel(panel === 'user' ? null : 'user')} aria-label="Menu do usuário">
            {me && <Avatar member={me} size={38} />}
          </button>
          {panel === 'user' && (
            <div className="dropdown" style={{ width: 240 }}>
              <div className="dropdown-head" style={{ display: 'block' }}>
                {me?.name}
                <div className="small muted" style={{ fontWeight: 400 }}>{roleLabel[me?.role ?? 'usuario']}</div>
              </div>
              <button className="dropdown-item" onClick={() => (close(), nav('/configuracoes?perfil=editar'))}>
                <UserRound size={18} /> Meu perfil
              </button>
              <button className="dropdown-item" onClick={() => (close(), setHelp(true))}>
                <FileText size={18} /> Sobre o portal
              </button>
              {useApi() && (
                <button className="dropdown-item" onClick={logout}>
                  <LogOut size={18} /> Sair
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <Modal open={help} onClose={() => setHelp(false)} title="Sobre o portal" subtitle={`${appConfig.appName} · ${appConfig.version}`} width={560}>
        <div style={{ display: 'grid', gap: 12 }}>
          {!useApi() && <div className="notice warn">
            <FileText />
            <div>
              <b>Modo demonstração.</b> Projetos, tarefas, notícias e arquivos são fictícios. As alterações ficam salvas apenas neste
              navegador e podem ser restauradas em Configurações.
            </div>
          </div>}
          <p className="muted">Acompanhe os projetos, as tarefas e as pautas da equipe Firewalldo.</p>
        </div>
      </Modal>
    </header>
  );
}
