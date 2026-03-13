'use client';
import { useState, useEffect } from 'react';
import { Expense, Category, CAT } from '@/lib/types';

// ── Report Modal ──────────────────────────────────────────────
export function ReportModal({ onSave, onClose }: { onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  useEffect(() => { setTimeout(() => document.getElementById('rm-name')?.focus(), 80); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16" style={{ background: 'rgba(0,0,0,.7)' }} onClick={onClose}>
      <div className="rounded-xl p-5 w-full max-w-xs" style={{ background: 'var(--surf)', border: '1px solid var(--brd)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>Novo relatório</h2>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-xs" style={{ background: 'var(--surf2)', border: '1px solid var(--brd)', color: 'var(--tx3)' }}>✕</button>
        </div>
        <div className="mb-4">
          <label className="block text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--tx3)' }}>Nome</label>
          <input id="rm-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Viagem cliente – Mar 2026" maxLength={60}
            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim()); }}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: 'var(--surf2)', border: '1px solid var(--brd)', color: 'var(--tx)' }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = 'var(--brd)'} />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--brd)', color: 'var(--tx2)' }}>Cancelar</button>
          <button onClick={() => { if (!name.trim()) return; onSave(name.trim()); }}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#3b82f6' }}>Criar</button>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;

// ── Expense Modal ─────────────────────────────────────────────
export function ExpenseModal({ expense, onSave, onClose }: { expense: Expense; onSave: (data: Partial<Expense>) => void; onClose: () => void }) {
  const [category, setCategory] = useState<Category>(expense.category);
  const [establishment, setEstablishment] = useState(expense.establishment);
  const [date, setDate] = useState(expense.date === '—' ? '' : expense.date);
  const [value, setValue] = useState(expense.value != null ? String(expense.value) : '');
  const [description, setDescription] = useState(expense.description);

  const inputCls = "w-full px-3 py-2 rounded-lg text-xs outline-none";
  const inputStyle = { background: 'var(--surf2)', border: '1px solid var(--brd)', color: 'var(--tx)' };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 overflow-y-auto" style={{ background: 'rgba(0,0,0,.7)' }} onClick={onClose}>
      <div className="rounded-xl p-5 w-full max-w-sm mb-12" style={{ background: 'var(--surf)', border: '1px solid var(--brd)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold truncate pr-4" style={{ color: 'var(--tx)' }}>Editar — {expense.filename}</h2>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0" style={{ background: 'var(--surf2)', border: '1px solid var(--brd)', color: 'var(--tx3)' }}>✕</button>
        </div>

        <div className="mb-3">
          <label className="block text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--tx3)' }}>Categoria</label>
          <select value={category} onChange={e => setCategory(e.target.value as Category)} className={inputCls} style={inputStyle}>
            {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="block text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--tx3)' }}>Estabelecimento</label>
          <input value={establishment} onChange={e => setEstablishment(e.target.value)} className={inputCls} style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = 'var(--brd)'} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--tx3)' }}>Data</label>
            <input value={date} onChange={e => setDate(e.target.value)} placeholder="DD/MM/AAAA" className={inputCls} style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = 'var(--brd)'} />
          </div>
          <div>
            <label className="block text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--tx3)' }}>Valor (R$)</label>
            <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} className={inputCls} style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = 'var(--brd)'} />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--tx3)' }}>Descrição</label>
          <input value={description} onChange={e => setDescription(e.target.value)} className={inputCls} style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = 'var(--brd)'} />
        </div>
        {expense.thumbUrl && <img src={expense.thumbUrl} className="w-full rounded-lg mb-4 max-h-36 object-contain" style={{ border: '1px solid var(--brd)', background: 'var(--surf2)' }} />}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--brd)', color: 'var(--tx2)' }}>Cancelar</button>
          <button onClick={() => onSave({ category, establishment, date: date || '—', value: parseFloat(value) || null, description })}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#3b82f6' }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
