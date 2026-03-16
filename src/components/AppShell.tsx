'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Project, Report, Expense, Category, CAT, COLORS, fmt } from '@/lib/types';
import { resizeImage, renderPdfPage, formatFileSize } from '@/lib/fileUtils';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ReportView from './ReportView';
import ProjectModal from './ProjectModal';
import ReportModal from './ReportModal';
import ExpenseModal from './ExpenseModal';

const STORAGE_KEY = 'expense-manager-data';

let _id = 1;
const uid = () => String(_id++);

// Carregar dados do localStorage
function loadFromStorage(): { projects: Project[]; nextId: number } {
  if (typeof window === 'undefined') return { projects: [], nextId: 1 };
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return { 
        projects: parsed.projects ?? [], 
        nextId: parsed.nextId ?? 1 
      };
    }
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
  }
  return { projects: [], nextId: 1 };
}

// Salvar dados no localStorage
function saveToStorage(projects: Project[], nextId: number) {
  if (typeof window === 'undefined') return;
  try {
    // Remove thumbUrl antes de salvar (são URLs temporárias)
    const cleanProjects = projects.map(p => ({
      ...p,
      reports: p.reports.map(r => ({
        ...r,
        expenses: r.expenses.map(e => ({ ...e, thumbUrl: undefined }))
      }))
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects: cleanProjects, nextId }));
  } catch (e) {
    console.error('Erro ao salvar dados:', e);
  }
}

