import { useConfirm } from '@/context/ConfirmContext';
import { useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Power, RefreshCw, Repeat2, Save, Search, Trash2, X } from 'lucide-react';
import { Avatar, EmptyState, ErrorState, Modal, PriorityBadge, Skeleton } from '@/components/ui';
import { FormDateInput } from '@/components/ui/DateInput';
import { useTaskEditor } from '@/components/tasks/TaskEditor';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@/hooks/useQuery';
import { agendaService, tasksService, uid } from '@/services';
import { useApi } from '@/services/core';
import { categoryLabel, cx, priorityLabel, statusLabel , ticketLabel } from '@/lib/labels';
import type { Category, Priority, ScheduleInput, ScheduleKind, TaskSchedule } from '@/types/models';

const kinds: Record<ScheduleKind,string> = {recurring:'Recorrentes',weekly:'Semanais',scheduled:'Agendadas'};
const weekdays=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];
const dateLabel=(value:string)=>value.split('-').reverse().join('/');
const brToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const instantLabel=(value:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
const blank=():ScheduleInput=>({title:'',description:'',projectId:null,category:'programacao',priority:'media',assigneeIds:[],initialStatus:'backlog',maxAssignees:1,kind:'recurring',intervalDays:1,startDate:brToday(),endDate:null,openingTime:'09:00',weekdays:[],dates:[],deadlineDays:0,checklist:[]});
function editable(s:TaskSchedule):ScheduleInput {return {...blank(),...Object.fromEntries(Object.keys(blank()).filter(k=>s[k as keyof ScheduleInput]!==undefined).map(k=>[k,s[k as keyof ScheduleInput]])),initialStatus:s.initialStatus??'a_fazer',maxAssignees:s.maxAssignees??Math.max(1,s.assigneeIds.length)} as ScheduleInput;}
function repeatLabel(s:TaskSchedule) {
  if(s.kind==='recurring')return s.intervalDays===1?'Todos os dias':`A cada ${s.intervalDays} dias`;
  if(s.kind==='weekly')return s.weekdays.map(d=>weekdays[d-1].replace('-feira','')).join(', ');
  return `${s.dates.length} data(s) selecionada(s)`;
}

export default function Agenda(){
  const {me,members,membersById,projectsById,can}=useSession();
  const admin=can('tarefas.editar_todas');
  const query=useQuery(()=>agendaService.list(),[],15000);
  const tasks=useQuery(()=>tasksService.list(),[],15000);
  const toast=useToast();
  const confirm = useConfirm();const openTask=useTaskEditor();
  const [search,setSearch]=useState('');const [kind,setKind]=useState<''|ScheduleKind>('');
  const [person,setPerson]=useState('');const [editor,setEditor]=useState<TaskSchedule|'new'|null>(null);
  const [busy,setBusy]=useState('');
  const selected=useMemo(()=>(query.data??[]).filter(s=>(!kind||s.kind===kind)&&(!person||(s.assigneeIds.includes(person)||(s.initialStatus==='backlog'&&!s.assigneeIds.length)))&&`${s.title} ${s.description}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))),[query.data,kind,person,search]);
  const ids=new Set(selected.map(s=>s.id));
  const generated=(tasks.data??[]).filter(t=>t.scheduleId&&ids.has(t.scheduleId)&&(!person||(t.assigneeIds.includes(person)||t.status==='backlog'&&(!t.eligibleAssigneeIds?.length||t.eligibleAssigneeIds.includes(person))))).sort((a,b)=>(b.scheduledFor??'').localeCompare(a.scheduledFor??''));
  const upcoming=selected.filter(s=>s.active&&s.upcoming.length>0).sort((a,b)=>a.upcoming[0].localeCompare(b.upcoming[0]));
  const change=async(s:TaskSchedule,remove=false)=>{
    if(remove&&!await confirm({title:'Remover agenda?',description:`Remover a agenda “${s.title}”? As tarefas já liberadas serão mantidas.`,confirmLabel:'Remover'}))return;
    setBusy(s.id);
    try{if(remove)await agendaService.remove(s.id);else await agendaService.active(s.id,!s.active);toast({tone:'success',title:remove?'Agenda removida':s.active?'Agenda pausada':'Agenda ativada'});}
    catch(e){toast({tone:'error',title:'Não foi possível alterar',description:(e as Error).message});}finally{setBusy('');}
  };
  if(!useApi())return <div className="page card pad"><EmptyState title="Agenda disponível com a API" description="A geração automática funciona no servidor e precisa de conexão com o banco. Publique a API para utilizar esta aba."/></div>;
  return <div className="page agenda-page">
    <div className="page-head"><div><h1>Agenda</h1><p className="muted">Organize tarefas recorrentes, semanais ou em datas específicas.</p></div><div className="agenda-actions"><button className="btn" onClick={()=>{query.refetch();tasks.refetch();}} aria-label="Atualizar agenda"><RefreshCw size={17}/></button>{admin&&<button className="btn primary" onClick={()=>setEditor('new')}><Plus/>Criar agenda</button>}</div></div>
    <div className="notice agenda-info"><Clock3 size={20}/><div>Horários de Brasília. Cada abertura gera uma tarefa compartilhada. No Backlog, ela aguarda os aceites até completar as vagas; em A fazer, todos os vinculados recebem a mesma tarefa.{admin&&<span className="small"> Alterar uma regra afeta as próximas aberturas; as tarefas liberadas são editadas separadamente abaixo ou no Kanban.</span>}</div></div>
    <div className="card agenda-filters"><label className="search-box"><Search size={18}/><input className="input" aria-label="Buscar agenda" placeholder="Buscar por nome ou descrição…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select className="select" aria-label="Responsável da agenda" value={person} onChange={e=>setPerson(e.target.value)}><option value="">{admin?'Todos':'Minhas agendas'}</option>{members.filter(m=>admin||m.id===me?.id).map(m=><option key={m.id} value={m.id}>{m.name}{m.id===me?.id?' (eu)':''}</option>)}</select><div className="agenda-tabs" role="tablist" aria-label="Tipo de agenda">{(['',...Object.keys(kinds)] as (''|ScheduleKind)[]).map(k=><button role="tab" aria-selected={kind===k} key={k} className={cx('btn sm',kind===k&&'primary')} onClick={()=>setKind(k)}>{k?kinds[k]:'Todas'}</button>)}</div></div>
    {query.error?<div className="card pad"><ErrorState error={query.error} onRetry={query.refetch}/></div>:!query.data?<Skeleton h={250}/>:<>
      <section className="card agenda-section"><header><span className="icon-tile"><CalendarDays/></span><div><h2>Próximas aberturas</h2><p className="small muted">Prévia das próximas seis datas por regra. Nenhuma tarefa é criada antecipadamente.</p></div><span className="badge outline">{upcoming.length}</span></header>
        {!upcoming.length?<div className="agenda-empty">Nenhuma abertura futura neste filtro.</div>:<div className="agenda-upcoming">{upcoming.map(s=><article key={s.id}><div><b>{s.title}</b><p className="small muted">{s.assigneeIds.length?s.assigneeIds.map(id=>membersById[id]?.name??'Conta indisponível').join(', '):'Qualquer pessoa pode aceitar'}</p><PriorityBadge p={s.priority}/></div><div className="agenda-dates">{s.upcoming.map(date=><span className="badge outline" key={date}>{instantLabel(date)}</span>)}</div>{admin&&<button className="btn sm" onClick={()=>setEditor(s)} aria-label={`Editar agenda ${s.title}`}><Pencil size={16}/>Editar</button>}</article>)}</div>}
      </section>
      {(Object.keys(kinds) as ScheduleKind[]).filter(k=>!kind||k===kind).map(k=>{const group=selected.filter(s=>s.kind===k);return <section className={`card agenda-section agenda-${k}`} key={k}><header>{k==='recurring'?<Repeat2 size={22}/>:<CalendarDays size={22}/>}<h2>{kinds[k]}</h2><span className="badge outline">{group.length}</span></header><div className="agenda-rules">{group.length===0?<div className="agenda-empty">Nenhuma agenda nesta categoria.</div>:group.map(s=><article className="agenda-rule" key={s.id}><div className="agenda-rule-main"><h3>{s.title}</h3><p className="small muted">{repeatLabel(s)} · às {s.openingTime} · prazo de {s.deadlineDays} dia(s)</p><p className="small muted">{s.assigneeIds.length?s.assigneeIds.map(id=>membersById[id]?.name??'Conta indisponível').join(', '):'Qualquer pessoa pode aceitar'}{s.projectId&&` · ${projectsById[s.projectId]?.name??'Projeto'}`}</p><div className="agenda-tags"><PriorityBadge p={s.priority}/><span className="badge outline">{s.initialStatus==='backlog'?`Backlog · ${s.maxAssignees??1} aceite(s)`:'A fazer · equipe compartilhada'}</span><span className={cx('badge outline',s.active&&s.nextRunAt&&'active')}>{!s.active?'Pausada':s.nextRunAt?'Ativa':'Encerrada'}</span>{s.nextRunAt&&<span className="small muted">Próxima: {instantLabel(s.nextRunAt)}</span>}</div></div>{admin&&<div className="agenda-actions"><button className="btn sm" disabled={busy===s.id} onClick={()=>setEditor(s)} aria-label={`Editar regra ${s.title}`}><Pencil size={16}/>Editar</button><button className="btn sm" disabled={busy===s.id} onClick={()=>change(s)}><Power size={16}/>{s.active?'Pausar':'Ativar'}</button><button className="btn sm danger" disabled={busy===s.id} onClick={()=>change(s,true)} aria-label={`Remover agenda ${s.title}`}><Trash2 size={16}/></button></div>}</article>)}</div></section>;})}
      <section className="card agenda-section"><header><h2>Tarefas já liberadas</h2><span className="badge outline">{generated.length}</span></header>{tasks.error?<ErrorState error={tasks.error} onRetry={tasks.refetch}/>:generated.length===0?<div className="agenda-empty">As tarefas aparecerão aqui e em Tarefas quando chegar a abertura.</div>:<div className="agenda-rules">{generated.slice(0,30).map(t=><button className="agenda-generated" key={t.id} onClick={()=>openTask({task:t})}><div><b>{ticketLabel(t)&&<span className="task-ticket">{ticketLabel(t)}</span>} {t.title}</b><p className="small muted">{(t.status==='backlog'?(t.eligibleAssigneeIds??[]):t.assigneeIds).map(id=>membersById[id]?.name??'Conta indisponível').join(', ')||(t.status==='backlog'?'Qualquer pessoa pode aceitar':'Sem responsável')} · {instantLabel(t.scheduledFor!)} </p></div><span className="badge outline">{statusLabel[t.status]}{t.status==='backlog'&&` · Aceites ${t.assigneeIds.length}/${t.maxAssignees}`}</span><Pencil size={17}/></button>)}{generated.length>30&&<p className="small muted">Exibindo as 30 últimas. Consulte todas em Tarefas.</p>}</div>}</section>
      {query.data.length===0&&<EmptyState title={admin?'Crie sua primeira agenda':'Nenhuma agenda vinculada a você'} description={admin?'Escolha pessoas, frequência e horário para automatizar a distribuição de tarefas.':'Suas tarefas serão liberadas no horário definido pela administração.'}/>}
    </>}
    {editor&&<AgendaEditor schedule={editor==='new'?undefined:editor} onClose={()=>setEditor(null)}/>}
  </div>;
}

function AgendaEditor({schedule,onClose}:{schedule?:TaskSchedule;onClose:()=>void}){
  const {members,projects}=useSession();const toast=useToast();const formRef=useRef<HTMLFormElement>(null);
  const [form,setForm]=useState<ScheduleInput>(()=>schedule?editable(schedule):blank());const [saving,setSaving]=useState(false);const [error,setError]=useState('');
  const [items,setItems]=useState(()=>form.checklist.map(c=>c.text).join('\n'));
  const set=<K extends keyof ScheduleInput>(key:K,value:ScheduleInput[K])=>setForm(f=>({...f,[key]:value}));
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();setError('');
    if(form.initialStatus==='a_fazer'&&!form.assigneeIds.length){setError('Vincule pelo menos uma pessoa ou escolha Backlog.');return;}
    if(!Number.isInteger(form.maxAssignees)||form.maxAssignees<1||form.maxAssignees>100){setError('Informe de 1 a 100 vagas.');return;}
    if(form.kind==='weekly'&&!form.weekdays.length){setError('Escolha pelo menos um dia da semana.');return;}
    if(form.kind==='scheduled'&&!form.dates.length){setError('Selecione pelo menos uma data no calendário.');return;}
    setSaving(true);
    try{const data={...form,maxAssignees:form.initialStatus==='a_fazer'?Math.max(form.maxAssignees,form.assigneeIds.length):form.maxAssignees,checklist:items.split('\n').map(t=>t.trim()).filter(Boolean).map((text,i)=>({id:form.checklist[i]?.id??uid('c'),text,done:false}))};if(schedule)await agendaService.update(schedule.id,data);else await agendaService.create(data);toast({tone:'success',title:schedule?'Agenda atualizada':'Agenda criada',description:form.initialStatus==='backlog'?`Uma tarefa por abertura, aguardando ${form.maxAssignees} aceite(s).`:'Uma tarefa compartilhada entre todos os vinculados.'});onClose();}
    catch(e){setError((e as Error).message);}finally{setSaving(false);}
  };
  return <Modal open onClose={()=>!saving&&onClose()} title={schedule?'Editar agenda':'Criar agenda'} subtitle="Uma tarefa compartilhada por abertura, com todos os vinculados ou com vagas para aceitar." width={760} error={error} footer={<><button className="btn" disabled={saving} onClick={onClose}>Cancelar</button><button className="btn primary" disabled={saving} type="submit" form="agenda-editor">{saving?<span className="spinner"/>:<Save size={18}/>}Salvar agenda</button></>}>
    <form id="agenda-editor" ref={formRef} className="form-grid agenda-form" onSubmit={save}>
      <div className="field full"><label htmlFor="agenda-title">Nome da tarefa *</label><input autoFocus id="agenda-title" className="input" required minLength={3} maxLength={200} value={form.title} onChange={e=>set('title',e.target.value)}/></div>
      <div className="field full"><label htmlFor="agenda-desc">Descrição</label><textarea id="agenda-desc" className="textarea" maxLength={12000} value={form.description} onChange={e=>set('description',e.target.value)}/></div>
      <div className="field"><label htmlFor="agenda-project">Projeto</label><select id="agenda-project" className="select" value={form.projectId??''} onChange={e=>{const id=e.target.value||null;setForm(f=>({...f,projectId:id,category:projects.find(p=>p.id===id)?.category??f.category}));}}><option value="">Sem projeto</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="field"><label htmlFor="agenda-category">Categoria</label><select id="agenda-category" className="select" value={form.category} onChange={e=>set('category',e.target.value as Category)}>{Object.entries(categoryLabel).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></div>
      <div className="field"><label htmlFor="agenda-priority">Prioridade</label><select id="agenda-priority" className="select" value={form.priority} onChange={e=>set('priority',e.target.value as Priority)}>{Object.entries(priorityLabel).map(([id,label])=><option value={id} key={id}>{label}</option>)}</select></div>
      <div className="field"><label htmlFor="agenda-deadline">Prazo após abrir (dias)</label><input id="agenda-deadline" className="input" type="number" required min={0} max={365} value={form.deadlineDays} onChange={e=>set('deadlineDays',Number(e.target.value))}/><span className="small muted">Zero: entrega no mesmo dia.</span></div>
      <div className="field"><label htmlFor="agenda-time">Horário de abertura · Brasília *</label><input id="agenda-time" className="input" type="time" required value={form.openingTime} onChange={e=>set('openingTime',e.target.value)}/></div>
      <div className="field"><label htmlFor="agenda-start">Início *</label><FormDateInput id="agenda-start" required value={form.startDate} onChange={v=>set('startDate',v)}/></div>
      <div className="field"><label htmlFor="agenda-end">Fim (opcional)</label><FormDateInput id="agenda-end" value={form.endDate} onChange={v=>set('endDate',v||null)}/></div>
      <div className="field"><label htmlFor="agenda-status">Coluna de entrada *</label><select id="agenda-status" className="select" value={form.initialStatus} onChange={e=>set('initialStatus',e.target.value as 'backlog'|'a_fazer')}><option value="backlog">Backlog — aguardar aceites</option><option value="a_fazer">A fazer — atribuir à equipe</option></select></div>
      {form.initialStatus==='backlog'&&<div className="field"><label htmlFor="agenda-max">Vagas necessárias para iniciar *</label><input id="agenda-max" className="input" type="number" min={1} max={100} required value={form.maxAssignees} onChange={e=>set('maxAssignees',Number(e.target.value))}/><span className="small muted">A tarefa avança quando completar este número de aceites.</span></div>}
      <fieldset className="field full agenda-people"><legend>{form.initialStatus==='backlog'?'Quem pode aceitar':'Responsáveis *'}</legend><p className="small muted">{form.initialStatus==='backlog'?'Selecione os candidatos ou deixe sem seleção para qualquer pessoa aceitar. Convidados não ocupam vagas: 3, 5 ou 10 pessoas podem concorrer a 1 ou 2 vagas.':'Todos os selecionados serão responsáveis pela mesma tarefa. O andamento e o checklist são compartilhados.'}</p><div>{members.filter(m=>m.active||form.assigneeIds.includes(m.id)).map(m=><label className="check" key={m.id}><input type="checkbox" checked={form.assigneeIds.includes(m.id)} disabled={!m.active&&!form.assigneeIds.includes(m.id)} onChange={e=>set('assigneeIds',e.target.checked?[...form.assigneeIds,m.id]:form.assigneeIds.filter(id=>id!==m.id))}/><Avatar member={m} size={26}/><span>{m.name}<small className="muted">{!m.active?'Conta inativa':m.title}</small></span></label>)}</div></fieldset>
      <div className="field full"><span className="label">Tipo de agenda</span><div className="agenda-kind">{(Object.keys(kinds) as ScheduleKind[]).map(k=><button type="button" aria-pressed={form.kind===k} className={cx('btn',form.kind===k&&'primary')} key={k} onClick={()=>set('kind',k)}>{k==='recurring'?'Recorrente':k==='weekly'?'Semanal':'Agendada'}</button>)}</div></div>
      {form.kind==='recurring'&&<div className="field full"><label htmlFor="agenda-interval">Repetir a cada quantos dias?</label><input id="agenda-interval" className="input" type="number" min={1} max={365} required value={form.intervalDays} onChange={e=>set('intervalDays',Number(e.target.value))}/><span className="small muted">1 = todos os dias. A contagem começa na data de início.</span></div>}
      {form.kind==='weekly'&&<fieldset className="field full agenda-weekdays"><legend>Dias da semana *</legend>{weekdays.map((day,i)=><label className="check" key={day}><input type="checkbox" checked={form.weekdays.includes(i+1)} onChange={e=>set('weekdays',e.target.checked?[...form.weekdays,i+1].sort((a,b)=>a-b):form.weekdays.filter(d=>d!==i+1))}/>{day}</label>)}</fieldset>}
      {form.kind==='scheduled'&&<div className="field full"><span className="label">Selecione as datas *</span><DatePicker selected={form.dates} min={form.startDate} max={form.endDate} onChange={v=>set('dates',v)}/><span className="small muted">Clique para selecionar ou remover. Até 100 datas por agenda.</span></div>}
      <div className="field full"><label htmlFor="agenda-checklist">Checklist da tarefa (um item por linha)</label><textarea id="agenda-checklist" className="textarea" value={items} onChange={e=>setItems(e.target.value)} placeholder="Revisar os alertas\nRegistrar o resultado"/></div>
    </form>
  </Modal>;
}

function DatePicker({selected,min,max,onChange}:{selected:string[];min:string;max:string|null;onChange:(v:string[])=>void}){
  const [month,setMonth]=useState(()=>`${min||brToday()}`.slice(0,7));
  const [year,number]=month.split('-').map(Number);const first=new Date(year,number-1,1);const total=new Date(year,number,0).getDate();
  const iso=(d:number)=>`${year}-${String(number).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const move=(n:number)=>{const d=new Date(year,number-1+n,1);if(d.getFullYear()>=2000&&d.getFullYear()<=2100)setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);};
  return <><div className="agenda-calendar"><header><button className="icon-btn" type="button" aria-label="Mês anterior" onClick={()=>move(-1)}><ChevronLeft/></button><b>{first.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</b><button className="icon-btn" type="button" aria-label="Próximo mês" onClick={()=>move(1)}><ChevronRight/></button></header><div className="agenda-month">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=><span className="small muted" key={d}>{d}</span>)}{Array.from({length:first.getDay()},(_,i)=><span key={`empty${i}`}/>)}{Array.from({length:total},(_,i)=>{const date=iso(i+1);const active=selected.includes(date);return <button type="button" key={date} aria-label={`Selecionar ${dateLabel(date)}`} aria-pressed={active} disabled={date<min||!!max&&date>max||!active&&selected.length>=100} className={cx('btn',active&&'primary')} onClick={()=>onChange(active?selected.filter(d=>d!==date):[...selected,date].sort())}>{i+1}</button>;})}</div></div><div className="agenda-date-chips">{selected.map(d=><button type="button" className="chip" key={d} onClick={()=>onChange(selected.filter(v=>v!==d))} aria-label={`Remover data ${dateLabel(d)}`}>{dateLabel(d)}<X size={14}/></button>)}</div></>;
}
