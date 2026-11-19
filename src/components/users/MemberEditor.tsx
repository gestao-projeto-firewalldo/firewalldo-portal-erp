import { useState } from 'react';
import { Save, UserRound } from 'lucide-react';
import { Modal } from '@/components/ui';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { membersService } from '@/services';
import { roleLabel } from '@/lib/labels';
import type { Category, Member, Role } from '@/types/models';

export function canEditMember(me: Member | undefined, member: Member) {
  return !!me && (me.id === member.id || me.role === 'superadmin' || (me.role === 'admin' && member.role === 'usuario'));
}
const areas: { id: Category; label: string }[] = [
  { id: 'programacao', label: 'Programação' }, { id: 'design', label: 'Design' },
  { id: 'conteudo', label: 'Conteúdo' }, { id: 'marketing', label: 'Marketing' },
  { id: 'infraestrutura', label: 'Infraestrutura' }, { id: 'gestao', label: 'Gestão' },
];

export function MemberEditor({ member, onClose }: { member?: Member; onClose: () => void }) {
  const { me } = useSession();
  const toast = useToast();
  const self = !!member && member.id === me?.id;
  const general = me?.role === 'superadmin';
  const [form, setForm] = useState({ name: member?.name ?? '', email: member?.email ?? '', title: member?.title ?? '', bio: member?.bio ?? '', role: member?.role ?? 'usuario' as Role, areas: member?.areas ?? [] as Category[] });
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const sensitive = self && (!!senha || form.email.trim().toLowerCase() !== member.email);
  const [invalidField, setInvalidField] = useState('');
  const fail = (field: string, message: string) => {
    setError(message); setInvalidField(field);
    requestAnimationFrame(() => document.getElementById(field)?.focus());
  };
  const save = async () => {
    setError(''); setInvalidField('');
    if (form.name.trim().length < 2) return fail('member-name', 'Informe um nome com pelo menos 2 caracteres.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return fail('member-email', 'Informe um e-mail válido.');
    if ((!member || member.pendingInvite || senha) && (senha.length < 12 || senha.length > 128)) return fail('member-password', 'A senha deve ter de 12 a 128 caracteres. Complete a senha para salvar.');
    if (member && senha && senha !== confirmacao) return fail('member-confirm', 'As senhas precisam ser iguais. Confira a confirmação.');
    if (sensitive && !senhaAtual) return fail('member-current', 'Informe sua senha atual para confirmar a alteração.');
    setSaving(true);
    try {
      const profile = { ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() };
      if (member) {
        const { role, ...base } = profile;
        await membersService.update(member.id, { ...base, ...(general ? { role } : {}),
          ...(senha ? { senha, confirmacaoSenha: confirmacao } : {}), ...(sensitive ? { senhaAtual } : {}) });
      } else await membersService.create({ ...profile, senha });
      toast({ tone: 'success', title: member ? 'Perfil atualizado' : 'Usuário criado', description: member ? 'As alterações já estão disponíveis.' : 'A conta já pode entrar com o e-mail e a senha cadastrados.' });
      onClose();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };
  return <Modal open onClose={() => !saving && onClose()} title={member ? self ? 'Meu perfil' : 'Editar usuário' : 'Criar usuário'}
    subtitle={member?.pendingInvite ? 'Esta conta ainda precisa de uma senha para acessar o portal.' : member ? 'Deixe os campos de senha vazios para alterar apenas os dados ou o perfil.' : 'Defina a senha de acesso ao criar a conta.'}
    error={error}
    icon={<span className="icon-tile"><UserRound /></span>} width={620}
    footer={<><button className="btn" onClick={onClose} disabled={saving}>Cancelar</button><button className="btn primary" onClick={save} disabled={saving}><Save /> {saving ? 'Salvando…' : member ? 'Salvar alterações' : 'Criar usuário'}</button></>}>
    <form noValidate className="form-grid" onSubmit={e => { e.preventDefault(); void save(); }}>
      <div className="field full"><label htmlFor="member-name">Nome *</label><input id="member-name" aria-invalid={invalidField === 'member-name'} className="input" autoFocus maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div className="field full"><label htmlFor="member-email">E-mail *</label><input id="member-email" aria-invalid={invalidField === 'member-email'} className="input" type="email" autoComplete="off" maxLength={254} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
      <div className="field"><label htmlFor="member-role">Perfil</label><select id="member-role" className="select" value={form.role} disabled={!general} onChange={e => setForm({ ...form, role: e.target.value as Role })}>
        {(general ? ['usuario', 'admin', 'superadmin'] : [form.role]).map(r => <option key={r} value={r}>{roleLabel[r as Role]}</option>)}
      </select></div>
      <div className="field"><label htmlFor="member-title">Função</label><input id="member-title" className="input" maxLength={100} value={form.title} placeholder="Ex.: Designer" onChange={e => setForm({ ...form, title: e.target.value })} /></div>
      <div className="field full"><label htmlFor="member-password">{member ? 'Nova senha' : 'Senha *'}</label><PasswordInput id="member-password" aria-invalid={invalidField === 'member-password'} autoComplete="new-password" maxLength={128} value={senha} onChange={e => setSenha(e.target.value)} /><span className="muted small">De 12 a 128 caracteres.</span></div>
      {member && <div className="field full"><label htmlFor="member-confirm">Confirmar nova senha</label><PasswordInput id="member-confirm" aria-invalid={invalidField === 'member-confirm'} autoComplete="new-password" maxLength={128} value={confirmacao} onChange={e => setConfirmacao(e.target.value)} /></div>}
      {sensitive && <div className="field full"><label htmlFor="member-current">Sua senha atual *</label><PasswordInput id="member-current" aria-invalid={invalidField === 'member-current'} autoComplete="current-password" maxLength={128} value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} /><span className="muted small">Confirma a alteração do seu e-mail ou senha.</span></div>}
      <fieldset className="field full area-options"><legend>Áreas de atuação</legend><div className="row" style={{ flexWrap: 'wrap' }}>{areas.map(a => <label key={a.id}><input type="checkbox" checked={form.areas.includes(a.id)} onChange={e => setForm({ ...form, areas: e.target.checked ? [...form.areas, a.id] : form.areas.filter(id => id !== a.id) })} /> {a.label}</label>)}</div></fieldset>
      <div className="field full"><label htmlFor="member-bio">Bio</label><textarea id="member-bio" className="textarea" maxLength={2000} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} /></div>
      <button type="submit" hidden disabled={saving}>Salvar</button>
    </form>
  </Modal>;
}
