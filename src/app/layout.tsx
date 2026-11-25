import type { Metadata } from 'next'
import { Suspense } from 'react'
import localFont from 'next/font/local'
import Nav from '@/components/Nav'
import SiteFrame from '@/components/SiteFrame'
import './globals.css'
import './workspace.css'
import './workspace-refresh.css'
import './workspace-programme.css'
const geistSans = localFont({ src: './fonts/geist-latin.woff2', variable: '--font-geist-sans', weight: '100 900', display: 'swap' })
export const metadata: Metadata = { title: 'Lineup', description: 'Submit, approve and discover events in one place.' }
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return <html lang="en" className={`${geistSans.variable} h-full antialiased`}><body className="flex min-h-full flex-col">
    <Suspense fallback={<div className="workspace-loading" role="status">Loading Lineup…</div>}><SiteFrame navigation={<Suspense fallback={<div className="h-[61px] border-b border-zinc-200 bg-white" />}><Nav /></Suspense>}>{children}</SiteFrame></Suspense>
  </body></html>
}
