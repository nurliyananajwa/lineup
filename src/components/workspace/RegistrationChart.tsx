type Point = { date: string; count: number }

export default function RegistrationChart({ points, total }: { points: Point[]; total: number }) {
  const maximum = Math.max(1, ...points.map(point => point.count))
  const coordinates = points.map((point, index) => ({
    x: 10 + (index / (points.length - 1)) * 380,
    y: 130 - (point.count / maximum) * 115,
  }))
  const barWidth = Math.min(24, 290 / points.length)
  const label = new Intl.DateTimeFormat('en-MY', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <div className="registration-area">
      <div className="registration-scale" aria-hidden="true"><span>{maximum}</span><span>0</span></div>
      <div>
        <svg viewBox="0 0 400 145" preserveAspectRatio="none" role="img"
          aria-label={`${total} registrations over the last ${points.length} days. Open View chart data for daily counts.`}>
          {[15, 53, 92, 130].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} className="area-grid" />)}
          {points.map((point, index) => (
            <rect key={point.date} x={coordinates[index].x - barWidth / 2} y={coordinates[index].y}
              width={barWidth} height={130 - coordinates[index].y} rx="4"
              className={index === points.length - 1 ? 'registration-bar is-latest' : 'registration-bar'}>
              <title>{`${label.format(new Date(point.date))}: ${point.count} registrations`}</title>
            </rect>
          ))}
        </svg>
        <div className="registration-axis" aria-hidden="true">
          {[points[0], points[Math.floor(points.length / 2)], points[points.length - 1]].map(point => (
            <span key={point.date}>{label.format(new Date(point.date))}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
