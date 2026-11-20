import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Bell, CheckCircle2, Info, Layers, Newspaper, PartyPopper, SquareCheck, X } from 'lucide-react';
import { cx } from '@/lib/labels';

/**
 * Avisos flutuantes (V1.9): card branco, texto azul-marinho, barra azul que esvazia
 * da direita para a esquerda (~6 s). Pausa enquanto o cursor/toque está sobre o aviso.
 * No máximo 3 ao mesmo tempo; os demais aguardam em fila.
 */
type Tone = 'info' | 'success' | 'error' | 'celebrate';
export type ToastKind = 'tarefa' | 'projeto' | 'noticia' | 'sistema';
interface ToastInput {
  title: string;
  description?: string;
  tone?: Tone;
  /** Tipo do evento (notificações do sino): define o ícone. */
  kind?: ToastKind;
  duration?: number;
  onClick?: () => void;
}
interface Toast extends ToastInput { id: number; duration: number }

const Ctx = createContext<(t: ToastInput) => void>(() => {});
const MAX_VISIBLE = 3;
let seq = 0;

const toneIcons = { info: Info, success: CheckCircle2, error: AlertTriangle, celebrate: PartyPopper };
const kindIcons = { tarefa: SquareCheck, projeto: Layers, noticia: Newspaper, sistema: Bell };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState<Toast[]>([]);
  const queue = useRef<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setVisible((list) => {
      const rest = list.filter((t) => t.id !== id);
      while (rest.length < MAX_VISIBLE && queue.current.length) rest.push(queue.current.shift()!);
      return rest;
    });
  }, []);

  const push = useCallback((input: ToastInput) => {
    const toast: Toast = { tone: 'info', ...input, id: ++seq, duration: input.duration ?? (input.tone === 'error' ? 8000 : 6000) };
    setVisible((list) => {
      if (list.length < MAX_VISIBLE) return [...list, toast];
      queue.current.push(toast);
      return list;
    });
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      {createPortal(
        <div className="toasts" aria-live="polite" aria-relevant="additions">
          {visible.map((t) => <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />)}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(Date.now());

  // Cronômetro em JS (funciona mesmo com "Reduzir animações"); a barra é só visual.
  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(onClose, remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [paused, onClose]);

  const Icon = toast.kind ? kindIcons[toast.kind] : toneIcons[toast.tone ?? 'info'];
  return (
    <div
      className={cx('toast', toast.tone, toast.onClick && 'clickable')}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onClick={() => { if (toast.onClick) { toast.onClick(); onClose(); } }}
    >
      <span className="t-icon"><Icon size={20} /></span>
      <div className="grow t-text">
        <div className="t-title">{toast.title}</div>
        {toast.description && <div className="t-desc">{toast.description}</div>}
      </div>
      <button className="t-close" aria-label="Fechar aviso" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <X size={18} />
      </button>
      <span className="t-bar" style={{ animationDuration: `${toast.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }} />
    </div>
  );
}

export const useToast = () => useContext(Ctx);
