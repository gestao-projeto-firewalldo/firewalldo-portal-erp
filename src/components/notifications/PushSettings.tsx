import { useEffect, useState } from 'react';
import { BellRing, Send } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { http, useApi } from '@/services/core';
import { currentDeviceId, subscribeDevice, supportsPush, unsubscribeLocal, bindPushAccount } from '@/services/push';
import { useSession } from '@/context/SessionContext';

interface State {publicKey:string;devices:{id:string;device:string;createdAt:string}[];deliveries:{id:string;title:string;status:string;message:string;createdAt:string}[]}
const labels:Record<string,string>={queued:'Aguardando envio',sending:'Enviando',accepted:'Aceito pelo provedor',failed:'Falhou',expired:'Expirou / desativado'};
export function PushSettings(){return useApi()?<Controls/>:null;}
function Controls(){
 const q=useQuery<State>(()=>http.get('/push'));
 const {me}=useSession();const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const supported=supportsPush();const current=currentDeviceId();const active=!!q.data?.devices.some(d=>d.id===current);
 const [local,setLocal]=useState(false);
 useEffect(()=>{if(!supported)return;void navigator.serviceWorker.getRegistration('/').then(r=>r?.pushManager.getSubscription()).then(s=>setLocal(!!s));},[q.data,supported]);
 const waiting=q.data?.deliveries.some(d=>d.status==='queued'||d.status==='sending');
 useEffect(()=>{if(!waiting)return;const timer=window.setInterval(q.refetch,5000);return()=>window.clearInterval(timer);},[waiting]);
 const enable=async()=>{setBusy(true);setError('');setNotice('');try{await subscribeDevice(q.data!.publicKey);await bindPushAccount(me!.id);setLocal(true);q.refetch();setNotice('Aparelho inscrito. Envie um teste e confira a notificação na tela.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const remove=async(id:string)=>{setBusy(true);setError('');try{await http.del(`/push/subscriptions/${id}`);if(id===current){await unsubscribeLocal();setLocal(false);}q.refetch();setNotice('Notificações desativadas para esse aparelho.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const test=async()=>{setBusy(true);setError('');try{await http.post('/push/test',{});q.refetch();setNotice('Teste colocado na fila. O envio é verificado a cada 15 segundos; confirme o alerta no aparelho.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 return <section className="card settings-section push-settings"><div className="section-head"><div><h2><BellRing size={22}/> Notificações no celular e computador</h2><p>Ative em cada aparelho para receber alertas mesmo com o portal fechado ou a tela bloqueada.</p></div></div>
  {!supported && <div className="notice warn">Push indisponível neste modo. No iPhone/iPad (iOS 16.4 ou posterior), use Compartilhar → Adicionar à Tela de Início, abra pelo ícone e volte aqui. No Android/PC, use um navegador compatível e o endereço HTTPS do portal.</div>}
  {supported && Notification.permission==='denied' && <p className="form-error">As notificações estão bloqueadas pelo navegador. Libere a permissão nas configurações do site/aparelho e recarregue.</p>}
  <p className="small muted">Recebe atribuições de tarefas, novas vagas no Backlog, prazos, atualizações de projetos e resumos de notícias conforme suas preferências abaixo. Celular totalmente desligado ou sem internet recebe somente ao reconectar, dentro do prazo de envio. O modo Não Perturbe e restrições de bateria podem adiar a exibição.</p>
  {q.error && <p role="alert" className="form-error">{q.error.message}</p>}{error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
  <div className="actions" style={{margin:'16px 0'}}>{active && local ? <button className="btn" disabled={busy} onClick={()=>remove(current!)}>Desativar neste aparelho</button> : <button className="btn primary" disabled={busy || !supported || !q.data} onClick={enable}><BellRing/> Ativar neste aparelho</button>}<button className="btn" disabled={busy || !active || !local} onClick={test}><Send/> Enviar teste</button></div>
  <p className="small muted">{active && local?'Este aparelho está inscrito.':'Este aparelho ainda não está inscrito.'} Sair da conta desativa o push neste aparelho.</p>
  {!!q.data?.devices.length && <><h3 style={{marginTop:20}}>Aparelhos desta conta</h3>{q.data.devices.map(d=><div key={d.id} className="pref-row"><span className="grow">{d.device}{d.id===current?' · este aparelho':''}</span><button className="btn sm" disabled={busy} onClick={()=>remove(d.id)}>Remover aparelho</button></div>)}</>}
  {!!q.data?.deliveries.length && <><h3 style={{marginTop:20}}>Últimas tentativas de envio</h3><p className="muted small">Aceito pelo provedor confirma o envio; confira a exibição no celular/computador.</p><div className="table-scroll"><table className="data-table mobile-records"><thead><tr><th>Notificação</th><th>Estado</th><th>Detalhe</th></tr></thead><tbody>{q.data.deliveries.map(d=><tr key={d.id}><td data-label="Notificação">{d.title}</td><td data-label="Estado">{labels[d.status] ?? d.status}</td><td data-label="Detalhe">{d.message}</td></tr>)}</tbody></table></div></>}
 </section>;
}
