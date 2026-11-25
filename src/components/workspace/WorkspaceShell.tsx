'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, type ReactNode } from 'react'
import { logout } from '@/app/auth/actions'
import Icon, { type IconName } from './Icon'
type Profile = { name: string; role: 'admin' | 'organizer' }
function WorkspaceNavigation({
  profile,
  pathname,
  close,
  preview,
  collapsed = false,
  onToggle,
}: {
  profile: Profile
  pathname: string
  close?: () => void
  preview?: boolean
  collapsed?: boolean
  onToggle?: () => void
}) {
  const base = preview ? `/dev-preview?role=${profile.role}` : profile.role === 'admin' ? '/admin' : '/organizer'
  const initials = (profile.name || 'Lineup').trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const links: { label: string; href: string; icon: IconName; active?: boolean }[] = [
    { label: 'Overview', href: base, icon: 'layout-dashboard', active: preview || pathname === base },
    profile.role === 'admin' ? { label: 'Review events', href: '/admin/events', icon: 'clipboard-check', active: pathname.startsWith('/admin/events') } : { label: 'My events', href: `${base}#events`, icon: 'ticket', active: pathname.includes('/organizer/events/') },
    { label: 'Venue map', href: `${base}#venue-map`, icon: 'map-pin' },
    { label: 'Calendar', href: `${base}#calendar`, icon: 'calendar' },
    { label: 'Registrations', href: `${base}#registrations`, icon: 'users' },
    ...(profile.role === 'admin' ? [{ label: 'Venues', href: '/admin/venues', icon: 'building' as const, active: pathname.startsWith('/admin/venues') }] : []),
  ]
  const exitLabel = preview ? 'Exit preview' : 'Log out'
  const exitContent = <><Icon name="logout" /><span className="workspace-nav-label">{exitLabel}</span></>

  return <>
    <div className="workspace-nav-header">
      <Link href={base} className="workspace-brand" onClick={close} aria-label="Lineup" title={collapsed ? 'Lineup' : undefined}>
        <span className="workspace-brand-mark"><Icon name="calendar-event" /></span>
        <span className="workspace-nav-label">lineup<span className="brand-period">.</span></span>
      </Link>
      {onToggle && (
        <button type="button" className="workspace-icon-button workspace-sidebar-toggle" onClick={onToggle}
          aria-controls="workspace-desktop-navigation" aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} />
        </button>
      )}
    </div>
    <nav id={onToggle ? 'workspace-desktop-navigation' : undefined} aria-label="Workspace navigation" className="workspace-nav">
      {links.map(link => (
        <Link key={link.label} href={link.href} onClick={close} className={link.active ? 'is-active' : undefined}
          aria-current={link.active ? 'page' : undefined} aria-label={link.label} title={collapsed ? link.label : undefined}>
          <Icon name={link.icon} /><span className="workspace-nav-label">{link.label}</span>
        </Link>
      ))}
    </nav>
    <div className="workspace-sidebar-bottom">
      <Link className="workspace-public-link" href="/" onClick={close} aria-label="Explore public events" title={collapsed ? 'Explore public events' : undefined}>
        <Icon name="external-link" /><span className="workspace-nav-label">Explore public events</span>
      </Link>
      <div className="workspace-account" title={collapsed ? profile.name : undefined}>
        <span className="workspace-avatar">{initials}</span>
        <div className="workspace-nav-label"><strong>{profile.name || 'Your account'}</strong><span>{profile.role === 'admin' ? 'Administrator' : 'Event organiser'}</span></div>
      </div>
      {preview ? (
        <Link href="/" className="workspace-logout" aria-label={exitLabel} title={collapsed ? exitLabel : undefined}>{exitContent}</Link>
      ) : (
        <form action={logout}><button className="workspace-logout" aria-label={exitLabel} title={collapsed ? exitLabel : undefined}>{exitContent}</button></form>
      )}
    </div>
  </>
}
export default function WorkspaceShell({ children, profile, today, preview = false }: { children: ReactNode; profile: Profile; today: string; preview?: boolean }) {
  const pathname = usePathname()
  const menu = useRef<HTMLDialogElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const closeMenu = () => menu.current?.close()
  const base = profile.role === 'admin' ? '/admin' : '/organizer'
  const title = pathname.startsWith('/check-in') ? 'Event check-in' : pathname.includes('/venues') ? 'Venues' : pathname.endsWith('/new') ? 'Create event' : pathname.includes('/events/') ? 'Event details' : pathname.includes('/events') ? 'Review events' : 'Overview'
  const initials = (profile.name || 'Lineup').trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase()
  return <div className="workspace-shell" data-sidebar-collapsed={collapsed || undefined}>
    <a className="workspace-skip" href="#workspace-main">Skip to content</a>
    <aside className="workspace-sidebar" aria-label="Sidebar">
      <WorkspaceNavigation profile={profile} pathname={pathname} preview={preview} collapsed={collapsed} onToggle={() => setCollapsed(value => !value)} />
    </aside>
    <dialog ref={menu} className="workspace-mobile-menu" aria-label="Workspace menu" onClick={event => { if (event.target === event.currentTarget) closeMenu() }}><div className="workspace-mobile-menu-inner"><button className="workspace-icon-button mobile-close" aria-label="Close navigation" onClick={closeMenu}><Icon name="x" /></button><WorkspaceNavigation profile={profile} pathname={pathname} close={closeMenu} preview={preview} /></div></dialog>
    <div className="workspace-body"><header className="workspace-topbar"><div className="workspace-breadcrumb"><button className="workspace-icon-button mobile-menu-trigger" aria-label="Open navigation" onClick={() => menu.current?.showModal()}><Icon name="menu-2" /></button><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{title}</strong></div><div className="workspace-topbar-right"><span className="workspace-today"><Icon name="calendar" />{today}</span><span className="workspace-role">{profile.role === 'admin' ? 'Admin workspace' : 'Organiser workspace'}</span><span className="workspace-avatar small" title={profile.name}>{initials}</span></div></header>
      <main id="workspace-main" className={`workspace-main ${preview || pathname === base ? 'workspace-overview' : 'workspace-detail'}`}>{children}</main>
      <footer className="workspace-footer"><span>Lineup · a portfolio project</span></footer>
    </div>
  </div>
}
