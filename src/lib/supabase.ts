import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Tipos do banco de dados
export interface DbProject {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  color: string;
  created_at: string;
}

export interface DbReport {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

export interface DbExpense {
  id: string;
  report_id: string;
  filename: string;
  category: string;
  establishment: string | null;
  date: string | null;
  value: number | null;
  description: string | null;
  confidence: number;
  image_base64: string | null;
  created_at: string;
}
