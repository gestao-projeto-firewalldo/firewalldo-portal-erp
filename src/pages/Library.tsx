import { useApi } from '@/services/core';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  ExternalLink,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  HardDrive,
  LayoutGrid,
  List,
  PenTool,
  Upload,
} from 'lucide-react';
import { Async, Avatar, EmptyState, Modal, SearchInput, Seg, Skeleton } from '@/components/ui';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@/hooks/useQuery';
import { libraryService } from '@/services';
import { cx, fileKindLabel, fileSize, shortDate } from '@/lib/labels';
import type { FileKind, LibraryFile } from '@/types/models';

const kindIcon: Record<FileKind, typeof File> = {
  image: FileImage,
  pdf: FileText,
  video: FileVideo,
  audio: FileAudio,
  doc: FileText,
  design: PenTool,
  other: File,
};
const kindColor: Record<FileKind, string> = {
  image: '#f472b6',
  pdf: '#ef4444',
  video: '#a78bfa',
  audio: '#fb923c',
  doc: '#38bdf8',
  design: '#34d399',
  other: '#94a3b8',
};

export default function Library() {
  const foldersQ = useQuery(() => libraryService.folders());
  const filesQ = useQuery(() => libraryService.files());
  const { membersById, can } = useSession();
  const [params, setParams] = useSearchParams();
  const [folder, setFolder] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try {
      return (localStorage.getItem('fw:lib-view') as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [kind, setKind] = useState<FileKind | 'all'>('all');
  const [preview, setPreview] = useState<LibraryFile | null>(null);
  const [upload, setUpload] = useState(false);
  // URLs locais de arquivos adicionados nesta sessão (não persistem)
  const [localUrls, setLocalUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      localStorage.setItem('fw:lib-view', view);
    } catch {
      /* ignora */
    }
  }, [view]);

  useEffect(() => {
    if (params.get('enviar')) {
      setUpload(true);
      params.delete('enviar');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const folders = foldersQ.data ?? [];
  const files = (filesQ.data ?? []).map((f) => ({ ...f, previewUrl: f.previewUrl ?? localUrls[f.id] }));
  const list = files.filter(
    (f) =>
      (folder === 'all' || f.folderId === folder) &&
      (kind === 'all' || f.kind === kind) &&
      (!search || `${f.name} ${f.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())),
  );
  const folderName = (id: string) => folders.find((x) => x.id === id)?.name ?? '—';

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>
            <Folder /> Biblioteca
          </h1>
          <p>{useApi() ? 'O upload de arquivos ainda está indisponível.' : 'Central de arquivos de demonstração.'}</p>
        </div>
        <div className="actions">
          <a className="btn outline" href="https://drive.google.com/" target="_blank" rel="noreferrer" title="Link de exemplo configurável">
            <HardDrive /> Abrir Drive
          </a>
          {!useApi() && can('biblioteca.enviar') && (
            <button className="btn primary" onClick={() => setUpload(true)}>
              <Upload /> Enviar arquivo
            </button>
          )}
        </div>
      </div>

      <div className="notice" style={{ marginBottom: 18 }}>
        <HardDrive />
        <div>
          <b>Integração com Google Drive reservada.</b> Nesta versão os arquivos são exemplos locais e os botões “Abrir no Drive”
          apontam para links configuráveis. A sincronização real será feita pelo Back-end.
        </div>
      </div>

      <div className="lib">
        <nav className="card folder-list" aria-label="Pastas">
          <button className={cx('folder-btn', folder === 'all' && 'active')} onClick={() => setFolder('all')}>
            <FolderOpen size={20} /> Todos os arquivos <span className="n">{files.length}</span>
          </button>
          {foldersQ.loading && !foldersQ.data
            ? [0, 1, 2, 3].map((i) => <Skeleton key={i} h={38} />)
            : folders.map((f) => (
                <button
                  key={f.id}
                  className={cx('folder-btn', folder === f.id && 'active')}
                  style={{ '--c': f.color } as CSSProperties}
                  onClick={() => setFolder(f.id)}
                >
                  <Folder size={20} fill="currentColor" fillOpacity={0.2} /> {f.name}
                  <span className="n">{files.filter((x) => x.folderId === f.id).length}</span>
                </button>
              ))}
        </nav>

        <div style={{ minWidth: 0 }}>
          <div className="toolbar">
            <SearchInput className="grow" value={search} onChange={setSearch} placeholder="Pesquisar arquivos…" />
            <select className="select" style={{ width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value as FileKind | 'all')} aria-label="Tipo">
              <option value="all">Todos os tipos</option>
              {Object.entries(fileKindLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Seg
              value={view}
              onChange={setView}
              options={[
                { value: 'grid', icon: <LayoutGrid />, title: 'Grade' },
                { value: 'list', icon: <List />, title: 'Lista' },
              ]}
            />
          </div>

          <Async
            q={filesQ}
            loading={<div className="files-grid">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} h={190} r={18} />)}</div>}
            empty={<div className="card"><EmptyState title="Nenhum arquivo encontrado" description="Tente outra pasta, tipo ou termo de busca." /></div>}
            isEmpty={() => list.length === 0}
          >
            {() =>
              view === 'grid' ? (
                <div className="files-grid stagger">
                  {list.map((f) => {
                    const Icon = kindIcon[f.kind];
                    return (
                      <button key={f.id} className="card hover file-card" onClick={() => setPreview(f)}>
                        <div className="file-thumb" style={{ '--c': kindColor[f.kind] } as CSSProperties}>
                          {f.kind === 'image' && f.previewUrl ? (
                            <img src={f.previewUrl} alt="" loading="lazy" />
                          ) : f.kind === 'video' && f.previewUrl ? (
                            <video src={f.previewUrl} muted playsInline preload="metadata" />
                          ) : (
                            <Icon />
                          )}
                          <span className="badge kind" style={{ background: kindColor[f.kind], color: '#fff', borderColor: 'transparent' }}>
                            {fileKindLabel[f.kind]}
                          </span>
                        </div>
                        <div className="file-info">
                          <b className="ellipsis">{f.name}</b>
                          <span className="muted small">
                            {fileSize(f.sizeBytes)} · {shortDate(f.updatedAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="card" style={{ overflowX: 'auto' }}>
                  <table className="file-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th className="hide-sm">Pasta</th>
                        <th className="hide-sm">Responsável</th>
                        <th>Tamanho</th>
                        <th className="hide-sm">Atualizado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((f) => {
                        const Icon = kindIcon[f.kind];
                        const owner = membersById[f.ownerId];
                        return (
                          <tr key={f.id} onClick={() => setPreview(f)}>
                            <td>
                              <span className="row">
                                <Icon size={20} style={{ color: kindColor[f.kind], flex: 'none' }} />
                                <span className="ellipsis" style={{ maxWidth: 320 }}>{f.name}</span>
                              </span>
                            </td>
                            <td className="hide-sm muted">{folderName(f.folderId)}</td>
                            <td className="hide-sm">
                              {owner && (
                                <span className="row small">
                                  <Avatar member={owner} size={24} /> {owner.name.split(' ')[0]}
                                </span>
                              )}
                            </td>
                            <td className="muted">{fileSize(f.sizeBytes)}</td>
                            <td className="hide-sm muted">{shortDate(f.updatedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
          </Async>
        </div>
      </div>

      {preview && (
        <PreviewModal
          file={preview}
          folderName={folderName(preview.folderId)}
          ownerName={membersById[preview.ownerId]?.name}
          onClose={() => setPreview(null)}
        />
      )}
      {upload && (
        <UploadModal
          folders={folders}
          defaultFolder={folder === 'all' ? folders[0]?.id : folder}
          onAdded={(id, url) => setLocalUrls((m) => ({ ...m, [id]: url }))}
          onClose={() => setUpload(false)}
        />
      )}
    </div>
  );
}

function PreviewModal({ file, folderName, ownerName, onClose }: { file: LibraryFile; folderName: string; ownerName?: string; onClose: () => void }) {
  const Icon = kindIcon[file.kind];
  const canRender = !!file.previewUrl && ['image', 'video', 'audio', 'pdf'].includes(file.kind);
  return (
    <Modal
      open
      onClose={onClose}
      width={820}
      title={file.name}
      subtitle={`${fileKindLabel[file.kind]} · ${fileSize(file.sizeBytes)} · ${folderName}`}
      icon={<span className="icon-tile" style={{ '--c': kindColor[file.kind] } as CSSProperties}><Icon /></span>}
      footer={
        <>
          <span className="muted small" style={{ marginRight: 'auto' }}>
            {ownerName && `Enviado por ${ownerName} · `}atualizado em {shortDate(file.updatedAt)}
          </span>
          {file.driveUrl ? (
            <a className="btn" href={file.driveUrl} target="_blank" rel="noreferrer" title="Link de exemplo (sem integração real)">
              <ExternalLink /> Abrir no Drive
            </a>
          ) : (
            <button className="btn" disabled title="Arquivo local: ainda não está no Drive">
              <ExternalLink /> Abrir no Drive
            </button>
          )}
          {file.previewUrl ? (
            <a className="btn primary" href={file.previewUrl} download={file.name}>
              <Download /> Baixar
            </a>
          ) : (
            <button className="btn primary" disabled title="Download disponível após a integração com o Drive">
              <Download /> Baixar
            </button>
          )}
        </>
      }
    >
      <div className="preview-stage">
        {canRender && file.kind === 'image' && <img src={file.previewUrl} alt={file.name} />}
        {canRender && file.kind === 'video' && <video src={file.previewUrl} controls autoPlay loop muted playsInline />}
        {canRender && file.kind === 'audio' && <audio src={file.previewUrl} controls />}
        {canRender && file.kind === 'pdf' && <iframe src={file.previewUrl} title={file.name} style={{ width: '100%', height: '56vh', border: 0 }} />}
        {!canRender && (
          <div className="state">
            <span className="icon-tile" style={{ '--c': kindColor[file.kind], '--s': '72px' } as CSSProperties}><Icon /></span>
            <h3>Prévia indisponível na demonstração</h3>
            <p>Este é um arquivo de exemplo sem conteúdo real. A prévia funcionará com os arquivos do Drive.</p>
          </div>
        )}
      </div>
      <div className="chips">
        {file.tags.map((t) => <span key={t} className="tag">#{t}</span>)}
      </div>
    </Modal>
  );
}

function UploadModal({
  folders,
  defaultFolder,
  onAdded,
  onClose,
}: {
  folders: { id: string; name: string }[];
  defaultFolder?: string;
  onAdded: (id: string, url: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState(defaultFolder ?? '');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);

  const handle = async (list: FileList | null) => {
    if (!list?.length || !folder) return;
    setBusy(true);
    for (const f of Array.from(list)) {
      const entry = await libraryService.addLocal(f, folder);
      if (entry.previewUrl) onAdded(entry.id, entry.previewUrl);
    }
    setBusy(false);
    toast({ tone: 'success', title: `${list.length} arquivo(s) adicionado(s)`, description: 'Somente nesta sessão do navegador — não foi enviado a nenhum servidor.' });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Enviar arquivo" subtitle="Simulação local: o arquivo não sai do seu computador." icon={<span className="icon-tile"><Upload /></span>} width={560}>
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="up-f">Pasta de destino</label>
        <select id="up-f" className="select" value={folder} onChange={(e) => setFolder(e.target.value)}>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <div
        className={cx('dropzone', drag && 'drag')}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
      >
        {busy ? <span className="spinner" /> : <Upload />}
        <b>Arraste arquivos aqui ou clique para escolher</b>
        <span className="small">Imagens, PDFs, vídeos e áudios podem ser pré-visualizados.</span>
        <input ref={input} type="file" multiple hidden onChange={(e) => handle(e.target.files)} />
      </div>
      <div className="notice warn" style={{ marginTop: 14 }}>
        <HardDrive />
        <div>O envio real para o Google Drive será habilitado na etapa do Back-end.</div>
      </div>
    </Modal>
  );
}
