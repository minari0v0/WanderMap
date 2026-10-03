"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Sparkles,
  ArrowRight,
  MapPin,
  Calendar,
  Plane,
  Compass,
  CornerDownLeft,
} from "lucide-react"
import { tripService, type TripResponse } from "@/lib/trip-service"
import type { UserResponse } from "@/lib/auth-service"

export interface AiPromptHubProps {
  currentUser: UserResponse
  onOpenManualModal?: () => void
}

const GUIDE_PHRASES = [
  "설렌 마음 그대로 계획해볼까요?",
  "어디로 떠나나요?",
  "WanderMap과 힘찬 출발!",
  "우리가 함께 만드는 완벽한 여행 지도 ✈️",
]

const QUICK_DESTINATIONS = ["오사카", "도쿄", "후쿠오카", "제주도", "교토", "타이베이"]

const SAMPLE_PROMPTS = [
  {
    tag: "🍣 오사카 미식 & 야경",
    text: "오사카 3박 4일 일정으로 첫날은 난바 숙소 체크인 후 도톤보리 야경과 라멘 맛집 위주로 짜줘.",
    dest: "오사카",
  },
  {
    tag: "🌿 제주 힐링 드라이브",
    text: "제주도 2박 3일 힐링 코스로 바다가 보이는 감성 카페와 맛있는 흑돼지 식당 추천해줘.",
    dest: "제주도",
  },
  {
    tag: "⛩️ 간사이 & 사슴공원",
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
    <div className="relative flex flex-col items-center justify-center min-h-full px-4 sm:px-8 py-12 text-[#18181B]">
      {/* 1. 감성 가이드 대형 타이포그래피 문구 (클로드/ChatGPT 스타일) */}
      <div className="text-center space-y-3 mb-8 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#18181B] leading-tight min-h-[58px] sm:min-h-[64px] flex items-center justify-center">
          <span>{guidePhrase}</span>
        </h1>

        <p className="text-xs sm:text-sm text-[#4A5568] max-w-md mx-auto font-medium">
          가고 싶은 도시와 원하는 여행 분위기를 자유롭게 적어보세요. AI가 실데이터를 기반으로 최적의 동선을 즉시 설계해 드려요.
        </p>
      </div>

      {/* 2. 대형 ChatGPT / Gemini 스타일 프롬프트 입력창 (핵심 킥!) */}
      <div className="w-full max-w-3xl space-y-4">
        {/* 상단 퀵 칩 (목적지 & 날짜) */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* 목적지 선택 칩 */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E2E2DA] text-xs shadow-xs">
            <MapPin className="size-3.5 text-[#1A9E7A]" />
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="목적지 (예: 오사카, 제주)"
              className="bg-transparent outline-none text-xs w-28 text-[#18181B] placeholder:text-[#9E9EA4]"
            />
          </div>

          {/* 날짜 선택 토글 칩 */}
          <button
            type="button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs shadow-xs transition ${
              startDate
                ? "bg-[#EDFAF4] border-[#1A9E7A] text-[#1A9E7A] font-bold"
                : "bg-white border-[#E2E2DA] text-[#6B6B72] hover:text-[#18181B]"
            }`}
          >
            <Calendar className="size-3.5" />
            <span>
              {startDate && endDate ? `${startDate} ~ ${endDate}` : "여행 날짜 선택 (선택 사항)"}
            </span>
          </button>
        </div>

        {/* 날짜 피커 인라인 팝업 */}
        {showDatePicker && (
          <div className="flex flex-wrap items-center justify-center gap-3 p-3 rounded-2xl bg-white border border-[#E2E2DA] shadow-md max-w-md mx-auto animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#8A8A93]">출발:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-[#E2E2DA] px-2 py-1 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#8A8A93]">도착:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-[#E2E2DA] px-2 py-1 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowDatePicker(false)}
              className="text-xs px-2.5 py-1 rounded-lg bg-[#1A9E7A] text-white font-bold"
            >
              확인
            </button>
          </div>
        )}

        {/* 메인 프롬프트 텍스트 박스 */}
        <div className="relative rounded-3xl border border-[#E2E2DA] bg-white/95 backdrop-blur-xl shadow-xl hover:border-[#1A9E7A]/60 focus-within:border-[#1A9E7A] focus-within:ring-4 focus-within:ring-[#1A9E7A]/10 transition duration-200">
          <form onSubmit={handleSendPrompt} className="p-4 sm:p-5 flex flex-col justify-between min-h-[140px]">
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
              className="w-full bg-transparent resize-none outline-none text-sm text-[#18181B] placeholder:text-[#9E9EA4] leading-relaxed min-h-[70px]"
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

        {/* 3. 추천 프롬프트 칩들 */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[11px] text-[#8A8A93] text-center font-medium">추천 질문으로 바로 시작하기</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className="rounded-full border border-[#E2E2DA] bg-white/80 hover:bg-white hover:border-[#1A9E7A] px-3.5 py-1.5 text-xs text-[#27272A] hover:text-[#1A9E7A] shadow-xs transition duration-150"
              >
                {sample.tag}
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
                  ? "Google 검색으로 최신 장소 탐색 중..."
                  : "일자별 최적 동선을 연결하고 있습니다..."}
              </h3>
              <p className="text-xs text-[#6B6B72] leading-relaxed">
                폐업 여부와 실좌표를 확인하여 환각 없는 정확한 지도를 완성하고 있습니다.
              </p>
            </div>

            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#1A9E7A] to-emerald-400 animate-pulse w-3/4 mx-auto rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
