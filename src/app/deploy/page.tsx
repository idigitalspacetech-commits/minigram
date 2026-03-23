'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Check, Loader2, AlertCircle, ExternalLink,
  Github, Globe, Send, Database, Zap, ChevronRight,
  Copy, Eye, EyeOff, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ── Types ──────────────────────────────────────────────────────────────────
type StepStatus = 'pending' | 'active' | 'done' | 'skipped'

interface StepState {
  github:    StepStatus
  vercel:    StepStatus
  telegram:  StepStatus
  supabase:  StepStatus
  ton:       StepStatus
  launch:    StepStatus
}

interface DeployData {
  repoUrl:      string
  vercelUrl:    string
  botToken:     string
  botUsername:  string
  supabaseUrl:  string
  supabaseKey:  string
  tonWallet:    string
  tonApiKey:    string
  testnet:      boolean
}

// ── Telegram token validation ─────────────────────────────────────────────
async function validateBotToken(token: string): Promise<{ valid: boolean; username?: string; name?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const data = await res.json()
    if (data.ok) return { valid: true, username: data.result.username, name: data.result.first_name }
    return { valid: false }
  } catch {
    return { valid: false }
  }
}

// ── Step indicator ─────────────────────────────────────────────────────────
function StepDot({ status, num }: { status: StepStatus; num: number }) {
  if (status === 'done')    return <div className="w-8 h-8 rounded-full bg-[var(--green)] flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4 text-white" /></div>
  if (status === 'active')  return <div className="w-8 h-8 rounded-full bg-[var(--tg)] flex items-center justify-center flex-shrink-0 ring-4 ring-[rgba(34,158,217,0.2)]"><span className="text-white text-xs font-bold">{num}</span></div>
  if (status === 'skipped') return <div className="w-8 h-8 rounded-full bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center flex-shrink-0"><span className="text-[var(--text3)] text-xs">–</span></div>
  return <div className="w-8 h-8 rounded-full bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center flex-shrink-0"><span className="text-[var(--text3)] text-xs font-medium">{num}</span></div>
}

function StepConnector({ status }: { status: StepStatus }) {
  return (
    <div className={`w-px h-6 mx-auto transition-colors ${status === 'done' ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`} />
  )
}

// ── Individual step panels ─────────────────────────────────────────────────

