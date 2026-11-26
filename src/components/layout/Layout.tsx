import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BarChart3,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  HardDrive,
  Layers,
  Lightbulb,
  LogOut,
  Menu,
  Moon,
  Newspaper,
  QrCode,
  Receipt,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  SquareCheck,
  Sun,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar, Logo, Modal } from '@/components/ui';
import { useSession } from '@/context/SessionContext';
import { bindPushAccount, unsubscribeLocal } from '@/services/push';
import { useQuery } from '@/hooks/useQuery';
import { appConfig } from '@/config';
import { http, useApi } from '@/services/core';
import { useToast } from '@/context/ToastContext';
import { usePrefs } from '@/context/PrefsContext';
import { notificationsService, tasksService } from '@/services';
import { cx, roleLabel } from '@/lib/labels';
import type { AppNotification, Permission } from '@/types/models';

/** Telas fora do menu (acessíveis por link): /biblioteca. */
export const extraRoutes = [
  { to: '/biblioteca', label: 'Biblioteca' },
];

type NavIcon = LucideIcon;
interface NavLeaf { to: string; label: string; icon: NavIcon; end?: boolean; crumb?: string; perm?: Permission }
interface NavGroup { id: string; label: string; icon: NavIcon; items: NavLeaf[]; perm?: Permission }

