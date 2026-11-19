import type { Project, Task } from '@/types/models';

/**
 * Progresso do projeto = tarefas concluídas / tarefas vinculadas.
 * Sem tarefas carregadas, usa o valor calculado pelo servidor.
 * Sem tarefas vinculadas, considera os marcos reais e o status do projeto.
 */
export function projectProgress(project: Project, tasks?: Task[]) {
  const linked = (tasks ?? []).filter((t) => t.projectId === project.id);
  if (!tasks) return project.progress;
  if (!linked.length) return project.status === 'concluido' ? 100 : project.milestones.length ? Math.round(100 * project.milestones.filter(m=>m.done).length/project.milestones.length) : 0;
  return Math.round((linked.filter((t) => t.status === 'concluido').length / linked.length) * 100);
}
