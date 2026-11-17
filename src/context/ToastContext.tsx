import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, PartyPopper } from 'lucide-react';
import { cx } from '@/lib/labels';

type Tone = 'info' | 'success' | 'error' | 'celebrate';
interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
}

const Ctx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});

let seq = 0;

const icons = { info: Info, success: CheckCircle2, error: AlertTriangle, celebrate: PartyPopper };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++seq;
    setToasts((l) => [...l.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      {createPortal(
        <div className="toasts" aria-live="polite">
          {toasts.map((t) => {
            const Icon = icons[t.tone];
            return (
              <div key={t.id} className={cx('toast', t.tone)}>
                <span className="t-icon">
                  <Icon size={20} />
                </span>
                <div className="grow">
                  <div className="t-title">{t.title}</div>
                  {t.description && <div className="t-desc">{t.description}</div>}
                </div>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
