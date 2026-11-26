import { Suspense } from 'react'
import Loading from '@/components/Loading'
import Dashboard from '@/components/workspace/Dashboard'
import { requireRole } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboard-data'
export const metadata = { title: 'Overview · Lineup' }
async function OrganizerOverview() { const profile = await requireRole('organizer'); return <Dashboard profile={{ name: profile.name, role: profile.role }} data={await getDashboardData(profile)} /> }
export default function OrganizerDashboard() { return <Suspense fallback={<Loading />}><OrganizerOverview /></Suspense> }
