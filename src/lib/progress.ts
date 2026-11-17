import type { Project, Task } from '@/types/models';

/**
 * Progresso do projeto = tarefas concluídas / tarefas vinculadas.
 * Sem tarefas carregadas (ou sem tarefas vinculadas), usa `project.progress`.
 * Sugestão para o Back-end: devolver `progress` já calculado com esta mesma regra.
 */
export function projectProgress(project: Project, tasks?: Task[]) {
  const linked = (tasks ?? []).filter((t) => t.projectId === project.id);
  if (!linked.length) return project.progress;
  return Math.round((linked.filter((t) => t.status === 'concluido').length / linked.length) * 100);
}
