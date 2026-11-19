import { useEffect, useState } from 'react';
import { Clock, Play, RefreshCw, Save } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { http, useApi } from '@/services/core';
import { useToast } from '@/context/ToastContext';
import { Skeleton } from '@/components/ui';

interface RadarConfig { enabled:boolean;intervalMinutes:number;lookbackHours:number;maxItems:number;criteria:string;autoPublish:boolean;fetchImages:boolean;nextRunAt?:string }
interface RadarRun {id:string;startedAt:string;finishedAt:string|null;status:'running'|'success'|'partial'|'failed';imported:number;skipped:number;message:string}
interface RadarState {config:RadarConfig;keyConfigured:boolean;model:string;runs:RadarRun[]}
const date=(value?:string|null)=>value ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value)):'—';
const statusLabel={running:'Pesquisando',success:'Concluída',partial:'Concluída parcialmente',failed:'Falhou'};

export function RadarSettings({disabled}:{disabled:boolean}) {
  if(disabled) return null;
  if(!useApi())return <section className="card settings-section"><h2>Coleta automática</h2><p>Disponível ao conectar o portal à API real.</p></section>;
  return <Collector />;
}
function Collector() {
  const q=useQuery<RadarState>(()=>http.get('/settings/radar'));
  const [draft,setDraft]=useState<RadarConfig|null>(null);
  const [saving,setSaving]=useState(false),[starting,setStarting]=useState(false),[error,setError]=useState('');
  const toast=useToast();
  useEffect(()=>{if(q.data && !draft)setDraft(q.data.config);},[q.data,draft]);
  const lastFailure=q.data?.runs[0]?.status==='failed'?q.data.runs[0]:null;
  const running=q.data?.runs.some(run=>run.status==='running');
  useEffect(()=>{if(!running)return;const timer=window.setInterval(q.refetch,5000);return ()=>window.clearInterval(timer);},[running]);
  const dirty=!!draft && JSON.stringify({...draft,nextRunAt:undefined})!==JSON.stringify({...q.data?.config,nextRunAt:undefined});
  const save=async()=>{
    if(!draft)return;setSaving(true);setError('');
    try {const {nextRunAt:_next,...config}=draft;const state=await http.request<RadarState>('/settings/radar',{method:'PUT',body:JSON.stringify(config)});setDraft(state.config);toast({tone:'success',title:'Agendamento salvo'});}
    catch(e){setError((e as Error).message);}finally{setSaving(false);}
  };
  const collect=async()=>{
    setStarting(true);setError('');
    try{await http.post('/settings/radar/collect',{});q.refetch();toast({tone:'info',title:'Pesquisa iniciada',description:'Acompanhe o resultado no histórico de coletas.'});}
    catch(e){setError((e as Error).message);}finally{setStarting(false);}
  };
  return <section className="card settings-section radar-collector">
    <div className="section-head"><div><h2>Coleta automática de notícias</h2><p>Pesquisa nas fontes ativas, seleciona novidades pelos seus critérios e salva texto, referências e imagens disponíveis.</p></div><button className="btn" onClick={q.refetch} disabled={q.loading} aria-label="Atualizar estado da coleta"><RefreshCw /></button></div>
    {q.error && <p className="form-error" role="alert">{q.error.message}</p>}
    {!draft || !q.data ? <Skeleton h={180} /> : <>
      {lastFailure && <div className="notice warn radar-last-failure" role="alert"><div><b>A última coleta falhou; nenhuma notícia foi gerada nesta tentativa.</b><p>{lastFailure.message}</p><p className="small">Depois de corrigir a causa indicada, clique em “Buscar notícias agora” para validar. Apenas cadastrar a chave ou publicar o portal não confirma acesso à API de notícias.</p></div></div>}
      <div className={`notice ${q.data.keyConfigured ? '' : 'warn'}`}><div><b>{q.data.keyConfigured ? 'Chave da OpenAI configurada' : 'Chave da OpenAI pendente'}</b><p className="small">{q.data.keyConfigured ? `Modelo: ${q.data.model}. Execute uma pesquisa e confira o histórico para validar o acesso. As pesquisas consomem o saldo/créditos disponíveis na API da OpenAI.` : 'Configure OPENAI_API_KEY nas variáveis do serviço api no Railway e aplique o deploy. Não cole a chave aqui.'}</p></div></div>
      <p className="small muted" style={{marginTop:10}}>A chave configurada não confirma saldo ou acesso ao modelo. Consulte <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noreferrer">saldo e faturamento da API</a> e <a href="https://platform.openai.com/settings/organization/limits" target="_blank" rel="noreferrer">limites da API</a>. Os percentuais de uso do ChatGPT são de outro painel.</p>
      <div className="form-grid" style={{marginTop:18}}>
        <label className="check full"><input type="checkbox" className="switch" checked={draft.enabled} disabled={saving || (!q.data.keyConfigured && !draft.enabled)} onChange={e=>setDraft({...draft,enabled:e.target.checked})} /><span>Ativar pesquisa agendada</span></label>
        <div className="field"><label htmlFor="radar-interval">Pesquisar a cada</label><select id="radar-interval" className="select" value={draft.intervalMinutes} onChange={e=>setDraft({...draft,intervalMinutes:Number(e.target.value)})}>{[[15,'15 minutos'],[30,'30 minutos'],[60,'1 hora'],[180,'3 horas'],[360,'6 horas'],[720,'12 horas'],[1440,'24 horas']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
        <div className="field"><label htmlFor="radar-lookback">Buscar publicações das últimas</label><select id="radar-lookback" className="select" value={draft.lookbackHours} onChange={e=>setDraft({...draft,lookbackHours:Number(e.target.value)})}>{[6,12,24,48,72,168].map(value=><option key={value} value={value}>{value} horas</option>)}</select></div>
        <div className="field"><label htmlFor="radar-max">Máximo de notícias por coleta</label><input id="radar-max" className="input" type="number" min={1} max={10} value={draft.maxItems} onChange={e=>setDraft({...draft,maxItems:Number(e.target.value)})} /><small className="muted">Pode retornar menos ou nenhuma notícia se não houver novidades relevantes.</small></div>
        <div className="field"><label htmlFor="radar-publish">Ao encontrar notícias</label><select id="radar-publish" className="select" value={String(draft.autoPublish)} onChange={e=>setDraft({...draft,autoPublish:e.target.value==='true'})}><option value="true">Publicar direto no Radar</option><option value="false">Enviar para aprovação dos administradores</option></select></div>
        <div className="field full"><label htmlFor="radar-criteria">Critérios de seleção</label><textarea id="radar-criteria" className="textarea" rows={4} minLength={10} maxLength={4000} value={draft.criteria} onChange={e=>setDraft({...draft,criteria:e.target.value})} /><small className="muted">Defina os assuntos, fabricantes, impacto e público desejados. As URLs das fontes ativas abaixo delimitam os sites pesquisados.</small></div>
        <label className="check full"><input type="checkbox" checked={draft.fetchImages} onChange={e=>setDraft({...draft,fetchImages:e.target.checked})} /><span>Buscar imagem da matéria; se indisponível, procurar ilustração licenciada no Wikimedia Commons</span></label>
      </div>
      <p className="muted small" style={{marginTop:12}}>As imagens ficam salvas no portal com os créditos. Sem imagem acessível, a notícia mantém uma capa por categoria. A coleta evita URLs e títulos repetidos.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="actions" style={{marginTop:18}}><button className="btn primary" onClick={save} disabled={saving || !dirty}>{saving?<span className="spinner"/>:<Save/>} Salvar agendamento</button><button className="btn" onClick={collect} disabled={starting || running || !q.data.keyConfigured || dirty}>{running?<span className="spinner"/>:<Play/>} {running?'Pesquisa em andamento':'Buscar notícias agora'}</button></div>
      {dirty && <p className="muted small">Salve o agendamento antes de executar. As fontes têm o botão “Salvar alterações” no topo da página.</p>}
      <p className="small muted" style={{marginTop:16}}><Clock size={14}/> {q.data.config.enabled ? `Próxima verificação: ${date(q.data.config.nextRunAt)} (Brasília). A execução pode começar até um minuto depois.` : 'Pesquisa agendada pausada. A pesquisa manual continua disponível.'}</p>
      <h3 style={{marginTop:22}}>Histórico de coletas</h3>
      {!q.data.runs.length ? <p className="muted small">Nenhuma coleta executada.</p> : <div className="table-scroll"><table className="data-table mobile-records"><thead><tr><th>Início · Brasília</th><th>Estado</th><th>Novas</th><th>Resultado</th></tr></thead><tbody>{q.data.runs.map(run=><tr key={run.id}><td data-label="Início · Brasília">{date(run.startedAt)}</td><td data-label="Estado">{statusLabel[run.status]}</td><td data-label="Novas notícias">{run.imported}</td><td data-label="Resultado" className={run.status==='failed'?'form-error':''}>{run.message || 'Pesquisando fontes e preparando notícias. Pode levar alguns minutos.'}</td></tr>)}</tbody></table></div>}
    </>}
  </section>;
}
