import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Filter, FolderOpen, HardDrive, ImagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Async, EmptyState, Modal, SearchInput, Skeleton } from '@/components/ui';
import { useConfirm } from '@/context/ConfirmContext';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@/hooks/useQuery';
import { resizeImage } from '@/lib/files';
import { normalizeUrl } from '@/components/shortcuts/ShortcutEditor';
import { driverService } from '@/services';
import { useApi } from '@/services/core';
import type { DriverField, DriverShortcut } from '@/types/models';

const text=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('pt-BR');
const matches=(value:string,query:string)=>text(value).includes(text(query.trim()));
const internal=(url:string)=>{try{const u=new URL(url,location.href);return u.origin===location.origin?u.pathname+u.search+u.hash:null;}catch{return null;}};
type Editor={kind:'field';item?:DriverField}|{kind:'shortcut';field:DriverField;item?:DriverShortcut};

export default function Driver(){
  const q=useQuery(()=>useApi()?driverService.list():Promise.resolve([]),[],15000);
  const {can}=useSession();const manage=can('configuracoes.integracoes');const confirm=useConfirm();const toast=useToast();
  const [search,setSearch]=useState('');const [selected,setSelected]=useState<string[]|null>(null);
  const [localSearch,setLocalSearch]=useState<Record<string,string>>({});const [editor,setEditor]=useState<Editor|null>(null);const [busy,setBusy]=useState('');
  const fields=q.data??[];const filterRef=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{
    if(!q.data)return;
    setSelected(current=>{
      if(current===null)return null;
      const ids=current.filter(id=>q.data!.some(field=>field.id===id));
      if(current.length&&ids.length===0)return null;
      return ids.length===current.length?current:ids;
    });
  },[q.data]);
  useEffect(()=>{
    const close=(e:PointerEvent)=>{if(!filterRef.current?.contains(e.target as Node)&&filterRef.current)filterRef.current.open=false;};
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&filterRef.current)filterRef.current.open=false;};
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};
  },[]);
  const selectedIds=selected??fields.map(field=>field.id);
  const all=fields.length>0&&selectedIds.length===fields.length;
  const toggle=(id:string)=>setSelected(current=>{const ids=current??fields.map(f=>f.id);const next=ids.includes(id)?ids.filter(value=>value!==id):[...ids,id];return next.length===fields.length?null:next;});
  const remove=async(field:DriverField,shortcut?:DriverShortcut)=>{
    const ok=await confirm({title:shortcut?'Excluir atalho?':'Excluir campo?',description:shortcut?`Excluir o atalho “${shortcut.name}”?`:`Excluir “${field.name}” e seus ${field.shortcuts.length} atalho(s)? O histórico das alterações será preservado nos Relatórios.`,confirmLabel:shortcut?'Excluir atalho':'Excluir campo'});
    if(!ok)return;setBusy(shortcut?.id??field.id);
    try{if(shortcut)await driverService.removeShortcut(shortcut.id);else await driverService.removeField(field.id);toast({tone:'success',title:shortcut?'Atalho excluído':'Campo excluído'});}
    catch(e){toast({tone:'error',title:'Não foi possível excluir',description:(e as Error).message});}finally{setBusy('');}
  };
  if(!useApi())return <div className="page"><EmptyState title="Driver disponível com a API" description="Conecte a API para salvar e compartilhar os campos e atalhos da equipe."/></div>;
  const visible=fields.filter(field=>selectedIds.includes(field.id)&&(!search.trim()||matches(`${field.name} ${field.description}`,search)||field.shortcuts.some(s=>matches(`${s.name} ${s.url}`,search))));
  return <div className="page driver-page">
    <div className="page-head"><div><h1><HardDrive/>Driver</h1><p className="muted">Organize links e materiais por campo.</p></div>{manage&&<button className="btn primary" onClick={()=>setEditor({kind:'field'})}><Plus/>Criar campo</button>}</div>
    <div className="driver-toolbar">
      <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Buscar campos e atalhos…"/>
      <details ref={filterRef} className="driver-filter"><summary className="btn"><Filter size={18}/>Campos <span className="badge outline">{all||selected===null?'Todos':selectedIds.length}</span></summary>
        <div className="driver-filter-options" role="group" aria-label="Filtrar por campos">
          <label className="check"><input type="checkbox" checked={all} ref={el=>{if(el)el.indeterminate=!all&&selectedIds.length>0;}} onChange={e=>setSelected(e.target.checked?null:[])}/>Todos os campos</label>
          {fields.length?fields.map(field=><label className="check" key={field.id}><input type="checkbox" checked={selectedIds.includes(field.id)} onChange={()=>toggle(field.id)}/><span>{field.name}</span></label>):<p className="small muted">Nenhum campo cadastrado.</p>}
        </div>
      </details>
      {(search||selected!==null)&&<button className="btn ghost" onClick={()=>{setSearch('');setSelected(null);}}>Limpar filtros</button>}
    </div>
    <Async q={q} loading={<Skeleton h={300}/>}>
      {()=>!visible.length?<div className="card"><EmptyState icon={<FolderOpen/>} title={fields.length?'Nenhum resultado neste filtro':'Crie seu primeiro campo'} description={fields.length?'Busque pelo nome ou descrição do campo, pelo nome do atalho ou pela URL.':manage?'Crie um campo e adicione os atalhos da equipe.':'Os campos e atalhos cadastrados pela administração aparecerão aqui.'}/></div>:<div className="driver-fields">
        {visible.map(field=>{
          const fieldMatches=!search.trim()||matches(`${field.name} ${field.description}`,search);
          const links=field.shortcuts.filter(s=>(fieldMatches||matches(`${s.name} ${s.url}`,search))&&matches(`${s.name} ${s.url}`,localSearch[field.id]??''));
          return <section className="card driver-field" key={field.id} aria-label={`Campo ${field.name}`}>
            <header className="driver-field-head"><DriverPicture image={field.image} name={field.name}/><div className="driver-field-info"><h2>{field.name}</h2>{field.description&&<p>{field.description}</p>}<span className="small muted">{links.length===field.shortcuts.length?`${links.length} atalho(s)`:`${links.length} de ${field.shortcuts.length} atalhos`}</span></div>
              {manage&&<div className="driver-actions"><button className="btn sm" onClick={()=>setEditor({kind:'shortcut',field})}><Plus size={16}/>Criar atalho</button><button className="icon-btn" aria-label={`Editar campo ${field.name}`} onClick={()=>setEditor({kind:'field',item:field})}><Pencil size={17}/></button><button className="icon-btn danger" disabled={busy===field.id} aria-label={`Excluir campo ${field.name}`} onClick={()=>void remove(field)}><Trash2 size={17}/></button></div>}
            </header>
            <div className="driver-local-search"><label className="search"><Search size={18}/><input className="input" aria-label={`Buscar atalhos em ${field.name}`} placeholder="Buscar atalhos neste campo…" value={localSearch[field.id]??''} onChange={e=>setLocalSearch(value=>({...value,[field.id]:e.target.value}))}/></label></div>
            {!links.length?<p className="driver-empty muted">{field.shortcuts.length?'Nenhum atalho corresponde à busca neste campo.':'Nenhum atalho neste campo ainda.'}</p>:<div className="driver-link-grid">{links.map(shortcut=>{
              const to=internal(shortcut.url);const content=<><DriverPicture image={shortcut.image} name={shortcut.name}/><span className="driver-link-info"><b>{shortcut.name}</b><small>{shortcut.url}</small></span><ExternalLink size={15}/></>;
              return <article className="driver-shortcut" key={shortcut.id}>{to?<Link className="driver-link" to={to} title={shortcut.url}>{content}</Link>:<a className="driver-link" href={shortcut.url} target="_blank" rel="noopener noreferrer" title={shortcut.url}>{content}</a>}
                {manage&&<div className="driver-link-actions"><button className="icon-btn" aria-label={`Editar atalho ${shortcut.name}`} onClick={()=>setEditor({kind:'shortcut',field,item:shortcut})}><Pencil size={15}/></button><button className="icon-btn danger" disabled={busy===shortcut.id} aria-label={`Excluir atalho ${shortcut.name}`} onClick={()=>void remove(field,shortcut)}><Trash2 size={15}/></button></div>}
              </article>;
            })}</div>}
          </section>;
        })}
      </div>}
    </Async>
    {editor&&<DriverEditor editor={editor} onClose={()=>setEditor(null)}/>}
  </div>;
}

