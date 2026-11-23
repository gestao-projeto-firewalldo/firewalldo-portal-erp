import { TaskWorkflow } from '@/components/tasks/TaskWorkflow';
import { useConfirm } from '@/context/ConfirmContext';
import { createContext, useCallback, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { CalendarDays, CheckSquare, Hand, ListChecks, Plus, Save, Trash2, X } from 'lucide-react';
import { Avatar, CategoryBadge, Modal, PriorityBadge, Progress } from '@/components/ui';
import { FormDateInput } from '@/components/ui/DateInput';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { categoryLabel, cx, priorityLabel, shortDate, statusLabel, statusOrder, ticketLabel } from '@/lib/labels';
import { tasksService } from '@/services';
import { uid } from '@/services/core';
import type { Category, ChecklistItem, Priority, Task, TaskInput } from '@/types/models';

type OpenArgs = { task?: Task; prefill?: Partial<TaskInput> };
const Ctx = createContext<(a?: OpenArgs) => void>(() => {});
export const useTaskEditor = () => useContext(Ctx);

const blank: TaskInput = {
  title: '',
  description: '',
  projectId: null,
  category: 'programacao',
  status: 'a_fazer',
  priority: 'media',
  assigneeIds: [],
  open: false,
  maxAssignees: 3,
  dueDate: null,
  checklist: [],
};

export function TaskEditorProvider({ children }: { children: ReactNode }) {
  const [args, setArgs] = useState<OpenArgs | null>(null);
  const open = useCallback((a: OpenArgs = {}) => setArgs(a), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {args && <TaskModal args={args} onClose={() => setArgs(null)} />}
    </Ctx.Provider>
  );
}

export function checklistProgress(t: Pick<Task, 'checklist' | 'status'>) {
  if (!t.checklist.length) return t.status === 'concluido' ? 100 : null;
  return Math.round((t.checklist.filter((c) => c.done).length / t.checklist.length) * 100);
}

function editableTask(task?: Task): TaskInput {
  if (!task) return blank;
  const { id, createdBy, createdAt, updatedAt, order, scheduleId, scheduledFor, ticketNumber, ...input } = task;
  return input;
}

function TaskModal({ args, onClose }: { args: OpenArgs; onClose: () => void }) {
  const { me, members, membersById, projects, can } = useSession();
  const toast = useToast();
  const confirm = useConfirm();
  const existing = args.task;
  const canEditAll = can('tarefas.editar_todas');
  const canCreate = can('tarefas.criar');
  const isAssignee = !!existing && !!me && existing.assigneeIds.includes(me.id);
  const editable = existing ? canEditAll : canCreate;

  const [form, setForm] = useState<TaskInput>(() => ({ ...blank, ...editableTask(existing), ...(args.prefill ?? {}), ...(!existing && args.prefill?.projectId && !args.prefill.category && projects.find(p=>p.id===args.prefill?.projectId)?.category ? {category:projects.find(p=>p.id===args.prefill?.projectId)!.category!} : {}) }));
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm({ ...blank, ...editableTask(existing), ...(args.prefill ?? {}), ...(!existing && args.prefill?.projectId && !args.prefill.category && projects.find(p=>p.id===args.prefill?.projectId)?.category ? {category:projects.find(p=>p.id===args.prefill?.projectId)!.category!} : {}) });
  }, [existing, args.prefill]);

  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleAssignee = (id: string) =>
    !existing?.scheduleId && set('assigneeIds', form.assigneeIds.includes(id) ? form.assigneeIds.filter((x) => x !== id) : [...form.assigneeIds, id]);

  const toggleItem = async (item: ChecklistItem) => {
    const next = form.checklist.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c));
    set('checklist', next);
    if (existing && !editable && isAssignee) { try { await tasksService.setChecklist(existing.id, next); } catch(error) { set('checklist',form.checklist);toast({tone:'error',title:'Não foi possível salvar o checklist',description:(error as Error).message}); } }
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    set('checklist', [...form.checklist, { id: uid('c'), text: newItem.trim(), done: false }]);
    setNewItem('');
  };

  const save = async () => {
    const date=document.getElementById('t-due') as HTMLInputElement|null;
    if(date && !date.checkValidity()){date.reportValidity();setErrors({dueDate:date.validationMessage});return;}
    const e: Record<string, string> = {};
    if (form.title.trim().length < 3) e.title = 'Informe um título com pelo menos 3 caracteres.';
    if (!form.open && form.assigneeIds.length === 0 && form.status !== 'backlog')
      e.assignees = 'Atribua um responsável ou marque como tarefa aberta.';
    if (form.assigneeIds.length > form.maxAssignees)
      e.assignees = `Há ${form.assigneeIds.length} responsáveis para ${form.maxAssignees} vaga(s). Aumente o limite.`;
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      if (existing) {
        const { status, ...metadata } = form;
        await tasksService.update(existing.id, metadata);
        toast({ tone: 'success', title: 'Tarefa atualizada', description: form.title });
      } else {
        await tasksService.create(form);
        toast({ tone: 'success', title: 'Tarefa criada', description: `${form.title} · ${statusLabel[form.status]}` });
      }
      onClose();
    } catch (err) {
      toast({ tone: 'error', title: 'Não foi possível salvar', description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing || !await confirm({title:'Excluir tarefa?', description:`Tem certeza que deseja excluir “${existing.title}”?`, confirmLabel:'Excluir tarefa'})) return;
    try {await tasksService.remove(existing.id);toast({ tone:'info',title:'Tarefa excluída' });onClose();}
    catch(error) {toast({tone:'error',title:'Não foi possível excluir',description:(error as Error).message});}
  };

  const accept = async () => {
    if (!existing) return;
    try {await tasksService.accept(existing.id);toast({tone:'success',title:'Você aceitou a tarefa',description:existing.title});onClose();}
    catch(error) {toast({tone:'error',title:'Não foi possível aceitar',description:(error as Error).message});}
  };

  const progress = checklistProgress(form);

  /* ---------- Somente leitura (colaborador / sem permissão) ---------- */
  if (existing && !editable) {
    return (
      <Modal
        open
        onClose={onClose}
        width={680}
        title={<>{ticketLabel(existing)&&<span className="task-ticket">{ticketLabel(existing)}</span>} {existing.title}</>}
        subtitle={existing.projectId ? projects.find((p) => p.id === existing.projectId)?.name : 'Sem projeto'}
        icon={<span className="icon-tile"><ListChecks /></span>}
        footer={
          <>
            {existing.status === 'backlog' && existing.open && !isAssignee && existing.assigneeIds.length < existing.maxAssignees && (
              <button className="btn primary" onClick={accept}>
                <Hand /> Aceitar tarefa
              </button>
            )}
            <button className="btn" onClick={onClose}>Fechar</button>
          </>
        }
      >
        <div className="row" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
          <span className="badge outline">{statusLabel[form.status]}</span>
          <PriorityBadge p={existing.priority} />
          <CategoryBadge c={existing.category} />
          {existing.open && <span className="badge soft" style={{ '--c': 'var(--success)' } as CSSProperties}>Aberta para aceitar</span>}
          {existing.dueDate && (
            <span className="badge outline"><CalendarDays /> {shortDate(existing.dueDate)}</span>
          )}
        </div>
        <TaskWorkflow task={{...existing, status:form.status}} onMoved={status => set('status', status)} />
        <p className="muted" style={{ marginBottom: 16 }}>{existing.description || 'Sem descrição.'}</p>
        <div className="label" style={{ marginBottom: 8 }}>Responsáveis</div>
        <div className="row" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          {existing.assigneeIds.length === 0 && <span className="muted small">Ninguém ainda.</span>}
          {existing.assigneeIds.map((id) => membersById[id] && (
            <span key={id} className="row small"><Avatar member={membersById[id]} size={26} /> {membersById[id].name}</span>
          ))}
        </div>
        {form.checklist.length > 0 && (
          <>
            <div className="row" style={{ marginBottom: 8 }}>
              <span className="label">Checklist</span>
              <span className="muted small" style={{ marginLeft: 'auto' }}>{progress}%</span>
            </div>
            <Progress value={progress ?? 0} small color="var(--success)" />
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {form.checklist.map((c) => (
                <label key={c.id} className="check">
                  <input type="checkbox" checked={c.done} disabled={!isAssignee} onChange={() => toggleItem(c)} />
                  <span style={{ textDecoration: c.done ? 'line-through' : undefined, opacity: c.done ? 0.65 : 1 }}>{c.text}</span>
                </label>
              ))}
            </div>
            {!isAssignee && <p className="muted small" style={{ marginTop: 10 }}>Apenas responsáveis podem marcar itens.</p>}
          </>
        )}
      </Modal>
    );
  }

  /* ---------- Criar / editar ---------- */
  return (
    <Modal
      open
      onClose={onClose}
      width={760}
      title={existing ? <>{ticketLabel(existing)&&<span className="task-ticket">{ticketLabel(existing)}</span>} Editar tarefa</> : 'Nova tarefa'}
      error={Object.values(errors).join(' ')}
      subtitle={existing ? `Criada em ${shortDate(existing.createdAt)} · atualizada em ${shortDate(existing.updatedAt)}` : undefined}
      icon={<span className="icon-tile"><CheckSquare /></span>}
      footer={
        <>
          {existing && (
            <button className="btn danger" onClick={remove} style={{ marginRight: 'auto' }}>
              <Trash2 /> Excluir
            </button>
          )}
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : <Save />} {existing ? 'Salvar' : 'Criar tarefa'}
          </button>
        </>
      }
    >
      {!canCreate && !existing ? (
        <div className="notice warn">
          <Hand />
          <div>Somente administradores criam tarefas (dentro de um projeto). Como usuário, aceite as vagas no Backlog.</div>
        </div>
      ) : (
        <div className="form-grid">
          {existing?.scheduleId && <div className="notice full">Tarefa individual da Agenda. As alterações aqui valem só para esta ocorrência. Para mudar as próximas, edite a Agenda.</div>}
          <div className="field full">
            <label htmlFor="t-title">Título *</label>
            <input id="t-title" className="input" autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex.: Implementar tela de conquistas" />
            {errors.title && <span className="small" style={{ color: 'var(--danger)' }}>{errors.title}</span>}
          </div>
          <div className="field full">
            <label htmlFor="t-desc">Descrição</label>
            <textarea id="t-desc" className="textarea" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detalhes, contexto, links…" />
          </div>
          <div className="field">
            <label htmlFor="t-proj">Projeto</label>
            <select id="t-proj" className="select" value={form.projectId ?? ''} onChange={(e) => { const projectId=e.target.value || null; const category=projects.find(p=>p.id===projectId)?.category;setForm(f=>({...f,projectId,...(!existing && category ? {category} : {})})); }}>
              <option value="">Sem projeto</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-cat">Categoria</label>
            <select id="t-cat" className="select" value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
              {Object.entries(categoryLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-st">Status</label>
            {existing ? <><span className="badge outline">{statusLabel[form.status]}</span><TaskWorkflow task={{...existing, status:form.status}} onMoved={status => set('status', status)} /></> : <select id="t-st" className="select" value={form.status} onChange={e => set('status', e.target.value as TaskInput['status'])}>
              {statusOrder.filter(s => s === 'backlog' || s === 'a_fazer').map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </select>}
          </div>
          <div className="field">
            <label htmlFor="t-pr">Prioridade</label>
            <select id="t-pr" className="select" value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
              {Object.entries(priorityLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-due">Prazo</label>
            <FormDateInput id="t-due" value={form.dueDate} onChange={iso => set('dueDate', iso || null)} />
          </div>
          <div className="field">
            <label htmlFor="t-max">Vagas (limite de responsáveis)</label>
            <input
              id="t-max" disabled={!!existing?.scheduleId}
              type="number"
              min={1}
              max={20}
              className="input"
              value={form.maxAssignees}
              onChange={(e) => set('maxAssignees', Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="field full">
            <label className="check">
              <input type="checkbox" className="switch" disabled={!!existing?.scheduleId} checked={form.open} onChange={(e) => set('open', e.target.checked)} />
              <span>Tarefa aberta: usuários podem aceitar enquanto houver vaga (aparece no Backlog)</span>
            </label>
          </div>
          <div className="field full">
            <span className="label">Responsáveis</span>
            <div className="chips">
              {members.filter(m=>m.active || form.assigneeIds.includes(m.id)).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={cx('chip', form.assigneeIds.includes(m.id) && 'active')}
                  disabled={!!existing?.scheduleId} aria-label={`Atribuir ${m.name}`} aria-pressed={form.assigneeIds.includes(m.id)}
                  onClick={() => toggleAssignee(m.id)}
                  style={{ paddingLeft: 4 }}
                >
                  <Avatar member={m} size={26} /> {m.name.split(' ')[0]}
                </button>
              ))}
            </div>
            {errors.assignees && <span className="small" style={{ color: 'var(--danger)' }}>{errors.assignees}</span>}
          </div>
          <div className="field full">
            <div className="row">
              <span className="label">Checklist e subtarefas</span>
              {progress !== null && <span className="muted small" style={{ marginLeft: 'auto' }}>{progress}% concluído</span>}
            </div>
            {form.checklist.length > 0 && <Progress value={progress ?? 0} small color="var(--success)" />}
            <div style={{ display: 'grid', gap: 6, marginTop: 4 }}>
              {form.checklist.map((c) => (
                <div key={c.id} className="row" style={{ padding: '4px 0' }}>
                  <label className="check grow">
                    <input type="checkbox" checked={c.done} onChange={() => toggleItem(c)} />
                    <span style={{ textDecoration: c.done ? 'line-through' : undefined, opacity: c.done ? 0.65 : 1 }}>{c.text}</span>
                  </label>
                  <button className="btn ghost icon sm" aria-label="Remover item" onClick={() => set('checklist', form.checklist.filter((x) => x.id !== c.id))}>
                    <X />
                  </button>
                </div>
              ))}
            </div>
            <div className="row">
              <input
                className="input"
                placeholder="Adicionar item…"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
              />
              <button className="btn" onClick={addItem} type="button"><Plus /> Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
