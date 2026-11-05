"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Compass,
  Plane,
  Calendar,
  MapPin,
  Crown,
  Users,
  BookOpen,
  Clock,
  CheckCircle2,
  Search,
  ChevronRight,
  Plus,
  Archive,
  CalendarCheck,
} from "lucide-react"
import type { UserResponse } from "@/lib/auth-service"
import type { TripResponse } from "@/lib/trip-service"

export interface MyJourneysViewProps {
  user: UserResponse
  trips: TripResponse[]
  isLoading?: boolean
  onCreateNewTrip?: () => void
  className?: string
}

type JourneyFilter = "ALL" | "UPCOMING" | "PAST" | "CREATED_BY_ME"

function getTodayDateString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getDurationText(start?: string, end?: string): string {
  if (!start || !end) return "일정 미정"
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "일정 미정"
  const diffDays = Math.round(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "당일치기"
  return `${diffDays}박 ${diffDays + 1}일`
}

function getDDayBadge(start?: string, end?: string): {
  label: string
  status: "ONGOING" | "UPCOMING" | "PAST"
} {
  const todayStr = getTodayDateString()
  if (!start || !end) {
    return { label: "일정 계획 중", status: "UPCOMING" }
  }
  if (end < todayStr) {
    return { label: "다녀온 여정", status: "PAST" }
  }
  if (start <= todayStr && end >= todayStr) {
    return { label: "여행 진행 중", status: "ONGOING" }
  }
  const today = new Date(todayStr)
  const startDate = new Date(start)
  const diff = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return { label: `D-${diff}`, status: "UPCOMING" }
}

function formatDateRangeDot(start?: string, end?: string): string {
  if (!start || !end) return "날짜 미정"
  return `${start.replace(/-/g, ".")} – ${end.replace(/-/g, ".")}`
}

export function MyJourneysView({
  user,
  trips,
  isLoading = false,
  onCreateNewTrip,
  className = "",
}: MyJourneysViewProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<JourneyFilter>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  const todayStr = useMemo(() => getTodayDateString(), [])

  // 여정 분류 (진행/예정 vs 다녀온 여정 vs 내가 만든 여정)
  const categorized = useMemo(() => {
    const upcoming: TripResponse[] = []
    const past: TripResponse[] = []
    const createdByMe: TripResponse[] = []

    trips.forEach((trip) => {
      const isMine =
        trip.createdById === user.id ||
        trip.createdByName === user.nickname ||
        trip.createdById === null
      if (isMine) {
        createdByMe.push(trip)
      }

      if (trip.endDate && trip.endDate < todayStr) {
        past.push(trip)
      } else {
        upcoming.push(trip)
      }
    })

    return { upcoming, past, createdByMe }
  }, [trips, user.id, user.nickname, todayStr])

  // 검색어 및 탭 필터링
  const filteredTrips = useMemo(() => {
    let baseList = trips
    if (filter === "UPCOMING") baseList = categorized.upcoming
    else if (filter === "PAST") baseList = categorized.past
    else if (filter === "CREATED_BY_ME") baseList = categorized.createdByMe

    const q = searchQuery.trim().toLowerCase()
    if (!q) return baseList
    return baseList.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.destination?.toLowerCase().includes(q)
    )
  }, [trips, categorized, filter, searchQuery])

  const filteredUpcoming = useMemo(
    () => filteredTrips.filter((t) => !t.endDate || t.endDate >= todayStr),
    [filteredTrips, todayStr]
  )

  const filteredPast = useMemo(
    () => filteredTrips.filter((t) => t.endDate && t.endDate < todayStr),
    [filteredTrips, todayStr]
  )

  const handleOpenTrip = (trip: TripResponse) => {
    router.push(`/trips/${trip.inviteCode || trip.id}`)
  }

  const handleNewTripClick = () => {
    if (onCreateNewTrip) {
      onCreateNewTrip()
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wandermap:open-create-trip"))
    } else {
      router.push("/")
    }
  }

  const renderTripCard = (trip: TripResponse, isPastSection: boolean) => {
    const isOwner =
      trip.createdById === user.id ||
      trip.createdByName === user.nickname ||
      trip.createdById === null
    const dDay = getDDayBadge(trip.startDate, trip.endDate)
    const duration = getDurationText(trip.startDate, trip.endDate)

    return (
      <div
        key={trip.id}
        onClick={() => handleOpenTrip(trip)}
        className={`group relative rounded-3xl border p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 ${
          isPastSection
            ? "bg-[#FBFBF9] hover:bg-white border-[#E2E2DA] hover:border-[#1A9E7A]/60 hover:shadow-md"
            : "bg-white border-[#E2E2DA] hover:border-[#1A9E7A] hover:shadow-lg hover:-translate-y-0.5"
        }`}
      >
        {/* 상단 배지 바 (한 줄 유지 및 차분한 톤앤매너 적용) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11.5px] font-extrabold shrink-0 ${
                isPastSection
                  ? "bg-[#F2F2EC] text-[#52525B]"
                  : "bg-[#EDFAF4] text-[#1A9E7A]"
              }`}
            >
              <MapPin className="size-3" />
              <span>{trip.destination}</span>
            </span>

            <span className="px-2.5 py-1 rounded-xl bg-[#F7F7F2] border border-[#E2E2DA]/80 text-[11.5px] font-bold text-[#52525B] shrink-0">
              {duration}
            </span>

            {isOwner ? (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11.5px] font-bold shrink-0 ${
                  isPastSection
                    ? "bg-[#EFF4F2] border border-[#D8E5DF] text-[#356856]"
                    : "bg-[#EDFAF4] border border-[#C5E8D9] text-[#1A9E7A]"
                }`}
              >
                <Crown className="size-3 text-[#1A9E7A]" />
                <span>내가 만든 일정</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F2F2EC] text-[#6B6B72] text-[11.5px] font-bold shrink-0">
                <Users className="size-3" />
                <span>동행 참여</span>
              </span>
            )}
          </div>

          {/* 상태 / D-Day 배지 (다녀온 여정 섹션에서는 불필요한 중복 배지 제거) */}
          {!isPastSection && dDay.status !== "PAST" && (
            <span
              className={`px-2.5 py-1 rounded-xl text-[11.5px] font-extrabold shrink-0 ${
                dDay.status === "ONGOING"
                  ? "bg-[#1A9E7A] text-white shadow-2xs"
                  : "bg-[#EDFAF4] text-[#1A9E7A] border border-[#BDEBDC]"
              }`}
            >
              {dDay.label}
            </span>
          )}
        </div>

        {/* 중앙 여행 제목 및 일정 */}
        <div>
          <h4 className="text-[17px] font-extrabold text-[#18181B] group-hover:text-[#1A9E7A] transition truncate">
            {trip.title}
          </h4>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B6B72] mt-1.5">
            <Calendar className="size-3.5 text-[#1A9E7A] shrink-0" />
            <span>{formatDateRangeDot(trip.startDate, trip.endDate)}</span>
          </div>
        </div>

        {/* 하단 액션 바 */}
        <div className="pt-3 border-t border-dashed border-[#E2E2DA] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#6B6B72]">
            {isPastSection ? (
              <>
                <BookOpen className="size-3.5 text-[#1A9E7A]" />
                <span>여행 기록 · 사진 다이어리 보관함</span>
              </>
            ) : (
              <>
                <Compass className="size-3.5 text-[#1A9E7A]" />
                <span>지도 경로 계획 · 실시간 일정 관리</span>
              </>
            )}
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#1A9E7A] group-hover:translate-x-0.5 transition">
            <span>{isPastSection ? "기록 보기" : "일정 열기"}</span>
            <ChevronRight className="size-4" />
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* 1. 상단 헤더 & KPI 요약 대시보드 카드 */}
      <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-[#E2E2DA] shadow-xs flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E2DA] pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EDFAF4] text-[#1A9E7A] text-xs font-extrabold border border-[#BDEBDC]">
              <Compass className="size-3.5" />
              <span>여정 및 다이어리 통합 관리</span>
            </div>
            <h3 className="font-extrabold text-xl lg:text-2xl text-[#18181B] mt-2 tracking-tight">
              내 여정
            </h3>
            <p className="text-sm text-[#6B6B72] mt-0.5 font-medium">
              내가 만든 여행 일정과 동행 중이거나 다녀온 여정 기록을 한눈에 확인하세요
            </p>
          </div>

          <button
            type="button"
            onClick={handleNewTripClick}
            className="px-4 py-3 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] text-sm font-extrabold text-white shadow-sm shadow-[#1A9E7A]/20 transition flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>새 여행 일정 만들기</span>
          </button>
        </div>

        {/* 4단 KPI 요약 카드 (클릭 시 필터 즉시 연동) */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`text-left rounded-2xl p-4.5 border transition cursor-pointer ${
              filter === "ALL"
                ? "bg-[#EDFAF4]/70 border-[#1A9E7A] ring-2 ring-[#1A9E7A]/15"
                : "bg-[#F7F7F2] border-[#E2E2DA] hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-[#52525B]">전체 여정</span>
              <span className="size-8 rounded-xl bg-white border border-[#E2E2DA] flex items-center justify-center text-[#1A9E7A]">
                <Compass className="size-4" />
              </span>
            </div>
            <p className="text-2xl lg:text-3xl font-black text-[#18181B]">{trips.length}</p>
            <p className="text-[11px] font-bold text-[#8A8A93] mt-1">참여 및 생성한 모든 일정</p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("UPCOMING")}
            className={`text-left rounded-2xl p-4.5 border transition cursor-pointer ${
              filter === "UPCOMING"
                ? "bg-[#EDFAF4]/70 border-[#1A9E7A] ring-2 ring-[#1A9E7A]/15"
                : "bg-[#F7F7F2] border-[#E2E2DA] hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-[#1A9E7A]">참여 · 예정 여정</span>
              <span className="size-8 rounded-xl bg-white border border-[#BDEBDC] flex items-center justify-center text-[#1A9E7A]">
                <CalendarCheck className="size-4" />
              </span>
            </div>
            <p className="text-2xl lg:text-3xl font-black text-[#1A9E7A]">
              {categorized.upcoming.length}
            </p>
            <p className="text-[11px] font-bold text-[#6B6B72] mt-1 break-keep">
              계획 및 진행 중인 여정
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("PAST")}
            className={`text-left rounded-2xl p-4.5 border transition cursor-pointer ${
              filter === "PAST"
                ? "bg-[#EDFAF4]/70 border-[#1A9E7A] ring-2 ring-[#1A9E7A]/15"
                : "bg-[#F7F7F2] border-[#E2E2DA] hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-[#52525B]">다녀온 여정 기록</span>
              <span className="size-8 rounded-xl bg-white border border-[#E2E2DA] flex items-center justify-center text-[#52525B]">
                <Archive className="size-4" />
              </span>
            </div>
            <p className="text-2xl lg:text-3xl font-black text-[#18181B]">
              {categorized.past.length}
            </p>
            <p className="text-[11px] font-bold text-[#8A8A93] mt-1 break-keep">
              날짜가 지난 여행 기록
            </p>
          </button>

          <button
            type="button"
            onClick={() => setFilter("CREATED_BY_ME")}
            className={`text-left rounded-2xl p-4.5 border transition cursor-pointer ${
              filter === "CREATED_BY_ME"
                ? "bg-[#EDFAF4]/70 border-[#1A9E7A] ring-2 ring-[#1A9E7A]/15"
                : "bg-[#F7F7F2] border-[#E2E2DA] hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-[#52525B]">내가 만든 일정</span>
              <span className="size-8 rounded-xl bg-white border border-[#E2E2DA] flex items-center justify-center text-[#1A9E7A]">
                <Crown className="size-4" />
              </span>
            </div>
            <p className="text-2xl lg:text-3xl font-black text-[#18181B]">
              {categorized.createdByMe.length}
            </p>
            <p className="text-[11px] font-bold text-[#8A8A93] mt-1 break-keep">
              직접 개설한 여행 방
            </p>
          </button>
        </div>

        {/* 필터 탭 & 검색 바 (탭 잘림 없이 한눈에 보이도록 배치) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-1 bg-[#F2F2EC] p-1.5 rounded-2xl flex-wrap sm:flex-nowrap shrink-0">
            {[
              { id: "ALL" as const, label: "전체 여정", count: trips.length },
              { id: "UPCOMING" as const, label: "참여 · 예정", count: categorized.upcoming.length },
              { id: "PAST" as const, label: "다녀온 기록", count: categorized.past.length },
              { id: "CREATED_BY_ME" as const, label: "내가 만든 일정", count: categorized.createdByMe.length },
            ].map((tab) => {
              const active = filter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-white text-[#18181B] shadow-2xs"
                      : "text-[#6B6B72] hover:text-[#18181B]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[11px] ${
                      active ? "bg-[#EDFAF4] text-[#1A9E7A]" : "bg-[#E2E2DA]/70 text-[#52525B]"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="relative flex-1 md:max-w-[210px] min-w-[160px]">
            <Search className="size-4 text-[#8A8A93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="목적지 · 제목 검색"
              className="w-full h-10 pl-8.5 pr-3 rounded-xl border border-[#E2E2DA] bg-[#F7F7F2] focus:bg-white text-xs font-bold text-[#18181B] outline-none focus:border-[#1A9E7A] transition"
            />
          </div>
        </div>
      </div>

      {/* 2. 여정 목록 영역 (참여 중 · 예정된 여정 & 다녀온 여정 기록 분리) */}
      {isLoading ? (
        <div className="bg-white rounded-[28px] p-12 border border-[#E2E2DA] flex flex-col items-center justify-center gap-3">
          <div className="size-8 rounded-full border-3 border-[#1A9E7A] border-t-transparent animate-spin" />
          <p className="text-sm font-bold text-[#6B6B72]">내 여정 정보를 불러오는 중...</p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="bg-white rounded-[28px] p-12 border border-[#E2E2DA] text-center flex flex-col items-center gap-3">
          <div className="size-12 rounded-2xl bg-[#EDFAF4] text-[#1A9E7A] flex items-center justify-center">
            <Plane className="size-6" />
          </div>
          <div>
            <p className="text-base font-extrabold text-[#18181B]">
              표시할 여행 여정이 없습니다
            </p>
            <p className="text-sm text-[#6B6B72] mt-1 font-medium">
              새로운 여행 일정을 만들고 친구들과 경로 계획 및 여행 기록을 시작해 보세요
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewTripClick}
            className="mt-2 px-5 py-2.5 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] text-sm font-extrabold text-white transition cursor-pointer"
          >
            첫 여행 계획 만들기
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 섹션 A: 참여 중 · 예정된 여정 */}
          {filter !== "PAST" && filteredUpcoming.length > 0 && (
            <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-[#E2E2DA] shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-[#1A9E7A]" />
                <h4 className="text-base font-extrabold text-[#18181B]">
                  참여 중 · 예정된 여정 ({filteredUpcoming.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUpcoming.map((trip) => renderTripCard(trip, false))}
              </div>
            </div>
          )}

          {/* 섹션 B: 다녀온 여정 기록 (날짜 지난 일정) */}
          {filter !== "UPCOMING" && filteredPast.length > 0 && (
            <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-[#E2E2DA] shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-[#52525B]" />
                <h4 className="text-base font-extrabold text-[#18181B]">
                  다녀온 여정 기록 ({filteredPast.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPast.map((trip) => renderTripCard(trip, true))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

