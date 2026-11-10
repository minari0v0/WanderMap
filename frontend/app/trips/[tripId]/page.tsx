import type { Metadata } from "next"
import { WanderMap } from "@/components/wander-map"

interface PageProps {
  params: Promise<{ tripId: string }>
}

function truncateText(text: string, maxLength = 26): string {
  const trimmed = (text || "").trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, maxLength)}...`
}

async function fetchTripMeta(tripId: string) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
  const isNumeric = /^\d+$/.test(tripId)
  const endpoint = isNumeric
    ? `${apiBase}/api/trips/${tripId}`
    : `${apiBase}/api/trips/invite/${encodeURIComponent(tripId)}`

  try {
    const res = await fetch(endpoint, { next: { revalidate: 30 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tripId } = await params
  const trip = await fetchTripMeta(tripId)

  const rawTitle = trip?.title || "함께 보는 여행 일정"
  const displayTitle = truncateText(rawTitle, 28)
  const destination = trip?.destination || "여행"
  const dateRange =
    trip?.startDate && trip?.endDate
      ? `${trip.startDate} ~ ${trip.endDate}`
      : "여행 동선 & 다이어리"

  return {
    title: `${displayTitle} | WanderMap`,
    description: `${destination} (${dateRange}) · WanderMap에서 여행 동선과 다이어리를 확인해 보세요.`,
    openGraph: {
      title: displayTitle,
      description: `${destination} · ${dateRange}`,
      siteName: "WanderMap",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: displayTitle,
      description: `${destination} · ${dateRange}`,
    },
  }
}

export default async function TripPage({ params }: PageProps) {
  const { tripId } = await params
  return <WanderMap tripId={tripId} />
}
