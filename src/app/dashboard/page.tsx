import { Suspense } from 'react'
import Loading from '@/components/Loading'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'

// After login everyone lands here, then goes to the right home for their role.
async function DashboardPageContent(): Promise<null> {
  const profile = await requireRole()
  redirect(profile.role === 'admin' ? '/admin' : '/organizer')
}

// Reading the login cookie happens at request time, so it sits inside <Suspense>.
export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardPageContent />
    </Suspense>
  )
}
