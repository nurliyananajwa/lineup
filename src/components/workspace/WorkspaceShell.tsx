'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { logout } from '@/app/auth/actions'
import Icon, { type IconName } from './Icon'
type Profile = { name: string; role: 'admin' | 'organizer' }
function workspaceHome(profile: Profile, preview?: boolean) {
  return preview ? `/dev-preview?role=${profile.role}` : profile.role === 'admin' ? '/admin' : '/organizer'
}

function initialsFor(profile: Profile) {
  return (profile.name.trim() || 'Lineup').split(/\s+/).slice(0, 2).map(name => name[0]).join('').toUpperCase()
}

function workspaceLinks(profile: Profile, pathname: string, preview?: boolean) {
  const base = workspaceHome(profile, preview)
  const links: { label: string; href: string; icon: IconName; active?: boolean }[] = [
    { label: 'Overview', href: base, icon: 'layout-dashboard', active: preview || pathname === base },
    profile.role === 'admin' ? { label: 'Review events', href: '/admin/events', icon: 'clipboard-check', active: pathname.startsWith('/admin/events') } : { label: 'My events', href: `${base}#events`, icon: 'ticket', active: pathname.includes('/organizer/events/') },
    { label: 'Venue map', href: `${base}#venue-map`, icon: 'map-pin' },
    { label: 'Calendar', href: `${base}#calendar`, icon: 'calendar' },
    { label: 'Registrations', href: `${base}#registrations`, icon: 'users' },
    ...(profile.role === 'admin' ? [{ label: 'Venues', href: '/admin/venues', icon: 'building' as const, active: pathname.startsWith('/admin/venues') }] : []),
  ]
  return links
}

function WorkspaceExit({ preview }: { preview?: boolean }) {
  const label = preview ? 'Exit preview' : 'Log out'
  const content = <><Icon name="logout" /><span className="workspace-nav-label">{label}</span></>
  return preview ? (
    <Link href="/" className="workspace-logout" aria-label={label} title={label}>{content}</Link>
  ) : (
    <form action={logout}><button className="workspace-logout" aria-label={label} title={label}>{content}</button></form>
  )
}

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
  const base = workspaceHome(profile, preview)
  const links = workspaceLinks(profile, pathname, preview)
  const initials = initialsFor(profile)

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
      <WorkspaceExit preview={preview} />
    </div>
  </>
}
function showWorkspaceSearch(dialog: HTMLDialogElement | null) {
  if (dialog && !dialog.open) {
    dialog.showModal()
    dialog.querySelector('input')?.focus()
  }
}