export default function AppShell() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activePid, setActivePid] = useState<string | null>(null);
  const [activeRid, setActiveRid] = useState<string | null>(null);
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [isLoaded, setIsLoaded] = useState(false);

  const [showPM, setShowPM] = useState(false);
  const [showRM, setShowRM] = useState(false);
  const [showEM, setShowEM] = useState(false);
  const [editPid, setEditPid] = useState<string | null>(null);
  const [pendRpid, setPendRpid] = useState<string | null>(null);
  const [editEid, setEditEid] = useState<string | null>(null);

  const [queueItems, setQueueItems] = useState<{ id: string; name: string; size: number; status: 'analyzing' | 'done' | 'error'; error?: string; warning?: string; thumbUrl?: string }[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar dados ao iniciar
  useEffect(() => {
    const { projects: savedProjects, nextId } = loadFromStorage();
    if (savedProjects.length > 0) {
      setProjects(savedProjects);
      _id = nextId;
    }
    setIsLoaded(true);
  }, []);

  // Carregar PDF.js
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      };
      document.head.appendChild(script);
    }
  }, []);

  // Salvar dados quando projects mudar
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(projects, _id);
    }
  }, [projects, isLoaded]);

  const ap = () => projects.find(p => p.id === activePid) ?? null;
  const ar = () => { const p = ap(); return p ? p.reports.find(r => r.id === activeRid) ?? null : null; };

  const updateProjects = (fn: (prev: Project[]) => Project[]) => setProjects(fn);

  // Project ops
  function createProject(name: string, code: string, color: string) {
    const p: Project = { id: uid(), name, code, color, reports: [] };
    updateProjects(prev => [p, ...prev]);
    setActivePid(p.id);
    setActiveRid(null);
  }
  function updateProject(id: string, name: string, code: string, color: string) {
    updateProjects(prev => prev.map(p => p.id === id ? { ...p, name, code, color } : p));
  }
  function deleteProject(id: string) {
    if (!confirm('Excluir este projeto?')) return;
    updateProjects(prev => prev.filter(p => p.id !== id));
    if (activePid === id) { setActivePid(null); setActiveRid(null); }
  }

  // Report ops
  function createReport(pid: string, name: string) {
    const r: Report = { id: uid(), name, expenses: [] };
    updateProjects(prev => prev.map(p => p.id === pid ? { ...p, reports: [...p.reports, r] } : p));
    setActivePid(pid);
    setActiveRid(r.id);
    setFilter('all');
  }
  function deleteReport(pid: string, rid: string) {
    if (!confirm('Excluir este relatório?')) return;
    updateProjects(prev => prev.map(p => p.id === pid ? { ...p, reports: p.reports.filter(r => r.id !== rid) } : p));
    if (activeRid === rid) { setActiveRid(null); }
  }

  // Expense ops
  function updateExpense(eid: string, data: Partial<Expense>) {
    updateProjects(prev => prev.map(p => ({
      ...p,
      reports: p.reports.map(r => ({
        ...r,
        expenses: r.expenses.map(e => e.id === eid ? { ...e, ...data, confidence: 100 } : e),
      })),
    })));
  }
  function removeExpense(eid: string) {
    updateProjects(prev => prev.map(p => ({
      ...p,
      reports: p.reports.map(r => ({ ...r, expenses: r.expenses.filter(e => e.id !== eid) })),
    })));
  }
  function addExpenseToReport(rid: string, expense: Expense) {
    updateProjects(prev => prev.map(p => ({
      ...p,
      reports: p.reports.map(r => r.id === rid ? { ...r, expenses: [...r.expenses, expense] } : r),
    })));
  }

  // File handling
  const handleFiles = useCallback(async (files: File[]) => {
    const r = ar();
    if (!r) { alert('Selecione um relatório primeiro.'); return; }
    const valid = files.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (!valid.length) return;

    const rid = r.id;
    for (const file of valid) {
      const id = uid();
      const thumbUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      setQueueItems(prev => [...prev, { id, name: file.name, size: file.size, status: 'analyzing', thumbUrl }]);

      try {
        let base64: string;
        let pdfThumb: string | undefined;
        let wasCompressed = false;
        let originalSize = file.size;
        let finalSize = file.size;

        if (file.type === 'application/pdf') {
          const result = await renderPdfPage(file);
          base64 = result.base64;
          pdfThumb = result.thumbUrl;
          wasCompressed = result.wasCompressed;
          originalSize = result.originalSize;
          finalSize = result.finalSize;
          setQueueItems(prev => prev.map(q => q.id === id ? { ...q, thumbUrl: pdfThumb } : q));
        } else {
          const result = await resizeImage(file);
          base64 = result.base64;
          wasCompressed = result.wasCompressed;
          originalSize = result.originalSize;
          finalSize = result.finalSize;
        }

        // Gerar aviso se foi compactado
        const warning = wasCompressed 
          ? `Arquivo compactado: ${formatFileSize(originalSize)} → ${formatFileSize(finalSize)}`
          : undefined;

        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, filename: file.name }),
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || `Erro HTTP ${res.status}`);
        }

        const expense: Expense = {
          id,
          filename: file.name,
          category: data.category ?? 'other',
          establishment: data.establishment ?? 'Não identificado',
          date: data.date ?? '—',
          value: data.value,
          description: data.description ?? file.name,
          confidence: data.confidence ?? 50,
          thumbUrl: pdfThumb ?? thumbUrl,
        };
        addExpenseToReport(rid, expense);
        setQueueItems(prev => prev.map(q => q.id === id ? { ...q, status: 'done', warning } : q));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setQueueItems(prev => prev.map(q => q.id === id ? { ...q, status: 'error', error: msg } : q));
      }
    }
  }, [activePid, activeRid, projects]);

  // Export CSV
  function exportCSV() {
    const p = ap(), r = ar();
    if (!r || !r.expenses.length) { alert('Nenhum dado para exportar.'); return; }
    const headers = ['Código do Projeto', 'Projeto', 'Relatório', 'Arquivo', 'Categoria', 'Estabelecimento', 'Data', 'Valor (R$)', 'Descrição'];
    const rows = r.expenses.map(e => [
      p!.code ?? '', p!.name, r.name, e.filename,
      CAT[e.category]?.label ?? e.category,
      e.establishment, e.date,
      e.value != null ? e.value.toFixed(2) : '',
      e.description,
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    const prefix = (p!.code ? p!.code + '_' : '') + r.name.replace(/[^a-z0-9]/gi, '_');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    a.download = `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // Export PDF
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  async function exportPDF() {
    const p = ap(), r = ar();
    if (!r || !r.expenses.length) { alert('Nenhum dado para exportar.'); return; }
    
    setIsExportingPDF(true);
    
    try {
      // Calcular totais por categoria
      const totals: Record<string, { count: number; value: number }> = {};
      let grandTotal = 0;
      
      r.expenses.forEach(e => {
        if (!totals[e.category]) {
          totals[e.category] = { count: 0, value: 0 };
        }
        totals[e.category].count++;
        totals[e.category].value += e.value || 0;
        grandTotal += e.value || 0;
      });

      const catLabels: Record<string, string> = {
        restaurant: 'Alimentação',
        transport: 'Transporte',
        hotel: 'Hospedagem',
        flight: 'Passagem Aérea',
        other: 'Outros',
      };

      const fmtCurrency = (v: number) => 
        'R$ ' + v.toFixed(2).replace('.', ',');

      // Gerar HTML diretamente
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${r.name} - Expense Manager</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #333; line-height: 1.4; }
    .page { padding: 30px; max-width: 800px; margin: 0 auto; }
    .header { border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
    .logo { font-size: 18px; font-weight: bold; color: #3b82f6; }
    .subtitle { font-size: 10px; color: #666; }
    .project-info { margin-top: 12px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
    .project-name { font-size: 14px; font-weight: 600; }
    .project-code { display: inline-block; margin-top: 5px; padding: 2px 6px; background: #dbeafe; color: #2563eb; border-radius: 3px; font-family: monospace; font-size: 10px; }
    .report-name { margin-top: 5px; font-size: 11px; color: #666; }
    .summary { margin-bottom: 20px; }
    .summary h2 { font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; margin-bottom: 10px; }
    .summary-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .summary-card { flex: 1; min-width: 120px; padding: 10px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; }
    .summary-card.total { background: #dbeafe; border-color: #93c5fd; }
    .summary-label { font-size: 9px; font-weight: 600; color: #666; text-transform: uppercase; }
    .summary-value { font-size: 13px; font-weight: 600; margin-top: 3px; }
    .summary-card.total .summary-value { color: #2563eb; }
    .summary-count { font-size: 9px; color: #999; margin-top: 2px; }
    .expenses h2 { font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 8px; background: #f5f5f5; border-bottom: 1px solid #ddd; font-size: 9px; font-weight: 600; color: #666; text-transform: uppercase; }
    td { padding: 8px; border-bottom: 1px solid #eee; }
    .cat { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 600; }
    .cat-restaurant { background: #fef3c7; color: #b45309; }
    .cat-transport { background: #dbeafe; color: #2563eb; }
    .cat-hotel { background: #d1fae5; color: #047857; }
    .cat-flight { background: #fee2e2; color: #dc2626; }
    .cat-other { background: #f1f5f9; color: #64748b; }
    .value { font-family: monospace; font-weight: 600; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; font-size: 9px; color: #999; }
    @media print { .page { padding: 15px; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">Expense Manager</div>
      <div class="subtitle">Relatório de Despesas</div>
      <div class="project-info">
        <div class="project-name">${p!.name}</div>
        ${p!.code ? `<span class="project-code">${p!.code}</span>` : ''}
        <div class="report-name">${r.name}</div>
      </div>
    </div>

    <div class="summary">
      <h2>Resumo por Categoria</h2>
      <div class="summary-grid">
        ${Object.entries(totals).map(([cat, data]) => `
          <div class="summary-card">
            <div class="summary-label">${catLabels[cat] || cat}</div>
            <div class="summary-value">${fmtCurrency(data.value)}</div>
            <div class="summary-count">${data.count} item(s)</div>
          </div>
        `).join('')}
        <div class="summary-card total">
          <div class="summary-label">Total Geral</div>
          <div class="summary-value">${fmtCurrency(grandTotal)}</div>
          <div class="summary-count">${r.expenses.length} documento(s)</div>
        </div>
      </div>
    </div>

    <div class="expenses">
      <h2>Lista de Despesas</h2>
      <table>
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>Categoria</th>
            <th>Estabelecimento</th>
            <th>Data</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          ${r.expenses.map(e => `
            <tr>
              <td>${e.filename}</td>
              <td><span class="cat cat-${e.category}">${catLabels[e.category] || e.category}</span></td>
              <td>${e.establishment}</td>
              <td>${e.date}</td>
              <td class="value">${e.value != null ? fmtCurrency(e.value) : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      Gerado em ${new Date().toLocaleString('pt-BR')} • Expense Manager
    </div>
  </div>
</body>
</html>`;

      // Abrir nova janela com o HTML para impressão
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Aguardar e imprimir
        setTimeout(() => {
          printWindow.print();
        }, 300);
      } else {
        alert('Popup bloqueado. Permita popups para este site.');
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsExportingPDF(false);
    }
  }

  const activeProject = ap();
  const activeReport = ar();
  const grandTotal = projects.reduce((s, p) => s + p.reports.reduce((ss, r) => ss + r.expenses.reduce((sss, e) => sss + (e.value ?? 0), 0), 0), 0);

  // Mostrar loading enquanto carrega dados do localStorage
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mx-auto mb-3" style={{ background: 'var(--surf)', border: '1px solid var(--brd)' }}>📋</div>
          <div className="text-sm" style={{ color: 'var(--tx3)' }}>Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Overlay mobile */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setShowMobileMenu(false)} 
        />
      )}

      {/* Sidebar - escondida no mobile, visível no desktop */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 
        transform transition-transform duration-200 ease-in-out
        ${showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          projects={projects}
          activePid={activePid}
          activeRid={activeRid}
          grandTotal={grandTotal}
          onSelectReport={(pid, rid) => { setActivePid(pid); setActiveRid(rid); setFilter('all'); setQueueItems([]); setShowMobileMenu(false); }}
          onToggleProject={(pid) => { setActivePid(prev => prev === pid ? null : pid); if (activePid !== pid) setActiveRid(null); }}
          onNewProject={() => { setEditPid(null); setShowPM(true); setShowMobileMenu(false); }}
          onEditProject={(pid) => { setEditPid(pid); setShowPM(true); }}
          onDeleteProject={deleteProject}
          onNewReport={(pid) => { setPendRpid(pid); setShowRM(true); setShowMobileMenu(false); }}
          onDeleteReport={deleteReport}
        />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <Topbar
          project={activeProject}
          report={activeReport}
          onExportCSV={exportCSV}
          onExportPDF={exportPDF}
          isExportingPDF={isExportingPDF}
          onMenuClick={() => setShowMobileMenu(true)}
        />
        <div className="flex-1 overflow-y-auto p-3 lg:p-5">
          {!activeReport ? (
            <div className="flex flex-col items-center justify-center min-h-[340px] text-center">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3" style={{ background: 'var(--surf)', border: '1px solid var(--brd)' }}>📋</div>
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--tx2)' }}>Nenhum relatório selecionado</div>
              <div className="text-xs" style={{ color: 'var(--tx3)' }}>Crie um projeto na barra lateral e adicione relatórios.</div>
            </div>
          ) : (
            <ReportView
              project={activeProject!}
              report={activeReport}
              filter={filter}
              queueItems={queueItems}
              fileInputRef={fileInputRef}
              onFilterChange={setFilter}
              onFilesSelected={handleFiles}
              onEditExpense={(eid) => { setEditEid(eid); setShowEM(true); }}
              onRemoveExpense={removeExpense}
            />
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => { handleFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
      />

      {showPM && (
        <ProjectModal
          project={editPid ? projects.find(p => p.id === editPid) : undefined}
          onSave={(name, code, color) => {
            if (editPid) updateProject(editPid, name, code, color);
            else createProject(name, code, color);
            setShowPM(false);
          }}
          onClose={() => setShowPM(false)}
        />
      )}
      {showRM && pendRpid && (
        <ReportModal
          onSave={(name) => { createReport(pendRpid, name); setShowRM(false); }}
          onClose={() => setShowRM(false)}
        />
      )}
      {showEM && editEid && (
        <ExpenseModal
          expense={(() => { for (const p of projects) for (const r of p.reports) { const e = r.expenses.find(x => x.id === editEid); if (e) return e; } return null; })()!}
          onSave={(data) => { updateExpense(editEid, data); setShowEM(false); }}
          onClose={() => setShowEM(false)}
        />
      )}
    </div>
  );
}
