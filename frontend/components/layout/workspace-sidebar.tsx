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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { authService, type UserResponse } from "@/lib/auth-service"
import { tripService, type TripResponse } from "@/lib/trip-service"
import { Tooltip } from "@/components/ui/tooltip"
import { AccountSettingsModal } from "@/components/user/account-settings-modal"

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
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

  // 1. 세션 및 접힘 상태 로드
  useEffect(() => {
    const session = authService.getSession()
    setUser(session)
    if (session) {
      loadTrips(session.id)
    }

    try {
      const saved = localStorage.getItem("wandermap_sidebar_collapsed")
      if (saved !== null) {
        setIsCollapsed(saved === "true")
      }
    } catch {}
  }, [])

  function toggleCollapse(collapsed: boolean) {
    setIsCollapsed(collapsed)
    try {
      localStorage.setItem("wandermap_sidebar_collapsed", String(collapsed))
    } catch {}
  }

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

  function handleOpenCreateTrip() {
    if (onOpenNewTripModal) {
      onOpenNewTripModal()
    } else {
      router.push("/")
    }
    setIsMobileOpen(false)
  }

  // 데스크톱 사이드바 내부 컨텐츠 (Gemini 스타일 부드러운 반응성)
  const sidebarInner = (
    <aside
      className={`flex h-full flex-col justify-between border-r border-[#E2E2DA] bg-white text-[#18181B] select-none shadow-xs z-10 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] will-change-[width] overflow-hidden ${
        isCollapsed ? "w-[68px]" : "w-72"
      }`}
    >
      {/* 1. 상단: 브랜드 로고 & 새 여행 계획 버튼 (펼쳤을 때와 접었을 때 Y축이 1px 오차 없이 일치) */}
      <div className="border-b border-[#E2E2DA]/80 px-4 pt-4 pb-3.5 transition-all duration-200">
        {isCollapsed ? (
          /* [접힌 상태]: Gemini 스타일 — 평소엔 로고만 보이고, 호버 시 사이드바 열기 아이콘으로 부드럽게 전환 */
          <div className="flex flex-col items-center w-full">
            <div className="flex h-9 items-center justify-center">
              <Tooltip content="사이드바 열기" side="right">
                <button
                  type="button"
                  onClick={() => toggleCollapse(false)}
                  className="relative flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-sm shadow-[#1A9E7A]/20 hover:scale-105 transition group cursor-pointer"
                  aria-label="사이드바 열기"
                >
                  <Compass className="size-4.5 transition-all duration-150 group-hover:opacity-0 group-hover:scale-75" />
                  <PanelLeftOpen className="size-4.5 absolute opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150" />
                </button>
              </Tooltip>
            </div>

            <div className="w-7 border-b border-[#E2E2DA] my-2.5" />

            <Tooltip content="새 여행 계획 만들기" side="right">
              <button
                type="button"
                onClick={handleOpenCreateTrip}
                className="flex size-9 items-center justify-center rounded-xl bg-[#EDFAF4] text-[#1A9E7A] hover:bg-[#1A9E7A] hover:text-white transition shadow-xs group cursor-pointer"
                aria-label="새 여행 계획 만들기"
              >
                <Plus className="size-4.5 group-hover:scale-110 transition" />
              </button>
            </Tooltip>
          </div>
        ) : (
          /* [펼쳐진 상태]: 브랜드 로고 + 사이드바 접기 버튼 (Y축 높이 h-9로 접힌 상태와 동일선상 배치) */
          <>
            <div className="flex h-9 items-center justify-between">
              <div
                onClick={handleNavigateHome}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <span className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-sm shadow-[#1A9E7A]/20 group-hover:scale-105 transition shrink-0">
                  <Compass className="size-4.5" />
                </span>
                <span className="text-lg font-black tracking-tight text-[#18181B] truncate animate-in fade-in duration-150">
                  WanderMap
                </span>
              </div>

              <Tooltip content="사이드바 접기" side="right">
                <button
                  type="button"
                  onClick={() => toggleCollapse(true)}
                  className="flex size-7 items-center justify-center rounded-lg hover:bg-slate-100 text-[#6B6B72] hover:text-[#18181B] transition cursor-pointer"
                  aria-label="사이드바 접기"
                >
                  <PanelLeftClose className="size-4.5" />
                </button>
              </Tooltip>
            </div>

            <button
              onClick={handleOpenCreateTrip}
              className="mt-3.5 w-full flex items-center justify-between gap-2 rounded-2xl bg-white border border-[#E2E2DA] hover:border-[#1A9E7A] px-3.5 py-2.5 text-xs font-bold text-[#18181B] hover:shadow-sm transition group cursor-pointer animate-in fade-in duration-150"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="flex size-6 items-center justify-center rounded-lg bg-[#EDFAF4] text-[#1A9E7A] group-hover:bg-[#1A9E7A] group-hover:text-white transition shrink-0">
                  <Plus className="size-3.5" />
                </span>
                <span className="truncate">새 여행 계획 만들기</span>
              </div>
            </button>
          </>
        )}
      </div>

      {/* 2. 중앙: 내 여행 동선 목록 (무한/독립 스크롤) */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar ${isCollapsed ? "p-2 space-y-2 flex flex-col items-center" : "p-3 space-y-1.5"}`}>
        {!isCollapsed && (
          <div className="flex items-center justify-between px-2 pt-1 pb-1.5 text-[11px] font-bold text-[#8A8A93] uppercase animate-in fade-in duration-150">
            <span>내 여행 목록</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E2E2DA]/60 text-[#6B6B72]">
              {trips.length}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-xs text-[#8A8A93]">
            {isCollapsed ? "..." : "목록 불러오는 중..."}
          </div>
        ) : trips.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#8A8A93] space-y-2">
            <Plane className="size-5 text-[#C8C8C0] mx-auto" />
            {!isCollapsed && <p className="text-[11px]">아직 계획 중인 여행이 없어요.</p>}
          </div>
        ) : (
          trips.map((trip) => {
            const isCurrent =
              String(currentTripId) === String(trip.id) ||
              String(currentTripId) === String(trip.inviteCode)

            if (isCollapsed) {
              return (
                <Tooltip
                  key={trip.id}
                  content={`${trip.destination} · ${trip.title}`}
                  side="right"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectTrip(trip)}
                    className={`flex size-9 items-center justify-center rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                      isCurrent
                        ? "bg-[#EDFAF4] text-[#1A9E7A] border border-[#1A9E7A] shadow-xs"
                        : "hover:bg-slate-100 text-[#4A5568]"
                    }`}
                  >
                    {trip.destination.charAt(0)}
                  </button>
                </Tooltip>
              )
            }

            return (
              <div
                key={trip.id}
                onClick={() => handleSelectTrip(trip)}
                className={`group cursor-pointer rounded-xl px-3 py-2.5 text-xs transition flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
                  isCurrent
                    ? "bg-[#EDFAF4] border border-[#1A9E7A] shadow-xs text-[#1A9E7A] font-bold"
                    : "hover:bg-slate-50 border border-transparent text-[#27272A]"
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

      {/* 3. 하단 고정: 사용자 프로필 & 계정 설정 모달 트리거 */}
      <div className={`border-t border-[#E2E2DA]/80 bg-white transition-all duration-200 ${isCollapsed ? "p-3 flex flex-col items-center" : "p-3.5 space-y-2"}`}>
        {user ? (
          isCollapsed ? (
            <Tooltip content={`${user.nickname} (계정 설정)`} side="right">
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(true)}
                className="size-9 rounded-full bg-[#1A9E7A]/10 border border-[#1A9E7A]/30 flex items-center justify-center text-xs font-bold text-[#1A9E7A] hover:bg-[#1A9E7A] hover:text-white transition cursor-pointer"
              >
                {user.nickname ? user.nickname.charAt(0) : "W"}
              </button>
            </Tooltip>
          ) : (
            <div className="space-y-2 animate-in fade-in duration-150">
              <div
                onClick={() => setIsAccountModalOpen(true)}
                className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E2E2DA] hover:border-[#1A9E7A]/60 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-7.5 rounded-full bg-[#1A9E7A]/10 border border-[#1A9E7A]/30 flex items-center justify-center text-xs font-bold text-[#1A9E7A] group-hover:bg-[#1A9E7A] group-hover:text-white transition shrink-0">
                    {user.nickname ? user.nickname.charAt(0) : "W"}
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
                  >
                    미인증
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-1 pt-0.5 text-xs text-[#6B6B72]">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-slate-100 transition text-[11px] font-semibold cursor-pointer"
                >
                  <Settings className="size-3.5" />
                  <span>계정 설정</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition text-[11px] font-semibold cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>로그아웃</span>
                </button>
              </div>
            </div>
          )
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
          >
            {isCollapsed ? <UserIcon className="size-4 mx-auto" /> : "로그인하기"}
          </button>
        )}
      </div>

      {/* 계정 설정 전용 모달 */}
      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        user={user}
        onLogout={handleLogout}
        onUpdateNickname={async (newNickname) => {
          if (user) {
            const updated = { ...user, nickname: newNickname }
            authService.saveSession(updated)
            setUser(updated)
          }
        }}
      />
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
          <div className="relative z-10 w-72 h-full bg-white shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-full bg-white/80 border border-[#E2E2DA] text-[#6B6B72]"
            >
              <X className="size-4" />
            </button>
            {sidebarInner}
          </div>
        </div>
      )}

      {/* 데스크톱 고정 사이드바 (부드러운 GPU 가속 너비 전환) */}
      <div
        className={`hidden lg:block h-screen shrink-0 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
          isCollapsed ? "w-[68px]" : "w-72"
        } ${className}`}
      >
        {sidebarInner}
      </div>
    </>
  )
}
