import Link from 'next/link'
import { getProfile } from '@/lib/auth'
import { logout } from '@/app/auth/actions'

// A Server Component: it runs on the server, so it can check who is logged in
// before the page is sent to the browser.
export default async function Nav() {
  const profile = await getProfile()

  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-indigo-700">Lineup</Link>
        <Link href="/" className="text-sm text-muted hover:text-zinc-900">Events</Link>
        {profile?.role === 'admin' && (
          <>
            <Link href="/admin" className="text-sm text-muted hover:text-zinc-900">Admin</Link>
            <Link href="/admin/events" className="text-sm text-muted hover:text-zinc-900">Review</Link>
            <Link href="/admin/venues" className="text-sm text-muted hover:text-zinc-900">Venues</Link>
          </>
        )}
        {profile?.role === 'organizer' && (
          <Link href="/organizer" className="text-sm text-muted hover:text-zinc-900">My events</Link>
        )}
        <div className="ml-auto flex items-center gap-3">
          {profile ? (
            <>
              <span className="hidden text-sm text-muted sm:inline">
                {profile.name || 'Account'} · {profile.role}
              </span>
              <form action={logout}>
                <button className="btn-secondary">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">Log in</Link>
              <Link href="/signup" className="btn-primary">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
