# Personal ATS

Password-protected web app that generates tailored CVs and cover letters from a job description using Claude AI.

## Setup

```bash
cd personal_ATS
npm install
cp .env.local.example .env.local
# Edit .env.local — add your Anthropic API key, password, and JWT secret
npm run dev
```

Open http://localhost:3000, enter your password.

## Deployment (Vercel — recommended)

1. Push this repo to a **private** GitHub repository
2. Import the repo into [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `ANTHROPIC_API_KEY`
   - `ATS_PASSWORD`
   - `JWT_SECRET` (run `openssl rand -base64 32` to generate)
4. Deploy — Vercel gives you a private URL only you know

> **Why Vercel instead of GitHub Pages?**
> The app calls the Claude API server-side (keeping your API key secret). GitHub Pages is static-only and can't run server-side code. Vercel deploys from your private GitHub repo, so your code stays private.

## How it works

1. Paste a job description → click Generate
2. Claude reads your profile from `data/profile.json` and generates:
   - A tailored CV as LaTeX source (matching your existing LaTeX style)
   - A cover letter in your voice as LaTeX source
3. Download the `.tex` files → compile with `pdflatex`
4. CV and CL are automatically named and use language matching the JD (EN/DE)

## Updating your profile

Edit `data/profile.json` to update:
- Employment dates (update `end` dates as things change)
- New projects
- New skills
- New awards

## Adding base CVs

Drop `.tex` files into `data/base_cvs/` — Claude will reference them for style and content.

## File structure

```
personal_ATS/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── login/page.tsx        # Login
│   └── api/
│       ├── generate/route.ts # Claude API endpoint
│       └── auth/route.ts     # Auth endpoint
├── components/               # UI components
├── data/
│   ├── profile.json          # Your personal data — edit this
│   └── base_cvs/             # Add your base .tex CV files here
├── lib/types.ts
├── middleware.ts             # Auth protection
└── .env.local.example        # Copy to .env.local
```
