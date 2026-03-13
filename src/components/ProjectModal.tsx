'use client';
import { useState, useEffect } from 'react';
import { Project, COLORS } from '@/lib/types';

interface Props {
  project?: Project;
  onSave: (name: string, code: string, color: string) => void;
  onClose: () => void;
}

export default function ProjectModal({ project, onSave, onClose }: Props) {
  const [name, setName] = useState(project?.name ?? '');
  const [code, setCode] = useState(project?.code ?? '');
  const [color, setColor] = useState(project?.color ?? COLORS[0]);

  useEffect(() => { setTimeout(() => document.getElementById('pm-name')?.focus(), 80); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 overflow-y-auto" style={{ background: 'rgba(0,0,0,.7)' }} onClick={onClose}>
      <div className="rounded-xl p-5 w-full max-w-sm mb-16" style={{ background: 'var(--surf)', border: '1px solid var(--brd)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{project ? 'Editar projeto' : 'Novo projeto'}</h2>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-xs" style={{ background: 'var(--surf2)', border: '1px solid var(--brd)', color: 'var(--tx3)' }}>✕</button>
        </div>
        <div className="mb-3">
          <label className="block text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--tx3)' }}>Nome do projeto</label>
          <input id="pm-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Expansão SP 2026" maxLength={60}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: 'var(--surf2)', border: '1px solid var(--brd)', color: 'var(--tx)' }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = 'var(--brd)'} />
        </div>
        <div className="mb-3">
          <label className="block text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--tx3)' }}>Código <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span></label>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: PRJ-2026-042" maxLength={40}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={{ background: 'var(--surf2)', border: '1px solid var(--brd)', color: 'var(--tx)', fontFamily: 'monospace' }}
            onFocus={e => e.target.style.borderColor = '#3b82f6'} onBlur={e => e.target.style.borderColor = 'var(--brd)'} />
        </div>
        <div className="mb-5">
          <label className="block text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tx3)' }}>Cor</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <div key={c} onClick={() => setColor(c)} className="w-5 h-5 rounded-full cursor-pointer transition-all" style={{ background: c, border: `2px solid ${color === c ? 'var(--tx)' : 'transparent'}`, outline: color === c ? '1px solid var(--brd2)' : 'none' }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: '1px solid var(--brd)', color: 'var(--tx2)', background: 'transparent' }}>Cancelar</button>
          <button onClick={() => { if (!name.trim()) { document.getElementById('pm-name')?.focus(); return; } onSave(name.trim(), code.trim(), color); }}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: '#3b82f6' }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
