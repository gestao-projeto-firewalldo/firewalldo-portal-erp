/** Utilitários de arquivos, imagens e valores (V1.9). */

export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Lê um arquivo como data URL (base64), formato aceito pela API. */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem. Use PNG, JPG ou WEBP.'));
    img.src = src;
  });
}

/** Exporta o canvas em WEBP (com JPEG como reserva) respeitando um tamanho máximo. */
export function canvasToDataUrl(canvas: HTMLCanvasElement, maxBytes: number, quality = 0.88): string {
  for (let q = quality; q >= 0.5; q -= 0.1) {
    let data = canvas.toDataURL('image/webp', q);
    if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', q);
    if (data.length * 0.75 <= maxBytes) return data;
  }
  throw new Error('A imagem ficou grande demais. Tente uma imagem menor.');
}

/** Reduz a imagem para no máximo `maxSide` px no maior lado. */
export async function resizeImage(file: File, maxSide: number, maxBytes: number): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error('Use uma imagem PNG, JPG ou WEBP.');
  if (file.size > 15 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvasToDataUrl(canvas, maxBytes);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Anexo (PDF ou imagem) sem alteração, conferindo tipo e tamanho. */
export async function attachmentFromFile(file: File, maxBytes = 4 * 1024 * 1024): Promise<{ data: string; name: string }> {
  if (!['application/pdf', ...IMAGE_TYPES].includes(file.type)) throw new Error('Envie um PDF ou uma imagem (PNG, JPG ou WEBP).');
  if (file.size > maxBytes) throw new Error(`O arquivo deve ter no máximo ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  return { data: await readAsDataUrl(file), name: file.name.slice(0, 200) };
}

/* ---------------- Dinheiro ---------------- */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (cents: number | null | undefined) => brl.format((cents ?? 0) / 100);

/** "1.234,56" / "90" / "R$ 90,00" → centavos. Retorna null se inválido. */
export function parseBRL(text: string): number | null {
  const clean = text.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const cents = Math.round(Number(clean) * 100);
  return cents > 0 ? cents : null;
}

export const centsToInput = (cents: number | null | undefined) =>
  cents ? (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

/* ---------------- Documentos ---------------- */

export const onlyDigits = (v: string) => v.replace(/\D/g, '');

export function formatDocument(value: string) {
  const d = onlyDigits(value);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return value;
}

export function validCpf(d: string) {
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(d[i]) * (t + 1 - i);
    if (((sum * 10) % 11) % 10 !== Number(d[t])) return false;
  }
  return true;
}

export function validCnpj(d: string) {
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = w.reduce((acc, weight, i) => acc + Number(d[i]) * weight, 0);
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Valida CPF/CNPJ opcional. Retorna a mensagem de erro ou "". */
export function documentError(value: string) {
  const d = onlyDigits(value);
  if (!d) return '';
  if ((d.length === 11 && validCpf(d)) || (d.length === 14 && validCnpj(d))) return '';
  return 'CPF/CNPJ inválido. Confira os números.';
}

export function pixKeyError(type: string, value: string) {
  const v = value.trim();
  if (!v) return 'Informe a chave Pix.';
  const d = onlyDigits(v);
  switch (type) {
    case 'cpf': return validCpf(d) ? '' : 'CPF inválido.';
    case 'cnpj': return validCnpj(d) ? '' : 'CNPJ inválido.';
    case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 77 ? '' : 'E-mail inválido.';
    case 'telefone': {
      const n = d.startsWith('55') && (d.length === 12 || d.length === 13) ? d.slice(2) : d;
      return n.length === 10 || n.length === 11 ? '' : 'Informe o telefone com DDD.';
    }
    default: return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? '' : 'Chave aleatória no formato 8-4-4-4-12.';
  }
}

export function barcodeError(value: string) {
  const d = onlyDigits(value);
  return !d || d.length === 47 || d.length === 48 ? '' : 'A linha digitável tem 47 números (boleto bancário) ou 48 (contas de consumo).';
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const area = document.createElement('textarea');
    area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.appendChild(area); area.select();
    const ok = document.execCommand('copy'); area.remove();
    return ok;
  }
}
