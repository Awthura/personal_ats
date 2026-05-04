/**
 * Cloudflare Worker — Personal ATS API
 *
 * Endpoints:
 *   POST /generate  { jd: string, password: string }
 *                   → { language, role_title, company, cv_latex, cl_latex, filename_cv, filename_cl }
 *
 * Secrets (set via `wrangler secret put` or Cloudflare dashboard):
 *   ANTHROPIC_API_KEY
 *   ATS_PASSWORD
 */

interface Env {
  ANTHROPIC_API_KEY: string
  ATS_PASSWORD: string
  ALLOWED_ORIGIN: string
  PROFILE_STORE: KVNamespace  // wrangler kv key put --binding PROFILE_STORE "profile" < ../data/profile.json
}

// ─── System prompt (built per request using PROFILE_JSON secret) ──────────────

function buildSystemPrompt(profileJson: string, includeCL: boolean): string {
  const clRule = includeCL
    ? '- Cover letter: write in Aw Thura\'s genuine voice — personal, specific details that connect to the company/role, honest, advanced but natural English (or German). No corporate jargon. No em-dashes or en-dashes in body text.'
    : '- No cover letter is needed. Set cl_latex and filename_cl to empty strings "".'

  const outputFormat = includeCL
    ? `{
  "language": "EN" | "DE",
  "role_title": "string",
  "company": "string",
  "cv_latex": "full LaTeX source string",
  "cl_latex": "full LaTeX source string",
  "filename_cv": "resume_<Role>_AwThura_<Company>_<EN|DE>",
  "filename_cl": "CoverLetter_<Company>_AwThura"
}`
    : `{
  "language": "EN" | "DE",
  "role_title": "string",
  "company": "string",
  "cv_latex": "full LaTeX source string",
  "cl_latex": "",
  "filename_cv": "resume_<Role>_AwThura_<Company>_<EN|DE>",
  "filename_cl": ""
}`

  return `You are an expert CV writer for Aw Thura, a professional AI/ML engineer based in Magdeburg, Germany.

Your job:
1. Analyse the job description for key requirements, skills, domain, language (EN or DE), and role type.
2. Select the most relevant experience, projects, and skills from the profile below.
3. Generate a fully tailored CV${includeCL ? ' and cover letter' : ''}.

Profile data:
${profileJson}

Rules:
- Match the document language to the job description language (German JD → German CV + CL, English JD → English CV + CL).
- CV: use extarticle 9pt LaTeX with the exact formatting in profile.latex_settings. Photo header (minipage with profile.jpg). All facts must come from profile — never invent experience.
- CV title should match the role type in the JD.
- If a German JD requires very good German, acknowledge the B1 level honestly in the CL.
${clRule}

Output format — return ONLY valid JSON, no markdown fences:
${outputFormat}`
}

// ─── CORS ─────────────────────────────────────────────────────────────────────

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function json(data: unknown, status = 200, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  })
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleCompile(request: Request, env: Env): Promise<Response> {
  let body: { latex?: string; password?: string }
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400, env) }

  if (!body.password || body.password !== env.ATS_PASSWORD) {
    return json({ error: 'Unauthorized' }, 401, env)
  }
  if (!body.latex?.trim()) return json({ error: 'No LaTeX provided' }, 400, env)

  // Strip photo include — profile.jpg is not available on the compilation server
  const safeTex = body.latex.replace(/\\includegraphics(\[[^\]]*\])?\{profile\.jpg\}/g, '')

  const formData = new FormData()
  formData.append('file', new Blob([safeTex], { type: 'text/plain' }), 'document.tex')
  formData.append('compiler', 'pdflatex')

  const res = await fetch('https://latex.ytotech.com/builds/sync', { method: 'POST', body: formData })
  if (!res.ok) {
    console.error('LaTeX compile error:', await res.text().then(t => t.slice(0, 400)))
    return json({ error: 'PDF compilation failed' }, 502, env)
  }

  const pdf = await res.arrayBuffer()
  return new Response(pdf, { status: 200, headers: { 'Content-Type': 'application/pdf', ...corsHeaders(env) } })
}

async function handleGenerate(request: Request, env: Env): Promise<Response> {
  let body: { jd?: string; password?: string; include_cl?: boolean }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, env)
  }

  // Auth
  if (!body.password || body.password !== env.ATS_PASSWORD) {
    return json({ error: 'Unauthorized' }, 401, env)
  }

  if (!body.jd?.trim()) {
    return json({ error: 'No job description provided' }, 400, env)
  }

  const includeCL = body.include_cl !== false

  const profileJson = await env.PROFILE_STORE.get('profile')
  if (!profileJson) {
    return json({ error: 'Profile data not found. Run: wrangler kv key put --binding PROFILE_STORE "profile" < ../data/profile.json' }, 500, env)
  }
  const systemPrompt = buildSystemPrompt(profileJson, includeCL)

  // Call Anthropic
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: includeCL
            ? `Generate a tailored CV and cover letter for this job description:\n\n${body.jd}`
            : `Generate a tailored CV only (no cover letter needed) for this job description:\n\n${body.jd}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Anthropic error:', err)
    if (response.status === 402) {
      return json({ error: 'credits_exhausted' }, 402, env)
    }
    return json({ error: 'Claude API error' }, 502, env)
  }

  const claude = await response.json() as { content: { type: string; text: string }[] }
  const raw = claude.content[0]?.type === 'text' ? claude.content[0].text : ''

  // Strip accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

  try {
    const result = JSON.parse(cleaned)
    return json(result, 200, env)
  } catch {
    console.error('JSON parse failed. Raw:', raw.slice(0, 300))
    return json({ error: 'Failed to parse Claude output' }, 500, env)
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) })
    }

    const { pathname } = new URL(request.url)

    if (pathname === '/auth' && request.method === 'POST') {
      let body: { password?: string }
      try { body = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400, env) }
      if (!body.password || body.password !== env.ATS_PASSWORD) {
        return json({ error: 'Unauthorized' }, 401, env)
      }
      return json({ ok: true }, 200, env)
    }

    if (pathname === '/compile' && request.method === 'POST') {
      return handleCompile(request, env)
    }

    if (pathname === '/generate' && request.method === 'POST') {
      return handleGenerate(request, env)
    }

    return json({ error: 'Not found' }, 404, env)
  },
}
