'use client'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg space-y-4" role="alert">
      <h1 className="text-xl font-semibold">We couldn&apos;t load this page</h1>
      <p className="text-muted">Please try again. If the problem continues, come back shortly.</p>
      <button type="button" className="btn-primary" onClick={reset}>Try again</button>
    </div>
  )
}
