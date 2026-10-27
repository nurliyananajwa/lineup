import { Suspense } from 'react'
import Loading from '@/components/Loading'
import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Admin · Lineup' }

async function AdminDashboardContent() {
  const profile = await requireRole('admin')
  const supabase = await createClient()

  // head: true = only count the rows, don't download them.
  const count = async (status: string) =>
    (await supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', status)).count ?? 0
  const [pending, approved, rejected, venues] = await Promise.all([
    count('pending'),
    count('approved'),
    count('rejected'),
    supabase.from('venues').select('id', { count: 'exact', head: true }).then((r) => r.count ?? 0),
  ])

  const stats = [
    { label: 'Waiting for review', value: pending, tone: 'text-amber-700' },
    { label: 'Approved', value: approved, tone: 'text-emerald-700' },
    { label: 'Rejected', value: rejected, tone: 'text-rose-700' },
    { label: 'Venues', value: venues, tone: 'text-indigo-700' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome, {profile.name || 'admin'}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-muted">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Link href="/admin/venues" className="btn-secondary">Manage venues</Link>
      </div>
      <p className="text-sm text-muted">Event review screens come in the next step of the build.</p>
    </div>
  )
}

// Reading the login cookie happens at request time, so it sits inside <Suspense>.
export default function AdminDashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminDashboardContent />
    </Suspense>
  )
}
