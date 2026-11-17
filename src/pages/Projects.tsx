import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Flag, Layers, ListChecks, Plus, Save } from 'lucide-react';
import { Async, AvatarStack, EmptyState, Modal, Progress, SearchInput, Skeleton, SoftBadge } from '@/components/ui';
import { ProjectIcon } from '@/components/shared';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@/hooks/useQuery';
import { projectsService, tasksService } from '@/services';
import { cx, projectStatusLabel, shortDate } from '@/lib/labels';
import type { Project, ProjectStatus } from '@/types/models';
import { projectProgress } from '@/lib/progress';

export const projectStatusColor: Record<ProjectStatus, string> = {
  planejamento: '#a78bfa',
  em_andamento: '#22d3ee',
  pausado: '#facc15',
  concluido: '#22c55e',
};

export default function Projects() {
  const q = useQuery(() => projectsService.list());
  const tasksQ = useQuery(() => tasksService.list());
  const { membersById, can } = useSession();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (params.get('novo')) {
      setCreating(true);
      params.delete('novo');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const tasks = tasksQ.data ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>
            Projetos
          </h1>
          <p>Organização das frentes de desenvolvimento do Firewalldo.</p>
        </div>
        <div className="actions">
          {can('projetos.gerenciar') && (
            <button className="btn primary" onClick={() => setCreating(true)}>
              <Plus /> Novo projeto
            </button>
          )}
        </div>
      </div>

      <div className="toolbar">
        <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Buscar projetos…" />
        <div className="chips scroll">
          {(['all', 'em_andamento', 'planejamento', 'pausado', 'concluido'] as const).map((s) => (
            <button key={s} className={cx('chip', status === s && 'active')} onClick={() => setStatus(s)}>
              {s === 'all' ? 'Todos' : projectStatusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      <Async
        q={q}
        loading={
          <div className="grid-cards">
            {[0, 1, 2].map((i) => <Skeleton key={i} h={280} r={18} />)}
          </div>
        }
        empty={<div className="card"><EmptyState title="Nenhum projeto encontrado" description="Ajuste os filtros ou crie um novo projeto." /></div>}
        isEmpty={(d) => filter(d, status, search).length === 0}
      >
        {(d) => (
          <div className="grid-cards stagger">
            {filter(d, status, search).map((p) => {
              const linked = tasks.filter((t) => t.projectId === p.id);
              const done = linked.filter((t) => t.status === 'concluido').length;
              const next = p.milestones.find((m) => !m.done);
              return (
                <Link key={p.id} to={`/projetos/${p.id}`} className="card hover project-card" style={{ '--c': p.color } as CSSProperties}>
                  <div className="row">
                    <ProjectIcon project={p} size={50} />
                    <div className="grow">
                      <h3>{p.name}</h3>
                      <div className="muted small ellipsis">{p.subtitle}</div>
                    </div>
                  </div>
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <SoftBadge color={projectStatusColor[p.status]}>{projectStatusLabel[p.status]}</SoftBadge>
                    <span className="badge outline">
                      <CalendarDays /> até {shortDate(p.dueDate)}
                    </span>
                  </div>
                  <div>
                    <div className="kv" style={{ marginBottom: 8 }}>
                      Progresso <b>{projectProgress(p, tasks)}%</b>
                    </div>
                    <Progress value={projectProgress(p, tasks)} />
                  </div>
                  <div className="kv">
                    <span className="row" style={{ gap: 6 }}>
                      <ListChecks size={16} /> {done}/{linked.length} tarefas
                    </span>
                    <span className="row" style={{ gap: 6 }}>
                      <Flag size={16} /> {p.milestones.filter((m) => m.done).length}/{p.milestones.length} marcos
                    </span>
                  </div>
                  <div className="kv" style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
                    <AvatarStack members={p.ownerIds.map((id) => membersById[id]).filter(Boolean)} />
                    <span className="small ellipsis" style={{ maxWidth: '60%' }}>
                      {next ? <>Próximo: <b>{next.title}</b></> : 'Todos os marcos concluídos'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Async>

      {creating && <NewProjectModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function filter(list: Project[], status: ProjectStatus | 'all', search: string) {
  return list.filter((p) => (status === 'all' || p.status === status) && (!search || p.name.toLowerCase().includes(search.toLowerCase())));
}

const COLORS = ['#22d3ee', '#a78bfa', '#38bdf8', '#fbbf24', '#34d399', '#fb923c', '#f472b6'];
const ICONS: Project['icon'][] = ['smartphone', 'play', 'globe', 'palette', 'shield', 'server'];

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const { members, me, can } = useSession();
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    subtitle: '',
    description: '',
    icon: 'shield' as Project['icon'],
    color: COLORS[0],
    dueDate: '',
    ownerIds: me ? [me.id] : [],
  });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (form.name.trim().length < 3) return setErr('Informe um nome com pelo menos 3 caracteres.');
    if (!form.dueDate) return setErr('Informe a data prevista de entrega.');
    setSaving(true);
    try {
      await projectsService.create(form);
      toast({ tone: 'success', title: 'Projeto criado', description: form.name });
      onClose();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Novo projeto"
      icon={<span className="icon-tile"><Layers /></span>}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={save} disabled={saving || !can('projetos.gerenciar')}>
            {saving ? <span className="spinner" /> : <Save />} Criar projeto
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="p-name">Nome *</label>
          <input id="p-name" className="input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field full">
          <label htmlFor="p-sub">Resumo</label>
          <input id="p-sub" className="input" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Ex.: Série de vídeos educativos" />
        </div>
        <div className="field full">
          <label htmlFor="p-desc">Descrição</label>
          <textarea id="p-desc" className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="field">
          <span className="label">Ícone</span>
          <div className="chips">
            {ICONS.map((i) => (
              <button key={i} type="button" className={cx('chip', form.icon === i && 'active')} onClick={() => setForm({ ...form, icon: i })} style={{ padding: 4 }}>
                <ProjectIcon project={{ icon: i, color: form.color }} size={28} />
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="label">Cor</span>
          <div className="chips">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${c}`}
                onClick={() => setForm({ ...form, color: c })}
                style={{ width: 34, height: 34, borderRadius: 10, background: c, border: form.color === c ? '3px solid var(--text)' : '1px solid var(--border)' }}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="p-due">Entrega prevista *</label>
          <input id="p-due" type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="p-own">Responsável principal</label>
          <select id="p-own" className="select" value={form.ownerIds[0] ?? ''} onChange={(e) => setForm({ ...form, ownerIds: [e.target.value] })}>
            {members.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        {err && <div className="full small" style={{ color: 'var(--danger)' }}>{err}</div>}
      </div>
    </Modal>
  );
}