function DriverPicture({image,name}:{image:string|null|undefined;name:string}){
  const [broken,setBroken]=useState(false);useEffect(()=>setBroken(false),[image]);
  return <span className="driver-picture">{image&&!broken?<img src={image} alt={name} onError={()=>setBroken(true)}/>:<FolderOpen size={24}/>}</span>;
}

function DriverEditor({editor,onClose}:{editor:Editor;onClose:()=>void}){
  const isField=editor.kind==='field',item=editor.item;const toast=useToast();
  const [name,setName]=useState(item?.name??'');const [description,setDescription]=useState(isField?editor.item?.description??'':'');
  const [url,setUrl]=useState(editor.kind==='shortcut'?editor.item?.url??'':'');
  const [image,setImage]=useState<string|undefined>();const [preparing,setPreparing]=useState(false);const [saving,setSaving]=useState(false);const [error,setError]=useState('');
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();if(saving||preparing)return;setError('');
    if(name.trim().length<2)return setError('Informe um nome com pelo menos 2 caracteres.');
    const normalized=isField?'':normalizeUrl(url);if(!isField&&!normalized)return setError('Informe uma URL válida, como https://exemplo.com.');
    setSaving(true);
    try{
      if(isField){const data={name:name.trim(),description:description.trim(),...(image!==undefined?{image}:{})};if(editor.item)await driverService.updateField(editor.item.id,data);else await driverService.createField(data);}
      else{const data={name:name.trim(),url:normalized!,...(image!==undefined?{image}:{})};if(editor.item)await driverService.updateShortcut(editor.item.id,data);else await driverService.createShortcut(editor.field.id,data);}
      toast({tone:'success',title:isField?(item?'Campo atualizado':'Campo criado'):(item?'Atalho atualizado':'Atalho criado'),description:name.trim()});onClose();
    }catch(e){setError((e as Error).message);}finally{setSaving(false);}
  };
  const kind=isField?'campo':'atalho';
  return <Modal open onClose={()=>!saving&&onClose()} width={600} title={`${item?'Editar':'Criar'} ${kind}`} subtitle={isField?'Nome, imagem e descrição para organizar os atalhos.':`Campo: ${editor.kind==='shortcut'?editor.field.name:''}`} error={error}
    footer={<><button className="btn" disabled={saving} onClick={onClose}>Cancelar</button><button className="btn primary" disabled={saving||preparing} type="submit" form="driver-editor">{saving?'Salvando…':`Salvar ${kind}`}</button></>}>
    <form id="driver-editor" className="form-grid" onSubmit={save} noValidate>
      <div className="field full"><label htmlFor="driver-name">Nome *</label><input autoFocus id="driver-name" className="input" maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></div>
      {isField?<div className="field full"><label htmlFor="driver-description">Descrição</label><textarea id="driver-description" className="textarea" rows={4} maxLength={4000} value={description} onChange={e=>setDescription(e.target.value)}/></div>:<div className="field full"><label htmlFor="driver-url">URL *</label><input id="driver-url" className="input" inputMode="url" maxLength={2048} placeholder="https://…" value={url} onChange={e=>setUrl(e.target.value)}/></div>}
      <div className="field full"><span className="label">Foto</span><DriverImage value={image===undefined?item?.image:image} onChange={setImage} onBusy={setPreparing} onError={setError} disabled={saving}/></div>
    </form>
  </Modal>;
}

