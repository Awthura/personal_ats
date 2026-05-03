# Personal ATS

Password-protected web app that generates tailored CVs and cover letters from a job description using Claude AI.

**Architecture:** Static Next.js frontend on GitHub Pages + Cloudflare Worker backend (API proxy + auth). Your personal data never touches the git repo.

---

## How it works

```
Browser (GitHub Pages)
    ↓  POST /generate  { jd, password }
Cloudflare Worker
    ↓  reads PROFILE_JSON secret + calls Anthropic API
Claude claude-sonnet-4-6
    ↑  returns { cv_latex, cl_latex, ... }
Browser
    → download .tex files → compile with pdflatex
```

---

## Setup

### 1. Personal data

```bash
cp data/profile.example.json data/profile.json
# Edit data/profile.json with your details
```

`profile.json` is git-ignored — it never leaves your machine until you push it to Cloudflare as a secret (step 3).

### 2. Deploy the Cloudflare Worker

```bash
cd worker
npm install
npx wrangler login          # opens browser, log in to Cloudflare

# Set secrets (stored in Cloudflare, never in git)
npx wrangler secret put ANTHROPIC_API_KEY    # your Anthropic API key
npx wrangler secret put ATS_PASSWORD         # your chosen access password
npx wrangler secret put PROFILE_JSON < ../data/profile.json   # your profile data

# Edit wrangler.toml → set ALLOWED_ORIGIN to your GitHub Pages URL
# e.g. https://yourusername.github.io

npx wrangler deploy
# Note the Worker URL it prints, e.g. https://personal-ats.yourname.workers.dev
```

### 3. Configure GitHub repo secrets

In your GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|--------|-------|
| `WORKER_URL` | Your Worker URL from step 2 |
| `BASE_PATH` | `/your-repo-name` (e.g. `/personal_ats`) — or empty if using a custom domain |

### 4. Enable GitHub Pages

GitHub repo → Settings → Pages → Source: **GitHub Actions**

### 5. Push and deploy

```bash
git push origin main
```

GitHub Actions builds the static site and deploys to GitHub Pages automatically.

### 6. Access

Visit `https://yourusername.github.io/your-repo-name`, enter your password.

---

## Local development

```bash
# Terminal 1 — run the Worker locally
cd worker
npm install
npx wrangler dev

# Terminal 2 — run the frontend
cd ..
cp .env.local.example .env.local
# Set NEXT_PUBLIC_WORKER_URL=http://localhost:8787
npm install
npm run dev
```

---

## Updating your profile

```bash
# Edit data/profile.json locally, then push the updated secret:
cd worker
npx wrangler secret put PROFILE_JSON < ../data/profile.json
```

## Adding base CV templates

Drop `.tex` files into `data/base_cvs/`. They are git-ignored but the Worker can optionally read them if you extend the Worker to accept them as secrets or R2 objects.

---

## File structure

```
personal_ATS/
├── app/                    # Next.js static frontend
│   ├── page.tsx            # Dashboard
│   └── login/page.tsx      # Login
├── components/             # UI components
├── worker/
│   ├── index.ts            # Cloudflare Worker (auth + Claude proxy)
│   ├── wrangler.toml       # Worker config
│   └── package.json
├── data/
│   ├── profile.example.json   # Template — copy to profile.json
│   ├── profile.json           # YOUR DATA — git-ignored
│   └── base_cvs/             # Base .tex templates — git-ignored
├── lib/
│   ├── api.ts              # Worker API calls
│   └── types.ts
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions → GitHub Pages
└── .env.local.example
```
