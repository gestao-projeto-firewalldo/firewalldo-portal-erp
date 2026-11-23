import type { Member, Task, TaskStatus } from '@/types/models';

export function canMoveTask(task: Task, member?: Pick<Member, 'id' | 'role'>) {
  return !!member && (member.role === 'superadmin' || task.assigneeIds.includes(member.id));
}

export function taskSteps(status: TaskStatus): { status: TaskStatus; label: string }[] {
  if (status === 'a_fazer') return [{ status: 'em_andamento', label: 'Avançar' }];
  if (status === 'em_andamento') return [{ status: 'a_fazer', label: 'Voltar' }, { status: 'concluido', label: 'Avançar' }];
  if (status === 'concluido') return [{ status: 'em_andamento', label: 'Voltar' }];
  return [];
}
