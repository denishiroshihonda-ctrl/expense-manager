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

export const CAT: Record<Category, { label: string; icon: string; cls: string }> = {
  restaurant: { label: 'Alimentação', icon: '🍽', cls: 'text-amber-400 bg-amber-900/30 border-amber-700/50' },
  transport:  { label: 'Transporte',  icon: '🚗', cls: 'text-blue-400  bg-blue-900/30  border-blue-700/50'  },
  hotel:      { label: 'Hospedagem',  icon: '🏨', cls: 'text-green-400 bg-green-900/30 border-green-700/50' },
  flight:     { label: 'Passagem Aérea', icon: '✈️', cls: 'text-red-400 bg-red-900/30 border-red-700/50' },
  other:      { label: 'Outros',      icon: '📄', cls: 'text-slate-400 bg-slate-800/50 border-slate-600/50' },
};

export const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

export const fmt = (v: number) => 'R$ ' + v.toFixed(2).replace('.', ',');
