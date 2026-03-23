import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Zap, Plus, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const freeLimit = 3
  const used = profile?.generations_used || 0
  const isFree = (profile?.plan || 'free') === 'free'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <nav className="border-b sticky top-0 z-50" style={{ background: 'rgba(6,9,15,0.9)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--tg)' }}>M</div>
            <span className="font-bold tracking-tight">MiniGram</span>
          </a>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--text3)' }}>{user.email}</span>
            <Link href="/builder"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:-translate-y-px"
              style={{ background: 'var(--tg)' }}>
              <Zap className="w-3.5 h-3.5" />New App
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">My Projects</h1>
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              {projects?.length || 0} app{projects?.length !== 1 ? 's' : ''} generated
            </p>
          </div>
          {/* Usage badge */}
          {isFree && (
            <div className="rounded-xl px-5 py-4 border text-right" style={{ background: 'var(--surface)', borderColor: 'var(--border2)' }}>
              <div className="text-2xl font-bold tracking-tight">{used}<span className="text-base font-normal" style={{ color: 'var(--text2)' }}>/{freeLimit}</span></div>
              <div className="text-xs mt-1" style={{ color: 'var(--text3)', fontFamily: 'var(--mono)' }}>free generations</div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface2)', width: '120px' }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(used/freeLimit*100,100)}%`, background: 'var(--tg)' }} />
              </div>
              <Link href="/pricing" className="text-xs mt-2 block font-medium" style={{ color: 'var(--tg)' }}>Upgrade to Pro →</Link>
            </div>
          )}
        </div>

        {/* Projects grid */}
        {projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p: any) => (
              <Link key={p.id} href={`/builder?project=${p.id}`}
                className="rounded-xl p-5 border transition-all hover:-translate-y-1 hover:border-[rgba(34,158,217,0.3)] group"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: p.track === 2 ? 'rgba(0,152,234,0.1)' : 'rgba(34,158,217,0.1)' }}>
                    {p.track === 2 ? '⛓️' : '📱'}
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: p.track === 2 ? 'rgba(0,152,234,0.1)' : 'rgba(34,158,217,0.1)',
                      color: p.track === 2 ? 'var(--ton)' : 'var(--tg)',
                    }}>
                    Track {p.track}
                  </span>
                </div>
                <h3 className="font-semibold tracking-tight mb-1 group-hover:text-white transition-colors">{p.app_name}</h3>
                {p.app_description && <p className="text-xs mb-4 line-clamp-2" style={{ color: 'var(--text2)' }}>{p.app_description}</p>}
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                  <Clock className="w-3 h-3" />
                  {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </Link>
            ))}

            {/* New app card */}
            <Link href="/builder"
              className="rounded-xl p-5 border border-dashed flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-1 min-h-[160px]"
              style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface2)' }}>
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">New App</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl mb-6 flex items-center justify-center"
              style={{ background: 'rgba(34,158,217,0.08)', border: '1px solid rgba(34,158,217,0.15)' }}>
              <Zap className="w-9 h-9" style={{ color: 'var(--tg)', opacity: 0.6 }} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-3">No apps yet</h2>
            <p className="text-sm mb-8 max-w-sm" style={{ color: 'var(--text2)' }}>
              Generate your first Telegram Mini App in 45 seconds. Just describe what you want to build.
            </p>
            <Link href="/builder"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-px"
              style={{ background: 'var(--tg)', boxShadow: '0 0 24px rgba(34,158,217,0.25)' }}>
              <Zap className="w-4 h-4" />Build your first app
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
