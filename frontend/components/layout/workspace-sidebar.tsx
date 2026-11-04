"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Ticket,
  ArrowRight,
  MapPin,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { authService, type UserResponse } from "@/lib/auth-service"
import { tripService, type TripResponse } from "@/lib/trip-service"
import { Tooltip } from "@/components/ui/tooltip"
import { showToast, showConfirm } from "@/components/ui/system-alert"
import { DateRangePicker, parseDateRangeInfo } from "@/components/ui/date-range-picker"

export interface WorkspaceSidebarProps {
  currentTripId?: string | number
  onOpenNewTripModal?: () => void
  variant?: "default" | "floating"
  className?: string
}

function getDurationLabel(start?: string, end?: string): string | null {
  if (!start || !end) return null
  const s = new Date(start)
  const e = new Date(end)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null
  const diffDays = Math.round(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "당일치기"
  return `${diffDays}박 ${diffDays + 1}일`
}

function formatShortDateRange(start?: string, end?: string): string {
  if (!start || !end) return "일정 미정"
  const sParts = start.split("-")
  const eParts = end.split("-")
  if (sParts.length === 3 && eParts.length === 3) {
    return `${sParts[0]}.${sParts[1]}.${sParts[2]} – ${eParts[1]}.${eParts[2]}`
  }
  return `${start} ~ ${end}`
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

export function WorkspaceSidebar({
  currentTripId,
  onOpenNewTripModal,
  variant = "default",
  className = "",
}: WorkspaceSidebarProps) {
  const router = useRouter()

  const [user, setUser] = useState<UserResponse | null>(null)
  const [trips, setTrips] = useState<TripResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // 초대코드 합류 모달 상태
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteInput, setInviteInput] = useState("")
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isVerifyingInvite, setIsVerifyingInvite] = useState(false)

  // 자체 새 여행 모달 상태 (onOpenNewTripModal prop이 없는 상세 페이지 등에서 사용)
  const [isInternalCreateOpen, setIsInternalCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDestination, setNewDestination] = useState("")
  const [newStartDate, setNewStartDate] = useState("2026-10-24")
  const [newEndDate, setNewEndDate] = useState("2026-10-27")
  const [showInternalDatePicker, setShowInternalDatePicker] = useState(false)
  const [isCreatingTrip, setIsCreatingTrip] = useState(false)

  function handleOpenAccountSettings() {
    showToast("마이페이지 및 계정 연동 설정은 준비 중입니다.", "info")
  }

  function handleConfirmLogout() {
    showConfirm("정말 로그아웃 하시겠습니까?", handleLogout)
  }

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

  // ESC 키로 모달 닫기 지원
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isInviteModalOpen) setIsInviteModalOpen(false)
        if (isInternalCreateOpen) setIsInternalCreateOpen(false)
      }
    }
    if (isInviteModalOpen || isInternalCreateOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isInviteModalOpen, isInternalCreateOpen])

  function toggleCollapse(collapsed: boolean) {
    setIsCollapsed(collapsed)
    try {
      localStorage.setItem("wandermap_sidebar_collapsed", String(collapsed))
    } catch {}
  }

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
    router.push("/")
    window.location.reload()
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
    setIsMobileOpen(false)
    if (onOpenNewTripModal) {
      onOpenNewTripModal()
    } else {
      setIsInternalCreateOpen(true)
    }
  }

  function handleOpenInviteModal() {
    setIsMobileOpen(false)
    setInviteInput("")
    setInviteError(null)
    setIsInviteModalOpen(true)
  }

  // 초대코드 유효성 검증 및 합류 처리 (엔터 지원)
  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault()
    const raw = inviteInput.trim()
    if (!raw) {
      setInviteError("초대코드 또는 초대 링크를 입력해 주세요.")
      return
    }

    // URL 형태일 경우 마지막 경로 세그먼트 추출
    const cleanUrl = raw.replace(/\/+$/, "")
    const code = cleanUrl.includes("/") ? cleanUrl.split("/").pop() || "" : cleanUrl

    if (code.length < 4 || /\s/.test(code)) {
      setInviteError("올바른 초대코드 형식이 아닙니다. 코드를 다시 확인해 주세요.")
      return
    }

    setIsVerifyingInvite(true)
    setInviteError(null)

    try {
      // 1. 초대코드로 여행 방 실존 여부 검증
      const tripInfo = await tripService.getTripByInviteCode(code)

      // 2. 로그인 유저가 있으면 즉시 멤버로 합류 요청
      if (user) {
        await tripService.joinTrip(code, user.id)
      }

      setIsInviteModalOpen(false)
      setInviteInput("")
      showToast(`'${tripInfo.title}' 여행 방에 합류했습니다!`, "success")
      router.push(`/trips/${tripInfo.inviteCode || tripInfo.id}`)
    } catch (err: any) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message
      setInviteError(
        serverMsg || "유효하지 않거나 만료된 초대코드입니다. 코드를 다시 확인해 주세요."
      )
    } finally {
      setIsVerifyingInvite(false)
    }
  }

  // 자체 새 여행 생성 처리
  async function handleInternalCreateTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newTitle.trim() || !newDestination.trim() || !newStartDate || !newEndDate) return

    setIsCreatingTrip(true)
    try {
      const created = await tripService.createTrip({
        title: newTitle.trim(),
        destination: newDestination.trim(),
        startDate: newStartDate,
        endDate: newEndDate,
        userId: user.id,
      })
      setIsInternalCreateOpen(false)
      setNewTitle("")
      setNewDestination("")
      await loadTrips(user.id)
      router.push(`/trips/${created.inviteCode || created.id}`)
    } catch (err: any) {
      showToast(err.response?.data?.error || "여행 계획 생성에 실패했습니다.", "error")
    } finally {
      setIsCreatingTrip(false)
    }
  }

  const isFloating = variant === "floating"

  const sidebarInner = (
    <aside
      className={`flex h-full flex-col justify-between text-[#18181B] select-none z-10 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] will-change-[width] overflow-hidden ${
        isFloating
          ? "rounded-3xl border border-[#E2E2DA]/90 bg-white/90 backdrop-blur-xl shadow-[0_12px_40px_rgb(0,0,0,0.06)]"
          : "border-r border-[#E2E2DA] bg-[#FBFBF9] shadow-xs"
      } ${isCollapsed ? "w-[74px]" : "w-80"}`}
    >
      {/* 1. 상단: 로고 & 새 여행 / 코드 합류 버튼 */}
      <div className="border-b border-[#E2E2DA]/70 px-4 pt-4 pb-4 transition-all duration-200">
        {isCollapsed ? (
          <div className="flex flex-col items-center w-full">
            <div className="flex h-10 items-center justify-center">
              <Tooltip content="사이드바 열기" side="right">
                <button
                  type="button"
                  onClick={() => toggleCollapse(false)}
                  className="relative flex size-10 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-sm shadow-[#1A9E7A]/20 hover:scale-105 transition group cursor-pointer"
                  aria-label="사이드바 열기"
                >
                  <Compass className="size-5 transition-all duration-150 group-hover:opacity-0 group-hover:scale-75" />
                  <PanelLeftOpen className="size-5 absolute opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150" />
                </button>
              </Tooltip>
            </div>

            <div className="w-8 border-b border-[#E2E2DA] my-3" />

            <Tooltip content="새 여행" side="right">
              <button
                type="button"
                onClick={handleOpenCreateTrip}
                className="flex size-10 items-center justify-center rounded-xl bg-[#1A9E7A] text-white hover:bg-[#158063] transition shadow-xs group cursor-pointer"
                aria-label="새 여행"
              >
                <Plus className="size-5 group-hover:scale-110 transition" />
              </button>
            </Tooltip>
          </div>
        ) : (
          <>
            <div className="flex h-10 items-center justify-between">
              <div
                onClick={handleNavigateHome}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                <span className="flex size-10 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-sm shadow-[#1A9E7A]/20 group-hover:scale-105 transition shrink-0">
                  <Compass className="size-5" />
                </span>
                <span className="text-xl font-black tracking-tight text-[#18181B]">
                  WanderMap
                </span>
              </div>

              <Tooltip content="접기" side="right">
                <button
                  type="button"
                  onClick={() => toggleCollapse(true)}
                  className="flex size-8 items-center justify-center rounded-xl hover:bg-slate-200/60 text-[#6B6B72] hover:text-[#18181B] transition cursor-pointer"
                  aria-label="접기"
                >
                  <PanelLeftClose className="size-4.5" />
                </button>
              </Tooltip>
            </div>

            {/* 큼직하고 직관적인 액션 버튼 */}
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={handleOpenCreateTrip}
                className="flex items-center justify-center gap-1.5 h-11 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] px-4 text-sm font-bold text-white shadow-sm shadow-[#1A9E7A]/20 transition cursor-pointer group"
              >
                <Plus className="size-4 group-hover:rotate-90 transition-transform duration-200" />
                <span>새 여행</span>
              </button>

              <button
                type="button"
                onClick={handleOpenInviteModal}
                className="flex items-center gap-1.5 h-11 rounded-2xl border border-[#E2E2DA] bg-white hover:border-[#1A9E7A] hover:text-[#1A9E7A] px-3.5 text-sm font-bold text-[#27272A] transition cursor-pointer"
              >
                <Ticket className="size-4 text-[#1A9E7A]" />
                <span>코드 합류</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* 2. 중앙: 내 여행 목록 */}
      <div
        className={`flex-1 overflow-y-auto custom-scrollbar ${
          isCollapsed ? "p-2.5 space-y-2.5 flex flex-col items-center" : "p-4 space-y-3"
        }`}
      >
        {!isCollapsed && (
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="text-xs font-extrabold text-[#52525B]">
              내 여행 ({trips.length})
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="py-10 text-center text-sm text-[#8A8A93]">
            {isCollapsed ? "..." : "불러오는 중..."}
          </div>
        ) : trips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E2E2DA] bg-white/60 p-6 text-center space-y-2">
            <Plane className="size-6 text-[#C8C8C0] mx-auto" />
            {!isCollapsed && (
              <p className="text-sm font-semibold text-[#8A8A93]">아직 등록된 여행이 없어요</p>
            )}
          </div>
        ) : (
          trips.map((trip) => {
            const isCurrent =
              String(currentTripId) === String(trip.id) ||
              String(currentTripId) === String(trip.inviteCode)
            const durationLabel = getDurationLabel(trip.startDate, trip.endDate)
            const cleanTitle = formatCleanTripTitle(trip.title, trip.destination)

            if (isCollapsed) {
              return (
                <Tooltip
                  key={trip.id}
                  content={`${trip.destination} · ${cleanTitle}`}
                  side="right"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectTrip(trip)}
                    className={`flex size-10 items-center justify-center rounded-xl text-sm font-extrabold transition shrink-0 cursor-pointer ${
                      isCurrent
                        ? "bg-[#1A9E7A] text-white shadow-sm shadow-[#1A9E7A]/30"
                        : "bg-white border border-[#E2E2DA] hover:border-[#1A9E7A] text-[#27272A]"
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
                className={`group relative cursor-pointer rounded-2xl border p-3.5 transition-all duration-150 animate-in fade-in ${
                  isCurrent
                    ? "bg-[#EDFAF4]/90 border-[#1A9E7A] shadow-sm ring-1 ring-[#1A9E7A]/20"
                    : "bg-white hover:bg-white border-[#E2E2DA]/90 hover:border-[#1A9E7A]/60 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-extrabold shrink-0 ${
                        isCurrent
                          ? "bg-[#1A9E7A] text-white"
                          : "bg-[#EDFAF4] text-[#1A9E7A]"
                      }`}
                    >
                      <MapPin className="size-3" />
                      {trip.destination}
                    </span>
                    {durationLabel && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[#52525B] text-xs font-bold shrink-0">
                        {durationLabel}
                      </span>
                    )}
                  </div>

                  <ChevronRight className="size-4 text-[#C8C8C0] group-hover:text-[#1A9E7A] group-hover:translate-x-0.5 transition shrink-0" />
                </div>

                <h4 className="truncate font-bold text-[15px] text-[#18181B] group-hover:text-[#1A9E7A] transition">
                  {cleanTitle}
                </h4>

                <div className="mt-2.5 pt-2.5 border-t border-dashed border-[#E2E2DA] flex items-center gap-1.5 text-xs text-[#6B6B72] font-medium">
                  <Calendar className="size-3.5 text-[#1A9E7A] shrink-0" />
                  <span className="truncate">{formatShortDateRange(trip.startDate, trip.endDate)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 3. 하단 고정: 프로필 & 설정/로그아웃 */}
      <div
        className={`border-t border-[#E2E2DA]/80 bg-white/80 transition-all duration-200 ${
          isCollapsed ? "p-3 flex flex-col items-center" : "p-4"
        }`}
      >
        {user ? (
          isCollapsed ? (
            <Tooltip content={`${user.nickname} (계정 설정)`} side="right">
              <button
                type="button"
                onClick={handleOpenAccountSettings}
                className="size-10 rounded-full bg-[#1A9E7A]/10 border border-[#1A9E7A]/30 flex items-center justify-center text-sm font-bold text-[#1A9E7A] hover:bg-[#1A9E7A] hover:text-white transition cursor-pointer"
              >
                {user.nickname ? user.nickname.charAt(0) : "W"}
              </button>
            </Tooltip>
          ) : (
            <div className="flex items-center justify-between gap-2 animate-in fade-in duration-150">
              <div
                onClick={handleOpenAccountSettings}
                className="flex items-center gap-3 min-w-0 flex-1 p-1.5 rounded-xl hover:bg-slate-100/80 transition cursor-pointer group"
                title="계정 설정"
              >
                <div className="size-10 rounded-2xl bg-[#EDFAF4] border border-[#1A9E7A]/30 flex items-center justify-center text-sm font-black text-[#1A9E7A] group-hover:bg-[#1A9E7A] group-hover:text-white transition shrink-0">
                  {user.nickname ? user.nickname.charAt(0) : "W"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold text-[#18181B]">
                      {user.nickname}
                    </span>
                  </div>
                  <p className="truncate text-xs text-[#8A8A93]">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Tooltip content="계정 설정" side="top">
                  <button
                    type="button"
                    onClick={handleOpenAccountSettings}
                    className="flex size-9 items-center justify-center rounded-xl text-[#6B6B72] hover:bg-slate-100 hover:text-[#18181B] transition cursor-pointer"
                    aria-label="계정 설정"
                  >
                    <Settings className="size-4.5" />
                  </button>
                </Tooltip>
                <Tooltip content="로그아웃" side="top">
                  <button
                    type="button"
                    onClick={handleConfirmLogout}
                    className="flex size-9 items-center justify-center rounded-xl text-[#6B6B72] hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                    aria-label="로그아웃"
                  >
                    <LogOut className="size-4.5" />
                  </button>
                </Tooltip>
              </div>
            </div>
          )
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition"
          >
            {isCollapsed ? <UserIcon className="size-4.5 mx-auto" /> : "로그인하기"}
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
          className="flex size-10 items-center justify-center rounded-xl bg-white/95 border border-[#E2E2DA] shadow-sm text-[#18181B]"
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
          <div className="relative z-10 w-80 h-full bg-white shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 z-20 flex size-8 items-center justify-center rounded-full bg-white/80 border border-[#E2E2DA] text-[#6B6B72]"
            >
              <X className="size-4.5" />
            </button>
            {sidebarInner}
          </div>
        </div>
      )}

      {/* 데스크톱 사이드바 */}
      <div
        className={`hidden lg:block h-screen shrink-0 transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)] ${
          isFloating
            ? isCollapsed
              ? "w-[86px] p-3 pr-0"
              : "w-[332px] p-3 pr-0"
            : isCollapsed
              ? "w-[74px]"
              : "w-80"
        } ${className}`}
      >
        {sidebarInner}
      </div>

      {/* =====================================================================
          모달 1: 초대코드로 여행 합류 모달 (바깥 클릭 닫기 + 엔터 시 실시간 유효성 검증)
         ===================================================================== */}
      {isInviteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsInviteModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-[#E2E2DA] bg-white p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E2DA] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#EDFAF4] text-[#1A9E7A]">
                  <Ticket className="size-5" />
                </span>
                <h3 className="text-lg font-extrabold text-[#18181B]">초대코드로 합류하기</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="flex size-9 items-center justify-center rounded-full hover:bg-slate-100 transition text-[#6B6B72] cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#27272A] block">
                  초대코드 또는 초대 링크
                </label>
                <input
                  type="text"
                  value={inviteInput}
                  onChange={(e) => {
                    setInviteInput(e.target.value)
                    if (inviteError) setInviteError(null)
                  }}
                  placeholder="공유받은 코드나 링크를 붙여넣고 Enter"
                  className={`w-full h-13 rounded-2xl border px-4 text-base font-medium outline-none transition ${
                    inviteError
                      ? "border-rose-400 bg-rose-50/40 focus:border-rose-500"
                      : "border-[#E2E2DA] bg-[#F7F7F2] focus:bg-white focus:border-[#1A9E7A]"
                  }`}
                  autoFocus
                />

                {inviteError && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-rose-600 animate-in fade-in duration-150">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isVerifyingInvite || !inviteInput.trim()}
                className="w-full flex items-center justify-center gap-2 h-13 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] text-base font-extrabold text-white transition shadow-md shadow-[#1A9E7A]/20 disabled:opacity-40 cursor-pointer"
              >
                <span>{isVerifyingInvite ? "코드 확인 중..." : "여행 방 입장하기"}</span>
                <ArrowRight className="size-4.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          모달 2: 자체 새 여행 만들기 모달 (상세 페이지 등에서 열릴 때 사용)
         ===================================================================== */}
      {isInternalCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsInternalCreateOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-[#E2E2DA] bg-white p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E2DA] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#EDFAF4] text-[#1A9E7A]">
                  <Plane className="size-5" />
                </span>
                <h3 className="text-lg font-extrabold text-[#18181B]">새 여행 계획 만들기</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInternalCreateOpen(false)}
                className="flex size-9 items-center justify-center rounded-full hover:bg-slate-100 transition text-[#6B6B72] cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleInternalCreateTrip} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-[#27272A] block mb-1.5">
                  여행 제목
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 제주도 동쪽 힐링 여행 🌴"
                  className="w-full h-12 rounded-2xl border border-[#E2E2DA] bg-[#F7F7F2] focus:bg-white px-4 text-base font-medium outline-none focus:border-[#1A9E7A] transition"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-bold text-[#27272A] block mb-1.5">
                  목적지 (도시 / 지역)
                </label>
                <input
                  type="text"
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="예: 오사카, 제주도, 도쿄"
                  className="w-full h-12 rounded-2xl border border-[#E2E2DA] bg-[#F7F7F2] focus:bg-white px-4 text-base font-medium outline-none focus:border-[#1A9E7A] transition"
                  required
                />
              </div>

              {/* 재사용 DateRangePicker 적용 */}
              <div className="relative">
                <label className="text-sm font-bold text-[#27272A] block mb-1.5">
                  여행 일정
                </label>
                {(() => {
                  const internalRangeInfo = parseDateRangeInfo(newStartDate, newEndDate)
                  return (
                    <button
                      type="button"
                      onClick={() => setShowInternalDatePicker(!showInternalDatePicker)}
                      className={`w-full flex items-center justify-between h-12 px-4 rounded-2xl border text-base transition cursor-pointer ${
                        newStartDate && newEndDate
                          ? "bg-[#EDFAF4]/60 border-[#1A9E7A] text-[#18181B] font-bold"
                          : "bg-[#F7F7F2] border-[#E2E2DA] text-[#52525B] hover:border-[#1A9E7A]/60 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="size-4.5 text-[#1A9E7A]" />
                        {internalRangeInfo ? (
                          <span>{internalRangeInfo.text}</span>
                        ) : (
                          <span className="text-[#8A8A93]">출발일 ~ 도착일 선택</span>
                        )}
                      </div>
                      {internalRangeInfo?.duration && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#1A9E7A] text-white text-xs font-extrabold">
                          {internalRangeInfo.duration}
                        </span>
                      )}
                    </button>
                  )
                })()}

                <DateRangePicker
                  isOpen={showInternalDatePicker}
                  onClose={() => setShowInternalDatePicker(false)}
                  startDate={newStartDate}
                  endDate={newEndDate}
                  onSelectRange={(start, end) => {
                    setNewStartDate(start)
                    setNewEndDate(end)
                  }}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreatingTrip}
                  className="w-full h-13 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] text-base font-extrabold text-white transition shadow-md shadow-[#1A9E7A]/20 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingTrip ? "계획 생성 중..." : "여행 계획 만들기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
