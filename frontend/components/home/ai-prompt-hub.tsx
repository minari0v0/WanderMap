"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  CornerDownLeft,
} from "lucide-react"
import { tripService } from "@/lib/trip-service"
import type { UserResponse } from "@/lib/auth-service"
import { DateRangePicker, parseDateRangeInfo } from "@/components/ui/date-range-picker"

export interface AiPromptHubProps {
  currentUser: UserResponse
  onOpenManualModal?: (preset?: { destination?: string; startDate?: string; endDate?: string }) => void
}

const GUIDE_PHRASES = [
  "설렌 마음 그대로 계획해볼까요?",
  "이번에는 어디로 떠나볼까요?",
  "우리만의 완벽한 여행 지도를 그려보세요",
]

const QUICK_DESTINATIONS = ["오사카", "제주도", "도쿄", "후쿠오카", "교토", "타이베이"]

const AI_QUICK_TAGS = [
  { label: "🍣 맛집 · 야경", text: "현지인 맛집과 야경 명소 위주 코스" },
  { label: "🌿 카페 · 힐링", text: "감성 카페와 여유로운 산책 힐링 코스" },
  { label: "⛩️ 핵심 랜드마크", text: "필수 관광지와 근교 명소 알찬 코스" },
  { label: "🚇 대중교통 최적", text: "이동 동선이 가장 짧은 대중교통 코스" },
]

