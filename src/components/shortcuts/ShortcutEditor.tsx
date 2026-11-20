import { useEffect, useRef, useState } from 'react';
import { ClipboardPaste, ImagePlus, Link2, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui';
import { ShortcutLogo } from '@/components/shared';
import { useToast } from '@/context/ToastContext';
import { settingsService } from '@/services';
import type { Shortcut } from '@/types/models';

const MAX_SIDE = 160; // px — a logo é exibida com no máximo ~48px, 160 dá folga para telas retina
const MAX_BYTES = 250 * 1024;

/** Normaliza o endereço colado: aceita "site.com" e devolve "https://site.com". */
export function normalizeUrl(raw: string): string | null {
  let url = raw.trim();
  if (!url) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) return null;
    return url;
  } catch {
    return null;
  }
}

/** Reduz a imagem escolhida para no máximo 160px e devolve um data URL leve (webp, ou png como reserva). */
async function toLogoDataUrl(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Use uma imagem PNG, JPG, WEBP ou GIF.');
  if (file.size > 8 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 8 MB.');
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      el.src = src;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL('image/webp', 0.9);
    if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/png');
    if (data.length * 0.75 > MAX_BYTES) throw new Error('A imagem ficou grande demais. Tente outra mais simples.');
    return data;
  } finally {
    URL.revokeObjectURL(src);
  }
}

/**
 * Modal de criar/editar um atalho do "Acesso rápido".
 * `item` ausente = novo atalho (campos em branco).
 */
export function ShortcutEditor({ item, onClose }: { item?: Shortcut; onClose: () => void }) {
  const toast = useToast();
  const [label, setLabel] = useState(item?.label ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [image, setImage] = useState(item?.image ?? '');
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      toast({ tone: 'info', title: 'Cole com Ctrl+V', description: 'O navegador não liberou a área de transferência.' });
    }
  };

  const pickImage = async (file?: File) => {
    if (!file) return;
    setError('');
    try { setImage(await toLogoDataUrl(file)); }
    catch (e) { setError((e as Error).message); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  };

  const save = async () => {
    const finalUrl = normalizeUrl(url);
    if (finalUrl === null) { setError('Informe um endereço válido, como https://exemplo.com.'); return; }
    if (item && !label.trim()) { setError('Informe o nome do atalho.'); return; }
    setSaving(true); setError('');
    try {
      const data = { label: label.trim() || 'Novo atalho', url: finalUrl, image };
      if (item) await settingsService.updateShortcut(item.id, data);
      else await settingsService.createShortcut(data);
      toast({ tone: 'success', title: item ? 'Atalho atualizado' : 'Atalho adicionado', description: data.label });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!item) return;
    if (!confirmRemove) { setConfirmRemove(true); return; }
    setSaving(true); setError('');
    try {
      await settingsService.removeShortcut(item.id);
      toast({ tone: 'success', title: 'Atalho removido', description: item.label });
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const preview = { icon: item?.icon ?? 'link', image, label };

  return (
    <Modal
      open
      onClose={() => !saving && onClose()}
      title={item ? 'Editar atalho' : 'Novo atalho'}
      subtitle="Nome, link e logo exibidos no Acesso rápido."
      icon={<Link2 />}
      width={520}
      error={error}
      footer={
        <div className="sc-editor-footer">
          {item && (
            <button className="btn danger" disabled={saving} onClick={() => void remove()}>
              <Trash2 /> {confirmRemove ? 'Confirmar remoção' : 'Remover'}
            </button>
          )}
          <span className="grow" />
          <button className="btn" disabled={saving} onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={saving} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      }
    >
      <div className="sc-editor">
        <div className="sc-editor-logo">
          <button type="button" className="sc-logo-pick" onClick={() => fileRef.current?.click()} title="Trocar logo" aria-label="Trocar logo">
            <ShortcutLogo item={preview} />
            <span className="sc-logo-hint"><ImagePlus size={16} /></span>
          </button>
          <div className="sc-logo-actions">
            <button type="button" className="btn sm" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> {image ? 'Trocar imagem' : 'Enviar imagem'}</button>
            {image && <button type="button" className="btn sm ghost" onClick={() => setImage('')}><X size={16} /> Tirar imagem</button>}
            <span className="muted small">PNG, JPG, WEBP ou GIF. Fundo transparente fica melhor.</span>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => void pickImage(e.target.files?.[0])} />
        </div>

        <div className="field">
          <label htmlFor="sc-name">Nome</label>
          <input id="sc-name" ref={nameRef} className="input" value={label} maxLength={100} placeholder="Ex.: Canva" onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void save()} />
        </div>

        <div className="field">
          <label htmlFor="sc-url">Link</label>
          <div className="sc-url-row">
            <input id="sc-url" className="input" value={url} maxLength={2048} placeholder="Cole a URL aqui (https://…)" inputMode="url" onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void save()} />
            <button type="button" className="btn" onClick={() => void paste()} title="Colar da área de transferência"><ClipboardPaste size={18} /> Colar</button>
          </div>
        </div>

        {confirmRemove && <p className="form-error" role="alert">Clique em “Confirmar remoção” para apagar este atalho de vez.</p>}
      </div>
    </Modal>
  );
}
