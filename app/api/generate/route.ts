import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import profile from '@/data/profile.json'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an expert CV and cover letter writer for Aw Thura, a professional AI/ML engineer based in Magdeburg, Germany.

Your job:
1. Analyse the job description for key requirements, skills, domain, language (EN or DE), and role type.
2. Select the most relevant experience, projects, and skills from the profile below.
3. Generate a fully tailored CV and cover letter.

Profile data:
${JSON.stringify(profile, null, 2)}

Rules:
- Match the document language to the job description language (German JD = German CV + CL, English JD = English CV + CL).
- CV: use extarticle 9pt LaTeX, exact formatting specified in the profile.latex_settings.
- Cover letter: write in Aw Thura's genuine voice — personal, specific, honest. Connect to real details about the company/role. No corporate jargon. Advanced but natural English (or German). No em-dashes or en-dashes in body text.
- Keep all facts accurate — never invent skills or experience.
- CV title role should match the job description's role type.
- If the JD is German and requires very good German, note the B1 limitation honestly in the CL.

Output format — return ONLY valid JSON, no markdown:
{
  "language": "EN" | "DE",
  "role_title": "string",
  "company": "string",
  "cv_latex": "full LaTeX source string",
  "cl_latex": "full LaTeX source string",
  "filename_cv": "resume_<Role>_AwThura_<Company>_<EN|DE>",
  "filename_cl": "CoverLetter_<Company>_AwThura"
}`

export async function POST(request: NextRequest) {
  const { jd } = await request.json()

  if (!jd?.trim()) {
    return NextResponse.json({ error: 'No job description provided' }, { status: 400 })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a tailored CV and cover letter for this job description:\n\n${jd}`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    const result = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (err) {
    console.error('Generation error:', err)
    return NextResponse.json({ error: 'Generation failed. Check server logs.' }, { status: 500 })
  }
}
