'use client';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
  async function signInWithGoogle() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit',
        },
        cookieOptions: {
          name: 'sb',
          lifetime: 60 * 60 * 8,
          domain: '',
          path: '/',
          sameSite: 'lax',
        },
      }
    );

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm rounded-2xl p-8 border" style={{ background: 'var(--surf)', borderColor: 'var(--brd)' }}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e4d6b)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 14l2 2 4-4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
                stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>Expense Manager</div>
            <div className="text-xs" style={{ color: 'var(--tx3)' }}>Portal de Reembolso</div>
          </div>
        </div>

        <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--tx)' }}>Entrar</h1>
        <p className="text-sm mb-7" style={{ color: 'var(--tx2)' }}>
          Acesse com sua conta Google para gerenciar suas despesas.
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-sm transition-opacity hover:opacity-90"
          style={{ background: '#fff', color: '#1f1f1f', border: '1px solid #dadce0' }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
            <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.32-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
            <path fill="#FBBC05" d="M11.68 28.18A13.8 13.8 0 0 1 10.8 24c0-1.45.25-2.86.68-4.18v-5.7H4.34A23.93 23.93 0 0 0 0 24c0 3.86.92 7.51 2.54 10.74l7.14-5.56z"/>
            <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.19 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.34 5.7c1.74-5.2 6.59-9.07 12.32-9.07z"/>
          </svg>
          Continuar com Google
        </button>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--tx3)' }}>
          Seus dados ficam salvos na nuvem e só você os acessa.
        </p>
      </div>
    </div>
  );
}
