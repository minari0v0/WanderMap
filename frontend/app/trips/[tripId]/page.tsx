import { WanderMap } from "@/components/wander-map"

interface PageProps {
  params: Promise<{ tripId: string }>
}

export default async function TripPage({ params }: PageProps) {
  const { tripId } = await params
  return <WanderMap tripId={tripId} />
}
