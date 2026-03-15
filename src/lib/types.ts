export type Category = 'restaurant' | 'transport' | 'hotel' | 'flight' | 'other';

export interface Expense {
  id: string;
  filename: string;
  category: Category;
  establishment: string;
  date: string;
  value: number | null;
  description: string;
  confidence: number;
  thumbUrl?: string;
}

export interface Report {
  id: string;
  name: string;
  expenses: Expense[];
}

export interface Project {
  id: string;
  name: string;
  code: string;
  color: string;
  reports: Report[];
}

// Cores fixas que funcionam em ambos os temas
export const CAT: Record<Category, { label: string; icon: string; color: string; bg: string; border: string }> = {
  restaurant: { label: 'Alimentação', icon: '🍽', color: '#b45309', bg: 'rgba(245,158,11,.15)', border: 'rgba(180,83,9,.4)' },
  transport:  { label: 'Transporte',  icon: '🚗', color: '#2563eb', bg: 'rgba(59,130,246,.15)', border: 'rgba(37,99,235,.4)' },
  hotel:      { label: 'Hospedagem',  icon: '🏨', color: '#047857', bg: 'rgba(16,185,129,.15)', border: 'rgba(4,120,87,.4)' },
  flight:     { label: 'Passagem Aérea', icon: '✈️', color: '#dc2626', bg: 'rgba(239,68,68,.15)', border: 'rgba(220,38,38,.4)' },
  other:      { label: 'Outros',      icon: '📄', color: '#64748b', bg: 'rgba(100,116,139,.15)', border: 'rgba(100,116,139,.4)' },
};

export const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

export const fmt = (v: number) => 'R$ ' + v.toFixed(2).replace('.', ',');
