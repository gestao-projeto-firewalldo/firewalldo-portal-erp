import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  Clapperboard,
  Code2,
  Filter,
  Gamepad2,
  Hourglass,
  Lightbulb,
  MoreVertical,
  Plus,
  Send,
  Share2,
  Sparkles,
  ThumbsUp,
  Video,
  Archive,
  Trash2,
} from 'lucide-react';
import { Async, Avatar, ConfirmDialog, EmptyState, Modal, SearchInput, Skeleton } from '@/components/ui';
import { useTaskEditor } from '@/components/tasks/TaskEditor';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@/hooks/useQuery';
import { ideasService } from '@/services';
import { cx, ideaCategoryLabel, ideaStatusLabel, shortDate } from '@/lib/labels';
import type { Idea, IdeaCategory, IdeaStatus } from '@/types/models';

export const ideaCategoryIcon: Record<IdeaCategory, typeof Video> = {
  video: Video,
  educacao: Gamepad2,
  redes_sociais: Share2,
  pratica: Code2,
  guia: BookOpen,
  bastidores: Clapperboard,
};
const ideaCategoryColor: Record<IdeaCategory, string> = {
  video: '#06b6d4',
  educacao: '#3b82f6',
  redes_sociais: '#6366f1',
  pratica: '#0ea5e9',
  guia: '#2563eb',
  bastidores: '#8b5cf6',
};
const statusIcon: Record<IdeaStatus, typeof Check> = { nova: Sparkles, em_analise: Hourglass, aprovada: Check, arquivada: Archive };

type Filter = 'todos' | 'em_analise' | 'aprovada';

