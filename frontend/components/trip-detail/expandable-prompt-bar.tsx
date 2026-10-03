"use client"

import React, { useState, useRef, useEffect } from "react"
import { Sparkles, ArrowRight, CornerDownLeft, X, Compass, Layers } from "lucide-react"

export interface ExpandablePromptBarProps {
  destination?: string
  onSubmitPrompt: (promptText: string) => void
  disabled?: boolean
  className?: string
}

export function ExpandablePromptBar({
  destination = "여행지",
  onSubmitPrompt,
  disabled = false,
  className = "",
}: ExpandablePromptBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [promptText, setPromptText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [isExpanded])

  function handleSend() {
    if (!promptText.trim() || disabled) return
    onSubmitPrompt(promptText.trim())
    setPromptText("")
    setIsExpanded(false)
  }

  return (
    <>
      {/* 1. 축소 상태 (하단에 깔끔하게 배치된 슬릭한 트리거 바) */}
      {!isExpanded && (
        <div
          onClick={() => setIsExpanded(true)}
          className={`group cursor-pointer rounded-2xl border border-[#E2E2DA] bg-white/95 hover:border-[#1A9E7A] p-3 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-between gap-3 ${className}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex size-7 items-center justify-center rounded-xl bg-[#EDFAF4] text-[#1A9E7A] group-hover:scale-105 transition">
              <Sparkles className="size-4 text-amber-500 fill-amber-500" />
            </span>
            <span className="text-xs font-semibold text-[#6B6B72] group-hover:text-[#18181B] truncate">
              AI에게 추가 동선 요청하기 (예: "2일차 오후에 근교 사슴공원 넣어줘")
            </span>
          </div>

          <span className="shrink-0 flex items-center gap-1 rounded-xl bg-[#1A9E7A] px-3 py-1.5 text-xs font-bold text-white shadow-xs group-hover:bg-[#158063] transition">
            <span>AI 추천</span>
            <ArrowRight className="size-3" />
          </span>
        </div>
      )}

      {/* 2. 확장 상태: Gemini 웹 채팅창처럼 화면 정중앙으로 스무스하게 올라오면서 길어지는 모달 오버레이 */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsExpanded(false)}
          />

          <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-[#1A9E7A] bg-white p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E2E2DA] pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#EDFAF4] text-[#1A9E7A]">
                  <Sparkles className="size-4 text-amber-500" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-[#18181B]">
                    Gemini AI 맞춤 동선 추천
                  </h4>
                  <p className="text-[11px] text-[#6B6B72]">
                    원하는 장소, 선호하는 맛집 스타일, 일정 변경 사항을 구체적으로 적어주세요.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="flex size-7 items-center justify-center rounded-full hover:bg-slate-100 text-[#6B6B72] transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* 입력 폼 */}
            <div className="rounded-2xl border border-[#E2E2DA] bg-slate-50/70 p-3.5 focus-within:border-[#1A9E7A] focus-within:bg-white transition">
              <textarea
                ref={textareaRef}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="예: 2일차 점심에 우메다 근처 오코노미야키 맛집을 추가하고, 저녁에는 야경 전망대 코스로 수정해줘."
                className="w-full bg-transparent resize-none outline-none text-xs sm:text-sm text-[#18181B] placeholder:text-[#9E9EA4] leading-relaxed min-h-[90px]"
                disabled={disabled}
              />

              <div className="flex items-center justify-between pt-2 border-t border-[#E2E2DA]/60">
                <span className="text-[11px] text-[#8A8A93] flex items-center gap-1">
                  <Compass className="size-3 text-[#1A9E7A]" />
                  <span>Google 검색 도구 실시간 연동</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="px-3 py-1.5 text-xs text-[#6B6B72] hover:text-[#18181B] font-semibold"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!promptText.trim() || disabled}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#1A9E7A] text-white text-xs font-bold hover:bg-[#158063] transition shadow-xs disabled:opacity-30"
                  >
                    <span>추천 요청</span>
                    <CornerDownLeft className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 퀵 프롬프트 예시 태그 */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-[#8A8A93] font-medium mr-1">추천 예시:</span>
              {[
                "2일차에 감성 카페 위주로 변경해줘",
                "이동 시간 짧은 대중교통 최적화 코스로 짜줘",
                "현지인 인기 디저트 맛집 추가해줘",
              ].map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPromptText(sample)}
                  className="rounded-full border border-[#E2E2DA] bg-white px-2.5 py-1 text-[11px] text-[#6B6B72] hover:text-[#1A9E7A] hover:border-[#1A9E7A] transition"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
