import { Suspense, type ReactNode } from 'react'
import { requireRole, type Role } from '@/lib/auth'
import { connection } from 'next/server'
import WorkspaceShell from './WorkspaceShell'
async function AuthenticatedWorkspace({ children, role }: { children: ReactNode; role?: Role }) {
  const profile = await requireRole(role)
  await connection()
  const today = new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date())
  return <WorkspaceShell profile={{ name: profile.name, role: profile.role }} today={today}>{children}</WorkspaceShell>
}
export default function WorkspaceLayout(props: { children: ReactNode; role?: Role }) {
  return <Suspense fallback={<div className="workspace-loading" role="status">Opening your workspace…</div>}><AuthenticatedWorkspace {...props} /></Suspense>
}
