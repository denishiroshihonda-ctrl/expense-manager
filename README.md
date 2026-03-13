# Expense Manager — Guia de Deploy

App de reembolso de despesas com IA. Login com Google, análise automática de comprovantes,
dados salvos na nuvem. Gratuito para hospedar.

---

## Pré-requisitos (tudo gratuito)

| Serviço | Para que serve | Link |
|---|---|---|
| GitHub | Guardar o código | github.com |
| Vercel | Hospedar o app | vercel.com |
| Supabase | Banco de dados + login Google | supabase.com |
| Anthropic | IA para analisar comprovantes | console.anthropic.com |

---

## Passo 1 — Criar conta no GitHub e subir o código

1. Acesse **github.com** e crie uma conta (ou entre na sua)
2. Clique em **New repository** (botão verde)
3. Nome: `expense-manager` · Visibilidade: **Private** · Clique em **Create repository**
4. Na tela seguinte, clique em **uploading an existing file**
5. Arraste **toda a pasta `expense-app`** para a área de upload
6. Clique em **Commit changes**

---

## Passo 2 — Criar projeto no Supabase

1. Acesse **supabase.com** → **Start your project** → entre com GitHub
2. Clique em **New project**
   - Nome: `expense-manager`
   - Database Password: crie uma senha forte (anote!)
   - Region: **South America (São Paulo)**
3. Aguarde ~2 minutos o projeto iniciar
4. No menu lateral, vá em **SQL Editor** → **New query**
5. Cole todo o conteúdo do arquivo `supabase-schema.sql` e clique em **Run**
6. Anote as chaves em **Settings → API**:
   - `Project URL` → ex: `https://abcdef.supabase.co`
   - `anon public` key → chave longa começando com `eyJ...`

---

## Passo 3 — Configurar login com Google no Supabase

1. No Supabase, vá em **Authentication → Providers → Google**
2. Ative o toggle **Enable Google provider**
3. Você vai precisar de um **Client ID** e **Client Secret** do Google:
   - Acesse **console.cloud.google.com**
   - Crie um projeto → **APIs & Services → Credentials**
   - Clique em **Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Em **Authorized redirect URIs**, adicione:
     `https://SEU_PROJETO.supabase.co/auth/v1/callback`
   - Copie o **Client ID** e **Client Secret**
4. Cole no Supabase e salve

---

## Passo 4 — Deploy no Vercel

1. Acesse **vercel.com** → entre com GitHub → **Add New Project**
2. Selecione o repositório `expense-manager`
3. Antes de clicar em Deploy, configure as **Environment Variables**:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `ANTHROPIC_API_KEY` | Sua chave `sk-ant-...` |
| `NEXT_PUBLIC_SITE_URL` | URL do seu app (preencha depois do deploy) |

4. Clique em **Deploy** — aguarde ~2 minutos
5. Copie a URL gerada (ex: `https://expense-manager-xyz.vercel.app`)
6. Volte nas variáveis do Vercel, atualize `NEXT_PUBLIC_SITE_URL` com essa URL
7. Vá no Supabase → **Authentication → URL Configuration** e adicione:
   - Site URL: `https://sua-url.vercel.app`
   - Redirect URLs: `https://sua-url.vercel.app/auth/callback`

---

## Passo 5 — Compartilhar com a equipe

Pronto! Basta compartilhar o link do Vercel.

Cada pessoa entra com o próprio Google e vê apenas os próprios projetos.
Ninguém precisa de API key — a sua já está configurada no Vercel.

---

## Atualizar o app no futuro

Para atualizar depois:
1. Edite os arquivos localmente
2. Faça upload no GitHub (substituindo os arquivos)
3. O Vercel detecta automaticamente e faz novo deploy em ~1 minuto

---

## Custos estimados

| Serviço | Plano gratuito | Quando pagar |
|---|---|---|
| Vercel | 100GB bandwidth/mês | +20 usuários ativos |
| Supabase | 500MB banco, 50k usuários | Banco cheio |
| Anthropic | Pago por uso | ~R$ 0,05 por comprovante |
| GitHub | Repositórios privados ilimitados | Nunca (para este caso) |
