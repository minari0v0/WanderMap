"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { tripService, type TripResponse } from "@/lib/trip-service"
import { Compass, Plus, LogOut, Calendar, MapPin, Plane, ArrowRight, User } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  
  // 로그인 검증
  const [nickname, setNickname] = useState("여행가")
  const [isLoading, setIsLoading] = useState(true)
  
  // 방 생성 입력 상태
  const [title, setTitle] = useState("")
  const [destination, setDestination] = useState("")
  const [startDate, setStartDate] = useState("2026-10-24")
  const [endDate, setEndDate] = useState("2026-10-27")
  const [isCreating, setIsCreating] = useState(false)
  
  // 초대코드 입력 상태
  const [inviteCodeInput, setInviteCodeInput] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  
  // 여행 목록
  const [trips, setTrips] = useState<TripResponse[]>([])
  
  const [errorMessage, setErrorMessage] = useState("")
  
  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated")
    if (!auth) {
      router.push("/login")
      return
    }
    const name = localStorage.getItem("nickname") || "여행가"
    setNickname(name)
    setIsLoading(false)
    
    // 초기 데모 여행 리스트 적재
    setTrips([
      {
        id: 999,
        inviteCode: "demo-invite-code-1",
        title: "제주도 동쪽 2박 3일 힐링 코스 🌴",
        destination: "제주특별자치도",
        startDate: "2026-08-15",
        endDate: "2026-08-18",
        status: "PLANNING",
        createdById: 1,
        createdByName: name,
      }
    ])
  }, [router])

  // 방 생성
  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !destination.trim() || !startDate || !endDate) {
      setErrorMessage("모든 정보를 기입해 주세요.")
      return
    }
    setIsCreating(true)
    setErrorMessage("")
    try {
      const newTrip = await tripService.createTrip({
        title,
        destination,
        startDate,
        endDate,
        userId: 1
      })
      setTrips(prev => [newTrip, ...prev])
      setTitle("")
      setDestination("")
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "방을 생성하지 못했습니다.")
    } finally {
      setIsCreating(false)
    }
  }

  // 방 참여
  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCodeInput.trim()) return
    setIsJoining(true)
    setErrorMessage("")
    try {
      const joinedTrip = await tripService.joinTrip(inviteCodeInput.trim(), 1)
      setTrips(prev => {
        if (prev.some(t => t.id === joinedTrip.id)) return prev
        return [joinedTrip, ...prev]
      })
      setInviteCodeInput("")
      router.push(`/trips/${joinedTrip.id}`)
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "초대 코드를 확인해 주세요.")
    } finally {
      setIsJoining(false)
    }
  }

  // 로그아웃
  function handleLogout() {
    localStorage.removeItem("isAuthenticated")
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F8F8F6] text-[#6B6B72]">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A9E7A] border-t-transparent mx-auto"></div>
          <p className="text-sm font-medium">내 대시보드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F8F8F6] text-[#18181B] pb-16">
      
      {/* 대시보드 헤더 */}
      <header className="border-b border-[#E2E2DA] bg-white px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white">
            <Compass className="size-4" />
          </span>
          <span className="text-base font-bold tracking-tight">WanderMap Dashboard</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm font-semibold">
          <span className="flex items-center gap-1.5 text-[#6B6B72]">
            <User className="size-4" /> {nickname}님
          </span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-lg border border-[#E2E2DA] px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 transition"
          >
            <LogOut className="size-3.5" /> 로그아웃
          </button>
        </div>
      </header>

      {/* 대시보드 메인 콘텐츠 */}
      <main className="max-w-5xl mx-auto px-4 mt-8 grid gap-8 md:grid-cols-[1fr_340px]">
        
        {/* 왼쪽: 여행 목록 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">내 여행 목록 ({trips.length})</h2>
          </div>

          {trips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E2E2DA] p-12 text-center text-[#6B6B72] bg-white">
              <Plane className="size-8 mx-auto text-slate-300 mb-2 animate-bounce" />
              <p className="text-sm font-semibold">아직 예정된 여행이 없습니다.</p>
              <p className="text-xs mt-1">오른쪽 패널에서 새로운 여행을 만들어 보세요!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {trips.map(trip => (
                <div 
                  key={trip.id}
                  className="rounded-2xl border border-[#E2E2DA] bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <span className="inline-flex rounded-md bg-[#EDFAF4] px-2 py-0.5 text-[10px] font-bold text-[#1A9E7A]">
                      {trip.status === "PLANNING" ? "✏ 기획 중" : "✓ 완료"}
                    </span>
                    <h3 className="font-bold text-base leading-snug">{trip.title}</h3>
                    <div className="space-y-1 text-xs text-[#6B6B72]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="size-3.5" /> {trip.destination}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" /> {trip.startDate} ~ {trip.endDate}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/trips/${trip.id}`)}
                    className="w-full mt-4 flex items-center justify-center gap-1 rounded-xl bg-[#1A9E7A] py-2.5 text-xs font-semibold text-white hover:bg-[#158063] transition"
                  >
                    방 입장하기 <ArrowRight className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 방 생성 및 입장 패널 */}
        <div className="space-y-6">
          
          {errorMessage && (
            <div className="rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-100">
              ⚠ {errorMessage}
            </div>
          )}

          {/* 방 생성 카드 */}
          <div className="rounded-2xl border border-[#E2E2DA] bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
              <Plus className="size-4 text-[#1A9E7A]" /> 새 여행 방 만들기
            </h2>

            <form onSubmit={handleCreateRoom} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#6B6B72] uppercase block mb-1">여행 이름</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예) 제주도 힐링 투어 🌴"
                  className="w-full rounded-xl border border-[#E2E2DA] px-3.5 py-2.5 outline-none focus:border-[#1A9E7A] transition bg-transparent"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#6B6B72] uppercase block mb-1">목적지</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="예) 제주시 구좌읍"
                  className="w-full rounded-xl border border-[#E2E2DA] px-3.5 py-2.5 outline-none focus:border-[#1A9E7A] transition bg-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-[#6B6B72] uppercase block mb-1">출발일</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E2DA] px-2.5 py-2 outline-none focus:border-[#1A9E7A] transition bg-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#6B6B72] uppercase block mb-1">종료일</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E2DA] px-2.5 py-2 outline-none focus:border-[#1A9E7A] transition bg-transparent"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full mt-2 rounded-xl bg-[#1A9E7A] py-2.5 text-xs font-bold text-white hover:bg-[#158063] transition disabled:opacity-50"
              >
                {isCreating ? "생성 중..." : "여행 방 생성 + 초대코드 발급"}
              </button>
            </form>
          </div>

          {/* 초대코드 입장 카드 */}
          <div className="rounded-2xl border border-[#E2E2DA] bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
              <Compass className="size-4 text-[#1A9E7A]" /> 초대코드로 참여하기
            </h2>

            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder="초대 코드 (UUID) 입력"
                className="flex-1 rounded-xl border border-[#E2E2DA] px-3.5 py-2 text-xs outline-none focus:border-[#1A9E7A] transition bg-transparent text-slate-800 font-mono"
                required
              />
              <button
                type="submit"
                disabled={isJoining}
                className="rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                참여
              </button>
            </form>
          </div>

        </div>

      </main>
    </div>
  )
}