/** Barra lateral V1.9: Início avulso + submenus. */
export const navTree: (NavLeaf | NavGroup)[] = [
  { to: '/', label: 'Início', crumb: 'Visão geral', icon: Home, end: true },
  { id: 'conteudo', label: 'Conteúdo', icon: Newspaper, items: [
    { to: '/radar', label: 'Radar de notícias', icon: Newspaper },
    { to: '/ideias', label: 'Ideias', icon: Lightbulb },
    { to: '/driver', label: 'Driver', icon: HardDrive },
  ] },
  { id: 'gestao', label: 'Gestão', icon: Briefcase, items: [
    { to: '/projetos', label: 'Projetos', icon: Layers },
    { to: '/tarefas', label: 'Tarefas', icon: SquareCheck },
    { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  ] },
  { id: 'financeiro', label: 'Financeiro', icon: Wallet, perm: 'financeiro.acessar', items: [
    { to: '/financeiro/investimentos', label: 'Investimentos', icon: TrendingUp },
    { to: '/financeiro/pix', label: 'Pix', icon: QrCode },
    { to: '/financeiro/boletos', label: 'Boletos', icon: Receipt },
  ] },
  { id: 'sistema', label: 'Sistema', icon: Settings, items: [
    { to: '/usuarios', label: 'Usuários', icon: Users },
    { to: '/relatorios', label: 'Relatórios', icon: BarChart3, perm: 'auditoria.ver' },
    { to: '/auditoria', label: 'Auditoria', icon: ShieldCheck, perm: 'auditoria.ver' },
    { to: '/configuracoes', label: 'Configurações', icon: SlidersHorizontal },
  ] },
];
const isGroup = (n: NavLeaf | NavGroup): n is NavGroup => 'items' in n;
/** Lista plana (breadcrumbs e buscas). */
export const navItems: NavLeaf[] = navTree.flatMap((n) => (isGroup(n) ? n.items : [n]));
const isWithin = (pathname:string,to:string) => pathname===to || pathname.startsWith(`${to}/`);

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
  const location = useLocation();
  const {pathname} = location;
  const [expandedGroup,setExpandedGroup]=useState<string|null>(null);
  const previousLocation=useRef(location.key);
  // Start collapsed. Subsequent navigation (links, shortcuts and back/forward)
  // opens only the destination group, irrespective of which group was open.
  useEffect(()=>{
    if(previousLocation.current===location.key)return;
    previousLocation.current=location.key;
    const group=navTree.find((node):node is NavGroup=>isGroup(node)
      && (!node.perm||can(node.perm))
      && node.items.some(item=>(!item.perm||can(item.perm))&&isWithin(pathname,item.to)));
    setExpandedGroup(group?.id??null);
  },[location.key,pathname,can]);
  const toggle=(id:string)=>setExpandedGroup(current=>current===id?null:id);
  return (
    <aside className={cx('sidebar', open && 'open')} aria-label="Navegação principal">
      <Link to="/" className="brand" aria-label={appConfig.appName}>
        <Logo />
        <span className="brand-name">{appConfig.appName}</span>
      </Link>
      <nav className="nav">
        {navTree.map((node) => {
          if (!isGroup(node)) return <NavLeafLink key={node.to} item={node} badge={0} />;
          if (node.perm && !can(node.perm)) return null;
          const items = node.items.filter((i) => !i.perm || can(i.perm));
          const active = items.some((i) => isWithin(pathname,i.to));
          const expanded = expandedGroup===node.id;
          const Icon = node.icon;
          return (
            <div key={node.id} className={cx('nav-group', expanded && 'open', active && 'has-active')}>
              <button className="nav-link nav-group-head" aria-expanded={expanded} aria-controls={`nav-${node.id}`} onClick={() => toggle(node.id)}>
                <Icon />
                <span>{node.label}</span>
                <ChevronDown className="nav-caret" size={18} />
              </button>
              <div className="nav-sub" id={`nav-${node.id}`} aria-hidden={!expanded}>
                <div className="nav-sub-inner">
                  {items.map((item) => <NavLeafLink key={item.to} item={item} badge={item.to === '/tarefas' ? mine : 0} sub tabIndex={expanded ? 0 : -1} />)}
                </div>
              </div>
            </div>
          );
        })}
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

function NavLeafLink({ item, badge, sub, tabIndex }: { item: NavLeaf; badge: number; sub?: boolean; tabIndex?: number }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={item.end} tabIndex={tabIndex} className={({ isActive }) => cx('nav-link', sub && 'nav-sub-link', isActive && 'active')} title={item.label}>
      <Icon size={sub ? 18 : undefined} />
      <span>{item.label}</span>
      {badge > 0 && <em className="count">{badge}</em>}
    </NavLink>
  );
}

const themeLabel: Record<'dark' | 'light', string> = { dark: 'Escuro', light: 'Claro' };

/** Alternância rápida com dois estados: Escuro (lua) ↔ Claro (sol). "Seguir o sistema" fica só em Configurações. */
function ThemeToggle() {
  const { prefs, setPrefs } = usePrefs();
  const toast = useToast();
  // Se a conta estiver em "Seguir o sistema", o botão mostra a aparência que está na tela agora.
  const current: 'dark' | 'light' =
    prefs.theme === 'system'
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : prefs.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  const Icon = current === 'light' ? Sun : Moon;
  const label = `Tema: ${themeLabel[current]}. Clique para mudar para ${themeLabel[next]}.`;
  return (
    <button
      className="icon-btn theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => setPrefs({ ...prefs, theme: next }).catch((error: Error) => toast({ tone: 'error', title: 'Não foi possível salvar o tema', description: error.message }))}
    >
      <Icon />
    </button>
  );
}

const SEEN_KEY = (id: string) => `firewalldo:notifications-seen:${id}`;
const kindRoute: Record<AppNotification['kind'], string> = { tarefa: '/tarefas', projeto: '/projetos', noticia: '/radar', sistema: '/' };

/**
 * Busca as notificações a cada 20 s. As que chegarem e ainda não foram mostradas viram aviso flutuante.
 * Os ids já exibidos ficam salvos por conta (evita duplicar ao recarregar ou em outra aba).
 */
function useNotificationFeed() {
  const { me } = useSession();
  const toast = useToast();
  const nav = useNavigate();
  const q = useQuery(() => notificationsService.list(), [], 20_000);
  useEffect(() => {
    if (!me || !q.data) return;
    let seen: string[] | null = null;
    try { const raw = localStorage.getItem(SEEN_KEY(me.id)); seen = raw ? JSON.parse(raw) : null; } catch { seen = null; }
    const ids = q.data.map((n) => n.id);
    if (seen === null) {
      // Primeiro acesso neste navegador: o que já existe fica no sino, sem avisos.
      try { localStorage.setItem(SEEN_KEY(me.id), JSON.stringify(ids.slice(0, 300))); } catch { /* ignora */ }
      return;
    }
    const fresh = q.data.filter((n) => !n.read && !seen!.includes(n.id));
    if (!fresh.length) return;
    try { localStorage.setItem(SEEN_KEY(me.id), JSON.stringify([...fresh.map((n) => n.id), ...seen].slice(0, 300))); } catch { /* ignora */ }
    const ordered = [...fresh].reverse();
    ordered.slice(-4).forEach((n) =>
      toast({ kind: n.kind, title: n.title, description: n.description, onClick: () => { void notificationsService.markRead(n.id).catch(() => {}); nav(kindRoute[n.kind]); } }),
    );
    if (ordered.length > 4) toast({ kind: 'sistema', title: `Mais ${ordered.length - 4} notificações`, description: 'Abra o sino para ver todas.' });
  }, [q.data, me?.id]);
  return q;
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
  const notifs = useNotificationFeed();
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
        <ThemeToggle />
        {!useApi() && <button className="demo-chip" onClick={() => setHelp(true)} title="Esta versão usa dados simulados" style={{ background: 'transparent' }}>
          <i /> <span className="txt">Modo demonstração</span>
        </button>}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button className="icon-btn" aria-label={`Notificações (${unread} novas)`} onClick={() => setPanel(panel === 'notif' ? null : 'notif')}>
            <Bell />
            {unread > 0 && <i className="dot count-dot">{unread > 9 ? '9+' : unread}</i>}
          </button>
          {panel === 'notif' && (
            <div className="dropdown">
              <div className="dropdown-head">
                Notificações
                <button className="btn ghost sm" onClick={() => notificationsService.markAllRead()} disabled={!unread}>
                  Marcar como lidas
                </button>
              </div>
              {(notifs.data ?? []).length === 0 && <div className="small muted" style={{ padding: '14px' }}>Sem notificações por enquanto.</div>}
              {(notifs.data ?? []).map((n) => (
                <button key={n.id} className="dropdown-item" onClick={() => { close(); if (!n.read) void notificationsService.markRead(n.id).catch(() => {}); nav(kindRoute[n.kind]); }} style={{ alignItems: 'flex-start' }}>
                  <i style={{ width: 8, height: 8, borderRadius: 99, marginTop: 7, flex: 'none', background: n.read ? 'transparent' : 'var(--primary)' }} />
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{n.title}</div>
                    <small style={{ display: 'block' }}>{n.description}</small>
                    <small style={{ color: 'var(--muted)' }}>{n.createdAt}</small>
                  </div>
                </button>
              ))}
              <div className="small muted" style={{ padding: '10px 14px' }}>Notificações da sua conta, atualizadas automaticamente.</div>
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
