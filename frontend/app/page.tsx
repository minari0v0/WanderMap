"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { tripService } from "@/lib/trip-service"
import { Calendar, MapPin, Plus, Share2, Compass, ArrowRight } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  
  // 방 생성 입력 상태
  const [title, setTitle] = useState("")
  const [destination, setDestination] = useState("도쿄")
  const [startDate, setStartDate] = useState("2026-10-24")
  const [endDate, setEndDate] = useState("2026-10-27")
  
  // 초대코드 입장 상태
  const [inviteCodeInput, setInviteCodeInput] = useState("")
  
  // 방 생성 완료 후 결과 상태
  const [createdTrip, setCreatedTrip] = useState<{
    id: number
    inviteCode: string
    title: string
  } | null>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  // 방 생성 요청
  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !destination.trim() || !startDate || !endDate) {
      setErrorMessage("모든 정보를 올바르게 입력해주세요.")
      return
    }
    
    setIsLoading(true)
    setErrorMessage("")
    
    try {
      const response = await tripService.createTrip({
        title,
        destination,
        startDate,
        endDate,
        userId: 1, // 임시 테스터 ID
      })
      setCreatedTrip(response)
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || "방 생성 도중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 초대 코드로 방 입장
  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCodeInput.trim()) {
      setErrorMessage("초대 코드를 입력해주세요.")
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    try {
      const response = await tripService.joinTrip(inviteCodeInput.trim(), 1)
      router.push(`/trips/${response.id}`)
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || "초대 코드가 올바르지 않거나 합류할 수 없습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 초대 링크 복사
  function copyInviteLink() {
    if (!createdTrip) return
    const link = `${window.location.origin}/join/${createdTrip.inviteCode}`
    navigator.clipboard.writeText(link)
    alert("초대 링크가 클립보드에 복사되었습니다!")
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-50/50 via-slate-50 to-slate-100 p-4 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <div className="w-full max-w-md space-y-6">
        
        {/* 로고 영역 */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg shadow-teal-500/20">
            <Compass className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">WanderMap</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            실시간으로 조율하고 AI가 정리하는 우리들만의 여행 플래너
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400">
            ⚠ {errorMessage}
          </div>
        )}

        {/* 1. 방 생성 완료 화면 */}
        {createdTrip ? (
          <div className="rounded-2xl border border-teal-100 bg-white p-6 shadow-xl shadow-teal-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-950/50 dark:text-teal-400">
                🎉 생성 완료
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">"{createdTrip.title}" 방이 생성되었습니다!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">초대 링크를 카카오톡 또는 문자로 멤버들에게 공유하세요.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 border border-slate-100 dark:bg-slate-950 dark:border-slate-800 text-sm font-mono text-slate-700 dark:text-slate-300">
                <span className="truncate mr-2">{window.location.origin}/join/{createdTrip.inviteCode}</span>
                <button 
                  onClick={copyInviteLink}
                  className="flex-shrink-0 flex items-center gap-1 rounded bg-teal-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-600 transition"
                >
                  <Share2 className="h-3 w-3" /> 복사
                </button>
              </div>

              <button
                onClick={() => router.push(`/trips/${createdTrip.id}`)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition dark:bg-teal-500 dark:hover:bg-teal-600"
              >
                여행 방 입장하기 <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* 2. 새 여행 생성 폼 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none space-y-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-teal-500" /> 새 여행 방 만들기
              </h2>
              
              <form onSubmit={handleCreateRoom} className="space-y-3 text-slate-800 dark:text-slate-100">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">여행 이름</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="도쿄 식도락 여행 ✈"
                    className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 transition dark:border-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">목적지</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="일본 도쿄"
                      className="w-full rounded-xl border border-slate-200 bg-transparent pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-teal-500 transition dark:border-slate-800"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">출발일</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-transparent pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-teal-500 transition dark:border-slate-800"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">도착일</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-transparent pl-10 pr-3.5 py-2.5 text-sm outline-none focus:border-teal-500 transition dark:border-slate-800"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 rounded-xl bg-teal-500 py-3 text-sm font-semibold text-white hover:bg-teal-600 transition disabled:opacity-55"
                >
                  {isLoading ? "생성 중..." : "방 생성 + 초대 링크 발급"}
                </button>
              </form>
            </div>

            {/* 3. 기존 방 입장 폼 */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none space-y-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="h-4 w-4 text-teal-500" /> 이미 방이 있으신가요?
              </h2>

              <form onSubmit={handleJoinRoom} className="flex gap-2">
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  placeholder="초대 코드 (UUID) 입력"
                  className="flex-1 rounded-xl border border-slate-200 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-teal-500 transition dark:border-slate-800 text-slate-800 dark:text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 transition dark:bg-teal-500 dark:hover:bg-teal-600 disabled:opacity-55"
                >
                  입장
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
