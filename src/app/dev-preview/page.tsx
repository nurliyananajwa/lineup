import { Suspense } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import Dashboard from '@/components/workspace/Dashboard'
import WorkspaceShell from '@/components/workspace/WorkspaceShell'
import { getPreviewDashboard } from '@/lib/dashboard-preview'

export const metadata = { title: 'Development preview · Lineup', robots: { index: false, follow: false } }
async function PreviewContent({ searchParams }: PageProps<'/dev-preview'>) {
  const host = (await headers()).get('host') ?? ''
  if (!/^((localhost|127\.0\.0\.1)(:\d+)?|\[::1\](:\d+)?)$/.test(host)) notFound()
  const query = await searchParams
  const role = query.role === 'admin' ? 'admin' : 'organizer'
  const now = new Date().toISOString()
  const profile = { name: 'Alex Morgan', role } as const
  const today = new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(now))
  return <WorkspaceShell profile={profile} today={today} preview>
    <section className="development-preview-bar" aria-label="Development preview">
      <div><strong>Development preview</strong><p>Sample data. Explore both dashboards; sign up to create or manage real events.</p></div>
      <nav aria-label="Preview role"><Link href="/dev-preview?role=organizer" aria-current={role === 'organizer' ? 'page' : undefined}>Organiser</Link><Link href="/dev-preview?role=admin" aria-current={role === 'admin' ? 'page' : undefined}>Admin</Link></nav>
      <Link href="/signup" className="preview-signup">Create an account</Link>
    </section>
    <Dashboard profile={profile} data={getPreviewDashboard(role, now)} />
  </WorkspaceShell>
}
export default function DevelopmentPreview(props: PageProps<'/dev-preview'>) {
  // Keep this entry point unavailable in every production build and deployment.
  if (process.env.NODE_ENV !== 'development') notFound()
  return <Suspense fallback={<div className="workspace-loading" role="status">Opening the dashboard preview…</div>}><PreviewContent {...props} /></Suspense>
}
