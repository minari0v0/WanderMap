"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { tripService, type TripResponse, type PreferenceResponse } from "@/lib/trip-service"
import { ArrowLeft, Check, Compass, Sparkles, Utensils, Activity, Ban, MessageSquare } from "lucide-react"

interface PreferencesPageProps {
  params: Promise<{ tripId: string }>
}

const FOOD_OPTIONS = [
  { id: "ramen", label: "🍜 라멘" },
  { id: "sushi", label: "🍣 스시/회" },
  { id: "cafe", label: "☕ 감성 카페" },
  { id: "dessert", label: "🍰 디저트/베이커리" },
  { id: "yakiniku", label: "🥩 야키니쿠/고기" },
  { id: "conveni", label: "🍱 편의점 투어" },
  { id: "korean", label: "🍲 한식/국물" },
  { id: "izakaya", label: "🍺 이자카야/주점" },
  { id: "western", label: "🍕 양식/브런치" },
]

const ACTIVITY_OPTIONS = [
  { id: "sightseeing", label: "🏛 명소/관광지" },
  { id: "shopping", label: "🛍 쇼핑/거리 탐방" },
  { id: "photo", label: "📸 인스타/포토 스팟" },
  { id: "experience", label: "🎮 오락/이색 체험" },
  { id: "nature", label: "🌿 힐링 자연/공원" },
  { id: "spa", label: "♨ 온천/스파" },
]

