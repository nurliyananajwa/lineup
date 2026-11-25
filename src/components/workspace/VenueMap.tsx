'use client'

import { useState } from 'react'
import type { DashboardEvent } from '@/lib/dashboard-model'
import Icon from './Icon'

const samplePins: Record<string, [number, number]> = {
  'KLCC Park': [3.154, 101.714],
  'Perdana Botanical Garden': [3.1437, 101.6838],
}

function osmEmbed([latitude, longitude]: [number, number]) {
  const bounds = [longitude - 0.012, latitude - 0.008, longitude + 0.012, latitude + 0.008]
  const query = new URLSearchParams({ bbox: bounds.join(','), marker: [latitude, longitude].join(','), layer: 'mapnik' })
  return `https://www.openstreetmap.org/export/embed.html?${query}`
}

export default function VenueMap({ events, preview }: { events: DashboardEvent[]; preview: boolean }) {
  const [selected, setSelected] = useState<number>()
  const venues = events.filter(event => event.address.trim())
  const event = venues.find(event => event.id === selected) ?? venues[0]
  const address = event ? [event.venue, event.address].join(', ') : ''
  const pin = preview && event ? samplePins[event.venue] : undefined
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY
  const embed = pin ? osmEmbed(pin) : key && address
    ? `https://www.google.com/maps/embed/v1/place?${new URLSearchParams({ key, q: address })}`
    : null
  const directions = `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', destination: pin ? pin.join(',') : address })}`

  return (
    <section className="dashboard-panel venue-map" id="venue-map" aria-labelledby="venue-map-title">
      <div className="panel-heading">
        <h2 id="venue-map-title">Venue map</h2>
        <Icon name="map-pin" />
      </div>
      {event ? (
        <div className="venue-map-content">
          <label>
            Upcoming event
            <select value={event.id} onChange={change => setSelected(Number(change.target.value))}>
              {venues.map(venue => <option value={venue.id} key={venue.id}>{venue.name}</option>)}
            </select>
          </label>
          {embed && <iframe title={`Map of ${event.venue}`} src={embed} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />}
          <div className="venue-map-location">
            <strong>{event.venue}</strong>
            <span>{event.address}</span>
            <a href={directions} target="_blank" rel="noreferrer" className="workspace-text-link">
              Get directions <Icon name="arrow-up-right" />
            </a>
          </div>
        </div>
      ) : <p className="venue-map-empty">Add an address to an upcoming event’s venue to get directions.</p>}
    </section>
  )
}
