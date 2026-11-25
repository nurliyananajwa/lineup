'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
export default function SiteFrame({ children, navigation }: { children: ReactNode; navigation: ReactNode }) {
  const pathname = usePathname()
  if (/^\/(admin|organizer|check-in)(\/|$)/.test(pathname)) return <>{children}</>
  return <>{navigation}<main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main><footer className="border-t border-zinc-200 py-6 text-center text-sm text-muted">Lineup · a portfolio project</footer></>
}
