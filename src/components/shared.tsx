import { useSession } from '@/context/SessionContext';
import { useApi } from '@/services/core';
import { useState, type CSSProperties } from 'react';
import {
  AppWindow,
  Bot,
  Bug,
  Code2,
  Cpu,
  Eye,
  FilePlus2,
  Globe,
  Lock,
  Palette,
  Play,
  Router,
  Server,
  Shield,
  Smartphone,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { Modal } from '@/components/ui';
import { useTaskEditor } from '@/components/tasks/TaskEditor';
import { newsCategoryColor, newsCategoryLabel } from '@/lib/labels';
import type { NewsItem, Project } from '@/types/models';
import { useToast } from '@/context/ToastContext';

/* ---------------- Ícone de projeto ---------------- */

const projectIcons = {
  code: Code2,
  layout: AppWindow,
  smartphone: Smartphone,
  play: Play,
  globe: Globe,
  palette: Palette,
  shield: Shield,
  server: Server,
};

export function ProjectIcon({ project, size = 44 }: { project: Pick<Project, 'icon'> & { color?: string }; size?: number }) {
  const Icon = projectIcons[project.icon] ?? Shield;
  return (
    <span className="icon-tile neutral" style={{ '--s': `${size}px` } as CSSProperties}>
      <Icon />
    </span>
  );
}

/* ---------------- Capa de notícia (gerada localmente) ---------------- */

const coverIcons = { lock: Lock, router: Router, chip: Cpu, ai: Bot, code: Code2, eye: Eye, wifi: Wifi, bug: Bug };

export function NewsCover({ item, className }: { item: Pick<NewsItem, 'cover' | 'category'>; className?: string }) {
  const Icon = coverIcons[item.cover] ?? Lock;
  const cls = ['news-cover', ...(className ?? '').split(' ').filter((c) => c && c !== 'news-cover')].join(' ');
  return (
    <div className={cls} style={{ '--c': newsCategoryColor[item.category] } as CSSProperties} aria-hidden>
      <Icon />
    </div>
  );
}

export function NewsCategoryBadge({ c }: { c: NewsItem['category'] }) {
  return (
    <span className="badge" style={{ background: newsCategoryColor[c], color: '#fff', borderColor: 'transparent' }}>
      {newsCategoryLabel[c]}
    </span>
  );
}

/* ---------------- Gerar roteiro (modelo local, sem IA/API) ---------------- */

export function buildScript(n: NewsItem) {
  return [
    `TÍTULO: ${n.title}`,
    '',
    '[ABERTURA]',
    `Apresentador: "Fala, pessoal! Hoje o radar apitou para ${newsCategoryLabel[n.category].toLowerCase()}."`,
    '',
    '[CONTEXTO]',
    n.summary,
    '',
    '[O QUE ACONTECEU]',
    ...n.body.map((p) => `• ${p}`),
    '',
    '[COMO SE PROTEGER]',
    '• Dica 1: …',
    '• Dica 2: …',
    '',
    '[ENCERRAMENTO]',
    'Apresentador: "Ficou protegido? Então compartilha com quem precisa!"',
  ].join('\n');
}

export function ScriptModal({ news, onClose }: { news: NewsItem[]; onClose: () => void }) {
  const [id, setId] = useState(news[0]?.id ?? '');
  const item = news.find((n) => n.id === id);
  const [text, setText] = useState(() => (item ? buildScript(item) : ''));
  const openTask = useTaskEditor();
  const { can } = useSession();
  const toast = useToast();

  const pick = (nid: string) => {
    setId(nid);
    const n = news.find((x) => x.id === nid);
    if (n) setText(buildScript(n));
  };

  return (
    <Modal
      open
      onClose={onClose}
      width={780}
      title="Gerar roteiro"
      subtitle="Rascunho montado a partir de um modelo local — nenhuma IA ou serviço externo é usado nesta versão."
      icon={<span className="icon-tile"><Sparkles /></span>}
      footer={
        <>
          <button
            className="btn"
            onClick={() => {
              navigator.clipboard?.writeText(text);
              toast({ tone: 'success', title: 'Roteiro copiado' });
            }}
          >
            Copiar texto
          </button>
          {can('tarefas.criar') && <button
            className="btn primary"
            disabled={!item}
            onClick={() => {
              if (!item) return;
              onClose();
              openTask({
                prefill: {
                  title: `Roteiro – ${item.title}`,
                  description: text,
                  projectId: useApi() ? null : 'p-news',
                  category: 'conteudo',
                  status: 'a_fazer',
                },
              });
            }}
          >
            <FilePlus2 /> Criar tarefa de roteiro
          </button>}
        </>
      }
    >
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="sc-news">Notícia base</label>
        <select id="sc-news" className="select" value={id} onChange={(e) => pick(e.target.value)}>
          {news.map((n) => (
            <option key={n.id} value={n.id}>
              [{newsCategoryLabel[n.category]}] {n.title}
            </option>
          ))}
        </select>
      </div>
      <textarea className="textarea" style={{ minHeight: 340, fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 13.5 }} value={text} onChange={(e) => setText(e.target.value)} />
    </Modal>
  );
}

/* ---------------- Ícones de acesso rápido (desenhos simplificados) ---------------- */

export function QuickIcon({ name }: { name: string }) {
  const p = { viewBox: '0 0 48 48', width: 48, height: 48, 'aria-hidden': true } as const;
  switch (name) {
    case 'drive':
      return (
        <svg {...p}>
          <path d="M17 6h14l14 24H31z" fill="#fbbc04" />
          <path d="M17 6 3 30l7 12 14-24z" fill="#34a853" />
          <path d="M10 42h28l7-12H17z" fill="#4285f4" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...p}>
          <rect x="3" y="10" width="42" height="28" rx="8" fill="#ff0000" />
          <path d="m20 17 11 7-11 7z" fill="#fff" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...p}>
          <defs>
            <linearGradient id="qi-ig" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#feda75" />
              <stop offset=".35" stopColor="#fa7e1e" />
              <stop offset=".65" stopColor="#d62976" />
              <stop offset="1" stopColor="#4f5bd5" />
            </linearGradient>
          </defs>
          <rect x="5" y="5" width="38" height="38" rx="11" fill="none" stroke="url(#qi-ig)" strokeWidth="4" />
          <circle cx="24" cy="24" r="8.5" fill="none" stroke="url(#qi-ig)" strokeWidth="4" />
          <circle cx="34.5" cy="13.5" r="2.6" fill="#d62976" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...p}>
          <path d="M27 6v24a7 7 0 1 1-7-7" fill="none" stroke="#25f4ee" strokeWidth="5" strokeLinecap="round" transform="translate(-1.5 -1.5)" />
          <path d="M27 6v24a7 7 0 1 1-7-7" fill="none" stroke="#fe2c55" strokeWidth="5" strokeLinecap="round" transform="translate(1.5 1.5)" />
          <path d="M27 6v24a7 7 0 1 1-7-7M27 6c1 5 4.5 8 10 8.5" fill="none" stroke="var(--text)" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case 'landing':
      return (
        <svg {...p} fill="none" stroke="var(--primary)" strokeWidth="3">
          <rect x="5" y="9" width="38" height="30" rx="5" />
          <path d="M5 18h38" />
          <circle cx="11" cy="13.5" r="1" fill="var(--primary)" />
          <circle cx="16" cy="13.5" r="1" fill="var(--primary)" />
          <circle cx="21" cy="13.5" r="1" fill="var(--primary)" />
        </svg>
      );
    case 'link':
      return (
        <svg {...p} fill="none" stroke="var(--text-2)" strokeWidth="3" strokeLinecap="round">
          <path d="M20 28a8 8 0 0 0 11.3 0l6-6a8 8 0 0 0-11.3-11.3l-2 2" />
          <path d="M28 20a8 8 0 0 0-11.3 0l-6 6A8 8 0 0 0 22 37.3l2-2" />
        </svg>
      );
    default:
      return (
        <svg {...p} fill="none" stroke="var(--primary)" strokeWidth="3">
          <circle cx="24" cy="11" r="5" />
          <circle cx="11" cy="36" r="5" />
          <circle cx="37" cy="36" r="5" />
          <path d="m21.5 15.5-8 16M26.5 15.5l8 16M16 36h16" />
        </svg>
      );
  }
}
