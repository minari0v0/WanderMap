"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Compass,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Plane,
  ArrowRight,
  Plus,
  Calendar,
  X,
} from "lucide-react"
import { GradientBackground } from "@/components/ui/jade-sky"
import { Hero } from "@/components/ui/animated-hero"
import { Badge } from "@/components/ui/badge"
import { authService, type UserResponse } from "@/lib/auth-service"
import { tripService } from "@/lib/trip-service"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { AiPromptHub } from "@/components/home/ai-prompt-hub"

export default function HomePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null)
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  // 수동 생성 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [destination, setDestination] = useState("")
  const [startDate, setStartDate] = useState("2026-10-24")
  const [endDate, setEndDate] = useState("2026-10-27")
  const [isCreating, setIsCreating] = useState(false)

  // 1. 세션 확인
  useEffect(() => {
    const session = authService.getSession()
    setCurrentUser(session)
    setIsAuthChecked(true)
  }, [])

  // 2. 수동 새 여행 만들기
  async function handleCreateTrip(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser || !title.trim() || !destination.trim() || !startDate || !endDate) return

    setIsCreating(true)
    try {
      const newTrip = await tripService.createTrip({
        title: title.trim(),
        destination: destination.trim(),
        startDate,
        endDate,
        userId: currentUser.id,
      })
      setIsCreateModalOpen(false)
      setTitle("")
      setDestination("")
      router.push(`/trips/${newTrip.inviteCode || newTrip.id}`)
    } catch (err: any) {
      alert(err.response?.data?.error || "여행 방 생성에 실패했습니다.")
    } finally {
      setIsCreating(false)
    }
  }

  if (!isAuthChecked) {
    return <div className="min-h-screen bg-[#F7F7F2]" />
  }

  // =========================================================================
  // CASE A: 로그인 유저 화면 (ChatGPT / Gemini 스타일 대화형 기획 허브)
  // =========================================================================
  if (currentUser) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#F7F7F2] font-sans">
        {/* 공통 좌측 사이드바 */}
        <WorkspaceSidebar onOpenNewTripModal={() => setIsCreateModalOpen(true)} />

        {/* 중앙 대화형 메인 영역 */}
        <main className="flex-1 h-full overflow-y-auto bg-gradient-to-b from-[#FAFAF8] via-white/80 to-[#EDFAF4]/20 custom-scrollbar">
          <AiPromptHub
            currentUser={currentUser}
            onOpenManualModal={() => setIsCreateModalOpen(true)}
          />
        </main>

        {/* 수동 새 여행 만들기 모달 */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md rounded-3xl border border-[#E2E2DA] bg-white p-6 sm:p-8 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E2DA] pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-[#EDFAF4] text-[#1A9E7A]">
                    <Plane className="size-4" />
                  </span>
                  <h3 className="text-base font-bold text-[#18181B]">새 여행 방 만들기</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex size-8 items-center justify-center rounded-full hover:bg-slate-100 transition text-[#6B6B72]"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTrip} className="space-y-4 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-[#6B6B72] uppercase block mb-1">
                    여행 제목
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 제주도 동쪽 힐링 코스 🌴"
                    className="w-full rounded-xl border border-[#E2E2DA] bg-slate-50/70 px-3.5 py-2.5 text-xs outline-none focus:border-[#1A9E7A] transition"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#6B6B72] uppercase block mb-1">
                    목적지 (도시 / 지역)
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="예: 오사카, 제주특별자치도, 도쿄"
                    className="w-full rounded-xl border border-[#E2E2DA] bg-slate-50/70 px-3.5 py-2.5 text-xs outline-none focus:border-[#1A9E7A] transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B72] uppercase block mb-1">
                      시작일 (선택)
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E2DA] bg-slate-50/70 px-3 py-2 text-xs outline-none focus:border-[#1A9E7A] transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B72] uppercase block mb-1">
                      종료일 (선택)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E2DA] bg-slate-50/70 px-3 py-2 text-xs outline-none focus:border-[#1A9E7A] transition"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full rounded-xl bg-[#1A9E7A] py-3 text-xs font-bold text-white hover:bg-[#158063] transition shadow-md shadow-[#1A9E7A]/20 disabled:opacity-50"
                  >
                    {isCreating ? "방 생성 중..." : "여행 방 개설하기"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // =========================================================================
  // CASE B: 미로그인 유저 화면 (감성적인 토스식 서비스 소개 랜딩 페이지)
  // =========================================================================
  return (
    <GradientBackground className="min-h-screen text-[#18181B] font-sans flex flex-col justify-between">
      <div className="flex flex-col min-h-screen justify-between">
        {/* 상단 앱 네비게이션 헤더 */}
        <header className="max-w-6xl w-full mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-sm shadow-[#1A9E7A]/20">
              <Compass className="size-4.5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#18181B]">WanderMap</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.push("/login")}
              className="rounded-xl border border-[#E2E2DA] bg-white/90 backdrop-blur-sm px-4 py-2 text-xs font-semibold hover:bg-white transition text-[#18181B]"
            >
              로그인
            </button>
            <button
              onClick={() => router.push("/login?mode=signup")}
              className="rounded-xl bg-[#1A9E7A] px-4 py-2 text-xs font-bold text-white hover:bg-[#158063] transition shadow-sm"
            >
              회원가입
            </button>
          </div>
        </header>

        {/* 메인 랜딩 영역 */}
        <main className="max-w-6xl w-full mx-auto px-6 py-6 md:py-12 flex-1 flex flex-col justify-center">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-8 items-center">
            {/* 좌측: 타이틀 및 액션 */}
            <Hero />

            {/* 우측: 실제 여행 워크스페이스 목업 카드 */}
            <div className="relative">
              <div className="relative rounded-3xl border border-[#E2E2DA] bg-white/95 backdrop-blur-md p-6 shadow-xl space-y-4">
                {/* 목업 헤더 */}
                <div className="flex items-center justify-between border-b border-[#E2E2DA]/70 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-[#EDFAF4] text-[#1A9E7A]">
                      <Plane className="size-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-[#18181B]">제주도 동쪽 힐링 코스 🌴</h4>
                      <p className="text-[11px] text-[#6B6B72]">1일차 일정 · 3명 참여 중</p>
                    </div>
                  </div>
                  <Badge variant="live">실시간 투표 중</Badge>
                </div>

                {/* 실시간 투표 진행 카드 */}
                <div className="rounded-2xl border border-[#F3E2B8] bg-[#FFFBF0]/70 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-[#9A6B00]">카페 / 디저트</span>
                      <h5 className="text-sm font-bold text-[#18181B]">런던 베이글 뮤지엄 제주</h5>
                      <p className="text-[11px] text-[#6B6B72] flex items-center gap-1">
                        <MapPin className="size-3 text-[#1A9E7A]" /> 제주시 구좌읍 동복리
                      </p>
                    </div>
                    <Badge variant="voting">투표 진행 중</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-[#1A9E7A]/40 bg-[#EDFAF4] py-2 text-xs font-bold text-[#1A9E7A]">
                      <ThumbsUp className="size-3.5" /> 찬성 2
                    </div>
                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E2E2DA] bg-white py-2 text-xs font-semibold text-[#6B6B72]">
                      <ThumbsDown className="size-3.5" /> 반대 0
                    </div>
                  </div>

                  <p className="text-center text-[10px] font-semibold text-[#1A9E7A]">
                    ✓ 과반수(2/3) 달성 · 동선 자동 확정 대기
                  </p>
                </div>

                {/* 확정된 동선 카드 */}
                <div className="rounded-2xl border border-[#E2E2DA] bg-white p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-[#1A9E7A] text-white text-xs font-bold">
                      2
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-[#18181B]">비자림 숲길 산책</h5>
                      <p className="text-[10px] text-[#6B6B72]">차량 15분 이동</p>
                    </div>
                  </div>
                  <Badge variant="confirmed">확정됨</Badge>
                </div>

                {/* 시작 버튼 */}
                <button
                  onClick={() => router.push("/login")}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  <span>지금 바로 시작하기</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* 푸터 */}
        <footer className="w-full border-t border-[#E2E2DA]/80 bg-white/50 py-5 text-center text-xs text-[#6B6B72] backdrop-blur-md">
          <p>© 2026 WanderMap. All rights reserved.</p>
        </footer>
      </div>
    </GradientBackground>
  )
}
