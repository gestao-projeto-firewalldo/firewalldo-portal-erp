/* Web Push only. Authenticated pages and API responses are never cached. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
function account(value,write=false){return new Promise((resolve,reject)=>{
 const request=indexedDB.open('firewalldo-push',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('state');
 request.onerror=()=>reject(request.error);
 request.onsuccess=()=>{const db=request.result;const tx=db.transaction('state',write?'readwrite':'readonly');const store=tx.objectStore('state');const op=write?store.put(value,'account'):store.get('account');let result;op.onsuccess=()=>result=op.result;tx.oncomplete=()=>{db.close();resolve(result);};tx.onerror=()=>{db.close();reject(tx.error);};};
});}
self.addEventListener('message',event=>{
 if(event.data?.type==='SET_ACCOUNT')event.waitUntil(account(event.data.id || null,true).then(async()=>{if(!event.data.id){try{const notifications=await self.registration.getNotifications();notifications.forEach(n=>n.close());}catch{}}event.ports?.[0]?.postMessage({ok:true});}));
});
self.addEventListener('push',event=>event.waitUntil((async()=>{
 if(!event.data)return;let payload;try{payload=event.data.json();}catch{return;}
 const current=await account();if(!current || payload.accountId!==current)return;
 let url='/';try{const target=new URL(payload.url || '/',self.location.origin);if(target.origin===self.location.origin)url=target.pathname+target.search;}catch{}
 await self.registration.showNotification(String(payload.title || 'Firewalldo').slice(0,100),{
  body:String(payload.body || 'Há uma atualização no portal.').slice(0,180),icon:'/icons/icon-192.png',badge:'/icons/badge.png',
  tag:'firewalldo-'+String(payload.tag || 'update'),data:{url,accountId:current},renotify:false
 });
})()));
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{
 const current=await account();const destination=current===event.notification.data?.accountId?event.notification.data.url:'/';
 const url=new URL(destination || '/',self.location.origin);if(url.origin!==self.location.origin)return;
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 for(const client of windows)if(new URL(client.url).origin===url.origin){await client.navigate(url.href);return client.focus();}
 return self.clients.openWindow(url.href);
})());});
