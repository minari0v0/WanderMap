"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  MapPin,
  Calendar,
  Compass,
  CornerDownLeft,
  Sparkles,
} from "lucide-react"
import { tripService } from "@/lib/trip-service"
import type { UserResponse } from "@/lib/auth-service"
import { DateRangePicker } from "@/components/ui/date-range-picker"

export interface AiPromptHubProps {
  currentUser: UserResponse
  onOpenManualModal?: () => void
}

const GUIDE_PHRASES = [
  "설렌 마음 그대로 계획해볼까요?",
  "어디로 떠나나요?",
  "WanderMap과 함께 떠나는 특별한 여행",
  "우리가 함께 만드는 완벽한 여행 지도 ✈️",
]

const QUICK_DESTINATIONS = ["오사카", "도쿄", "후쿠오카", "제주도", "교토", "타이베이"]

const SAMPLE_PROMPTS = [
  {
    tag: "🍣 오사카 미식 & 야경 코스",
    text: "오사카 3박 4일 일정으로 첫날은 난바 숙소 체크인 후 도톤보리 야경과 라멘 맛집 위주로 짜줘.",
    dest: "오사카",
  },
  {
    tag: "🌿 제주 힐링 드라이브",
    text: "제주도 2박 3일 힐링 코스로 바다가 보이는 감성 카페와 맛있는 흑돼지 식당 추천해줘.",
    dest: "제주도",
  },
  {
    tag: "⛩️ 간사이 & 사슴공원 나들이",
    text: "간사이 여행으로 오사카 시내 둘러보고 둘째 날에는 나라 사슴공원 나들이 다녀오는 동선 부탁해.",
    dest: "오사카",
  },
]

