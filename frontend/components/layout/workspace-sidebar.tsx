"use client"

import React, { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Compass,
  Plus,
  Calendar,
  LogOut,
  Settings,
  User as UserIcon,
  ChevronRight,
  Plane,
  Menu,
  X,
  Sparkles,
  MapPin,
} from "lucide-react"
import { authService, type UserResponse } from "@/lib/auth-service"
import { tripService, type TripResponse } from "@/lib/trip-service"

export interface WorkspaceSidebarProps {
  currentTripId?: string | number
  onOpenNewTripModal?: () => void
  className?: string
}

export function WorkspaceSidebar({
  currentTripId,
  onOpenNewTripModal,
  className = "",
}: WorkspaceSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<UserResponse | null>(null)
  const [trips, setTrips] = useState<TripResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // 1. 세션 로드
  useEffect(() => {
    const session = authService.getSession()
    setUser(session)
    if (session) {
      loadTrips(session.id)
    }
  }, [])

  // 2. 여행 목록 로드
  async function loadTrips(userId: number) {
    setIsLoading(true)
    try {
      const data = await tripService.getMyTrips(userId)
      setTrips(data)
    } catch (err) {
      console.warn("사이드바 여행 목록 조회 실패:", err)
      setTrips([])
    } finally {
      setIsLoading(false)
    }
  }

  function handleLogout() {
    authService.clearSession()
    setUser(null)
    router.push("/login")
  }

  function handleNavigateHome() {
    router.push("/")
    setIsMobileOpen(false)
  }

  function handleSelectTrip(trip: TripResponse) {
    router.push(`/trips/${trip.inviteCode || trip.id}`)
    setIsMobileOpen(false)
  }

  const sidebarContent = (
    <aside className="flex h-full w-72 flex-col justify-between border-r border-[#E2E2DA] bg-[#FAFAF8] text-[#18181B] select-none">
      {/* 1. 상단: 브랜드 로고 & 새 여행 시작 버튼 */}
      <div className="p-4 space-y-4 border-b border-[#E2E2DA]/80">
        <div
          onClick={handleNavigateHome}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="홈으로 이동"
        >
          <span className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-sm shadow-[#1A9E7A]/20 group-hover:scale-105 transition">
            <Compass className="size-4.5" />
          </span>
          <div>
            <span className="text-lg font-black tracking-tight text-[#18181B]">WanderMap</span>
            <span className="block text-[10px] text-[#8A8A93] font-medium leading-none">
              AI Travel Planner
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            if (onOpenNewTripModal) {
              onOpenNewTripModal()
            } else {
              router.push("/")
            }
            setIsMobileOpen(false)
          }}
          className="w-full flex items-center justify-between gap-2 rounded-2xl bg-white border border-[#E2E2DA] hover:border-[#1A9E7A] px-3.5 py-2.5 text-xs font-bold text-[#18181B] hover:shadow-sm transition group"
        >
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-[#EDFAF4] text-[#1A9E7A] group-hover:bg-[#1A9E7A] group-hover:text-white transition">
              <Plus className="size-3.5" />
            </span>
            <span>새 여행 계획하기</span>
          </div>
          <Sparkles className="size-3.5 text-amber-500" />
        </button>
      </div>

      {/* 2. 중앙: 내 여행 동선 목록 (무한/독립 스크롤) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        <div className="flex items-center justify-between px-2 pt-1 pb-1.5 text-[11px] font-bold text-[#8A8A93] uppercase">
          <span>내 여행 목록</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E2E2DA]/60 text-[#6B6B72]">
            {trips.length}
          </span>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-[#8A8A93]">목록 불러오는 중...</div>
        ) : trips.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#8A8A93] space-y-2">
            <Plane className="size-6 text-[#C8C8C0] mx-auto" />
            <p className="text-[11px]">아직 계획 중인 여행이 없어요.</p>
          </div>
        ) : (
          trips.map((trip) => {
            const isCurrent =
              String(currentTripId) === String(trip.id) ||
              String(currentTripId) === String(trip.inviteCode)

            return (
              <div
                key={trip.id}
                onClick={() => handleSelectTrip(trip)}
                className={`group cursor-pointer rounded-xl px-3 py-2.5 text-xs transition flex items-center justify-between gap-2 ${
                  isCurrent
                    ? "bg-white border border-[#1A9E7A] shadow-xs text-[#1A9E7A] font-bold"
                    : "hover:bg-white/80 border border-transparent text-[#27272A]"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EDFAF4] text-[#1A9E7A]">
                      {trip.destination}
                    </span>
                    <span className="truncate font-semibold text-xs text-[#18181B]">
                      {trip.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8A8A93] flex items-center gap-1 truncate">
                    <Calendar className="size-3 shrink-0" />
                    <span>
                      {trip.startDate && trip.endDate
                        ? `${trip.startDate} ~ ${trip.endDate}`
                        : "일정 미정"}
                    </span>
                  </p>
                </div>
                <ChevronRight className="size-3.5 text-[#C8C8C0] group-hover:text-[#18181B] group-hover:translate-x-0.5 transition shrink-0" />
              </div>
            )
          })
        )}
      </div>

      {/* 3. 하단 고정: 사용자 프로필 & 마이페이지/설정 */}
      <div className="border-t border-[#E2E2DA]/80 p-3 bg-white/70 space-y-2">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E2E2DA]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-7 rounded-full bg-[#1A9E7A]/10 border border-[#1A9E7A]/30 flex items-center justify-center text-xs font-bold text-[#1A9E7A] shrink-0">
                  {user.nickname.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-bold text-[#18181B]">
                      {user.nickname}
                    </span>
                  </div>
                  <p className="truncate text-[10px] text-[#8A8A93]">{user.email}</p>
                </div>
              </div>

              {user.emailVerified ? (
                <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                  인증
                </span>
              ) : (
                <span
                  className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200"
                  title="마이페이지에서 이메일 인증을 진행할 수 있습니다."
                >
                  미인증
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-1 pt-0.5 text-xs text-[#6B6B72]">
              <button
                onClick={() => alert("마이페이지 및 계정 연동 설정은 준비 중입니다.")}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-slate-100 transition text-[11px]"
              >
                <Settings className="size-3.5" />
                <span>계정 설정</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition text-[11px]"
                title="로그아웃"
              >
                <LogOut className="size-3.5" />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            로그인하기
          </button>
        )}
      </div>
    </aside>
  )

  return (
    <>
      {/* 모바일 햄버거 토글 버튼 */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="flex size-9 items-center justify-center rounded-xl bg-white/95 border border-[#E2E2DA] shadow-sm text-[#18181B]"
          aria-label="사이드바 열기"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* 모바일 슬라이드 오버 드로어 */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative z-10 w-72 h-full bg-[#FAFAF8] shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-full bg-white/80 border border-[#E2E2DA] text-[#6B6B72]"
            >
              <X className="size-4" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* 데스크톱 고정 사이드바 */}
      <div className={`hidden lg:block h-screen shrink-0 ${className}`}>
        {sidebarContent}
      </div>
    </>
  )
}
