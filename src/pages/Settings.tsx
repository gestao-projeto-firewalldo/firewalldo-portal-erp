import { useConfirm } from '@/context/ConfirmContext';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bug, Check, KeyRound, Pencil, RotateCcw, Save } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { PushSettings } from '@/components/notifications/PushSettings';
import { MemberEditor } from '@/components/users/MemberEditor';
import { usePrefs } from '@/context/PrefsContext';
import { rolePermissions, useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { authService, devFlags, membersService, mockDb } from '@/services';
import { cx, roleLabel } from '@/lib/labels';
import { appConfig } from '@/config';
import { useApi } from '@/services/core';
import type { Permission, UserPreferences } from '@/types/models';

// V1.9: a aba "Integrações" saiu (a coleta automática do Radar foi descontinuada e os atalhos são editados na Visão geral).
type Tab = 'geral' | 'notificacoes';
const tabs: { id: Tab; label: string }[] = [
  { id: 'geral', label: 'Geral' },
  { id: 'notificacoes', label: 'Notificações' },
];

const permLabels: Record<Permission, string> = {
  'tarefas.criar': 'Criar tarefas (em projetos)',
  'tarefas.editar_todas': 'Editar e mover qualquer tarefa',
  'tarefas.aceitar': 'Aceitar vagas no Backlog',
  'projetos.gerenciar': 'Gerenciar projetos e marcos',
  'biblioteca.enviar': 'Enviar arquivos',
  'usuarios.gerenciar': 'Criar e editar usuários comuns e suas senhas',
  'administradores.gerenciar': 'Gerenciar administradores e suas senhas',
  'auditoria.ver': 'Consultar auditoria',
  'noticias.curar': 'Cadastrar, editar e excluir notícias do Radar',
  'relatorios.ver': 'Ver relatórios',
  'configuracoes.integracoes': 'Editar os atalhos do Acesso rápido',
  'financeiro.acessar': 'Acessar o Financeiro (usuários comuns só com autorização individual)',
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function SettingsPage() {
  const { me, can } = useSession();
  const { prefs, setPrefs } = usePrefs();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [editingProfile, setEditingProfile] = useState(params.get('perfil') === 'editar');
  const [tab, setTab] = useState<Tab>(() => (params.get('aba') === 'notificacoes' ? 'notificacoes' : 'geral'));

  // Rascunhos — só valem ao clicar em "Salvar alterações"
  const [profile, setProfile] = useState({ name: '', title: '', bio: '' });
  const [prefsDraft, setPrefsDraft] = useState<UserPreferences>(prefs);
  const [saving, setSaving] = useState(false);
  const [forceError, setForceError] = useState(devFlags.forceError);
  const viewAs = useApi() ? me?.role : mockDb.get().viewAsRole;

  useEffect(() => { setPrefsDraft(prefs); }, [prefs]);
  useEffect(() => {
    if (me) setProfile({ name: me.name, title: me.title, bio: me.bio ?? '' });
  }, [me?.id, me?.name, me?.title, me?.bio]);

  const dirty = useMemo(
    () =>
      (!!me && (profile.name !== me.name || profile.title !== me.title || profile.bio !== (me.bio ?? ''))) ||
      !same(prefsDraft, prefs),
    [me, profile, prefsDraft, prefs],
  );

  const go = (t: Tab) => {
    setTab(t);
    params.set('aba', t);
    setParams(params, { replace: true });
  };

  const save = async () => {
    if (profile.name.trim().length < 2) {
      toast({ tone: 'error', title: 'Informe um nome válido' });
      return;
    }
    setSaving(true);
    try {
      if (me && !same(profile, { name: me.name, title: me.title, bio: me.bio ?? '' })) await membersService.update(me.id, profile);
      if (!same(prefsDraft, prefs)) await setPrefs(prefsDraft);
      toast({ tone: 'success', title: 'Alterações salvas' });
    } catch (e) {
      toast({ tone: 'error', title: 'Não foi possível salvar', description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const setN = (k: keyof UserPreferences['notifications'], v: boolean) =>
    setPrefsDraft({ ...prefsDraft, notifications: { ...prefsDraft.notifications, [k]: v } });

  return (
    <div className="page settings-page">
      <div className="page-head" style={{ marginBottom: 8 }}>
        <h1>Configurações</h1>
        <div className="actions">
          {dirty && <span className="muted small">Alterações não salvas</span>}
          <button className="btn primary lg" onClick={save} disabled={saving || !dirty}>
            {saving ? <span className="spinner" /> : <Save />} Salvar alterações
          </button>
        </div>
      </div>

      <div className="tabs-bar" style={{ marginBottom: 24 }}>
        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={cx('tab', tab === t.id && 'active')} onClick={() => go(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===================== GERAL ===================== */}
      {tab === 'geral' && (
        <div className="settings-stack">
          <section className="card settings-section">
            <div className="section-head">
              <div>
                <h2>Perfil</h2>
                <p>Informações exibidas para a equipe.</p>
              </div>
              <button className="btn" onClick={() => setEditingProfile(true)}><Pencil /> Editar perfil e senha</button>
            </div>
            <div className="row" style={{ gap: 18, marginBottom: 18 }}>
              {me && <Avatar member={me} size={72} />}
              <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                <b style={{ fontSize: 18 }}>{me?.name}</b>
                <div className="muted">{roleLabel[me?.role ?? 'usuario']} · {me?.email}</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="pf-n">Nome</label>
                <input id="pf-n" className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="pf-t">Função</label>
                <input id="pf-t" className="input" value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} />
              </div>
              <div className="field full">
                <label htmlFor="pf-b">Bio</label>
                <textarea id="pf-b" className="textarea" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
              </div>
            </div>
          </section>

          <section className="card settings-section">
            <div className="section-head">
              <div>
                <h2>Aparência</h2>
                <p>O tema é aplicado e salvo ao selecionar. Misto deixa o menu e o topo escuros com o conteúdo claro.</p>
              </div>
            </div>
            <div className="theme-opts">
              {([
                { v: 'dark', l: 'Escuro (padrão)', bg: '#0b1426' },
                { v: 'light', l: 'Claro', bg: '#f4f6fa' },
                { v: 'hybrid', l: 'Misto', bg: 'linear-gradient(90deg,#0b1426 28%,#f4f6fa 28%)' },
              ] as const).map((t) => (
                <button key={t.v} className={cx('theme-opt', (prefsDraft.theme === 'system' ? 'dark' : prefsDraft.theme) === t.v && 'active')} onClick={async () => { try { await setPrefs({ ...prefsDraft, theme: t.v }); } catch (error) { toast({ tone: 'error', title: 'Não foi possível salvar o tema', description: (error as Error).message }); } }}>
                  <div className="sw" style={{ background: t.bg }} />
                  {t.l}
                </button>
              ))}
            </div>
            <div className="pref-row" style={{ marginTop: 18 }}>
              <div className="grow">
                <b>Reduzir animações</b>
                <span className="muted small">Desativa transições e efeitos de entrada.</span>
              </div>
              <input type="checkbox" className="switch" checked={prefsDraft.reducedMotion} onChange={(e) => setPrefsDraft({ ...prefsDraft, reducedMotion: e.target.checked })} aria-label="Reduzir animações" />
            </div>
          </section>

          <section className="card settings-section">
            <div className="section-head">
              <div>
                <h2>Permissões</h2>
                <p>Permissões de cada perfil no portal.</p>
              </div>
            </div>
            {!useApi() && <div className="notice" style={{ marginBottom: 16 }}>
              <KeyRound />
              <div className="grow">
                <b>Visualizar o portal como:</b> alterne o perfil para testar o que cada um vê (só demonstração).
                <div className="seg" style={{ marginTop: 10, display: 'flex', width: 'fit-content' }}>
                  {(['superadmin', 'admin', 'usuario'] as const).map((r) => (
                    <button
                      key={r}
                      className={cx(viewAs === r && 'active')}
                      onClick={() => {
                        authService.setViewAsRole(r);
                        toast({ tone: 'info', title: `Visualizando como ${roleLabel[r]}` });
                      }}
                    >
                      {roleLabel[r]}
                    </button>
                  ))}
                </div>
              </div>
            </div>}
            <div style={{ overflowX: 'auto' }}>
              <table className="perm-table">
                <thead>
                  <tr>
                    <th>Permissão</th>
                    <th>Administrador geral</th>
                    <th>Administrador</th>
                    <th>Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(permLabels) as Permission[]).map((p) => (
                    <tr key={p}>
                      <td>{permLabels[p]}</td>
                      {(['superadmin', 'admin', 'usuario'] as const).map((r) => (
                        <td key={r}>{rolePermissions[r].includes(p) ? <Check size={18} style={{ color: 'var(--success)' }} /> : <span className="muted">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {!useApi() && <section className="card settings-section">
            <div className="section-head">
              <div>
                <h2>Dados de demonstração</h2>
                <p>As alterações feitas no portal ficam salvas apenas neste navegador.</p>
              </div>
            </div>
            <div className="pref-row">
              <div className="grow">
                <b>Simular falha de comunicação</b>
                <span className="muted small">Faz os serviços retornarem erro para testar os estados de erro.</span>
              </div>
              <Bug size={20} style={{ color: forceError ? 'var(--danger)' : 'var(--muted)' }} />
              <input
                type="checkbox"
                className="switch"
                checked={forceError}
                onChange={(e) => {
                  devFlags.forceError = e.target.checked;
                  setForceError(e.target.checked);
                }}
                aria-label="Simular falha"
              />
            </div>
            <div className="pref-row">
              <div className="grow">
                <b>Restaurar dados originais</b>
                <span className="muted small">Desfaz tarefas, ideias, usuários e configurações criados localmente.</span>
              </div>
              <button
                className="btn danger"
                onClick={async () => {
                  if (!await confirm({title:'Restaurar demonstração?',description:'Restaurar todos os dados de demonstração? As alterações locais serão perdidas.',confirmLabel:'Restaurar'})) return;
                  mockDb.reset();
                  setPrefs(mockDb.get().preferences);
                  setPrefsDraft(mockDb.get().preferences);
                  toast({ tone: 'success', title: 'Dados restaurados' });
                }}
              >
                <RotateCcw /> Restaurar
              </button>
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>
              {appConfig.version} · fonte de dados: {appConfig.dataSource === 'mock' ? 'simulada (mock)' : appConfig.apiBaseUrl}
            </p>
          </section>}
        </div>
      )}

      {/* ===================== NOTIFICAÇÕES ===================== */}
      {tab === 'notificacoes' && (
        <div className="settings-stack"><PushSettings/>
        <section className="card settings-section">
          <div className="section-head">
            <div>
              <h2>Notificações</h2>
              <p>Preferências salvas na sua conta. As notificações são exibidas no sino do portal.</p>
            </div>
          </div>
          {([
            ['taskAssigned', 'Tarefas e vagas disponíveis', 'Quando alguém me adicionar como responsável ou criar uma tarefa aberta para a equipe.'],
            ['taskDue', 'Prazos próximos', 'Lembrete 2 dias antes do vencimento.'],
            ['projectUpdates', 'Atualizações de projetos', 'Marcos concluídos e mudanças de status.'],
            ['newsDigest', 'Resumo do Radar', 'Destaques de notícias uma vez por dia.'],
            ['email', 'Também por e-mail', 'Indisponível: o serviço de e-mail ainda não foi configurado.'],
          ] as const).map(([k, t, d]) => (
            <div key={k} className="pref-row">
              <div className="grow">
                <b>{t}</b>
                <span className="muted small">{d}</span>
              </div>
              <input type="checkbox" className="switch lg" disabled={useApi() && k === 'email'} checked={prefsDraft.notifications[k]} onChange={(e) => setN(k, e.target.checked)} aria-label={t} />
            </div>
          ))}
        </section></div>
      )}

      {editingProfile && me && <MemberEditor member={me} onClose={() => { setEditingProfile(false); params.delete('perfil'); setParams(params, { replace: true }); }} />}

    </div>
  );
}