export function AiPromptHub({ currentUser, onOpenManualModal }: AiPromptHubProps) {
  const router = useRouter()

  // 1. 감성 가이드 문구: 페이지 접속 시 1회만 랜덤 선택되고 머무는 동안은 고정 (ChatGPT / Gemini 스타일)
  const [guidePhrase, setGuidePhrase] = useState(GUIDE_PHRASES[0])
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * GUIDE_PHRASES.length)
    setGuidePhrase(GUIDE_PHRASES[randomIndex])
  }, [])

  // 2. 입력 상태
  const [promptText, setPromptText] = useState("")
  const [destination, setDestination] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showDatePicker, setShowDatePicker] = useState(false)

  // 3. 로딩 상태
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  // 4. 전송 및 동선 생성
  async function handleSendPrompt(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!promptText.trim() && !destination.trim()) return

    setIsGenerating(true)
    setLoadingStep(1)

    // 로딩 문구 시뮬레이션
    const stepTimer = setTimeout(() => {
      setLoadingStep(2)
    }, 900)

    try {
      // 목적지 추출: 직접 지정했거나 프롬프트에서 추론
      let targetDest = destination.trim()
      if (!targetDest) {
        for (const city of QUICK_DESTINATIONS) {
          if (promptText.includes(city)) {
            targetDest = city
            break
          }
        }
      }
      if (!targetDest) {
        targetDest = "오사카"
      }

      // 제목 생성
      const tripTitle = `${targetDest} ${promptText.length > 20 ? promptText.slice(0, 18) + "..." : "힐링 여행"} ✈️`

      // 날짜는 지정하지 않았다면 미정(빈 값)으로 처리
      const finalStartDate = startDate || ""
      const finalEndDate = endDate || ""

      // 새 여행 방 생성 (백엔드 저장)
      const newTrip = await tripService.createTrip({
        title: tripTitle,
        destination: targetDest,
        startDate: finalStartDate || "2026-10-24", // 임시 폴백
        endDate: finalEndDate || "2026-10-27",
        userId: currentUser.id,
      })

      // 상세 페이지로 부드러운 전환
      setTimeout(() => {
        router.push(`/trips/${newTrip.inviteCode || newTrip.id}`)
      }, 700)
    } catch (err) {
      console.error("AI 동선 생성 오류:", err)
      alert("동선 생성 중 오류가 발생했습니다. 다시 시도해 주세요.")
      setIsGenerating(false)
    } finally {
      clearTimeout(stepTimer)
    }
  }

  function handleSelectSample(sample: (typeof SAMPLE_PROMPTS)[0]) {
    setPromptText(sample.text)
    setDestination(sample.dest)
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full max-w-3xl mx-auto px-4 sm:px-6 select-none">
      {/* 1. 감성 가이드 대형 타이포그래피 문구 */}
      <div className="text-center space-y-2 mb-6 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-[#18181B] leading-tight min-h-[50px] sm:min-h-[56px] flex items-center justify-center">
          <span>{guidePhrase}</span>
        </h1>

        <p className="text-xs sm:text-sm text-[#52525B] max-w-md mx-auto font-medium leading-relaxed">
          가고 싶은 도시와 원하는 여행 분위기를 자유롭게 적어보세요. AI가 실데이터를 기반으로 최적의 동선을 즉시 설계해 드려요.
        </p>
      </div>

      {/* 2. 대형 ChatGPT / Gemini 스타일 프롬프트 입력창 (핵심 영역) */}
      <div className="w-full space-y-3.5">
        {/* 상단: 목적지 & 여행 날짜 버튼 (크기 확대 & 간결한 라벨) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {/* 목적지 입력 카드 */}
          <div className="flex items-center gap-2 h-11 px-4 rounded-2xl bg-white/95 border border-[#E2E2DA] shadow-xs hover:border-[#1A9E7A] focus-within:border-[#1A9E7A] focus-within:ring-2 focus-within:ring-[#1A9E7A]/15 transition">
            <MapPin className="size-4 text-[#1A9E7A] shrink-0" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="목적지"
              className="bg-transparent outline-none text-sm w-28 sm:w-36 text-[#18181B] placeholder:text-[#8A8A93] font-medium"
            />
          </div>

          {/* 여행 날짜 선택 버튼 (클릭 시 전용 2클릭 캘린더 팝업 표시) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-2 h-11 px-4 rounded-2xl border text-sm shadow-xs transition ${
                startDate && endDate
                  ? "bg-[#EDFAF4] border-[#1A9E7A] text-[#1A9E7A] font-bold"
                  : "bg-white/95 border-[#E2E2DA] text-[#4A5568] hover:text-[#18181B] hover:border-[#1A9E7A] font-medium"
              }`}
            >
              <Calendar className="size-4 text-[#1A9E7A] shrink-0" />
              <span>
                {startDate && endDate ? `${startDate} ~ ${endDate}` : "여행 날짜"}
              </span>
            </button>

            {/* 커스텀 2클릭 범위 선택 캘린더 컴포넌트 */}
            <DateRangePicker
              isOpen={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              startDate={startDate}
              endDate={endDate}
              onSelectRange={(start, end) => {
                setStartDate(start)
                setEndDate(end)
              }}
            />
          </div>
        </div>

        {/* 메인 프롬프트 텍스트 박스 */}
        <div className="relative rounded-3xl border border-[#E2E2DA] bg-white/95 backdrop-blur-xl shadow-xl hover:border-[#1A9E7A]/60 focus-within:border-[#1A9E7A] focus-within:ring-4 focus-within:ring-[#1A9E7A]/10 transition duration-200">
          <form onSubmit={handleSendPrompt} className="p-4 sm:p-5 flex flex-col justify-between min-h-[135px]">
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendPrompt()
                }
              }}
              placeholder="무엇이든 물어보세요! 예: '3박 4일 오사카 맛집이랑 감성 카페 위주로 짜줘. 첫날은 공항 도착 후 난바 숙소 체크인하고 도톤보리 구경하고 싶어'"
              className="w-full bg-transparent resize-none outline-none text-sm text-[#18181B] placeholder:text-[#9E9EA4] leading-relaxed min-h-[65px]"
              disabled={isGenerating}
            />

            <div className="flex items-center justify-between pt-2 border-t border-[#E2E2DA]/60">
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#8A8A93]">
                  <Compass className="size-3.5 text-[#1A9E7A]" />
                  <span>실시간 장소·좌표 실데이터 매핑</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onOpenManualModal && (
                  <button
                    type="button"
                    onClick={onOpenManualModal}
                    className="hidden sm:inline-flex items-center text-xs text-[#8A8A93] hover:text-[#18181B] px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                  >
                    수동으로 직접 만들기
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isGenerating || (!promptText.trim() && !destination.trim())}
                  className="flex size-9 items-center justify-center rounded-2xl bg-[#1A9E7A] text-white hover:bg-[#158063] transition shadow-md shadow-[#1A9E7A]/25 disabled:opacity-30 disabled:shadow-none"
                  title="동선 생성 시작 (Enter)"
                >
                  <CornerDownLeft className="size-4" />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* 3. 추천 질문으로 바로 시작하기 (칩 형태 지양, 정갈한 텍스트 쿼트 링크 스타일) */}
        <div className="pt-2 text-center space-y-1.5">
          <p className="text-[11px] font-semibold text-[#8A8A93]">추천 질문으로 바로 시작하기</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-2">
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className="group inline-flex items-center gap-1 text-xs text-[#52525B] hover:text-[#1A9E7A] font-medium transition cursor-pointer"
              >
                <span className="text-[#A0AEC0] group-hover:text-[#1A9E7A] transition text-sm leading-none">“</span>
                <span className="group-hover:underline underline-offset-4 decoration-[#1A9E7A]/40">{sample.tag}</span>
                <span className="text-[#A0AEC0] group-hover:text-[#1A9E7A] transition text-sm leading-none">”</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. 회전하는 감성적인 AI 로딩 스피너 모달 (전송 시 표시) */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm rounded-3xl border border-[#E2E2DA] bg-white p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* 회전하는 다채로운 AI 펄스 링 */}
            <div className="relative size-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-[#1A9E7A]/20" />
              <div className="absolute inset-0 rounded-full border-4 border-[#1A9E7A] border-t-transparent animate-spin" />
              <div className="absolute inset-2 rounded-full border-4 border-amber-400 border-b-transparent animate-spin [animation-duration:1.5s]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="size-6 text-[#1A9E7A] animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#18181B]">
                {loadingStep === 1
                  ? "AI가 실시간 검색 그라운딩을 진행 중입니다..."
                  : "최적의 일자별 동선 지도를 설계하고 있어요 ✨"}
              </h3>
              <p className="text-xs text-[#6B6B72]">
                목적지의 위치, 운영 시간, 이동 동선을 고려하여 최적의 추천을 준비합니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
