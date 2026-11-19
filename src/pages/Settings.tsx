import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bug, Check, KeyRound, Pencil, Plus, RotateCcw, Save } from 'lucide-react';
import { Avatar, Modal, Skeleton } from '@/components/ui';
import { PushSettings } from '@/components/notifications/PushSettings';
import { RadarSettings } from '@/components/radar/RadarSettings';
import { MemberEditor } from '@/components/users/MemberEditor';
import { QuickIcon } from '@/components/shared';
import { usePrefs } from '@/context/PrefsContext';
import { rolePermissions, useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@/hooks/useQuery';
import { authService, devFlags, membersService, mockDb, settingsService, uid } from '@/services';
import { cx, roleLabel } from '@/lib/labels';
import { appConfig } from '@/config';
import { useApi } from '@/services/core';
import type { Permission, RadarSource, Shortcut, UserPreferences } from '@/types/models';

type Tab = 'geral' | 'integracoes' | 'notificacoes';
const tabs: { id: Tab; label: string }[] = [
  { id: 'geral', label: 'Geral' },
  { id: 'integracoes', label: 'Integrações' },
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
  'noticias.curar': 'Curar notícias do Radar',
  'relatorios.ver': 'Ver relatórios',
  'configuracoes.integracoes': 'Editar fontes do radar e atalhos',
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function SettingsPage() {
  const { me, can } = useSession();
  const { prefs, setPrefs } = usePrefs();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [editingProfile, setEditingProfile] = useState(params.get('perfil') === 'editar');
  const [tab, setTab] = useState<Tab>(() => (params.get('aba') as Tab) || 'geral');
  const sourcesQ = useQuery(() => settingsService.radarSources());
  const shortcutsQ = useQuery(() => settingsService.shortcuts());

  // Rascunhos — só valem ao clicar em "Salvar alterações"
  const [profile, setProfile] = useState({ name: '', title: '', bio: '' });
  const [prefsDraft, setPrefsDraft] = useState<UserPreferences>(prefs);
  const [sources, setSources] = useState<RadarSource[] | null>(null);
  const [shortcuts, setShortcuts] = useState<Shortcut[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingSource,setEditingSource]=useState<RadarSource|null>(null);
  const [forceError, setForceError] = useState(devFlags.forceError);
  const viewAs = useApi() ? me?.role : mockDb.get().viewAsRole;
  const canIntegr = can('configuracoes.integracoes');

  useEffect(() => { setPrefsDraft(prefs); }, [prefs]);
  useEffect(() => {
    if (me) setProfile({ name: me.name, title: me.title, bio: me.bio ?? '' });
  }, [me?.id, me?.name, me?.title, me?.bio]);
  useEffect(() => {
    if (sourcesQ.data && sources === null) setSources(sourcesQ.data);
  }, [sourcesQ.data, sources]);
  useEffect(() => {
    if (shortcutsQ.data && shortcuts === null) setShortcuts(shortcutsQ.data);
  }, [shortcutsQ.data, shortcuts]);

  const dirty = useMemo(
    () =>
      (!!me && (profile.name !== me.name || profile.title !== me.title || profile.bio !== (me.bio ?? ''))) ||
      !same(prefsDraft, prefs) ||
      (!!sources && !!sourcesQ.data && !same(sources, sourcesQ.data)) ||
      (!!shortcuts && !!shortcutsQ.data && !same(shortcuts, shortcutsQ.data)),
    [me, profile, prefsDraft, prefs, sources, sourcesQ.data, shortcuts, shortcutsQ.data],
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
    const bad = (shortcuts ?? []).find((s) => s.url && !/^https?:\/\//i.test(s.url));
    if (bad) {
      toast({ tone: 'error', title: 'Link inválido', description: `${bad.label}: use um endereço começando com https://` });
      go('integracoes');
      return;
    }
    setSaving(true);
    try {
      if (me && !same(profile, { name: me.name, title: me.title, bio: me.bio ?? '' })) await membersService.update(me.id, profile);
      if (!same(prefsDraft, prefs)) await setPrefs(prefsDraft);
      if (sources && canIntegr && !same(sources, sourcesQ.data)) await settingsService.saveRadarSources(sources);
      if (shortcuts && canIntegr && !same(shortcuts, shortcutsQ.data)) await settingsService.saveShortcuts(shortcuts);
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
                <p>O tema é aplicado e salvo ao selecionar. Seguir o sistema acompanha a aparência do dispositivo.</p>
              </div>
            </div>
            <div className="theme-opts">
              {([
                { v: 'dark', l: 'Escuro (padrão)', bg: '#0b1426' },
                { v: 'light', l: 'Claro', bg: '#f4f6fa' },
                { v: 'system', l: 'Seguir o sistema', bg: 'linear-gradient(135deg,#0b1426 50%,#f4f6fa 50%)' },
              ] as const).map((t) => (
                <button key={t.v} className={cx('theme-opt', prefsDraft.theme === t.v && 'active')} onClick={async () => { try { await setPrefs({ ...prefsDraft, theme: t.v }); } catch (error) { toast({ tone: 'error', title: 'Não foi possível salvar o tema', description: (error as Error).message }); } }}>
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
                onClick={() => {
                  if (!confirm('Restaurar todos os dados de demonstração? As alterações locais serão perdidas.')) return;
                  mockDb.reset();
                  setPrefs(mockDb.get().preferences);
                  setPrefsDraft(mockDb.get().preferences);
                  setSources(null);
                  setShortcuts(null);
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

      {/* ===================== INTEGRAÇÕES ===================== */}
      {tab === 'integracoes' && (
        <div className="settings-stack">
          <section className="card settings-section">
            <div className="section-head">
              <div>
                <h2>Fontes do radar</h2>
                <p>Os sites das fontes ativas delimitam a pesquisa automática e ficam disponíveis para publicação manual.</p>
              </div>
              {canIntegr && (
                <button className="btn outline-primary" onClick={() => setAdding(true)}>
                  <Plus /> Adicionar fonte
                </button>
              )}
            </div>
            {!sources ? (
              <Skeleton h={210} />
            ) : (
              <div className="boxed-list">
                {sources.map((s) => (
                  <div key={s.id} className="source-row">
                    <span className="source-logo">{s.short}</span>
                    <div className="grow source-info">
                      <b>{s.name}</b>
                      <div className="muted">{s.description}</div><a className="small" href={s.url} target="_blank" rel="noreferrer">{s.url}</a>
                    </div>
                    <div className="source-controls">
                    <button className="btn icon source-edit" disabled={!canIntegr} aria-label={`Editar fonte ${s.name}`} onClick={()=>setEditingSource(s)}><Pencil /></button>
                    <span className={cx('state-pill', s.active ? 'on' : 'off')}>
                      <i /> {s.active ? 'Ativa' : 'Pausada'}
                    </span>
                    <input
                      type="checkbox"
                      className="switch lg source-toggle"
                      checked={s.active}
                      disabled={!canIntegr}
                      onChange={(e) => setSources(sources.map((x) => (x.id === s.id ? { ...x, active: e.target.checked } : x)))}
                      aria-label={`${s.active ? 'Pausar' : 'Ativar'} ${s.name}`}
                    />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="muted small" style={{ marginTop: 12 }}>
              {useApi() ? 'Somente notícias de fontes ativas aparecem no Radar.' : 'O Radar usa notícias de demonstração.'}
            </p>
          </section>

          <RadarSettings disabled={!canIntegr} />
          <section className="card settings-section">
            <div className="section-head">
              <div>
                <h2>Atalhos da equipe</h2>
                <p>Gerencie os links rápidos usados pela equipe no dia a dia.</p>
              </div>
            </div>
            {!shortcuts ? (
              <Skeleton h={300} />
            ) : (
              <div className="shortcut-list">
                {shortcuts.map((s) => (
                  <ShortcutRow
                    key={s.id}
                    item={s}
                    disabled={!canIntegr}
                    onSave={async (url) => {
                      const item = await settingsService.saveShortcut(s.id, url);
                      setShortcuts(current => current?.map(x => x.id === item.id ? item : x) ?? null);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
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

      {editingSource && sources && <AddSourceModal source={editingSource} onClose={()=>setEditingSource(null)} onAdd={source=>{setSources(sources.map(s=>s.id===source.id?source:s));setEditingSource(null);toast({tone:'info',title:'Fonte alterada',description:'Clique em Salvar alterações para confirmar.'});}} />}
      {adding && sources && (
        <AddSourceModal
          onClose={() => setAdding(false)}
          onAdd={(src) => {
            setSources([...sources, src]);
            setAdding(false);
            toast({ tone: 'info', title: 'Fonte adicionada', description: 'Clique em “Salvar alterações” para confirmar.' });
          }}
        />
      )}
    </div>
  );
}

function ShortcutRow({ item, disabled, onSave }: { item: Shortcut; disabled: boolean; onSave: (url: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { if (!editing) setDraft(item.url); }, [item.url, editing]);
  const save = async () => {
    let url = draft.trim();
    if (url && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
    if (url) {
      try { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw new Error(); }
      catch { setError('Informe um endereço válido, como https://exemplo.com.'); return; }
    }
    setSaving(true); setError('');
    try { await onSave(url); setDraft(url); setEditing(false); toast({ tone:'success', title:'Atalho salvo', description:item.label }); }
    catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  };
  return <div className="shortcut-row">
    <span className="sc-icon"><QuickIcon name={item.icon} /></span><b className="sc-label">{item.label}</b>
    <input ref={inputRef} className="input" value={draft} readOnly={!editing} placeholder="Link não configurado" onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && editing) void save(); }} aria-label={`Link de ${item.label}`} />
    <div className="shortcut-actions">{editing ? <><button className="btn primary" disabled={saving} onClick={() => void save()} aria-label={`Salvar ${item.label}`}>{saving ? 'Salvando…' : 'Salvar'}</button><button className="btn" disabled={saving} onClick={() => { setDraft(item.url); setEditing(false);setError(''); }}>Cancelar</button></> : <button className="btn icon" disabled={disabled} onClick={() => setEditing(true)} aria-label={`Editar ${item.label}`}><Pencil /></button>}</div>
    {error && <p className="form-error" style={{flexBasis:'100%'}} role="alert">{error}</p>}
  </div>;
}

function AddSourceModal({ source, onClose, onAdd }: { source?:RadarSource; onClose: () => void; onAdd: (s: RadarSource) => void }) {
  const [name, setName] = useState(source?.name ?? '');
  const [url, setUrl] = useState(source?.url ?? '');
  const [description, setDescription] = useState(source?.description ?? '');
  const [err, setErr] = useState('');
  const submit = () => {
    if (name.trim().length < 2) return setErr('Informe o nome da fonte.');
    if (!/^https?:\/\//i.test(url.trim())) return setErr('Informe o site da fonte começando com https://');
    const short = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
    onAdd({ id: source?.id ?? uid('src'), name: name.trim(), url: url.trim(), description: description.trim(), short, active: source?.active ?? true });
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={source ? "Editar fonte" : "Adicionar fonte"}
      error={err}
      subtitle="Informe o site da fonte. A pesquisa automática é limitada ao domínio e aos subdomínios desse endereço."
      width={540}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={submit}><Plus /> {source ? 'Concluir edição' : 'Adicionar'}</button>
        </>
      }
    >
      <div className="form-grid">
        <div className="field full">
          <label htmlFor="s-n">Nome *</label>
          <input id="s-n" className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field full">
          <label htmlFor="s-u">Site da fonte *</label>
          <input id="s-u" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </div>
        <div className="field full">
          <label htmlFor="s-d">Descrição</label>
          <input id="s-d" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        {err && <div className="full small" style={{ color: 'var(--danger)' }}>{err}</div>}
      </div>
    </Modal>
  );
}
