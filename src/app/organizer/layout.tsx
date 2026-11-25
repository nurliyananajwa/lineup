import type { ReactNode } from 'react'
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout'
export default function OrganizerLayout({ children }: { children: ReactNode }) { return <WorkspaceLayout role="organizer">{children}</WorkspaceLayout> }
