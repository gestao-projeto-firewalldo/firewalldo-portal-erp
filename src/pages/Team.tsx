import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ListChecks, MoreVertical, Plus, Save, UserCheck, UserPlus, UserX, Users } from 'lucide-react';
import { Avatar, EmptyState, Modal, SearchInput, Skeleton } from '@/components/ui';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { membersService } from '@/services';
import { http, useApi } from '@/services/core';
import { cx, roleLabel } from '@/lib/labels';
import type { Member, MemberInput, Role } from '@/types/models';

export default function UsersPage() {
  const { members, loading, me, can } = useSession();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [creating, setCreating] = useState(false);
  const [invite, setInvite] = useState('');

  const list = members.filter(
    (m) => (!role || m.role === role) && (!search || `${m.name} ${m.email}`.toLowerCase().includes(search.toLowerCase())),
  );
  const stats = [
    { label: 'Total de usuários', value: members.length, icon: <Users />, c: 'var(--primary)' },
    { label: 'Administradores', value: members.filter((m) => m.role === 'admin').length, icon: <Crown />, c: 'var(--primary)' },
    { label: 'Online agora', value: members.filter((m) => m.active && m.status === 'online').length, icon: <i className="online-dot" />, c: 'var(--success)' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Usuários</h1>
        {can('usuarios.gerenciar') && (
          <div className="actions">
            <button className="btn primary lg" onClick={() => setCreating(true)}>
              <Plus /> Criar usuário
            </button>
          </div>
        )}
      </div>

      <section className="stats three">
        {stats.map((s) => (
          <div key={s.label} className="card stat">
            <span className="icon-tile" style={{ '--c': s.c, '--s': '60px' } as CSSProperties}>
              {s.icon}
            </span>
            <div className="grow">
              <div className="stat-label">{s.label}</div>
              {loading && !members.length ? <Skeleton h={34} w={40} /> : <div className="stat-value">{s.value}</div>}
            </div>
          </div>
        ))}
      </section>

      <div className="toolbar">
        <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Buscar por nome ou e-mail" />
        <select className="select" style={{ width: 300, height: 52 }} value={role} onChange={(e) => setRole(e.target.value as Role | '')} aria-label="Perfil">
          <option value="">Todos os perfis</option>
          <option value="admin">Administradores</option>
          <option value="usuario">Usuários</option>
        </select>
      </div>

      <div className="card" style={{ overflow: 'visible' }}>
        {loading && !members.length ? (
          <div style={{ padding: 20 }}><Skeleton h={260} /></div>
        ) : list.length === 0 ? (
          <EmptyState title="Nenhum usuário encontrado" description="Tente outro nome, e-mail ou perfil." />
        ) : (
          <div className="table-scroll">
            <table className="data-table users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className={cx(!m.active && 'inactive')}>
                    <td>
                      <span className="row" style={{ gap: 16 }}>
                        <Avatar member={m} size={44} />
                        <b className="user-name">
                          {m.name}
                          {m.id === me?.id && <span className="tag" style={{ marginLeft: 8 }}>você</span>}
                        </b>
                      </span>
                    </td>
                    <td className="muted-strong">{m.email}</td>
                    <td>
                      <span className={cx('role-pill', m.role)}>{roleLabel[m.role]}</span>
                    </td>
                    <td>
                      {!m.active ? (
                        <span className="presence off">Desativado</span>
                      ) : (
                        <span className={cx('presence', m.status === 'online' ? 'on' : 'off')}>
                          <i /> {m.status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <RowActions member={m} isMe={m.id === me?.id} canManage={can('usuarios.gerenciar')} onInvite={setInvite} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="muted small" style={{ marginTop: 14 }}>
        {useApi() ? 'Online indica atividade recente no portal.' : 'Status online simulado.'}
      </p>
      {creating && <CreateUserModal onClose={() => setCreating(false)} onInvite={setInvite} />}
      {invite && <InviteModal token={invite} onClose={() => setInvite('')} />}
    </div>
  );
}

function RowActions({ member, isMe, canManage, onInvite }: { member: Member; isMe: boolean; canManage: boolean; onInvite: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const nav = useNavigate();
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const act = async (patch: Partial<Member>, msg: string) => {
    setOpen(false);
    try {
      await membersService.update(member.id, patch);
      toast({ tone: 'success', title: msg, description: member.name });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível atualizar', description: (error as Error).message });
    }
  };

  const renewInvite = async () => {
    setOpen(false);
    try {
      const result = await http.post<{ inviteToken: string }>(`/users/${member.id}/invite`, {});
      onInvite(result.inviteToken);
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível gerar o convite', description: (error as Error).message });
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button className="icon-btn" aria-label={`Ações para ${member.name}`} onClick={() => setOpen(!open)}>
        <MoreVertical />
      </button>
      {open && (
        <div className="dropdown" style={{ width: 250, textAlign: 'left' }}>
          <button className="dropdown-item" onClick={() => nav(`/tarefas?ver=lista`)}>
            <ListChecks size={18} /> Ver tarefas
          </button>
          {canManage && !isMe && (
            <>
              {useApi() && member.active && member.pendingInvite && (
                <button className="dropdown-item" onClick={renewInvite}><UserPlus size={18} /> Gerar novo convite</button>
              )}
              <button className="dropdown-item" onClick={() => act({ role: member.role === 'admin' ? 'usuario' : 'admin' }, 'Perfil alterado')}>
                <Crown size={18} /> {member.role === 'admin' ? 'Tornar usuário' : 'Tornar administrador'}
              </button>
              <button className="dropdown-item" onClick={() => act({ active: !member.active }, member.active ? 'Usuário desativado' : 'Usuário reativado')} style={{ color: member.active ? 'var(--danger)' : undefined }}>
                {member.active ? <UserX size={18} /> : <UserCheck size={18} />} {member.active ? 'Desativar' : 'Reativar'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onInvite }: { onClose: () => void; onInvite: (token: string) => void }) {
  const toast = useToast();
  const [form, setForm] = useState<MemberInput>({ name: '', email: '', role: 'usuario', title: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (form.name.trim().length < 3) return setErr('Informe o nome completo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErr('Informe um e-mail válido.');
    setSaving(true);
    try {
      const user = await membersService.create({ ...form, name: form.name.trim(), email: form.email.trim() });
      if (user.inviteToken) onInvite(user.inviteToken);
      toast({ tone: 'success', title: 'Usuário criado', description: form.name });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Criar usuário"
      subtitle={useApi() ? "Ao criar a conta, você receberá um link de convite para enviar ao usuário." : undefined}
      icon={<span className="icon-tile"><UserPlus /></span>}
      width={560}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : <Save />} Criar usuário
          </button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="u-n">Nome *</label>
          <input id="u-n" className="input" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="field full">
          <label htmlFor="u-e">E-mail *</label>
          <input id="u-e" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@empresa.com" />
        </div>
        <div className="field">
          <label htmlFor="u-r">Perfil</label>
          <select id="u-r" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="usuario">Usuário</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="u-t">Função</label>
          <input id="u-t" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Designer" />
        </div>
        {err && <div className="full small" style={{ color: 'var(--danger)' }}>{err}</div>}
      </div>
    </Modal>
  );
}

function InviteModal({ token, onClose }: { token: string; onClose: () => void }) {
  const link = `${window.location.origin}/#convite=${token}`;
  const [copied, setCopied] = useState(false);

  return (
    <Modal open onClose={onClose} title="Convite de acesso" subtitle="Envie este link ao usuário. Ele pode criar a senha em até 48 horas.">
      <div className="field">
        <label htmlFor="invite-link">Link do convite</label>
        <input id="invite-link" className="input" value={link} readOnly onFocus={(event) => event.target.select()} />
      </div>
      <button className="btn primary" style={{ marginTop: 16 }} onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
          setCopied(true);
        } catch {
          const field = document.querySelector<HTMLInputElement>('#invite-link');
          field?.focus();
          field?.select();
        }
      }}>{copied ? 'Copiado' : 'Copiar link'}</button>
    </Modal>
  );
}
