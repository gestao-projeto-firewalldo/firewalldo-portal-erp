import { type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleCheck, Info, Layers, Newspaper, Plus, RefreshCw, SquareCheck, Users } from 'lucide-react';
import { Async, Avatar, EmptyState, PriorityBadge, Progress, Skeleton, SkeletonList } from '@/components/ui';
import { NewsCover, ProjectIcon, QuickIcon } from '@/components/shared';
import { useTaskEditor } from '@/components/tasks/TaskEditor';
import { useSession } from '@/context/SessionContext';
import { useQuery } from '@/hooks/useQuery';
import { newsService, notificationsService, settingsService, tasksService } from '@/services';
import { categoryLabel, cx, daysUntil, relativeDay, shortDate } from '@/lib/labels';
import type { AppNotification } from '@/types/models';
import { projectProgress } from '@/lib/progress';

const notifIcon: Record<AppNotification['kind'], { icon: typeof Info; c: string }> = {
  tarefa: { icon: CircleCheck, c: 'var(--success)' },
  projeto: { icon: Layers, c: 'var(--primary)' },
  noticia: { icon: Newspaper, c: 'var(--primary)' },
  sistema: { icon: Info, c: 'var(--warning)' },
};

export default function Dashboard() {
  const { me, members, projects, projectsById, can } = useSession();
  const tasksQ = useQuery(() => tasksService.list());
  const newsQ = useQuery(() => newsService.list());
  const notifQ = useQuery(() => notificationsService.list());
  const shortcutsQ = useQuery(() => settingsService.shortcuts());
  const openTask = useTaskEditor();

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
  const running = projects.filter((p) => p.status === 'em_andamento');

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

      {/* ---------- Indicadores ---------- */}
      <section className="stats">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="card hover stat">
            <span className="icon-tile" style={{ '--c': s.c, '--s': '60px' } as CSSProperties}>
              <s.icon />
            </span>
            <div className="grow">
              <div className="stat-label">{s.label}</div>
              {(s.ready ?? !!tasksQ.data) ? <div className="stat-value">{s.value}</div> : <Skeleton h={34} w={56} style={{ marginTop: 4 }} />}
            </div>
          </Link>
        ))}
      </section>

      {/* ---------- Acesso rápido ---------- */}
      <section className="card block">
        <div className="card-head">
          <h2>Acesso rápido</h2>
        </div>
        <div className="quick-grid">
          {(shortcutsQ.data ?? []).map((q) =>
            q.url ? (
              <a key={q.id} className="quick" href={q.url} target="_blank" rel="noreferrer" title={q.url}>
                <QuickIcon name={q.icon} />
                <span>{q.label}</span>
              </a>
            ) : (
              <Link key={q.id} className="quick" to="/configuracoes?aba=integracoes" title="Link não configurado — defina em Configurações → Integrações">
                <QuickIcon name={q.icon} />
                <span>{q.label}</span>
              </Link>
            ),
          )}
          {!shortcutsQ.data && [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={116} r={12} />)}
        </div>
      </section>

      {/* ---------- Projetos + lateral ---------- */}
      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <h2>Projetos em andamento</h2>
            <Link to="/projetos" className="more">
              Ver todos <ArrowRight size={16} />
            </Link>
          </div>
          {projects.length === 0 ? (
            <SkeletonList rows={3} h={60} />
          ) : running.length === 0 ? (
            <EmptyState title="Nenhum projeto em andamento" />
          ) : (
            <div className="proj-list">
              {running.map((p) => (
                <Link key={p.id} to={`/projetos/${p.id}`} className="proj-item">
                  <ProjectIcon project={{ ...p, color: 'var(--primary)' }} size={58} />
                  <div className="grow">
                    <div className="proj-name">{p.name}</div>
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
                          <div className="row" style={{ alignItems: 'baseline' }}>
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
                    <div key={t.id} className="list-row" role="button" tabIndex={0} style={{ cursor: 'pointer' }} onClick={() => openTask({ task: t })} onKeyDown={(e) => e.key === 'Enter' && openTask({ task: t })}>
                      <label className="check" onClick={(e) => e.stopPropagation()} title="Marcar como concluída">
                        <input type="checkbox" onChange={() => tasksService.move(t.id, 'concluido', null)} />
                      </label>
                      <div className="grow">
                        <div className="ellipsis" style={{ fontWeight: 600 }}>{t.title}</div>
                        <div className="muted small ellipsis">
                          {t.projectId ? projectsById[t.projectId]?.name : 'Geral'} · {categoryLabel[t.category]}
                        </div>
                      </div>
                      <PriorityBadge p={t.priority} />
                      <span className={cx('small', late ? 'late' : 'muted')} style={{ width: 52, textAlign: 'right' }}>{shortDate(t.dueDate)}</span>
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
                      <div className="muted small">{n.source} · {relativeDay(n.publishedAt)}</div>
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
