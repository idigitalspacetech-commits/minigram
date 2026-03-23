'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/builder` },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  async function handleGithub() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/builder` },
    })
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="text-center max-w-md">
        <div className="text-5xl mb-6">📬</div>
        <h2 className="text-2xl font-bold mb-3">Check your email</h2>
        <p style={{ color: 'var(--text2)' }}>We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to activate your account.</p>
        <Link href="/auth/login" className="inline-block mt-8 text-sm font-medium" style={{ color: 'var(--tg)' }}>Back to login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,158,217,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(34,158,217,0.04) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%,black 40%,transparent 100%)',
      }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-white font-bold text-lg"
              style={{ background: 'var(--tg)' }}>M</div>
            <span className="text-xl font-bold tracking-tight">MiniGram</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Start building free</h1>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>3 free generations, no credit card required</p>
        </div>

        <div className="rounded-2xl p-8 border" style={{ background: 'var(--surface)', borderColor: 'var(--border2)' }}>
          <button onClick={handleGithub}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border font-medium text-sm transition-all hover:-translate-y-px mb-6"
            style={{ background: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text)' }}>
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            Continue with GitHub
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text3)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text2)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text2)' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters" minLength={8}
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border2)', color: 'var(--text)' }} />
            </div>
            {error && <div className="text-sm rounded-lg px-4 py-3" style={{ background: 'rgba(220,38,38,0.1)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)' }}>{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-sm text-white transition-all hover:-translate-y-px disabled:opacity-50"
              style={{ background: 'var(--tg)' }}>
              {loading ? 'Creating account...' : 'Create free account'}
            </button>
          </form>
        </div>
        <p className="text-center text-sm mt-6" style={{ color: 'var(--text3)' }}>
          Have an account? <Link href="/auth/login" className="font-medium" style={{ color: 'var(--tg)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
