import { http, useApi } from './core';
const deviceKey='firewalldo:push-device';
export const supportsPush=()=>isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const deviceId=()=>{let id=localStorage.getItem(deviceKey);if(!id){id=crypto.randomUUID();localStorage.setItem(deviceKey,id);}return id;};
export const currentDeviceId=()=>{try{return localStorage.getItem(deviceKey);}catch{return null;}};
export async function worker(){await navigator.serviceWorker.register('/sw.js',{scope:'/'});return navigator.serviceWorker.ready;}
export async function bindPushAccount(id:string|null){
 if(!useApi() || !isSecureContext || !('serviceWorker' in navigator))return;
 const registration=await worker();
 await new Promise<void>((resolve,reject)=>{const channel=new MessageChannel();const timer=window.setTimeout(()=>{channel.port1.close();reject(new Error('O serviço de notificações não respondeu. Recarregue o portal.'));},3000);channel.port1.onmessage=()=>{window.clearTimeout(timer);channel.port1.close();resolve();};registration.active?.postMessage({type:'SET_ACCOUNT',id},[channel.port2]);});
}
export async function subscribeDevice(publicKey:string){
 if(!supportsPush())throw new Error('Este navegador não oferece push neste modo. No iPhone, adicione o portal à Tela de Início e abra pelo ícone.');
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw new Error('Permita notificações nas configurações deste navegador/aparelho para continuar.');
 const registration=await worker();
 const raw=atob(publicKey.replace(/-/g,'+').replace(/_/g,'/'));
 const key=Uint8Array.from(raw,c=>c.charCodeAt(0));
 const subscription=await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
 try {
  await http.post('/push/subscriptions',{...subscription.toJSON(),expirationTime:undefined,id:deviceId(),device:deviceName()});
 }catch(error){await subscription.unsubscribe();localStorage.removeItem(deviceKey);throw error;}
}
export async function unsubscribeLocal(){
 if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration('/');await (await registration?.pushManager?.getSubscription())?.unsubscribe();}
 localStorage.removeItem(deviceKey);
}
function deviceName(){const agent=navigator.userAgent;const os=/iPad|iPhone|iPod/.test(agent)?'iPhone / iPad':/Android/.test(agent)?'Android':/Windows/.test(agent)?'Computador Windows':/Mac/.test(agent)?'Mac':'Navegador';return `${os} · ${/Edg\//.test(agent)?'Edge':/Firefox\//.test(agent)?'Firefox':/Chrome\//.test(agent)?'Chrome':'Safari / navegador'}`;}
export async function reconcilePush(id:string){
 await bindPushAccount(id);
 if(!supportsPush() || Notification.permission!=='granted')return;
 const registration=await navigator.serviceWorker.getRegistration('/');const subscription=await registration?.pushManager.getSubscription();
 if(!subscription || !currentDeviceId())return;
 try{await http.post('/push/subscriptions',{...subscription.toJSON(),expirationTime:undefined,id:deviceId(),device:deviceName()});}
 catch {await unsubscribeLocal();}
}
