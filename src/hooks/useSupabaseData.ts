'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient, DbProject, DbReport, DbExpense } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project, Report, Expense, Category } from '@/lib/types';

export function useSupabaseData() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Carregar todos os dados do usuário
  const loadData = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar projetos
      const { data: dbProjects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Buscar relatórios
      const { data: dbReports, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: true });

      if (reportsError) throw reportsError;

      // Buscar despesas
      const { data: dbExpenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: true });

      if (expensesError) throw expensesError;

      // Montar estrutura hierárquica
      const projectsWithData: Project[] = (dbProjects || []).map((p: DbProject) => {
        const reports: Report[] = (dbReports || [])
          .filter((r: DbReport) => r.project_id === p.id)
          .map((r: DbReport) => ({
            id: r.id,
            name: r.name,
            expenses: (dbExpenses || [])
              .filter((e: DbExpense) => e.report_id === r.id)
              .map((e: DbExpense) => ({
                id: e.id,
                filename: e.filename,
                category: e.category as Category,
                establishment: e.establishment || 'Não identificado',
                date: e.date || '—',
                value: e.value,
                description: e.description || '',
                confidence: e.confidence,
                imageBase64: e.image_base64 || undefined,
              })),
          }));

        return {
          id: p.id,
          name: p.name,
          code: p.code || '',
          color: p.color,
          reports,
        };
      });

      setProjects(projectsWithData);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // Carregar dados quando usuário mudar
  useEffect(() => {
    loadData();
  }, [loadData]);

  // === OPERAÇÕES DE PROJETO ===

  const createProject = async (name: string, code: string, color: string): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name, code, color })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar projeto:', error);
      return null;
    }

    const newProject: Project = { id: data.id, name, code, color, reports: [] };
    setProjects(prev => [newProject, ...prev]);
    return data.id;
  };

  const updateProject = async (id: string, name: string, code: string, color: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ name, code, color })
      .eq('id', id);

    if (error) {
      console.error('Erro ao atualizar projeto:', error);
      return;
    }

    setProjects(prev => prev.map(p => p.id === id ? { ...p, name, code, color } : p));
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir projeto:', error);
      return false;
    }

    setProjects(prev => prev.filter(p => p.id !== id));
    return true;
  };

  // === OPERAÇÕES DE RELATÓRIO ===

  const createReport = async (projectId: string, name: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('reports')
      .insert({ project_id: projectId, name })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar relatório:', error);
      return null;
    }

    const newReport: Report = { id: data.id, name, expenses: [] };
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, reports: [...p.reports, newReport] } : p
    ));
    return data.id;
  };

  const deleteReport = async (projectId: string, reportId: string) => {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (error) {
      console.error('Erro ao excluir relatório:', error);
      return false;
    }

    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, reports: p.reports.filter(r => r.id !== reportId) } : p
    ));
    return true;
  };

  // === OPERAÇÕES DE DESPESA ===

  const addExpense = async (reportId: string, expense: Omit<Expense, 'id'>): Promise<string | null> => {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        report_id: reportId,
        filename: expense.filename,
        category: expense.category,
        establishment: expense.establishment,
        date: expense.date,
        value: expense.value,
        description: expense.description,
        confidence: expense.confidence,
        image_base64: expense.imageBase64,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao adicionar despesa:', error);
      return null;
    }

    const newExpense: Expense = { ...expense, id: data.id };
    setProjects(prev => prev.map(p => ({
      ...p,
      reports: p.reports.map(r => 
        r.id === reportId ? { ...r, expenses: [...r.expenses, newExpense] } : r
      ),
    })));
    return data.id;
  };

  const updateExpense = async (expenseId: string, updates: Partial<Expense>) => {
    const dbUpdates: any = {};
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.establishment !== undefined) dbUpdates.establishment = updates.establishment;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.confidence !== undefined) dbUpdates.confidence = updates.confidence;

    const { error } = await supabase
      .from('expenses')
      .update(dbUpdates)
      .eq('id', expenseId);

    if (error) {
      console.error('Erro ao atualizar despesa:', error);
      return;
    }

    setProjects(prev => prev.map(p => ({
      ...p,
      reports: p.reports.map(r => ({
        ...r,
        expenses: r.expenses.map(e => e.id === expenseId ? { ...e, ...updates } : e),
      })),
    })));
  };

  const deleteExpense = async (expenseId: string) => {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      console.error('Erro ao excluir despesa:', error);
      return false;
    }

    setProjects(prev => prev.map(p => ({
      ...p,
      reports: p.reports.map(r => ({
        ...r,
        expenses: r.expenses.filter(e => e.id !== expenseId),
      })),
    })));
    return true;
  };

  return {
    projects,
    loading,
    error,
    reload: loadData,
    createProject,
    updateProject,
    deleteProject,
    createReport,
    deleteReport,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
