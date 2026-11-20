import { useState } from 'react';
import { CheckCircle2, FileText, Pencil, Plus, Receipt as ReceiptIcon, Trash2 } from 'lucide-react';
import { Async, ConfirmDialog, EmptyState, SkeletonList } from '@/components/ui';
import { brDate, CopyButton, FinanceGate, PayDialog, PaymentForm, periodLabel, pixTypeNames, StatusPill } from '@/components/finance/FinanceShared';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@/hooks/useQuery';
import { financeService } from '@/services';
import { formatBRL, formatDocument } from '@/lib/files';
import { cx } from '@/lib/labels';
import type { Payment, PaymentKind, PaymentStatus } from '@/types/models';

type Filter = 'todos' | PaymentStatus;
const filters: { id: Filter; label: string }[] = [
  { id: 'todos', label: 'Todos' }, { id: 'pendente', label: 'Pendentes' }, { id: 'vencido', label: 'Vencidos' },
  { id: 'pago', label: 'Pagos' }, { id: 'cancelado', label: 'Cancelados' },
];

export default function FinancePaymentsPage({ kind }: { kind: PaymentKind }) {
  return <FinanceGate><FinancePayments key={kind} kind={kind} /></FinanceGate>;
}

function FinancePayments({ kind }: { kind: PaymentKind }) {
  const q = useQuery(() => financeService.payments(kind), [kind]);
  const investmentsQ = useQuery(() => financeService.investments());
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('todos');
  const [editing, setEditing] = useState<{ item?: Payment } | null>(null);
  const [paying, setPaying] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<Payment | null>(null);
  const title = kind === 'pix' ? 'Pix' : 'Boletos';
  const list = (q.data ?? []).filter((p) => filter === 'todos' || p.status === filter);
  const count = (s: Filter) => (q.data ?? []).filter((p) => s === 'todos' || p.status === s).length;

  return (
    <div className="page finance-page">
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="muted">{kind === 'pix' ? 'Pagamentos por Pix: chaves, valores e vencimentos.' : 'Boletos registrados: linha digitável, arquivo e vencimento.'} O portal não realiza pagamentos.</p>
        </div>
        <div className="actions"><button className="btn primary" onClick={() => setEditing({})}><Plus /> {kind === 'pix' ? 'Novo Pix' : 'Novo boleto'}</button></div>
      </div>

      <div className="chips" style={{ marginBottom: 16 }}>
        {filters.map((f) => (
          <button key={f.id} className={cx('chip', filter === f.id && 'active')} onClick={() => setFilter(f.id)}>
            {f.label} {q.data && <span className="chip-count">{count(f.id)}</span>}
          </button>
        ))}
      </div>

      <Async q={q} loading={<SkeletonList rows={4} h={80} />} isEmpty={() => list.length === 0}
        empty={<div className="card"><EmptyState title={filter === 'todos' ? `Nenhum ${kind === 'pix' ? 'Pix' : 'boleto'} registrado` : 'Nada neste filtro'} description="Cobranças recorrentes dos investimentos aparecem aqui automaticamente." /></div>}>
        {() => (
          <div className="card fin-table">
            {list.map((p) => (
              <div key={p.id} className={cx('fin-pay', p.status)}>
                <div className="fin-pay-main">
                  <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                    <b>{p.beneficiary}</b>
                    <StatusPill status={p.status} />
                  </div>
                  <span className="muted small">
                    {[p.investmentName, p.period && periodLabel(p.period), p.document && formatDocument(p.document)].filter(Boolean).join(' · ')}
                  </span>
                  {p.description && <span className="small clamp-2">{p.description}</span>}
                  {kind === 'pix' && p.pixKey && (
                    <div className="fin-key">
                      <span className="muted small">{pixTypeNames[p.pixKeyType ?? 'email']}:</span> <code>{p.pixKey}</code> <CopyButton text={p.pixKey} label="Chave Pix" />
                    </div>
                  )}
                  {kind === 'boleto' && (
                    <div className="fin-key">
                      {p.barcode ? <><code className="barcode">{p.barcode}</code> <CopyButton text={p.barcode} label="Linha digitável" /></> : <span className="muted small">Linha digitável ainda não informada.</span>}
                    </div>
                  )}
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {p.hasAttachment && <a className="btn sm" href={financeService.fileUrl(p.id, 'attachment')} target="_blank" rel="noreferrer"><FileText size={15} /> Abrir boleto</a>}
                    {p.hasReceipt && <a className="btn sm" href={financeService.fileUrl(p.id, 'receipt')} target="_blank" rel="noreferrer"><ReceiptIcon size={15} /> Comprovante</a>}
                  </div>
                </div>
                <div className="fin-pay-side">
                  <b className="fin-amount">{formatBRL(p.amountCents)}</b>
                  <span className={cx('small', p.status === 'vencido' ? 'danger-text' : 'muted')}>Vence {brDate(p.dueDate)}</span>
                  {p.paidAt && <span className="small muted">Pago em {brDate(p.paidAt)}</span>}
                  <div className="fin-actions">
                    {(p.status === 'pendente' || p.status === 'vencido') && <button className="btn sm primary" onClick={() => setPaying(p)}><CheckCircle2 size={16} /> Marcar pago</button>}
                    <button className="icon-btn" title="Editar" aria-label="Editar" onClick={() => setEditing({ item: p })}><Pencil size={18} /></button>
                    <button className="icon-btn danger" title={p.period ? 'Cancelar cobrança' : 'Excluir'} aria-label="Excluir" onClick={() => setDeleting(p)}><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Async>

      {editing && <PaymentForm kind={kind} item={editing.item} investments={investmentsQ.data ?? []} onClose={() => setEditing(null)} />}
      {paying && <PayDialog item={paying} onClose={() => setPaying(null)} />}
      {deleting && (
        <ConfirmDialog
          title={deleting.period ? 'Cancelar cobrança' : 'Excluir registro'}
          confirmLabel={deleting.period ? 'Cancelar cobrança' : 'Excluir'}
          message={deleting.period
            ? 'Esta é uma cobrança gerada por um investimento recorrente. Ela será marcada como cancelada e continuará no histórico.'
            : 'Deseja realmente excluir este registro? Esta ação não poderá ser desfeita.'}
          onClose={() => setDeleting(null)}
          onConfirm={async () => { await financeService.removePayment(deleting.id); toast({ tone: 'success', title: deleting.period ? 'Cobrança cancelada' : 'Registro excluído' }); }}
        />
      )}
    </div>
  );
}
