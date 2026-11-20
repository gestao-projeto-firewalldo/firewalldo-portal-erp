import { useState } from 'react';
import { ArrowLeft, ArrowRight, Archive } from 'lucide-react';
import { useConfirm } from '@/context/ConfirmContext';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { tasksService } from '@/services';
import { statusLabel } from '@/lib/labels';
import { canMoveTask, taskSteps } from '@/lib/taskWorkflow';
import type { Task, TaskStatus } from '@/types/models';

export function TaskWorkflow({ task, onMoved, onFinalized }: { task: Task; onMoved?: (status: TaskStatus) => void; onFinalized?:()=>void }) {
  const { me } = useSession();
  const toast = useToast();
  const confirm=useConfirm();
  const [busy, setBusy] = useState(false);
  if (task.finalizedAt || !canMoveTask(task, me) || task.status === 'backlog') return null;
  const finalize=async()=>{
    if(busy||!await confirm({title:'Finalizar tarefa?',description:`“${task.title}” sairá do Kanban e ficará no histórico do projeto e nos Relatórios, com todos os detalhes preservados.`,confirmLabel:'Finalizar tarefa'}))return;
    setBusy(true);
    try{await tasksService.finalize(task.id);onFinalized?.();toast({tone:'success',title:'Tarefa finalizada',description:'Disponível no histórico do projeto e nos Relatórios.'});}
    catch(e){toast({tone:'error',title:'Não foi possível finalizar',description:(e as Error).message});}
    finally{setBusy(false);}
  };
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
    {me?.role==='superadmin'&&task.status==='concluido'&&<button className="btn sm primary" disabled={busy} aria-label={`Finalizar ${task.title}`} onClick={()=>void finalize()}><Archive size={16}/>Finalizar</button>}
  </div>;
}
