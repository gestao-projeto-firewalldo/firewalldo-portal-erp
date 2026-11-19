import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, UserRound } from 'lucide-react';
import { Avatar, AvatarStack, EmptyState, ErrorState, PriorityBadge, Skeleton } from '@/components/ui';
import { ProjectIcon } from '@/components/shared';
import { useTaskEditor } from '@/components/tasks/TaskEditor';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@/hooks/useQuery';
import { tasksService } from '@/services';
import { cx, daysUntil, shortDate, statusColor, statusLabel, statusOrder, ticketLabel } from '@/lib/labels';
import type { Member, Project, Task, TaskStatus } from '@/types/models';

type View = 'kanban' | 'lista' | 'calendario';
const views: { id: View; label: string }[] = [
  { id: 'kanban', label: 'Kanban' },
  { id: 'lista', label: 'Lista' },
  { id: 'calendario', label: 'Calendário' },
];

export default function Tasks() {
  const q = useQuery(() => tasksService.list(), [], 15000);
  const { me, members, membersById, projects, projectsById, can } = useSession();
  const openTask = useTaskEditor();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>(() => (params.get('ver') as View) || 'kanban');
  const [project, setProject] = useState('');
  const [assignee, setAssignee] = useState('');

  useEffect(() => {
    if (params.get('meu') && me) setAssignee(me.id);
  }, [params, me]);

  // Abre uma tarefa via ?t=ID
  useEffect(() => {
    const id = params.get('t');
    if (!id || !q.data) return;
    const t = q.data.find((x) => x.id === id);
    if (t) openTask({ task: t });
    params.delete('t');
    setParams(params, { replace: true });
  }, [params, q.data, openTask, setParams]);

  const changeView = (v: View) => {
    setView(v);
    params.set('ver', v);
    setParams(params, { replace: true });
  };

  const all = q.data ?? [];
  const filtered = useMemo(
    () => all.filter((t) => (!project || t.projectId === project) && (!assignee || t.assigneeIds.includes(assignee))),
    [all, project, assignee],
  );

  const accept = async (t: Task) => {
    try {
      await tasksService.accept(t.id);
      toast({ tone: 'success', title: 'Você aceitou a tarefa', description: t.title });
    } catch (e) {
      toast({ tone: 'error', title: 'Não foi possível aceitar', description: (e as Error).message });
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Tarefas</h1>
      </div>

      <div className="tabs-bar">
        <div className="tabs" role="tablist">
          {views.map((v) => (
            <button key={v.id} role="tab" aria-selected={view === v.id} className={cx('tab', view === v.id && 'active')} onClick={() => changeView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="tabs-filters">
          <select className="select" value={project} onChange={(e) => setProject(e.target.value)} aria-label="Projeto">
            <option value="">Todos os projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className="select" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Responsável">
            <option value="">{can('tarefas.editar_todas') ? 'Todos' : 'Minhas tarefas'}</option>
            {members.filter(m=>can('tarefas.editar_todas') || m.id===me?.id).map((m) => (
              <option key={m.id} value={m.id}>{m.id === me?.id ? `${m.name} (eu)` : m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {q.error ? (
        <div className="card">
          <ErrorState error={q.error} onRetry={q.refetch} />
        </div>
      ) : !q.data ? (
        <div className="board">{statusOrder.map((s) => <Skeleton key={s} h={420} r={14} />)}</div>
      ) : view === 'kanban' ? (
        <Board tasks={filtered} meId={me?.id} membersById={membersById} projectsById={projectsById} onOpen={(t) => openTask({ task: t })} onAccept={accept} />
      ) : view === 'lista' ? (
        <ListView tasks={filtered} membersById={membersById} projectsById={projectsById} onOpen={(t) => openTask({ task: t })} />
      ) : (
        <CalendarView tasks={filtered} onOpen={(t) => openTask({ task: t })} />
      )}

      <Link to="/projetos" className="create-link">
        <ExternalLink size={20} /> Criar tarefa em Projetos
      </Link>
    </div>
  );
}

/* =================== KANBAN =================== */

function Board({
  tasks,
  meId,
  membersById,
  projectsById,
  onOpen,
  onAccept,
}: {
  tasks: Task[];
  meId?: string;
  membersById: Record<string, Member>;
  projectsById: Record<string, Project>;
  onOpen: (t: Task) => void;
  onAccept: (t: Task) => void;
}) {
  const toast = useToast();
  const { can } = useSession();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);

  const drop = async (e: DragEvent, col: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    setDragId(null);
    setOver(null);
    const t = tasks.find((x) => x.id === id);
    if (!t || t.status === col) return;
    const mine = !!meId && t.assigneeIds.includes(meId);
    if (!can('tarefas.editar_todas') && !mine) {
      toast({ tone: 'error', title: 'Sem permissão', description: 'Você só pode mover tarefas em que é responsável.' });
      return;
    }
    try { await tasksService.move(t.id, col, null);
    toast({ tone: col === 'concluido' ? 'celebrate' : 'info', title: col === 'concluido' ? 'Tarefa concluída' : `Movida para ${statusLabel[col]}`, description: t.title });
    } catch(error) { toast({tone:'error',title:'Não foi possível mover a tarefa',description:(error as Error).message}); }
  };

  return (
    <div className="board">
      {statusOrder.map((col) => {
        const items = tasks.filter((t) => t.status === col).sort((a, b) => a.order - b.order);
        return (
          <section
            key={col}
            className={cx('column', over === col && 'over')}
            style={{ '--c': statusColor[col] } as CSSProperties}
            onDragOver={(e) => {
              e.preventDefault();
              if (over !== col) setOver(col);
            }}
            onDragLeave={(e) => !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node) && setOver(null)}
            onDrop={(e) => drop(e, col)}
            aria-label={statusLabel[col]}
          >
            <header className="column-head">
              <h3>
                <i className="dot" /> {statusLabel[col]} <span>({items.length})</span>
              </h3>
              {col === 'backlog' && <p>Vagas para aceitar</p>}
            </header>
            <div className="column-body">
              {items.length === 0 && <div className="column-empty">{dragId ? 'Solte aqui' : 'Nenhuma tarefa'}</div>}
              {items.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  meId={meId}
                  project={t.projectId ? projectsById[t.projectId] : undefined}
                  assignees={t.assigneeIds.map((id) => membersById[id]).filter(Boolean)}
                  dragging={dragId === t.id}
                  onOpen={() => onOpen(t)}
                  onAccept={() => onAccept(t)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', t.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDragId(t.id);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOver(null);
                  }}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  meId,
  project,
  assignees,
  dragging,
  onOpen,
  onAccept,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  meId?: string;
  project?: Project;
  assignees: Member[];
  dragging: boolean;
  onOpen: () => void;
  onAccept: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
}) {
  const isBacklog = task.status === 'backlog';
  const done = task.status === 'concluido';
  const full = task.assigneeIds.length >= task.maxAssignees;
  const accepted = !!meId && task.assigneeIds.includes(meId);
  const late = task.dueDate && !done && daysUntil(task.dueDate) < 0;
  const first = assignees[0];

  return (
    <article
      className={cx('task-card', dragging && 'dragging')}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
    >
      {ticketLabel(task)&&<span className="task-ticket">{ticketLabel(task)}</span>}
      <h4>{task.title}</h4>
      {project && !isBacklog && (
        <span className="project-chip">
          <ProjectIcon project={project} size={20} /> {project.name}
        </span>
      )}

      {isBacklog ? (
        <>
          <div className="tc-row">
            {assignees.length > 0 ? (
              <span className="row" style={{ gap: 8 }}>
                <AvatarStack members={assignees} size={28} max={3} />
                {assignees.length} aceit{assignees.length > 1 ? 'aram' : 'ou'}
              </span>
            ) : (
              <span className="row muted" style={{ gap: 8 }}>
                <UserRound size={18} /> Sem responsável
              </span>
            )}
            <span className="lim">
              Lim. {task.assigneeIds.length}/{task.maxAssignees}
            </span>
          </div>
          <button
            className="btn accept"
            disabled={accepted || full || !task.open}
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
          >
            {accepted ? 'Você aceitou' : full ? 'Sem vagas' : 'Aceitar tarefa'}
          </button>
        </>
      ) : (
        <div className="tc-row">
          {first ? (
            <span className="row ellipsis" style={{ gap: 8, minWidth: 0 }}>
              <Avatar member={first} size={28} />
              <span className="ellipsis">{first.name}</span>
              {assignees.length > 1 && <span className="muted small">+{assignees.length - 1}</span>}
            </span>
          ) : (
            <span className="muted">Sem responsável</span>
          )}
          {done ? (
            <span className="tc-done">
              <CheckCircle2 size={17} /> Concluída
            </span>
          ) : task.dueDate ? (
            <span className={cx('tc-due', late && 'late')}>
              <CalendarDays size={16} /> Até {shortDate(task.dueDate)}
            </span>
          ) : null}
        </div>
      )}
    </article>
  );
}

/* =================== LISTA =================== */

function ListView({
  tasks,
  membersById,
  projectsById,
  onOpen,
}: {
  tasks: Task[];
  membersById: Record<string, Member>;
  projectsById: Record<string, Project>;
  onOpen: (t: Task) => void;
}) {
  if (!tasks.length) return <div className="card"><EmptyState title="Nenhuma tarefa com esses filtros" /></div>;
  const sorted = [...tasks].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'),
  );
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Tarefa</th>
            <th className="hide-sm">Projeto</th>
            <th>Status</th>
            <th className="hide-sm">Prioridade</th>
            <th className="hide-sm">Responsáveis</th>
            <th>Prazo</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr key={t.id} onClick={() => onOpen(t)} style={{ cursor: 'pointer' }}>
              <td style={{ fontWeight: 600 }}>{ticketLabel(t)&&<span className="task-ticket">{ticketLabel(t)}</span>} {t.title}</td>
              <td className="hide-sm muted">{t.projectId ? projectsById[t.projectId]?.name : '—'}</td>
              <td>
                <span className="status-pill" style={{ '--c': statusColor[t.status] } as CSSProperties}>
                  <i /> {statusLabel[t.status]}
                </span>
              </td>
              <td className="hide-sm">
                <PriorityBadge p={t.priority} />
              </td>
              <td className="hide-sm">
                {t.assigneeIds.length ? (
                  <AvatarStack members={t.assigneeIds.map((id) => membersById[id]).filter(Boolean)} size={28} />
                ) : (
                  <span className="muted small">Lim. 0/{t.maxAssignees}</span>
                )}
              </td>
              <td className="muted" style={{ whiteSpace: 'nowrap' }}>{shortDate(t.dueDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =================== CALENDÁRIO =================== */

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function CalendarView({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const first = new Date(cursor.y, cursor.m, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const key = (d: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const byDay = new Map<string, Task[]>();
  tasks.forEach((t) => t.dueDate && byDay.set(t.dueDate, [...(byDay.get(t.dueDate) ?? []), t]));
  const noDate = tasks.filter((t) => !t.dueDate);
  const shift = (n: number) => setCursor(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));

  return (
    <div className="card calendar">
      <div className="cal-head">
        <h2>
          {MONTHS[cursor.m]} {cursor.y}
        </h2>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm" onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}>Hoje</button>
          <button className="btn sm icon" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft /></button>
          <button className="btn sm icon" onClick={() => shift(1)} aria-label="Próximo mês"><ChevronRight /></button>
        </div>
      </div>
      <div className="cal-grid">
        {WEEK.map((w) => (
          <div key={w} className="cal-week">{w}</div>
        ))}
        {Array.from({ length: cells }, (_, i) => {
          const d = i - startOffset + 1;
          if (d < 1 || d > daysInMonth) return <div key={i} className="cal-cell out" />;
          const list = byDay.get(key(d)) ?? [];
          return (
            <div key={i} className={cx('cal-cell', key(d) === todayKey && 'today')}>
              <span className="cal-day">{d}</span>
              {list.slice(0, 3).map((t) => (
                <button key={t.id} className="cal-task" style={{ '--c': statusColor[t.status] } as CSSProperties} onClick={() => onOpen(t)} title={`${ticketLabel(t)} ${t.title}`}>
                  {ticketLabel(t)} {t.title}
                </button>
              ))}
              {list.length > 3 && <span className="muted small">+{list.length - 3}</span>}
            </div>
          );
        })}
      </div>
      <div className="legend" style={{ padding: '14px 20px' }}>
        {statusOrder.map((s) => (
          <span key={s} style={{ '--c': statusColor[s] } as CSSProperties}>
            <i /> {statusLabel[s]}
          </span>
        ))}
        {noDate.length > 0 && <span style={{ marginLeft: 'auto' }}>{noDate.length} tarefa(s) sem prazo</span>}
      </div>
    </div>
  );
}
