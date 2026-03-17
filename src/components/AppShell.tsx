'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Project, Report, Expense, Category, CAT, COLORS, fmt } from '@/lib/types';
import { resizeImage, renderPdfPage, formatFileSize } from '@/lib/fileUtils';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ReportView from './ReportView';
import ProjectModal from './ProjectModal';
import ReportModal from './ReportModal';
import ExpenseModal from './ExpenseModal';

export default function AppShell() {
  const { user, loading: authLoading } = useAuth();
  const {
    projects,
    loading: dataLoading,
    createProject,
    updateProject,
    deleteProject: deleteProjectDb,
    createReport,
    deleteReport: deleteReportDb,
    addExpense,
    updateExpense: updateExpenseDb,
    deleteExpense,
  } = useSupabaseData();

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
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const ap = () => projects.find(p => p.id === activePid) ?? null;
  const ar = () => { const p = ap(); return p ? p.reports.find(r => r.id === activeRid) ?? null : null; };

  // Project ops - usando Supabase
  async function handleCreateProject(name: string, code: string, color: string) {
    const id = await createProject(name, code, color);
    if (id) {
      setActivePid(id);
      setActiveRid(null);
    }
  }
  async function handleUpdateProject(id: string, name: string, code: string, color: string) {
    await updateProject(id, name, code, color);
  }
  async function handleDeleteProject(id: string) {
    if (!confirm('Excluir este projeto?')) return;
    const success = await deleteProjectDb(id);
    if (success && activePid === id) { 
      setActivePid(null); 
      setActiveRid(null); 
    }
  }

  // Report ops - usando Supabase
  async function handleCreateReport(pid: string, name: string) {
    const id = await createReport(pid, name);
    if (id) {
      setActivePid(pid);
      setActiveRid(id);
      setFilter('all');
    }
  }
  async function handleDeleteReport(pid: string, rid: string) {
    if (!confirm('Excluir este relatório?')) return;
    const success = await deleteReportDb(pid, rid);
    if (success && activeRid === rid) { 
      setActiveRid(null); 
    }
  }

  // Expense ops - usando Supabase
  async function handleUpdateExpense(eid: string, data: Partial<Expense>) {
    await updateExpenseDb(eid, { ...data, confidence: 100 });
  }
  async function handleRemoveExpense(eid: string) {
    await deleteExpense(eid);
  }

  // File handling
  const handleFiles = useCallback(async (files: File[]) => {
    const r = ar();
    if (!r) { alert('Selecione um relatório primeiro.'); return; }
    const valid = files.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (!valid.length) return;

    const rid = r.id;
    for (const file of valid) {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const thumbUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      setQueueItems(prev => [...prev, { id: tempId, name: file.name, size: file.size, status: 'analyzing', thumbUrl }]);

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
          setQueueItems(prev => prev.map(q => q.id === tempId ? { ...q, thumbUrl: pdfThumb } : q));
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

        // Adicionar despesa ao banco via Supabase
        await addExpense(rid, {
          filename: file.name,
          category: data.category ?? 'other',
          establishment: data.establishment ?? 'Não identificado',
          date: data.date ?? '—',
          value: data.value,
          description: data.description ?? file.name,
          confidence: data.confidence ?? 50,
          thumbUrl: pdfThumb ?? thumbUrl,
          imageBase64: base64,
        });
        
        setQueueItems(prev => prev.map(q => q.id === tempId ? { ...q, status: 'done', warning } : q));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setQueueItems(prev => prev.map(q => q.id === tempId ? { ...q, status: 'error', error: msg } : q));
      }
    }
  }, [activePid, activeRid, projects, addExpense]);

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
    
    // Verificar quantas imagens estão disponíveis
    const imageCount = r.expenses.filter(e => e.imageBase64).length;
    const totalCount = r.expenses.length;
    
    // Mostrar aviso sobre imagens
    const message = imageCount === 0
      ? `Nenhuma imagem disponível para o PDF.\n\nAs imagens só ficam disponíveis para comprovantes enviados na sessão atual. Após recarregar a página, as imagens são perdidas.\n\nO PDF será gerado apenas com a tabela de despesas.\n\nDeseja continuar?`
      : imageCount < totalCount
        ? `${imageCount} de ${totalCount} imagens disponíveis.\n\nAs imagens só ficam disponíveis para comprovantes enviados na sessão atual. Comprovantes de sessões anteriores aparecerão sem imagem.\n\nDeseja continuar?`
        : `Todas as ${totalCount} imagens estão disponíveis.\n\nDeseja gerar o PDF?`;
    
    if (!confirm(message)) return;
    
    setIsExportingPDF(true);
    
    try {
      // Ordenar despesas por data
      const sortedExpenses = [...r.expenses].sort((a, b) => {
        const parseDate = (d: string) => {
          if (!d || d === '—') return 0;
          const parts = d.split('/');
          if (parts.length === 3) {
            return new Date(+parts[2], +parts[1] - 1, +parts[0]).getTime();
          }
          return 0;
        };
        return parseDate(a.date) - parseDate(b.date);
      });

      // Calcular totais por categoria
      const totals: Record<string, { count: number; value: number }> = {};
      let grandTotal = 0;
      
      sortedExpenses.forEach(e => {
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

      // Usar imagens de alta qualidade já salvas nas despesas
      const expensesWithImages = sortedExpenses.map((e) => ({
        ...e,
        // Usar imageBase64 se disponível, senão null
        imageForPdf: e.imageBase64 ? `data:image/jpeg;base64,${e.imageBase64}` : undefined,
      }));

      // Gerar HTML com design sóbrio em preto e branco
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${r.name} - Relatório de Despesas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Times New Roman', Times, serif; 
      font-size: 11pt; 
      color: #000; 
      line-height: 1.5;
      background: #fff;
    }
    .page { 
      padding: 2cm; 
      max-width: 21cm; 
      margin: 0 auto; 
    }
    
    /* Cabeçalho */
    .header { 
      border-bottom: 2px solid #000; 
      padding-bottom: 15px; 
      margin-bottom: 25px; 
    }
    .header h1 { 
      font-size: 18pt; 
      font-weight: bold; 
      margin-bottom: 5px;
    }
    .header-info { 
      font-size: 10pt; 
      color: #333;
    }
    .header-info span { 
      margin-right: 20px; 
    }
    
    /* Resumo */
    .summary { 
      margin-bottom: 30px; 
    }
    .summary h2 { 
      font-size: 12pt; 
      font-weight: bold; 
      border-bottom: 1px solid #000; 
      padding-bottom: 5px; 
      margin-bottom: 15px; 
    }
    .summary-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 10px;
    }
    .summary-table td { 
      padding: 5px 10px; 
      border: 1px solid #000; 
    }
    .summary-table td:first-child { 
      font-weight: bold; 
      width: 200px;
    }
    .summary-table td:last-child { 
      text-align: right; 
      font-family: 'Courier New', monospace;
    }
    .summary-table tr:last-child { 
      font-weight: bold; 
      background: #f0f0f0;
    }
    
    /* Tabela de despesas */
    .expenses { 
      margin-bottom: 30px; 
    }
    .expenses h2 { 
      font-size: 12pt; 
      font-weight: bold; 
      border-bottom: 1px solid #000; 
      padding-bottom: 5px; 
      margin-bottom: 15px; 
    }
    .expenses-table { 
      width: 100%; 
      border-collapse: collapse; 
    }
    .expenses-table th { 
      text-align: left; 
      padding: 8px; 
      border: 1px solid #000; 
      background: #f0f0f0; 
      font-size: 10pt;
      font-weight: bold;
    }
    .expenses-table td { 
      padding: 8px; 
      border: 1px solid #000; 
      font-size: 10pt;
      vertical-align: top;
    }
    .expenses-table td.value { 
      text-align: right; 
      font-family: 'Courier New', monospace;
    }
    .expenses-table td.date { 
      white-space: nowrap;
    }
    .expenses-table td.code { 
      font-family: 'Courier New', monospace;
      font-size: 9pt;
    }
    
    /* Comprovantes - cada um em página própria para máxima legibilidade */
    .receipts { 
      page-break-before: always; 
    }
    .receipts h2 { 
      font-size: 12pt; 
      font-weight: bold; 
      border-bottom: 1px solid #000; 
      padding-bottom: 5px; 
      margin-bottom: 20px; 
    }
    .receipt { 
      page-break-after: always;
      page-break-inside: avoid; 
      border: 1px solid #000;
      padding: 15px;
      min-height: 85vh;
    }
    .receipt:last-child {
      page-break-after: auto;
    }
    .receipt-header {
      font-size: 11pt;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #000;
    }
    .receipt-filename { 
      font-weight: bold;
      font-size: 12pt;
    }
    .receipt-details {
      font-size: 10pt;
      color: #000;
      margin-top: 5px;
    }
    .receipt-image { 
      width: 100%;
      max-height: 75vh;
      object-fit: contain;
      display: block;
      margin: 10px auto;
    }
    .no-image {
      text-align: center;
      padding: 60px;
      background: #f5f5f5;
      color: #666;
      font-style: italic;
      font-size: 12pt;
    }
    
    /* Rodapé */
    .footer { 
      margin-top: 40px; 
      padding-top: 15px; 
      border-top: 1px solid #000; 
      font-size: 9pt; 
      color: #666;
      text-align: center;
    }
    
    @media print {
      .page { padding: 1cm; }
      .receipt { page-break-inside: avoid; }
      .receipts { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Cabeçalho -->
    <div class="header">
      <h1>Relatório de Despesas</h1>
      <div class="header-info">
        <span><strong>Projeto:</strong> ${p!.name}</span>
        ${p!.code ? `<span><strong>Código:</strong> ${p!.code}</span>` : ''}
        <span><strong>Relatório:</strong> ${r.name}</span>
      </div>
    </div>

    <!-- Resumo por Categoria -->
    <div class="summary">
      <h2>Resumo por Categoria</h2>
      <table class="summary-table">
        ${Object.entries(totals).map(([cat, data]) => `
          <tr>
            <td>${catLabels[cat] || cat} (${data.count})</td>
            <td>${fmtCurrency(data.value)}</td>
          </tr>
        `).join('')}
        <tr>
          <td>TOTAL (${sortedExpenses.length} documentos)</td>
          <td>${fmtCurrency(grandTotal)}</td>
        </tr>
      </table>
    </div>

    <!-- Tabela de Despesas -->
    <div class="expenses">
      <h2>Detalhamento das Despesas</h2>
      <table class="expenses-table">
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>Classificação</th>
            <th>Valor</th>
            <th>Data</th>
            <th>Código</th>
          </tr>
        </thead>
        <tbody>
          ${expensesWithImages.map(e => `
            <tr>
              <td>${e.filename}</td>
              <td>${catLabels[e.category] || e.category}</td>
              <td class="value">${e.value != null ? fmtCurrency(e.value) : '—'}</td>
              <td class="date">${e.date}</td>
              <td class="code">${p!.code || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Comprovantes -->
    <div class="receipts">
      <h2>Comprovantes</h2>
      ${expensesWithImages.map((e, i) => `
        <div class="receipt">
          <div class="receipt-header">
            <div class="receipt-filename">${i + 1}. ${e.filename}</div>
            <div class="receipt-details">
              ${catLabels[e.category] || e.category} | 
              ${e.date} | 
              ${e.value != null ? fmtCurrency(e.value) : '—'}
            </div>
          </div>
          ${e.imageForPdf 
            ? `<img class="receipt-image" src="${e.imageForPdf}" alt="${e.filename}" />`
            : `<div class="no-image">Imagem não disponível</div>`
          }
        </div>
      `).join('')}
    </div>

    <!-- Rodapé -->
    <div class="footer">
      Documento gerado em ${new Date().toLocaleString('pt-BR')}
    </div>
  </div>
</body>
</html>`;

      // Abrir nova janela com o HTML para impressão
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Aguardar imagens carregarem e imprimir
        setTimeout(() => {
          printWindow.print();
        }, 500);
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

  // Mostrar loading enquanto carrega auth ou dados
  if (authLoading || dataLoading) {
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
          onDeleteProject={handleDeleteProject}
          onNewReport={(pid) => { setPendRpid(pid); setShowRM(true); setShowMobileMenu(false); }}
          onDeleteReport={handleDeleteReport}
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
              onRemoveExpense={handleRemoveExpense}
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
            if (editPid) handleUpdateProject(editPid, name, code, color);
            else handleCreateProject(name, code, color);
            setShowPM(false);
          }}
          onClose={() => setShowPM(false)}
        />
      )}
      {showRM && pendRpid && (
        <ReportModal
          onSave={(name) => { handleCreateReport(pendRpid, name); setShowRM(false); }}
          onClose={() => setShowRM(false)}
        />
      )}
      {showEM && editEid && (
        <ExpenseModal
          expense={(() => { for (const p of projects) for (const r of p.reports) { const e = r.expenses.find(x => x.id === editEid); if (e) return e; } return null; })()!}
          onSave={(data) => { handleUpdateExpense(editEid, data); setShowEM(false); }}
          onClose={() => setShowEM(false)}
        />
      )}
    </div>
  );
}
