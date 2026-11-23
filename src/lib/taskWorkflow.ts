import type { Member, Task, TaskStatus } from '@/types/models';

export function isEligible(task: Pick<Task, 'eligibleAssigneeIds'>, memberId?: string) {
  return !!memberId && (!task.eligibleAssigneeIds?.length || task.eligibleAssigneeIds.includes(memberId));
}

export function canAcceptTask(task: Task, memberId?: string) {
  return task.status === 'backlog' && task.open && task.assigneeIds.length < task.maxAssignees
    && isEligible(task, memberId) && !task.assigneeIds.includes(memberId ?? '');
}

export function canMoveTask(task: Task, member?: Pick<Member, 'id' | 'role'>) {
  return !!member && (member.role === 'superadmin' || task.assigneeIds.includes(member.id));
}

export function taskSteps(status: TaskStatus): { status: TaskStatus; label: string }[] {
  if (status === 'a_fazer') return [{ status: 'em_andamento', label: 'Avançar' }];
  if (status === 'em_andamento') return [{ status: 'a_fazer', label: 'Voltar' }, { status: 'concluido', label: 'Avançar' }];
  if (status === 'concluido') return [{ status: 'em_andamento', label: 'Voltar' }];
  return [];
}
