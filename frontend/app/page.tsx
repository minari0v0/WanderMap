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
  LogOut,
  Calendar,
  Users,
  Copy,
  Check,
  Sparkles,
  X,
} from "lucide-react"
import { GradientBackground } from "@/components/ui/jade-sky"
import { Hero } from "@/components/ui/animated-hero"
import { Badge } from "@/components/ui/badge"
import { authService, type UserResponse } from "@/lib/auth-service"
import { tripService, type TripResponse } from "@/lib/trip-service"

export default function HomePage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null)
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  // 로그인 상태일 때의 데이터 및 모달 상태
  const [myTrips, setMyTrips] = useState<TripResponse[]>([])
  const [isLoadingTrips, setIsLoadingTrips] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // 여행 생성 폼 상태
  const [title, setTitle] = useState("")
  const [destination, setDestination] = useState("")
  const [startDate, setStartDate] = useState("2026-10-24")
  const [endDate, setEndDate] = useState("2026-10-27")
  const [isCreating, setIsCreating] = useState(false)

  // 초대 코드 참여 상태
  const [inviteCodeInput, setInviteCodeInput] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  // 1. 세션 확인 및 사용자 로드
  useEffect(() => {
    const session = authService.getSession()
    setCurrentUser(session)
    setIsAuthChecked(true)

    if (session) {
      loadMyTrips(session.id)
    }
  }, [])

  // 2. 내 여행 목록 로드
  async function loadMyTrips(userId: number) {
    setIsLoadingTrips(true)
    try {
      const trips = await tripService.getMyTrips(userId)
      setMyTrips(trips)
    } catch (err) {
      console.warn("내 여행 목록 로드 실패, 빈 목록 유지:", err)
      setMyTrips([])
    } finally {
      setIsLoadingTrips(false)
    }
  }

  // 3. 로그아웃 처리
  function handleLogout() {
    authService.clearSession()
    setCurrentUser(null)
    setMyTrips([])
    router.refresh()
  }

  // 4. 새 여행 만들기
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
      // 생성된 방으로 즉시 이동
      router.push(`/trips/${newTrip.inviteCode}`)
    } catch (err: any) {
      alert(err.response?.data?.error || "여행 방 생성에 실패했습니다.")
    } finally {
      setIsCreating(false)
    }
  }

  // 5. 초대 코드로 참여하기
  async function handleJoinWithCode(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser || !inviteCodeInput.trim()) return

    setIsJoining(true)
    setJoinError(null)
    try {
      const code = inviteCodeInput.trim()
      const joinedTrip = await tripService.joinTrip(code, currentUser.id)
      router.push(`/trips/${joinedTrip.inviteCode}`)
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "유효하지 않은 초대 코드입니다."
      setJoinError(msg)
    } finally {
      setIsJoining(false)
    }
  }

  // 6. 초대 코드 클립보드 복사
  function copyInviteLink(code: string) {
    const link = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(link)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (!isAuthChecked) {
    return <div className="min-h-screen bg-[#F7F7F2]" />
  }

  // =========================================================================
  // CASE A: 로그인 유저 화면 (실제 서비스 이용 가능한 메인 홈페이지)
  // =========================================================================
  if (currentUser) {
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

            {/* 사용자 프로필 및 액션 */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E2E2DA] bg-white/80 backdrop-blur-sm text-xs">
                <span className="font-bold text-[#18181B]">{currentUser.nickname}</span>
                <span className="text-[#8A8A93]">({currentUser.email})</span>
                {currentUser.emailVerified ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    인증됨
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200/80"
                    title="마이페이지에서 이메일 인증을 진행할 수 있습니다."
                  >
                    이메일 미인증
                  </span>
                )}
              </div>

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#1A9E7A] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#158063] transition shadow-sm"
              >
                <Plus className="size-3.5" />
                <span>새 여행 만들기</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-xl border border-[#E2E2DA] bg-white/90 px-3 py-2 text-xs font-semibold text-[#6B6B72] hover:text-[#18181B] hover:bg-white transition"
                title="로그아웃"
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </div>
          </header>

          {/* 메인 서비스 콘텐츠 */}
          <main className="max-w-6xl w-full mx-auto px-6 py-6 flex-1 space-y-8">
            {/* 환영 배너 & 퀵 액션 카드 */}
            <div className="rounded-3xl border border-[#E2E2DA] bg-white/90 backdrop-blur-md p-6 sm:p-8 shadow-sm space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">👋</span>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#18181B]">
                    {currentUser.nickname}님, 반가워요!
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-[#6B6B72]">
                  친구들과 함께 새로운 여행 일정을 만들거나 초대 코드로 방에 참여해 실시간으로 동선을 조율해보세요.
                </p>
              </div>

              {/* 퀵 액션 2분할 카드 */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                {/* 1. 새 여행 방 만들기 카드 */}
                <div
                  onClick={() => setIsCreateModalOpen(true)}
                  className="group relative cursor-pointer rounded-2xl border border-[#1A9E7A]/30 bg-gradient-to-br from-[#EDFAF4] to-white p-5 hover:border-[#1A9E7A] hover:shadow-md transition duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#1A9E7A] text-white shadow-sm shadow-[#1A9E7A]/30 group-hover:scale-105 transition">
                      <Plane className="size-5" />
                    </span>
                    <span className="text-xs font-bold text-[#1A9E7A] flex items-center gap-1">
                      방 만들기 <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition" />
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#18181B] mb-1">새로운 여행 일정 시작</h3>
                  <p className="text-xs text-[#6B6B72]">
                    목적지와 일정을 입력하면 3초 만에 나만의 여행 방과 초대 링크가 생성됩니다.
                  </p>
                </div>

                {/* 2. 초대 코드로 참여하기 카드 */}
                <div className="rounded-2xl border border-[#E2E2DA] bg-white p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <Users className="size-4" />
                    </span>
                    <h3 className="text-sm font-bold text-[#18181B]">초대 코드로 방 참여하기</h3>
                  </div>
                  <form onSubmit={handleJoinWithCode} className="flex gap-2">
                    <input
                      type="text"
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value)}
                      placeholder="초대 코드 (UUID) 입력"
                      className="flex-1 rounded-xl border border-[#E2E2DA] bg-slate-50/70 px-3 py-2 text-xs outline-none focus:border-[#1A9E7A] transition"
                    />
                    <button
                      type="submit"
                      disabled={isJoining || !inviteCodeInput.trim()}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition"
                    >
                      {isJoining ? "참여 중..." : "입장"}
                    </button>
                  </form>
                  {joinError && <p className="text-[11px] text-rose-500 font-medium">{joinError}</p>}
                </div>
              </div>
            </div>

            {/* 내 여행 방 목록 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#18181B]">내 여행 목록</h2>
                  <span className="rounded-full bg-[#1A9E7A]/10 px-2 py-0.5 text-xs font-bold text-[#1A9E7A]">
                    {myTrips.length}
                  </span>
                </div>
              </div>

              {isLoadingTrips ? (
                <div className="py-12 text-center text-xs text-[#6B6B72]">여행 목록을 불러오는 중...</div>
              ) : myTrips.length === 0 ? (
                /* 여행이 없을 때의 빈 상태 안내 */
                <div className="rounded-3xl border border-dashed border-[#E2E2DA] bg-white/70 p-10 text-center space-y-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#1A9E7A] mx-auto">
                    <Plane className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#18181B]">아직 참여 중인 여행이 없어요</h3>
                    <p className="text-xs text-[#6B6B72]">
                      첫 번째 여행 방을 만들어 친구들을 초대하고 함께 일정을 짜보세요!
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A9E7A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#158063] transition shadow-sm mt-1"
                  >
                    <Plus className="size-3.5" />
                    <span>첫 여행 만들기</span>
                  </button>
                </div>
              ) : (
                /* 여행 카드 그리드 */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myTrips.map((trip) => {
                    const isOwner = trip.createdById === currentUser.id
                    return (
                      <div
                        key={trip.id}
                        className="group relative rounded-2xl border border-[#E2E2DA] bg-white p-5 shadow-sm hover:shadow-md hover:border-[#1A9E7A]/40 transition duration-200 flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="rounded-lg bg-[#EDFAF4] px-2.5 py-1 text-[11px] font-bold text-[#1A9E7A]">
                              {trip.destination}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isOwner
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {isOwner ? "방장" : "멤버"}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-[#18181B] group-hover:text-[#1A9E7A] transition line-clamp-1">
                            {trip.title}
                          </h3>

                          <p className="text-xs text-[#6B6B72] flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-[#9E9EA4]" />
                            <span>
                              {trip.startDate} ~ {trip.endDate}
                            </span>
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#E2E2DA]/60 flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/trips/${trip.inviteCode}`)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                          >
                            <span>동선 조율하기</span>
                            <ArrowRight className="size-3" />
                          </button>

                          <button
                            onClick={() => copyInviteLink(trip.inviteCode)}
                            className="flex items-center justify-center size-9 rounded-xl border border-[#E2E2DA] hover:bg-slate-50 transition text-[#6B6B72]"
                            title="초대 링크 복사"
                          >
                            {copiedCode === trip.inviteCode ? (
                              <Check className="size-4 text-[#1A9E7A]" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </main>

          {/* 푸터 */}
          <footer className="w-full border-t border-[#E2E2DA]/80 bg-white/50 py-5 text-center text-xs text-[#6B6B72] backdrop-blur-md">
            <p>© 2026 WanderMap. All rights reserved.</p>
          </footer>
        </div>

        {/* 새 여행 만들기 모달 */}
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
                    placeholder="예: 제주특별자치도, 도쿄, 파리"
                    className="w-full rounded-xl border border-[#E2E2DA] bg-slate-50/70 px-3.5 py-2.5 text-xs outline-none focus:border-[#1A9E7A] transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B72] uppercase block mb-1">
                      시작일
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E2DA] bg-slate-50/70 px-3 py-2 text-xs outline-none focus:border-[#1A9E7A] transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B72] uppercase block mb-1">
                      종료일
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E2DA] bg-slate-50/70 px-3 py-2 text-xs outline-none focus:border-[#1A9E7A] transition"
                      required
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
      </GradientBackground>
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

        {/* 메인 작업/시작 영역 */}
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

                  {/* 찬반 투표 버튼 */}
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