function WorkspaceToolbar({ profile, pathname, today, preview, openNavigation }: {
  profile: Profile
  pathname: string
  today: string
  preview?: boolean
  openNavigation: () => void
}) {
  const router = useRouter()
  const search = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const destinations = workspaceLinks(profile, pathname, preview)
  if (profile.role === 'organizer') destinations.push({ label: 'Create event', href: '/organizer/events/new', icon: 'plus' })
  destinations.push({ label: 'Public events', href: '/', icon: 'external-link' })
  const matches = destinations.filter(destination => destination.label.toLowerCase().includes(query.trim().toLowerCase()))

  useEffect(() => {
    function openSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        showWorkspaceSearch(search.current)
      }
    }
    window.addEventListener('keydown', openSearch)
    return () => window.removeEventListener('keydown', openSearch)
  }, [])

  return (
    <header className="workspace-topbar">
      <div className="workspace-toolbar-start">
        <button type="button" className="workspace-icon-button mobile-menu-trigger" aria-label="Open navigation" onClick={openNavigation}><Icon name="menu-2" /></button>
        <button type="button" className="workspace-search-trigger" aria-haspopup="dialog" onClick={() => showWorkspaceSearch(search.current)}>
          <Icon name="search" /><span>Search workspace</span><kbd aria-hidden="true">Ctrl / ⌘ K</kbd>
        </button>
      </div>
      <div className="workspace-toolbar-actions">
        <Link className="workspace-toolbar-link" href={`${workspaceHome(profile, preview)}#calendar`} aria-label="Event calendar" title={`Event calendar · ${today}`}>
          <Icon name="calendar" />
        </Link>
        <Link className="workspace-toolbar-link" href="/" aria-label="Public event listings" title="Public event listings"><Icon name="external-link" /></Link>
        <details className="workspace-toolbar-account"
          onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false }}
          onKeyDown={event => {
            if (event.key === 'Escape' && event.currentTarget.open) {
              event.currentTarget.open = false
              event.currentTarget.querySelector('summary')?.focus()
            }
          }}>
          <summary aria-label="Account menu">
            <span className="workspace-avatar toolbar-avatar" aria-hidden="true">{initialsFor(profile)}</span>
            <span className="workspace-toolbar-identity"><strong>{profile.name || 'Your account'}</strong><span>{profile.role === 'admin' ? 'Administrator' : 'Event organiser'}</span></span>
            <Icon name="chevron-right" className="workspace-account-chevron" />
          </summary>
          <div className="workspace-toolbar-account-panel"><WorkspaceExit preview={preview} /></div>
        </details>
      </div>
      <dialog ref={search} className="workspace-search-dialog" aria-labelledby="workspace-search-title"
        onClose={() => setQuery('')} onClick={event => { if (event.target === event.currentTarget) search.current?.close() }}>
        <div className="workspace-search-content">
          <div className="workspace-search-heading">
            <h2 id="workspace-search-title">Search workspace</h2>
            <button type="button" className="workspace-icon-button" aria-label="Close search" onClick={() => search.current?.close()}><Icon name="x" /></button>
          </div>
          <form onSubmit={event => {
            event.preventDefault()
            if (matches[0]) {
              search.current?.close()
              router.push(matches[0].href)
            }
          }}>
            <input type="search" aria-label="Find a workspace page" placeholder="Find a page…" value={query} onChange={event => setQuery(event.target.value)} />
          </form>
          {matches.length > 0 ? (
            <ul className="workspace-search-results">
              {matches.map(destination => (
                <li key={destination.href}>
                  <Link href={destination.href} onClick={() => search.current?.close()}><Icon name={destination.icon} />{destination.label}</Link>
                </li>
              ))}
            </ul>
          ) : <p className="workspace-search-empty" role="status">No matching pages</p>}
        </div>
      </dialog>
    </header>
  )
}

export default function WorkspaceShell({ children, profile, today, preview = false }: { children: ReactNode; profile: Profile; today: string; preview?: boolean }) {
  const pathname = usePathname()
  const menu = useRef<HTMLDialogElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const closeMenu = () => menu.current?.close()
  const base = profile.role === 'admin' ? '/admin' : '/organizer'
  return <div className="workspace-shell" data-sidebar-collapsed={collapsed || undefined}>
    <a className="workspace-skip" href="#workspace-main">Skip to content</a>
    <aside className="workspace-sidebar" aria-label="Sidebar">
      <WorkspaceNavigation profile={profile} pathname={pathname} preview={preview} collapsed={collapsed} onToggle={() => setCollapsed(value => !value)} />
    </aside>
    <dialog ref={menu} className="workspace-mobile-menu" aria-label="Workspace menu" onClick={event => { if (event.target === event.currentTarget) closeMenu() }}><div className="workspace-mobile-menu-inner"><button className="workspace-icon-button mobile-close" aria-label="Close navigation" onClick={closeMenu}><Icon name="x" /></button><WorkspaceNavigation profile={profile} pathname={pathname} close={closeMenu} preview={preview} /></div></dialog>
    <div className="workspace-body">
      <WorkspaceToolbar profile={profile} pathname={pathname} today={today} preview={preview} openNavigation={() => menu.current?.showModal()} />
      <main id="workspace-main" className={`workspace-main ${preview || pathname === base ? 'workspace-overview' : 'workspace-detail'}`}>{children}</main>
      <footer className="workspace-footer"><span>Lineup · a portfolio project</span></footer>
    </div>
  </div>
}
