'use client';
import { useState, useEffect } from 'react';
import { Project, Report } from '@/lib/types';

interface Props {
  project: Project | null;
  report: Report | null;
  onExportCSV: () => void;
  onExportPDF: () => void;
  isExportingPDF?: boolean;
  onMenuClick?: () => void;
}

export default function Topbar({ project, report, onExportCSV, onExportPDF, isExportingPDF, onMenuClick }: Props) {
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
    <div className="flex items-center justify-between px-3 lg:px-5 py-3 flex-shrink-0" style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--brd)' }}>
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        {/* Botão menu hambúrguer - só aparece no mobile */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-sm"
          style={{ border: '1px solid var(--brd)', background: 'var(--surf)', color: 'var(--tx2)' }}
        >
          ☰
        </button>
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--tx)' }}>{project?.name ?? 'Expense Manager'}</span>
        {report && <>
          <span className="hidden sm:inline" style={{ color: 'var(--brd2)' }}>/</span>
          <span className="hidden sm:inline text-sm truncate" style={{ color: 'var(--tx2)' }}>{report.name}</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: 'var(--tx3)', background: 'var(--surf2)', border: '1px solid var(--brd)' }}>
            {report.expenses.length}
          </span>
        </>}
      </div>
      <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
        {report && (
          <>
            <button 
              onClick={onExportCSV} 
              className="flex items-center gap-1 px-2 lg:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors" 
              style={{ border: '1px solid var(--brd)', background: 'var(--surf)', color: 'var(--tx2)' }}
              title="Exportar CSV"
            >
              ↓ <span className="hidden sm:inline">CSV</span>
            </button>
            <button 
              onClick={onExportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-1 px-2 lg:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50" 
              style={{ border: '1px solid #dc2626', background: 'rgba(220,38,38,.1)', color: '#dc2626' }}
              title="Exportar PDF com comprovantes"
            >
              {isExportingPDF ? (
                <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
              ) : (
                '📄'
              )}
              <span className="hidden sm:inline">{isExportingPDF ? 'Gerando...' : 'PDF'}</span>
            </button>
          </>
        )}
        <button 
          onClick={toggleTheme} 
          className="flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-colors"
          style={{ border: '1px solid var(--brd)', background: 'var(--surf)', color: 'var(--tx2)' }}
          title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--tx3)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
          API
        </div>
      </div>
    </div>
  );
}
