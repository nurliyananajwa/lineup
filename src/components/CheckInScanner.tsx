'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type QrScannerType from 'qr-scanner'
import type { CheckInResult } from '@/app/check-in/[id]/actions'

type Props = { checkIn: (scanned: string) => Promise<CheckInResult> }

const STYLES = {
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  already: 'border-amber-300 bg-amber-50 text-amber-900',
  bad: 'border-rose-300 bg-rose-50 text-rose-900',
}

export default function CheckInScanner({ checkIn }: Props) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerRef = useRef<QrScannerType | null>(null)
  const lastScan = useRef({ value: '', at: 0 })
  const busy = useRef(false)
  const mounted = useRef(true)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [pending, startTransition] = useTransition()

  const handle = useCallback(
    (value: string) => {
      if (busy.current) return
      // The camera reads the same code many times a second; ignore repeats for 3 seconds.
      const now = Date.now()
      if (value === lastScan.current.value && now - lastScan.current.at < 3000) return
      lastScan.current = { value, at: now }
      busy.current = true
      startTransition(async () => {
        try {
          const r = await checkIn(value)
          if (!mounted.current) return
          setResult(r)
          if (r.status === 'error') lastScan.current = { value: '', at: 0 }
          if (r.status === 'ok') {
            navigator.vibrate?.(120)
            router.refresh()
          }
        } catch {
          lastScan.current = { value: '', at: 0 }
          if (mounted.current) setResult({ status: 'error', message: 'Could not reach the server. Please try again.' })
        } finally {
          busy.current = false
        }
      })
    },
    [checkIn, router],
  )

  async function startCamera() {
    if (cameraStarting || cameraOn) return
    setCameraStarting(true)
    setCameraError(null)
    try {
      // Loaded only when needed, so the page stays light for people who don't scan.
      const QrScanner = (await import('qr-scanner')).default
      if (!mounted.current) return
      if (!(await QrScanner.hasCamera())) {
        setCameraError('No camera found on this device. Use the manual check-in below.')
        return
      }
      if (!mounted.current || !videoRef.current) return
      scannerRef.current?.destroy()
      const scanner = new QrScanner(videoRef.current, (r) => handle(r.data), {
        preferredCamera: 'environment',
        highlightScanRegion: true,
        maxScansPerSecond: 5,
      })
      scannerRef.current = scanner
      await scanner.start()
      if (mounted.current) setCameraOn(true)
      else scanner.destroy()
    } catch {
      scannerRef.current?.destroy()
      scannerRef.current = null
      if (mounted.current) setCameraError('Couldn’t open the camera. Allow camera access in your browser, then try again.')
    } finally {
      if (mounted.current) setCameraStarting(false)
    }
  }

  function stopCamera() {
    scannerRef.current?.destroy()
    scannerRef.current = null
    setCameraOn(false)
  }

  // Turn the camera off when leaving the page.
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      scannerRef.current?.destroy()
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !busy.current) router.refresh()
    }, 10000)
    return () => clearInterval(timer)
  }, [router])

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Scan tickets</h2>
        {cameraOn ? (
          <button type="button" className="btn-secondary" onClick={stopCamera}>Stop camera</button>
        ) : (
          <button type="button" className="btn-primary" onClick={startCamera} disabled={cameraStarting}>
            {cameraStarting ? 'Starting camera…' : 'Start camera'}
          </button>
        )}
      </div>

      <div className={cameraOn ? 'overflow-hidden rounded-lg bg-black' : 'hidden'}>
        <video ref={videoRef} className="mx-auto max-h-80 w-full object-contain" muted playsInline />
      </div>
      {cameraError && <p className="alert-error">{cameraError}</p>}

      <div aria-live="polite">
        {pending && <p className="text-sm text-muted">Checking…</p>}
        {!pending && result && <ResultBanner result={result} />}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const input = e.currentTarget.elements.namedItem('code') as HTMLInputElement
          if (input.value.trim()) handle(input.value.trim())
          input.value = ''
        }}
      >
        <input
          name="code"
          aria-label="Ticket code or link"
          placeholder="Or paste a ticket code or link"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          autoComplete="off"
        />
        <button disabled={pending} className="btn-secondary">Check in</button>
      </form>
    </section>
  )
}

function ResultBanner({ result }: { result: CheckInResult }) {
  if (result.status === 'ok') {
    return <p className={`rounded-lg border px-4 py-3 text-lg font-semibold ${STYLES.ok}`}>✓ {result.name} checked in</p>
  }
  if (result.status === 'already') {
    const time = result.at
      ? new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', minute: '2-digit' }).format(new Date(result.at))
      : null
    return (
      <p className={`rounded-lg border px-4 py-3 font-semibold ${STYLES.already}`}>
        {result.name} is already checked in{time ? ` (at ${time})` : ''}
      </p>
    )
  }
  return <p className={`rounded-lg border px-4 py-3 font-semibold ${STYLES.bad}`}>✕ {result.message}</p>
}
