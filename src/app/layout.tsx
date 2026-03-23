import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://minigram.net'),
  title: 'MiniGram — Build Telegram Mini Apps with AI',
  description: 'Describe your app. MiniGram generates a complete, production-ready Telegram Mini App — bot backend, frontend, notifications, TON blockchain — fully compliant with official standards.',
  openGraph: {
    title: 'MiniGram — Build Telegram Mini Apps with AI',
    description: 'From prompt to production in 45 seconds.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
