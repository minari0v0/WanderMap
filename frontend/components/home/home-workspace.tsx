"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Compass,
  Plus,
  Settings,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  Check,
  Zap,
  RotateCcw,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  UserPlus,
  Share2,
  ChevronRight,
  AlertTriangle,
  Layers,
  Home,
  LogOut,
  X,
} from "lucide-react"
import { authService, UserProfile } from "@/lib/auth-service"

// 목업 여행 히스토리 데이터
interface TripHistoryItem {
  id: string
  title: string
  subtitle: string
  date: string
  members: number
  status: "active" | "confirmed" | "completed"
  statusLabel?: string
  destination: string
  period: string
}

const INITIAL_TRIPS: TripHistoryItem[] = [
  {
    id: "trip-tokyo",
    title: "도쿄 여행 일정",
    subtitle: "생성 완료됨 · 3명 조율중",
    date: "10.24 - 10.27",
    members: 3,
    status: "active",
    destination: "도쿄",
    period: "10.24 - 10.27 (3박 4일)",
  },
  {
    id: "trip-jeju",
    title: "제주도 동쪽 힐링 코스",
    subtitle: "10.12 - 10.15 · 4인",
    date: "10.12 - 10.15",
    members: 4,
    status: "confirmed",
    statusLabel: "확정됨",
    destination: "제주도",
    period: "10.12 - 10.15 (3박 4일)",
  },
  {
    id: "trip-gangneung",
    title: "강릉 서핑 & 감성 카페",
    subtitle: "08.20 - 08.22 · 2인",
    date: "08.20 - 08.22",
    members: 2,
    status: "completed",
    statusLabel: "완료",
    destination: "강릉",
    period: "08.20 - 08.22 (2박 3일)",
  },
]

// 동선 장소 인터페이스
interface WorkspacePlace {
  id: string
  order: number
  category: string
  name: string
  address: string
  status: "confirmed" | "voting"
  time?: string
  votesUp: number
  votesDown: number
  x: number
  y: number
}

const TOKYO_PLACES: WorkspacePlace[] = [
  {
    id: "p1",
    order: 1,
    category: "랜드마크 · 전망대",
    name: "시부야 스카이 (Shibuya Sky)",
    address: "도쿄도 시부야구 시부야 2-24-12",
    status: "confirmed",
    time: "10:30 · 약 1시간 30분",
    votesUp: 3,
    votesDown: 0,
    x: 28,
    y: 32,
  },
  {
    id: "p2",
    order: 2,
    category: "미식 · 야키토리 / 식사",
    name: "신주쿠 오모이데 요코초",
    address: "도쿄도 신주쿠구 니시신주쿠 1초메",
    status: "voting",
    time: "도보 12분",
    votesUp: 2,
    votesDown: 0,
    x: 52,
    y: 48,
  },
  {
    id: "p3",
    order: 3,
    category: "카페 · 디저트",
    name: "블루보틀 키요스미 시라카와",
    address: "도쿄도 고토구 히라노 1-4-8",
    status: "confirmed",
    time: "차량 15분",
    votesUp: 3,
    votesDown: 0,
    x: 74,
    y: 36,
  },
]

