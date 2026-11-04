"use client"

import React, { useState, useEffect } from "react"
import { INITIAL_PLACES, type Place } from "@/lib/trip-data"
import { MapView } from "@/components/map-view"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { MembersBox } from "@/components/trip-detail/members-box"
import { ItineraryTimeline } from "@/components/trip-detail/itinerary-timeline"
import {
  AiRecommendModal,
  type RecommendedDay,
} from "@/components/trip-detail/ai-recommend-modal"
import { tripService, type TripResponse } from "@/lib/trip-service"
import { authService, type UserResponse } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import {
  MapPin,
  Calendar,
  FileText,
  AlertCircle,
  Eye,
  CheckCircle,
  Plus,
} from "lucide-react"

interface WanderMapProps {
  tripId: string
  readOnly?: boolean
}

const PLACE_CATEGORIES = ["맛집", "카페 · 디저트", "관광 · 명소", "숙소", "쇼핑"]

const MOCK_RECOMMENDED_DAYS: RecommendedDay[] = [
  {
    dayNumber: 1,
    dateLabel: "1일차 - 도착 및 도심 랜드마크",
    theme: "오사카의 랜드마크와 시내 야경 탐방",
    places: [
      {
        id: "rec-1-1",
        name: "간사이 국제공항 도착",
        category: "교통",
        address: "1 Senshukukokita, Izumisano, Osaka",
        memo: "라피트 특급열차로 난바역 이동 (약 35분)",
        estimatedTime: "11:30",
        durationMinutes: 40,
      },
      {
        id: "rec-1-2",
        name: "도톤보리 & 글리코상",
        category: "명소",
        address: "Dotonbori, Chuo Ward, Osaka",
        memo: "타코야키 맛집 및 대표 인증샷 포인트",
        estimatedTime: "13:30",
        durationMinutes: 90,
      },
      {
        id: "rec-1-3",
        name: "이치란 라멘 도톤보리점",
        category: "맛집",
        address: "7-18 Souemoncho, Chuo Ward, Osaka",
        memo: "비법 양념을 곁들인 진한 돈코츠 라멘",
        estimatedTime: "15:30",
        durationMinutes: 60,
      },
      {
        id: "rec-1-4",
        name: "우메다 공중정원",
        category: "명소",
        address: "1-1-88 Oyodonaka, Kita Ward, Osaka",
        memo: "오사카 일몰 및 360도 파노라마 야경 감상",
        estimatedTime: "18:00",
        durationMinutes: 90,
      },
    ],
  },
  {
    dayNumber: 2,
    dateLabel: "2일차 - 역사 & 감성 카페 코스",
    theme: "오사카성의 정취와 나카자키초 카페 거리",
    places: [
      {
        id: "rec-2-1",
        name: "오사카성 천수각",
        category: "명소",
        address: "1-1 Osakajo, Chuo Ward, Osaka",
        memo: "공원 산책 및 역사 전시 관람",
        estimatedTime: "10:00",
        durationMinutes: 120,
      },
      {
        id: "rec-2-2",
        name: "나카자키초 감성 카페거리",
        category: "카페",
        address: "Nakazakicho, Kita Ward, Osaka",
        memo: "레트로 골목길과 아늑한 드립 커피",
        estimatedTime: "14:00",
        durationMinutes: 90,
      },
      {
        id: "rec-2-3",
        name: "신사이바시 쇼핑 스트리트",
        category: "쇼핑",
        address: "Shinsaibashisuji, Chuo Ward, Osaka",
        memo: "트렌디한 잡화점 및 기념품 숍",
        estimatedTime: "16:30",
        durationMinutes: 120,
      },
    ],
  },
]

function formatCleanTripTitle(title: string, destination: string): string {
  if (!title) return `${destination} 여행`
  const trimmed = title.trim()
  const dupPrefix = `${destination} ${destination}`
  if (trimmed.startsWith(dupPrefix)) {
    return trimmed.slice(destination.length).trim()
  }
  return trimmed
}

