type Point = { date: string; count: number }

export default function RegistrationChart({ points, total }: { points: Point[]; total: number }) {
  const maximum = Math.max(1, ...points.map(point => point.count))
  const coordinates = points.map((point, index) => ({
    x: 10 + (index / (points.length - 1)) * 380,
    y: 130 - (point.count / maximum) * 115,
  }))
  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(' ')
  const label = new Intl.DateTimeFormat('en-MY', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <div className="registration-area">
      <div className="registration-scale" aria-hidden="true"><span>{maximum}</span><span>0</span></div>
      <div>
        <svg viewBox="0 0 400 145" preserveAspectRatio="none" role="img"
          aria-label={`${total} registrations over the last ${points.length} days. Open View chart data for daily counts.`}>
          {[15, 53, 92, 130].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} className="area-grid" />)}
          <polygon className="area-fill" points={`10,130 ${line} 390,130`} />
          <polyline className="area-line" points={line} />
          {points.map((point, index) => (
            <circle key={point.date} cx={coordinates[index].x} cy={coordinates[index].y} r={points.length === 7 ? 4 : 2.5}>
              <title>{label.format(new Date(point.date))}: {point.count} registrations</title>
            </circle>
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
