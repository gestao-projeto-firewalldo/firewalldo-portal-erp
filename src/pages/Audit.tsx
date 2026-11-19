import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { DateInput, parseDateText } from '@/components/ui/DateInput';
import { EmptyState, SearchInput, Skeleton } from '@/components/ui';
import { useSession } from '@/context/SessionContext';
import { useQuery } from '@/hooks/useQuery';
import { http, useApi } from '@/services/core';

interface AuditEntry {
  id: string; createdAt: string; actorName: string; actorEmail: string;
  action: string; entity: string; entityId: string; targetName: string;
  ip: string | null; outcome: string;
  details: { fields?: string[]; passwordChanged?: boolean; route?: string; method?: string; httpStatus?: number; previousRole?: string; role?: string };
}
interface AuditResult { items: AuditEntry[]; total: number; page: number; pageSize: number }
const actions: Record<string,string> = { criacao:'Criação', edicao:'Edição', exclusao:'Exclusão', login:'Tentativa de login', logout:'Saída', ativacao:'Ativação de conta', acesso:'Tentativa de acesso' };
const entities: Record<string,string> = { task_schedules:'Agenda de tarefas', task_schedule_runs:'Aberturas da Agenda', push_subscriptions:'Aparelhos e push', push_deliveries:'Envios de notificações', radar_settings:'Agendamento do Radar', radar_runs:'Coletas do Radar', members:'Usuários', projects:'Projetos e marcos', tasks:'Tarefas', ideas:'Ideias', idea_votes:'Votos em ideias', news:'Notícias', saved_news:'Notícias salvas', radar_sources:'Fontes do radar', shortcuts:'Atalhos', notifications:'Notificações', invitations:'Convites de acesso', member_preferences:'Preferências', library_files:'Arquivos', library_folders:'Pastas', autenticacao:'Autenticação' };
const outcomes: Record<string,string> = { sucesso:'Sucesso', falha:'Falha', bloqueado:'Bloqueado' };
const fieldNames: Record<string,string> = {ticket_number:'número do ticket',config:'regra da agenda',next_run_at:'próxima abertura',scheduled_for:'abertura prevista',schedule_id:'agenda',schedule_member_id:'responsável individual',deleted:'agenda removida',task_id:'tarefa gerada',member_id:'pessoa', preferences:'preferências', media_type:'tipo do arquivo', folder_id:'pasta', owner_id:'autor', created_at:'data', id:'identificador', name:'nome', email:'e-mail', title:'título/função', role:'perfil', active:'acesso ativo', areas:'áreas', bio:'bio', senha:'senha', status:'status', assignee_ids:'responsáveis', position:'ordem', due_date:'prazo', checklist:'checklist', description:'descrição', milestones:'marcos', owner_ids:'responsáveis', open:'vagas abertas', max_assignees:'limite de vagas', read:'leitura', featured:'destaque', url:'endereço', short:'sigla', body:'texto', summary:'resumo', category:'categoria', source_id:'fonte' };
const dateTime = (date: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle:'short',timeStyle:'medium',timeZone:'America/Sao_Paulo' }).format(new Date(date));

