import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, FilePlus2, ImagePlus, Newspaper, Pencil, Plus, Sparkles, Star, Trash2, X } from 'lucide-react';
import { Async, ConfirmDialog, EmptyState, Modal, Skeleton } from '@/components/ui';
import { FormDateInput } from '@/components/ui/DateInput';
import { NewsCover, ScriptModal } from '@/components/shared';
import { useTaskEditor } from '@/components/tasks/TaskEditor';
import { useToast } from '@/context/ToastContext';
import { useSession } from '@/context/SessionContext';
import { useQuery } from '@/hooks/useQuery';
import { NEWS_LIMITS, newsService } from '@/services';
import { useApi } from '@/services/core';
import { resizeImage } from '@/lib/files';
import { cx, longDate, newsDate } from '@/lib/labels';
import type { NewsItem, NewsSlot } from '@/types/models';

export const slotLabel: Record<NewsSlot, string> = { principal: 'Principal', secundaria: 'Secundária', geral: 'Geral' };
const slotHint: Record<NewsSlot, string> = {
  principal: 'Card de grande destaque no topo, com imagem ampla.',
  secundaria: 'Cards menores com imagem, logo abaixo da principal.',
  geral: 'Lista compacta em texto, sem imagem.',
};

/** Radar de notícias V1.9: conteúdo cadastrado manualmente pela equipe (sem coleta automática). */
export default function News() {
  const q = useQuery(() => newsService.list());
  const { can } = useSession();
  const manage = can('noticias.curar');
  const [params, setParams] = useSearchParams();
  const [reading, setReading] = useState<NewsItem | null>(null);
  const [editing, setEditing] = useState<{ item?: NewsItem; slot?: NewsSlot } | null>(null);
  const [deleting, setDeleting] = useState<NewsItem | null>(null);
  const [scriptFor, setScriptFor] = useState<NewsItem | null>(null);
  const openTask = useTaskEditor();
  const toast = useToast();

  const all = q.data ?? [];
  const principal = all.find((n) => n.slot === 'principal');
  const secondary = all.filter((n) => n.slot === 'secundaria');
  const general = all.filter((n) => n.slot === 'geral');
  const used: Record<NewsSlot, number> = { principal: principal ? 1 : 0, secundaria: secondary.length, geral: general.length };
  const full = all.length >= 9;

  // Links da Visão geral: /radar?n=<id> abre a notícia.
  useEffect(() => {
    const id = params.get('n');
    if (!id || !q.data) return;
    const n = q.data.find((x) => x.id === id);
    if (n) setReading(n);
    params.delete('n');
    setParams(params, { replace: true });
  }, [params, q.data, setParams]);

  // Mantém a notícia aberta atualizada depois de uma edição.
  useEffect(() => {
    if (reading && q.data) setReading(q.data.find((n) => n.id === reading.id) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);

  const createTask = (n: NewsItem) =>
    openTask({ prefill: { title: `Pauta: ${n.title}`, description: [n.summary, n.url].filter(Boolean).join('\n\n'), projectId: null, category: 'conteudo', status: 'backlog', open: true } });

  const actions = (n: NewsItem) =>
    manage && (
      <div className="news-admin" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" aria-label={`Editar ${n.title}`} title="Editar" onClick={() => setEditing({ item: n })}><Pencil size={17} /></button>
        <button className="icon-btn danger" aria-label={`Excluir ${n.title}`} title="Excluir" onClick={() => setDeleting(n)}><Trash2 size={17} /></button>
      </div>
    );

  const open = (n: NewsItem) => ({ onClick: () => setReading(n), tabIndex: 0, role: 'button', onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && setReading(n) });

  return (
    <div className="page radar-page">
      <div className="page-head">
        <div>
          <h1>Radar de notícias</h1>
          <p className="muted">Notícias selecionadas pela equipe: 1 principal, até 3 secundárias e até 5 gerais.</p>
        </div>
        {manage && (
          <div className="actions">
            <button className="btn primary" onClick={() => setEditing({})} disabled={full} title={full ? 'As 9 posições estão ocupadas. Exclua ou edite uma notícia para liberar espaço.' : undefined}>
              <Plus /> Nova notícia
            </button>
          </div>
        )}
      </div>

      {manage && q.data && (
        <div className="slot-usage" aria-label="Vagas do Radar">
          {(Object.keys(NEWS_LIMITS) as NewsSlot[]).map((s) => (
            <span key={s} className={cx('slot-chip', used[s] >= NEWS_LIMITS[s] && 'full')}>
              {slotLabel[s]} <b>{used[s]}/{NEWS_LIMITS[s]}</b>
            </span>
          ))}
        </div>
      )}

      <Async
        q={q}
        loading={<div className="radar-grid"><Skeleton h={380} r={16} /><div className="radar-secondary">{[0, 1, 2].map((i) => <Skeleton key={i} h={300} r={16} />)}</div></div>}
        empty={
          <div className="card">
            <EmptyState
              icon={<Newspaper size={24} />}
              title="Nenhuma notícia publicada"
              description={manage ? 'Clique em "Nova notícia" para cadastrar a primeira.' : 'Assim que a equipe publicar, as notícias aparecem aqui.'}
              action={manage ? <button className="btn primary" onClick={() => setEditing({ slot: 'principal' })}><Plus /> Nova notícia</button> : undefined}
            />
          </div>
        }
        isEmpty={(d) => d.length === 0}
      >
        {() => (
          <div className="radar-grid">
            {principal ? (
              <article className="card radar-hero" {...open(principal)}>
                <NewsCover item={principal} className="radar-hero-img" />
                <div className="radar-hero-body">
                  <span className="badge radar-badge"><Star size={14} /> Destaque</span>
                  <h2>{principal.title}</h2>
                  <p className="clamp-3">{principal.summary}</p>
                  <span className="news-meta">{principal.source && <>{principal.source}<i /></>}{longDate(principal.publishedAt)}</span>
                </div>
                {actions(principal)}
              </article>
            ) : manage ? (
              <button className="card radar-hero radar-empty" onClick={() => setEditing({ slot: 'principal' })}>
                <Plus /> Adicionar notícia principal
              </button>
            ) : null}

            {(secondary.length > 0 || manage) && (
              <div className="radar-secondary">
                {secondary.map((n) => (
                  <article key={n.id} className="card radar-card" {...open(n)}>
                    <NewsCover item={n} className="radar-card-img" />
                    <div className="radar-card-body">
                      <h3 className="clamp-2">{n.title}</h3>
                      <p className="muted clamp-3">{n.summary}</p>
                      <span className="news-meta">{n.source && <>{n.source}<i /></>}{newsDate(n.publishedAt)}</span>
                    </div>
                    {actions(n)}
                  </article>
                ))}
                {manage && Array.from({ length: NEWS_LIMITS.secundaria - secondary.length }).map((_, i) => (
                  <button key={i} className="card radar-card radar-empty" onClick={() => setEditing({ slot: 'secundaria' })}>
                    <Plus /> Vaga de notícia secundária
                  </button>
                ))}
              </div>
            )}

            {(general.length > 0 || manage) && (
              <section className="card radar-general">
                <div className="card-head"><h2>Outras notícias</h2></div>
                {general.map((n) => (
                  <div key={n.id} className="radar-line" {...open(n)}>
                    <div className="grow">
                      <b className="clamp-2">{n.title}</b>
                      <p className="muted clamp-2">{n.summary}</p>
                    </div>
                    <span className="muted small nl-date">{newsDate(n.publishedAt)}</span>
                    {actions(n)}
                  </div>
                ))}
                {manage && general.length < NEWS_LIMITS.geral && (
                  <button className="radar-line radar-add" onClick={() => setEditing({ slot: 'geral' })}>
                    <Plus size={18} /> Adicionar notícia geral ({general.length}/{NEWS_LIMITS.geral})
                  </button>
                )}
              </section>
            )}
          </div>
        )}
      </Async>

      {reading && (
        <Modal
          open
          onClose={() => setReading(null)}
          width={780}
          title={reading.title}
          subtitle={[slotLabel[reading.slot ?? 'geral'], reading.source, longDate(reading.publishedAt), `${reading.readMinutes} min de leitura`].filter(Boolean).join(' · ')}
          footer={
            <>
              {manage && <button className="btn danger" onClick={() => { setDeleting(reading); }}><Trash2 /> Excluir</button>}
              {manage && <button className="btn" onClick={() => setEditing({ item: reading })}><Pencil /> Editar</button>}
              {can('tarefas.criar') && <button className="btn" onClick={() => { const n = reading; setReading(null); createTask(n); }}><FilePlus2 /> Criar tarefa</button>}
              <button className="btn primary" onClick={() => { setScriptFor(reading); setReading(null); }}><Sparkles /> Gerar roteiro</button>
            </>
          }
        >
          <div className="reader">
            {reading.imageUrl && <NewsCover item={reading} />}
            <p style={{ fontWeight: 600 }}>{reading.summary}</p>
            {reading.body.map((p, i) => <p key={i} className="muted">{p}</p>)}
            {reading.url && <p><a href={reading.url} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Abrir fonte original{reading.source ? ` (${reading.source})` : ''}</a></p>}
          </div>
        </Modal>
      )}

      {editing && <NewsEditor item={editing.item} initialSlot={editing.slot} used={used} onClose={() => setEditing(null)} />}

      {deleting && (
        <ConfirmDialog
          title="Excluir notícia"
          message="Deseja realmente excluir esta notícia? Esta ação não poderá ser desfeita."
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await newsService.remove(deleting.id);
            if (reading?.id === deleting.id) setReading(null);
            toast({ tone: 'success', title: 'Notícia excluída', description: 'A posição foi liberada no Radar.' });
          }}
        />
      )}

      {scriptFor && <ScriptModal news={[scriptFor, ...all.filter((n) => n.id !== scriptFor.id)]} onClose={() => setScriptFor(null)} />}
      {!useApi() && <p className="muted small" style={{ marginTop: 16 }}>Modo demonstração: as notícias desta página são fictícias.</p>}
    </div>
  );
}

