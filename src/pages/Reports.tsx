import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { useQuery } from '@/hooks/useQuery';
import { tasksService } from '@/services';
import { Async, SearchInput, Skeleton } from '@/components/ui';
import { TaskArchive } from '@/components/tasks/TaskArchive';
import { ActivityReport } from './Audit';
import ReportMetrics from './ReportMetrics';

export default function Reports(){
  const {can,loading}=useSession();const [tab,setTab]=useState('history');
  if(loading)return <div className="page"><Skeleton h={300}/></div>;
  if(!can('auditoria.ver'))return <Navigate to="/" replace/>;
  return <div className="page reports-page">
    <div className="page-head"><div><h1><BarChart3/>Relatórios</h1><p className="muted">Ações de todos os módulos, histórico das tarefas e indicadores.</p></div></div>
    <div className="tabs" role="tablist" aria-label="Tipo de relatório">{Object.entries({history:'Histórico de ações',finalized:'Tarefas finalizadas',metrics:'Indicadores'}).map(([id,label])=><button role="tab" aria-selected={tab===id} className={`tab ${tab===id?'active':''}`} key={id} onClick={()=>setTab(id)}>{label}</button>)}</div>
    <div className="report-tab-panel" role="tabpanel">{tab==='history'?<ActivityReport/>:tab==='finalized'?<FinalizedReport/>:<ReportMetrics/>}</div>
  </div>;
}
function FinalizedReport(){
  const q=useQuery(()=>tasksService.list(true),[],15000);const [search,setSearch]=useState('');
  return <><SearchInput value={search} onChange={setSearch} placeholder="Buscar tarefa finalizada, projeto ou quem finalizou"/><Async q={q} loading={<Skeleton h={250}/>}>{tasks=><TaskArchive showProject tasks={tasks.filter(t=>t.finalizedAt&&`${t.title} ${t.finalizedProjectName??''} ${t.finalizedByName??''} ${t.ticketNumber??''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))}/>}</Async></>;
}