export default function Ideas() {
  const q = useQuery(() => ideasService.list());
  const { membersById } = useSession();
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [cat, setCat] = useState<IdeaCategory | ''>('');

  const apply = (list: Idea[]) =>
    list
      .filter(
        (i) =>
          (filter === 'todos' || i.status === filter) &&
          (!cat || i.category === cat) &&
          (!search || `${i.title} ${i.description}`.toLowerCase().includes(search.toLowerCase())),
      )
      .sort((a, b) => Number(a.status === 'arquivada') - Number(b.status === 'arquivada') || b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Ideias</h1>
        <div className="actions">
          <button className="btn primary lg" onClick={() => setCreating(true)}>
            <Plus /> Nova ideia
          </button>
        </div>
      </div>

      <div className="ideas-toolbar">
        <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Buscar ideias" />
        <div className="seg seg-lg" role="tablist">
          {([
            ['todos', 'Todos'],
            ['em_analise', 'Em análise'],
            ['aprovada', 'Aprovadas'],
          ] as const).map(([v, l]) => (
            <button key={v} role="tab" aria-selected={filter === v} className={cx(filter === v && 'active')} onClick={() => setFilter(v)}>
              {l}
            </button>
          ))}
        </div>
        <span className="header-divider" />
        <label className="select-pill wide">
          <Filter size={18} />
          <select value={cat} onChange={(e) => setCat(e.target.value as IdeaCategory | '')} aria-label="Categoria">
            <option value="">Categoria</option>
            {Object.entries(ideaCategoryLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <Async
        q={q}
        loading={<div className="ideas-grid">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h={330} r={12} />)}</div>}
        empty={
          <div className="card">
            <EmptyState title="Nenhuma ideia encontrada" description="Ajuste os filtros ou registre uma nova ideia." action={<button className="btn primary" onClick={() => setCreating(true)}><Plus /> Nova ideia</button>} />
          </div>
        }
        isEmpty={(d) => apply(d).length === 0}
      >
        {(d) => (
          <div className="ideas-grid">
            {apply(d).map((i) => (
              <IdeaCard key={i.id} idea={i} authorName={membersById[i.authorId]?.name} author={membersById[i.authorId]} />
            ))}
          </div>
        )}
      </Async>
      {creating && <NewIdeaModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function IdeaCard({ idea, author, authorName }: { idea: Idea; author?: ReturnType<typeof useSession>['members'][number]; authorName?: string }) {
  const { can } = useSession();
  const openTask = useTaskEditor();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);

  const CatIcon = ideaCategoryIcon[idea.category];
  const StIcon = statusIcon[idea.status];

  return (
    <article className={cx('card idea-card', idea.status === 'arquivada' && 'archived')}>
      {confirmDelete && (
        <ConfirmDialog
          title="Excluir ideia"
          message="Deseja excluir permanentemente esta ideia? Esta ação não poderá ser desfeita."
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            await ideasService.remove(idea.id);
            toast({ tone: 'success', title: 'Ideia excluída', description: idea.title });
          }}
        />
      )}
      <div className="idea-cover" style={{ '--c': ideaCategoryColor[idea.category] } as CSSProperties}>
        <CatIcon />
        <span className={cx('idea-status', idea.status)}>
          <StIcon size={16} /> {ideaStatusLabel[idea.status]}
        </span>
        {can('tarefas.criar') && (
          <div className="idea-menu" ref={ref}>
            <button className="icon-btn" aria-label="Ações da ideia" onClick={() => setMenu(!menu)}>
              <MoreVertical size={20} />
            </button>
            {menu && (
              <div className="dropdown" style={{ width: 220 }}>
                <div className="dropdown-head" style={{ fontSize: 13 }}>Alterar status</div>
                {(['nova', 'em_analise', 'aprovada'] as IdeaStatus[]).map((s) => (
                  <button
                    key={s}
                    className="dropdown-item"
                    onClick={() => {
                      void ideasService.setStatus(idea.id, s).catch(error=>toast({tone:'error',title:'Não foi possível alterar a ideia',description:error.message}));
                      setMenu(false);
                    }}
                  >
                    {idea.status === s ? <Check size={16} /> : <span style={{ width: 16 }} />} {ideaStatusLabel[s]}
                  </button>
                ))}
                {idea.status === 'aprovada' && (
                  <button
                    className="dropdown-item"
                    style={{ color: 'var(--primary-text)' }}
                    onClick={() => {
                      setMenu(false);
                      openTask({ prefill: { title: idea.title, description: idea.description, category: 'conteudo', status: 'backlog', open: true } });
                    }}
                  >
                    <ArrowUpRight size={16} /> Transformar em tarefa
                  </button>
                )}
                <div className="dropdown-sep" />
                <button className="dropdown-item idea-delete" onClick={() => { setMenu(false); setConfirmDelete(true); }}>
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="idea-body">
        <h3>{idea.title}</h3>
        <p className="muted clamp-2">{idea.description}</p>
        <div className="idea-row">
          <span className="row" style={{ gap: 10 }}>
            <CatIcon size={20} style={{ color: 'var(--primary-text)' }} /> {ideaCategoryLabel[idea.category]}
          </span>
          <button className={cx('like', idea.votedByMe && 'on')} onClick={() => void ideasService.toggleVote(idea.id).catch(error=>toast({tone:'error',title:'Não foi possível salvar o voto',description:error.message}))} aria-pressed={idea.votedByMe}>
            <ThumbsUp size={18} /> Gostei {idea.votes}
          </button>
        </div>
        <div className="idea-foot">
          <span className="row" style={{ gap: 12, minWidth: 0 }}>
            {author && <Avatar member={author} size={38} />}
            <span className="ellipsis">{authorName ?? '—'}</span>
          </span>
          <span className="row muted" style={{ gap: 8, flex: 'none' }}>
            <CalendarDays size={18} /> {shortDate(idea.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
}

function NewIdeaModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IdeaCategory>('video');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (title.trim().length < 4) return setErr('Dê um título com pelo menos 4 caracteres.');
    setSaving(true);
    try {
      await ideasService.create({ title: title.trim(), description: description.trim(), category });
      toast({ tone: 'success', title: 'Ideia registrada', description: title });
      onClose();
    } catch(error) { setErr((error as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova ideia"
      error={err}
      subtitle="Compartilhe uma proposta de conteúdo ou melhoria com a equipe."
      icon={<span className="icon-tile"><Lightbulb /></span>}
      width={560}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : <Send />} Registrar
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="i-t">Título *</label>
          <input id="i-t" className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="i-d">Descrição</label>
          <textarea id="i-d" className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qual é a proposta? Para quem?" />
        </div>
        <div className="field full">
          <span className="label">Categoria</span>
          <div className="chips">
            {(Object.keys(ideaCategoryLabel) as IdeaCategory[]).map((k) => {
              const I = ideaCategoryIcon[k];
              return (
                <button key={k} type="button" className={cx('chip', category === k && 'active')} onClick={() => setCategory(k)}>
                  <I size={16} /> {ideaCategoryLabel[k]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
