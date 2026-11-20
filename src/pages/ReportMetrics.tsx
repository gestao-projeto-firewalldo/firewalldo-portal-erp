import { useState, type CSSProperties } from 'react';
import { AlertTriangle, BarChart3, Layers as LayersIcon, CheckCircle2, Clock, ListChecks, PieChart, Target, Users, RefreshCw } from 'lucide-react';
import { Async, Avatar, Progress, Skeleton } from '@/components/ui';
import { projectProgress } from '@/lib/progress';
import { useQuery } from '@/hooks/useQuery';
import { tasksService, projectsService, membersService } from '@/services';
import { categoryColor, categoryLabel, daysUntil, statusColor, statusLabel, statusOrder } from '@/lib/labels';
import type { Category, Task, Project } from '@/types/models';

export default function ReportMetrics() {
  const q = useQuery(async () => {
    const [tasks,projects,members]=await Promise.all([tasksService.list(true),projectsService.list(),membersService.list()]);
    return {tasks,projects,members};
  });
  const [projectId,setProjectId]=useState('');
  const [brand,setBrand]=useState('');
  const brands=Array.from(new Set((q.data?.projects ?? []).map(p=>p.brand?.trim()).filter((b):b is string=>!!b))).sort();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>
            <BarChart3 /> Relatórios
          </h1>
          <p>Dados reais das tarefas e projetos. Atualiza ao voltar à aba e a cada minuto.</p>
        </div><button className="btn" onClick={q.refetch} disabled={q.loading}><RefreshCw/> Atualizar</button>
      </div>
      <div className="toolbar"><div className="field grow"><label htmlFor="report-brand">Marca / cliente</label><select id="report-brand" className="select" value={brand} onChange={e=>{setBrand(e.target.value);setProjectId('');}}><option value="">Todas as marcas</option><option value="__none">Sem marca</option>{brands.map(b=><option key={b} value={b}>{b}</option>)}</select></div><div className="field grow"><label htmlFor="report-project">Projeto</label><select id="report-project" className="select" value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">Todos os projetos</option>{(q.data?.projects ?? []).filter(p=>!brand || (brand==='__none'?!p.brand:p.brand===brand)).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div></div>
      <Async
        q={q}
        loading={
          <div className="reports">
            <div className="kpis">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={110} r={18} />)}</div>
            <Skeleton h={320} r={18} style={{ gridColumn: 'span 12' }} />
          </div>
        }
      >
        {(data) => {
          const projects=data.projects.filter(p=>(!projectId || p.id===projectId) && (!brand || (brand==='__none'?!p.brand:p.brand===brand)));
          const tasks=data.tasks.filter(t=>!brand && !projectId || projects.some(p=>p.id===t.projectId));
          const members=data.members;
          const progress=(p:Project)=>projectProgress(p,data.tasks);
          const done = tasks.filter((t) => t.status === 'concluido');
          const late = tasks.filter((t) => t.dueDate && t.status !== 'concluido' && daysUntil(t.dueDate) < 0);
          const dueSoon = tasks.filter((t) => t.dueDate && t.status !== 'concluido' && daysUntil(t.dueDate) >= 0 && daysUntil(t.dueDate) <= 7);
          const rate = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
          const avgProject = projects.length ? Math.round(projects.reduce((s, p) => s + progress(p), 0) / projects.length) : 0;

          const kpis = [
            { l: 'Total de tarefas', v: tasks.length, icon: ListChecks, c: 'var(--primary)' },
            { l: 'Taxa de conclusão', v: `${rate}%`, icon: CheckCircle2, c: 'var(--success)' },
            { l: 'Vencem em 7 dias', v: dueSoon.length, icon: Clock, c: 'var(--warning)' },
            { l: 'Atrasadas', v: late.length, icon: AlertTriangle, c: 'var(--danger)' },
          ];

          return (
            <div className="reports">
              <div className="kpis stagger">
                {kpis.map((k) => (
                  <div key={k.l} className="card kpi">
                    <div className="row">
                      <span className="icon-tile" style={{ '--c': k.c, '--s': '40px' } as CSSProperties}>
                        <k.icon />
                      </span>
                      <span className="l">{k.l}</span>
                    </div>
                    <div className="v">{k.v}</div>
                  </div>
                ))}
              </div>

              <section className="card span-5">
                <div className="card-head">
                  <PieChart className="icon" />
                  <h2>Tarefas por status</h2>
                </div>
                <div className="card-body">
                  <StatusDonut tasks={tasks} />
                </div>
              </section>

              <section className="card span-7">
                <div className="card-head">
                  <Target className="icon" />
                  <h2>Progresso dos projetos</h2>
                  <span className="muted small" style={{ marginLeft: 'auto' }}>média {avgProject}%</span>
                </div>
                <div className="card-body">
                  {!projects.length && <p className="muted">Nenhum projeto neste filtro.</p>}
                  {projects.map((p) => {
                    const linked = tasks.filter((t) => t.projectId === p.id);
                    const d = linked.filter((t) => t.status === 'concluido').length;
                    return (
                      <div key={p.id} style={{ padding: '9px 0' }}>
                        <div className="kv" style={{ marginBottom: 6 }}>
                          <b>{p.name}</b>
                          <span>
                            {d}/{linked.length} tarefas · <b>{progress(p)}%</b>
                          </span>
                        </div>
                        <Progress value={progress(p)} />
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="card span-7">
                <div className="card-head">
                  <BarChart3 className="icon" />
                  <h2>Tarefas por categoria</h2>
                </div>
                <div className="card-body">
                  <p className="muted small">A categoria é definida na tarefa. Novas tarefas sugerem a categoria do projeto.</p><CategoryBars tasks={tasks} />
                </div>
              </section>

              <section className="card span-5">
                <div className="card-head">
                  <Users className="icon" />
                  <h2>Atividades por responsável</h2>
                </div>
                <div className="card-body">
                  <div className="legend" style={{ marginBottom: 10 }}>
                    <span style={{ '--c': 'var(--primary)' } as CSSProperties}><i /> Em aberto</span>
                    <span style={{ '--c': 'var(--success)' } as CSSProperties}><i /> Concluídas</span>
                  </div>
                  {(() => {
                    const rows = members.map((m) => {
                      const a = tasks.filter((t) => t.assigneeIds.includes(m.id));
                      return { m, open: a.filter((t) => t.status !== 'concluido').length, done: a.filter((t) => t.status === 'concluido').length };
                    });
                    const max = Math.max(1, ...rows.map((r) => r.open + r.done));
                    return rows
                      .sort((a, b) => b.open + b.done - (a.open + a.done))
                      .map(({ m, open, done }) => (
                        <div key={m.id} className="hbar" title={`${m.name}: ${open} em aberto, ${done} concluídas`}>
                          <span className="row small" style={{ gap: 8 }}>
                            <Avatar member={m} size={24} /> <span className="ellipsis">{m.name.split(' ')[0]}</span>
                          </span>
                          <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', background: 'rgba(100,140,200,.14)' }}>
                            <i style={{ width: `${(open / max) * 100}%`, background: 'var(--primary)', transition: 'width .8s' }} />
                            <i style={{ width: `${(done / max) * 100}%`, background: 'var(--success)', transition: 'width .8s' }} />
                          </div>
                          <b>{open + done}</b>
                        </div>
                      ));
                  })()}
                </div>
              </section>

              <section className="card span-12"><div className="card-head"><LayersIcon/><h2>Projetos por categoria</h2></div><div className="card-body"><p className="muted small">Categoria atribuída ao projeto. Cadastros antigos aparecem como “Sem categoria” até serem editados.</p><CategoryBars tasks={[]} projects={projects}/></div></section>
              <section className="card span-12">
                <div className="card-head">
                  <ListChecks className="icon" />
                  <h2>Indicadores por categoria</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="file-table">
                    <thead>
                      <tr>
                        <th>Categoria</th>
                        <th>Tarefas</th><th>Projetos</th>
                        <th>Em andamento</th>
                        <th>Concluídas</th>
                        <th>Atrasadas</th>
                        <th style={{ minWidth: 160 }}>Conclusão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([...(Object.keys(categoryLabel) as Category[]),'sem_categoria'] as const).map((c) => {
                        const ts = tasks.filter((t) => t.category === c);
                        const ps=projects.filter(p=>(p.category || 'sem_categoria')===c).length;
                        const d = ts.filter((t) => t.status === 'concluido').length;
                        const pct = ts.length ? Math.round((d / ts.length) * 100) : 0;
                        return (
                          <tr key={c} style={{ cursor: 'default' }}>
                            <td>
                              <span className="row">
                                <i style={{ width: 10, height: 10, borderRadius: 3, background: categoryColor[c as Category] ?? 'var(--muted)' }} /> {categoryLabel[c as Category] ?? 'Sem categoria'}
                              </span>
                            </td>
                            <td>{ts.length}</td><td>{ps}</td>
                            <td>{ts.filter((t) => t.status === 'em_andamento').length}</td>
                            <td>{d}</td>
                            <td style={{ color: 'var(--danger)' }}>{ts.filter((t) => late.includes(t)).length || '—'}</td>
                            <td>
                              <span className="row">
                                <span className="grow"><Progress value={pct} small color={categoryColor[c as Category] ?? 'var(--muted)'} /></span>
                                <b style={{ width: 40, textAlign: 'right' }}>{pct}%</b>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          );
        }}
      </Async>
    </div>
  );
}

function StatusDonut({ tasks }: { tasks: Task[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = tasks.length || 1;
  const R = 70;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segs = statusOrder.map((s) => {
    const n = tasks.filter((t) => t.status === s).length;
    const len = (n / total) * C;
    const seg = { s, n, len, offset };
    offset += len;
    return seg;
  });
  const active = segs.find((x) => x.s === hover);
  return (
    <div className="row" style={{ gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg viewBox="0 0 200 200" width="200" height="200" className="chart" role="img" aria-label="Tarefas por status" style={{ width: 200 }}>
        <g transform="rotate(-90 100 100)">
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(100,140,200,.14)" strokeWidth="26" />
          {segs.map((g) =>
            g.n ? (
              <circle
                key={g.s}
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke={statusColor[g.s]}
                strokeWidth={hover === g.s ? 32 : 26}
                strokeDasharray={`${Math.max(0, g.len - 3)} ${C}`}
                strokeDashoffset={-g.offset}
                style={{ transition: 'stroke-width .2s', cursor: 'pointer', }}
                onMouseEnter={() => setHover(g.s)}
                onMouseLeave={() => setHover(null)}
              />
            ) : null,
          )}
        </g>
        <text x="100" y="96" textAnchor="middle" style={{ fontSize: 32, fontWeight: 800, fill: 'var(--text)', fontFamily: 'var(--font-display)' }}>
          {active ? active.n : tasks.length}
        </text>
        <text x="100" y="120" textAnchor="middle" style={{ fontSize: 13 }}>
          {active ? statusLabel[active.s] : 'tarefas'}
        </text>
      </svg>
      <div style={{ display: 'grid', gap: 8, minWidth: 170 }}>
        {segs.map((g) => (
          <div
            key={g.s}
            className="row small"
            onMouseEnter={() => setHover(g.s)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'default', opacity: hover && hover !== g.s ? 0.5 : 1, transition: 'opacity .2s' }}
          >
            <i style={{ width: 12, height: 12, borderRadius: 4, background: statusColor[g.s] }} />
            <span className="grow">{statusLabel[g.s]}</span>
            <b>{g.n}</b>
            <span className="muted" style={{ width: 38, textAlign: 'right' }}>{Math.round((g.n / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryBars({ tasks, projects }: { tasks: Task[];projects?:Project[] }) {
  const cats: string[]=[...Object.keys(categoryLabel),...(projects?['sem_categoria']:[])];
  const data = cats.map((c) => ({
    c,
    open: projects ? projects.filter(p=>(p.category || 'sem_categoria')===c && p.status!=='concluido').length : tasks.filter((t) => t.category === c && t.status !== 'concluido').length,
    done: projects ? projects.filter(p=>(p.category || 'sem_categoria')===c && p.status==='concluido').length : tasks.filter((t) => t.category === c && t.status === 'concluido').length,
  }));
  const max = Math.max(1, ...data.map((d) => d.open + d.done));
  const W = 600;
  const H = 240;
  const pad = { l: 28, r: 8, t: 16, b: 34 };
  const bw = (W - pad.l - pad.r) / cats.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = Array.from(new Set([0, Math.round(max / 2), max]));
  return (
    <>
      <div className="legend" style={{ marginBottom: 8 }}>
        <span style={{ '--c': 'var(--electric)' } as CSSProperties}><i /> Em aberto</span>
        <span style={{ '--c': 'var(--success)' } as CSSProperties}><i /> {projects ? 'Concluídos' : 'Concluídas'}</span>
      </div>
      <div className="category-chart-mobile" role="img" aria-label={projects?'Projetos por categoria — barras':'Tarefas por categoria — barras'}>{data.map(d=><div key={d.c}><div className="kv"><span>{categoryLabel[d.c as Category] ?? 'Sem categoria'}</span><b>{d.open} em aberto · {d.done} {projects?'concluídos':'concluídas'}</b></div><div className="category-chart-track"><span style={{width:`${100*d.open/max}%`,background:'var(--electric)'}}/><span style={{width:`${100*d.done/max}%`,background:'var(--success)'}}/></div></div>)}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart category-chart-desktop" role="img" aria-label={projects ? "Projetos por categoria" : "Tarefas por categoria"}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + i * bw + bw * 0.22;
          const w = bw * 0.56;
          const yOpen = y(d.open);
          const yTop = y(d.open + d.done);
          return (
            <g key={d.c}>
              <title>{`${categoryLabel[d.c as Category] ?? 'Sem categoria'}: ${d.open} em aberto, ${d.done} concluídas`}</title>
              <rect x={x} y={yOpen} width={w} height={H - pad.b - yOpen} fill="var(--electric)" rx="4" opacity="0.9" />
              <rect x={x} y={yTop} width={w} height={Math.max(0, yOpen - yTop)} fill="var(--success)" rx="4" />
              <text x={x + w / 2} y={yTop - 6} textAnchor="middle" style={{ fill: 'var(--text)', fontWeight: 700 }}>
                {d.open + d.done}
              </text>
              <text x={x + w / 2} y={H - 12} textAnchor="middle" style={{fontSize:10}}>
                {categoryLabel[d.c as Category] ?? 'Sem categoria'}
              </text>
              <rect x={x - 2} y={H - pad.b} width={w + 4} height="3" rx="1.5" fill={categoryColor[d.c as Category] ?? 'var(--muted)'} />
            </g>
          );
        })}
      </svg>
    </>
  );
}
