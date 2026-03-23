'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[rgba(6,9,15,0.85)] backdrop-blur-xl border-b border-[var(--border)]' : ''
    }`}>
      <div className="max-w-[1140px] mx-auto px-8 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <img src="/logo.svg" alt="MiniGram" style={{ width: 32, height: 32 }} />
          <span className="text-[var(--text)] font-semibold text-lg tracking-tight">MiniGram</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {[['#how','How it works'],['#tracks','Tracks'],['#compliance','Compliance'],['#pricing','Pricing']].map(([href, label]) => (
            <a key={href} href={href} className="text-sm text-[var(--text2)] hover:text-[var(--text)] transition-colors no-underline">
              {label}
            </a>
          ))}
        </div>
        <Link href="/builder">
          <Button size="sm" className="gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Start Building Free
          </Button>
        </Link>
      </div>
    </nav>
  )
}