export default function PreferencesPage({ params }: PreferencesPageProps) {
  const router = useRouter()
  const { tripId } = use(params)
  const numericTripId = Number(tripId)

  const [trip, setTrip] = useState<TripResponse | null>(null)
  const [selectedFoods, setSelectedFoods] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [excludedKeywords, setExcludedKeywords] = useState("")
  const [freeMemo, setFreeMemo] = useState("")

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittedBefore, setIsSubmittedBefore] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        if (isNaN(numericTripId)) {
          throw new Error("올바르지 않은 여행 ID입니다.")
        }
        // 방 정보 로드
        const tripData = await tripService.getTrip(numericTripId)
        setTrip(tripData)

        // 이전에 제출한 선호도가 있는지 확인 (userId: 1)
        const myPref = await tripService.getMyPreference(numericTripId, 1)
        if (myPref) {
          setSelectedFoods(myPref.foodCategories || [])
          setSelectedActivities(myPref.activityTypes || [])
          setExcludedKeywords(myPref.excludedKeywords || "")
          setFreeMemo(myPref.freeMemo || "")
          setIsSubmittedBefore(true)
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "데이터를 불러오는 중 오류가 발생했습니다." })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [numericTripId])

  function toggleFood(label: string) {
    setSelectedFoods((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    )
  }

  function toggleActivity(label: string) {
    setSelectedActivities((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      await tripService.submitPreference(numericTripId, {
        foodCategories: selectedFoods,
        activityTypes: selectedActivities,
        excludedKeywords: excludedKeywords.trim(),
        freeMemo: freeMemo.trim(),
        userId: 1,
      })

      setMessage({ type: "success", text: "선호도가 성공적으로 저장되었습니다! 잠시 후 여행 방으로 이동합니다." })
      setTimeout(() => {
        router.push(`/trips/${tripId}`)
      }, 1200)
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "선호도 저장에 실패했습니다." })
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F8F8F6] text-slate-500">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A9E7A] border-t-transparent mx-auto"></div>
          <p className="text-sm font-medium">선호도 설문을 준비하는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F8F8F6] text-[#18181B] pb-16">
      {/* 상단 미니 헤더 */}
      <header className="border-b border-[#E2E2DA] bg-white px-4 py-3 shadow-sm sm:px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/trips/${tripId}`)}
            className="flex size-8 items-center justify-center rounded-lg border border-[#E2E2DA] hover:bg-slate-50 transition text-[#6B6B72]"
            title="여행 방으로 돌아가기"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white">
              <Compass className="size-3.5" />
            </span>
            <span className="text-sm font-bold tracking-tight">선호도 설문</span>
          </div>
        </div>

        {trip && (
          <span className="text-xs font-semibold text-[#1A9E7A] bg-[#EDFAF4] px-2.5 py-1 rounded-full border border-[#b8eedf] truncate max-w-[12rem]">
            {trip.title}
          </span>
        )}
      </header>

      {/* 설문 폼 본문 */}
      <main className="max-w-2xl mx-auto px-4 mt-8 space-y-6">
        {/* 설명 배너 */}
        <div className="rounded-2xl border border-[#b8eedf] bg-[#EDFAF4] p-4 flex items-start gap-3 text-xs text-[#065A38] leading-relaxed">
          <Sparkles className="size-4 shrink-0 text-[#1A9E7A] mt-0.5" />
          <div>
            <p className="font-bold">멤버 각자 독립적으로 취향을 작성합니다.</p>
            <p className="text-[#0a5a38]/80 mt-0.5">
              서로 눈치 보지 않고 원하는 스타일을 선택해 주세요! AI가 모든 멤버의 취향을 골고루 반영해 최적의 동선을 만듭니다.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-xl p-3.5 text-xs font-medium border ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-red-50 text-red-600 border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. 음식 카테고리 */}
          <div className="rounded-2xl border border-[#E2E2DA] bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#18181B]">
              <Utensils className="size-4 text-[#1A9E7A]" />
              <h3>먹고 싶은 음식 카테고리 (복수 선택)</h3>
            </div>
            <p className="text-xs text-[#6B6B72]">이번 여행에서 꼭 맛보고 싶은 메뉴를 골라주세요.</p>

            <div className="flex flex-wrap gap-2 pt-1">
              {FOOD_OPTIONS.map((item) => {
                const isSelected = selectedFoods.includes(item.label)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleFood(item.label)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-[#1A9E7A] text-white shadow-sm ring-2 ring-[#1A9E7A]/20"
                        : "border border-[#E2E2DA] bg-white text-[#6B6B72] hover:bg-[#F8F8F6]"
                    }`}
                  >
                    {item.label}
                    {isSelected && <Check className="size-3 stroke-[3]" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. 활동 유형 */}
          <div className="rounded-2xl border border-[#E2E2DA] bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#18181B]">
              <Activity className="size-4 text-[#1A9E7A]" />
              <h3>선호하는 여행 활동 (복수 선택)</h3>
            </div>
            <p className="text-xs text-[#6B6B72]">어떤 분위기와 일정으로 하루를 채우고 싶으신가요?</p>

            <div className="flex flex-wrap gap-2 pt-1">
              {ACTIVITY_OPTIONS.map((item) => {
                const isSelected = selectedActivities.includes(item.label)
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleActivity(item.label)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-[#1A9E7A] text-white shadow-sm ring-2 ring-[#1A9E7A]/20"
                        : "border border-[#E2E2DA] bg-white text-[#6B6B72] hover:bg-[#F8F8F6]"
                    }`}
                  >
                    {item.label}
                    {isSelected && <Check className="size-3 stroke-[3]" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. 기피 장소 키워드 */}
          <div className="rounded-2xl border border-[#E2E2DA] bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#18181B]">
              <Ban className="size-4 text-red-500" />
              <h3>기피 장소 또는 피하고 싶은 요소</h3>
            </div>
            <p className="text-xs text-[#6B6B72]">피하고 싶은 장소나 키워드를 쉼표(,)로 구분해 적어주세요.</p>

            <input
              type="text"
              value={excludedKeywords}
              onChange={(e) => setExcludedKeywords(e.target.value)}
              placeholder="예) 클럽, 시끄러운 술집, 매운 음식, 웨이팅 1시간 이상"
              className="w-full rounded-xl border border-[#E2E2DA] bg-transparent px-3.5 py-2.5 text-xs outline-none focus:border-[#1A9E7A] transition"
            />
          </div>

          {/* 4. 자유 메모 */}
          <div className="rounded-2xl border border-[#E2E2DA] bg-white p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#18181B]">
              <MessageSquare className="size-4 text-[#1A9E7A]" />
              <h3>자유 메모</h3>
            </div>
            <p className="text-xs text-[#6B6B72]">동행 멤버들과 AI에게 전하고 싶은 특별한 요청사항이 있다면 자유롭게 적어주세요.</p>

            <textarea
              rows={3}
              value={freeMemo}
              onChange={(e) => setFreeMemo(e.target.value)}
              placeholder="예) 하루 1만 보 이상 걷기는 힘들어요. 오전 10시 이후 느긋하게 시작하고 싶습니다!"
              className="w-full rounded-xl border border-[#E2E2DA] bg-transparent p-3 text-xs outline-none focus:border-[#1A9E7A] transition resize-none"
            />
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-[#1A9E7A] py-3.5 text-sm font-bold text-white hover:bg-[#158063] transition shadow-md shadow-[#1A9E7A]/15 disabled:opacity-50"
          >
            {isSubmitting
              ? "저장 중..."
              : isSubmittedBefore
              ? "선호도 수정하여 저장하기"
              : "선호도 설문 제출하기 →"}
          </button>
        </form>
      </main>
    </div>
  )
}
