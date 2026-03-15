'use client';
import { useState, useRef, useCallback } from 'react';
import { Project, Report, Expense, Category, CAT, COLORS, fmt } from '@/lib/types';
import { resizeImage, renderPdfPage, formatFileSize } from '@/lib/fileUtils';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ReportView from './ReportView';
import ProjectModal from './ProjectModal';
import ReportModal from './ReportModal';
import ExpenseModal from './ExpenseModal';

let _id = 1;
const uid = () => String(_id++);

export default function AppShell() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activePid, setActivePid] = useState<string | null>(null);
  const [activeRid, setActiveRid] = useState<string | null>(null);
  const [filter, setFilter] = useState<Category | 'all'>('all');

  const [showPM, setShowPM] = useState(false);
  const [showRM, setShowRM] = useState(false);
  const [showEM, setShowEM] = useState(false);
  const [editPid, setEditPid] = useState<string | null>(null);
  const [pendRpid, setPendRpid] = useState<string | null>(null);
  const [editEid, setEditEid] = useState<string | null>(null);

  const [queueItems, setQueueItems] = useState<{ id: string; name: string; size: number; status: 'analyzing' | 'done' | 'error'; error?: string; warning?: string; thumbUrl?: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();

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

  const activeProject = ap();
  const activeReport = ar();
  const grandTotal = projects.reduce((s, p) => s + p.reports.reduce((ss, r) => ss + r.expenses.reduce((sss, e) => sss + (e.value ?? 0), 0), 0), 0);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* PDF.js CDN */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            var s=document.createElement('script');
            s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.onload=function(){pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';};
            document.head.appendChild(s);
          `,
        }}
      />

      <Sidebar
        projects={projects}
        activePid={activePid}
        activeRid={activeRid}
        grandTotal={grandTotal}
        onSelectReport={(pid, rid) => { setActivePid(pid); setActiveRid(rid); setFilter('all'); setQueueItems([]); }}
        onToggleProject={(pid) => { setActivePid(prev => prev === pid ? null : pid); if (activePid !== pid) setActiveRid(null); }}
        onNewProject={() => { setEditPid(null); setShowPM(true); }}
        onEditProject={(pid) => { setEditPid(pid); setShowPM(true); }}
        onDeleteProject={deleteProject}
        onNewReport={(pid) => { setPendRpid(pid); setShowRM(true); }}
        onDeleteReport={deleteReport}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar
          project={activeProject}
          report={activeReport}
          onExport={exportCSV}
        />
        <div className="flex-1 overflow-y-auto p-5">
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
