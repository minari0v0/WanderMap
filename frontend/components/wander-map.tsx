"use client"

import { useState, useEffect } from "react"
import { INITIAL_PLACES, type Place } from "@/lib/trip-data"
import { ItineraryPanel } from "@/components/itinerary-panel"
import { MapView } from "@/components/map-view"
import { TopNav } from "@/components/top-nav"
import { tripService, type TripResponse } from "@/lib/trip-service"

interface WanderMapProps {
  tripId: string
}

export function WanderMap({ tripId }: WanderMapProps) {
  const [trip, setTrip] = useState<TripResponse | null>(null)
  const [places, setPlaces] = useState<Place[]>(INITIAL_PLACES)
  const [activeId, setActiveId] = useState<string | null>("p2")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTrip() {
      try {
        const id = Number(tripId)
        if (isNaN(id)) {
          throw new Error("올바르지 않은 여행 방 ID입니다.")
        }
        const data = await tripService.getTrip(id)
        setTrip(data)
      } catch (err: any) {
        setError(err.message || "여행 정보를 불러오는 데 실패했습니다.")
      } finally {
        setLoading(false)
      }
    }
    loadTrip()
  }, [tripId])

  function handleVote(id: string, dir: "up" | "down") {
    setPlaces((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              votesUp: dir === "up" ? p.votesUp + 1 : p.votesUp,
              votesDown: dir === "down" ? p.votesDown + 1 : p.votesDown,
            }
          : p,
      ),
    )
    setActiveId(id)
  }

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-slate-500">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent mx-auto"></div>
          <p className="text-sm font-medium">여행 방 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-red-500 p-4">
        <div className="text-center max-w-sm space-y-4">
          <h2 className="text-xl font-bold">오류 발생</h2>
          <p className="text-sm">{error || "여행 방을 찾을 수 없습니다."}</p>
          <button 
            onClick={() => window.location.href = "/"}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <TopNav 
        tripTitle={trip.title} 
        inviteCode={trip.inviteCode} 
        members={[{ initial: trip.createdByName.charAt(0), tone: "bg-teal-100 text-teal-800" }]}
      />
      <main className="grid flex-1 gap-3 overflow-hidden p-3 lg:grid-cols-[1fr_380px]">
        <MapView places={places} activeId={activeId} onSelect={setActiveId} />
        <ItineraryPanel
          places={places}
          activeId={activeId}
          onSelect={setActiveId}
          onVote={handleVote}
        />
      </main>
    </div>
  )
}
