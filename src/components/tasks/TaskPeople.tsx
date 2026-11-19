import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarStack } from '@/components/ui';
import type { Member } from '@/types/models';

/** Overlapping faces and names, with a complete list on hover, focus or touch. */
export function TaskPeople({ members, label = 'Responsáveis' }: { members: Member[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 280 });
  const anchor = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const id = useId();
  const close = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 140); };
  const show = () => {
    clearTimeout(timer.current);
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(300, innerWidth - 24);
    const height = Math.min(330, members.length * 50 + 52, innerHeight - 24);
    setPosition({ width, left: Math.max(12, Math.min(rect.left, innerWidth - width - 12)),
      top: rect.bottom + height + 8 <= innerHeight ? rect.bottom + 8 : Math.max(12, rect.top - height - 8) });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!anchor.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const reposition = () => setOpen(false);
    const scroll = (event: Event) => { if (event.target instanceof Node && panel.current?.contains(event.target)) return; setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!members.length) return <span className="muted small">Sem responsável</span>;
  const names = members.slice(0, 3).map(member => member.name.split(' ')[0]).join(', ');
  return <>
    <button type="button" ref={anchor} className="task-people" aria-label={`${label==='Responsáveis'?'Ver participantes':label}: ${members.map(m => m.name).join(', ')}`}
      aria-describedby={open ? id : undefined} aria-expanded={open}
      onMouseEnter={show} onMouseLeave={close} onFocus={show} onBlur={close}
      onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); setOpen(false); } }}
      onClick={event => { event.stopPropagation(); show(); }}>
      <AvatarStack members={members} size={30} max={3} showOverflow={false} />
      <span className="task-people-names">{names}{members.length > 3 && <MoreHorizontal size={17} aria-label={`e mais ${members.length - 3} pessoas`} />}</span>
    </button>
    {open && createPortal(<div id={id} role="tooltip" ref={panel} className="task-people-popup" style={position}
      onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={close} onClick={event => event.stopPropagation()}>
      <strong>{label} · {members.length}</strong>
      <ul>{members.map(member => <li key={member.id}><Avatar member={member} size={32}/><span><b>{member.name}</b>{member.title && <small>{member.title}</small>}</span></li>)}</ul>
    </div>, document.body)}
  </>;
}
