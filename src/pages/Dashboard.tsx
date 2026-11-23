import { TaskWorkflow } from '@/components/tasks/TaskWorkflow';
import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, CircleCheck, Info, Layers, Newspaper, Pencil, Plus, RefreshCw, SquareCheck, Users } from 'lucide-react';
import { Async, Avatar, EmptyState, ErrorState, PriorityBadge, Progress, Skeleton, SkeletonList } from '@/components/ui';
import { NewsCover, ProjectIcon, ShortcutLogo } from '@/components/shared';
import { ShortcutEditor } from '@/components/shortcuts/ShortcutEditor';
import { useTaskEditor } from '@/components/tasks/TaskEditor';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@/hooks/useQuery';
import { newsService, notificationsService, projectsService, settingsService, tasksService } from '@/services';
import { categoryLabel, cx, daysUntil, projectStatusLabel, relativeDay, shortDate , ticketLabel } from '@/lib/labels';
import type { AppNotification, Shortcut } from '@/types/models';
import { projectProgress } from '@/lib/progress';

const notifIcon: Record<AppNotification['kind'], { icon: typeof Info; c: string }> = {
  tarefa: { icon: CircleCheck, c: 'var(--success)' },
  projeto: { icon: Layers, c: 'var(--primary)' },
  noticia: { icon: Newspaper, c: 'var(--primary)' },
  sistema: { icon: Info, c: 'var(--warning)' },
};

