import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MiniGram — Build Telegram Mini Apps with AI',
  description: 'Describe your app. MiniGram generates a complete, production-ready Telegram Mini App in 45 seconds.',
}

// Landing page is the full HTML page — served via the public folder
// In production, redirect to the landing HTML or render inline
export default function HomePage() {
  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content="0;url=/landing-preview.html" />
      </head>
      <body>
        <p>Redirecting...</p>
      </body>
    </html>
  )
}
