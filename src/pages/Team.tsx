import { useState, type CSSProperties } from 'react';
import { Crown, Pencil, Plus, UserCheck, UserX, Users } from 'lucide-react';
import { Avatar, EmptyState, SearchInput, Skeleton } from '@/components/ui';
import { MemberEditor, canEditMember } from '@/components/users/MemberEditor';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { membersService } from '@/services';
import { cx, roleLabel } from '@/lib/labels';
import type { Member, Role } from '@/types/models';

export default function UsersPage() {
  const { members, loading, me, can } = useSession();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [editor, setEditor] = useState<Member | 'new' | null>(null);
  const [busy, setBusy] = useState('');
  const list = members.filter(m => (!role || m.role === role) && `${m.name} ${m.email}`.toLowerCase().includes(search.toLowerCase()));
  const stats = [
    { label: 'Total de usuários', value: members.length, icon: <Users />, c: 'var(--primary)' },
    { label: 'Administradores', value: members.filter(m => m.role !== 'usuario').length, icon: <Crown />, c: 'var(--primary)' },
    { label: 'Online agora', value: members.filter(m => m.active && m.status === 'online').length, icon: <i className="online-dot" />, c: 'var(--success)' },
  ];
  const toggle = async (member: Member) => {
    if (member.active && !window.confirm(`Desativar o acesso de ${member.name}?`)) return;
    setBusy(member.id);
    try { await membersService.update(member.id, { active: !member.active }); toast({ tone: 'success', title: member.active ? 'Usuário desativado' : 'Usuário reativado' }); }
    catch (err) { toast({ tone: 'error', title: 'Não foi possível atualizar', description: (err as Error).message }); }
    finally { setBusy(''); }
  };
  return <div className="page">
    <div className="page-head"><h1>Usuários</h1>{can('usuarios.gerenciar') && <button className="btn primary lg" onClick={() => setEditor('new')}><Plus /> Criar usuário</button>}</div>
    <section className="stats three">{stats.map(s => <div key={s.label} className="card stat"><span className="icon-tile" style={{ '--c': s.c, '--s': '60px' } as CSSProperties}>{s.icon}</span><div className="grow"><div className="stat-label">{s.label}</div>{loading && !members.length ? <Skeleton h={34} w={40} /> : <div className="stat-value">{s.value}</div>}</div></div>)}</section>
    <div className="toolbar"><SearchInput className="grow" value={search} onChange={setSearch} placeholder="Buscar por nome ou e-mail" /><select className="select" style={{ width: 300, height: 52 }} value={role} onChange={e => setRole(e.target.value as Role | '')} aria-label="Perfil"><option value="">Todos os perfis</option>{(['superadmin','admin','usuario'] as const).map(r => <option key={r} value={r}>{roleLabel[r]}</option>)}</select></div>
    <div className="card">{loading && !members.length ? <Skeleton h={260} /> : !list.length ? <EmptyState title="Nenhum usuário encontrado" description="Tente outro nome, e-mail ou perfil." /> : <div className="table-scroll"><table className="data-table users-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th style={{ textAlign:'right' }}>Ações</th></tr></thead><tbody>{list.map(m => {
      const editable = canEditMember(me, m);
      return <tr key={m.id} className={cx(!m.active && 'inactive')}><td><button className="member-profile-link" onClick={() => setEditor(m)} disabled={!editable} title={editable ? `Editar perfil de ${m.name}` : undefined}><Avatar member={m} size={44} /><b>{m.name}{m.id === me?.id && <span className="tag" style={{ marginLeft:8 }}>você</span>}</b></button></td><td className="muted-strong">{m.email}</td><td><span className={cx('role-pill',m.role)}>{roleLabel[m.role]}</span>{m.pendingInvite && <small className="pending-label">Senha pendente</small>}</td><td><span className={cx('presence', m.active && m.status === 'online' ? 'on' : 'off')}><i />{!m.active ? 'Desativado' : m.status === 'online' ? 'Online' : 'Offline'}</span></td><td><div className="row" style={{ justifyContent:'flex-end' }}>{editable && <button className="icon-btn" aria-label={`Editar ${m.name}`} onClick={() => setEditor(m)}><Pencil size={18} /></button>}{editable && m.id !== me?.id && <button className="icon-btn" disabled={busy === m.id} aria-label={`${m.active ? 'Desativar' : 'Reativar'} ${m.name}`} onClick={() => void toggle(m)}>{m.active ? <UserX size={18} /> : <UserCheck size={18} />}</button>}</div></td></tr>;
    })}</tbody></table></div>}</div>
    <p className="muted small" style={{ marginTop:14 }}>Online indica atividade recente no portal. Clique no nome ou no lápis para editar um perfil permitido.</p>
    {editor && <MemberEditor member={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />}
  </div>;
}
