'use client';
import { useRef, RefObject } from 'react';
import { Project, Report, Category, CAT, fmt } from '@/lib/types';

interface QItem { id: string; name: string; size: number; status: 'analyzing' | 'done' | 'error'; error?: string; warning?: string; thumbUrl?: string; }

interface Props {
  project: Project;
  report: Report;
  filter: Category | 'all';
  queueItems: QItem[];
  fileInputRef: RefObject<HTMLInputElement>;
  onFilterChange: (f: Category | 'all') => void;
  onFilesSelected: (files: File[]) => void;
  onEditExpense: (id: string) => void;
  onRemoveExpense: (id: string) => void;
}

const CATS: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'restaurant', label: '🍽 Alimentação' },
  { key: 'transport', label: '🚗 Transporte' },
  { key: 'hotel', label: '🏨 Hospedagem' },
  { key: 'flight', label: '✈️ Passagens' },
];

export default function ReportView({ project, report, filter, queueItems, fileInputRef, onFilterChange, onFilesSelected, onEditExpense, onRemoveExpense }: Props) {
  const dropRef = useRef<HTMLDivElement>(null);

  const expenses = filter === 'all' ? report.expenses : report.expenses.filter(e => e.category === filter);
  const totals = { restaurant: 0, transport: 0, hotel: 0, flight: 0 };
  const counts = { restaurant: 0, transport: 0, hotel: 0, flight: 0 };
  let grand = 0;
  report.expenses.forEach(e => {
    const v = e.value ?? 0;
    if (e.category in totals) { (totals as any)[e.category] += v; (counts as any)[e.category]++; }
    grand += v;
  });

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dropRef.current?.classList.remove('border-blue-500', 'bg-blue-950/20');
    onFilesSelected(Array.from(e.dataTransfer.files));
  }

  return (
    <div>
      {/* Code banner */}
      {project.code && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--surf)', border: '1px solid var(--brd)' }}>
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--tx3)' }}>Código do projeto</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: '#3b82f6', background: 'rgba(59,130,246,.1)', border: '1px solid #3b82f6', fontFamily: 'monospace' }}>{project.code}</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {(['restaurant','transport','hotel','flight'] as Category[]).map((cat, i) => (
          <div key={cat} className="rounded-lg p-3" style={{ background: 'var(--surf)', border: '1px solid var(--brd)' }}>
            <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--tx3)' }}>{CAT[cat].icon} {CAT[cat].label}</div>
            <div className="text-sm font-semibold" style={{ fontFamily: 'monospace', color: 'var(--tx)' }}>{fmt((totals as any)[cat])}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--tx3)' }}>{(counts as any)[cat]} itens</div>
          </div>
        ))}
        <div className="rounded-lg p-3" style={{ background: 'rgba(59,130,246,.1)', border: '1px solid #3b82f6' }}>
          <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#93c5fd' }}>💰 Total</div>
          <div className="text-sm font-semibold" style={{ fontFamily: 'monospace', color: '#3b82f6' }}>{fmt(grand)}</div>
          <div className="text-[10px] mt-0.5" style={{ color: '#3b82f6' }}>{report.expenses.length} documentos</div>
        </div>
      </div>

      {/* Upload zone */}
      <div
        ref={dropRef}
        className="rounded-xl p-6 text-center cursor-pointer mb-4 transition-all"
        style={{ border: '1.5px dashed var(--brd2)', background: 'var(--surf)' }}
        onDragOver={e => { e.preventDefault(); dropRef.current?.classList.add('border-blue-500', 'bg-blue-950/20'); }}
        onDragLeave={() => dropRef.current?.classList.remove('border-blue-500', 'bg-blue-950/20')}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl mx-auto mb-2" style={{ background: 'var(--surf2)', border: '1px solid var(--brd)' }}>📎</div>
        <div className="text-xs font-semibold mb-1" style={{ color: 'var(--tx)' }}>Arraste comprovantes aqui</div>
        <div className="text-[11px] mb-3" style={{ color: 'var(--tx3)' }}>Notas fiscais, recibos, passagens — imagens ou PDFs</div>
        <button className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#3b82f6' }} onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          + Selecionar arquivos
        </button>
        <div className="flex gap-2 justify-center flex-wrap mt-3">
          {['🍽 Restaurante','🚗 Uber/99/Táxi','🏨 Hotel','✈️ Passagem'].map(s => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded" style={{ color: 'var(--tx3)', background: 'var(--surf2)', border: '1px solid var(--brd)' }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Queue */}
      {queueItems.length > 0 && (
        <div className="mb-4">
          <div className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--tx3)' }}>Processando</div>
          <div className="flex flex-col gap-1.5">
            {queueItems.map(q => (
              <div key={q.id} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--surf)', border: '1px solid var(--brd)' }}>
                <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-sm overflow-hidden" style={{ background: 'var(--surf2)', border: '1px solid var(--brd)' }}>
                  {q.thumbUrl ? <img src={q.thumbUrl} className="w-full h-full object-cover" /> : '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate" style={{ color: 'var(--tx)' }}>{q.name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--tx3)' }}>{(q.size / 1024).toFixed(0)} KB</div>
                  {q.warning && (
                    <div className="text-[10px] mt-1 px-2 py-1 rounded inline-flex items-center gap-1" style={{ color: '#f59e0b', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)' }}>
                      <span>⚠️</span> {q.warning}
                    </div>
                  )}
                  {q.error && <div className="text-[10px] mt-1 p-1.5 rounded" style={{ color: '#ef4444', background: 'rgba(239,68,68,.1)', border: '1px solid #ef4444' }}>{q.error}</div>}
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium flex-shrink-0 ${
                  q.status === 'analyzing' ? 'bg-blue-900/30 border border-blue-700/50 text-blue-400' :
                  q.status === 'done' ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-400' :
                  'bg-red-900/30 border border-red-700/50 text-red-400'
                }`}>
                  {q.status === 'analyzing' && <span className="spinner" style={{ width: 9, height: 9, borderWidth: 1.5 }} />}
                  {q.status === 'analyzing' ? ' Analisando' : q.status === 'done' ? '✓ Concluído' : '✕ Erro'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {report.expenses.length > 0 && (
        <div>
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {CATS.map(c => (
              <button key={c.key} onClick={() => onFilterChange(c.key)}
                className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${filter === c.key ? 'bg-blue-900/30 border-blue-700/50 text-blue-400' : 'text-slate-400'}`}
                style={{ border: `1px solid ${filter === c.key ? '#1d4ed8' : 'var(--brd)'}`, background: filter === c.key ? 'rgba(59,130,246,.15)' : 'var(--surf)' }}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--brd)' }}>
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: 'var(--surf2)' }}>
                  {['Arquivo','Categoria','Estabelecimento','Data','Valor','Conf.',''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--tx3)', borderBottom: '1px solid var(--brd)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-xs" style={{ color: 'var(--tx3)' }}>Nenhum comprovante encontrado.</td></tr>
                ) : expenses.map(e => {
                  const cat = CAT[e.category] ?? CAT.other;
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--brd)' }}>
                      <td className="px-3 py-2 text-[11px] max-w-[120px] truncate" style={{ color: 'var(--tx)' }}>{e.filename}</td>
                      <td className="px-3 py-2"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${cat.cls}`}>{cat.icon} {cat.label}</span></td>
                      <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--tx)' }}>{e.establishment}</td>
                      <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--tx3)', fontFamily: 'monospace' }}>{e.date}</td>
                      <td className="px-3 py-2 text-[11px]" style={{ fontFamily: 'monospace', color: 'var(--tx)' }}>{e.value != null ? fmt(e.value) : <span style={{ color: 'var(--tx3)' }}>—</span>}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--brd)' }}>
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${e.confidence}%` }} />
                          </div>
                          <span className="text-[9px]" style={{ color: 'var(--tx3)' }}>{e.confidence}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => onEditExpense(e.id)} className="w-6 h-6 rounded flex items-center justify-center text-[10px] hover:bg-blue-900/40 hover:text-blue-400 transition-colors" style={{ border: '1px solid var(--brd)', color: 'var(--tx3)' }}>✏</button>
                          <button onClick={() => onRemoveExpense(e.id)} className="w-6 h-6 rounded flex items-center justify-center text-[10px] hover:bg-red-900/40 hover:text-red-400 transition-colors" style={{ border: '1px solid var(--brd)', color: 'var(--tx3)' }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
