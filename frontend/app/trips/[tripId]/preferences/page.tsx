"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  tripService,
  type TripResponse,
  type PreferenceResponse,
} from "@/lib/trip-service"
import { authService } from "@/lib/auth-service"
import { showToast } from "@/components/ui/system-alert"
import { ArrowLeft, Check, Users } from "lucide-react"

interface PreferencesPageProps {
  params: Promise<{ tripId: string }>
}

const PACE_OPTIONS = [
  {
    id: "여유로운 힐링 템포",
    title: "여유로운 템포",
    desc: "하루 2~3곳만 느긋하게 둘러보고 충분히 쉬어가요",
  },
  {
    id: "균형 잡힌 표준 템포",
    title: "균형 잡힌 템포",
    desc: "핵심 명소 관람과 카페 휴식을 적절히 배분해요",
  },
  {
    id: "알찬 명소 정복 템포",
    title: "알찬 명소 정복",
    desc: "아침부터 저녁까지 주요 스팟을 빠짐없이 돌아봐요",
  },
]

const FOOD_OPTIONS = [
  "현지 대표 로컬 맛집",
  "웨이팅 없는 쾌적한 식당",
  "감성 로스터리 카페 · 디저트",
  "깔끔한 정식 · 현지 가정식",
  "분위기 좋은 다이닝 · 브런치",
  "야시장 · 로컬 길거리 간식",
  "저녁 맥주 · 이자카야",
  "가성비 좋은 캐주얼 식사",
]

const ACTIVITY_OPTIONS = [
  "대표 랜드마크 · 명소 관람",
  "자연 풍경 · 공원 산책",
  "편집샵 · 쇼핑 스트리트",
  "미술관 · 박물관 · 전시",
  "전망대 · 야경 감상",
  "조용한 골목길 · 동네 탐방",
  "온천 · 스파 · 휴양",
]

const AVOID_OPTIONS = [
  "30분 이상 긴 웨이팅",
  "오래 걷는 도보 강행군",
  "이른 아침 출발 일정",
  "향신료가 강한 음식",
  "날것 · 해산물 위주 식사",
  "인파가 너무 몰리는 번화가",
]

