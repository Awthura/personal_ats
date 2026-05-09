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
    ? '- Cover letter: write in Aw Thura\'s genuine voice. Personal, specific details that connect to the company/role. Honest, advanced but natural English (or German). No corporate jargon. STRICT: do not use any dashes in the cover letter body text. This means no em-dashes (Unicode — or LaTeX ---), no en-dashes (Unicode – or LaTeX --), and no hyphens used as sentence dashes. Replace every such construction with a comma, colon, semicolon, or a restructured sentence.'
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
- CV title should match the role type in the JD.
- If a German JD requires very good German, acknowledge the B1 level honestly in the CL.
- All facts must come from profile — never invent experience, metrics, or dates.
${clRule}

CV LaTeX structure — follow this EXACTLY. Single column only. Fill [CONTENT] with tailored profile data.

DESIGN RULES (never deviate):
- Single column — no sidebar, no paracol, no multicol for layout
- No dashes anywhere: no -- no --- no em-dash. Use Unicode – for date ranges, rewrite any em-dash construction
- Must fit on exactly 1 page
- All body text in black; colors only on decorative elements (icons, bullets, rules, labels)
- Profile: 2-3 lines max, punchy opening "Asian-born, Germany-based AI engineer with..."

PREAMBLE (copy verbatim):
\\documentclass[9pt,a4paper]{extarticle}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[default]{lato}
\\usepackage[a4paper, top=0.9cm, bottom=0.9cm, left=1.2cm, right=1.2cm]{geometry}
\\usepackage{xcolor,titlesec,enumitem,tabularx,array,hyperref,microtype,multicol,fontawesome5,graphicx}
\\definecolor{accent}{RGB}{20, 45, 90}
\\definecolor{highlight}{RGB}{0, 155, 140}
\\definecolor{lightgray}{RGB}{100,100,100}
\\definecolor{headerbg}{RGB}{240, 245, 252}
\\hypersetup{colorlinks=true, urlcolor=highlight, linkcolor=highlight, pdfborder={0 0 0}}
\\titleformat{\\section}{\\color{accent}\\small\\bfseries}{}{0em}{\\textcolor{highlight}{\\rule[-1.5pt]{2.5pt}{8.5pt}}\\hspace{5pt}\\MakeUppercase}[\\vspace{1pt}\\color{accent!25}\\titlerule\\vspace{3pt}]
\\titlespacing{\\section}{0pt}{5pt}{3pt}
\\newcommand{\\role}[4]{\\noindent{\\small\\bfseries #1}\\hfill{\\color{lightgray}\\small #4}\\\\[2pt]{\\small\\color{highlight}#2}~$\\cdot$~{\\small\\color{lightgray}#3}\\\\[0.7pt]}
\\newcommand{\\project}[2]{\\noindent{\\small\\bfseries #1}\\\\[0pt]{\\footnotesize\\color{lightgray}#2}}
\\setlist[itemize]{leftmargin=1.2em, topsep=2pt, itemsep=1pt, parsep=0pt, label={\\small\\textcolor{highlight}{$\\circ$}}}
\\setlength{\\parskip}{0pt}
\\setlength{\\parindent}{0pt}
\\pagestyle{empty}

DOCUMENT STRUCTURE:
\\begin{document}
% HEADER — full-width tinted band
\\noindent
\\colorbox{headerbg}{\\parbox[t]{\\dimexpr\\linewidth-2\\fboxsep\\relax}{%
  \\vspace{8pt}%
  \\begin{minipage}[c]{0.75\\linewidth}
    {\\LARGE\\bfseries\\color{accent} [NAME]}\\hspace{10pt}{\\normalsize\\color{highlight} [ROLE TITLE]}\\\\[5pt]
    \\small\\color{lightgray}
    \\textcolor{highlight}{\\faEnvelope}\\enspace\\href{mailto:[EMAIL]}{[EMAIL]}\\enspace{\\color{accent!40}|}\\enspace
    \\textcolor{highlight}{\\faPhone}\\enspace [PHONE]\\enspace{\\color{accent!40}|}\\enspace
    \\textcolor{highlight}{\\faLinkedin}\\enspace\\href{https://[LINKEDIN]}{[LINKEDIN]}\\\\[2pt]
    \\textcolor{highlight}{\\faGithub}\\enspace\\href{https://[GITHUB]}{[GITHUB]}\\enspace{\\color{accent!40}|}\\enspace
    \\textcolor{highlight}{\\faGlobe}\\enspace\\href{https://[PORTFOLIO]}{[PORTFOLIO]}
  \\end{minipage}%
  \\hfill
  \\begin{minipage}[c]{0.19\\linewidth}
    \\raggedleft
    \\fcolorbox{highlight}{white}{\\includegraphics[width=2.1cm,height=2.7cm,keepaspectratio]{profile.jpg}}%
  \\end{minipage}
  \\vspace{8pt}%
}}
\\vspace{1pt}
\\textcolor{accent}{\\rule{\\linewidth}{0.8pt}}
\\vspace{4pt}
% PROFILE
\\section{Profile}
\\small [2-3 line punchy summary]
% EXPERIENCE — \\vspace{2pt} between role blocks
\\section{Professional Experience}
\\role{[Title]}{[Company]}{[Location]}{[Month YYYY – Month YYYY]}
\\begin{itemize}\\small
  \\item [bullet]
\\end{itemize}
\\vspace{2pt}
% PROJECTS — \\begin{itemize}[topsep=3pt] for project lists
\\section{Technical Projects}
\\project{[Name]}{[Tech stack]}
\\begin{itemize}[topsep=3pt]\\small
  \\item [bullet]
\\end{itemize}
\\vspace{1pt}
% EDUCATION
\\section{Education}
\\small\\noindent
{\\bfseries [Degree]} \\hfill {\\color{lightgray} [Dates]}\\\\[0pt]
{\\color{highlight}[Institution]}, [Location]\\\\[3pt]
% AWARDS
\\section{Awards}
\\small\\noindent
\\begin{tabularx}{\\linewidth}{@{}lX@{}}
[YEAR] & \\textbf{[Award]} — [detail]\\\\
\\end{tabularx}
% SKILLS — 2 columns via multicol
\\section{Skills}
\\begin{multicols}{2}
\\small\\noindent
{\\color{accent}\\bfseries [Category]:} item · item\\\\[1pt]
\\columnbreak
{\\color{accent}\\bfseries [Category]:} item · item
\\end{multicols}
\\end{document}

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

  const photoB64 = await env.PROFILE_STORE.get('profile_photo_b64')

  // ytotech JSON API: "content" = plain text (tex), "file" = base64 (binary)
  const resources: Record<string, unknown>[] = [
    { main: true, content: body.latex },
  ]
  if (photoB64) {
    resources.push({ path: 'profile.jpg', file: photoB64 })
  } else {
    console.warn('profile_photo_b64 not in KV — photo omitted')
  }

  const res = await fetch('https://latex.ytotech.com/builds/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ compiler: 'pdflatex', resources }),
  })
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