export function WanderMap({ tripId, readOnly = false }: WanderMapProps) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null)
  const [trip, setTrip] = useState<TripResponse | null>(null)
  const [places, setPlaces] = useState<Place[]>(INITIAL_PLACES)
  const [activeId, setActiveId] = useState<string | null>("p2")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 장소 빠른 추가 입력 상태
  const [quickPlaceName, setQuickPlaceName] = useState("")
  const [quickPlaceCategory, setQuickPlaceCategory] = useState(PLACE_CATEGORIES[0])

  // AI 추천 모달 상태
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [recommendedData] = useState<RecommendedDay[]>(MOCK_RECOMMENDED_DAYS)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    const user = authService.getSession()
    setCurrentUser(user)

    async function loadTrip() {
      try {
        const id = Number(tripId)
        const data = !isNaN(id)
          ? await tripService.getTrip(id)
          : await tripService.getTripByInviteCode(tripId)
        setTrip(data)
      } catch (err: any) {
        setError(err.message || "여행 정보를 불러오는 데 실패했습니다.")
      } finally {
        setLoading(false)
      }
    }
    loadTrip()
  }, [tripId])

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  function handleVote(id: string, dir: "up" | "down") {
    if (readOnly) return
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

  function handleAddPlace(customName?: string, customCategory?: string) {
    if (readOnly) return
    const nameToUse = customName?.trim() || `추천 장소 #${places.length + 1}`
    const catToUse = customCategory || "관광 · 명소"

    const newPlace: Place = {
      id: `p-${Date.now()}`,
      order: places.length + 1,
      name: nameToUse,
      category: catToUse,
      address: trip?.destination || "방문지 주소",
      status: "voting",
      time: "14:00",
      votesUp: 1,
      votesDown: 0,
      x: 45 + ((places.length * 8) % 30),
      y: 40 + ((places.length * 10) % 30),
    }
    setPlaces((prev) => [...prev, newPlace])
    setActiveId(newPlace.id)
    showToast(`'${nameToUse}' 장소가 일정에 추가되었습니다.`)
  }

  function handleQuickAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!quickPlaceName.trim()) return
    handleAddPlace(quickPlaceName, quickPlaceCategory)
    setQuickPlaceName("")
  }

  function handleApplyAllAi(newPlaces: Place[]) {
    setPlaces(newPlaces)
    if (newPlaces.length > 0) {
      setActiveId(newPlaces[0].id)
    }
    setIsAiModalOpen(false)
    showToast("AI 추천 동선 전체가 일정에 반영되었습니다!")
  }

  function handleApplySelectedAi(selectedPlaces: Place[]) {
    setPlaces((prev) => {
      const existingIds = new Set(prev.map((p) => p.name))
      const freshPlaces = selectedPlaces
        .filter((p) => !existingIds.has(p.name))
        .map((p, idx) => ({
          ...p,
          id: `ai-part-${Date.now()}-${idx}`,
          order: prev.length + idx + 1,
        }))
      return [...prev, ...freshPlaces]
    })
    if (selectedPlaces.length > 0) {
      setActiveId(selectedPlaces[0].id)
    }
    setIsAiModalOpen(false)
    showToast(`선택하신 ${selectedPlaces.length}개 장소가 일정에 추가되었습니다!`)
  }

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F8F8F6] text-slate-500">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1A9E7A] border-t-transparent mx-auto"></div>
          <p className="text-base font-bold text-[#18181B]">여행 방 정보를 불러오는 중...</p>
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
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 transition"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const isOwner = currentUser?.id === trip.createdById
  const currentUserRole = readOnly ? "GUEST" : isOwner ? "OWNER" : "MEMBER"
  const cleanTitle = formatCleanTripTitle(trip.title, trip.destination)

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F8F8F6]">
      {/* 1. 좌측 공통 사이드바 */}
      <WorkspaceSidebar currentTripId={tripId} />

      {/* 2. 중앙 & 우측 메인 작업 영역 */}
      <div className="flex-1 flex flex-col h-dvh min-w-0 overflow-hidden">
        {/* 상단 헤더 */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E2E2DA] bg-white px-5 sm:px-6 shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#EDFAF4] text-[#1A9E7A]">
                {trip.destination}
              </span>
              <h1 className="truncate text-base sm:text-lg font-extrabold text-[#18181B]">
                {cleanTitle}
              </h1>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-sm text-[#6B6B72] font-medium shrink-0">
              <Calendar className="size-4 text-[#1A9E7A] shrink-0" />
              <span>
                {trip.startDate && trip.endDate
                  ? `${trip.startDate} ~ ${trip.endDate}`
                  : "일정 미정"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {readOnly ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <Eye className="size-4" />
                  <span>관람 모드</span>
                </span>
                <button
                  onClick={() => router.push("/login")}
                  className="rounded-xl bg-[#1A9E7A] px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-[#158063] transition shadow-xs cursor-pointer"
                >
                  로그인하고 참여하기
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push(`/trips/${tripId}/preferences`)}
                className="flex items-center gap-2 rounded-xl border border-[#E2E2DA] hover:border-[#1A9E7A] bg-white px-4 py-2 text-xs sm:text-sm font-bold text-[#27272A] hover:text-[#1A9E7A] transition shadow-2xs cursor-pointer"
                title="취향 설문 작성하기"
              >
                <FileText className="size-4 text-[#1A9E7A]" />
                <span className="hidden sm:inline">동행자 취향 설문</span>
              </button>
            )}
          </div>
        </header>

        {/* 메인 2단 분할 레이아웃: 중앙 지도 + 우측 패널 */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-3.5 p-3.5 overflow-hidden bg-[#F8F8F6]">
          {/* 중앙 영역: 지도 뷰 및 하단 장소 직접 추가 바 */}
          <div className="relative flex flex-col h-full rounded-2xl border border-[#E2E2DA] bg-white shadow-sm overflow-hidden">
            <div className="flex-1 relative w-full h-full">
              <MapView places={places} activeId={activeId} onSelect={setActiveId} />
            </div>

            {/* 지도 하단 오버레이: AI가 아닌 직관적인 '장소 빠른 추가' 바 */}
            {!readOnly && (
              <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto max-w-2xl mx-auto">
                <form
                  onSubmit={handleQuickAddSubmit}
                  className="flex items-center gap-2 rounded-2xl border border-[#E2E2DA] bg-white/95 backdrop-blur-md p-2 shadow-lg focus-within:border-[#1A9E7A] transition"
                >
                  <div className="flex items-center gap-2 pl-2.5 flex-1 min-w-0">
                    <MapPin className="size-4.5 text-[#1A9E7A] shrink-0" />
                    <input
                      type="text"
                      value={quickPlaceName}
                      onChange={(e) => setQuickPlaceName(e.target.value)}
                      placeholder="추가할 장소 이름을 입력하세요 (예: 도톤보리, 런던베이글)"
                      className="w-full bg-transparent outline-none text-sm text-[#18181B] placeholder:text-[#8A8A93] font-semibold"
                    />
                  </div>

                  <select
                    value={quickPlaceCategory}
                    onChange={(e) => setQuickPlaceCategory(e.target.value)}
                    className="h-10 rounded-xl border border-[#E2E2DA] bg-[#F7F7F2] px-3 text-xs sm:text-sm font-bold text-[#27272A] outline-none focus:border-[#1A9E7A] cursor-pointer"
                  >
                    {PLACE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={!quickPlaceName.trim()}
                    className="shrink-0 flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#1A9E7A] hover:bg-[#158063] text-white text-xs sm:text-sm font-bold shadow-xs transition disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="size-4" />
                    <span>장소 추가</span>
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* 우측 패널: 상단 참여 멤버 박스 + 하단 세로 스크롤 동선 타임라인 */}
          <div className="flex flex-col h-full gap-3.5 overflow-hidden">
            <MembersBox
              tripId={tripId}
              inviteCode={trip.inviteCode}
              createdByName={trip.createdByName}
              readOnly={readOnly}
              currentUserRole={currentUserRole}
              members={[
                {
                  id: trip.createdById || 1,
                  nickname: trip.createdByName,
                  role: "OWNER",
                },
                ...(currentUser && currentUser.id !== trip.createdById
                  ? [
                      {
                        id: currentUser.id,
                        nickname: currentUser.nickname,
                        role: "MEMBER" as const,
                      },
                    ]
                  : []),
              ]}
            />

            <ItineraryTimeline
              places={places}
              activeId={activeId}
              onSelectPlace={setActiveId}
              onVote={handleVote}
              onAddPlace={() => handleAddPlace()}
              onOpenAiRecommend={() => setIsAiModalOpen(true)}
              readOnly={readOnly}
              totalDays={3}
            />
          </div>
        </main>
      </div>

      {/* AI 추천 동선 스마트 병합 모달 */}
      <AiRecommendModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        destination={trip.destination}
        recommendedDays={recommendedData}
        onApplyAll={handleApplyAllAi}
        onApplySelected={handleApplySelectedAi}
      />

      {/* 토스트 알림 메시지 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900/95 text-white px-4 py-3 text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-2">
          <CheckCircle className="size-4.5 text-[#1A9E7A]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}
