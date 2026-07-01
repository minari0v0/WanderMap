"use client"

import { MapPin, MessageCircle, Sparkles, ThumbsDown, ThumbsUp, Compass } from "lucide-react"
import { useState } from "react"
import { TRIP, type Place } from "@/lib/trip-data"

export function ItineraryPanel({
  places,
  activeId,
  onSelect,
  onVote,
  readOnly = false,
}: {
  places: Place[]
  activeId: string | null
  onSelect: (id: string) => void
  onVote: (id: string, dir: "up" | "down") => void
  readOnly?: boolean
}) {
  return (
    <section
      aria-label="실시간 동선 조율"
      className="flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-[#E2E2DA] bg-white text-[#18181B] shadow-sm"
    >
      {/* header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E2E2DA] px-4 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400/60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
          </span>
          실시간 동선 조율
        </h2>
        
        {!readOnly && (
          <button className="flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
            <Sparkles className="size-3" />
            AI 긴급 우회
          </button>
        )}
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 bg-[#F8F8F6]/40">
        <span className="w-fit rounded-full border border-[#E2E2DA] bg-white px-3 py-1 text-xs font-semibold text-[#6B6B72]">
          {TRIP.dayLabel}
        </span>

        {places.map((p) => (
          <PlaceCard
            key={p.id}
            place={p}
            active={activeId === p.id}
            onSelect={() => onSelect(p.id)}
            onVote={(dir) => onVote(p.id, dir)}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* chat input */}
      <div className="border-t border-[#E2E2DA] p-3 bg-white">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex items-center gap-2 rounded-xl border border-[#E2E2DA] bg-[#F8F8F6] py-1.5 pl-4 pr-1.5"
        >
          <MessageCircle className="size-4 shrink-0 text-[#6B6B72]" />
          <input
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#6B6B72] text-[#18181B]"
            placeholder={readOnly ? "관람 모드에서는 입력할 수 없습니다." : "채팅 또는 다음 장소 검색..."}
            disabled={readOnly}
          />
          {!readOnly && (
            <button
              type="submit"
              aria-label="전송"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#1A9E7A] text-white hover:bg-[#158063] transition-colors"
            >
              <Sparkles className="size-3.5" />
            </button>
          )}
        </form>
      </div>
    </section>
  )
}

function PlaceCard({
  place,
  active,
  onSelect,
  onVote,
  readOnly,
}: {
  place: Place
  active: boolean
  onSelect: () => void
  onVote: (dir: "up" | "down") => void
  readOnly: boolean
}) {
  const isVoting = place.status === "voting"
  const reached = place.votesUp >= TRIP.voteThreshold

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border p-3.5 text-left transition-all ${
        active
          ? "border-[#1A9E7A] bg-[#EDFAF4] shadow-sm"
          : isVoting
            ? "border-amber-200 bg-amber-50/30"
            : "border-[#E2E2DA] bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3 text-[#18181B]">
        <span
          className={`mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            isVoting 
              ? "bg-amber-100 text-amber-800" 
              : active
                ? "bg-[#1A9E7A] text-white"
                : "bg-slate-100 text-slate-700"
          }`}
        >
          {isVoting ? "?" : place.order}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-[#6B6B72]">{place.category}</span>
            {isVoting ? (
              <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                투표 진행 중
              </span>
            ) : (
              <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                확정됨
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-bold text-sm text-[#18181B]">{place.name}</p>
          <p className="mt-1 flex items-center gap-1 text-[10px] text-[#6B6B72]">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{place.address}</span>
          </p>
          {place.time && (
            <p className="mt-1 text-[10px] font-semibold text-[#6B6B72]">{place.time}</p>
          )}

          {isVoting && (
            <div className="mt-3">
              {readOnly ? (
                // 관람 모드용 투표 현황 뷰어
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E2DA] bg-slate-50 py-1.5 text-xs text-[#6B6B72]">
                    <ThumbsUp className="size-3.5 text-[#1A9E7A]" /> 찬성 {place.votesUp}
                  </div>
                  <div className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E2DA] bg-slate-50 py-1.5 text-xs text-[#6B6B72]">
                    <ThumbsDown className="size-3.5 text-red-500" /> 반대 {place.votesDown}
                  </div>
                </div>
              ) : (
                // 투표 참여가 가능한 활성 버튼
                <div className="grid grid-cols-2 gap-2">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onVote("up")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation()
                        onVote("up")
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-[#1A9E7A]/40 bg-[#EDFAF4] py-1.5 text-xs font-bold text-[#1A9E7A] transition-colors hover:bg-[#d4f4e3]"
                  >
                    <ThumbsUp className="size-3.5" />
                    찬성 {place.votesUp}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onVote("down")
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation()
                        onVote("down")
                      }
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E2DA] bg-white py-1.5 text-xs font-semibold text-[#6B6B72] transition-colors hover:bg-slate-50"
                  >
                    <ThumbsDown className="size-3.5" />
                    반대 {place.votesDown}
                  </span>
                </div>
              )}
              
              <p className="mt-2 text-center text-[10px] text-[#6B6B72]">
                {reached ? (
                  <span className="font-semibold text-[#1A9E7A]">과반수 달성 · 동선 확정 대기</span>
                ) : (
                  <>과반수({TRIP.voteThreshold}/{TRIP.memberCount}) 찬성 시 동선 확정</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
