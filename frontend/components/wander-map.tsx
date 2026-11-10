"use client"

import React, { useState, useEffect, useMemo } from "react"
import { INITIAL_PLACES } from "@/lib/trip-data"
import { MapView } from "@/components/map-view"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { MembersBox } from "@/components/trip-detail/members-box"
import {
  ItineraryTimeline,
  type EnrichedPlace,
} from "@/components/trip-detail/itinerary-timeline"
import {
  tripService,
  type TripResponse,
  type TripItineraryResponse,
  type UpdatePlaceDiaryPayload,
} from "@/lib/trip-service"
import { authService, type UserResponse } from "@/lib/auth-service"
import { showToast } from "@/components/ui/system-alert"
import { useRouter } from "next/navigation"
import {
  Compass,
  MapPin,
  Calendar,
  FileText,
  AlertCircle,
} from "lucide-react"

interface WanderMapProps {
  tripId: string
  readOnly?: boolean
}

function formatCleanTripTitle(title: string, destination: string): string {
  if (!title) return `${destination} 여행`
  const trimmed = title.trim()
  const dupPrefix = `${destination} ${destination}`
  if (trimmed.startsWith(dupPrefix)) {
    return trimmed.slice(destination.length).trim()
  }
  return trimmed
}

function formatHeaderPeriod(start?: string, end?: string): {
  rangeText: string
  nightsText: string | null
} {
  if (!start || !end) {
    return { rangeText: "일정 미정", nightsText: null }
  }
  const s = new Date(start)
  const e = new Date(end)
  const dotStart = start.replace(/-/g, ".")
  const dotEnd = end.split("-").slice(1).join(".")
  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    return { rangeText: `${start} ~ ${end}`, nightsText: null }
  }
  const diff = Math.round(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  const nightsText = diff === 0 ? "당일치기" : `${diff}박 ${diff + 1}일`
  return {
    rangeText: `${dotStart} – ${dotEnd}`,
    nightsText,
  }
}

function sortPlacesByTimeAscending(list: EnrichedPlace[]): EnrichedPlace[] {
  return [...list]
    .sort((a, b) => (a.time || "23:59").localeCompare(b.time || "23:59"))
    .map((item, idx) => ({
      ...item,
      order: idx + 1,
    }))
}

function mapItineraryToEnrichedPlaces(
  itinerary: TripItineraryResponse | null,
  activeDay: number
): EnrichedPlace[] {
  if (!itinerary) return []
  const targetDay =
    itinerary.days.find((d) => d.dayNumber === activeDay) || itinerary.days[0]
  if (!targetDay) return []

  const mapped: EnrichedPlace[] = targetDay.places.map((p, idx) => ({
    id: String(p.id),
    numericId: p.id,
    dayNumber: p.dayNumber,
    order: p.visitOrder || idx + 1,
    name: p.name,
    category: p.category || "관광 · 명소",
    address: p.address || "",
    status: p.status === "CONFIRMED" ? "confirmed" : "voting",
    time: p.expectedVisitTime || "14:00",
    votesUp: p.votesUp ?? 0,
    votesDown: p.votesDown ?? 0,
    myVote: p.myVote ?? null,
    memo: p.memo || "",
    rating: p.rating ?? null,
    review: p.review || "",
    photos: p.photos || [],
    x: 24 + ((idx * 19 + activeDay * 7) % 54),
    y: 24 + ((idx * 23 + activeDay * 11) % 52),
  }))

  return sortPlacesByTimeAscending(mapped)
}

