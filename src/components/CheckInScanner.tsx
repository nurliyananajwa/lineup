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
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [pending, startTransition] = useTransition()

  const handle = useCallback(
    (value: string) => {
      // The camera reads the same code many times a second; ignore repeats for 3 seconds.
      const now = Date.now()
      if (value === lastScan.current.value && now - lastScan.current.at < 3000) return
      lastScan.current = { value, at: now }
      startTransition(async () => {
        const r = await checkIn(value)
        setResult(r)
        if (r.status === 'ok') {
          navigator.vibrate?.(120)
          router.refresh() // update the attendee list below
        }
      })
    },
    [checkIn, router],
  )

  async function startCamera() {
    setCameraError(null)
    try {
      // Loaded only when needed, so the page stays light for people who don't scan.
      const QrScanner = (await import('qr-scanner')).default
      if (!(await QrScanner.hasCamera())) {
        setCameraError('No camera found on this device. Use the manual check-in below.')
        return
      }
      const scanner = new QrScanner(videoRef.current!, (r) => handle(r.data), {
        preferredCamera: 'environment',
        highlightScanRegion: true,
        maxScansPerSecond: 5,
      })
      scannerRef.current = scanner
      await scanner.start()
      setCameraOn(true)
    } catch {
      setCameraError('Couldn’t open the camera. Allow camera access in your browser, then try again.')
    }
  }

  function stopCamera() {
    scannerRef.current?.stop()
    setCameraOn(false)
  }

  // Turn the camera off when leaving the page.
  useEffect(() => () => scannerRef.current?.destroy(), [])

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Scan tickets</h2>
        {cameraOn ? (
          <button type="button" className="btn-secondary" onClick={stopCamera}>Stop camera</button>
        ) : (
          <button type="button" className="btn-primary" onClick={startCamera}>Start camera</button>
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
          placeholder="Or paste a ticket code or link"
          className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          autoComplete="off"
        />
        <button className="btn-secondary">Check in</button>
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