export default function PreferencesPage({ params }: PreferencesPageProps) {
  const router = useRouter()
  const { tripId } = use(params)

  const [trip, setTrip] = useState<TripResponse | null>(null)
  const [allPreferences, setAllPreferences] = useState<PreferenceResponse[]>([])

  const [selectedPace, setSelectedPace] = useState<string>(PACE_OPTIONS[1].id)
  const [selectedFoods, setSelectedFoods] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [selectedAvoids, setSelectedAvoids] = useState<string[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittedBefore, setIsSubmittedBefore] = useState(false)

  useEffect(() => {
    async function loadData() {
      const session = authService.getSession()
      if (!session) {
        showToast("로그인이 필요한 기능입니다.", "warning")
        router.replace(`/trips/${encodeURIComponent(tripId)}`)
        return
      }

      try {
        const isNumericId = /^\d+$/.test(tripId)
        const tripData = isNumericId
          ? await tripService.getTrip(Number(tripId))
          : await tripService.getTripByInviteCode(tripId)
        setTrip(tripData)

        const [myPref, groupPrefs] = await Promise.all([
          tripService.getMyPreference(tripData.id, session.id).catch(() => null),
          tripService.getTripPreferences(tripData.id).catch(() => []),
        ])

        if (Array.isArray(groupPrefs)) {
          setAllPreferences(groupPrefs)
        }

        if (myPref) {
          setSelectedFoods(myPref.foodCategories || [])
          setSelectedActivities(myPref.activityTypes || [])
          if (myPref.freeMemo && PACE_OPTIONS.some((p) => p.id === myPref.freeMemo)) {
            setSelectedPace(myPref.freeMemo)
          }
          if (myPref.excludedKeywords) {
            setSelectedAvoids(
              myPref.excludedKeywords
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          setIsSubmittedBefore(true)
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [tripId, router])

  function toggleItem(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item])
  }

  async function handleSubmit() {
    const session = authService.getSession()
    if (!session || !trip) {
      showToast("로그인이 필요한 기능입니다.", "warning")
      return
    }

    setIsSubmitting(true)
    try {
      await tripService.submitPreference(trip.id, {
        foodCategories: selectedFoods,
        activityTypes: selectedActivities,
        excludedKeywords: selectedAvoids.join(", "),
        freeMemo: selectedPace,
        userId: session.id,
      })

      showToast("취향 선택이 저장되었습니다! 여행 일정 화면으로 돌아갑니다.", "success")
      setTimeout(() => {
        router.push(`/trips/${trip.inviteCode || tripId}`)
      }, 900)
    } catch {
      showToast("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.", "error")
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#F7F7F2]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1A9E7A] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F7F7F2] text-[#18181B] font-sans py-8 px-4 sm:px-6 lg:px-10">
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* 상단 네비게이션 & 헤더 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push(`/trips/${trip?.inviteCode || tripId}`)}
            className="flex items-center gap-2 rounded-full border border-[#E2E2DA] bg-white px-4 py-2.5 text-sm font-extrabold text-[#18181B] hover:border-[#1A9E7A] hover:text-[#1A9E7A] transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>일정 보드로 돌아가기</span>
          </button>

          {allPreferences.length > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-white border border-[#E2E2DA] px-4 py-2 text-sm font-extrabold text-[#27272A]">
              <Users className="size-4 text-[#1A9E7A]" />
              <span>{allPreferences.length}명 참여 완료</span>
            </div>
          )}
        </div>

        {/* 타이틀 배너 */}
        <div className="rounded-3xl border border-[#E2E2DA] bg-white p-6 sm:p-8 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-[#EDFAF4] text-[#1A9E7A] text-xs font-extrabold">
              {trip?.destination || "여행"} 동행자 취향 맞추기
            </span>
            {isSubmittedBefore && (
              <span className="px-2.5 py-1 rounded-lg bg-[#F7F7F2] text-[#52525B] text-xs font-bold">
                내가 선택한 취향 수정 가능
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#18181B]">
            이번 여행, 어떤 스타일을 선호하시나요?
          </h1>
          <p className="text-[15px] font-medium text-[#6B6B72]">
            직접 입력할 필요 없이 원하는 카드만 가볍게 눌러주세요. 동행자들의 선택을 모아 일정 추천과 동선 조율에 반영합니다.
          </p>
        </div>

        {/* 1. 여행 템포 선택 (단일 선택 밸런스 카드) */}
        <section className="rounded-3xl border border-[#E2E2DA] bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#18181B]">
              1. 하루 일정 템포
            </h2>
            <p className="text-sm font-medium text-[#6B6B72] mt-0.5">
              가장 편안하게 느끼는 여행 속도를 골라주세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {PACE_OPTIONS.map((pace) => {
              const active = selectedPace === pace.id
              return (
                <button
                  key={pace.id}
                  type="button"
                  onClick={() => setSelectedPace(pace.id)}
                  className={`text-left rounded-2xl border p-5 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    active
                      ? "border-[#1A9E7A] bg-[#EDFAF4]/50 ring-2 ring-[#1A9E7A]/15"
                      : "border-[#E2E2DA] bg-[#FBFBF9] hover:border-[#1A9E7A]/40 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base sm:text-[17px] font-extrabold text-[#18181B]">
                      {pace.title}
                    </span>
                    <span
                      className={`flex size-6 items-center justify-center rounded-full border transition ${
                        active
                          ? "border-[#1A9E7A] bg-[#1A9E7A] text-white"
                          : "border-[#D4D4CD] bg-white text-transparent"
                      }`}
                    >
                      <Check className="size-3.5" />
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#52525B] leading-relaxed">
                    {pace.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* 2. 식사 및 맛집 스타일 (복수 선택) */}
        <section className="rounded-3xl border border-[#E2E2DA] bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#18181B]">
                2. 선호하는 식사 · 카페 스타일
              </h2>
              <p className="text-sm font-medium text-[#6B6B72] mt-0.5">
                원하는 항목을 여러 개 선택할 수 있습니다.
              </p>
            </div>
            <span className="text-xs font-extrabold text-[#1A9E7A]">
              {selectedFoods.length}개 선택됨
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FOOD_OPTIONS.map((item) => {
              const active = selectedFoods.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(selectedFoods, setSelectedFoods, item)}
                  className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left text-[15px] sm:text-base font-extrabold transition cursor-pointer ${
                    active
                      ? "border-[#1A9E7A] bg-[#EDFAF4]/60 text-[#18181B]"
                      : "border-[#E2E2DA] bg-[#FBFBF9] hover:bg-white text-[#27272A]"
                  }`}
                >
                  <span>{item}</span>
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition ${
                      active
                        ? "border-[#1A9E7A] bg-[#1A9E7A] text-white"
                        : "border-[#D4D4CD] bg-white text-transparent"
                    }`}
                  >
                    <Check className="size-3.5" />
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 3. 여행 활동 테마 (복수 선택) */}
        <section className="rounded-3xl border border-[#E2E2DA] bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#18181B]">
                3. 가고 싶은 장소 · 활동 테마
              </h2>
              <p className="text-sm font-medium text-[#6B6B72] mt-0.5">
                이번 여행에서 꼭 즐기고 싶은 활동을 골라주세요.
              </p>
            </div>
            <span className="text-xs font-extrabold text-[#1A9E7A]">
              {selectedActivities.length}개 선택됨
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACTIVITY_OPTIONS.map((item) => {
              const active = selectedActivities.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    toggleItem(selectedActivities, setSelectedActivities, item)
                  }
                  className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left text-[15px] sm:text-base font-extrabold transition cursor-pointer ${
                    active
                      ? "border-[#1A9E7A] bg-[#EDFAF4]/60 text-[#18181B]"
                      : "border-[#E2E2DA] bg-[#FBFBF9] hover:bg-white text-[#27272A]"
                  }`}
                >
                  <span>{item}</span>
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition ${
                      active
                        ? "border-[#1A9E7A] bg-[#1A9E7A] text-white"
                        : "border-[#D4D4CD] bg-white text-transparent"
                    }`}
                  >
                    <Check className="size-3.5" />
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 4. 피하고 싶은 요소 (선택 사항, 클릭만으로 선택) */}
        <section className="rounded-3xl border border-[#E2E2DA] bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#18181B]">
              4. 이것만은 피하고 싶어요 (선택)
            </h2>
            <p className="text-sm font-medium text-[#6B6B72] mt-0.5">
              동선 계획 시 제외하거나 주의할 항목이 있다면 눌러주세요.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {AVOID_OPTIONS.map((item) => {
              const active = selectedAvoids.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleItem(selectedAvoids, setSelectedAvoids, item)}
                  className={`rounded-2xl border px-4 py-3 text-sm sm:text-[15px] font-extrabold transition cursor-pointer ${
                    active
                      ? "border-rose-400 bg-rose-50 text-rose-700"
                      : "border-[#E2E2DA] bg-[#FBFBF9] hover:bg-white text-[#52525B]"
                  }`}
                >
                  {item}
                </button>
              )
            })}
          </div>
        </section>

        {/* 하단 완료 버튼 */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full h-14 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] text-base sm:text-lg font-extrabold text-white shadow-md shadow-[#1A9E7A]/20 transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "저장하는 중..." : "취향 선택 완료하기"}
          </button>
        </div>
      </div>
    </div>
  )
}
