import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Camera, Trash2, ZoomIn } from 'lucide-react';
import { Avatar, ConfirmDialog, Modal } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { photoService } from '@/services';
import { canvasToDataUrl, IMAGE_TYPES, loadImage } from '@/lib/files';
import type { Member } from '@/types/models';

const VIEW = 280; // área de recorte na tela (px)
const OUTPUT = 384; // tamanho final salvo (px)

/** Área "Foto de perfil" da janela Meu perfil: adicionar, alterar (com recorte) e remover. */
export function ProfilePhoto({ member }: { member: Member }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const pick = (file?: File) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return toast({ tone: 'error', title: 'Formato não aceito', description: 'Use uma imagem JPG, PNG ou WEBP.' });
    if (file.size > 15 * 1024 * 1024) return toast({ tone: 'error', title: 'Imagem muito grande', description: 'Escolha uma imagem de até 15 MB.' });
    setSource(URL.createObjectURL(file));
  };

  return (
    <div className="profile-photo field full">
      <label>Foto de perfil</label>
      <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
        <Avatar member={member} size={84} />
        <div className="profile-photo-actions">
          <button type="button" className="btn sm" onClick={() => fileRef.current?.click()}>
            <Camera size={16} /> {member.avatarUrl ? 'Alterar foto' : 'Adicionar foto'}
          </button>
          {member.avatarUrl && (
            <button type="button" className="btn sm ghost" onClick={() => setRemoving(true)}>
              <Trash2 size={16} /> Remover foto
            </button>
          )}
          <span className="muted small">JPG, PNG ou WEBP. Sem foto, aparecem as iniciais ({member.initials}).</span>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
      {source && <PhotoCropper source={source} member={member} onClose={() => { URL.revokeObjectURL(source); setSource(null); }} />}
      {removing && (
        <ConfirmDialog
          title="Remover foto"
          message="A foto será removida e o avatar voltará a mostrar as iniciais."
          confirmLabel="Remover foto"
          onClose={() => setRemoving(false)}
          onConfirm={async () => { await photoService.remove(member.id); toast({ tone: 'success', title: 'Foto removida' }); }}
        />
      )}
    </div>
  );
}

function PhotoCropper({ source, member, onClose }: { source: string; member: Member; onClose: () => void }) {
  const toast = useToast();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => { loadImage(source).then(setImg).catch((e: Error) => setError(e.message)); }, [source]);

  // Escala base: a imagem cobre todo o quadrado; o zoom aumenta a partir daí.
  const base = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = base * zoom;
  const w = img ? img.naturalWidth * scale : VIEW;
  const h = img ? img.naturalHeight * scale : VIEW;
  const clamp = (o: { x: number; y: number }) => ({
    x: Math.min(0, Math.max(VIEW - w, o.x)),
    y: Math.min(0, Math.max(VIEW - h, o.y)),
  });
  const pos = clamp(offset);

  useEffect(() => { if (img) setOffset({ x: (VIEW - w) / 2, y: (VIEW - h) / 2 }); /* centraliza ao abrir */ }, [img]); // eslint-disable-line react-hooks/exhaustive-deps

  const onZoom = (value: number) => {
    // Mantém o centro do recorte ao aproximar/afastar.
    const cx = (VIEW / 2 - pos.x) / scale, cy = (VIEW / 2 - pos.y) / scale;
    const next = base * value;
    setZoom(value);
    setOffset({ x: VIEW / 2 - cx * next, y: VIEW / 2 - cy * next });
  };
  const down = (e: ReactPointerEvent) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y }; };
  const move = (e: ReactPointerEvent) => { if (drag.current) setOffset(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y })); };
  const up = () => { drag.current = null; };

  const save = async () => {
    if (!img) return;
    setSaving(true); setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = OUTPUT;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';
      const sx = -pos.x / scale, sy = -pos.y / scale, size = VIEW / scale;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, OUTPUT, OUTPUT);
      await photoService.save(member.id, canvasToDataUrl(canvas, 900 * 1024));
      toast({ tone: 'success', title: 'Foto atualizada', description: 'A nova foto já aparece para a equipe.' });
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
      title="Ajustar foto"
      subtitle="Arraste para posicionar e use o zoom. A área do quadrado será a sua foto."
      width={420}
      error={error}
      footer={<><button className="btn" onClick={onClose} disabled={saving}>Cancelar</button><button className="btn primary" onClick={() => void save()} disabled={saving || !img}>{saving ? 'Salvando…' : 'Salvar foto'}</button></>}
    >
      <div className="cropper">
        <div className="cropper-view" style={{ width: VIEW, height: VIEW }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {img && <img src={source} alt="" draggable={false} style={{ width: w, height: h, transform: `translate(${pos.x}px, ${pos.y}px)` }} />}
          <span className="cropper-ring" aria-hidden />
        </div>
        <label className="cropper-zoom">
          <ZoomIn size={18} />
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => onZoom(Number(e.target.value))} aria-label="Zoom da foto" />
        </label>
      </div>
    </Modal>
  );
}