export function AiPromptHub({ currentUser, onOpenManualModal }: AiPromptHubProps) {
  const router = useRouter()

  const [guidePhrase, setGuidePhrase] = useState(GUIDE_PHRASES[0])
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * GUIDE_PHRASES.length)
    setGuidePhrase(GUIDE_PHRASES[randomIndex])
  }, [])

  // 상단 일반 생성 폼 상태
  const [destination, setDestination] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showDatePicker, setShowDatePicker] = useState(false)

  // 하단 AI 초안 생성 영역 상태
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const aiInputRef = useRef<HTMLInputElement>(null)

  // 로딩 상태
  const [isSubmittingNormal, setIsSubmittingNormal] = useState(false)
  const [isSubmittingAi, setIsSubmittingAi] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)

  function handleToggleAi() {
    const next = !isAiOpen
    setIsAiOpen(next)
    if (next) {
      setTimeout(() => {
        aiInputRef.current?.focus()
      }, 200)
    }
  }

  // 1. 일반 일정 간편 생성 (상단 '시작하기' 버튼)
  async function handleNormalCreate(e: React.FormEvent) {
    e.preventDefault()
    const targetDest = destination.trim()
    if (!targetDest || isSubmittingNormal || isSubmittingAi) return

    setIsSubmittingNormal(true)
    try {
      const range = parseDateRangeInfo(startDate, endDate)
      const durationText = range?.duration ? ` ${range.duration}` : ""
      const tripTitle = `${targetDest}${durationText} 여행 ✈️`

      const finalStartDate = startDate || "2026-10-24"
      const finalEndDate = endDate || "2026-10-27"

      const newTrip = await tripService.createTrip({
        title: tripTitle,
        destination: targetDest,
        startDate: finalStartDate,
        endDate: finalEndDate,
        userId: currentUser.id,
      })

      router.push(`/trips/${newTrip.inviteCode || newTrip.id}`)
    } catch (err) {
      console.error("일반 일정 생성 오류:", err)
      alert("여행 생성 중 오류가 발생했습니다. 다시 시도해 주세요.")
      setIsSubmittingNormal(false)
    }
  }

  // 2. AI 일정 초안 생성 (상단 목적지·날짜 폼 입력값 + 하단 AI 프롬프트 병합 전송)
  async function handleAiDraftCreate(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const trimmedPrompt = aiPrompt.trim()
    const trimmedDest = destination.trim()

    if ((!trimmedPrompt && !trimmedDest) || isSubmittingNormal || isSubmittingAi) return

    setIsSubmittingAi(true)
    setLoadingStep(1)

    const stepTimer = setTimeout(() => {
      setLoadingStep(2)
    }, 800)

    try {
      // 상단 목적지가 입력되어 있으면 우선 사용, 비어 있으면 AI 입력문에서 추출
      let targetDest = trimmedDest
      if (!targetDest && trimmedPrompt) {
        for (const city of QUICK_DESTINATIONS) {
          if (trimmedPrompt.includes(city)) {
            targetDest = city
            break
          }
        }
      }
      if (!targetDest) {
        targetDest = "오사카"
      }

      const range = parseDateRangeInfo(startDate, endDate)
      const durationText = range?.duration ? ` ${range.duration}` : ""

      // 상단 폼 정보 + AI 프롬프트를 결합하여 제목 및 메타데이터 구성
      let tripTitle = `${targetDest}${durationText} AI 추천 코스 ✈️`
      if (trimmedPrompt) {
        const withoutDupDest = trimmedPrompt.startsWith(targetDest)
          ? trimmedPrompt.slice(targetDest.length).trim()
          : trimmedPrompt
        const snippet =
          withoutDupDest.length > 16
            ? withoutDupDest.slice(0, 16) + "..."
            : withoutDupDest
        if (snippet) {
          tripTitle = `${targetDest} · ${snippet} ✈️`
        }
      }

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
      }, 650)
    } catch (err) {
      console.error("AI 초안 생성 오류:", err)
      alert("AI 일정 초안 생성 중 오류가 발생했습니다.")
      setIsSubmittingAi(false)
    } finally {
      clearTimeout(stepTimer)
    }
  }

  const rangeInfo = parseDateRangeInfo(startDate, endDate)

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full max-w-3xl mx-auto px-4 sm:px-6 select-none">
      {/* 1. 메인 헤드라인 */}
      <div className="text-center mb-8 px-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#18181B] leading-tight">
          {guidePhrase}
        </h1>
      </div>

      {/* 2. 통합 플래너 카드 (달력 팝오버가 잘리지 않도록 overflow-visible 유지) */}
      <div className="relative w-full rounded-3xl border border-[#E2E2DA] bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgb(26,158,122,0.08)]">
        {/* =================================================================
            [상단 영역] 일반 일정 생성 (목적지 + 날짜 + 간편 시작 / 상세 생성)
           ================================================================= */}
        <div className="p-5 sm:p-6 space-y-4">
          <form onSubmit={handleNormalCreate} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* 목적지 입력 */}
            <div className="flex-1 flex items-center gap-3 h-14 px-4 rounded-2xl bg-[#F7F7F2] border border-[#E2E2DA] focus-within:bg-white focus-within:border-[#1A9E7A] focus-within:ring-3 focus-within:ring-[#1A9E7A]/10 transition">
              <MapPin className="size-5 text-[#1A9E7A] shrink-0" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="어디로 떠나시나요?"
                className="w-full bg-transparent outline-none text-base text-[#18181B] placeholder:text-[#8A8A93] font-bold"
              />
            </div>

            {/* 날짜 선택 */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`w-full sm:w-auto flex items-center justify-between gap-2.5 h-14 px-4 min-w-[200px] rounded-2xl border text-base transition cursor-pointer ${
                  startDate && endDate
                    ? "bg-[#EDFAF4]/70 border-[#1A9E7A] text-[#18181B] font-bold"
                    : "bg-[#F7F7F2] border-[#E2E2DA] text-[#52525B] hover:border-[#1A9E7A]/60 font-semibold"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="size-5 text-[#1A9E7A] shrink-0" />
                  {rangeInfo ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-[15px] text-[#18181B]">
                        {rangeInfo.text}
                      </span>
                      {rangeInfo.duration && (
                        <span className="px-2 py-0.5 rounded-full bg-[#1A9E7A] text-white text-xs font-extrabold shrink-0">
                          {rangeInfo.duration}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[15px] text-[#6B6B72]">날짜 선택</span>
                  )}
                </div>
              </button>

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

            {/* 일반 생성 버튼 그룹: [시작하기 (간편 생성)] + [상세 생성 (모달)] */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                disabled={isSubmittingNormal || !destination.trim()}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-14 px-5 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] text-white font-extrabold text-base shadow-md shadow-[#1A9E7A]/25 transition disabled:opacity-35 disabled:shadow-none cursor-pointer"
              >
                <span>{isSubmittingNormal ? "생성 중..." : "시작하기"}</span>
                <ArrowRight className="size-4.5" />
              </button>

              {onOpenManualModal && (
                <button
                  type="button"
                  onClick={() => onOpenManualModal({ destination, startDate, endDate })}
                  className="flex items-center justify-center gap-1.5 h-14 px-4 rounded-2xl border border-[#E2E2DA] bg-white hover:bg-[#F7F7F2] hover:border-[#1A9E7A] text-[#27272A] hover:text-[#1A9E7A] font-bold text-sm sm:text-[15px] transition cursor-pointer"
                  title="여행 제목과 세부 일정을 직접 입력하여 생성"
                >
                  <SlidersHorizontal className="size-4 text-[#1A9E7A]" />
                  <span>상세 생성</span>
                </button>
              )}
            </div>
          </form>

          {/* 인기 여행지 칩 */}
          <div className="flex items-center gap-2 flex-wrap">
            {QUICK_DESTINATIONS.map((city) => {
              const isSelected = destination.trim() === city
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => setDestination(isSelected ? "" : city)}
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                    isSelected
                      ? "bg-[#1A9E7A] text-white shadow-xs"
                      : "bg-[#F7F7F2] hover:bg-[#EDFAF4] text-[#52525B] hover:text-[#1A9E7A]"
                  }`}
                >
                  {city}
                </button>
              )
            })}
          </div>
        </div>

        {/* =================================================================
            [하단 영역] AI 일정 초안 자동 생성 (독립된 하단 트레이 + 전용 생성 버튼)
           ================================================================= */}
        <div className="rounded-b-3xl border-t border-[#E2E2DA]/80 bg-[#FAFAF7]/90 overflow-hidden">
          {/* AI 영역 열기/닫기 헤더 바 */}
          <button
            type="button"
            onClick={handleToggleAi}
            className="w-full px-5 sm:px-6 py-3.5 flex items-center justify-between text-left hover:bg-[#EDFAF4]/40 transition cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#EDFAF4] text-[#1A9E7A]">
                <Sparkles className="size-4" />
              </span>
              <span className="text-sm sm:text-[15px] font-extrabold text-[#18181B] group-hover:text-[#1A9E7A] transition">
                AI로 일정 초안 자동 생성
              </span>
              {(destination.trim() || (startDate && endDate)) && (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-[#EDFAF4] text-[#1A9E7A] text-xs font-bold">
                  위 입력 정보 자동 반영
                </span>
              )}
            </div>

            <ChevronDown
              className={`size-4.5 text-[#6B6B72] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isAiOpen ? "rotate-180 text-[#1A9E7A]" : ""
              }`}
            />
          </button>

          {/* 부드러운 60fps 펼침 영역 (CSS Grid 0fr -> 1fr) */}
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[grid-template-rows,opacity] ${
              isAiOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0 pointer-events-none"
            }`}
          >
            <div className="overflow-hidden">
              <div className="px-5 sm:px-6 pb-5 pt-1 space-y-3">
                {/* AI 프롬프트 입력 바 + AI 전용 생성 버튼 */}
                <form
                  onSubmit={handleAiDraftCreate}
                  className="flex items-center gap-2 rounded-2xl border border-[#1A9E7A]/40 bg-white p-1.5 pl-4 focus-within:border-[#1A9E7A] focus-within:ring-3 focus-within:ring-[#1A9E7A]/10 transition shadow-2xs"
                >
                  <input
                    ref={aiInputRef}
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="어떤 코스를 원하시나요? (예: 오사카 도톤보리 맛집과 야경 위주)"
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-[15px] text-[#18181B] placeholder:text-[#8A8A93] font-semibold h-11"
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingAi || (!aiPrompt.trim() && !destination.trim())}
                    className="shrink-0 flex items-center gap-1.5 h-11 px-4 sm:px-5 rounded-xl bg-[#1A9E7A] hover:bg-[#158063] text-white text-sm font-extrabold shadow-xs transition disabled:opacity-35 cursor-pointer"
                  >
                    <Sparkles className="size-4" />
                    <span>초안 생성</span>
                    <CornerDownLeft className="size-3.5 opacity-80 hidden sm:inline" />
                  </button>
                </form>

                {/* 간결한 AI 테마 키워드 칩 */}
                <div className="flex flex-wrap items-center gap-2">
                  {AI_QUICK_TAGS.map((tag) => {
                    const isPicked = aiPrompt === tag.text
                    return (
                      <button
                        key={tag.label}
                        type="button"
                        onClick={() => setAiPrompt(isPicked ? "" : tag.text)}
                        className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                          isPicked
                            ? "border-[#1A9E7A] bg-[#EDFAF4] text-[#1A9E7A]"
                            : "border-[#E2E2DA] bg-white hover:border-[#1A9E7A]/50 text-[#52525B]"
                        }`}
                      >
                        {tag.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI 초안 생성 로딩 모달 */}
      {isSubmittingAi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-[#E2E2DA] bg-white p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="relative size-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-[#1A9E7A]/20" />
              <div className="absolute inset-0 rounded-full border-4 border-[#1A9E7A] border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="size-6 text-[#1A9E7A] animate-pulse" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-extrabold text-[#18181B]">
                {loadingStep === 1
                  ? "여행 스타일을 분석하고 있어요..."
                  : "일자별 맞춤 동선 초안을 생성하고 있어요 ✨"}
              </h3>
              <p className="text-sm text-[#6B6B72]">
                잠시만 기다려 주시면 여행 방으로 바로 이동합니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
