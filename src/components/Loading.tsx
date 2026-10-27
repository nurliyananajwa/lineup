// Shown for a split second while a page checks who is logged in and loads its data.
export default function Loading({ label = 'Loading…' }: { label?: string }) {
  return <p className="animate-pulse py-12 text-center text-muted">{label}</p>
}
