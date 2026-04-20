import { ROUTES } from '@/constants/routes'
import { createDefaultMetadata } from '@/utils/metadata'

// ── API constants ──────────────────────────────────────────────────────────
const BI_GRAPHQL_API_URL = 'https://hasura.bi.status.im/v1/graphql'
const LOGOS_GRAPHQL_API_URL = 'https://api.logos.co/v1/graphql'
const CIRCLES_GRAPHQL_RESPONSE_KEY = 'stg_external_circle_circle_event_aggregate'
const REVALIDATE_INTERVAL = 86_400

// ── Types ──────────────────────────────────────────────────────────────────
interface CircleEvent {
  event_id: string
  event_name: string
  event_url: string
  geo_latitude: string | null
  geo_longitude: string | null
  location_city: string
  location_country: string
  start_at: string
}

async function gql<T>(url: string, query: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      next: { revalidate: REVALIDATE_INTERVAL },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? null
  } catch {
    return null
  }
}

// ── Fetchers ───────────────────────────────────────────────────────────────
async function fetchCircleCount(): Promise<number | null> {
  const query = `query CountDistinctCities {
  ${CIRCLES_GRAPHQL_RESPONSE_KEY} {
    aggregate {
      count(distinct: true, columns: location_city)
    }
  }
}`
  const data = await gql<Record<string, { aggregate: { count: number } }>>(
    BI_GRAPHQL_API_URL,
    query
  )
  return data?.[CIRCLES_GRAPHQL_RESPONSE_KEY]?.aggregate?.count ?? null
}

async function fetchCircleEvents(): Promise<CircleEvent[]> {
  const query = `query CircleEvents {
  stg_external_circle_circle_event {
    event_id
    event_name
    event_url
    geo_latitude
    geo_longitude
    location_city
    location_country
    start_at
  }
}`
  const data = await gql<{ stg_external_circle_circle_event: CircleEvent[] }>(
    LOGOS_GRAPHQL_API_URL,
    query
  )
  const events = data?.stg_external_circle_circle_event ?? []
  return events.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
}

// ── Metadata ───────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return createDefaultMetadata({
    title: 'Circles Dashboard',
    description: 'Circles & Contributions',
    locale,
    path: ROUTES.home,
  })
}

// ── Page ───────────────────────────────────────────────────────────────────
export default async function Page() {
  const [circleCount, events] = await Promise.all([fetchCircleCount(), fetchCircleEvents()])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const distinctCountries = new Set(
    events.map((event) => event.location_country).filter((country) => country?.trim())
  ).size

  const upcomingEvents = events.filter((event) => {
    if (!event.start_at) return false
    const eventDate = new Date(event.start_at)
    eventDate.setHours(0, 0, 0, 0)
    return eventDate >= today
  }).length

  const stats = [
    { label: 'Total Circle Events', value: events.length },
    { label: 'Distinct Cities', value: circleCount ?? undefined },
    { label: 'Distinct Countries', value: distinctCountries },
    { label: 'Upcoming Events', value: upcomingEvents },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 text-black">
      {/* Stats */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-black">Overview</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map(({ label, value }) => (
            <div key={label} className="border border-black bg-white p-5 text-center">
              <p className="text-3xl font-medium text-black">
                {value !== undefined ? value.toLocaleString() : '—'}
              </p>
              <p className="mt-1 text-xs text-black">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Events Table */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-black">
          Circle Events{' '}
          <span className="text-sm font-normal text-black">({events.length} total)</span>
        </h2>
        {events.length === 0 ? (
          <p className="text-black">No events found.</p>
        ) : (
          <div className="overflow-x-auto border border-black">
            <table className="min-w-full divide-y divide-black text-sm">
              <thead className="bg-white">
                <tr>
                  {['Event', 'City', 'Country', 'Date', 'Coords'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-black uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black bg-white">
                {events.map((ev) => (
                  <tr key={ev.event_id} className="transition-colors hover:bg-gray-50">
                    <td className="max-w-xs px-4 py-3 font-medium text-black">
                      {ev.event_url ? (
                        <a
                          href={ev.event_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-black hover:underline"
                        >
                          {ev.event_name || '—'}
                        </a>
                      ) : (
                        ev.event_name || '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-black">{ev.location_city || '—'}</td>
                    <td className="px-4 py-3 text-black">{ev.location_country || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-black">
                      {ev.start_at
                        ? new Date(ev.start_at).toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-black">
                      {ev.geo_latitude && ev.geo_longitude
                        ? `${Number(ev.geo_latitude).toFixed(3)}, ${Number(ev.geo_longitude).toFixed(3)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
