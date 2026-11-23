import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Inbox, RefreshCw, Search, X } from 'lucide-react';
import { categoryColor, categoryLabel, cx, priorityLabel, priorityTone } from '@/lib/labels';
import type { Category, Member, PresenceStatus, Priority } from '@/types/models';

/* ---------------- Logo ---------------- */

/** Escudo com chama — marca simples do portal (sem personagens). */
export function Logo({ className = 'brand-logo' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden>
      <path
        d="M20 3.5 6.5 8.5v10c0 8.6 5.8 15.3 13.5 18 7.7-2.7 13.5-9.4 13.5-18v-10L20 3.5Z"
        stroke="var(--primary)"
        strokeWidth="2.6"
        strokeLinejoin="round"
        fill="color-mix(in srgb, var(--primary) 12%, transparent)"
      />
      <path
        d="M20.5 11.5c.5 3.2 4.8 5 4.8 9.4a5.3 5.3 0 0 1-10.6 0c0-2.1 1-3.5 2.3-4.4.1 1.6.9 2.5 1.7 2.8-.5-3 .4-5.7 1.8-7.8Z"
        fill="var(--primary)"
      />
    </svg>
  );
}

/* ---------------- Badges ---------------- */

export function PriorityBadge({ p }: { p: Priority }) {
  return <span className={cx('badge', priorityTone[p])}>{priorityLabel[p]}</span>;
}

export function CategoryBadge({ c }: { c: Category }) {
  return (
    <span className="badge soft" style={{ '--c': categoryColor[c] } as CSSProperties}>
      {categoryLabel[c]}
    </span>
  );
}

export function SoftBadge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="badge soft" style={{ '--c': color } as CSSProperties}>
      {children}
    </span>
  );
}

export function DemoBadge({ children = 'Demonstração' }: { children?: ReactNode }) {
  return <span className="badge demo">{children}</span>;
}

/* ---------------- Progress ---------------- */

export function Progress({ value, color, small }: { value: number; color?: string; small?: boolean }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setW(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div
      className={cx('progress', small && 'sm')}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ '--c': color } as CSSProperties}
    >
      <i style={{ width: `${Math.max(0, Math.min(100, w))}%` }} />
    </div>
  );
}

/* ---------------- Avatar ---------------- */

export function Avatar({
  member,
  size = 36,
  showStatus,
}: {
  member: Pick<Member, 'name' | 'initials' | 'color' | 'avatarUrl'> & { status?: PresenceStatus };
  size?: number;
  showStatus?: boolean;
}) {
  return (
    <span
      className="avatar"
      style={{ '--s': `${size}px`, '--c': member.color } as CSSProperties}
      title={member.name}
    >
      {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : member.initials}
      {showStatus && member.status && <i className={cx('status', `st-${member.status}`)} />}
    </span>
  );
}

export function AvatarStack({ members, size = 28, max = 4 }: { members: Member[]; size?: number; max?: number }) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <span className="avatar-stack">
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {rest > 0 && (
        <span className="avatar" style={{ '--s': `${size}px`, '--c': 'var(--surface-3)', color: 'var(--text)' } as CSSProperties}>
          +{rest}
        </span>
      )}
    </span>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width,
  icon,
  error,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  icon?: ReactNode;
  error?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('.modal-root');
      if (dialogs[dialogs.length - 1] !== ref.current?.closest('.modal-root')) return;
      if (e.key === 'Escape') closeRef.current();
      if (e.key !== 'Tab') return;
      const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([hidden]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(el => el.getClientRects().length);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="modal-root" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal" style={{ '--w': width ? `${width}px` : undefined } as CSSProperties} ref={ref} tabIndex={-1}>
        <div className="modal-head">
          {icon}
          <div className="grow">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn close" onClick={onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className="modal-body">{error && !footer && <p className="modal-error" role="alert">{error}</p>}{children}</div>
        {footer && <div className="modal-foot">{error && <p className="modal-error" role="alert">{error}</p>}{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Estados ---------------- */

export function Skeleton({ h = 16, w = '100%', r, style }: { h?: number; w?: number | string; r?: number; style?: CSSProperties }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

export function SkeletonList({ rows = 4, h = 52 }: { rows?: number; h?: number }) {
  return (
    <div style={{ display: 'grid', gap: 10, padding: '4px 20px 18px' }} aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} h={h} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = <Inbox size={24} />,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode | null;
}) {
  return (
    <div className="state">
      {icon && <span className="state-icon">{icon}</span>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="state error" role="alert">
      <span className="state-icon">
        <AlertTriangle size={24} />
      </span>
      <h3>Não foi possível carregar</h3>
      <p>{error.message}</p>
      {onRetry && (
        <button className="btn outline sm" onClick={onRetry}>
          <RefreshCw /> Tentar novamente
        </button>
      )}
    </div>
  );
}

/** Renderiza loading / erro / vazio / conteúdo de forma consistente. */
export function Async<T>({
  q,
  loading,
  empty,
  isEmpty,
  children,
}: {
  q: { data: T | undefined; loading: boolean; error: Error | null; refetch: () => void };
  loading?: ReactNode;
  empty?: ReactNode;
  isEmpty?: (d: T) => boolean;
  children: (d: T) => ReactNode;
}) {
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (q.loading && q.data === undefined) return <>{loading ?? <SkeletonList />}</>;
  if (q.data === undefined) return null;
  if (empty && (isEmpty ? isEmpty(q.data) : Array.isArray(q.data) && q.data.length === 0)) return <>{empty}</>;
  return <>{children(q.data)}</>;
}

/* ---------------- Inputs ---------------- */

export function SearchInput({
  value,
  onChange,
  placeholder = 'Pesquisar…',
  className,
  kbd,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  kbd?: string;
}) {
  return (
    <label className={cx('search', className)}>
      <Search />
      <span className="sr-only">{placeholder}</span>
      <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {kbd && !value && <kbd>{kbd}</kbd>}
    </label>
  );
}

export function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label?: string; icon?: ReactNode; title?: string }[];
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          title={o.title ?? o.label}
          className={cx(value === o.value && 'active')}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHead({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>
          {icon}
          {title}
        </h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

/* ---------------- Confirmação (V1.9) ---------------- */

/** Diálogo de confirmação para ações destrutivas. `onConfirm` pode ser assíncrono. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Excluir',
  danger = true,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    setBusy(true); setError('');
    try { await onConfirm(); onClose(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      title={title}
      width={460}
      error={error}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className={cx('btn', danger ? 'danger-solid' : 'primary')} onClick={() => void run()} disabled={busy} autoFocus>
            {busy ? 'Aguarde…' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}
