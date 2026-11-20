import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Eye, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';
import { Async, ConfirmDialog, EmptyState, Modal, Skeleton, SkeletonList } from '@/components/ui';
import {
  brDate, categoryNames, FinanceGate, frequencyNames, InvestmentForm, PayDialog, periodLabel, StatusPill,
} from '@/components/finance/FinanceShared';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { useQuery } from '@/hooks/useQuery';
import { financeService } from '@/services';
import { formatBRL } from '@/lib/files';
import type { Investment, Payment } from '@/types/models';

export default function FinanceInvestmentsPage() {
  return <FinanceGate><FinanceInvestments /></FinanceGate>;
}

function FinanceInvestments() {
  const summaryQ = useQuery(() => financeService.summary());
  const q = useQuery(() => financeService.investments());
  const { membersById } = useSession();
  const toast = useToast();
  const [editing, setEditing] = useState<{ item?: Investment } | null>(null);
  const [viewing, setViewing] = useState<Investment | null>(null);
  const [deleting, setDeleting] = useState<Investment | null>(null);
  const [paying, setPaying] = useState<Payment | null>(null);
  const s = summaryQ.data;

  const kpis = [
    { label: 'Total mensal estimado', value: s && formatBRL(s.monthlyCents), hint: s ? `${s.activeCount} investimento(s) ativo(s)` : '', icon: TrendingUp, c: 'var(--primary)' },
    { label: 'Pago no mês', value: s && formatBRL(s.paidCents), hint: s ? periodLabel(s.period) : '', icon: CheckCircle2, c: 'var(--success)' },
    { label: 'Pendente', value: s && formatBRL(s.pendingCents), hint: 'A vencer', icon: Clock, c: 'var(--warning)' },
    { label: 'Vencido', value: s && formatBRL(s.overdueCents), hint: s ? `${s.overdueCount} cobrança(s)` : '', icon: AlertTriangle, c: 'var(--danger)' },
  ];

  return (
    <div className="page finance-page">
      <div className="page-head">
        <div>
          <h1>Investimentos</h1>
          <p className="muted">Ferramentas, serviços, infraestrutura, publicidade e outros custos da operação.</p>
        </div>
        <div className="actions"><button className="btn primary" onClick={() => setEditing({})}><Plus /> Novo investimento</button></div>
      </div>

      {summaryQ.error ? <div className="notice warn" style={{ marginBottom: 18 }}><AlertTriangle /> {summaryQ.error.message}</div> : (
        <div className="fin-kpis">
          {kpis.map((k) => (
            <div key={k.label} className="card fin-kpi">
              <span className="fin-kpi-icon" style={{ color: k.c }}><k.icon /></span>
              <div className="grow">
                <span className="muted small">{k.label}</span>
                {k.value ? <b>{k.value}</b> : <Skeleton h={28} w={120} />}
                <span className="muted small">{k.hint}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="card fin-block">
        <div className="card-head"><h2><CalendarClock size={20} /> Próximos vencimentos</h2></div>
        {!s ? <SkeletonList rows={2} /> : s.upcoming.length === 0 ? <EmptyState title="Nenhum vencimento pendente" description="As próximas cobranças aparecem aqui." /> : (
          <div className="fin-list">
            {s.upcoming.map((p) => (
              <div key={p.id} className="fin-row">
                <div className="grow">
                  <b>{p.investmentName ?? p.beneficiary}</b>
                  <span className="muted small">{p.kind === 'pix' ? 'Pix' : 'Boleto'} · vence {brDate(p.dueDate)}{p.period ? ` · ${periodLabel(p.period)}` : ''}</span>
                </div>
                <b className="fin-amount">{formatBRL(p.amountCents)}</b>
                <button className="btn sm" onClick={() => setPaying(p)}><CheckCircle2 size={16} /> Marcar pago</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <h2 className="section-title">Investimentos cadastrados</h2>
      <Async q={q} loading={<SkeletonList rows={4} h={70} />}
        empty={<div className="card"><EmptyState title="Nenhum investimento cadastrado" description="Cadastre serviços, contratos e outros gastos para acompanhar os vencimentos." action={<button className="btn primary" onClick={() => setEditing({})}><Plus /> Novo investimento</button>} /></div>}>
        {(list) => (
          <div className="card fin-table">
            {list.map((i) => (
              <div key={i.id} className="fin-inv">
                <div className="grow fin-inv-main">
                  <b>{i.name}</b>
                  <span className="muted small">{[i.supplierName, categoryNames[i.category], i.ownerId ? membersById[i.ownerId]?.name : ''].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="fin-inv-value">
                  <b>{formatBRL(i.amountCents)}</b>
                  <span className="muted small">
                    {i.billing === 'unica' ? `Única · ${brDate(i.startDate)}` : `${frequencyNames[i.frequency ?? 'mensal']}${i.dueDay ? ` · dia ${i.dueDay}` : ''}`}
                    {i.billing === 'recorrente' && i.frequency !== 'mensal' && i.monthlyCents ? ` · ≈ ${formatBRL(i.monthlyCents)}/mês` : ''}
                  </span>
                </div>
                <span className="fin-method">{i.paymentMethod === 'pix' ? 'Pix' : 'Boleto'}</span>
                <StatusPill status={i.status} />
                <div className="fin-actions">
                  <button className="icon-btn" title="Ver histórico" aria-label={`Ver ${i.name}`} onClick={() => setViewing(i)}><Eye size={18} /></button>
                  <button className="icon-btn" title="Editar" aria-label={`Editar ${i.name}`} onClick={() => setEditing({ item: i })}><Pencil size={18} /></button>
                  <button className="icon-btn danger" title="Excluir" aria-label={`Excluir ${i.name}`} onClick={() => setDeleting(i)}><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Async>

      {editing && <InvestmentForm item={editing.item} onClose={() => setEditing(null)} />}
      {viewing && <InvestmentHistory item={viewing} onClose={() => setViewing(null)} onPay={(p) => setPaying(p)} />}
      {paying && <PayDialog item={paying} onClose={() => setPaying(null)} />}
      {deleting && (
        <ConfirmDialog title="Excluir investimento"
          message={<>Deseja excluir <b>{deleting.name}</b>? Cobranças futuras ainda pendentes saem junto; pagamentos já registrados continuam no histórico de Pix e Boletos.</>}
          onClose={() => setDeleting(null)}
          onConfirm={async () => { await financeService.removeInvestment(deleting.id); toast({ tone: 'success', title: 'Investimento excluído' }); }} />
      )}
    </div>
  );
}

function InvestmentHistory({ item, onClose, onPay }: { item: Investment; onClose: () => void; onPay: (p: Payment) => void }) {
  const q = useQuery(() => financeService.investmentPayments(item.id), [item.id]);
  return (
    <Modal open onClose={onClose} title={item.name} width={720}
      subtitle={`${formatBRL(item.amountCents)} · ${item.billing === 'unica' ? 'cobrança única' : frequencyNames[item.frequency ?? 'mensal'].toLowerCase()}${item.monthlyCents && item.frequency !== 'mensal' ? ` · equivale a ${formatBRL(item.monthlyCents)}/mês (informativo)` : ''}`}
      footer={<button className="btn" onClick={onClose}>Fechar</button>}>
      <div className="fin-detail">
        {item.description && <p className="muted" style={{ marginTop: 0 }}>{item.description}</p>}
        <p className="small muted">Total pago até hoje: <b>{formatBRL(item.paidCents)}</b>. Ver também <Link to={item.paymentMethod === 'pix' ? '/financeiro/pix' : '/financeiro/boletos'} onClick={onClose}>{item.paymentMethod === 'pix' ? 'Pix' : 'Boletos'}</Link>.</p>
        <h3>Histórico de pagamentos</h3>
        <Async q={q} loading={<SkeletonList rows={3} />} empty={<EmptyState title="Nenhuma cobrança gerada ainda" />}>
          {(list) => (
            <div className="fin-list">
              {list.map((p) => (
                <div key={p.id} className="fin-row">
                  <div className="grow">
                    <b>{p.period ? periodLabel(p.period) : brDate(p.dueDate)}</b>
                    <span className="muted small">Vence {brDate(p.dueDate)}{p.paidAt ? ` · pago em ${brDate(p.paidAt)}` : ''}</span>
                  </div>
                  <b className="fin-amount">{formatBRL(p.amountCents)}</b>
                  <StatusPill status={p.status} />
                  {(p.status === 'pendente' || p.status === 'vencido') && <button className="btn sm" onClick={() => { onClose(); onPay(p); }}>Marcar pago</button>}
                </div>
              ))}
            </div>
          )}
        </Async>
      </div>
    </Modal>
  );
}
