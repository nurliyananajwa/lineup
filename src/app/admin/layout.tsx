import type { ReactNode } from 'react'
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout'
export default function AdminLayout({ children }: { children: ReactNode }) { return <WorkspaceLayout role="admin">{children}</WorkspaceLayout> }
