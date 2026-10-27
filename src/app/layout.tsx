import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Geist } from 'next/font/google'
import Nav from '@/components/Nav'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Lineup',
  description: 'Submit, approve and discover events in one place.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* The nav checks who is logged in, so it loads in behind a plain placeholder bar. */}
        <Suspense fallback={<div className="h-[61px] border-b border-zinc-200 bg-white" />}>
          <Nav />
        </Suspense>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-sm text-muted">
          Lineup · a portfolio project
        </footer>
      </body>
    </html>
  )
}
