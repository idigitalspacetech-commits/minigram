import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  detectTrack,
  buildMiniAppPrompt,
  buildBotPrompt,
  buildManifestPrompt,
  buildSupportPrompt,
} from '@/lib/prompts'
import type { GenerationContext, GeneratedFiles } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── JSON Repair Parser ────────────────────────────────────────────────────────
function parseJSON(text: string): Record<string, string> {
  // Strategy 1: direct
  try { return JSON.parse(text) } catch {}

  // Strategy 2: strip markdown fences
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try { return JSON.parse(stripped) } catch {}

  // Strategy 3: find outermost {}
  let depth = 0, start = -1, end = -1
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (start === -1) start = i; depth++ }
    else if (text[i] === '}' && depth > 0) { depth--; if (depth === 0) { end = i; break } }
  }
  const candidate = start !== -1 && end !== -1 ? text.slice(start, end + 1) : stripped
  try { return JSON.parse(candidate) } catch {}

  // Strategy 4: character-level escape repair
  const out: string[] = []
  let inString = false, escaped = false
  for (const c of candidate) {
    if (escaped) { out.push(c); escaped = false; continue }
    if (c === '\\' && inString) { out.push(c); escaped = true; continue }
    if (c === '"') { inString = !inString; out.push(c); continue }
    if (inString) {
      if (c === '\n') { out.push('\\n'); continue }
      if (c === '\r') { out.push('\\r'); continue }
      if (c === '\t') { out.push('\\t'); continue }
    }
    out.push(c)
  }
  return JSON.parse(out.join(''))
}

// ── Single API call helper ────────────────────────────────────────────────────
async function call(system: string, user: string, maxTokens = 7000): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  return text.replace(/^```(?:json|python|html|markdown|text|bash)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

// ── POST /api/generate ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body: GenerationContext = await req.json()
    const { prompt, payments, referral, notification, category } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const track = detectTrack(prompt)
    const ctx = `App description: ${prompt}\nPayments: ${payments}\nReferral: ${referral}\nNotification: ${notification}\nCategory: ${category}`

    // ── Step 1: App name ──────────────────────────────────────────────────────
    const nameText = await call(
      'Name a Telegram Mini App. Return ONLY JSON: {"appName":"2-3 word name","appDescription":"one sentence"}. No markdown.',
      `Name this app: ${prompt.slice(0, 200)}`,
      200
    )
    let appName = 'My App', appDescription = ''
    try {
      const meta = parseJSON(nameText)
      appName = meta.appName || 'My App'
      appDescription = meta.appDescription || ''
    } catch {}

    // ── Step 2: Mini App HTML ─────────────────────────────────────────────────
    const miniappHtml = await call(
      buildMiniAppPrompt(track),
      `Generate the complete miniapp.html for "${appName}".\n${ctx}\nReturn only the HTML starting with <!DOCTYPE html>.`
    )

    // ── Step 3: bot.py ────────────────────────────────────────────────────────
    const botPy = await call(
      buildBotPrompt(track),
      `Generate the complete bot.py for "${appName}".\n${ctx}\nReturn only the Python file starting with import statements.`
    )

    // ── Step 4: TON manifest (Track 2 only) ───────────────────────────────────
    let manifestJson: string | undefined
    if (track === 2) {
      manifestJson = await call(
        'Generate a TON Connect manifest JSON. Return ONLY the raw JSON. No markdown.',
        buildManifestPrompt(appName),
        300
      )
    }

    // ── Step 5: Support files ─────────────────────────────────────────────────
    const supportText = await call(
      buildSupportPrompt(track),
      `Generate support files for "${appName}".\n${ctx}`,
      5000
    )
    const support = parseJSON(supportText)

    // ── Assemble result ───────────────────────────────────────────────────────
    const files: GeneratedFiles = {
      miniapp_html: miniappHtml,
      bot_py: botPy,
      scheduler_py: support.scheduler_py || '',
      requirements_txt: support.requirements_txt || '',
      env_example: support.env_example || '',
      setup_md: support.setup_md || '',
      ...(manifestJson ? { tonconnect_manifest_json: manifestJson } : {}),
    }

    return NextResponse.json({ appName, appDescription, track, files })

  } catch (err: unknown) {
    console.error('Generation error:', err)
    const message = err instanceof Error ? err.message : 'Generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
