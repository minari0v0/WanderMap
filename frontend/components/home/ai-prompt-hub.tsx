"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  MapPin,
  Calendar,
  CornerDownLeft,
  Sparkles,
  Plus,
} from "lucide-react"
import { tripService } from "@/lib/trip-service"
import type { UserResponse } from "@/lib/auth-service"
import { DateRangePicker } from "@/components/ui/date-range-picker"

export interface AiPromptHubProps {
  currentUser: UserResponse
  onOpenManualModal?: (preset?: { destination?: string; startDate?: string; endDate?: string }) => void
}

const GUIDE_PHRASES = [
  "설렌 마음 그대로 계획해볼까요?",
  "어디로 떠나나요?",
  "WanderMap과 함께 떠나는 특별한 여행",
  "우리가 함께 만드는 완벽한 여행 지도",
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

// 날짜 범위 및 여행 기간 분리 헬퍼
function parseDateRangeInfo(start: string, end: string) {
  if (!start && !end) return null
  if (start && !end) {
    const [, m, d] = start.split("-")
    return {
      text: `${parseInt(m)}월 ${parseInt(d)}일 출발 ~`,
      duration: null,
    }
  }
  const sDate = new Date(start)
  const eDate = new Date(end)
  const diffTime = Math.abs(eDate.getTime() - sDate.getTime())
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  const nights = diffDays
  const days = diffDays + 1

  const [, sm, sd] = start.split("-")
  const [, em, ed] = end.split("-")

  return {
    text: `${parseInt(sm)}월 ${parseInt(sd)}일 ~ ${parseInt(em)}월 ${parseInt(ed)}일`,
    duration: `${nights}박 ${days}일`,
  }
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 3. 로딩 상태
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  // 4. 전송 및 동선 생성
  async function handleSendPrompt(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!promptText.trim() && !destination.trim()) return

    setIsGenerating(true)
    setLoadingStep(1)

    const stepTimer = setTimeout(() => {
      setLoadingStep(2)
    }, 900)

    try {
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

      const tripTitle = `${targetDest} ${promptText.length > 20 ? promptText.slice(0, 18) + "..." : "힐링 여행"} ✈️`

      const finalStartDate = startDate || "2026-10-24"
      const finalEndDate = endDate || "2026-10-27"

      const newTrip = await tripService.createTrip({
        title: tripTitle,
        destination: targetDest,
        startDate: finalStartDate,
        endDate: finalEndDate,
        userId: currentUser.id,
      })

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
    if (textareaRef.current) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto"
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
        }
      }, 50)
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full max-w-3xl mx-auto px-4 sm:px-6 select-none">
      {/* 1. 감성 가이드 대형 타이포그래피 문구 (한 줄로 시원하게 표시) */}
      <div className="text-center mb-6 max-w-3xl px-2">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#18181B] whitespace-nowrap leading-tight flex items-center justify-center">
          <span>{guidePhrase}</span>
        </h1>
      </div>

      {/* 2. 대화형 플래너 영역 */}
      <div className="w-full space-y-3.5">
        {/* 상단 툴바: 목적지 & 여행 날짜 & 직접 만들기 (동등한 생성 옵션으로 명확히 제시) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {/* 목적지 입력 */}
          <div className="flex items-center gap-2 h-11 px-4 rounded-2xl bg-white/95 border border-[#E2E2DA] shadow-xs hover:border-[#1A9E7A] focus-within:border-[#1A9E7A] focus-within:ring-2 focus-within:ring-[#1A9E7A]/15 transition">
            <MapPin className="size-4 text-[#1A9E7A] shrink-0" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="목적지"
              className="bg-transparent outline-none text-sm w-28 sm:w-32 text-[#18181B] placeholder:text-[#8A8A93] font-medium"
            />
          </div>

          {/* 여행 날짜 선택 버튼 (넓은 너비와 직관적인 포맷 + o박o일 강조) */}
          <div className="relative">
            {(() => {
              const rangeInfo = parseDateRangeInfo(startDate, endDate)
              return (
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`flex items-center justify-between gap-2 h-11 px-4 min-w-[210px] sm:min-w-[260px] rounded-2xl border text-sm shadow-xs transition cursor-pointer ${
                    startDate && endDate
                      ? "bg-white/95 border-[#1A9E7A] text-[#18181B] ring-2 ring-[#1A9E7A]/10 font-medium"
                      : "bg-white/95 border-[#E2E2DA] text-[#4A5568] hover:text-[#18181B] hover:border-[#1A9E7A] font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-[#1A9E7A] shrink-0" />
                    {rangeInfo ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs sm:text-sm text-[#18181B]">{rangeInfo.text}</span>
                        {rangeInfo.duration && (
                          <span className="px-2 py-0.5 rounded-full bg-[#1A9E7A] text-white text-[11px] font-black tracking-tight shadow-xs animate-in zoom-in-95 duration-150 shrink-0">
                            {rangeInfo.duration}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm text-[#4A5568]">여행 날짜 선택</span>
                    )}
                  </div>
                </button>
              )
            })()}

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

          {/* 직접 만들기 버튼 (AI 입력폼에 종속되지 않고 바로 만들 수 있는 동등한 선택지) */}
          {onOpenManualModal && (
            <button
              type="button"
              onClick={() => onOpenManualModal({ destination, startDate, endDate })}
              className="flex items-center gap-1.5 h-11 px-4 rounded-2xl bg-white/95 hover:bg-white border border-[#E2E2DA] hover:border-[#1A9E7A] text-[#18181B] hover:text-[#1A9E7A] font-bold text-sm shadow-xs transition group cursor-pointer"
              title="AI 추천 없이 직접 장소를 추가하며 계획하기"
            >
              <Plus className="size-4 text-[#1A9E7A] group-hover:scale-110 transition" />
              <span>직접 만들기</span>
            </button>
          )}
        </div>

        {/* 메인 프롬프트 텍스트 박스: 기본 1줄 인라인 전송 버튼 + 글이 길어지면 자동 확장 */}
        <div className="relative rounded-3xl border border-[#E2E2DA] bg-white/95 backdrop-blur-xl shadow-xl hover:border-[#1A9E7A]/60 focus-within:border-[#1A9E7A] focus-within:ring-4 focus-within:ring-[#1A9E7A]/10 transition duration-200">
          <form onSubmit={handleSendPrompt} className="p-2 sm:p-2.5 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={promptText}
              onChange={(e) => {
                setPromptText(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendPrompt()
                }
              }}
              rows={1}
              placeholder="WanderMap과 시작하기..."
              className="flex-1 bg-transparent resize-none outline-none text-sm text-[#18181B] placeholder:text-[#9E9EA4] leading-relaxed py-2 px-3 max-h-40 custom-scrollbar"
              style={{ minHeight: "38px" }}
              disabled={isGenerating}
            />

            <button
              type="submit"
              disabled={isGenerating || (!promptText.trim() && !destination.trim())}
              className="shrink-0 flex size-9 items-center justify-center rounded-2xl bg-[#1A9E7A] text-white hover:bg-[#158063] transition shadow-md shadow-[#1A9E7A]/25 disabled:opacity-30 disabled:shadow-none mb-0.5"
              title="동선 생성 시작 (Enter)"
            >
              <CornerDownLeft className="size-4" />
            </button>
          </form>
        </div>

        {/* 3. 추천 질문 박스 (통합 아웃라인 박스로 감싼 구조) */}
        <div className="rounded-2xl border border-[#E2E2DA] bg-white/80 backdrop-blur-sm p-3.5 text-center space-y-1.5 shadow-2xs">
          <p className="text-[11px] font-semibold text-[#8A8A93]">추천 질문으로 바로 시작하기</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-2">
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
