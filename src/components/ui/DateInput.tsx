import { useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type RefObject } from 'react';

export function formatDateDigits(text: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) text = `${text.slice(8)}${text.slice(5,7)}${text.slice(0,4)}`;
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return digits.slice(0, 2) + (digits.length >= 2 ? '/' : '') + digits.slice(2, 4) + (digits.length >= 4 ? '/' : '') + digits.slice(4);
}
export function parseDateText(text: string): { iso: string; error: string } {
  if (!text) return { iso: '', error: '' };
  const digits = text.replace(/\D/g, '');
  if (digits.length !== 8) return { iso: '', error: 'Complete a data com dia, mês e ano.' };
  const day = Number(digits.slice(0, 2)), month = Number(digits.slice(2, 4)), year = Number(digits.slice(4));
  const maxDay = month === 2 ? ((year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28) : [4,6,9,11].includes(month) ? 30 : 31;
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > maxDay) return { iso: '', error: 'Informe uma data válida.' };
  return { iso: `${digits.slice(4)}-${digits.slice(2,4)}-${digits.slice(0,2)}`, error: '' };
}
interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string; onChange: (text: string) => void;
  inputRef?: RefObject<HTMLInputElement>;
}
export function DateInput({ value, onChange, inputRef, ...props }: Props) {
  const ownRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? ownRef;
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => { if (caret.current !== null && document.activeElement === ref.current) { ref.current?.setSelectionRange(caret.current, caret.current); caret.current = null; } }, [value]);
  const cursorAt = (formatted: string, count: number) => {
    if (!count) return 0;
    let found = 0;
    for (let i=0;i<formatted.length;i++) if (/\d/.test(formatted[i]) && ++found === count) return i + 1 + (formatted[i+1] === '/' ? 1 : 0);
    return formatted.length;
  };
  return <input {...props} ref={ref} className={`input ${props.className ?? ''}`} type="text" inputMode="numeric" autoComplete="off" value={value}
    onKeyDown={event => {
      props.onKeyDown?.(event);
      const input = event.currentTarget, pos = input.selectionStart ?? 0;
      if (event.defaultPrevented || input.selectionEnd !== pos || event.key !== 'Backspace' || value[pos-1] !== '/') return;
      event.preventDefault();
      const before = value.slice(0,pos).replace(/\D/g,'');
      const digits = value.replace(/\D/g,'');
      const next = formatDateDigits(digits.slice(0,before.length-1) + digits.slice(before.length));
      caret.current = cursorAt(next,before.length-1); onChange(next);
    }}
    onChange={event => {
      const input=event.currentTarget;
      const digitPosition=input.value.slice(0,input.selectionStart ?? input.value.length).replace(/\D/g,'').length;
      const next=formatDateDigits(input.value);
      caret.current=cursorAt(next,digitPosition);
      onChange(next);
    }} />;
}

/** A blank numeric field for people, ISO dates for API/forms. Partial text is never sent. */
export function FormDateInput({value, onChange, name, ...props}: Omit<Props,'value'|'onChange'|'inputRef'> & {value?: string|null; onChange?: (iso:string)=>void}) {
  const display=(iso:string)=>/^\d{4}-\d{2}-\d{2}$/.test(iso)?`${iso.slice(8)}/${iso.slice(5,7)}/${iso.slice(0,4)}`:'';
  const [text,setText]=useState(()=>display(value ?? ''));
  const reported=useRef(value ?? '');
  const ref=useRef<HTMLInputElement>(null);
  useEffect(()=>{const next=value ?? '';if(next!==reported.current){reported.current=next;setText(display(next));}},[value]);
  const parsed=parseDateText(text);
  useLayoutEffect(()=>{ref.current?.setCustomValidity(parsed.error);},[parsed.error]);
  const help=props.id?`${props.id}-help`:undefined;
  return <>
    <DateInput {...props} inputRef={ref} value={text} onChange={next=>{setText(next);const iso=parseDateText(next).iso;reported.current=iso;onChange?.(iso);}} aria-invalid={text && parsed.error ? true : undefined} aria-describedby={parsed.error?help:props['aria-describedby']} />
    {name && <input type="hidden" name={name} value={parsed.iso} />}
    {parsed.error && <small id={help} className="form-error">{parsed.error}</small>}
  </>;
}
