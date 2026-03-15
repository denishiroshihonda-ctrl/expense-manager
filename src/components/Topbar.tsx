'use client';
import { useState, useEffect } from 'react';
import { Project, Report } from '@/lib/types';

interface Props {
  project: Project | null;
  report: Report | null;
  onExport: () => void;
}

export default function Topbar({ project, report, onExport }: Props) {
  const [isDark, setIsDark] = useState(true);

  // Carregar preferência salva
  useEffect(() => {
    const saved = localStorage.getItem('expense-manager-theme');
    if (saved === 'light') {
      setIsDark(false);
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  // Alternar tema
  function toggleTheme() {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('expense-manager-theme', newTheme);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--brd)' }}>
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--tx)' }}>{project?.name ?? 'Expense Manager'}</span>
        {report && <>
          <span style={{ color: 'var(--brd2)' }}>/</span>
          <span className="text-sm truncate" style={{ color: 'var(--tx2)' }}>{report.name}</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: 'var(--tx3)', background: 'var(--surf2)', border: '1px solid var(--brd)' }}>
            {report.expenses.length} comprovante{report.expenses.length !== 1 ? 's' : ''}
          </span>
          {project?.code && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ color: '#3b82f6', background: 'rgba(59,130,246,.1)', border: '1px solid #3b82f6', fontFamily: 'monospace' }}>
              {project.code}
            </span>
          )}
        </>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {report && (
          <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" style={{ border: '1px solid var(--brd)', background: 'var(--surf)', color: 'var(--tx2)' }}>
            ↓ CSV
          </button>
        )}
        <button 
          onClick={toggleTheme} 
          className="flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-colors"
          style={{ border: '1px solid var(--brd)', background: 'var(--surf)', color: 'var(--tx2)' }}
          title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
          API ativa
        </div>
      </div>
    </div>
  );
}
