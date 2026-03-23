'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Zap, ArrowLeft, ChevronDown, ChevronUp, Loader2,
  Download, Copy, Check, FileCode2, Bot, Calendar,
  FileText, Settings, BookOpen, AlertCircle, CheckCircle2,
  Code2, Rocket, Eye, Send, MessageSquare, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MonacoPane } from '@/components/builder/MonacoPane'
import { detectTrack } from '@/lib/prompts'
import type { GenerationContext, GeneratedFiles } from '@/lib/types'

interface Result {
  appName: string
  appDescription: string
  track: 1 | 2
  files: GeneratedFiles
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function runChecks(result: Result) {
  const { files, track } = result
  const all = Object.values(files).join(' ')
  return [
    { name: 'miniapp.html generated',   pass: (files.miniapp_html||'').length > 500 },
    { name: 'Telegram SDK',             pass: (files.miniapp_html||'').includes('telegram-web-app.js') },
    { name: 'tg.ready() + expand()',    pass: (files.miniapp_html||'').includes('tg.ready()') && (files.miniapp_html||'').includes('tg.expand()') },
    { name: 'Theme variables',          pass: (files.miniapp_html||'').includes('tg-theme') || (files.miniapp_html||'').includes('themeParams') },
    { name: 'Desktop responsive',       pass: (files.miniapp_html||'').includes('768') || (files.miniapp_html||'').includes('@media') },
    { name: 'No blockchain in T1',      pass: track===2 || !['tonconnect','sendtransaction'].some(b=>all.toLowerCase().includes(b)) },
    { name: 'bot.py generated',         pass: (files.bot_py||'').length > 300 },
    { name: 'InlineKeyboardMarkup',     pass: (files.bot_py||'').includes('InlineKeyboardMarkup') },
    { name: 'WebAppInfo button',        pass: (files.bot_py||'').includes('WebAppInfo') },
    { name: 'ReplyKeyboardMarkup',      pass: (files.bot_py||'').includes('ReplyKeyboardMarkup') },
    { name: 'No hardcoded token',       pass: !/[0-9]{9,10}:[A-Za-z0-9_-]{35}/.test(files.bot_py||'') },
    { name: 'pin_chat_message',         pass: (files.bot_py||'').includes('pin_chat_message') },
    { name: 'Rate limit handling',      pass: all.includes('RetryAfter') || all.includes('asyncio.sleep') },
    { name: 'APScheduler',             pass: (files.scheduler_py||'').toLowerCase().includes('asyncioscheduler') },
    { name: 'requirements.txt',        pass: ['python-telegram-bot','apscheduler'].every(p => (files.requirements_txt||'').toLowerCase().includes(p.toLowerCase())) },
    ...(track === 2 ? [
      { name: 'manifest.json',         pass: (files.tonconnect_manifest_json||'').length > 10 },
      { name: 'TON Connect script',    pass: all.toLowerCase().includes('tonconnect') },
      { name: 'TonConnectUI init',     pass: all.includes('TonConnectUI') },
      { name: 'onStatusChange',        pass: all.includes('onStatusChange') },
      { name: 'sendTransaction',       pass: all.toLowerCase().includes('sendtransaction') },
      { name: 'nanoTON math',         pass: all.includes('1000000000') || all.includes('1e9') },
      { name: 'Testnet in guide',     pass: (files.setup_md||'').toLowerCase().includes('testnet') },
    ] : []),
  ]
}

const FILE_TABS = [
  { key: 'miniapp_html',            label: 'miniapp.html',             icon: <FileCode2 className="w-3.5 h-3.5" />, lang: 'HTML'    },
  { key: 'bot_py',                  label: 'bot.py',                   icon: <Bot       className="w-3.5 h-3.5" />, lang: 'Python'  },
  { key: 'scheduler_py',            label: 'scheduler.py',             icon: <Calendar  className="w-3.5 h-3.5" />, lang: 'Python'  },
  { key: 'tonconnect_manifest_json',label: 'tonconnect-manifest.json', icon: <Settings  className="w-3.5 h-3.5" />, lang: 'JSON'    },
  { key: 'requirements_txt',        label: 'requirements.txt',         icon: <FileText  className="w-3.5 h-3.5" />, lang: 'Text'    },
  { key: 'env_example',             label: '.env.example',             icon: <Settings  className="w-3.5 h-3.5" />, lang: 'Env'     },
  { key: 'setup_md',                label: 'SETUP.md',                 icon: <BookOpen  className="w-3.5 h-3.5" />, lang: 'Markdown'},
]

function downloadFile(content: string, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
  a.download = filename; a.click()
}

function downloadAll(result: Result, edited: Record<string, string>) {
  const map: Record<string, string> = {
    'miniapp.html':    result.files.miniapp_html,
    'bot.py':          result.files.bot_py,
    'scheduler.py':    result.files.scheduler_py,
    'requirements.txt':result.files.requirements_txt,
    '.env.example':    result.files.env_example,
    'SETUP.md':        result.files.setup_md,
    ...(result.files.tonconnect_manifest_json ? { 'tonconnect-manifest.json': result.files.tonconnect_manifest_json } : {}),
  }
  Object.entries(map).forEach(([name, content], i) => {
    const key = FILE_TABS.find(t => t.label === name)?.key ?? ''
    setTimeout(() => downloadFile(edited[key] ?? content ?? '', name), i * 100)
  })
}

const inputStyle = { width:'100%', background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 14px', fontSize:'0.875rem', color:'var(--text)', outline:'none', fontFamily:'Inter, sans-serif', transition:'border-color 0.2s' }
const labelStyle = { display:'block' as const, fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--text3)', textTransform:'uppercase' as const, letterSpacing:'0.1em', marginBottom:6 }

export default function BuilderPage() {
  const router = useRouter()

  const [appNameInput, setAppNameInput] = useState('')
  const [prompt, setPrompt]             = useState('')
  const [showOpts, setShowOpts]         = useState(false)
  const [payments, setPayments]         = useState('none')
  const [referral, setReferral]         = useState('none')
  const [notification, setNotif]        = useState('')
  const [category, setCategory]         = useState('other')
  const [loading, setLoading]           = useState(false)
  const [stepLabel, setStepLabel]       = useState('')
  const [error, setError]               = useState('')
  const [result, setResult]             = useState<Result | null>(null)
  const [activeTab, setActiveTab]       = useState('miniapp_html')
  const [viewMode, setViewMode]         = useState<'code'|'preview'|'chat'>('code')
  const [monacoMode, setMonacoMode]     = useState(false)
  const [copied, setCopied]             = useState(false)
  const [editedFiles, setEditedFiles]   = useState<Record<string, string>>({})
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput]       = useState('')
  const [chatLoading, setChatLoading]   = useState(false)
  const chatEndRef                       = useRef<HTMLDivElement>(null)

  const detectedTrack = prompt.trim() ? detectTrack(prompt) : null

  const STEPS = [
    'Naming your app...',
    'Writing Mini App frontend...',
    'Writing Python bot...',
    ...(detectedTrack === 2 ? ['Generating TON manifest...'] : []),
    'Writing support files...',
    'Running validation checks...',
  ]

  async function handleGenerate() {
    if (!prompt.trim()) return
    setLoading(true); setError(''); setResult(null)
    setEditedFiles({}); setChatMessages([])
    setStepLabel(STEPS[0]); setViewMode('code')

    try {
      const ctx = { prompt, payments, referral, notification, category, appNameOverride: appNameInput.trim() || undefined }
      let stepIdx = 0
      const interval = setInterval(() => {
        stepIdx = Math.min(stepIdx + 1, STEPS.length - 1)
        setStepLabel(STEPS[stepIdx])
      }, 12000)
      const res  = await fetch('/api/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(ctx) })
      clearInterval(interval)
      setStepLabel('Running validation checks...')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResult(data)
      setActiveTab('miniapp_html')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false); setStepLabel('')
    }
  }

  async function handleChat() {
    if (!chatInput.trim() || !result || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatLoading(true)
    const currentFile = editedFiles[activeTab] ?? result.files[activeTab as keyof GeneratedFiles] ?? ''
    const fileLabel   = FILE_TABS.find(t => t.key === activeTab)?.label ?? activeTab
    try {
      const res = await fetch('/api/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          prompt: `You are editing "${fileLabel}" for a Telegram Mini App called "${result.appName}". The user wants: ${userMsg}\n\nCurrent file:\n${currentFile}\n\nReturn ONLY the complete updated file. No explanation. No markdown fences.`,
          payments:'none', referral:'none', notification:'', category:'chat_edit',
        }),
      })
      const data = await res.json()
      const updated = data.files?.[activeTab as keyof GeneratedFiles] || ''
      if (updated) {
        setEditedFiles(prev => ({ ...prev, [activeTab]: updated }))
        setChatMessages(prev => [...prev, { role:'assistant', content:`✓ Updated ${fileLabel}. You can see the changes in the Code tab.` }])
      } else {
        setChatMessages(prev => [...prev, { role:'assistant', content:`Changes applied to ${fileLabel}. Switch to Code tab to review.` }])
      }
    } catch {
      setChatMessages(prev => [...prev, { role:'assistant', content:'Something went wrong. Please try again.' }])
    } finally {
      setChatLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior:'smooth' }), 100)
    }
  }

  function copyActive() {
    if (!result) return
    navigator.clipboard.writeText(editedFiles[activeTab] ?? result.files[activeTab as keyof GeneratedFiles] ?? '')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const checks        = result ? runChecks(result) : []
  const passed        = checks.filter(c => c.pass).length
  const visibleTabs   = result ? FILE_TABS.filter(t => result.files[t.key as keyof GeneratedFiles]) : []
  const activeContent = result ? (editedFiles[activeTab] ?? result.files[activeTab as keyof GeneratedFiles] ?? '') : ''
  const activeTabMeta = visibleTabs.find(t => t.key === activeTab)
  const previewHtml   = result ? (editedFiles['miniapp_html'] ?? result.files.miniapp_html ?? '') : ''

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily:'Inter, sans-serif' }}>
      {/* Topbar */}
      <header className="h-14 flex-shrink-0 flex items-center px-6 gap-4 relative z-20"
        style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)' }}>
        <Link href="/" className="flex items-center gap-2 no-underline" style={{ color:'var(--text3)', fontSize:'0.875rem' }}>
          <ArrowLeft style={{ width:16, height:16 }} />
          <span className="hidden sm:block">Home</span>
        </Link>
        <span style={{ width:1, height:20, background:'var(--border)', display:'block' }} />
        <div className="flex items-center gap-2">
          <div style={{ width:26, height:26, background:'var(--tg)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ color:'#fff', fontWeight:700, fontSize:12 }}>M</span>
          </div>
          <span style={{ fontWeight:600, fontSize:'0.875rem', letterSpacing:'-0.01em' }}>MiniGram</span>
          <span style={{ color:'var(--text3)', fontSize:'0.875rem' }}>/ Builder</span>
        </div>
        {result && (
          <div className="ml-auto flex items-center gap-2">
            <span style={{ fontSize:'0.875rem', color:'var(--text2)' }} className="hidden sm:block">{result.appName}</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:'0.7rem', padding:'3px 10px', borderRadius:100,
              border:`1px solid ${result.track===2?'rgba(0,152,234,0.25)':'rgba(34,158,217,0.25)'}`,
              background:result.track===2?'rgba(0,152,234,0.08)':'rgba(34,158,217,0.08)',
              color:result.track===2?'var(--ton)':'var(--tg)' }}>
              {result.track===2?'⛓ Track 2 · TON':'📱 Track 1'}
            </span>
            <button onClick={() => setMonacoMode(v=>!v)} style={{ fontFamily:'var(--mono)', fontSize:'0.7rem', padding:'5px 12px', borderRadius:8,
              border:`1px solid ${monacoMode?'rgba(244,167,51,0.35)':'var(--border2)'}`,
              background:monacoMode?'rgba(244,167,51,0.08)':'transparent',
              color:monacoMode?'var(--gold)':'var(--text3)', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
              <Code2 style={{ width:13, height:13 }} />{monacoMode?'Editor ON':'Open Editor'}
            </button>
            <Button size="sm" variant="secondary" onClick={() => downloadAll(result, editedFiles)} className="gap-1.5">
              <Download style={{ width:13, height:13 }} />Download All
            </Button>
            <button onClick={() => router.push(`/deploy?appName=${encodeURIComponent(result.appName)}&track=${result.track}`)}
              style={{ display:'flex', alignItems:'center', gap:6, background:'var(--green)', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', fontSize:'0.875rem', fontWeight:500, cursor:'pointer', fontFamily:'Inter, sans-serif' }}>
              <Rocket style={{ width:14, height:14 }} />Deploy App
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT panel */}
        <aside className="w-[400px] flex-shrink-0 flex flex-col overflow-y-auto" style={{ background:'var(--bg2)', borderRight:'1px solid var(--border)' }}>
          <div className="p-6 flex-1">
            <h1 style={{ fontWeight:700, fontSize:'1.2rem', letterSpacing:'-0.02em', marginBottom:4 }}>Build your app</h1>
            <p style={{ fontSize:'0.875rem', color:'var(--text2)', marginBottom:20 }}>Describe it — AI generates everything.</p>

            {/* App Name */}
            <div style={{ marginBottom:16 }}>
              <label style={labelStyle}>App Name <span style={{ color:'var(--text3)', fontWeight:400, textTransform:'none' }}>(optional)</span></label>
              <input value={appNameInput} onChange={e => setAppNameInput(e.target.value)}
                placeholder="e.g. Bella Restaurant, TON Members Club..."
                disabled={loading} style={{ ...inputStyle, opacity:loading?0.5:1 }}
                onFocus={e => e.currentTarget.style.borderColor='var(--tg)'}
                onBlur={e => e.currentTarget.style.borderColor='var(--border2)'} />
              <p style={{ fontSize:'0.7rem', color:'var(--text3)', marginTop:4 }}>Leave blank and AI picks a name for you</p>
            </div>

            {/* Prompt */}
            <div style={{ marginBottom:12 }}>
              <label style={labelStyle}>App description <span style={{ color:'red' }}>*</span></label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="e.g. A Telegram bot for a restaurant — menu browsing, table booking, Telegram Stars payments. Daily specials notification at 6pm."
                rows={5} disabled={loading}
                style={{ ...inputStyle, resize:'none', lineHeight:1.6, borderRadius:12, opacity:loading?0.5:1 }}
                onFocus={e => e.currentTarget.style.borderColor='var(--tg)'}
                onBlur={e => e.currentTarget.style.borderColor='var(--border2)'} />
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, alignItems:'center' }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--text3)' }}>{prompt.length} chars</span>
                {detectedTrack && (
                  <span style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', padding:'2px 9px', borderRadius:4,
                    border:`1px solid ${detectedTrack===2?'rgba(0,152,234,0.25)':'rgba(34,158,217,0.25)'}`,
                    background:detectedTrack===2?'rgba(0,152,234,0.08)':'rgba(34,158,217,0.08)',
                    color:detectedTrack===2?'var(--ton)':'var(--tg)' }}>
                    {detectedTrack===2?'⛓ Track 2 — TON detected':'📱 Track 1 — Standard'}
                  </span>
                )}
              </div>
            </div>

            {/* Options */}
            <button onClick={() => setShowOpts(v=>!v)} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', background:'none', border:'none', cursor:'pointer', color:'var(--text2)', fontSize:'0.8rem', marginBottom:16, padding:0 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'0.1em' }}>Options</span>
              <span style={{ flex:1, height:1, background:'var(--border)' }} />
              {showOpts?<ChevronUp style={{ width:14, height:14 }} />:<ChevronDown style={{ width:14, height:14 }} />}
            </button>

            {showOpts && (
              <div style={{ marginBottom:20 }}>
                <div style={{ marginBottom:16 }}>
                  <label style={labelStyle}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, cursor:'pointer' }}>
                    {[['other','General'],['restaurant','Restaurant & Food'],['ecommerce','E-commerce'],['community','Community'],['events','Events & Booking'],['defi','DeFi & Web3'],['nft','NFT & Collectibles']].map(([v,l])=>(
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={labelStyle}>Payments</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                    {[['none','None'],['stars','Stars'],['ton','TON']].map(([v,l])=>(
                      <button key={v} onClick={() => setPayments(v)} style={{ padding:'7px', borderRadius:8, fontSize:'0.78rem', fontWeight:500, border:`1px solid ${payments===v?'var(--tg)':'var(--border2)'}`, background:payments===v?'rgba(34,158,217,0.12)':'var(--surface)', color:payments===v?'var(--tg)':'var(--text2)', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={labelStyle}>Referral</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                    {[['none','None'],['simple','Simple'],['rewards','Rewards']].map(([v,l])=>(
                      <button key={v} onClick={() => setReferral(v)} style={{ padding:'7px', borderRadius:8, fontSize:'0.78rem', fontWeight:500, border:`1px solid ${referral===v?'var(--tg)':'var(--border2)'}`, background:referral===v?'rgba(34,158,217,0.12)':'var(--surface)', color:referral===v?'var(--tg)':'var(--text2)', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Notification copy</label>
                  <input value={notification} onChange={e => setNotif(e.target.value)} placeholder="e.g. New specials available! 🍕" style={inputStyle} />
                </div>
              </div>
            )}

            {error && (
              <div style={{ display:'flex', gap:10, background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
                <AlertCircle style={{ width:16, height:16, color:'#f87171', flexShrink:0, marginTop:1 }} />
                <p style={{ fontSize:'0.875rem', color:'#f87171', margin:0 }}>{error}</p>
              </div>
            )}

            <button onClick={handleGenerate} disabled={!prompt.trim()||loading}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                background:!prompt.trim()||loading?'rgba(34,158,217,0.4)':'var(--tg)', color:'#fff', border:'none', borderRadius:10, padding:'12px',
                fontSize:'0.95rem', fontWeight:500, cursor:!prompt.trim()||loading?'not-allowed':'pointer',
                transition:'all 0.2s', boxShadow:'0 0 24px rgba(34,158,217,0.25)', fontFamily:'Inter, sans-serif' }}>
              {loading ? <><Loader2 style={{ width:16, height:16, animation:'spin 1s linear infinite' }} />{stepLabel||'Generating...'}</> : <><Zap style={{ width:16, height:16 }} />Generate App</>}
            </button>

            {loading && (
              <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:6 }}>
                {STEPS.map((s,i) => {
                  const current = STEPS.indexOf(stepLabel), isDone=i<current, isActive=i===current
                  return (
                    <div key={s} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.72rem', fontFamily:'var(--mono)', color:isDone?'var(--green)':isActive?'var(--tg)':'var(--text3)', opacity:i>current+1?0.4:1 }}>
                      {isDone?<CheckCircle2 style={{ width:13, height:13, flexShrink:0 }} />:isActive?<Loader2 style={{ width:13, height:13, flexShrink:0, animation:'spin 1s linear infinite' }} />:<span style={{ width:13, height:13, borderRadius:'50%', border:'1px solid currentColor', flexShrink:0, opacity:0.3, display:'inline-block' }} />}
                      {s}
                    </div>
                  )
                })}
              </div>
            )}

            {result && checks.length>0 && (
              <div style={{ marginTop:20, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:'0.63rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Validation</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:'0.72rem', fontWeight:600, color:passed===checks.length?'var(--green)':'var(--gold)' }}>{passed}/{checks.length} passed</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:200, overflowY:'auto' }}>
                  {checks.map(c => (
                    <div key={c.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.7rem' }}>
                      <span style={{ color:c.pass?'var(--green)':'#f87171', fontWeight:700 }}>{c.pass?'✓':'✗'}</span>
                      <span style={{ color:c.pass?'var(--text2)':'#f87171' }}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!result && !loading && (
            <div style={{ padding:'0 24px 24px' }}>
              <p style={{ fontFamily:'var(--mono)', fontSize:'0.63rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Try an example</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {[
                  'A restaurant bot with menu browsing, table booking, and Telegram Stars payments',
                  'A TON token-gated community — hold 500 CLUB tokens to access the premium feed',
                  'A fitness tracker with daily workout logging, streaks, and friend challenges',
                ].map(ex => (
                  <button key={ex} onClick={() => setPrompt(ex)} style={{ textAlign:'left', fontSize:'0.78rem', color:'var(--text3)', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', cursor:'pointer', lineHeight:1.5, fontFamily:'Inter, sans-serif' }}
                    onMouseOver={e => { e.currentTarget.style.color='var(--text2)'; e.currentTarget.style.borderColor='var(--border2)' }}
                    onMouseOut={e => { e.currentTarget.style.color='var(--text3)'; e.currentTarget.style.borderColor='var(--border)' }}>{ex}</button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT panel */}
        <main className="flex-1 flex flex-col overflow-hidden" style={{ background:'var(--bg)' }}>

          {!result && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div style={{ width:64, height:64, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
                <Zap style={{ width:30, height:30, color:'var(--tg)' }} />
              </div>
              <h2 style={{ fontWeight:700, fontSize:'1.4rem', letterSpacing:'-0.02em', marginBottom:8 }}>Ready to generate</h2>
              <p style={{ color:'var(--text2)', fontSize:'0.875rem', maxWidth:360, lineHeight:1.6 }}>Name your app, describe it on the left, and hit Generate. AI produces all your files in about 45 seconds.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginTop:28, maxWidth:320 }}>
                {[['45s','Generation'],['22','Checks'],['7','Files']].map(([n,l])=>(
                  <div key={l} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px', textAlign:'center' }}>
                    <p style={{ fontWeight:700, fontSize:'1.4rem', letterSpacing:'-0.02em', marginBottom:2 }}>{n}</p>
                    <p style={{ fontFamily:'var(--mono)', fontSize:'0.6rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div style={{ width:64, height:64, background:'rgba(34,158,217,0.08)', border:'1px solid rgba(34,158,217,0.2)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
                <Loader2 style={{ width:30, height:30, color:'var(--tg)', animation:'spin 1s linear infinite' }} />
              </div>
              <h2 style={{ fontWeight:700, fontSize:'1.2rem', letterSpacing:'-0.02em', marginBottom:6 }}>{appNameInput?`Building ${appNameInput}...`:'Generating your app...'}</h2>
              <p style={{ color:'var(--text2)', fontSize:'0.875rem', marginBottom:20 }}>{stepLabel}</p>
              <div style={{ width:200, height:4, background:'var(--surface)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'var(--tg)', borderRadius:4, transition:'width 1s ease', width:`${((STEPS.indexOf(stepLabel)+1)/STEPS.length)*100}%` }} />
              </div>
            </div>
          )}

          {result && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* App bar */}
              <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg2)', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                <div>
                  <p style={{ fontWeight:600, fontSize:'0.95rem', letterSpacing:'-0.01em' }}>{result.appName}</p>
                  {result.appDescription && <p style={{ fontSize:'0.78rem', color:'var(--text2)', marginTop:2 }}>{result.appDescription}</p>}
                </div>
                <div className="ml-auto" style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:'0.68rem', padding:'3px 10px', borderRadius:100,
                    border:`1px solid ${passed===checks.length?'rgba(29,185,84,0.25)':'rgba(244,167,51,0.25)'}`,
                    background:passed===checks.length?'rgba(29,185,84,0.08)':'rgba(244,167,51,0.08)',
                    color:passed===checks.length?'var(--green)':'var(--gold)' }}>
                    {passed}/{checks.length} checks
                  </span>
                </div>
              </div>

              {/* View mode + file tabs */}
              <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--bg2)', flexShrink:0 }}>
                <div style={{ display:'flex', borderRight:'1px solid var(--border)', flexShrink:0 }}>
                  {([
                    { id:'code' as const,    icon:<FileCode2 style={{ width:13,height:13 }} />, label:'Code' },
                    { id:'preview' as const, icon:<Eye style={{ width:13,height:13 }} />, label:'Preview' },
                    { id:'chat' as const,    icon:<MessageSquare style={{ width:13,height:13 }} />, label:'AI Edit' },
                  ]).map(m => (
                    <button key={m.id} onClick={() => setViewMode(m.id)} style={{
                      display:'flex', alignItems:'center', gap:5, padding:'10px 14px',
                      fontFamily:'var(--mono)', fontSize:'0.72rem', whiteSpace:'nowrap',
                      borderBottom:`2px solid ${viewMode===m.id?'var(--tg)':'transparent'}`,
                      color:viewMode===m.id?'var(--tg)':'var(--text3)',
                      background:viewMode===m.id?'rgba(34,158,217,0.04)':'transparent',
                      border:'none', cursor:'pointer',
                    }}>
                      {m.icon}{m.label}
                      {m.id==='chat' && chatMessages.length>0 && <span style={{ background:'var(--tg)', color:'#fff', fontSize:'0.6rem', borderRadius:100, padding:'1px 5px' }}>{chatMessages.filter(x=>x.role==='user').length}</span>}
                    </button>
                  ))}
                </div>
                {viewMode==='code' && (
                  <div style={{ display:'flex', overflowX:'auto' }}>
                    {visibleTabs.map(tab => (
                      <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                        display:'flex', alignItems:'center', gap:6, padding:'10px 14px',
                        fontFamily:'var(--mono)', fontSize:'0.72rem', whiteSpace:'nowrap',
                        borderBottom:`2px solid ${activeTab===tab.key?'var(--tg)':'transparent'}`,
                        color:activeTab===tab.key?'var(--tg)':'var(--text3)',
                        background:activeTab===tab.key?'rgba(34,158,217,0.04)':'transparent',
                        border:'none', cursor:'pointer',
                      }}>
                        {tab.icon}{tab.label}
                        {editedFiles[tab.key] && <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--gold)', display:'inline-block' }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* CODE VIEW */}
              {viewMode==='code' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--text3)' }}>{activeTabMeta?.lang}</span>
                      {monacoMode && <span style={{ fontFamily:'var(--mono)', fontSize:'0.63rem', color:'var(--gold)', background:'rgba(244,167,51,0.08)', border:'1px solid rgba(244,167,51,0.2)', borderRadius:4, padding:'1px 6px' }}>Editable</span>}
                      {editedFiles[activeTab] && <span style={{ fontFamily:'var(--mono)', fontSize:'0.63rem', color:'var(--gold)' }}>● modified</span>}
                      <span style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--text3)' }}>{(activeContent.length/1024).toFixed(1)}kb</span>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      {editedFiles[activeTab] && (
                        <button onClick={() => setEditedFiles(prev => { const n={...prev}; delete n[activeTab]; return n })}
                          style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--text3)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:5, padding:'4px 10px', cursor:'pointer' }}>
                          <RefreshCw style={{ width:11, height:11 }} />Reset
                        </button>
                      )}
                      <button onClick={copyActive} style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--text3)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:5, padding:'4px 10px', cursor:'pointer' }}>
                        {copied?<><Check style={{ width:12, height:12, color:'var(--green)' }} />Copied</>:<><Copy style={{ width:12, height:12 }} />Copy</>}
                      </button>
                      <button onClick={() => downloadFile(activeContent, activeTabMeta?.label||'file')}
                        style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'var(--mono)', fontSize:'0.65rem', color:'var(--text3)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:5, padding:'4px 10px', cursor:'pointer' }}>
                        <Download style={{ width:12, height:12 }} />Download
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {monacoMode ? (
                      <MonacoPane fileKey={activeTab} content={activeContent} onChange={v => setEditedFiles(prev => ({ ...prev, [activeTab]: v }))} />
                    ) : (
                      <div style={{ height:'100%', overflow:'auto' }}>
                        <pre style={{ margin:0, padding:'20px 24px', fontFamily:'var(--mono)', fontSize:'0.78rem', lineHeight:1.8, color:'#e2e8f0', whiteSpace:'pre-wrap', wordBreak:'break-word', minHeight:'100%' }}>{activeContent}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PREVIEW VIEW */}
              {viewMode==='preview' && (
                <div className="flex-1 overflow-auto" style={{ display:'flex', alignItems:'flex-start', justifyContent:'center', padding:24, background:'var(--bg)' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                    <div style={{ width:390, background:'var(--surface2)', borderRadius:'16px 16px 0 0', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, border:'1px solid var(--border)', borderBottom:'none' }}>
                      <div style={{ width:28, height:28, background:'var(--tg)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ color:'#fff', fontSize:12, fontWeight:700 }}>M</span>
                      </div>
                      <div>
                        <p style={{ fontSize:'0.8rem', fontWeight:600, margin:0 }}>{result.appName}</p>
                        <p style={{ fontSize:'0.65rem', color:'var(--text3)', margin:0 }}>Mini App</p>
                      </div>
                      <span style={{ marginLeft:'auto', fontSize:'0.7rem', color:'var(--text3)' }}>✕</span>
                    </div>
                    <iframe srcDoc={previewHtml}
                      style={{ width:390, height:680, border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 0 16px 16px', background:'#fff' }}
                      sandbox="allow-scripts allow-same-origin" title="Mini App Preview" />
                    <p style={{ fontSize:'0.75rem', color:'var(--text3)', fontFamily:'var(--mono)' }}>
                      Live preview · 390×680px Telegram Mini App dimensions
                    </p>
                    <p style={{ fontSize:'0.72rem', color:'var(--text3)', maxWidth:390, textAlign:'center', lineHeight:1.5 }}>
                      Note: Telegram SDK functions (tg.ready, theme vars) are mocked in preview. The real app runs inside Telegram.
                    </p>
                  </div>
                </div>
              )}

              {/* AI CHAT VIEW */}
              {viewMode==='chat' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div style={{ padding:'10px 16px', background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontFamily:'var(--mono)', fontSize:'0.68rem', color:'var(--text3)' }}>Editing:</span>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {visibleTabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ fontFamily:'var(--mono)', fontSize:'0.65rem', padding:'3px 8px', borderRadius:5, cursor:'pointer',
                          background:activeTab===tab.key?'rgba(34,158,217,0.12)':'var(--surface2)',
                          border:`1px solid ${activeTab===tab.key?'rgba(34,158,217,0.3)':'var(--border)'}`,
                          color:activeTab===tab.key?'var(--tg)':'var(--text3)' }}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
                    {chatMessages.length===0 && (
                      <div style={{ textAlign:'center', paddingTop:40 }}>
                        <div style={{ width:48, height:48, background:'rgba(34,158,217,0.08)', border:'1px solid rgba(34,158,217,0.15)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
                          <MessageSquare style={{ width:22, height:22, color:'var(--tg)' }} />
                        </div>
                        <p style={{ fontWeight:600, fontSize:'0.95rem', marginBottom:6 }}>AI Edit Mode</p>
                        <p style={{ fontSize:'0.85rem', color:'var(--text2)', maxWidth:300, margin:'0 auto', lineHeight:1.6 }}>
                          Select a file above, then tell AI what changes to make. Changes apply instantly.
                        </p>
                        <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:20, maxWidth:340, margin:'20px auto 0' }}>
                          {['Make the button colour dark blue','Add a loyalty points counter to the header','Change the notification text to include an emoji'].map(s => (
                            <button key={s} onClick={() => setChatInput(s)} style={{ textAlign:'left', fontSize:'0.78rem', color:'var(--text3)', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px', cursor:'pointer', fontFamily:'Inter, sans-serif' }}>{s}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {chatMessages.map((m,i) => (
                      <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
                        <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius:12, fontSize:'0.875rem', lineHeight:1.5,
                          background:m.role==='user'?'var(--tg)':'var(--surface)', color:m.role==='user'?'#fff':'var(--text)',
                          border:m.role==='assistant'?'1px solid var(--border)':'none' }}>{m.content}</div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display:'flex', justifyContent:'flex-start' }}>
                        <div style={{ padding:'10px 14px', borderRadius:12, background:'var(--surface)', border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                          <Loader2 style={{ width:14, height:14, color:'var(--tg)', animation:'spin 1s linear infinite' }} />
                          <span style={{ fontSize:'0.875rem', color:'var(--text2)' }}>Updating {activeTabMeta?.label}...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', background:'var(--bg2)', flexShrink:0 }}>
                    <div style={{ display:'flex', gap:8 }}>
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key==='Enter' && !e.shiftKey && handleChat()}
                        placeholder={`Describe a change to ${activeTabMeta?.label||'this file'}...`}
                        disabled={chatLoading}
                        style={{ ...inputStyle, flex:1, borderRadius:10, opacity:chatLoading?0.6:1 }}
                        onFocus={e => e.currentTarget.style.borderColor='var(--tg)'}
                        onBlur={e => e.currentTarget.style.borderColor='var(--border2)'} />
                      <button onClick={handleChat} disabled={!chatInput.trim()||chatLoading}
                        style={{ display:'flex', alignItems:'center', justifyContent:'center', width:42, height:42,
                          background:chatInput.trim()&&!chatLoading?'var(--tg)':'rgba(34,158,217,0.3)',
                          border:'none', borderRadius:10, cursor:chatInput.trim()&&!chatLoading?'pointer':'not-allowed', flexShrink:0 }}>
                        <Send style={{ width:16, height:16, color:'#fff' }} />
                      </button>
                    </div>
                    <p style={{ fontFamily:'var(--mono)', fontSize:'0.63rem', color:'var(--text3)', marginTop:6 }}>Press Enter to send · Changes apply instantly</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