export default function Dashboard() {
  const { me, members, projects, projectsById, can, loading, error:sessionError } = useSession();
  const tasksQ = useQuery(() => tasksService.list());
  const newsQ = useQuery(() => newsService.list());
  const notifQ = useQuery(() => notificationsService.list());
  const shortcutsQ = useQuery(() => settingsService.shortcuts());
  const openTask = useTaskEditor();
  const toast=useToast();
  const canEditShortcuts = can('configuracoes.integracoes');
  const [editingShortcuts, setEditingShortcuts] = useState(false);
  const [shortcutForm, setShortcutForm] = useState<{ item?: Shortcut } | null>(null);

  const tasks = tasksQ.data ?? [];
  const online = members.filter((m) => m.active && m.status === 'online');
  const stats = [
    { label: 'Tarefas abertas', value: tasks.filter((t) => t.status !== 'concluido').length, icon: SquareCheck, c: 'var(--primary)', to: '/tarefas' },
    { label: 'Em andamento', value: tasks.filter((t) => t.status === 'em_andamento').length, icon: RefreshCw, c: 'var(--warning)', to: '/tarefas' },
    { label: 'Concluídas', value: tasks.filter((t) => t.status === 'concluido').length, icon: CheckCircle2, c: 'var(--success)', to: '/relatorios' },
    { label: 'Usuários online', value: online.length, icon: Users, c: 'var(--primary)', to: '/usuarios', ready: members.length > 0 },
  ];

  const mine = tasks
    .filter((t) => me && t.assigneeIds.includes(me.id) && t.status !== 'concluido')
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    .slice(0, 4);
  // V1.9: antes só entravam projetos com status exatamente "em_andamento"; projetos novos nascem em
  // "planejamento" e ficavam de fora. Agora a seção lista os projetos ativos (não pausados nem concluídos),
  // com o status em cada item. A lista vem direto da API e é atualizada a cada mudança.
  const projectsQ = useQuery(() => projectsService.list(), [], 30_000);
  const activeOrder: Record<string, number> = { em_andamento: 0, planejamento: 1 };
  const running = (projectsQ.data ?? projects)
    .filter((p) => p.status === 'em_andamento' || p.status === 'planejamento')
    .sort((a, b) => activeOrder[a.status] - activeOrder[b.status] || a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Visão geral</h1>
        {can('tarefas.criar') && (
          <div className="actions">
            <button className="btn primary" onClick={() => openTask()}>
              <Plus /> Nova tarefa
            </button>
          </div>
        )}
      </div>

      {(tasksQ.error || sessionError) && <p className="form-error" role="alert">Não foi possível atualizar os indicadores: {(tasksQ.error || sessionError)?.message} <button className="btn" onClick={tasksQ.refetch}>Tentar novamente</button></p>}
      {/* ---------- Indicadores ---------- */}
      <section className="stats">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card hover stat">
            <span className="icon-tile" style={{ '--c': s.c, '--s': '60px' } as CSSProperties}>
              <s.icon />
            </span>
            <div className="grow">
              <div className="stat-label">{s.label}</div>
              {(tasksQ.error || sessionError) ? <div className="stat-value">—</div> : (s.ready ?? !!tasksQ.data) ? <div className="stat-value">{s.value}</div> : <Skeleton h={34} w={56} style={{ marginTop: 4 }} />}
            </div>
          </Link>
        ))}
      </section>

      {/* ---------- Acesso rápido ---------- */}
      <section className="card block">
        <div className="card-head">
          <h2>Acesso rápido</h2>
          {canEditShortcuts && shortcutsQ.data && (
            <button className={cx('btn sm', editingShortcuts && 'primary')} onClick={() => setEditingShortcuts((v) => !v)} aria-pressed={editingShortcuts}>
              {editingShortcuts ? <><Check size={16} /> Concluir</> : <><Pencil size={16} /> Editar</>}
            </button>
          )}
        </div>
        <div className={cx('quick-grid', editingShortcuts && 'editing')}>
          {(shortcutsQ.data ?? []).map((q) =>
            editingShortcuts ? (
              <button key={q.id} type="button" className="quick" onClick={() => setShortcutForm({ item: q })} title={`Editar ${q.label}`}>
                <span className="quick-edit-badge" aria-hidden="true"><Pencil size={14} /></span>
                <ShortcutLogo item={q} />
                <span className="quick-label">{q.label}</span>
              </button>
            ) : q.url ? (
              <a key={q.id} className="quick" href={q.url} target="_blank" rel="noreferrer" title={q.url}>
                <ShortcutLogo item={q} />
                <span className="quick-label">{q.label}</span>
              </a>
            ) : canEditShortcuts ? (
              <button key={q.id} type="button" className="quick empty" onClick={() => setShortcutForm({ item: q })} title="Link não configurado — clique para definir">
                <ShortcutLogo item={q} />
                <span className="quick-label">{q.label}</span>
              </button>
            ) : (
              <div key={q.id} className="quick empty" title="Link não configurado">
                <ShortcutLogo item={q} />
                <span className="quick-label">{q.label}</span>
              </div>
            ),
          )}
          {editingShortcuts && (
            <button type="button" className="quick add" onClick={() => setShortcutForm({})} title="Adicionar atalho">
              <Plus />
              <span className="quick-label">Adicionar</span>
            </button>
          )}
          {shortcutsQ.error && <p className="form-error" role="alert">{shortcutsQ.error.message}</p>}
          {!shortcutsQ.data && !shortcutsQ.error && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={116} r={12} />)}
        </div>
      </section>
      {shortcutForm && <ShortcutEditor item={shortcutForm.item} onClose={() => setShortcutForm(null)} />}

      {/* ---------- Projetos + lateral ---------- */}
      <div className="dash-grid">
        <section className="card dash-projects">
          <div className="card-head">
            <h2>Projetos em andamento</h2>
            <Link to="/projetos" className="more">
              Ver todos <ArrowRight size={16} />
            </Link>
          </div>
          {projectsQ.error && !projectsQ.data ? (
            <ErrorState error={projectsQ.error} onRetry={projectsQ.refetch} />
          ) : (loading || projectsQ.loading) && !projectsQ.data ? (
            <SkeletonList rows={3} h={60} />
          ) : running.length === 0 ? (
            <EmptyState title="Nenhum projeto em andamento" description="Projetos em planejamento ou em andamento aparecem aqui." />
          ) : (
            <div className="proj-list">
              {running.map((p) => (
                <Link key={p.id} to={`/projetos/${p.id}`} className="proj-item">
                  <ProjectIcon project={{ ...p, color: 'var(--primary)' }} size={58} />
                  <div className="grow">
                    <div className="row" style={{ gap: 10, justifyContent: 'space-between', minWidth: 0 }}>
                      <div className="proj-name ellipsis">{p.name}</div>
                      <span className={cx('proj-status', p.status)}>{projectStatusLabel[p.status]}</span>
                    </div>
                    {p.subtitle && <div className="muted small ellipsis">{p.subtitle}</div>}
                    <div className="row" style={{ gap: 16 }}>
                      <div className="grow">
                        <Progress value={projectProgress(p, tasksQ.data)} />
                      </div>
                      <b className="pct">{projectProgress(p, tasksQ.data)}%</b>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="dash-side">
          <section className="card">
            <div className="card-head">
              <h2>Usuários online</h2>
              <Link to="/usuarios" className="more">
                Ver todos
              </Link>
            </div>
            <div className="online">
              {members.length === 0
                ? [0, 1, 2, 3].map((i) => <Skeleton key={i} h={96} />)
                : online.slice(0, 4).map((m) => (
                    <div key={m.id} className="online-user">
                      <Avatar member={m} size={68} showStatus />
                      <span className="ellipsis">{m.name}</span>
                    </div>
                  ))}
              {members.length > 0 && online.length === 0 && <p className="muted small">Ninguém online agora.</p>}
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Notificações</h2>
            </div>
            <Async q={notifQ} loading={<SkeletonList rows={2} h={56} />} empty={<EmptyState title="Sem notificações" />}>
              {(list) => (
                <div className="notif-list">
                  {list.slice(0, 3).map((n) => {
                    const ic = notifIcon[n.kind];
                    return (
                      <div key={n.id} className="notif">
                        <span className="icon-tile" style={{ '--c': ic.c, '--s': '44px' } as CSSProperties}>
                          <ic.icon />
                        </span>
                        <div className="grow">
                          <div className="row notif-title-row">
                            <b className="grow ellipsis">{n.title}</b>
                            <span className="muted small" style={{ flex: 'none' }}>{n.createdAt}</span>
                          </div>
                          <div className="muted small">{n.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Async>
          </section>
        </div>
      </div>

      {/* ---------- Minhas tarefas + últimas notícias ---------- */}
      <div className="dash-grid even">
        <section className="card">
          <div className="card-head">
            <h2>Minhas tarefas</h2>
            <Link to="/tarefas?meu=1" className="more">
              Ver todas <ArrowRight size={16} />
            </Link>
          </div>
          <Async q={tasksQ} loading={<SkeletonList rows={3} />} empty={<EmptyState title="Tudo em dia" description="Nenhuma tarefa pendente atribuída a você." />} isEmpty={() => mine.length === 0}>
            {() => (
              <div>
                {mine.map((t) => {
                  const late = t.dueDate && daysUntil(t.dueDate) < 0;
                  return (
                    <div key={t.id} className="list-row dashboard-task" role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => openTask({ task: t })} onKeyDown={(e) => e.target === e.currentTarget && e.key === 'Enter' && openTask({ task: t })}>
                      <div className="grow">
                        <div className="ellipsis" style={{ fontWeight: 600 }}>{ticketLabel(t)} {t.title}</div>
                        <div className="muted small ellipsis">
                          {t.projectId ? projectsById[t.projectId]?.name : 'Geral'} · {categoryLabel[t.category]}
                        </div>
                      </div>
                      <TaskWorkflow task={t} />
                      <PriorityBadge p={t.priority} />
                      <span className={cx('small task-date', late ? 'late' : 'muted')} style={{ width: 52, textAlign: 'right' }}>{shortDate(t.dueDate)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Async>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Últimas notícias</h2>
            <Link to="/radar" className="more">
              Radar <ArrowRight size={16} />
            </Link>
          </div>
          <Async q={newsQ} loading={<SkeletonList rows={3} />}>
            {(news) => (
              <div>
                {news.slice(0, 4).map((n) => (
                  <Link key={n.id} to={`/radar?n=${n.id}`} className="list-row">
                    <NewsCover item={n} className="news-thumb sm" />
                    <div className="grow">
                      <div className="ellipsis" style={{ fontWeight: 600 }}>{n.title}</div>
                      <div className="muted small">{[n.slot === 'principal' ? 'Destaque' : n.source, relativeDay(n.publishedAt)].filter(Boolean).join(' · ')}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Async>
        </section>
      </div>
    </div>
  );
}
