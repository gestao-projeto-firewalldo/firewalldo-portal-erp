import { useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Copy, Lock, Paperclip, X } from 'lucide-react';
import { EmptyState, Modal } from '@/components/ui';
import { FormDateInput } from '@/components/ui/DateInput';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/context/ToastContext';
import { financeService } from '@/services';
import {
  attachmentFromFile, barcodeError, centsToInput, copyText, documentError, formatDocument, onlyDigits, parseBRL, pixKeyError,
} from '@/lib/files';
import { cx } from '@/lib/labels';
import type {
  Billing, FinanceCategory, Frequency, Investment, InvestmentInput, InvestmentStatus, Payment, PaymentInput, PaymentKind, PaymentStatus, PixKeyType,
} from '@/types/models';

export const categoryNames: Record<FinanceCategory, string> = {
  infraestrutura: 'Infraestrutura', ferramentas: 'Ferramentas e software', servicos: 'Serviços', publicidade: 'Publicidade',
  equipamentos: 'Equipamentos', pessoal: 'Pessoal', impostos: 'Impostos e taxas', outros: 'Outros',
};
export const frequencyNames: Record<Frequency, string> = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };
export const investmentStatusNames: Record<InvestmentStatus, string> = { ativo: 'Ativo', pausado: 'Pausado', encerrado: 'Encerrado' };
export const paymentStatusNames: Record<PaymentStatus, string> = { pendente: 'Pendente', pago: 'Pago', vencido: 'Vencido', cancelado: 'Cancelado' };
export const pixTypeNames: Record<PixKeyType, string> = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' };
export const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
export const brDate = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');
export const periodLabel = (p: string | null) => {
  if (!p) return '';
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${months[Number(p.slice(5, 7)) - 1]}/${p.slice(0, 4)}`;
};

export function StatusPill({ status }: { status: PaymentStatus | InvestmentStatus }) {
  const label = (paymentStatusNames as Record<string, string>)[status] ?? (investmentStatusNames as Record<string, string>)[status];
  return <span className={cx('fin-status', status)}>{label}</span>;
}

/** Bloqueia a página para quem não tem acesso ao Financeiro (a API também bloqueia). */
export function FinanceGate({ children }: { children: ReactNode }) {
  const { can, me } = useSession();
  if (!me) return null;
  if (!can('financeiro.acessar')) {
    return <div className="page"><div className="card"><EmptyState icon={<Lock size={24} />} title="Acesso restrito" description="O Financeiro é visível para administradores e usuários autorizados. Peça acesso a um administrador." /></div></div>;
  }
  return <>{children}</>;
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const toast = useToast();
  return (
    <button type="button" className="btn sm" onClick={async () => toast(await copyText(text) ? { tone: 'success', title: `${label} copiada` } : { tone: 'error', title: 'Não foi possível copiar' })}>
      <Copy size={15} /> Copiar
    </button>
  );
}

export function MoneyField({ id, label, cents, onChange }: { id: string; label: string; cents: number | null; onChange: (c: number | null) => void }) {
  const [text, setText] = useState(centsToInput(cents));
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="money-input">
        <span>R$</span>
        <input id={id} className="input" inputMode="decimal" placeholder="0,00" value={text}
          onChange={(e) => { setText(e.target.value); onChange(parseBRL(e.target.value)); }}
          onBlur={() => { const c = parseBRL(text); if (c) setText(centsToInput(c)); }} />
      </div>
    </div>
  );
}

function FileField({ label, current, file, onPick, onRemove }: { label: string; current?: string; file: { name: string } | null | undefined; onPick: (f: File) => void; onRemove: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const name = file === null ? '' : file?.name ?? current ?? '';
  return (
    <div className="field full">
      <label>{label}</label>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn sm" onClick={() => ref.current?.click()}><Paperclip size={16} /> {name ? 'Trocar arquivo' : 'Anexar PDF ou imagem'}</button>
        {name && <span className="small ellipsis" style={{ maxWidth: 260 }}>{name}</span>}
        {name && <button type="button" className="btn sm ghost" onClick={onRemove}><X size={15} /> Remover</button>}
      </div>
      <input ref={ref} type="file" hidden accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
    </div>
  );
}

/* ---------------- Investimento ---------------- */

export function InvestmentForm({ item, onClose }: { item?: Investment; onClose: () => void }) {
  const { members } = useSession();
  const toast = useToast();
  const [f, setF] = useState<InvestmentInput>(() => item ? { ...item, document: formatDocument(item.document) } : {
    name: '', supplierName: '', legalName: '', document: '', category: 'infraestrutura', description: '', ownerId: null,
    amountCents: 0, billing: 'recorrente', frequency: 'mensal', startDate: today(), dueDay: null, endDate: null, status: 'ativo',
    paymentMethod: 'pix', pixKeyType: 'email', pixKey: '', notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof InvestmentInput>(k: K, v: InvestmentInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    setError('');
    if (f.name.trim().length < 2) return setError('Informe o nome do investimento ou serviço.');
    if (!f.amountCents) return setError('Informe um valor válido em reais (ex.: 90,00).');
    const doc = documentError(f.document); if (doc) return setError(doc);
    if (f.endDate && f.endDate < f.startDate) return setError('A data de término deve ser igual ou posterior à data de início.');
    if (f.paymentMethod === 'pix' && f.pixKey.trim()) { const e = pixKeyError(f.pixKeyType ?? 'email', f.pixKey); if (e) return setError(`Chave Pix: ${e}`); }
    setSaving(true);
    try {
      const payload: InvestmentInput = {
        ...f, name: f.name.trim(), document: onlyDigits(f.document), frequency: f.billing === 'recorrente' ? f.frequency ?? 'mensal' : null,
        dueDay: f.billing === 'recorrente' ? f.dueDay : null, pixKeyType: f.paymentMethod === 'pix' && f.pixKey.trim() ? f.pixKeyType : null,
        pixKey: f.paymentMethod === 'pix' ? f.pixKey.trim() : '',
      };
      if (item) await financeService.updateInvestment(item.id, payload);
      else await financeService.createInvestment(payload);
      toast({ tone: 'success', title: item ? 'Investimento atualizado' : 'Investimento cadastrado', description: payload.name });
      onClose();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={() => !saving && onClose()} title={item ? 'Editar investimento' : 'Novo investimento'} subtitle="Gastos e aplicações de recursos da operação." width={760} error={error}
      footer={<><button className="btn" onClick={onClose} disabled={saving}>Cancelar</button><button className="btn primary" onClick={() => void save()} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button></>}>
      <form className="form-grid" noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <h3 className="form-section full">Identificação</h3>
        <div className="field full"><label htmlFor="iv-name">Nome do investimento ou serviço *</label><input id="iv-name" className="input" autoFocus maxLength={150} placeholder="Ex.: Hospedagem de servidor" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="field"><label htmlFor="iv-sup">Fornecedor / beneficiário</label><input id="iv-sup" className="input" maxLength={150} value={f.supplierName} onChange={(e) => set('supplierName', e.target.value)} /></div>
        <div className="field"><label htmlFor="iv-legal">Razão social</label><input id="iv-legal" className="input" maxLength={200} value={f.legalName} onChange={(e) => set('legalName', e.target.value)} /></div>
        <div className="field"><label htmlFor="iv-doc">CPF/CNPJ</label><input id="iv-doc" className="input" inputMode="numeric" maxLength={20} value={f.document} onChange={(e) => set('document', e.target.value)} onBlur={() => set('document', formatDocument(f.document))} /></div>
        <div className="field"><label htmlFor="iv-cat">Categoria *</label><select id="iv-cat" className="select" value={f.category} onChange={(e) => set('category', e.target.value as FinanceCategory)}>{Object.entries(categoryNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="iv-owner">Responsável interno</label><select id="iv-owner" className="select" value={f.ownerId ?? ''} onChange={(e) => set('ownerId', e.target.value || null)}><option value="">—</option>{members.filter((m) => m.active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
        <div className="field full"><label htmlFor="iv-desc">Descrição</label><textarea id="iv-desc" className="textarea" rows={2} maxLength={2000} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>

        <h3 className="form-section full">Valores</h3>
        <MoneyField id="iv-amount" label="Valor da cobrança *" cents={f.amountCents || null} onChange={(c) => set('amountCents', c ?? 0)} />
        <div className="field"><label htmlFor="iv-bill">Tipo de cobrança *</label><select id="iv-bill" className="select" value={f.billing} onChange={(e) => set('billing', e.target.value as Billing)}><option value="recorrente">Recorrente</option><option value="unica">Única</option></select></div>
        {f.billing === 'recorrente' && <div className="field"><label htmlFor="iv-freq">Frequência *</label><select id="iv-freq" className="select" value={f.frequency ?? 'mensal'} onChange={(e) => set('frequency', e.target.value as Frequency)}>{Object.entries(frequencyNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>}
        {f.billing === 'recorrente' && <div className="field"><label htmlFor="iv-day">Dia do vencimento</label><input id="iv-day" className="input" type="number" min={1} max={31} placeholder="Ex.: 15" value={f.dueDay ?? ''} onChange={(e) => set('dueDay', e.target.value ? Math.min(31, Math.max(1, Number(e.target.value))) : null)} /></div>}
        <div className="field"><label htmlFor="iv-start">{f.billing === 'unica' ? 'Data do vencimento *' : 'Data de início *'}</label><FormDateInput id="iv-start" value={f.startDate} onChange={(v) => set('startDate', v)} /></div>
        {f.billing === 'recorrente' && <div className="field"><label htmlFor="iv-end">Data de término</label><FormDateInput id="iv-end" value={f.endDate ?? ''} onChange={(v) => set('endDate', v || null)} /></div>}
        <div className="field"><label htmlFor="iv-status">Status</label><select id="iv-status" className="select" value={f.status} onChange={(e) => set('status', e.target.value as InvestmentStatus)}>{Object.entries(investmentStatusNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>

        <h3 className="form-section full">Pagamento</h3>
        <div className="field"><label htmlFor="iv-method">Método preferencial *</label><select id="iv-method" className="select" value={f.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as PaymentKind)}><option value="pix">Pix</option><option value="boleto">Boleto</option></select></div>
        {f.paymentMethod === 'pix' && <>
          <div className="field"><label htmlFor="iv-pixt">Tipo de chave Pix</label><select id="iv-pixt" className="select" value={f.pixKeyType ?? 'email'} onChange={(e) => set('pixKeyType', e.target.value as PixKeyType)}>{Object.entries(pixTypeNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="field full"><label htmlFor="iv-pix">Chave Pix</label><input id="iv-pix" className="input" maxLength={140} value={f.pixKey} onChange={(e) => set('pixKey', e.target.value)} /></div>
        </>}
        <div className="field full"><label htmlFor="iv-notes">Informações complementares</label><textarea id="iv-notes" className="textarea" rows={2} maxLength={2000} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        <p className="muted small full">Cobranças recorrentes geram automaticamente uma ocorrência por período (até o mês seguinte) na página {f.paymentMethod === 'pix' ? 'Pix' : 'Boletos'}. Nenhum pagamento é feito pelo portal.</p>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/* ---------------- Pix / Boleto ---------------- */

export function PaymentForm({ kind, item, investments, onClose }: { kind: PaymentKind; item?: Payment; investments: Investment[]; onClose: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    investmentId: item?.investmentId ?? '', beneficiary: item?.beneficiary ?? '', document: formatDocument(item?.document ?? ''),
    description: item?.description ?? '', amountCents: item?.amountCents ?? 0, dueDate: item?.dueDate ?? today(),
    pixKeyType: (item?.pixKeyType ?? 'email') as PixKeyType, pixKey: item?.pixKey ?? '', barcode: item?.barcode ?? '',
    status: (item?.storedStatus ?? 'pendente') as 'pendente' | 'pago' | 'cancelado', paidAt: item?.paidAt ?? today(),
  });
  const [attachment, setAttachment] = useState<{ data: string; name: string } | null | undefined>(undefined);
  const [receipt, setReceipt] = useState<{ data: string; name: string } | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string | number) => setF((x) => ({ ...x, [k]: v }));
  const pickFile = (setter: typeof setAttachment) => async (file: File) => { try { setter(await attachmentFromFile(file)); } catch (e) { setError((e as Error).message); } };

  const chooseInvestment = (id: string) => {
    const inv = investments.find((i) => i.id === id);
    setF((x) => ({ ...x, investmentId: id, ...(inv && !item ? {
      beneficiary: inv.supplierName || inv.name, document: formatDocument(inv.document), amountCents: inv.amountCents, description: inv.name,
      ...(kind === 'pix' && inv.pixKey ? { pixKey: inv.pixKey, pixKeyType: inv.pixKeyType ?? 'email' } : {}),
    } : {}) }));
  };

  const save = async () => {
    setError('');
    if (f.beneficiary.trim().length < 2) return setError('Informe o beneficiário.');
    if (!f.amountCents) return setError('Informe um valor válido em reais.');
    const doc = documentError(f.document); if (doc) return setError(doc);
    if (kind === 'pix') { const e = pixKeyError(f.pixKeyType, f.pixKey); if (e) return setError(`Chave Pix: ${e}`); }
    else { const e = barcodeError(f.barcode); if (e) return setError(e); }
    if (f.status === 'pago' && f.paidAt > today()) return setError('A data do pagamento não pode estar no futuro.');
    setSaving(true);
    try {
      const payload: PaymentInput = {
        kind, investmentId: f.investmentId || null, beneficiary: f.beneficiary.trim(), document: onlyDigits(f.document), description: f.description.trim(),
        amountCents: f.amountCents, dueDate: f.dueDate,
        ...(kind === 'pix' ? { pixKeyType: f.pixKeyType, pixKey: f.pixKey.trim() } : { barcode: onlyDigits(f.barcode) }),
        ...(attachment !== undefined ? { attachment: attachment?.data ?? '', attachmentName: attachment?.name ?? '' } : {}),
        ...(receipt !== undefined ? { receipt: receipt?.data ?? '', receiptName: receipt?.name ?? '' } : {}),
        ...(item ? { status: f.status, paidAt: f.status === 'pago' ? f.paidAt : null } : {}),
      };
      if (item) await financeService.updatePayment(item.id, payload);
      else await financeService.createPayment(payload);
      toast({ tone: 'success', title: item ? 'Registro atualizado' : kind === 'pix' ? 'Pix registrado' : 'Boleto registrado', description: payload.beneficiary });
      onClose();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={() => !saving && onClose()} width={720} error={error}
      title={item ? (kind === 'pix' ? 'Editar Pix' : 'Editar boleto') : kind === 'pix' ? 'Novo pagamento Pix' : 'Novo boleto'}
      subtitle="Apenas registro e controle: nenhum pagamento é feito pelo portal."
      footer={<><button className="btn" onClick={onClose} disabled={saving}>Cancelar</button><button className="btn primary" onClick={() => void save()} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button></>}>
      <form className="form-grid" noValidate onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="field full"><label htmlFor="pm-inv">Investimento ou serviço relacionado</label><select id="pm-inv" className="select" value={f.investmentId} onChange={(e) => chooseInvestment(e.target.value)}><option value="">Nenhum</option>{investments.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
        <div className="field"><label htmlFor="pm-ben">Beneficiário *</label><input id="pm-ben" className="input" maxLength={150} value={f.beneficiary} onChange={(e) => set('beneficiary', e.target.value)} /></div>
        <div className="field"><label htmlFor="pm-doc">CPF/CNPJ do beneficiário</label><input id="pm-doc" className="input" inputMode="numeric" maxLength={20} value={f.document} onChange={(e) => set('document', e.target.value)} onBlur={() => set('document', formatDocument(f.document))} /></div>
        <MoneyField id="pm-amount" label="Valor *" cents={f.amountCents || null} onChange={(c) => set('amountCents', c ?? 0)} />
        <div className="field"><label htmlFor="pm-due">Vencimento *</label><FormDateInput id="pm-due" value={f.dueDate} onChange={(v) => set('dueDate', v)} /></div>
        {kind === 'pix' ? <>
          <div className="field"><label htmlFor="pm-pt">Tipo de chave Pix *</label><select id="pm-pt" className="select" value={f.pixKeyType} onChange={(e) => set('pixKeyType', e.target.value)}>{Object.entries(pixTypeNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div className="field"><label htmlFor="pm-pk">Chave Pix *</label><input id="pm-pk" className="input" maxLength={140} value={f.pixKey} onChange={(e) => set('pixKey', e.target.value)} /></div>
        </> : <div className="field full"><label htmlFor="pm-bar">Linha digitável</label><input id="pm-bar" className="input mono" inputMode="numeric" maxLength={80} placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000" value={f.barcode} onChange={(e) => set('barcode', e.target.value)} /></div>}
        <div className="field full"><label htmlFor="pm-desc">Descrição</label><textarea id="pm-desc" className="textarea" rows={2} maxLength={2000} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
        {kind === 'boleto' && <FileField label="Arquivo do boleto (PDF ou imagem)" current={item?.hasAttachment ? item.attachmentName || 'boleto anexado' : ''} file={attachment} onPick={pickFile(setAttachment)} onRemove={() => setAttachment(null)} />}
        {item && <>
          <div className="field"><label htmlFor="pm-st">Status do pagamento</label><select id="pm-st" className="select" value={f.status} onChange={(e) => set('status', e.target.value)}><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="cancelado">Cancelado</option></select></div>
          {f.status === 'pago' && <div className="field"><label htmlFor="pm-paid">Data efetiva do pagamento</label><FormDateInput id="pm-paid" value={f.paidAt} onChange={(v) => set('paidAt', v)} /></div>}
        </>}
        <FileField label="Comprovante de pagamento (opcional)" current={item?.hasReceipt ? item.receiptName || 'comprovante anexado' : ''} file={receipt} onPick={pickFile(setReceipt)} onRemove={() => setReceipt(null)} />
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/** Confirmação manual de pagamento (nenhuma transferência é feita). */
export function PayDialog({ item, onClose }: { item: Payment; onClose: () => void }) {
  const toast = useToast();
  const [paidAt, setPaidAt] = useState(today());
  const [receipt, setReceipt] = useState<{ data: string; name: string } | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (paidAt > today()) return setError('A data do pagamento não pode estar no futuro.');
    setSaving(true); setError('');
    try {
      await financeService.pay(item.id, paidAt, receipt ?? undefined);
      toast({ tone: 'success', title: 'Pagamento registrado como pago', description: item.beneficiary });
      onClose();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  };
  return (
    <Modal open onClose={() => !saving && onClose()} title="Marcar como pago" width={480} error={error}
      footer={<><button className="btn" onClick={onClose} disabled={saving}>Cancelar</button><button className="btn primary" onClick={() => void save()} disabled={saving}><CheckCircle2 /> {saving ? 'Salvando…' : 'Confirmar pagamento'}</button></>}>
      <p style={{ marginTop: 0 }}>Confirme que o pagamento a <b>{item.beneficiary}</b> já foi realizado fora do portal.</p>
      <div className="form-grid">
        <div className="field full"><label htmlFor="pay-date">Data efetiva do pagamento</label><FormDateInput id="pay-date" value={paidAt} onChange={setPaidAt} /></div>
        <FileField label="Comprovante (opcional)" file={receipt} onPick={async (f) => { try { setReceipt(await attachmentFromFile(f)); } catch (e) { setError((e as Error).message); } }} onRemove={() => setReceipt(null)} />
      </div>
    </Modal>
  );
}
