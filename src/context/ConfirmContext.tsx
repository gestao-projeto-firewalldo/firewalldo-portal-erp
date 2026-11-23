import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui';

type Confirmation = {title:string;description:ReactNode;confirmLabel?:string;danger?:boolean};
const Context=createContext<(options:Confirmation)=>Promise<boolean>>(()=>Promise.resolve(false));
export const useConfirm=()=>useContext(Context);

/** One consistent, keyboard accessible confirmation; cancel is the initial focus. */
export function ConfirmProvider({children}:{children:ReactNode}) {
  const [options,setOptions]=useState<Confirmation|null>(null);
  const pending=useRef<((value:boolean)=>void)|null>(null);
  const cancelRef=useRef<HTMLButtonElement>(null);
  const finish=(value:boolean)=>{const resolve=pending.current;pending.current=null;setOptions(null);resolve?.(value);};
  useEffect(()=>{if(options)cancelRef.current?.focus();},[options]);
  useEffect(()=>()=>{pending.current?.(false);},[]);
  const ask=(next:Confirmation)=>{pending.current?.(false);setOptions(next);return new Promise<boolean>(resolve=>{pending.current=resolve;});};
  return <Context.Provider value={ask}>{children}{options&&<Modal open onClose={()=>finish(false)} title={options.title} width={470} icon={<span className="icon-tile"><AlertTriangle/></span>} footer={<><button ref={cancelRef} className="btn" onClick={()=>finish(false)}>Cancelar</button><button className={`btn ${options.danger===false?'primary':'danger'}`} onClick={()=>finish(true)}>{options.danger===false?<AlertTriangle size={17}/>:<Trash2 size={17}/>} {options.confirmLabel??'Excluir'}</button></>}><p className="confirm-description">{options.description}</p></Modal>}</Context.Provider>;
}