export default function AuditPage() {
  const { can, loading } = useSession();
  if (loading) return <div className="page"><Skeleton h={300} /></div>;
  if (!can('auditoria.ver')) return <Navigate to="/" replace />;
  return <AuditList />;
}
function AuditList() {
  const [search,setSearch] = useState('');
  const [q,setQ] = useState('');
  const [action,setAction] = useState('');
  const [entity,setEntity] = useState('');
  const [outcome,setOutcome] = useState('');
  const [from,setFrom] = useState('');
  const [to,setTo] = useState('');
  const [page,setPage] = useState(1);
  useEffect(() => { const timer = window.setTimeout(() => { setQ(search); setPage(1); },300); return () => window.clearTimeout(timer); },[search]);
  const start = parseDateText(from), end = parseDateText(to);
  const rangeError = start.iso && end.iso && start.iso > end.iso ? 'A data inicial deve vir antes da data final.' : '';
  const params = new URLSearchParams({ q,action,entity,outcome,from:start.iso,to:end.iso,page:String(page) });
  if (!start.iso) params.delete('from');
  if (!end.iso) params.delete('to');
  const query = useQuery<AuditResult>(() => rangeError ? Promise.reject(new Error(rangeError)) : useApi() ? http.get(`/audit?${params}`) : Promise.resolve({ items:[],total:0,page,pageSize:50 }),[q,action,entity,outcome,start.iso,end.iso,rangeError,page]);
  const pages = Math.max(1,Math.ceil((query.data?.total ?? 0)/50));
  const change = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };
  return <div className="page">
    <div className="page-head"><div><h1>Auditoria</h1><p className="muted">Histórico de ações e tentativas de acesso. Horários de Brasília.</p></div><button className="btn" onClick={query.refetch} disabled={query.loading}><RefreshCw size={18} /> Atualizar</button></div>
    <section className="card audit-filters">
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome, e-mail, registro ou IP" />
      <div className="audit-filter-grid">
        <div className="field"><label htmlFor="audit-action">Ação</label><select id="audit-action" className="select" value={action} onChange={e => change(setAction,e.target.value)}><option value="">Todas as ações</option>{Object.entries(actions).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="audit-entity">Módulo</label><select id="audit-entity" className="select" value={entity} onChange={e => change(setEntity,e.target.value)}><option value="">Todos os módulos</option>{Object.entries(entities).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="audit-outcome">Resultado</label><select id="audit-outcome" className="select" value={outcome} onChange={e => change(setOutcome,e.target.value)}><option value="">Todos os resultados</option>{Object.entries(outcomes).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="audit-from">De</label><DateInput id="audit-from" value={from} onChange={value => change(setFrom,value)} aria-invalid={!!start.error} aria-describedby="audit-from-help" />{start.error && <small id="audit-from-help" className={from.length === 10 ? 'form-error' : 'muted'}>{start.error}</small>}</div>
        <div className="field"><label htmlFor="audit-to">Até</label><DateInput id="audit-to" value={to} onChange={value => change(setTo,value)} aria-invalid={!!end.error} aria-describedby="audit-to-help" />{end.error && <small id="audit-to-help" className={to.length === 10 ? 'form-error' : 'muted'}>{end.error}</small>}</div>
      </div>
      <button className="btn ghost sm" onClick={() => { setSearch('');setQ('');setAction('');setEntity('');setOutcome('');setFrom('');setTo('');setPage(1); }}>Limpar filtros</button>
    </section>
    {query.error ? <div className="notice form-error" role="alert">{query.error.message}</div> : query.loading ? <Skeleton h={360} /> : <>
      <p className="muted small audit-count">{query.data?.total ?? 0} registros encontrados · Os registros começam com esta atualização.</p>
      <div className="card">{!query.data?.items.length ? <EmptyState icon={<ShieldCheck />} title="Nenhum registro encontrado" description="Tente outros filtros ou faça uma ação e atualize a lista." /> : <div className="table-scroll"><table className="data-table audit-table"><thead><tr><th>Data e horário</th><th>Autor</th><th>Ação</th><th>Registro</th><th>IP</th><th>Resultado e detalhes</th></tr></thead><tbody>{query.data.items.map(item => <tr key={item.id}>
        <td className="audit-time">{dateTime(item.createdAt)}</td><td><b>{item.actorName}</b>{item.actorEmail && <small>{item.actorEmail}</small>}</td><td>{actions[item.action] ?? item.action}</td><td><b>{entities[item.entity] ?? item.entity}</b><small>{item.targetName || item.entityId || '—'}</small></td><td><code>{item.ip || '—'}</code></td><td><span className={`audit-outcome ${item.outcome}`}>{outcomes[item.outcome] ?? item.outcome}</span><details><summary>Ver detalhes</summary>{item.details.fields && <p>Campos: {item.details.fields.map(f => fieldNames[f] ?? f).join(', ')}.</p>}{item.details.passwordChanged && <p>Senha definida ou alterada.</p>}{item.details.route && <p>{item.details.method} {item.details.route} · HTTP {item.details.httpStatus}</p>}<small>Registro de auditoria #{item.id}</small></details></td>
      </tr>)}</tbody></table></div>}</div>
      <div className="row audit-pagination"><span className="muted small">Página {page} de {pages}</span><button className="btn" disabled={page <= 1} onClick={() => setPage(page-1)}><ChevronLeft size={18} /> Anterior</button><button className="btn" disabled={page >= pages} onClick={() => setPage(page+1)}>Próxima <ChevronRight size={18} /></button></div>
    </>}
  </div>;
}
