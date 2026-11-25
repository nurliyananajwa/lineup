import type { CSSProperties } from 'react'
import Icon from './Icon'

export default function TicketInsights({ total, checkedIn }: { total: number; checkedIn: number }) {
  const percent = total ? Math.round((checkedIn / total) * 100) : 0
  return (
    <section className="dashboard-panel ticket-insights" aria-labelledby="ticket-insights-title">
      <div className="panel-heading">
        <h2 id="ticket-insights-title">Ticket &amp; attendance</h2>
        <Icon name="ticket" />
      </div>
      <div className="attendance-ring" style={{ '--attendance-sweep': `${percent}%` } as CSSProperties}>
        <div><strong>{total ? `${percent}%` : '—'}</strong><span>checked in</span></div>
      </div>
      <dl className="attendance-legend">
        <div><dt><span />Checked in</dt><dd>{checkedIn.toLocaleString('en-MY')}</dd></div>
        <div><dt><span />Awaiting check-in</dt><dd>{(total - checkedIn).toLocaleString('en-MY')}</dd></div>
      </dl>
    </section>
  )
}