function GithubStep({ onDone, data, setData }: { onDone: () => void; data: DeployData; setData: (d: Partial<DeployData>) => void }) {
  const [connecting, setConnecting] = useState(false)
  const [repoName, setRepoName] = useState('my-miniapp')
  const [connected, setConnected] = useState(false)

  async function connect() {
    setConnecting(true)
    // Simulate GitHub OAuth + repo creation
    await new Promise(r => setTimeout(r, 2000))
    const url = `https://github.com/yourusername/${repoName}`
    setData({ repoUrl: url })
    setConnected(true)
    setConnecting(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-xl tracking-tight mb-2">Connect GitHub</h3>
        <p className="text-sm text-[var(--text2)] leading-relaxed">
          MiniGram will create a repository and commit all your generated files automatically. You'll own the repo and can push changes anytime.
        </p>
      </div>

      <div>
        <label className="block font-mono text-[0.68rem] text-[var(--text3)] uppercase tracking-widest mb-2">Repository name</label>
        <input
          value={repoName}
          onChange={e => setRepoName(e.target.value.toLowerCase().replace(/\s+/g,'-'))}
          disabled={connected}
          className="w-full bg-[var(--bg)] border border-[var(--border2)] rounded-xl px-4 py-3 text-sm font-mono text-[var(--text)] focus:outline-none focus:border-[var(--tg)] transition-colors disabled:opacity-60"
        />
        <p className="text-xs text-[var(--text3)] mt-1.5">github.com/yourusername/{repoName}</p>
      </div>

      {!connected ? (
        <Button onClick={connect} loading={connecting} className="gap-2 w-full">
          <Github className="w-4 h-4" />
          {connecting ? 'Creating repository...' : 'Connect GitHub & Create Repo'}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-[rgba(29,185,84,0.06)] border border-[rgba(29,185,84,0.2)] rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 text-[var(--green)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--green)] mb-1">Repository created</p>
              <a href={data.repoUrl} target="_blank" rel="noreferrer"
                className="text-xs text-[var(--tg)] hover:underline flex items-center gap-1">
                {data.repoUrl} <ExternalLink className="w-3 h-3" />
              </a>
              <div className="mt-2 space-y-1">
                {['miniapp.html committed','bot.py committed','scheduler.py committed','All config files committed','Vercel webhook configured'].map(a => (
                  <p key={a} className="text-xs text-[var(--text2)] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-[var(--green)]" />{a}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={onDone} className="w-full gap-2">
            Continue to Deploy <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function VercelStep({ onDone, data, setData }: { onDone: () => void; data: DeployData; setData: (d: Partial<DeployData>) => void }) {
  const [deploying, setDeploying] = useState(false)
  const [deployed, setDeployed]   = useState(false)
  const [progress, setProgress]   = useState(0)

  async function deploy() {
    setDeploying(true)
    // Simulate Vercel deploy stages
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 120))
      setProgress(i)
    }
    const url = `https://miniapp-${Math.random().toString(36).slice(2,8)}.vercel.app`
    setData({ vercelUrl: url })
    setDeployed(true)
    setDeploying(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-xl tracking-tight mb-2">Deploy to Vercel</h3>
        <p className="text-sm text-[var(--text2)] leading-relaxed">
          Your Mini App HTML is deployed as a static site. Vercel gives you a free HTTPS URL with global CDN. The URL is automatically captured and injected into all subsequent steps.
        </p>
      </div>

      {data.repoUrl && (
        <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
          <Github className="w-4 h-4 text-[var(--text3)]" />
          <span className="text-xs text-[var(--text2)] font-mono">{data.repoUrl}</span>
          <Check className="w-3.5 h-3.5 text-[var(--green)] ml-auto" />
        </div>
      )}

      {!deployed ? (
        <div className="space-y-4">
          {deploying && (
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-mono text-[var(--text2)]">
                <span>{progress < 30 ? 'Installing dependencies...' : progress < 60 ? 'Building...' : progress < 90 ? 'Uploading to CDN...' : 'Finalising...'}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-[var(--surface2)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--tg)] rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <div className="space-y-1.5">
                {[
                  {label:'Clone from GitHub', done: progress > 10},
                  {label:'npm install', done: progress > 30},
                  {label:'Build static output', done: progress > 60},
                  {label:'Deploy to Vercel Edge Network', done: progress > 85},
                  {label:'HTTPS URL provisioned', done: progress >= 100},
                ].map(s => (
                  <div key={s.label} className={`flex items-center gap-2 text-xs font-mono transition-colors ${s.done ? 'text-[var(--green)]' : 'text-[var(--text3)]'}`}>
                    {s.done ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current opacity-30" />}
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button onClick={deploy} loading={deploying} className="gap-2 w-full">
            <Globe className="w-4 h-4" />
            {deploying ? 'Deploying...' : 'Deploy to Vercel'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[rgba(29,185,84,0.06)] border border-[rgba(29,185,84,0.2)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--green)]" />
              <span className="text-sm font-medium text-[var(--green)]">Live in 62 seconds</span>
            </div>
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-[var(--tg)]">{data.vercelUrl}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => navigator.clipboard.writeText(data.vercelUrl)}
                  className="text-[var(--text3)] hover:text-[var(--text2)] transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a href={data.vercelUrl} target="_blank" rel="noreferrer"
                  className="text-[var(--text3)] hover:text-[var(--tg)] transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <p className="text-xs text-[var(--text3)] mt-2 font-mono">↳ MINI_APP_URL captured and ready for bot registration</p>
          </div>
          <Button onClick={onDone} className="w-full gap-2">
            Continue to Telegram <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function TelegramStep({ onDone, data, setData }: { onDone: () => void; data: DeployData; setData: (d: Partial<DeployData>) => void }) {
  const [token, setToken]           = useState('')
  const [showToken, setShowToken]   = useState(false)
  const [validating, setValidating] = useState(false)
  const [botInfo, setBotInfo]       = useState<{ username: string; name: string } | null>(null)
  const [error, setError]           = useState('')
  const [configuring, setConfiguring] = useState(false)
  const [configured, setConfigured]   = useState(false)

  async function validate() {
    setValidating(true); setError(''); setBotInfo(null)
    const result = await validateBotToken(token.trim())
    if (result.valid && result.username) {
      setBotInfo({ username: result.username!, name: result.name! })
    } else {
      setError('Invalid token. Make sure you copied it correctly from BotFather.')
    }
    setValidating(false)
  }

  async function configure() {
    setConfiguring(true)
    await new Promise(r => setTimeout(r, 2500))
    setData({ botToken: token.trim(), botUsername: botInfo!.username })
    setConfigured(true)
    setConfiguring(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-xl tracking-tight mb-2">Connect Telegram Bot</h3>
        <p className="text-sm text-[var(--text2)] leading-relaxed">
          Create your bot in BotFather, then paste the token here. MiniGram validates it live and automatically registers your commands and Mini App URL.
        </p>
      </div>

      {/* BotFather guide */}
      <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
          <Send className="w-3.5 h-3.5 text-[var(--tg)]" />
          <span className="text-xs font-mono text-[var(--text2)] uppercase tracking-widest">BotFather guide</span>
          <a href="https://t.me/BotFather" target="_blank" rel="noreferrer"
            className="ml-auto text-xs text-[var(--tg)] hover:underline flex items-center gap-1">
            Open BotFather <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="p-4 space-y-2">
          {[
            ['/newbot', 'Create a new bot'],
            ['Choose a name', 'e.g. "My Members Club"'],
            ['Choose a username', 'Must end in "bot", e.g. "mymembersbot"'],
            ['Copy the token', 'Looks like 1234567890:ABC-DEF...'],
          ].map(([cmd, desc], i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-[rgba(34,158,217,0.1)] text-[var(--tg)] text-xs flex items-center justify-center font-bold flex-shrink-0">{i+1}</span>
              <span className="font-mono text-[var(--tg)] text-xs">{cmd}</span>
              <span className="text-[var(--text3)] text-xs">— {desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Token input */}
      <div>
        <label className="block font-mono text-[0.68rem] text-[var(--text3)] uppercase tracking-widest mb-2">Bot Token</label>
        <div className="relative">
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={e => { setToken(e.target.value); setError(''); setBotInfo(null) }}
            placeholder="1234567890:ABCDEFghijklmnop-qrstuvwxyz"
            disabled={configured}
            className="w-full bg-[var(--bg)] border border-[var(--border2)] rounded-xl px-4 pr-12 py-3 text-sm font-mono text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--tg)] transition-colors disabled:opacity-60"
          />
          <button type="button" onClick={() => setShowToken(v => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text2)]">
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-[rgba(220,38,38,0.08)] border border-[rgba(220,38,38,0.2)] rounded-xl px-4 py-3">
          <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {botInfo && !configured && (
        <div className="bg-[rgba(29,185,84,0.06)] border border-[rgba(29,185,84,0.2)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />
            <span className="text-sm text-[var(--green)] font-medium">Token validated</span>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-[var(--tg)] rounded-full flex items-center justify-center text-white font-bold text-sm">
              {botInfo.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium">{botInfo.name}</p>
              <p className="text-xs text-[var(--text3)] font-mono">@{botInfo.username}</p>
            </div>
          </div>
        </div>
      )}

      {configured && (
        <div className="bg-[rgba(29,185,84,0.06)] border border-[rgba(29,185,84,0.2)] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />
            <span className="text-sm text-[var(--green)] font-medium">@{botInfo?.username} configured</span>
          </div>
          {['Token validated via Telegram API','/setcommands registered','/setmenubutton set with emoji','Inline mode enabled',`MINI_APP_URL → ${data.vercelUrl}`].map(a => (
            <p key={a} className="text-xs text-[var(--text2)] flex items-center gap-1.5">
              <Check className="w-3 h-3 text-[var(--green)] flex-shrink-0" />{a}
            </p>
          ))}
        </div>
      )}

      {!configured ? (
        <div className="flex gap-3">
          {!botInfo ? (
            <Button onClick={validate} loading={validating} disabled={token.length < 30} className="flex-1 gap-2">
              {validating ? <><Loader2 className="w-4 h-4 animate-spin" />Validating...</> : 'Validate Token'}
            </Button>
          ) : (
            <Button onClick={configure} loading={configuring} className="flex-1 gap-2">
              {configuring ? <><Loader2 className="w-4 h-4 animate-spin" />Configuring bot...</> : <>Configure Bot & Continue <ChevronRight className="w-4 h-4" /></>}
            </Button>
          )}
        </div>
      ) : (
        <Button onClick={onDone} className="w-full gap-2">
          Continue <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

function TONStep({ onDone, onSkip, data, setData }: { onDone: () => void; onSkip: () => void; data: DeployData; setData: (d: Partial<DeployData>) => void }) {
  const [wallet, setWallet]   = useState('')
  const [apiKey, setApiKey]   = useState('')
  const [testnet, setTestnet] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  async function save() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setData({ tonWallet: wallet, tonApiKey: apiKey, testnet })
    setSaved(true)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-xl tracking-tight mb-2">TON Configuration</h3>
        <p className="text-sm text-[var(--text2)] leading-relaxed">
          Configure your TON wallet and API key for on-chain payment verification. All values are injected securely into Vercel's encrypted environment store.
        </p>
      </div>

      <div className="bg-[rgba(0,152,234,0.06)] border border-[rgba(0,152,234,0.2)] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-[var(--ton)]">⛓ Track 2 · TON Blockchain</span>
        </div>
        <p className="text-xs text-[var(--text2)]">Your app uses TON Connect. These credentials enable on-chain payment verification in bot.py.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block font-mono text-[0.68rem] text-[var(--text3)] uppercase tracking-widest mb-2">
            TON Wallet Address <span className="text-red-400">*</span>
          </label>
          <input value={wallet} onChange={e => setWallet(e.target.value)} disabled={saved}
            placeholder="EQA1..."
            className="w-full bg-[var(--bg)] border border-[var(--border2)] rounded-xl px-4 py-3 text-sm font-mono text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--ton)] transition-colors disabled:opacity-60" />
          <p className="text-xs text-[var(--text3)] mt-1">Your receiving wallet — payments for your app go here</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-mono text-[0.68rem] text-[var(--text3)] uppercase tracking-widest">TON Center API Key</label>
            <a href="https://toncenter.com" target="_blank" rel="noreferrer"
              className="text-xs text-[var(--ton)] hover:underline flex items-center gap-1">
              Get free key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} disabled={saved}
            placeholder="Optional — increases rate limits"
            className="w-full bg-[var(--bg)] border border-[var(--border2)] rounded-xl px-4 py-3 text-sm font-mono text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--ton)] transition-colors disabled:opacity-60" />
        </div>

        <div>
          <label className="block font-mono text-[0.68rem] text-[var(--text3)] uppercase tracking-widest mb-3">Network</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: true,  label: 'Testnet',  sub: 'Recommended to start', color: 'tg' },
              { value: false, label: 'Mainnet',  sub: 'Real TON — live payments', color: 'ton' },
            ].map(opt => (
              <button key={String(opt.value)} onClick={() => !saved && setTestnet(opt.value)}
                className={`py-3 px-4 rounded-xl border text-left transition-all ${testnet === opt.value ? `bg-[rgba(34,158,217,0.08)] border-[var(--tg)] ` : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border2)]'}`}>
                <p className={`text-sm font-medium ${testnet === opt.value ? 'text-[var(--tg)]' : 'text-[var(--text)]'}`}>{opt.label}</p>
                <p className="text-xs text-[var(--text3)]">{opt.sub}</p>
              </button>
            ))}
          </div>
          {testnet && <p className="text-xs text-[var(--text3)] mt-2 font-mono">↳ TESTNET=true will be set in Vercel environment</p>}
        </div>
      </div>

      {saved ? (
        <div className="space-y-4">
          <div className="bg-[rgba(29,185,84,0.06)] border border-[rgba(29,185,84,0.2)] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />
              <span className="text-sm text-[var(--green)] font-medium">TON configured</span>
            </div>
            {['Wallet address validated','TON_WALLET_ADDRESS queued for Vercel env',`Network: ${testnet ? 'Testnet' : 'Mainnet'}`,apiKey ? 'TON_API_KEY queued' : 'No API key (rate limits apply)'].map(a => (
              <p key={a} className="text-xs text-[var(--text2)] flex items-center gap-1.5">
                <Check className="w-3 h-3 text-[var(--green)] flex-shrink-0" />{a}
              </p>
            ))}
          </div>
          <Button onClick={onDone} className="w-full gap-2">
            Continue to Launch <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Button onClick={save} loading={saving} disabled={!wallet.trim()} className="w-full gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : 'Save TON Configuration'}
          </Button>
          <button onClick={onSkip} className="text-sm text-[var(--text3)] hover:text-[var(--text2)] transition-colors">
            Skip for now — configure later
          </button>
        </div>
      )}
    </div>
  )
}

function LaunchStep({ data, track }: { data: DeployData; track: number }) {
  const [launching, setLaunching]   = useState(false)
  const [launched, setLaunched]     = useState(false)
  const [launchStep, setLaunchStep] = useState(0)

  const launchSteps = [
    'Injecting environment variables to Vercel...',
    'Triggering redeployment with config...',
    'Registering bot webhook...',
    'Setting Mini App button on bot...',
    'Running final health check...',
    'Live! 🚀',
  ]

  async function launch() {
    setLaunching(true)
    for (let i = 0; i < launchSteps.length; i++) {
      setLaunchStep(i)
      await new Promise(r => setTimeout(r, 1200))
    }
    setLaunched(true)
    setLaunching(false)
  }

  const botLink = data.botUsername ? `https://t.me/${data.botUsername}` : 'https://t.me/YourBot'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-bold text-xl tracking-tight mb-2">Ready to launch 🚀</h3>
        <p className="text-sm text-[var(--text2)] leading-relaxed">
          All configuration is complete. MiniGram will inject your credentials into Vercel, trigger a final deployment, and register your bot — all automatically.
        </p>
      </div>

      {/* Config summary */}
      <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <p className="font-mono text-[0.68rem] text-[var(--text3)] uppercase tracking-widest">Deployment summary</p>
        </div>
        <div className="p-4 space-y-2.5">
          {[
            { label: 'GitHub repo',   value: data.repoUrl || '—',         icon: <Github className="w-3.5 h-3.5" /> },
            { label: 'Vercel URL',    value: data.vercelUrl || '—',        icon: <Globe className="w-3.5 h-3.5" /> },
            { label: 'Telegram bot',  value: data.botUsername ? `@${data.botUsername}` : '—', icon: <Send className="w-3.5 h-3.5" /> },
            ...(track === 2 ? [{ label: 'TON Network', value: data.testnet ? 'Testnet' : 'Mainnet', icon: <Zap className="w-3.5 h-3.5" /> }] : []),
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3 text-sm">
              <span className="text-[var(--text3)] w-28 flex items-center gap-1.5 flex-shrink-0 text-xs">{row.icon}{row.label}</span>
              <span className="font-mono text-xs text-[var(--text2)] truncate">{row.value}</span>
              {row.value !== '—' && <Check className="w-3.5 h-3.5 text-[var(--green)] ml-auto flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {launching && (
        <div className="space-y-2">
          {launchSteps.map((s, i) => (
            <div key={s} className={`flex items-center gap-2.5 text-xs font-mono transition-all ${i < launchStep ? 'text-[var(--green)]' : i === launchStep ? 'text-[var(--tg)]' : 'text-[var(--text3)] opacity-40'}`}>
              {i < launchStep ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> :
               i === launchStep ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> :
               <span className="w-3.5 h-3.5 rounded-full border border-current flex-shrink-0 opacity-40" />}
              {s}
            </div>
          ))}
        </div>
      )}

      {launched ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[rgba(29,185,84,0.08)] to-[rgba(34,158,217,0.06)] border border-[rgba(29,185,84,0.3)] rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🚀</div>
            <h4 className="font-bold text-xl tracking-tight mb-2">Your app is live!</h4>
            <p className="text-sm text-[var(--text2)] mb-5">Your Telegram Mini App is deployed, your bot is running, and everything is configured.</p>
            <a href={botLink} target="_blank" rel="noreferrer">
              <Button size="lg" className="gap-2">
                <Send className="w-4 h-4" />
                Open in Telegram
              </Button>
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a href={data.vercelUrl} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--border2)] rounded-xl py-3 text-sm transition-all">
              <Globe className="w-4 h-4 text-[var(--text3)]" />View Mini App
            </a>
            <a href={data.repoUrl} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-[var(--surface2)] border border-[var(--border)] hover:border-[var(--border2)] rounded-xl py-3 text-sm transition-all">
              <Github className="w-4 h-4 text-[var(--text3)]" />View Code
            </a>
          </div>
        </div>
      ) : (
        <Button onClick={launch} loading={launching} size="lg" className="w-full gap-2">
          <Zap className="w-4 h-4" />
          {launching ? 'Deploying...' : 'Go Live'}
        </Button>
      )}
    </div>
  )
}

// ── Main wizard ────────────────────────────────────────────────────────────
function DeployWizardContent() {
  const searchParams = useSearchParams()
  const appName  = searchParams.get('appName')  || 'My App'
  const track    = Number(searchParams.get('track') || '1')

  const [steps, setSteps] = useState<StepState>({
    github:   'active',
    vercel:   'pending',
    telegram: 'pending',
    supabase: 'pending',
    ton:      'pending',
    launch:   'pending',
  })

  const [data, setDataState] = useState<DeployData>({
    repoUrl: '', vercelUrl: '', botToken: '', botUsername: '',
    supabaseUrl: '', supabaseKey: '', tonWallet: '', tonApiKey: '', testnet: true,
  })

  function setData(partial: Partial<DeployData>) {
    setDataState(prev => ({ ...prev, ...partial }))
  }

  function advance(current: keyof StepState, next: keyof StepState) {
    setSteps(prev => ({ ...prev, [current]: 'done', [next]: 'active' }))
  }

  function skip(current: keyof StepState, next: keyof StepState) {
    setSteps(prev => ({ ...prev, [current]: 'skipped', [next]: 'active' }))
  }

  const STEP_LIST = [
    { key: 'github' as const,   num: 1, label: 'GitHub',   icon: <Github className="w-4 h-4" /> },
    { key: 'vercel' as const,   num: 2, label: 'Vercel',   icon: <Globe className="w-4 h-4" /> },
    { key: 'telegram' as const, num: 3, label: 'Telegram', icon: <Send className="w-4 h-4" /> },
    ...(track === 2 ? [{ key: 'ton' as const, num: 4, label: 'TON', icon: <Zap className="w-4 h-4" /> }] : []),
    { key: 'launch' as const,   num: track === 2 ? 5 : 4, label: 'Launch', icon: <Rocket /> },
  ]

  const activeStep = STEP_LIST.find(s => steps[s.key] === 'active')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 bg-[var(--bg2)] border-b border-[var(--border)] flex items-center px-6 gap-4 flex-shrink-0 z-10">
        <Link href="/builder" className="flex items-center gap-2 text-[var(--text3)] hover:text-[var(--text2)] transition-colors text-sm no-underline">
          <ArrowLeft className="w-4 h-4" />Back to editor
        </Link>
        <div className="w-px h-5 bg-[var(--border)]" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[var(--tg)] rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">M</span>
          </div>
          <span className="font-semibold text-sm tracking-tight">MiniGram</span>
          <span className="text-[var(--text3)] text-sm">/ Deploy</span>
          <span className="text-[var(--text3)] text-sm">/ {appName}</span>
        </div>
        <span className={`ml-2 font-mono text-xs px-2.5 py-1 rounded-full border ${track === 2 ? 'bg-[rgba(0,152,234,0.08)] border-[rgba(0,152,234,0.2)] text-[var(--ton)]' : 'bg-[rgba(34,158,217,0.08)] border-[rgba(34,158,217,0.2)] text-[var(--tg)]'}`}>
          Track {track}{track === 2 ? ' · TON' : ''}
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Step sidebar */}
        <aside className="w-72 flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg2)] p-8">
          <h2 className="font-bold text-lg tracking-tight mb-1">Deploy wizard</h2>
          <p className="text-xs text-[var(--text2)] mb-8">Zero terminal. Everything automated.</p>

          <div className="relative">
            {STEP_LIST.map((step, i) => (
              <div key={step.key}>
                <div className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-default ${steps[step.key] === 'active' ? 'bg-[rgba(34,158,217,0.06)] border border-[rgba(34,158,217,0.12)]' : ''}`}>
                  <StepDot status={steps[step.key]} num={step.num} />
                  <div>
                    <p className={`text-sm font-medium transition-colors ${steps[step.key] === 'active' ? 'text-[var(--text)]' : steps[step.key] === 'done' ? 'text-[var(--green)]' : 'text-[var(--text3)]'}`}>
                      {step.label}
                    </p>
                    <p className={`text-xs transition-colors ${steps[step.key] === 'done' ? 'text-[var(--green)]' : 'text-[var(--text3)]'}`}>
                      {steps[step.key] === 'done' ? 'Complete' : steps[step.key] === 'active' ? 'In progress' : steps[step.key] === 'skipped' ? 'Skipped' : 'Waiting'}
                    </p>
                  </div>
                </div>
                {i < STEP_LIST.length - 1 && <StepConnector status={steps[step.key]} />}
              </div>
            ))}
          </div>

          {/* Time estimate */}
          <div className="mt-8 pt-6 border-t border-[var(--border)]">
            <p className="font-mono text-[0.65rem] text-[var(--text3)] uppercase tracking-widest mb-3">Estimated time</p>
            <div className="space-y-2">
              {[['GitHub','~30s'],['Vercel','~60s'],['Telegram','~2min'],['Launch','~60s']].map(([s,t])=>(
                <div key={s} className="flex justify-between text-xs">
                  <span className="text-[var(--text3)]">{s}</span>
                  <span className="font-mono text-[var(--text3)]">{t}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-1 border-t border-[var(--border)]">
                <span className="text-[var(--text2)] font-medium">Total</span>
                <span className="font-mono text-[var(--text2)] font-medium">~5 min</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — Active step content */}
        <main className="flex-1 overflow-y-auto p-12">
          <div className="max-w-xl mx-auto">
            {activeStep?.key === 'github' && (
              <GithubStep onDone={() => advance('github','vercel')} data={data} setData={setData} />
            )}
            {activeStep?.key === 'vercel' && (
              <VercelStep onDone={() => advance('vercel','telegram')} data={data} setData={setData} />
            )}
            {activeStep?.key === 'telegram' && (
              <TelegramStep
                onDone={() => track === 2 ? advance('telegram','ton') : advance('telegram','launch')}
                data={data} setData={setData}
              />
            )}
            {activeStep?.key === 'ton' && (
              <TONStep
                onDone={() => advance('ton','launch')}
                onSkip={() => skip('ton','launch')}
                data={data} setData={setData}
              />
            )}
            {activeStep?.key === 'launch' && (
              <LaunchStep data={data} track={track} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function Rocket(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" {...props}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  )
}

export default function DeployPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[var(--tg)]" /></div>}>
      <DeployWizardContent />
    </Suspense>
  )
}
