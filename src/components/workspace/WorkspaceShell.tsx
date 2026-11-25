'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, type ReactNode } from 'react'
import { logout } from '@/app/auth/actions'
import Icon, { type IconName } from './Icon'
type Profile = { name: string; role: 'admin' | 'organizer' }
function WorkspaceNavigation({ profile, pathname, close, preview }: { profile: Profile; pathname: string; close?: () => void; preview?: boolean }) {
  const base = preview ? `/dev-preview?role=${profile.role}` : profile.role === 'admin' ? '/admin' : '/organizer'
  const initials = (profile.name || 'Lineup').trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()
    const links: { label: string; href: string; icon: IconName; active?: boolean }[] = [
      { label: 'Overview', href: base, icon: 'layout-dashboard', active: preview || pathname === base },
      profile.role === 'admin' ? { label: 'Review events', href: '/admin/events', icon: 'clipboard-check', active: pathname.startsWith('/admin/events') } : { label: 'My events', href: `${base}#events`, icon: 'ticket', active: pathname.includes('/organizer/events/') },
      { label: 'Calendar', href: `${base}#calendar`, icon: 'calendar' },
      { label: 'Registrations', href: `${base}#registrations`, icon: 'users' },
      ...(profile.role === 'admin' ? [{ label: 'Venues', href: '/admin/venues', icon: 'building' as const, active: pathname.startsWith('/admin/venues') }] : []),
    ]
    return <>
      <Link href={base} className="workspace-brand" onClick={close}><span className="workspace-brand-mark"><Icon name="calendar-event" /></span>lineup<span className="brand-period">.</span></Link>
      <p className="workspace-nav-caption">YOUR WORKSPACE</p>
      <nav aria-label="Workspace navigation" className="workspace-nav">{links.map(link => <Link key={link.label} href={link.href} onClick={close} className={link.active ? 'is-active' : ''} aria-current={link.active ? 'page' : undefined}><Icon name={link.icon} /><span>{link.label}</span>{link.active && <span className="nav-active-dot" />}</Link>)}</nav>
      <div className="workspace-sidebar-bottom">
        <div className="workspace-note"><span className="eyebrow">A LITTLE LESS ADMIN.</span><p>A little more<br />main event.</p><Link href={profile.role === 'admin' ? '/admin/events' : '/organizer/events/new'} onClick={close}>{profile.role === 'admin' ? 'Review submissions' : 'Create your next event'}<Icon name="arrow-up-right" /></Link></div>
        <Link className="workspace-public-link" href="/" onClick={close}><Icon name="external-link" />Explore public events</Link>
        <div className="workspace-account"><span className="workspace-avatar">{initials}</span><div><strong>{profile.name || 'Your account'}</strong><span>{profile.role === 'admin' ? 'Administrator' : 'Event organiser'}</span></div></div>
        {preview ? <Link href="/" className="workspace-logout"><Icon name="logout" />Exit preview</Link> : <form action={logout}><button className="workspace-logout"><Icon name="logout" />Log out</button></form>}
      </div>
    </>
}
export default function WorkspaceShell({ children, profile, today, preview = false }: { children: ReactNode; profile: Profile; today: string; preview?: boolean }) {
  const pathname = usePathname()
  const menu = useRef<HTMLDialogElement>(null)
  const closeMenu = () => menu.current?.close()
  const base = profile.role === 'admin' ? '/admin' : '/organizer'
  const title = pathname.startsWith('/check-in') ? 'Event check-in' : pathname.includes('/venues') ? 'Venues' : pathname.endsWith('/new') ? 'Create event' : pathname.includes('/events/') ? 'Event details' : pathname.includes('/events') ? 'Review events' : 'Overview'
  const initials = (profile.name || 'Lineup').trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return <div className="workspace-shell">
    <a className="workspace-skip" href="#workspace-main">Skip to content</a>
    <aside className="workspace-sidebar"><WorkspaceNavigation profile={profile} pathname={pathname} preview={preview} /></aside>
    <dialog ref={menu} className="workspace-mobile-menu" aria-label="Workspace menu" onClick={event => { if (event.target === event.currentTarget) closeMenu() }}><div className="workspace-mobile-menu-inner"><button className="workspace-icon-button mobile-close" aria-label="Close navigation" onClick={closeMenu}><Icon name="x" /></button><WorkspaceNavigation profile={profile} pathname={pathname} close={closeMenu} preview={preview} /></div></dialog>
    <div className="workspace-body"><header className="workspace-topbar"><div className="workspace-breadcrumb"><button className="workspace-icon-button mobile-menu-trigger" aria-label="Open navigation" onClick={() => menu.current?.showModal()}><Icon name="menu-2" /></button><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{title}</strong></div><div className="workspace-topbar-right"><span className="workspace-today"><Icon name="calendar" />{today}</span><span className="workspace-role">{profile.role === 'admin' ? 'Admin workspace' : 'Organiser workspace'}</span><span className="workspace-avatar small" title={profile.name}>{initials}</span></div></header>
      <main id="workspace-main" className={`workspace-main ${preview || pathname === base ? 'workspace-overview' : 'workspace-detail'}`}>{children}</main>
      <footer className="workspace-footer"><span>Good events start with a little organisation.</span><span>Lineup · a portfolio project</span></footer>
    </div>
  </div>
}