export function HomeWorkspace() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // 상태 머신: stage1 (Idle) | stage2 (Pipeline Progress) | stage3 (Active Workspace)
  const [stage, setStage] = useState<"stage1" | "stage2" | "stage3">("stage1")

  // 여행 히스토리 목록
  const [trips, setTrips] = useState<TripHistoryItem[]>(INITIAL_TRIPS)
  const [selectedTripId, setSelectedTripId] = useState<string>("trip-tokyo")

  // Stage 1 입력 상태
  const [destination, setDestination] = useState("도쿄")
  const [period, setPeriod] = useState("10.24 - 10.27 (3박 4일)")

  // 타협 불가능 제약 조건 태그들
  const [strictFilters, setStrictFilters] = useState<string[]>([
    "해산물 제외 🚫",
    "인당 3만원 이하 💰",
  ])
  const [isAddingFilter, setIsAddingFilter] = useState(false)
  const [newFilterInput, setNewFilterInput] = useState("")

  // Stage 2 진행 인디케이터 상태
  const [progressStep, setProgressStep] = useState(1)

  // Stage 3 워크스페이스 장소 및 인터랙션 상태
  const [places, setPlaces] = useState<WorkspacePlace[]>(TOKYO_PLACES)
  const [activePlaceId, setActivePlaceId] = useState<string | null>("p2")
  const [copied, setCopied] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState("")

  useEffect(() => {
    authService
      .getMyProfile()
      .then(setProfile)
      .catch(() => {
        // 프로필 로드 실패 시 기본 mock 프로필
        setProfile({
          id: 1,
          email: "user@wandermap.io",
          nickname: "김민현",
          bio: "취향 탐색가",
          emailVerified: true,
          profileImage: "https://api.dicebear.com/7.x/bottts/svg?seed=wandermap_default",
          provider: "LOCAL",
          hasPassword: true,
          linkedProviders: [],
        })
      })
  }, [])

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // 1. 새 플랜 만들기 (Stage 1으로 리셋)
  const handleNewPlanClick = () => {
    setStage("stage1")
    setDestination("")
    setPeriod("10.24 - 10.27 (3박 4일)")
  }

  // 2. 히스토리 아이템 클릭 (해당 플랜 Stage 3으로 즉시 이동)
  const handleSelectTrip = (item: TripHistoryItem) => {
    setSelectedTripId(item.id)
    setDestination(item.destination)
    setPeriod(item.period)
    setStage("stage3")
  }

  // 3. 동선 자동 설계 및 방 생성 버튼 클릭 (Stage 1 ➔ Stage 2 ➔ Stage 3 파이프라인 전이)
  const handleStartPipeline = () => {
    if (!destination.trim()) {
      showToast("여행 목적지를 입력해주세요.")
      return
    }

    setStage("stage2")
    setProgressStep(1)

    // 파이프라인 시뮬레이션: 단계별 피드백 제공 후 워크스페이스 안착
    setTimeout(() => {
      setProgressStep(2)
    }, 700)

    setTimeout(() => {
      setProgressStep(3)
    }, 1400)

    setTimeout(() => {
      // 새 여행 히스토리 등록
      const newTripItem: TripHistoryItem = {
        id: `trip-${Date.now()}`,
        title: `${destination} 여행 일정`,
        subtitle: "생성 완료됨 · 1명 조율중",
        date: period.split(" ")[0] || "10.24 - 10.27",
        members: 1,
        status: "active",
        destination: destination,
        period: period,
      }
      setTrips((prev) => [newTripItem, ...prev.filter((t) => t.id !== newTripItem.id)])
      setSelectedTripId(newTripItem.id)
      setStage("stage3")
    }, 2100)
  }

  // 필터 태그 토글 및 추가
  const handleRemoveFilter = (filter: string) => {
    setStrictFilters((prev) => prev.filter((f) => f !== filter))
  }

  const handleAddFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newFilterInput.trim()) {
      setStrictFilters((prev) => [...prev, newFilterInput.trim()])
      setNewFilterInput("")
      setIsAddingFilter(false)
    }
  }

  // 투표 핸들러
  const handleVote = (id: string, dir: "up" | "down") => {
    setPlaces((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const nextUp = dir === "up" ? p.votesUp + 1 : p.votesUp
        const nextDown = dir === "down" ? p.votesDown + 1 : p.votesDown
        // 과반수(2표 이상) 달성 시 확정 전환
        const nextStatus = nextUp >= 2 ? "confirmed" : p.status
        return {
          ...p,
          votesUp: nextUp,
          votesDown: nextDown,
          status: nextStatus,
        }
      })
    )
    setActivePlaceId(id)
    showToast(dir === "up" ? "찬성 투표가 반영되었습니다 👍" : "반대 투표가 반영되었습니다 👎")
  }

  // 도보 최적화 순회(TSP) 알고리즘 셔플 시뮬레이션
  const handleTspOptimize = () => {
    showToast("외판원 순회(TSP) 알고리즘으로 최적 도보 동선을 계산했습니다! ⚡")
    setPlaces((prev) => {
      const copy = [...prev]
      // 순서 뒤집기 및 order 재부여
      copy.reverse()
      return copy.map((item, idx) => ({ ...item, order: idx + 1 }))
    })
  }

  // AI 긴급 우회 (Auto-Rescheduling)
  const handleAutoReschedule = () => {
    showToast("✨ AI가 혼잡도를 분석하여 인근 대체 핫플레이스를 추천했습니다.")
    const alternatePlace: WorkspacePlace = {
      id: `alt-${Date.now()}`,
      order: places.length + 1,
      category: "추천 명소 · 힐링",
      name: "메이지 신궁 숲길 산책",
      address: "도쿄도 시부야구 요요기카미조노초 1-1",
      status: "voting",
      time: "차량 8분 (혼잡도 낮음)",
      votesUp: 1,
      votesDown: 0,
      x: 35,
      y: 65,
    }
    setPlaces((prev) => [...prev, alternatePlace])
    setActivePlaceId(alternatePlace.id)
  }

  // 초대 링크 복사
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    showToast("방 초대 링크가 클립보드에 복사되었습니다! 🔗")
  }

  // 채팅 메시지 전송
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    showToast(`메이트들에게 의견 전송: "${chatInput}"`)
    setChatInput("")
  }

  return (
    <div className="flex h-screen w-full bg-[#FAF9F5] text-[#18181B] font-sans overflow-hidden">
      {/* 토스트 알림 */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl bg-[#18181B] text-white px-5 py-3 text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          {toastMsg}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. 좌측 글로벌 내비게이션 드로어 (Sidebar Drawer)
          스크린샷 1의 좌측과 100% 동일한 레이아웃 & 톤앤매너
      ────────────────────────────────────────────────────────────── */}
      <aside className="w-64 sm:w-72 bg-white border-r border-[#EAE9E4] flex flex-col justify-between shrink-0 h-full select-none">
        <div className="flex flex-col h-full overflow-hidden p-4 space-y-4">
          {/* 서비스 로고 */}
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#839758] text-white font-black text-sm shadow-sm">
              W
            </span>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-[#18181B] leading-none">
                WanderMap
              </h1>
              <p className="text-[10px] text-[#8C8C94] mt-0.5">AI 동선 조율 플랫폼</p>
            </div>
          </div>

          {/* Primary Action: 새 여행 플랜 만들기 버튼 */}
          <button
            onClick={handleNewPlanClick}
            className="w-full flex items-center gap-2 rounded-2xl bg-[#F0F2EB] hover:bg-[#E5E8DD] text-[#4F6030] px-3.5 py-2.5 text-xs font-bold transition-all border border-[#E0E4D5]"
          >
            <span className="flex size-4 items-center justify-center rounded-full bg-[#839758] text-white text-[10px]">
              <Plus className="size-3" />
            </span>
            <span>새 여행 플랜 만들기</span>
          </button>

          {/* 여행 히스토리 목록 */}
          <div className="flex-1 overflow-y-auto space-y-2 pt-2 pr-1">
            <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-bold text-[#8C8C94]">
              <span>내 여행 목록</span>
              <ChevronRight className="size-3" />
            </div>

            <div className="space-y-1.5">
              {trips.map((item) => {
                const isSelected = stage === "stage3" && selectedTripId === item.id
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectTrip(item)}
                    className={`group relative rounded-2xl p-3 cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-[#F3F6EC] border-[#CCD8B8] shadow-xs"
                        : "bg-white border-transparent hover:bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <h4
                          className={`text-xs font-bold truncate ${
                            isSelected ? "text-[#405224]" : "text-[#18181B]"
                          }`}
                        >
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-[#8C8C94] mt-0.5 truncate">
                          {item.subtitle}
                        </p>
                      </div>

                      {item.statusLabel && (
                        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {item.statusLabel}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 하단 사용자 프로필 및 유틸리티 */}
        <div className="border-t border-[#EAE9E4] p-3.5 bg-[#FAF9F5]/70 flex items-center justify-between">
          <div
            onClick={() => router.push("/mypage")}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0"
          >
            <span className="flex size-7.5 items-center justify-center rounded-full bg-[#EAD8CD] text-[#A25A34] text-xs font-bold shrink-0">
              {profile?.nickname ? profile.nickname.charAt(0) : "민"}
            </span>
            <div className="min-w-0">
              <h5 className="text-xs font-bold text-[#18181B] truncate group-hover:text-[#839758] transition">
                {profile?.nickname || "김민현"}
              </h5>
              <p className="text-[10px] text-[#8C8C94] truncate">취향 탐색가</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push("/mypage")}
              title="마이페이지 설정"
              className="p-1.5 rounded-lg text-[#8C8C94] hover:text-[#18181B] hover:bg-white transition"
            >
              <Settings className="size-4" />
            </button>
            <button
              onClick={() => {
                authService.logout()
                window.location.reload()
              }}
              title="로그아웃"
              className="p-1.5 rounded-lg text-[#8C8C94] hover:text-red-500 hover:bg-red-50 transition"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. 우측 다이내믹 워크스페이스 (Main Canvas)
          Stage 1 (대기) ➔ Stage 2 (로딩 인디케이터) ➔ Stage 3 (2열 스플릿)
      ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* ============================================================
            STAGE 1: 대기 상태 (Idle State - 스크린샷 1 중심 화면)
        ============================================================ */}
        {stage === "stage1" && (
          <div className="flex-1 flex items-center justify-center p-6 bg-[#FAF9F5] overflow-y-auto animate-in fade-in duration-300">
            <div className="w-full max-w-xl bg-white rounded-3xl border border-[#E5E4DE] p-8 shadow-sm flex flex-col items-center text-center space-y-6">
              {/* 상단 캡슐 뱃지 */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F3E8] border border-[#DCE3D1] text-[11px] font-bold text-[#64793C]">
                <span className="size-1.5 rounded-full bg-[#839758] animate-pulse" />
                <span>원더 맵지 하이브리드 파이프라인</span>
              </div>

              {/* 메인 타이틀 & 서브텍스트 */}
              <div className="space-y-2 max-w-md">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#18181B]">
                  어느 곳으로 여행을 떠날까요?
                </h2>
                <p className="text-xs text-[#7B7B83] leading-relaxed break-keep">
                  SNS 피로감 없는 동선 조율, Gemini 카테고리 뼈대와 네이버 실데이터로
                  가장 완벽한 그룹 일정을 조율해 드립니다.
                </p>
              </div>

              {/* 2열 입력 폼 (목적지 / 기간) */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {/* 목적지 입력 */}
                <div className="rounded-2xl border border-[#EAE9E4] bg-[#FBFBFA] p-3.5 focus-within:border-[#839758] focus-within:bg-white transition">
                  <label className="text-[10px] font-bold text-[#8C8C94] uppercase tracking-wider block mb-1">
                    여행 목적지
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="예) 도쿄, 제주도, 부산"
                    className="w-full bg-transparent text-sm font-bold text-[#18181B] outline-none"
                  />
                </div>

                {/* 기간 입력 */}
                <div className="rounded-2xl border border-[#EAE9E4] bg-[#FBFBFA] p-3.5 focus-within:border-[#839758] focus-within:bg-white transition">
                  <label className="text-[10px] font-bold text-[#8C8C94] uppercase tracking-wider block mb-1">
                    일정 기간
                  </label>
                  <input
                    type="text"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="10.24 - 10.27 (3박 4일)"
                    className="w-full bg-transparent text-sm font-bold text-[#18181B] outline-none"
                  />
                </div>
              </div>

              {/* 타협 불가능한 조건 (Strict Constraints) 태그 바 */}
              <div className="w-full rounded-2xl border border-[#EFEFEA] bg-[#FAFAF8] p-3.5 flex flex-wrap items-center gap-2 text-left">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#D94F38] pr-1">
                  <AlertTriangle className="size-3.5 stroke-[2.5]" /> 자체 필터
                </span>

                {strictFilters.map((filter) => (
                  <span
                    key={filter}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E2E2DA] text-xs font-semibold text-[#18181B] shadow-xs group"
                  >
                    <span>{filter}</span>
                    <button
                      onClick={() => handleRemoveFilter(filter)}
                      className="text-slate-400 hover:text-red-500 transition"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}

                {/* 필터 추가 입력창 또는 버튼 */}
                {isAddingFilter ? (
                  <form onSubmit={handleAddFilterSubmit} className="inline-flex items-center">
                    <input
                      type="text"
                      autoFocus
                      value={newFilterInput}
                      onChange={(e) => setNewFilterInput(e.target.value)}
                      placeholder="예) 도보 10분 이내"
                      className="rounded-xl border border-[#839758] bg-white px-2.5 py-1 text-xs outline-none"
                    />
                    <button
                      type="submit"
                      className="ml-1 text-[11px] font-bold text-[#839758] px-2 py-1"
                    >
                      추가
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingFilter(false)}
                      className="text-[11px] text-slate-400 px-1"
                    >
                      취소
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingFilter(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-[#D2D2CA] text-xs font-semibold text-[#8C8C94] hover:text-[#18181B] hover:border-slate-400 transition"
                  >
                    <Plus className="size-3" /> 필터 추가
                  </button>
                )}
              </div>

              {/* 실행 CTA 버튼 */}
              <button
                onClick={handleStartPipeline}
                className="w-full rounded-2xl bg-[#839758] hover:bg-[#728549] text-white py-4 px-6 text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all transform active:scale-[0.99]"
              >
                <span>동선 자동 설계 및 방 생성 ✨</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            STAGE 2: 파이프라인 로딩 상태 (Pipeline Progress State)
        ============================================================ */}
        {stage === "stage2" && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#FAF9F5] animate-in fade-in zoom-in-95 duration-300">
            <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5E4DE] p-8 shadow-md text-center space-y-6">
              <div className="size-16 rounded-3xl bg-[#F0F3E8] border border-[#DCE3D1] text-[#839758] flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="size-8 animate-spin" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-[#18181B]">
                  '{destination}' 스마트 여행 파이프라인 가동 중
                </h3>
                <p className="text-xs text-[#8C8C94]">
                  Gemini 구조화 분석 및 네이버 실데이터를 매핑하고 있습니다.
                </p>
              </div>

              {/* 단계별 스텝 피드백 */}
              <div className="space-y-3 text-left pt-2">
                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    progressStep >= 1
                      ? "bg-[#F5F8EF] border-[#CCD8B8] text-[#405224]"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                      progressStep >= 1 ? "bg-[#839758] text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {progressStep > 1 ? <Check className="size-3.5" /> : "1"}
                  </span>
                  <span className="text-xs font-bold">
                    Gemini AI 최적 카테고리 동선 뼈대 생성
                  </span>
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    progressStep >= 2
                      ? "bg-[#F5F8EF] border-[#CCD8B8] text-[#405224]"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                      progressStep >= 2 ? "bg-[#839758] text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {progressStep > 2 ? <Check className="size-3.5" /> : "2"}
                  </span>
                  <span className="text-xs font-bold">
                    네이버 실데이터 위치 좌표 & 핫플레이스 매핑
                  </span>
                </div>

                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    progressStep >= 3
                      ? "bg-[#F5F8EF] border-[#CCD8B8] text-[#405224]"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                >
                  <span
                    className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                      progressStep >= 3 ? "bg-[#839758] text-white" : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    3
                  </span>
                  <span className="text-xs font-bold">
                    실시간 투표 및 TSP 도보 최적화 준비 완료
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            STAGE 3: 작업 공간 안착 (Active Workspace State)
            상단 고정 헤더 + 좌측 지도 뷰포트 + 우측 실시간 조율 타임라인 패널
        ============================================================ */}
        {stage === "stage3" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
            {/* 상단 고정 헤더 (메타 정보 & 초대 액션) */}
            <header className="h-14 bg-white border-b border-[#EAE9E4] px-5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-xl bg-[#F0F3E8] text-[#839758] font-bold">
                  <MapPin className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#18181B] leading-none">
                    {destination} 여행 일정
                  </h3>
                  <p className="text-[11px] text-[#8C8C94] mt-0.5">
                    {period} · 1일차 동선 조율
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* 메이트 아바타 스택 */}
                <div className="hidden sm:flex items-center -space-x-1.5 pr-2">
                  <span className="size-7 rounded-full bg-[#839758] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                    민
                  </span>
                  <span className="size-7 rounded-full bg-[#E0A96D] text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                    준
                  </span>
                  <span className="size-7 rounded-full bg-slate-300 text-slate-700 text-[10px] font-bold flex items-center justify-center border-2 border-white">
                    +1
                  </span>
                </div>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 rounded-xl bg-[#839758] hover:bg-[#728549] text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs"
                >
                  {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
                  <span>{copied ? "복사됨!" : "초대 링크"}</span>
                </button>
              </div>
            </header>

            {/* 하단 2열 반응형 스플릿 레이아웃 */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_390px] overflow-hidden p-3.5 gap-3.5 bg-[#FAF9F5]">
              {/* 좌측: 지도 뷰포트 (Map Viewport Area) */}
              <section className="relative h-full min-h-[350px] rounded-3xl border border-[#E2E2DA] bg-[#F4F3EE] overflow-hidden shadow-xs flex flex-col justify-between">
                {/* 배경 지도 그리드 & 도로망 효과 */}
                <div
                  className="absolute inset-0 opacity-40 pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, transparent calc(50% - 2px), #E2E1D9 calc(50% - 2px), #E2E1D9 calc(50% + 2px), transparent calc(50% + 2px)), linear-gradient(0deg, transparent calc(50% - 2px), #E2E1D9 calc(50% - 2px), #E2E1D9 calc(50% + 2px), transparent calc(50% + 2px))",
                    backgroundSize: "80px 80px",
                  }}
                />

                {/* 상단 지도 상태 정보 패널 */}
                <div className="relative z-10 p-3 flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E2DA] bg-white/95 backdrop-blur-sm px-3.5 py-1.5 text-xs font-bold text-[#52525B] shadow-xs">
                    <Layers className="size-3.5 text-[#839758]" />
                    <span>Naver Maps API 렌더링 영역</span>
                    <span className="text-[10px] text-[#839758] bg-[#F0F3E8] px-1.5 py-0.5 rounded-md">
                      좌표 매핑 완료
                    </span>
                  </div>
                </div>

                {/* SVG 경로 연결선 */}
                <svg
                  className="pointer-events-none absolute inset-0 size-full z-10"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={places.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="#839758"
                    strokeWidth="0.8"
                    strokeDasharray="2 1.5"
                    strokeLinecap="round"
                    opacity="0.75"
                  />
                </svg>

                {/* 지도 상의 장소 번호 핀들 */}
                <div className="absolute inset-0 z-20 pointer-events-none">
                  {places.map((p) => {
                    const isActive = activePlaceId === p.id
                    const isVoting = p.status === "voting"
                    return (
                      <div
                        key={p.id}
                        onClick={() => setActivePlaceId(p.id)}
                        className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform group"
                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                      >
                        {isActive && (
                          <span
                            className={`absolute -inset-2 rounded-full animate-ping opacity-40 ${
                              isVoting ? "bg-amber-400" : "bg-[#839758]"
                            }`}
                          />
                        )}
                        <div
                          className={`flex items-center justify-center rounded-full text-xs font-black shadow-md border-2 border-white transition-transform ${
                            isActive ? "size-9 scale-110" : "size-7.5"
                          } ${
                            isVoting
                              ? "bg-amber-400 text-amber-950"
                              : "bg-[#839758] text-white"
                          }`}
                        >
                          {isVoting ? "?" : p.order}
                        </div>
                        {/* 핀 라벨 툴팁 */}
                        <div className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-xl border border-[#E2E2DA] bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#18181B] shadow-sm pointer-events-none">
                          {p.name}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 하단 플로팅 컨트롤러: 도보 최적화 셔틀(TSP) */}
                <div className="relative z-10 p-3.5 flex items-center gap-2">
                  <button
                    onClick={() => showToast("현재 위치로 지도를 재정렬했습니다.")}
                    className="flex size-10 items-center justify-center rounded-full border border-[#E2E2DA] bg-white text-[#52525B] shadow-sm hover:bg-slate-50 transition"
                    title="현재 위치"
                  >
                    <Home className="size-4" />
                  </button>

                  <button
                    onClick={handleTspOptimize}
                    className="flex items-center gap-2 rounded-2xl border border-[#CCD8B8] bg-white/95 backdrop-blur-sm px-4 py-2.5 text-xs font-bold text-[#405224] shadow-sm hover:bg-[#F3F6EC] transition active:scale-95"
                  >
                    <Zap className="size-3.5 text-[#839758] fill-[#839758]" />
                    <span>도보 최적화 셔틀 (TSP 알고리즘)</span>
                  </button>
                </div>
              </section>

              {/* 우측: 실시간 조율 패널 (Real-time Timeline Panel) */}
              <section className="h-full rounded-3xl border border-[#E2E2DA] bg-white shadow-xs flex flex-col overflow-hidden">
                {/* 패널 헤더: 실시간 연결 상태 & AI 긴급 우회 버튼 */}
                <div className="p-4 border-b border-[#EAE9E4] flex items-center justify-between shrink-0 bg-[#FAF9F5]/50">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-xs font-bold text-[#18181B]">실시간 조율 타임라인</h4>
                  </div>

                  <button
                    onClick={handleAutoReschedule}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1 text-[11px] font-bold transition"
                  >
                    <Sparkles className="size-3 text-amber-600" />
                    <span>AI 긴급 우회</span>
                  </button>
                </div>

                {/* 타임라인 피드 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-bold text-[#8C8C94] uppercase tracking-wider">
                      Day 1 · 순차 동선
                    </span>
                    <span className="text-[10px] text-[#839758] font-bold bg-[#F0F3E8] px-2 py-0.5 rounded-md">
                      총 {places.length}개 장소
                    </span>
                  </div>

                  <div className="space-y-3">
                    {places.map((place) => {
                      const isActive = activePlaceId === place.id
                      const isVoting = place.status === "voting"

                      return (
                        <div
                          key={place.id}
                          onClick={() => setActivePlaceId(place.id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isActive
                              ? "border-[#839758] bg-[#F5F8EF] shadow-xs"
                              : isVoting
                              ? "border-amber-200 bg-[#FFFDF5]"
                              : "border-[#EAE9E4] bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                  isVoting
                                    ? "bg-amber-400 text-amber-950"
                                    : "bg-[#839758] text-white"
                                }`}
                              >
                                {isVoting ? "?" : place.order}
                              </span>
                              <span className="text-[10px] font-bold text-[#8C8C94]">
                                {place.category}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isVoting
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-[#F0F3E8] text-[#556934]"
                              }`}
                            >
                              {isVoting ? "투표 진행 중" : "확정됨"}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-[#18181B] mt-2">
                            {place.name}
                          </h5>
                          <p className="text-[10px] text-[#8C8C94] mt-0.5 flex items-center gap-1">
                            <MapPin className="size-3 text-slate-400" /> {place.address}
                          </p>

                          {/* 투표 진행 중인 장소의 찬반 투표 컴포넌트 */}
                          {isVoting && (
                            <div className="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between">
                              <span className="text-[10px] text-amber-700 font-bold">
                                과반수(2표) 시 확정
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleVote(place.id, "up")
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-amber-200 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-bold text-[#18181B] transition"
                                >
                                  <ThumbsUp className="size-3 text-emerald-600" />
                                  <span>{place.votesUp}</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleVote(place.id, "down")
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-amber-200 hover:bg-red-50 hover:border-red-300 text-xs font-bold text-[#18181B] transition"
                                >
                                  <ThumbsDown className="size-3 text-red-500" />
                                  <span>{place.votesDown}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 하단 도크: 실시간 의견 조율 입력 폼 */}
                <div className="p-3 border-t border-[#EAE9E4] bg-white">
                  <form
                    onSubmit={handleSendChat}
                    className="flex items-center gap-2 rounded-2xl border border-[#E2E2DA] bg-[#FAF9F5] py-1.5 pl-3.5 pr-1.5 focus-within:border-[#839758] focus-within:bg-white transition"
                  >
                    <MessageCircle className="size-4 text-[#8C8C94]" />
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="그룹 메이트에게 의견 남기기..."
                      className="flex-1 bg-transparent text-xs text-[#18181B] outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      className="size-7 rounded-xl bg-[#839758] hover:bg-[#728549] text-white flex items-center justify-center transition shadow-xs"
                    >
                      <Sparkles className="size-3.5" />
                    </button>
                  </form>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
