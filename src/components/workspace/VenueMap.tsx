'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { formatRange } from '@/lib/format'
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
  const dialog = useRef<HTMLDialogElement>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
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
          <div className="venue-event-list" role="group" aria-label="Upcoming events">
            {venues.map(venue => (
              <button type="button" key={venue.id} aria-pressed={venue.id === event.id} onClick={() => setSelected(venue.id)}>
                <span className="venue-event-photo">
                  {venue.poster ? <Image src={venue.poster} alt="" width={48} height={48} unoptimized /> : <Icon name="calendar-event" />}
                </span>
                <span className="venue-event-details">
                  <strong>{venue.name}</strong>
                  <span>{formatRange(venue.startsAt, venue.endsAt)}</span>
                  <span>{venue.venue}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="venue-map-preview">
            <div className="venue-map-location" aria-live="polite">
              <strong>{event.venue}</strong>
              <span>{event.address}</span>
              <a href={directions} target="_blank" rel="noreferrer" className="workspace-text-link">
                Get directions <Icon name="arrow-up-right" />
              </a>
            </div>
            {embed && (
              <>
                <button type="button" className="workspace-text-link map-open" aria-haspopup="dialog" onClick={() => {
                  dialog.current?.showModal()
                  setMapOpen(true)
                }}>
                  <Icon name="map-pin" />Open interactive map
                </button>
                <dialog ref={dialog} className="workspace-dialog venue-map-dialog" aria-labelledby="venue-map-dialog-title"
                  onClose={() => { setMapOpen(false); setMapLoaded(false) }}
                  onClick={click => { if (click.target === click.currentTarget) dialog.current?.close() }}>
                  <div className="workspace-dialog-content">
                    <div className="workspace-dialog-heading">
                      <h2 id="venue-map-dialog-title">{event.venue}</h2>
                      <button type="button" className="workspace-icon-button" aria-label="Close map" onClick={() => dialog.current?.close()}><Icon name="x" /></button>
                    </div>
                    <div className="venue-map-location">
                      <span>{event.address}</span>
                      <a href={directions} target="_blank" rel="noreferrer" className="workspace-text-link">
                        Get directions <Icon name="arrow-up-right" />
                      </a>
                    </div>
                    {!mapLoaded && <p className="map-help" role="status">Loading map preview…</p>}
                    {mapOpen && (
                      <iframe title={`Map of ${event.venue}`} src={embed} onLoad={() => setMapLoaded(true)}
                        referrerPolicy="strict-origin-when-cross-origin" />
                    )}
                    <p className="map-help">If the map is unavailable here, Get directions opens it in Google Maps.</p>
                  </div>
                </dialog>
              </>
            )}
          </div>
        </div>
      ) : <p className="venue-map-empty">No upcoming events have a venue address. Add one in the event details to show directions here.</p>}
    </section>
  )
}
