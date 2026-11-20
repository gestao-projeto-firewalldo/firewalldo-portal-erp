import { Archive, ChevronRight } from 'lucide-react';
import { useTaskEditor } from './TaskEditor';
import { ticketLabel } from '@/lib/labels';
import type { Task } from '@/types/models';

export function TaskArchive({tasks,showProject=false}:{tasks:Task[];showProject?:boolean}){
  const open=useTaskEditor();
  return <section className="card task-archive">
    <div className="card-head"><Archive/><h2>Tarefas finalizadas</h2><span className="badge outline">{tasks.length}</span></div>
    <p className="muted small archive-help">Histórico preservado. Clique em uma tarefa para ampliar as informações.</p>
    {!tasks.length?<p className="muted archive-help">Nenhuma tarefa finalizada neste filtro.</p>:<div className="archive-list">{[...tasks].sort((a,b)=>(b.finalizedAt??'').localeCompare(a.finalizedAt??'')).map(t=><button type="button" className="archive-row" key={t.id} onClick={()=>open({task:t})}>
      <span className="archive-title"><span className="task-ticket">{ticketLabel(t)}</span><b>{t.title}</b>{showProject&&<small>{t.finalizedProjectName??'Sem projeto'}</small>}</span>
      <span className="archive-date"><span>{new Date(t.finalizedAt!).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'})}</span><small>por {t.finalizedByName??'Administrador principal'}</small></span><ChevronRight size={17}/>
    </button>)}</div>}
  </section>;
}
