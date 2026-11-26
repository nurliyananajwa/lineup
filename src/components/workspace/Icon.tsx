import type { CSSProperties } from 'react'
export type IconName = 'layout-dashboard' | 'calendar-event' | 'calendar' | 'users' | 'ticket' | 'circle-check' | 'clock' | 'map-pin' | 'arrow-up-right' | 'arrow-right' | 'chevron-left' | 'chevron-right' | 'search' | 'plus' | 'logout' | 'menu-2' | 'x' | 'external-link' | 'clipboard-check' | 'chart-bar' | 'building' | 'file-pencil'
// Original MIT-licensed Tabler assets, served locally without a runtime package.
export default function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <span aria-hidden="true" className={`workspace-icon ${className}`} style={{ '--icon-url': `url("/icons/tabler/${name}.svg")` } as CSSProperties} />
}
