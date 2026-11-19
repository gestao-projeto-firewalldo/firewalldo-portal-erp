import { useEffect, useState } from 'react';
import { FormDateInput } from '@/components/ui/DateInput';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Bookmark, BookmarkCheck, FilePlus2, Filter, FlaskConical, Sparkles } from 'lucide-react';
import { Async, DemoBadge, EmptyState, Modal, SearchInput, Skeleton } from '@/components/ui';
import { NewsCategoryBadge, NewsCover, ScriptModal } from '@/components/shared';
import { useTaskEditor } from '@/components/tasks/TaskEditor';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@/hooks/useQuery';
import { newsService, settingsService } from '@/services';
import { http, useApi } from '@/services/core';
import { useSession } from '@/context/SessionContext';
import { cx, longDate, newsDate } from '@/lib/labels';
import type { NewsCategory, NewsItem } from '@/types/models';

const categoryNames: Record<NewsCategory, string> = {
  ciberseguranca: 'Cibersegurança',
  redes: 'Redes',
  informatica: 'Informática',
  programacao: 'Programação',
  ia: 'Inteligência Artificial',
  privacidade: 'Privacidade e dados',
};

export default function News() {
  const [drafts,setDrafts]=useState(false);
  const q = useQuery(() => newsService.list(drafts),[drafts]);
  const { can } = useSession();
  const [publishing, setPublishing] = useState(false);
  const savedQ = useQuery(() => newsService.savedIds());
  const [params, setParams] = useSearchParams();
  const [category, setCategory] = useState<NewsCategory | ''>('');
  const [source, setSource] = useState('');
  const [onlySaved, setOnlySaved] = useState(false);
  const [search, setSearch] = useState('');
  const [reading, setReading] = useState<NewsItem | null>(null);
  const [scriptFor, setScriptFor] = useState<NewsItem | null | 'any'>(null);
  const openTask = useTaskEditor();
  const toast = useToast();

  const saved = savedQ.data ?? [];
  const all = q.data ?? [];
  const sources = Array.from(new Set(all.map((n) => n.source))).sort();

  useEffect(() => {
    const id = params.get('n');
    if (!id || !q.data) return;
    const n = q.data.find((x) => x.id === id);
    if (n) setReading(n);
    params.delete('n');
    setParams(params, { replace: true });
  }, [params, q.data, setParams]);

  const list = all
    .filter(
      (n) =>
        (!category || n.category === category) &&
        (!source || n.source === source) &&
        (!onlySaved || saved.includes(n.id)) &&
        (!search || `${n.title} ${n.summary} ${n.source}`.toLowerCase().includes(search.toLowerCase())),
    )
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.publishedAt.localeCompare(a.publishedAt));

  const [hero, ...rest] = list;
  const cards = rest.slice(0, 3);
  const older = rest.slice(3);

  const toggleSave = async (n: NewsItem) => {
    try {
      const ids = await newsService.toggleSave(n.id);
      toast({ tone: 'info', title: ids.includes(n.id) ? 'Notícia salva' : 'Removida dos salvos', description: n.title });
    } catch (error) {
      toast({ tone: 'error', title: 'Não foi possível salvar a notícia', description: (error as Error).message });
    }
  };

  const createTask = (n: NewsItem) =>
    openTask({
      prefill: {
        title: `Pauta: ${n.title}`,
        description: [n.summary, n.url].filter(Boolean).join('\n\n'),
        projectId: useApi() ? null : 'p-news',
        category: 'conteudo',
        status: 'backlog',
        open: true,
      },
    });

  const meta = (n: NewsItem) => (
    <span className="news-meta">
      {n.source}
      <i />
      {newsDate(n.publishedAt)}
    </span>
  );

  return (
    <div className="page">
      <div className="page-head news-page-head">
        <h1>Radar de notícias</h1>
        <div className="actions">
          <SearchInput className="news-search" value={search} onChange={setSearch} placeholder="Buscar por título, fonte ou assunto" />
          <label className="select-pill">
            <Filter size={18} />
            <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Fonte">
              <option value="">Fonte</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="select-pill">
            <select value={category} onChange={(e) => setCategory(e.target.value as NewsCategory | '')} aria-label="Categoria">
              <option value="">Categoria</option>
              {(Object.keys(categoryNames) as NewsCategory[]).map((c) => (
                <option key={c} value={c}>{categoryNames[c]}</option>
              ))}
            </select>
          </label>
          <button className={cx('select-pill', onlySaved && 'on')} onClick={() => setOnlySaved(!onlySaved)} aria-pressed={onlySaved} title="Mostrar só as salvas">
            <BookmarkCheck size={18} /> Salvas {saved.length > 0 && <span className="muted">({saved.length})</span>}
          </button>
          {!useApi() && <span className="sync-status"><FlaskConical size={18} /> Dados de demonstração</span>}
          {useApi() && can('noticias.curar') && (
            <><button className="btn" aria-pressed={drafts} onClick={()=>{setDrafts(!drafts);setReading(null);}}>{drafts ? 'Ver publicadas' : 'Para aprovação'}</button><button className="btn primary" onClick={() => setPublishing(true)}>Publicar notícia</button></>
          )}
        </div>
      </div>

      {publishing && <PublishNews onClose={() => setPublishing(false)} />}
      <Async
        q={q}
        loading={
          <div style={{ display: 'grid', gap: 20 }}>
            <Skeleton h={230} r={12} />
            <div className="news-cards">{[0, 1, 2].map((i) => <Skeleton key={i} h={250} r={12} />)}</div>
          </div>
        }
        empty={
          <div className="card">
            <EmptyState
              title={onlySaved ? 'Nenhuma notícia salva' : 'Nenhuma notícia encontrada'}
              description={onlySaved ? 'Use o marcador para salvar notícias.' : 'Tente outra categoria, fonte ou termo.'}
            />
          </div>
        }
        isEmpty={() => list.length === 0}
      >
        {() => (
          <>
            {hero && (
              <article className="card news-hero" onClick={() => setReading(hero)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setReading(hero)}>
                <NewsCover item={hero} className="news-cover hero" />
                <div className="news-hero-body">
                  <span className="badge green">
                    <BarChart3 /> {hero.featured ? 'Em destaque' : 'Mais recente'}
                  </span>
                  <h2>{hero.title}</h2>
                  <span className="news-meta">
                    {categoryNames[hero.category]}
                    <i />
                    {newsDate(hero.publishedAt)}
                  </span>
                </div>
              </article>
            )}

            {cards.length > 0 && (
              <div className="news-cards">
                {cards.map((n) => (
                  <article key={n.id} className="card news-card" onClick={() => setReading(n)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setReading(n)}>
                    <NewsCover item={n} />
                    <div className="news-body">
                      <h3>{n.title}</h3>
                      {meta(n)}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {older.length > 0 && (
              <>
                <h2 className="section-title">Notícias anteriores</h2>
                <div className="card news-table">
                  {older.map((n) => (
                    <div key={n.id} className="news-line" onClick={() => setReading(n)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setReading(n)}>
                      <NewsCover item={n} className="news-thumb" />
                      <b className="grow">{n.title}</b>
                      <span className="muted nl-source">{n.source}</span>
                      <span className="muted nl-date">{newsDate(n.publishedAt)}</span>
                      <button
                        className="icon-btn"
                        style={{ width: 36, height: 36 }}
                        aria-label={saved.includes(n.id) ? 'Remover dos salvos' : 'Salvar notícia'}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(n);
                        }}
                      >
                        {saved.includes(n.id) ? <BookmarkCheck size={20} style={{ color: 'var(--primary)' }} /> : <Bookmark size={20} />}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {!useApi() && <p className="muted small" style={{ marginTop: 16 }}>
              Todas as notícias e fontes desta página são fictícias, usadas apenas para testar a interface.
            </p>}
          </>
        )}
      </Async>

      {reading && (
        <Modal
          open
          onClose={() => setReading(null)}
          width={760}
          title={reading.title}
          subtitle={`${reading.source} · ${longDate(reading.publishedAt)} · ${reading.readMinutes} min de leitura`}
          footer={
            <>
              {drafts && can('noticias.curar') && <button className="btn primary" onClick={async()=>{try{await http.post(`/news/${reading.id}/publish`,{});setReading(null);toast({tone:'success',title:'Notícia publicada'});}catch(e){toast({tone:'error',title:'Não foi possível publicar',description:(e as Error).message});}}}>Aprovar publicação</button>}
              {can('noticias.curar') && <button className="btn danger" onClick={async()=>{if(!confirm('Excluir esta notícia do Radar?'))return;try{await http.del(`/news/${reading.id}`);setReading(null);toast({tone:'success',title:'Notícia excluída'});}catch(e){toast({tone:'error',title:'Não foi possível excluir',description:(e as Error).message});}}}>Excluir</button>}
              {!drafts && <button className="btn" onClick={() => toggleSave(reading)}>
                {saved.includes(reading.id) ? <BookmarkCheck /> : <Bookmark />} {saved.includes(reading.id) ? 'Salva' : 'Salvar'}
              </button>}
              {can('tarefas.criar') && <button
                className="btn"
                onClick={() => {
                  const n = reading;
                  setReading(null);
                  createTask(n);
                }}
              >
                <FilePlus2 /> Criar tarefa
              </button>}
              <button
                className="btn primary"
                onClick={() => {
                  setScriptFor(reading);
                  setReading(null);
                }}
              >
                <Sparkles /> Gerar roteiro
              </button>
            </>
          }
        >
          <div className="reader">
            <NewsCover item={reading} />
            {reading.imageCredit && <p className="small muted">{reading.imageCredit} {reading.imageSourceUrl && <a href={reading.imageSourceUrl} target="_blank" rel="noreferrer">Créditos e origem da imagem</a>}</p>}
            {reading.importedAt && <p className="small muted">Resumo preparado automaticamente a partir das fontes indicadas. Consulte as referências para o conteúdo completo.</p>}
            <div className="row" style={{ marginBottom: 14 }}>
              <NewsCategoryBadge c={reading.category} />
              {reading.isDemo && <DemoBadge>Notícia de demonstração</DemoBadge>}
            </div>
            <p style={{ fontWeight: 600 }}>{reading.summary}</p>
            {reading.url && !reading.isDemo && <p><a href={reading.url} target="_blank" rel="noreferrer">Abrir fonte original</a></p>}
            {!!reading.references?.length && <div><h3>Referências</h3><ul>{reading.references.map(ref=><li key={ref.url}><a href={ref.url} target="_blank" rel="noreferrer">{ref.title}</a></li>)}</ul></div>}
            {reading.body.map((p, i) => (
              <p key={i} className="muted">{p}</p>
            ))}
          </div>
        </Modal>
      )}

      {scriptFor && (
        <ScriptModal news={scriptFor === 'any' ? all : [scriptFor, ...all.filter((n) => n.id !== scriptFor.id)]} onClose={() => setScriptFor(null)} />
      )}
    </div>
  );
}

function PublishNews({ onClose }: { onClose: () => void }) {
  const sources = useQuery(() => settingsService.radarSources());
  const active = (sources.data ?? []).filter((source) => source.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  return (
    <Modal open onClose={onClose} title="Publicar notícia" error={error} width={680}>
      {sources.error && <p role="alert">{sources.error.message}</p>}
      {!sources.loading && !sources.error && !active.length && <p>Configure uma fonte ativa em Configurações → Integrações.</p>}
      <form className="form-grid" onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const body = String(data.get('body')).split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean);
        const words = body.join(' ').split(/\s+/).length;
        setSaving(true);
        setError('');
        try {
          await http.post('/news', {
            ...Object.fromEntries(data), body, cover: 'lock',
            readMinutes: Math.max(1, Math.ceil(words / 200)), featured: data.has('featured'),
          });
          toast({ tone: 'success', title: 'Notícia publicada' });
          onClose();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setSaving(false);
        }
      }}>
        <div className="field full"><label htmlFor="news-title">Título</label><input className="input" id="news-title" name="title" minLength={3} maxLength={250} required /></div>
        <div className="field"><label htmlFor="news-source">Fonte</label><select className="select" id="news-source" name="sourceId" required>
          <option value="">Selecione uma fonte</option>
          {active.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
        </select></div>
        <div className="field"><label htmlFor="news-category">Categoria</label><select className="select" id="news-category" name="category" required>
          {Object.entries(categoryNames).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></div>
        <div className="field"><label htmlFor="news-date">Data de publicação</label><FormDateInput id="news-date" name="publishedAt" required /></div>
        <div className="field"><label htmlFor="news-url">Link da notícia</label><input className="input" id="news-url" name="url" type="url" required /></div>
        <div className="field full"><label htmlFor="news-image">URL da imagem (opcional)</label><input className="input" id="news-image" name="imageUrl" type="url" placeholder="https://... (PNG, JPEG, WebP ou GIF, até 2 MB)" /></div><div className="field full"><label htmlFor="news-credit">Crédito da imagem</label><input className="input" id="news-credit" name="imageCredit" maxLength={500} /></div>
        <div className="field full"><label htmlFor="news-summary">Resumo</label><textarea className="input" id="news-summary" name="summary" rows={2} maxLength={1000} required /></div>
        <div className="field full"><label htmlFor="news-body">Texto da notícia</label><textarea className="input" id="news-body" name="body" rows={5} required /></div>
        <label className="row full"><input type="checkbox" name="featured" /> Colocar em destaque</label>

        <div className="actions full"><button className="btn primary" type="submit" disabled={saving || !active.length}>Publicar</button></div>
      </form>
    </Modal>
  );
}
