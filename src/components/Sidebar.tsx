'use client';
import { Project, fmt } from '@/lib/types';

interface Props {
  projects: Project[];
  activePid: string | null;
  activeRid: string | null;
  grandTotal: number;
  onSelectReport: (pid: string, rid: string) => void;
  onToggleProject: (pid: string) => void;
  onNewProject: () => void;
  onEditProject: (pid: string) => void;
  onDeleteProject: (pid: string) => void;
  onNewReport: (pid: string) => void;
  onDeleteReport: (pid: string, rid: string) => void;
}

export default function Sidebar({ projects, activePid, activeRid, grandTotal, onSelectReport, onToggleProject, onNewProject, onEditProject, onDeleteProject, onNewReport, onDeleteReport }: Props) {
  return (
    <aside className="flex flex-col flex-shrink-0 overflow-hidden" style={{ width: 256, background: 'var(--bg2)', borderRight: '1px solid var(--brd)' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-3" style={{ borderBottom: '1px solid var(--brd)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e4d6b)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 14l2 2 4-4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: 'var(--tx)' }}>Expense Manager</div>
            <div className="text-[10px]" style={{ color: 'var(--tx3)' }}>Portal de Reembolso</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'thin' }}>
        <button
          onClick={onNewProject}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium mb-2 transition-all"
          style={{ background: 'rgba(59,130,246,.1)', border: '1.5px dashed #3b82f6', color: '#3b82f6' }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = '#3b82f6'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,.1)'; (e.currentTarget as HTMLElement).style.color = '#3b82f6'; }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo projeto
        </button>

        {projects.length === 0 && (
          <div className="text-center py-8 text-xs leading-relaxed" style={{ color: 'var(--tx3)' }}>Nenhum projeto.<br/>Crie um para começar.</div>
        )}

        {projects.map(p => {
          const open = p.id === activePid;
          const ptot = p.reports.reduce((s, r) => s + r.expenses.reduce((ss, e) => ss + (e.value ?? 0), 0), 0);
          return (
            <div key={p.id} className="mb-1">
              <div
                className="group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer"
                style={{ border: `1px solid ${open ? 'var(--brd)' : 'transparent'}`, background: open ? 'var(--surf)' : 'transparent' }}
                onClick={() => onToggleProject(p.id)}
              >
                <span className="text-[9px] transition-transform" style={{ color: 'var(--tx3)', transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }}/>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold truncate" style={{ color: 'var(--tx)' }}>{p.name}</div>
                  <div className="text-[10px]" style={{ color: 'var(--tx3)', fontFamily: 'monospace' }}>{p.code || 'sem código'}</div>
                </div>
                <div className="hidden group-hover:flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); onEditProject(p.id); }} className="w-4 h-4 rounded text-[9px] flex items-center justify-center hover:bg-blue-900/40 hover:text-blue-400" style={{ color: 'var(--tx3)' }}>✏</button>
                  <button onClick={e => { e.stopPropagation(); onDeleteProject(p.id); }} className="w-4 h-4 rounded text-[9px] flex items-center justify-center hover:bg-red-900/40 hover:text-red-400" style={{ color: 'var(--tx3)' }}>✕</button>
                </div>
              </div>

              {open && (
                <div className="ml-4 mt-1">
                  {p.reports.map(r => {
                    const rtot = r.expenses.reduce((s, e) => s + (e.value ?? 0), 0);
                    const active = r.id === activeRid;
                    return (
                      <div key={r.id} className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer mb-0.5"
                        style={{ border: `1px solid ${active ? '#3b82f6' : 'transparent'}`, background: active ? 'rgba(59,130,246,.1)' : 'transparent' }}
                        onClick={() => onSelectReport(p.id, r.id)}
                      >
                        <span className="text-[9px]" style={{ color: 'var(--brd2)' }}>—</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-medium truncate" style={{ color: active ? '#93c5fd' : 'var(--tx)' }}>{r.name}</div>
                          <div className="text-[10px]" style={{ color: 'var(--tx3)' }}>{r.expenses.length} itens · {fmt(rtot)}</div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); onDeleteReport(p.id, r.id); }} className="hidden group-hover:flex w-3.5 h-3.5 rounded text-[9px] items-center justify-center hover:bg-red-900/40 hover:text-red-400" style={{ color: 'var(--tx3)' }}>✕</button>
                      </div>
                    );
                  })}
                  <button onClick={() => onNewReport(p.id)} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] transition-all mt-0.5" style={{ border: '1px dashed var(--brd2)', color: 'var(--tx3)' }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6'; (e.currentTarget as HTMLElement).style.color = '#3b82f6'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--brd2)'; (e.currentTarget as HTMLElement).style.color = 'var(--tx3)'; }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Novo relatório
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-2" style={{ borderTop: '1px solid var(--brd)' }}>
        <div className="rounded-lg p-2.5" style={{ background: 'var(--surf)', border: '1px solid var(--brd)' }}>
          <div className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--tx3)' }}>Total geral</div>
          <div className="text-base font-semibold" style={{ color: '#3b82f6', fontFamily: 'monospace' }}>{fmt(grandTotal)}</div>
        </div>
      </div>
    </aside>
  );
}