export function WanderMap({ tripId, readOnly = false }: WanderMapProps) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null)
  const [trip, setTrip] = useState<TripResponse | null>(null)
  const [itinerary, setItinerary] = useState<TripItineraryResponse | null>(null)
  const [fallbackPlaces, setFallbackPlaces] = useState<EnrichedPlace[]>(() =>
    sortPlacesByTimeAscending(INITIAL_PLACES)
  )
  const [activeDay, setActiveDay] = useState(1)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = authService.getSession()
    setCurrentUser(user)

    function handleUserUpdated(e: Event) {
      const customEvent = e as CustomEvent<UserResponse | null>
      setCurrentUser(customEvent.detail)
    }
    window.addEventListener("wandermap:user-updated", handleUserUpdated)
    return () => window.removeEventListener("wandermap:user-updated", handleUserUpdated)
  }, [])

  useEffect(() => {
    async function loadTripAndItinerary() {
      const session = authService.getSession()
      try {
        const cleanTripId = decodeURIComponent(tripId || "").trim()
        const isNumeric = /^\d+$/.test(cleanTripId)
        let tripData: TripResponse

        if (isNumeric) {
          tripData = await tripService.getTrip(Number(cleanTripId))
        } else {
          try {
            tripData = await tripService.getTripByInviteCode(cleanTripId)
          } catch (inviteErr: any) {
            const searchParams =
              typeof window !== "undefined"
                ? new URLSearchParams(window.location.search)
                : null
            const fallbackId = searchParams?.get("id")
            if (fallbackId && /^\d+$/.test(fallbackId)) {
              tripData = await tripService.getTrip(Number(fallbackId))
            } else {
              throw inviteErr
            }
          }
        }
        setTrip(tripData)

        try {
          const itinData = await tripService.getItinerary(tripData.id, session?.id)
          setItinerary(itinData)
          const firstDayPlaces = itinData.days[0]?.places || []
          if (firstDayPlaces.length > 0) {
            setActiveId(String(firstDayPlaces[0].id))
          }
        } catch (itinErr) {
          console.warn("일정 데이터를 불러오지 못해 기본 상태로 표시합니다:", itinErr)
        }
      } catch (err: any) {
        setError(err.message || "여행 정보를 불러오는 데 실패했습니다.")
      } finally {
        setLoading(false)
      }
    }
    loadTripAndItinerary()
  }, [tripId])

  const isGuest = readOnly || !currentUser

  function requireLoginToast() {
    showToast("로그인이 필요한 기능입니다.", "warning")
  }

  const currentDayObj = useMemo(() => {
    if (!itinerary) return null
    return itinerary.days.find((d) => d.dayNumber === activeDay) || itinerary.days[0] || null
  }, [itinerary, activeDay])

  const places: EnrichedPlace[] = useMemo(() => {
    if (itinerary) {
      return mapItineraryToEnrichedPlaces(itinerary, activeDay)
    }
    return sortPlacesByTimeAscending(fallbackPlaces)
  }, [itinerary, activeDay, fallbackPlaces])

  // 일자(Day) 전환 시 해당 일자의 첫 번째 장소를 자동 선택
  useEffect(() => {
    if (places.length > 0 && !places.some((p) => p.id === activeId)) {
      setActiveId(places[0].id)
    } else if (places.length === 0) {
      setActiveId(null)
    }
  }, [activeDay, places, activeId])

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === activeId) || places[0] || null,
    [places, activeId]
  )

  function handleSelectPlace(id: string) {
    setActiveId(id)
    setIsDetailViewOpen(true)
  }

  function handleChangeDay(day: number) {
    setActiveDay(day)
    setIsDetailViewOpen(false)
  }

  async function handleVote(id: string, dir: "up" | "down") {
    if (isGuest || !currentUser) {
      requireLoginToast()
      return
    }
    setActiveId(id)

    if (itinerary && trip && /^\d+$/.test(id)) {
      try {
        const updated = await tripService.votePlace(
          trip.id,
          Number(id),
          currentUser.id,
          dir === "up" ? "UP" : "DOWN"
        )
        setItinerary(updated)
        return
      } catch (err: any) {
        showToast(err.response?.data?.message || "투표 반영에 실패했습니다.", "error")
      }
    }

    setFallbackPlaces((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              votesUp: dir === "up" ? p.votesUp + 1 : p.votesUp,
              votesDown: dir === "down" ? p.votesDown + 1 : p.votesDown,
            }
          : p
      )
    )
  }

  async function handleAddPlaceSubmit(data: {
    name: string
    category: string
    address: string
    time: string
  }) {
    if (isGuest || !currentUser) {
      requireLoginToast()
      return
    }

    if (trip && itinerary) {
      try {
        const updated = await tripService.addPlace(trip.id, {
          dayNumber: activeDay,
          name: data.name,
          category: data.category,
          address: data.address || trip.destination || "",
          expectedVisitTime: data.time || "14:00",
          durationMinutes: 60,
          userId: currentUser.id,
        })
        setItinerary(updated)
        const updatedDay = updated.days.find((d) => d.dayNumber === activeDay)
        const matchingNew = updatedDay?.places.find(
          (p) => p.name === data.name && p.expectedVisitTime === (data.time || "14:00")
        )
        const target = matchingNew || updatedDay?.places[updatedDay.places.length - 1]
        if (target) {
          setActiveId(String(target.id))
        }
        showToast(`'${data.name}' 장소가 시간순으로 추가되었습니다.`, "success")
        return
      } catch (err: any) {
        showToast(err.response?.data?.message || "장소 추가에 실패했습니다.", "error")
      }
    }

    // 백엔드 미연결 시 로컬 상태에서도 시간순 오름차순 추가
    const newId = String(Date.now())
    setFallbackPlaces((prev) =>
      sortPlacesByTimeAscending([
        ...prev,
        {
          id: newId,
          order: prev.length + 1,
          name: data.name,
          category: data.category,
          address: data.address || trip?.destination || "",
          status: "voting",
          time: data.time || "14:00",
          votesUp: 1,
          votesDown: 0,
          x: 35,
          y: 45,
        },
      ])
    )
    setActiveId(newId)
    showToast(`'${data.name}' 장소가 시간순으로 추가되었습니다.`, "success")
  }

  async function handleUpdatePlaceDiary(placeId: string, payload: UpdatePlaceDiaryPayload) {
    if (isGuest || !currentUser) {
      requireLoginToast()
      return
    }
    if (trip && itinerary && /^\d+$/.test(placeId)) {
      try {
        const updated = await tripService.updatePlaceDiary(
          trip.id,
          Number(placeId),
          payload,
          currentUser.id
        )
        setItinerary(updated)
        showToast(
          payload.expectedVisitTime
            ? "일정 시간이 변경되어 시간순으로 자동 정렬되었습니다."
            : "장소 기록이 저장되었습니다.",
          "success"
        )
        return
      } catch {
        showToast("저장에 실패했습니다.", "error")
        return
      }
    }

    setFallbackPlaces((prev) =>
      sortPlacesByTimeAscending(
        prev.map((p) =>
          p.id === placeId
            ? {
                ...p,
                name: payload.name ?? p.name,
                address: payload.address ?? p.address,
                time: payload.expectedVisitTime ?? p.time,
                memo: payload.memo ?? p.memo,
                rating: payload.rating !== undefined ? payload.rating : p.rating,
                review: payload.review ?? p.review,
                photos: payload.photos ?? p.photos,
              }
            : p
        )
      )
    )
    showToast("변경 사항이 시간순으로 반영되었습니다.", "success")
  }

  async function handleDeletePlace(placeId: string) {
    if (isGuest || !currentUser) {
      requireLoginToast()
      return
    }
    if (!trip || !/^\d+$/.test(placeId)) return
    try {
      const updated = await tripService.deletePlace(trip.id, Number(placeId), currentUser.id)
      setItinerary(updated)
      showToast("장소가 삭제되었습니다.", "success")
    } catch {
      showToast("장소 삭제에 실패했습니다.", "error")
    }
  }

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F8F8F6] text-slate-500">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1A9E7A] border-t-transparent mx-auto"></div>
          <p className="text-base font-bold text-[#18181B]">여행 일정과 다이어리를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F8F8F6] text-[#18181B] p-4">
        <div className="text-center max-w-sm space-y-4 rounded-3xl border border-[#E2E2DA] bg-white p-6 shadow-xl">
          <div className="size-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-lg font-bold">오류 발생</h2>
          <p className="text-sm text-[#6B6B72]">{error || "여행 방을 찾을 수 없습니다."}</p>
          <button
            onClick={() => router.push("/")}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition cursor-pointer"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const isOwner = currentUser?.id === trip.createdById
  const currentUserRole = isGuest ? "GUEST" : isOwner ? "OWNER" : "MEMBER"
  const cleanTitle = formatCleanTripTitle(trip.title, trip.destination)
  const totalDaysCount = itinerary?.totalDays || 3
  const periodInfo = formatHeaderPeriod(trip.startDate, trip.endDate)

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F8F8F6]">
      {/* 1. 좌측 사이드바: 로그인된 회원에게만 표시하고 비로그인 게스트에게는 숨김 */}
      {!isGuest && <WorkspaceSidebar currentTripId={tripId} />}

      {/* 2. 우측 메인 작업 영역 */}
      <div className="flex-1 flex flex-col h-dvh min-w-0 overflow-hidden">
        {/* 상단 헤더: 좌측(목적지 배지 + 여행 제목 + 기간) / 우측(멤버 아바타 + 공유 드롭다운 + 취향 설문) */}
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#E2E2DA] bg-white px-5 sm:px-7 shadow-2xs z-30">
          <div className="flex items-center gap-3.5 min-w-0">
            {isGuest && (
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex items-center gap-2 pr-3 border-r border-[#E2E2DA] shrink-0 cursor-pointer"
              >
                <span className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-xs">
                  <Compass className="size-4.5" />
                </span>
                <span className="hidden sm:inline text-base font-black tracking-tight text-[#18181B]">
                  WanderMap
                </span>
              </button>
            )}

            {/* WanderMap 고유 목적지 배지 & 큼직한 일정 제목 */}
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <div className="shrink-0 flex items-center gap-1.5 rounded-2xl border border-[#1A9E7A]/30 bg-[#F7F7F2] px-3.5 py-1.5 shadow-2xs">
                <span className="flex size-5 items-center justify-center rounded-[50%_50%_50%_2px] bg-[#1A9E7A] text-white">
                  <MapPin className="size-3" />
                </span>
                <span className="text-sm sm:text-[15px] font-black tracking-tight text-[#18181B]">
                  {trip.destination}
                </span>
              </div>

              <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight text-[#18181B]">
                {cleanTitle}
              </h1>
            </div>

            {/* 큼직하고 선명한 여행 기간 표시 */}
            <div className="hidden xl:flex items-center gap-2 rounded-2xl bg-[#F8F8F6] border border-[#E2E2DA] px-4 py-2 shrink-0">
              <Calendar className="size-4 text-[#1A9E7A] shrink-0" />
              <span className="text-sm sm:text-[15px] font-extrabold text-[#27272A]">
                {periodInfo.rangeText}
              </span>
              {periodInfo.nightsText && (
                <span className="px-2 py-0.5 rounded-lg bg-[#EDFAF4] text-[#1A9E7A] text-xs font-extrabold">
                  {periodInfo.nightsText}
                </span>
              )}
            </div>
          </div>

          {/* 우측 상단 컨트롤: 멤버 프로필 아이콘 & 공유 드롭다운 + 취향 설문(또는 게스트 로그인 버튼) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <MembersBox
              tripId={trip.id}
              inviteCode={trip.inviteCode}
              createdById={trip.createdById}
              createdByName={trip.createdByName}
              readOnly={isGuest}
              currentUser={currentUser}
              currentUserRole={currentUserRole}
              members={trip.members}
              onCopySuccess={(msg) => showToast(msg, "success")}
            />

            <div className="h-6 w-px bg-[#E2E2DA] hidden sm:block" />

            {isGuest ? (
              <button
                onClick={() =>
                  router.push(
                    `/login?redirect=${encodeURIComponent(
                      `/trips/${trip.inviteCode || tripId}`
                    )}`
                  )
                }
                className="rounded-xl bg-[#1A9E7A] px-4 py-2 text-xs sm:text-sm font-extrabold text-white hover:bg-[#158063] transition shadow-xs cursor-pointer"
              >
                로그인하고 함께 편집
              </button>
            ) : (
              <button
                onClick={() => router.push(`/trips/${trip.inviteCode || tripId}/preferences`)}
                className="flex items-center gap-2 rounded-xl border border-[#E2E2DA] hover:border-[#1A9E7A] bg-white px-3.5 py-2 text-xs sm:text-sm font-extrabold text-[#18181B] hover:text-[#1A9E7A] transition shadow-2xs cursor-pointer"
              >
                <FileText className="size-4 text-[#1A9E7A]" />
                <span className="hidden md:inline">동행자 취향 설문</span>
                <span className="md:hidden">취향 설문</span>
              </button>
            )}
          </div>
        </header>

        {/* 메인 2단 레이아웃: [좌측: 100% 풀스크린 동선 지도] / [우측: 장소 리스트 ↔ 장소 상세 슬라이드 패널] */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-4 p-4 overflow-hidden bg-[#F8F8F6]">
          {/* 좌측(중앙) 영역: 별도 패널 분할 없이 지도가 100% 꽉 차게 렌더링 */}
          <div className="h-full min-h-0 rounded-2xl border border-[#E2E2DA] bg-white shadow-xs overflow-hidden">
            <MapView
              places={places}
              activeId={selectedPlace?.id || activeId}
              onSelect={handleSelectPlace}
              destination={trip.destination}
            />
          </div>

          {/* 우측 컬럼: 장소 선택 시 같은 컨테이너 안에서 상세/메모 뷰로 부드럽게 슬라이드 전환 */}
          <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <ItineraryTimeline
              places={places}
              activeId={selectedPlace?.id || activeId}
              activeDay={activeDay}
              onChangeDay={handleChangeDay}
              dayDate={currentDayObj?.date}
              isDetailViewOpen={isDetailViewOpen}
              onSelectPlace={handleSelectPlace}
              onCloseDetailView={() => setIsDetailViewOpen(false)}
              onVote={handleVote}
              onAddPlaceSubmit={handleAddPlaceSubmit}
              onUpdatePlaceDiary={handleUpdatePlaceDiary}
              onDeletePlace={handleDeletePlace}
              readOnly={isGuest}
              totalDays={totalDaysCount}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
