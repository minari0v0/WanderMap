"use client"

import React, { useState } from "react"
import {
  MapPin,
  Clock,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Lock,
} from "lucide-react"
import type { Place } from "@/lib/trip-data"

export interface ItineraryTimelineProps {
  places: Place[]
  activeId: string | null
  onSelectPlace: (id: string) => void
  onVote: (id: string, dir: "up" | "down") => void
  onAddPlace?: () => void
  onOpenAiRecommend?: () => void
  readOnly?: boolean
  totalDays?: number
}

export function ItineraryTimeline({
  places,
  activeId,
  onSelectPlace,
  onVote,
  onAddPlace,
  onOpenAiRecommend,
  readOnly = false,
  totalDays = 3,
}: ItineraryTimelineProps) {
  const [activeDay, setActiveDay] = useState(1)

  return (
    <div className="flex-1 flex flex-col rounded-2xl border border-[#E2E2DA] bg-white shadow-sm overflow-hidden text-[#18181B]">
      {/* 1. 상단: Day 탭 & AI 추천 보조 버튼 */}
      <div className="p-4 border-b border-[#E2E2DA] flex items-center justify-between gap-2 bg-slate-50/60">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-3.5 py-2 rounded-xl text-sm font-extrabold transition shrink-0 cursor-pointer ${
                activeDay === day
                  ? "bg-[#1A9E7A] text-white shadow-xs"
                  : "bg-white border border-[#E2E2DA] text-[#6B6B72] hover:text-[#18181B]"
              }`}
            >
              Day {day}
            </button>
          ))}
        </div>

        {/* AI 추천 보조 버튼 */}
        {!readOnly && onOpenAiRecommend && (
          <button
            onClick={onOpenAiRecommend}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 hover:bg-amber-100 font-bold text-xs sm:text-sm transition shadow-2xs cursor-pointer"
          >
            <Sparkles className="size-4 text-amber-500 fill-amber-500" />
            <span className="hidden sm:inline">AI 추천</span>
          </button>
        )}
      </div>

      {/* 2. 동선 카드 리스트 (세로 스크롤) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#FAFAF8]/30">
        {places.length === 0 ? (
          <div className="py-14 text-center text-sm text-[#8A8A93] space-y-1.5">
            <p className="font-bold">아직 등록된 장소가 없습니다</p>
          </div>
        ) : (
          places.map((place, idx) => {
            const isActive = activeId === place.id

            return (
              <div
                key={place.id}
                onClick={() => onSelectPlace(place.id)}
                className={`group relative cursor-pointer rounded-2xl border p-4 transition flex flex-col justify-between space-y-3 ${
                  isActive
                    ? "bg-white border-[#1A9E7A] shadow-md ring-2 ring-[#1A9E7A]/10"
                    : "bg-white border-[#E2E2DA] hover:border-[#1A9E7A]/40 shadow-xs"
                }`}
              >
                {/* 상단 장소 정보 */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-extrabold mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[15px] text-[#18181B] truncate">
                          {place.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#EDFAF4] text-[#1A9E7A]">
                          {place.category}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B6B72] truncate flex items-center gap-1.5 font-medium">
                        <MapPin className="size-3.5 text-[#9E9EA4] shrink-0" />
                        <span>{place.address}</span>
                      </p>
                    </div>
                  </div>

                  {place.time && (
                    <span className="shrink-0 text-xs font-semibold text-[#6B6B72] flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-full border border-[#E2E2DA]">
                      <Clock className="size-3.5" />
                      <span>{place.time}</span>
                    </span>
                  )}
                </div>

                {/* 하단 투표 및 상태 바 */}
                <div className="pt-2.5 border-t border-[#E2E2DA]/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {/* 찬성 투표 */}
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={(e) => {
                        e.stopPropagation()
                        onVote(place.id, "up")
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#1A9E7A]/30 bg-[#EDFAF4] hover:bg-[#EDFAF4]/80 text-[#1A9E7A] font-extrabold text-xs sm:text-sm transition disabled:opacity-50 cursor-pointer"
                      title="찬성"
                    >
                      <ThumbsUp className="size-3.5" />
                      <span>{place.votesUp}</span>
                    </button>

                    {/* 반대 투표 */}
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={(e) => {
                        e.stopPropagation()
                        onVote(place.id, "down")
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E2DA] bg-white hover:bg-slate-50 text-[#6B6B72] font-bold text-xs sm:text-sm transition disabled:opacity-50 cursor-pointer"
                      title="반대"
                    >
                      <ThumbsDown className="size-3.5" />
                      <span>{place.votesDown}</span>
                    </button>
                  </div>

                  {readOnly ? (
                    <span className="text-xs text-[#8A8A93] flex items-center gap-1 font-medium">
                      <Lock className="size-3.5" />
                      <span>조회 전용</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[#1A9E7A] font-extrabold">
                      {place.status === "confirmed" ? "✓ 확정 동선" : "투표 진행 중"}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 3. 하단 장소 직접 추가 버튼 */}
      {!readOnly && onAddPlace && (
        <div className="p-3.5 border-t border-[#E2E2DA] bg-white">
          <button
            onClick={onAddPlace}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[#E2E2DA] hover:border-[#1A9E7A] hover:bg-[#EDFAF4]/30 text-sm font-bold text-[#52525B] hover:text-[#1A9E7A] transition cursor-pointer"
          >
            <Plus className="size-4" />
            <span>장소 직접 추가</span>
          </button>
        </div>
      )}
    </div>
  )
}
