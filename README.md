# MiniGram — minigram.net

AI-powered Telegram Mini App generator. Describe your app — Claude generates a complete, production-ready package in ~45 seconds.

**Stack:** Next.js 14 · Supabase · Claude Sonnet 4 · Tailwind CSS · Vercel

---

## Launch in 20 minutes

### 1 — Install

```bash
unzip minigram.zip
cd minigram
npm install
```

### 2 — Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-api03-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://minigram.net
```

### 3 — Supabase database

1. Supabase dashboard → SQL Editor → New query
2. Paste supabase-schema.sql → Run

### 4 — Supabase Auth settings

Authentication → URL Configuration:
- Site URL: https://minigram.net
- Redirect URLs: https://minigram.net/auth/callback

### 5 — Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add env vars in Vercel dashboard: Project → Settings → Environment Variables
(same four vars from .env.local + NEXT_PUBLIC_APP_URL=https://minigram.net)

### 6 — Custom domain

Vercel dashboard → Project → Settings → Domains → Add minigram.net

In your domain registrar DNS:
- A record: @ → 76.76.21.21
- CNAME: www → cname.vercel-dns.com

SSL is automatic. DNS takes 5-30 minutes.

---

## Test locally

```bash
npm run dev
# http://localhost:3000
```

| URL | Page |
|---|---|
| / | Landing page |
| /builder | App generator + Monaco editor |
| /deploy | Deploy wizard |
| /dashboard | Projects |
| /auth/login | Login |
| /auth/signup | Signup |

---

## Environment variables

| Variable | Description |
|---|---|
| ANTHROPIC_API_KEY | Claude API — console.anthropic.com |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key |
| NEXT_PUBLIC_APP_URL | https://minigram.net |

---

hello@minigram.net · Built with Claude Sonnet 4 · 2026 MiniGram
