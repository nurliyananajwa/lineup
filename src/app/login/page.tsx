import { Suspense } from 'react'
import Loading from '@/components/Loading'
import AuthForm from '@/components/AuthForm'

export const metadata = { title: 'Log in · Lineup' }

async function LoginPageContent({ searchParams }: PageProps<'/login'>) {
  const { next, error } = await searchParams
  return (
    <>
      {error === 'confirm' && (
        <p className="alert-error mx-auto mt-8 max-w-sm">That confirmation link is invalid or has expired.</p>
      )}
      <AuthForm mode="login" next={typeof next === 'string' ? next : undefined} />
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
