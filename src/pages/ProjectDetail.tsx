import { useState, type CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Check, Flag, ListChecks, Plus, Users, Pencil, Trash2 } from 'lucide-react';
import { useConfirm } from '@/context/ConfirmContext';
import { Async, Avatar, AvatarStack, EmptyState, PriorityBadge, Progress, Skeleton } from '@/components/ui';
import { ProjectIcon } from '@/components/shared';
import { ProjectEditor } from '@/pages/Projects';
import { useToast } from '@/context/ToastContext';
import { useTaskEditor } from '@/components/tasks/TaskEditor';
import { useSession } from '@/context/SessionContext';
import { useQuery } from '@/hooks/useQuery';
import { projectsService, tasksService } from '@/services';
import { categoryLabel, cx, longDate, projectStatusLabel, shortDate, statusColor, statusLabel, statusOrder , ticketLabel } from '@/lib/labels';
import { projectProgress } from '@/lib/progress';
import { TaskArchive } from '@/components/tasks/TaskArchive';

export default function ProjectDetail() {
  const { id = '' } = useParams();
  const q = useQuery(() => projectsService.get(id), [id]);
  const tasksQ = useQuery(() => tasksService.list(true));
  const { membersById, can } = useSession();
  const openTask = useTaskEditor();
  const [editing,setEditing] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const remove = async (name: string) => {
    if (!await confirm({ title: 'Excluir projeto?', description: `Tem certeza que deseja excluir “${name}”? As tarefas, os tickets e as agendas serão mantidos sem projeto. O histórico de auditoria será preservado.`, confirmLabel: 'Excluir projeto' })) return;
    setDeleting(true);
    try {
      await projectsService.remove(id);
      toast({ tone: 'success', title: 'Projeto excluído', description: 'As tarefas e agendas foram mantidas sem projeto.' });
      navigate('/projetos', { replace: true });
    } catch (error) { toast({ tone: 'error', title: 'Não foi possível excluir', description: (error as Error).message }); }
    finally { setDeleting(false); }
  };

  return (
    <div className="page">
      <Link to="/projetos" className="back-link">
        <ArrowLeft size={20} /> Voltar para projetos
      </Link>
      <Async q={q} loading={<Skeleton h={140} r={12} />}>
        {(p) => {
          const linked = (tasksQ.data ?? []).filter((t) => t.projectId === p.id);
          const done = linked.filter((t) => t.status === 'concluido').length;
          const pct = projectProgress(p, tasksQ.data);
          return (
            <>
              {editing && <ProjectEditor project={p} onClose={()=>setEditing(false)} />}
              <section className="card project-head">
                <ProjectIcon project={p} size={72} />
                <div className="grow" style={{ minWidth: 0, flex:'1 1 320px' }}>
                  <h1>{p.name}</h1>
                  <p className="muted">{p.subtitle}</p>
                  <div className="row" style={{ marginTop: 12, gap: 18, flexWrap: 'wrap' }}>
                    {p.category && <span className="badge outline">{categoryLabel[p.category]}</span>}{p.brand && <span className="badge outline">{p.brand}</span>}
                    <span className="badge status-blue">{projectStatusLabel[p.status]}</span>
                    <span>
                      {done} de {linked.length} tarefas concluídas
                    </span>
                  </div>
                </div>
                {can('projetos.gerenciar') && <button className="btn" onClick={()=>setEditing(true)}><Pencil /> Editar projeto</button>}
                {can('projetos.gerenciar') && <button className="btn danger" disabled={deleting} onClick={() => remove(p.name)}><Trash2 /> Excluir projeto</button>}
                <div className="project-pct">
                  <b>{pct}%</b>
                  <div className="grow">
                    <Progress value={pct} />
                  </div>
                </div>
              </section>

              <section className="card project-description-panel">
                <div className="card-head"><h2>Descrição do projeto</h2></div>
                <div className="card-body"><p>{p.description||'Nenhuma descrição adicionada.'}</p></div>
              </section>

              <div className="detail-grid">
                <section className="card">
                  <div className="card-head">
                    <ListChecks size={26} />
                    <h2>Tarefas vinculadas</h2>
                    {can('tarefas.criar') && (
                      <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => openTask({ prefill: { projectId: p.id } })}>
                        <Plus /> Criar tarefa
                      </button>
                    )}
                  </div>
                  {tasksQ.loading && !tasksQ.data ? (
                    <div style={{ padding: '0 22px 20px' }}><Skeleton h={200} /></div>
                  ) : linked.filter(t=>!t.finalizedAt).length === 0 ? (
                    <EmptyState title="Nenhuma tarefa ativa neste projeto" description={linked.length?'Consulte as tarefas finalizadas no histórico.':can('tarefas.criar') ? 'Use “Criar tarefa” para começar.' : undefined} />
                  ) : (
                    <div className="linked">
                      {statusOrder.map((s) => {
                        const items = linked.filter((t) => !t.finalizedAt && t.status === s).sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
                        if (!items.length) return null;
                        return (
                          <div key={s} className="linked-group" style={{ '--c': statusColor[s] } as CSSProperties}>
                            <h3>
                              <i /> {statusLabel[s]} <span>· {items.length}</span>
                            </h3>
                            {items.map((t) => (
                              <div key={t.id} className="linked-row" role="button" tabIndex={0} onClick={() => openTask({ task: t })} onKeyDown={(e) => e.key === 'Enter' && openTask({ task: t })}>
                                <span className="grow lr-title">{ticketLabel(t)} {t.title}</span>
                                <span className="lr-meta">
                                  {s === 'backlog' ? (
                                    t.assigneeIds.length ? (
                                      <span className="muted">Lim. {t.assigneeIds.length}/{t.maxAssignees}</span>
                                    ) : (
                                      <i className="muted">Sem responsável</i>
                                    )
                                  ) : (
                                    <PriorityBadge p={t.priority} />
                                  )}
                                </span>
                                <span className="lr-date">
                                  <CalendarDays size={18} /> {shortDate(t.dueDate)}
                                </span>
                                <span className="lr-people">
                                  <AvatarStack members={t.assigneeIds.map((a) => membersById[a]).filter(Boolean)} size={30} max={3} />
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <div style={{ display: 'grid', gap: 20 }}>
                  <TaskArchive tasks={linked.filter(t=>!!t.finalizedAt)}/>
                  <section className="card">
                    <div className="card-head">
                      <Users size={26} />
                      <h2>Colaboradores</h2>
                    </div>
                    <div className="people">
                      {p.ownerIds.map((oid) => {
                        const m = membersById[oid];
                        if (!m) return null;
                        return (
                          <div key={oid} className="person">
                            <Avatar member={m} size={52} />
                            <div className="grow">
                              <b>{m.name}</b>
                              <div className="muted">{m.title}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="card">
                    <div className="card-head">
                      <Flag size={22} />
                      <h2 style={{ fontSize: 19 }}>Etapas e marcos</h2>
                    </div>
                    <div className="card-body milestones">
                      {p.milestones.length === 0 && <p className="muted small">Nenhum marco definido.</p>}
                      {p.milestones.map((m) => (
                        <div key={m.id} className={cx('milestone', m.done && 'done')}>
                          <button
                            className="ms-dot"
                            disabled={!can('projetos.gerenciar')}
                            onClick={() => projectsService.toggleMilestone(p.id, m.id).then(() => q.refetch()).catch(error=>toast({tone:'error',title:'Não foi possível salvar o marco',description:error.message}))}
                            aria-label={m.done ? 'Marcar como pendente' : 'Marcar como concluído'}
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                          <div className="grow">
                            <div style={{ fontWeight: 500 }}>{m.title}</div>
                            <div className="muted small">{longDate(m.dueDate)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </>
          );
        }}
      </Async>
    </div>
  );
}
