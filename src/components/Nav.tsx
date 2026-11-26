import Link from 'next/link'
import { getProfile } from '@/lib/auth'
import { logout } from '@/app/auth/actions'
import styles from './Nav.module.css'

// A Server Component: it runs on the server, so it can check who is logged in
// before the page is sent to the browser.
export default async function Nav() {
  const profile = await getProfile()

  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/" className={styles.brand}>Lineup</Link>
        <Link href="/#events" className={styles.link}>Events</Link>
        {profile?.role === 'admin' && (
          <>
            <Link href="/admin" className={styles.link}>Admin</Link>
            <Link href="/admin/events" className={styles.link}>Review</Link>
            <Link href="/admin/venues" className={styles.link}>Venues</Link>
          </>
        )}
        {profile?.role === 'organizer' && (
          <Link href="/organizer" className={styles.link}>My events</Link>
        )}
        <div className="ml-auto flex items-center gap-3">
          {profile ? (
            <>
              <span className={`hidden sm:inline ${styles.account}`}>
                {profile.name || 'Account'} · {profile.role}
              </span>
              <form action={logout}>
                <button className={`${styles.action} ${styles.secondary}`}>Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className={`${styles.action} ${styles.secondary}`}>Log in</Link>
              <Link href="/signup" className={`${styles.action} ${styles.primary}`}>Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
