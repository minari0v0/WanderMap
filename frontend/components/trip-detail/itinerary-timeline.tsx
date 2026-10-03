"use client"

import React, { useState } from "react"
import {
  MapPin,
  Clock,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  MoveVertical,
  Trash2,
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
      {/* 1. 상단: Day 탭 & AI 추천 버튼 */}
      <div className="p-3.5 border-b border-[#E2E2DA] flex items-center justify-between gap-2 bg-slate-50/60">
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                activeDay === day
                  ? "bg-[#1A9E7A] text-white shadow-xs"
                  : "bg-white border border-[#E2E2DA] text-[#6B6B72] hover:text-[#18181B]"
              }`}
            >
              Day {day}
            </button>
          ))}
        </div>

        {/* AI 추천 버튼 */}
        {!readOnly && onOpenAiRecommend && (
          <button
            onClick={onOpenAiRecommend}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 hover:bg-amber-100 font-bold text-xs transition shadow-2xs"
          >
            <Sparkles className="size-3.5 text-amber-500 fill-amber-500" />
            <span className="hidden sm:inline">AI 동선 추천</span>
          </button>
        )}
      </div>

      {/* 2. 동선 카드 리스트 (세로 스크롤) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#FAFAF8]/30">
        {places.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#8A8A93] space-y-2">
            <p>아직 등록된 장소가 없습니다.</p>
            {!readOnly && (
              <p className="text-[11px] text-[#1A9E7A]">
                상단의 &apos;AI 동선 추천&apos; 버튼을 눌러보세요!
              </p>
            )}
          </div>
        ) : (
          places.map((place, idx) => {
            const isActive = activeId === place.id

            return (
              <div
                key={place.id}
                onClick={() => onSelectPlace(place.id)}
                className={`group relative cursor-pointer rounded-2xl border p-3.5 transition flex flex-col justify-between space-y-2.5 ${
                  isActive
                    ? "bg-white border-[#1A9E7A] shadow-md ring-2 ring-[#1A9E7A]/10"
                    : "bg-white border-[#E2E2DA] hover:border-[#1A9E7A]/40 shadow-xs"
                }`}
              >
                {/* 상단 장소 정보 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-[#18181B] truncate">
                          {place.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EDFAF4] text-[#1A9E7A]">
                          {place.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B6B72] truncate flex items-center gap-1">
                        <MapPin className="size-3 text-[#9E9EA4] shrink-0" />
                        <span>{place.address}</span>
                      </p>
                    </div>
                  </div>

                  {place.time && (
                    <span className="shrink-0 text-[10px] text-[#8A8A93] flex items-center gap-0.5 bg-slate-50 px-2 py-0.5 rounded-full border border-[#E2E2DA]">
                      <Clock className="size-3" />
                      <span>{place.time}</span>
                    </span>
                  )}
                </div>

                {/* 하단 투표 및 상태 바 */}
                <div className="pt-2 border-t border-[#E2E2DA]/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {/* 찬성 투표 */}
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={(e) => {
                        e.stopPropagation()
                        onVote(place.id, "up")
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#1A9E7A]/30 bg-[#EDFAF4] hover:bg-[#EDFAF4]/80 text-[#1A9E7A] font-bold text-xs transition disabled:opacity-50"
                      title="찬성"
                    >
                      <ThumbsUp className="size-3" />
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E2DA] bg-white hover:bg-slate-50 text-[#6B6B72] font-semibold text-xs transition disabled:opacity-50"
                      title="반대"
                    >
                      <ThumbsDown className="size-3" />
                      <span>{place.votesDown}</span>
                    </button>
                  </div>

                  {readOnly ? (
                    <span className="text-[10px] text-[#8A8A93] flex items-center gap-1">
                      <Lock className="size-3" />
                      <span>조회 전용</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#1A9E7A] font-bold">
                      {place.status === "confirmed" ? "✓ 확정 동선" : "투표 진행 중"}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 3. 하단 장소 추가 버튼 */}
      {!readOnly && onAddPlace && (
        <div className="p-3 border-t border-[#E2E2DA] bg-white">
          <button
            onClick={onAddPlace}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-[#E2E2DA] hover:border-[#1A9E7A] text-xs font-bold text-[#6B6B72] hover:text-[#1A9E7A] transition"
          >
            <Plus className="size-3.5" />
            <span>이 날짜에 장소 직접 추가</span>
          </button>
        </div>
      )}
    </div>
  )
}
