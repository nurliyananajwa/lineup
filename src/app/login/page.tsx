import { Suspense } from 'react'
import Loading from '@/components/Loading'
import AuthForm from '@/components/AuthForm'
import Link from 'next/link'

export const metadata = { title: 'Log in · Lineup' }

async function LoginPageContent({ searchParams }: PageProps<'/login'>) {
  const { next, error } = await searchParams
  return (
    <>
      {error === 'confirm' && (
        <p className="alert-error mx-auto mt-8 max-w-sm">That confirmation link is invalid or has expired.</p>
      )}
      <AuthForm mode="login" next={typeof next === 'string' ? next : undefined} />
      {process.env.NODE_ENV === 'development' && <div className="mx-auto mt-6 max-w-sm rounded-xl border border-violet-100 bg-violet-50 p-4 text-center text-sm"><p className="mb-2 text-violet-900">Building the dashboard? Explore it with sample data.</p><Link href="/dev-preview" className="link">Preview without an account →</Link></div>}
    </>
  )
}

// Reading the login cookie or the URL happens at request time, so it sits inside <Suspense>.
export default function LoginPage(props: PageProps<'/login'>) {
  return (
    <Suspense fallback={<Loading />}>
      <LoginPageContent {...props} />
    </Suspense>
  )
}
