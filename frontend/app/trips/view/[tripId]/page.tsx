import { WanderMap } from "@/components/wander-map"

interface PageProps {
  params: Promise<{ tripId: string }>
}

export default async function ViewOnlyTripPage({ params }: PageProps) {
  const { tripId } = await params
  return <WanderMap tripId={tripId} readOnly={true} />
}