/* ---------------- Cadastro e edição ---------------- */

function NewsEditor({ item, initialSlot, used, onClose }: { item?: NewsItem; initialSlot?: NewsSlot; used: Record<NewsSlot, number>; onClose: () => void }) {
  const toast = useToast();
  const firstFree = (['principal', 'secundaria', 'geral'] as NewsSlot[]).find((s) => used[s] < NEWS_LIMITS[s]) ?? 'geral';
  const [form, setForm] = useState({
    title: item?.title ?? '',
    summary: item?.summary ?? '',
    body: item?.body.join('\n\n') ?? '',
    slot: (item?.slot ?? initialSlot ?? firstFree) as NewsSlot,
    sourceName: item?.source ?? '',
    sourceUrl: item?.url ?? '',
    publishedAt: item?.publishedAt ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
  });
  /** undefined = manter a atual; "" = remover; data URL = nova imagem. */
  const [image, setImage] = useState<string | undefined>(undefined);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = image === undefined ? item?.imageUrl : image || undefined;
  const needsImage = form.slot !== 'geral';
  const available = (s: NewsSlot) => s === item?.slot || used[s] < NEWS_LIMITS[s];

  const pick = async (file?: File) => {
    if (!file) return;
    setPreparing(true); setError('');
    try { setImage(await resizeImage(file, 1920, 1_800_000)); }
    catch (e) { setError((e as Error).message); }
    finally { setPreparing(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const save = async () => {
    setError('');
    if (form.title.trim().length < 3) return setError('Informe o título da notícia (mínimo de 3 caracteres).');
    if (form.summary.trim().length < 10) return setError('Informe o resumo (mínimo de 10 caracteres).');
    if (form.body.trim().length < 20) return setError('Informe o texto completo da notícia (mínimo de 20 caracteres).');
    if (!available(form.slot)) {
      return setError(form.slot === 'principal'
        ? 'Já existe uma notícia principal cadastrada. Exclua ou altere a categoria da notícia atual para liberar esta posição.'
        : `As vagas de notícias ${form.slot === 'secundaria' ? 'secundárias' : 'gerais'} estão ocupadas. Exclua ou altere a categoria de uma delas.`);
    }
    if (needsImage && !preview) return setError('Envie a imagem de capa. Ela é obrigatória para notícias principais e secundárias.');
    if (form.sourceUrl.trim() && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(form.sourceUrl.trim())) return setError('O link da fonte deve começar com https://');
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(), summary: form.summary.trim(), body: form.body.trim(), slot: form.slot,
        sourceName: form.sourceName.trim(), sourceUrl: form.sourceUrl.trim(), publishedAt: form.publishedAt,
        // Notícias gerais não exibem imagem: ao mover para "Geral" a capa é mantida apenas se já existir.
        ...(image !== undefined ? { image } : {}),
      };
      if (item) await newsService.update(item.id, payload);
      else await newsService.create(payload);
      toast({ tone: 'success', title: item ? 'Notícia atualizada' : 'Notícia publicada', description: `${slotLabel[form.slot]} · ${payload.title}` });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title={item ? 'Editar notícia' : 'Nova notícia'}
      subtitle="Os campos com * são obrigatórios."
      icon={<span className="icon-tile"><Newspaper /></span>}
      width={720}
      error={error}
      footer={<><button className="btn" onClick={onClose} disabled={saving}>Cancelar</button><button className="btn primary" onClick={() => void save()} disabled={saving || preparing}>{saving ? 'Salvando…' : item ? 'Salvar alterações' : 'Publicar notícia'}</button></>}
    >
      <form className="form-grid" noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <fieldset className="field full slot-picker">
          <legend>Categoria *</legend>
          <div className="slot-options">
            {(['principal', 'secundaria', 'geral'] as NewsSlot[]).map((s) => {
              const ok = available(s);
              const count = used[s] - (item?.slot === s ? 1 : 0);
              return (
                <label key={s} className={cx('slot-option', form.slot === s && 'active', !ok && 'disabled')} title={!ok ? 'Categoria lotada' : undefined}>
                  <input type="radio" name="slot" value={s} checked={form.slot === s} disabled={!ok} onChange={() => setForm({ ...form, slot: s })} />
                  <b>{slotLabel[s]}</b>
                  <span className="small muted">{slotHint[s]}</span>
                  <span className={cx('small', ok ? 'muted' : 'danger-text')}>{ok ? `${count}/${NEWS_LIMITS[s]} ocupadas` : 'Lotada'}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="field full"><label htmlFor="nw-title">Título *</label><input id="nw-title" className="input" maxLength={250} autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div className="field full"><label htmlFor="nw-sum">Resumo *</label><textarea id="nw-sum" className="textarea" rows={2} maxLength={600} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /><span className="muted small">{form.summary.length}/600</span></div>
        <div className="field full"><label htmlFor="nw-body">Texto completo *</label><textarea id="nw-body" className="textarea" rows={8} maxLength={30000} value={form.body} placeholder="Separe os parágrafos com uma linha em branco." onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>

        {needsImage && (
          <div className="field full">
            <label>Imagem de capa *</label>
            <div className="news-image-field">
              {preview ? (
                <div className="news-image-preview"><img src={preview} alt="Pré-visualização da capa" /></div>
              ) : (
                <button type="button" className="news-image-drop" onClick={() => fileRef.current?.click()} disabled={preparing}>
                  <ImagePlus /> {preparing ? 'Preparando…' : 'Escolher imagem do computador ou celular'}
                </button>
              )}
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                <button type="button" className="btn sm" onClick={() => fileRef.current?.click()} disabled={preparing}><ImagePlus size={16} /> {preview ? 'Trocar imagem' : 'Enviar imagem'}</button>
                {preview && <button type="button" className="btn sm ghost" onClick={() => setImage('')}><X size={16} /> Remover</button>}
                <span className="muted small">PNG, JPG ou WEBP. Prefira imagens horizontais (16:9).</span>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => void pick(e.target.files?.[0])} />
          </div>
        )}

        <div className="field"><label htmlFor="nw-src">Fonte da informação</label><input id="nw-src" className="input" maxLength={120} placeholder="Ex.: CERT.br" value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} /></div>
        <div className="field"><label htmlFor="nw-url">Link da fonte original</label><input id="nw-url" className="input" inputMode="url" maxLength={2048} placeholder="https://" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} /></div>
        <div className="field"><label htmlFor="nw-date">Data de publicação</label><FormDateInput id="nw-date" value={form.publishedAt} onChange={(v) => setForm({ ...form, publishedAt: v })} /></div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