function DriverImage({value,onChange,onBusy,onError,disabled}:{value:string|null|undefined;onChange:(image:string)=>void;onBusy:(busy:boolean)=>void;onError:(message:string)=>void;disabled:boolean}){
  const input=useRef<HTMLInputElement>(null),busy=useRef(false);const [dragging,setDragging]=useState(false);
  const pick=useCallback(async(file?:File)=>{
    if(!file||busy.current||disabled)return;busy.current=true;onBusy(true);onError('');
    try{onChange(await resizeImage(file,320,250*1024));}catch(e){onError((e as Error).message);}finally{busy.current=false;onBusy(false);if(input.current)input.current.value='';}
  },[onChange,onBusy,onError,disabled]);
  useEffect(()=>{
    const files=(e:DragEvent)=>e.dataTransfer?.types.includes('Files');
    const over=(e:DragEvent)=>{if(files(e)){e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect=disabled||busy.current?'none':'copy';}};
    const enter=(e:DragEvent)=>{if(files(e)&&!disabled)setDragging(true);};
    const leave=(e:DragEvent)=>{if(files(e)&&!e.relatedTarget)setDragging(false);};
    const drop=(e:DragEvent)=>{if(!files(e))return;e.preventDefault();setDragging(false);if(disabled||busy.current)return;const list=e.dataTransfer?.files;if(list?.length!==1)return onError('Arraste uma imagem por vez.');void pick(list[0]);};
    window.addEventListener('dragover',over,true);window.addEventListener('dragenter',enter,true);window.addEventListener('dragleave',leave,true);window.addEventListener('drop',drop,true);
    return()=>{window.removeEventListener('dragover',over,true);window.removeEventListener('dragenter',enter,true);window.removeEventListener('dragleave',leave,true);window.removeEventListener('drop',drop,true);};
  },[pick,disabled,onError]);
  return <div className={`driver-image-editor ${dragging?'dragging':''}`}>
    <DriverPicture image={value} name="Prévia da imagem"/>
    <div><button type="button" className="btn sm" disabled={disabled||busy.current} onClick={()=>input.current?.click()}><ImagePlus size={17}/>{value?'Trocar imagem':'Enviar imagem'}</button>{value&&<button type="button" className="btn ghost sm" disabled={disabled||busy.current} onClick={()=>onChange('')}><X size={16}/>Remover imagem</button>}
      <p className="small muted" role="status">{dragging?'Solte a imagem para carregar.':busy.current?'Preparando imagem…':'Arraste uma imagem ou escolha PNG, JPG ou WEBP.'}</p></div>
    <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={e=>void pick(e.target.files?.[0])}/>
  </div>;
}
