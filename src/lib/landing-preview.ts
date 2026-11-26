import { formatRange } from './format'
import type { LandingEvent } from './landing-event'

const photos = {
  music: 'photo-1506157786151-b8491531f063',
  jazz: 'photo-1493225457124-a3eb161ffa5f',
  cinema: 'photo-1485846234645-a62644f84728',
  art: 'photo-1513364776144-60967b0f800f',
  running: 'photo-1552674605-db6ffd4facb5',
  coffee: 'photo-1554118811-1e0d58224f24',
  nature: 'photo-1472396961693-142e6e269027',
  meetup: 'photo-1529156069898-49953e39b3ac',
  talk: 'photo-1511578314322-379afb476865',
  market: 'photo-1511795409834-ef04bbd61622',
}

const events: [string, string, string, keyof typeof photos, string][] = [
  ['Open-Air Cinema', 'Film', 'KLCC Park', 'cinema', 'Bring a picnic blanket and settle in for a film under the night sky.'],
  ['After Hours Jazz', 'Music', 'REXKL', 'jazz', 'Spend an evening listening to a live quartet and a closing jam session.'],
  ['The Makers’ Meet', 'Market', 'Sentul Depot', 'market', 'Meet independent makers and browse small-batch prints, ceramics, and textiles.'],
  ['Sunrise City Run', 'Sports', 'Perdana Botanical Garden', 'running', 'Join a relaxed group run along the garden paths with a choice of two distances.'],
  ['KL Coffee Sessions', 'Food & drink', 'APW Bangsar', 'coffee', 'Taste coffees from local roasters and watch a live brewing demonstration.'],
  ['Night Shift Live', 'Music', 'Taman Tun Dr Ismail', 'music', 'Catch an outdoor lineup of local bands from the first set to the encore.'],
  ['Print & Paper Lab', 'Workshop', 'GMBB', 'art', 'Try a simple printmaking technique and take home a small edition of your own.'],
  ['City Stories Live', 'Talk', 'Ilham Gallery', 'talk', 'Hear writers share short stories about the streets and neighbourhoods they know best.'],
  ['Morning in the Gardens', 'Outdoors', 'Perdana Botanical Garden', 'nature', 'Take a guided walk through the gardens and learn what grows along the trails.'],
  ['Indie Film Sunday', 'Film', 'REXKL', 'cinema', 'Watch a programme of independent short films followed by a discussion.'],
  ['Community Table', 'Meetup', 'Kampung Attap', 'meetup', 'Meet neighbours over shared plates and an easygoing round of conversation.'],
  ['Colour and Light', 'Art', 'National Art Gallery', 'art', 'Explore an exhibition about the way artists use colour to change how a space feels.'],
  ['Bangsar Vinyl Night', 'Music', 'Bangsar', 'jazz', 'Hear selectors play records from their collections and bring a favourite to share.'],
  ['Weekend Zine Fair', 'Market', 'GMBB', 'market', 'Pick up independently published zines and meet the people behind them.'],
  ['First Steps in Design', 'Talk', 'Common Ground Bukit Bintang', 'talk', 'Listen to working designers share the projects and decisions that shaped their careers.'],
  ['Brew Better at Home', 'Workshop', 'APW Bangsar', 'coffee', 'Learn how to dial in a simple pour-over using equipment you can find at home.'],
  ['Lake Loop Club', 'Sports', 'Titiwangsa Lake Gardens', 'running', 'Meet at the lake for a social run and cool down together afterwards.'],
  ['Notes from the City', 'Music', 'Sentul Depot', 'music', 'Discover rising acts performing original songs on an open-air stage.'],
  ['Sketch the Skyline', 'Workshop', 'Dataran Merdeka', 'art', 'Bring a sketchbook for a guided drawing session among the city’s older buildings.'],
  ['The Sunday Social', 'Meetup', 'TTDI', 'meetup', 'Drop in to meet other people who are new to the area or looking for things to do.'],
  ['Hill Trails Meetup', 'Outdoors', 'Bukit Kiara', 'nature', 'Follow a short guided trail and stop for photographs along the way.'],
  ['Film After Dark', 'Film', 'Kampung Attap', 'cinema', 'See a late screening and discuss the film with other attendees afterwards.'],
  ['Small Studios, Big Ideas', 'Talk', 'Ilham Gallery', 'talk', 'Meet local creative teams and hear how they bring a small independent project to life.'],
  ['Neighbourhood Market', 'Market', 'Publika', 'market', 'Browse handmade goods, meet the stallholders, and stop by the food stalls.'],
]

export function sampleLandingEvents(now = new Date()): LandingEvent[] {
  return events.map(([name, category, venue, photo, description], index) => {
    const start = new Date(now)
    start.setUTCDate(start.getUTCDate() + 2 + index * 2)
    start.setUTCHours(['Outdoors', 'Sports', 'Food & drink', 'Market'].includes(category) ? 1 : 11, 0, 0, 0)
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    return {
      id: `sample-${index + 1}`, name, category, venue, description,
      poster: `https://images.unsplash.com/${photos[photo]}?auto=format&fit=crop&w=1280&q=80`,
      time: formatRange(start.toISOString(), end.toISOString()),
    }
  })
}
