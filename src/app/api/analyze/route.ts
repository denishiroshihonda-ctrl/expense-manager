import { NextResponse } from 'next/server';

// Tipos
interface Expense {
  id: string;
  filename: string;
  category: string;
  establishment: string;
  date: string;
  value: number | null;
  confidence: number;
  imageBase64?: string;
}

interface ReportData {
  projectName: string;
  projectCode: string;
  reportName: string;
  expenses: Expense[];
  generatedAt: string;
}

const CAT_LABELS: Record<string, string> = {
  restaurant: 'Alimentação',
  transport: 'Transporte',
  hotel: 'Hospedagem',
  flight: 'Passagem Aérea',
  other: 'Outros',
};

export async function POST(req: Request) {
  try {
    const data: ReportData = await req.json();
    
    // Gerar HTML do relatório
    const html = generateReportHTML(data);
    
    // Retornar HTML para ser convertido em PDF no cliente
    return NextResponse.json({ html });
  } catch (error: any) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao gerar PDF' },
      { status: 500 }
    );
  }
}

function generateReportHTML(data: ReportData): string {
  const { projectName, projectCode, reportName, expenses, generatedAt } = data;
  
  // Calcular totais por categoria
  const totals: Record<string, { count: number; value: number }> = {};
  let grandTotal = 0;
  
  expenses.forEach(e => {
    if (!totals[e.category]) {
      totals[e.category] = { count: 0, value: 0 };
    }
    totals[e.category].count++;
    totals[e.category].value += e.value || 0;
    grandTotal += e.value || 0;
  });

  const formatCurrency = (v: number) => 
    'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportName} - Expense Manager</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      font-size: 11px; 
      color: #1e293b;
      line-height: 1.4;
    }
    .page { 
      padding: 40px; 
      max-width: 800px; 
      margin: 0 auto;
    }
    .header { 
      border-bottom: 2px solid #3b82f6; 
      padding-bottom: 20px; 
      margin-bottom: 24px;
    }
    .logo { 
      font-size: 20px; 
      font-weight: bold; 
      color: #3b82f6;
      margin-bottom: 4px;
    }
    .subtitle { 
      font-size: 10px; 
      color: #64748b; 
    }
    .project-info {
      margin-top: 16px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 6px;
    }
    .project-name { 
      font-size: 16px; 
      font-weight: 600;
      color: #1e293b;
    }
    .project-code {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 8px;
      background: #dbeafe;
      color: #2563eb;
      border-radius: 4px;
      font-family: monospace;
      font-size: 10px;
      font-weight: 600;
    }
    .report-name {
      margin-top: 6px;
      font-size: 12px;
      color: #64748b;
    }
    .summary {
      margin-bottom: 24px;
    }
    .summary h2 {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .summary-card {
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .summary-card.total {
      background: #dbeafe;
      border-color: #93c5fd;
    }
    .summary-label {
      font-size: 9px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .summary-value {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-top: 4px;
      font-family: monospace;
    }
    .summary-card.total .summary-value {
      color: #2563eb;
    }
    .summary-count {
      font-size: 9px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .expenses h2 {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .expense-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .expense-table th {
      text-align: left;
      padding: 8px 10px;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      font-size: 9px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .expense-table td {
      padding: 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .expense-table tr:last-child td {
      border-bottom: none;
    }
    .category-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
    }
    .cat-restaurant { background: #fef3c7; color: #b45309; }
    .cat-transport { background: #dbeafe; color: #2563eb; }
    .cat-hotel { background: #d1fae5; color: #047857; }
    .cat-flight { background: #fee2e2; color: #dc2626; }
    .cat-other { background: #f1f5f9; color: #64748b; }
    .value { 
      font-family: monospace; 
      font-weight: 600;
    }
    .confidence {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .confidence-bar {
      width: 40px;
      height: 4px;
      background: #e2e8f0;
      border-radius: 2px;
      overflow: hidden;
    }
    .confidence-fill {
      height: 100%;
      background: #10b981;
      border-radius: 2px;
    }
    .confidence-text {
      font-size: 9px;
      color: #64748b;
    }
    .receipts {
      page-break-before: always;
    }
    .receipts h2 {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }
    .receipt-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .receipt-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .receipt-image {
      width: 100%;
      height: 180px;
      object-fit: contain;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .receipt-info {
      padding: 10px;
    }
    .receipt-establishment {
      font-weight: 600;
      font-size: 11px;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .receipt-details {
      font-size: 10px;
      color: #64748b;
    }
    .receipt-value {
      font-family: monospace;
      font-weight: 600;
      color: #1e293b;
      margin-top: 6px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
    @media print {
      .page { padding: 20px; }
      .receipts { page-break-before: always; }
      .receipt-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo">Expense Manager</div>
      <div class="subtitle">Relatório de Despesas</div>
      <div class="project-info">
        <div class="project-name">${projectName}</div>
        ${projectCode ? `<span class="project-code">${projectCode}</span>` : ''}
        <div class="report-name">📄 ${reportName}</div>
      </div>
    </div>

    <div class="summary">
      <h2>Resumo por Categoria</h2>
      <div class="summary-grid">
        ${Object.entries(totals).map(([cat, data]) => `
          <div class="summary-card">
            <div class="summary-label">${CAT_LABELS[cat] || cat}</div>
            <div class="summary-value">${formatCurrency(data.value)}</div>
            <div class="summary-count">${data.count} comprovante${data.count !== 1 ? 's' : ''}</div>
          </div>
        `).join('')}
        <div class="summary-card total">
          <div class="summary-label">💰 Total Geral</div>
          <div class="summary-value">${formatCurrency(grandTotal)}</div>
          <div class="summary-count">${expenses.length} documento${expenses.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    </div>

    <div class="expenses">
      <h2>Lista de Despesas</h2>
      <table class="expense-table">
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>Categoria</th>
            <th>Estabelecimento</th>
            <th>Data</th>
            <th>Valor</th>
            <th>Conf.</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map(e => `
            <tr>
              <td>${e.filename}</td>
              <td><span class="category-badge cat-${e.category}">${CAT_LABELS[e.category] || e.category}</span></td>
              <td>${e.establishment}</td>
              <td>${e.date}</td>
              <td class="value">${e.value != null ? formatCurrency(e.value) : '—'}</td>
              <td>
                <div class="confidence">
                  <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${e.confidence}%"></div>
                  </div>
                  <span class="confidence-text">${e.confidence}%</span>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${expenses.some(e => e.imageBase64) ? `
    <div class="receipts">
      <h2>Comprovantes</h2>
      <div class="receipt-grid">
        ${expenses.filter(e => e.imageBase64).map(e => `
          <div class="receipt-card">
            <img class="receipt-image" src="${e.imageBase64}" alt="${e.filename}" />
            <div class="receipt-info">
              <div class="receipt-establishment">${e.establishment}</div>
              <div class="receipt-details">${e.date} • ${e.filename}</div>
              <div class="receipt-value">${e.value != null ? formatCurrency(e.value) : '—'}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div class="footer">
      Gerado em ${generatedAt} • Expense Manager
    </div>
  </div>
</body>
</html>
  `;
}
