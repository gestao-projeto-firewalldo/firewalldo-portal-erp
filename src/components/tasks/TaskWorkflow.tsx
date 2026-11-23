import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { tasksService } from '@/services';
import { statusLabel } from '@/lib/labels';
import { canMoveTask, taskSteps } from '@/lib/taskWorkflow';
import type { Task, TaskStatus } from '@/types/models';

export function TaskWorkflow({ task, onMoved }: { task: Task; onMoved?: (status: TaskStatus) => void }) {
  const { me } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!canMoveTask(task, me) || task.status === 'backlog') return null;
  const move = async (status: TaskStatus) => {
    if (busy) return;
    setBusy(true);
    try {
      await tasksService.move(task.id, status, null);
      onMoved?.(status);
      toast({ tone: status === 'concluido' ? 'celebrate' : 'success', title: `Movida para ${statusLabel[status]}`, description: task.title });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível mover', description: (error as Error).message });
    } finally { setBusy(false); }
  };
  return <div className="task-workflow" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
    {taskSteps(task.status).map(step => <button key={step.status} className={`btn sm ${step.label === 'Avançar' ? 'primary' : ''}`} disabled={busy}
      aria-label={`${step.label} ${task.title} para ${statusLabel[step.status]}`} onClick={() => move(step.status)}>
      {step.label === 'Voltar' && <ArrowLeft size={16} />}{step.label}{step.label === 'Avançar' && <ArrowRight size={16} />}
    </button>)}
  </div>;
}
