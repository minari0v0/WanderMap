"use client"

import React, { useState } from "react"
import {
  Sparkles,
  Check,
  X,
  MapPin,
  Clock,
  ArrowRight,
  Layers,
  Edit3,
} from "lucide-react"
import type { Place } from "@/lib/trip-data"

export interface RecommendedDay {
  dayNumber: number
  dateLabel: string
  theme: string
  places: {
    id: string
    name: string
    category: string
    address: string
    memo: string
    estimatedTime?: string
    durationMinutes?: number
  }[]
}

export interface AiRecommendModalProps {
  isOpen: boolean
  onClose: () => void
  destination?: string
  recommendedDays: RecommendedDay[]
  onApplyAll: (places: Place[]) => void
  onApplySelected: (selectedPlaces: Place[]) => void
}

export function AiRecommendModal({
  isOpen,
  onClose,
  destination = "여행지",
  recommendedDays,
  onApplyAll,
  onApplySelected,
}: AiRecommendModalProps) {
  // 선택된 장소 ID 목록 (기본은 전체 선택)
  const allIds = recommendedDays.flatMap((d) => d.places.map((p) => p.id))
  const [selectedIds, setSelectedIds] = useState<string[]>(allIds)
  const [activeTabDay, setActiveTabDay] = useState(1)

  if (!isOpen) return null

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function handleSelectAllInDay(day: RecommendedDay) {
    const dayIds = day.places.map((p) => p.id)
    const allSelected = dayIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !dayIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...dayIds])))
    }
  }

  // Place 변환 헬퍼
  function convertToPlaces(filterSelectedOnly = false): Place[] {
    const flattened = recommendedDays.flatMap((d) => d.places)
    const target = filterSelectedOnly
      ? flattened.filter((p) => selectedIds.includes(p.id))
      : flattened

    return target.map((p, idx) => ({
      id: p.id,
      order: idx + 1,
      category: p.category,
      name: p.name,
      address: p.address,
      status: "confirmed" as const,
      time: p.estimatedTime || "시간 미정",
      votesUp: 1,
      votesDown: 0,
      x: 30 + ((idx * 15) % 40),
      y: 25 + ((idx * 18) % 45),
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-[#E2E2DA] bg-white shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-[#18181B] animate-in zoom-in-95 duration-200">
        {/* 모달 상단 헤더 */}
        <div className="p-5 border-b border-[#E2E2DA] flex items-center justify-between bg-gradient-to-r from-emerald-50/70 to-white">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#1A9E7A] text-white shadow-sm shadow-[#1A9E7A]/30">
              <Sparkles className="size-4.5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#18181B]">
                Gemini Search Grounding 추천 동선
              </h3>
              <p className="text-xs text-[#6B6B72]">
                Google 실시간 검색으로 영업 여부와 실좌표를 확인한 최적의 코스입니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full hover:bg-slate-100 transition text-[#6B6B72]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 일자별 탭 */}
        <div className="flex items-center gap-1.5 px-5 pt-3 border-b border-[#E2E2DA] bg-slate-50/50">
          {recommendedDays.map((day) => (
            <button
              key={day.dayNumber}
              onClick={() => setActiveTabDay(day.dayNumber)}
              className={`px-3 py-2 text-xs font-bold rounded-t-xl transition border-b-2 ${
                activeTabDay === day.dayNumber
                  ? "border-[#1A9E7A] text-[#1A9E7A] bg-white"
                  : "border-transparent text-[#6B6B72] hover:text-[#18181B]"
              }`}
            >
              Day {day.dayNumber} ({day.places.length}곳)
            </button>
          ))}
        </div>

        {/* 본문 장소 리스트 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-[#FAFAF8]/50">
          {recommendedDays
            .filter((d) => d.dayNumber === activeTabDay)
            .map((day) => (
              <div key={day.dayNumber} className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-[#E2E2DA] shadow-2xs">
                  <div>
                    <span className="text-[11px] font-bold text-[#1A9E7A]">
                      Day {day.dayNumber} 테마
                    </span>
                    <h4 className="text-xs font-bold text-[#18181B]">{day.theme}</h4>
                  </div>
                  <button
                    onClick={() => handleSelectAllInDay(day)}
                    className="text-xs font-semibold text-[#6B6B72] hover:text-[#18181B] underline"
                  >
                    이 날짜 전체 선택/해제
                  </button>
                </div>

                <div className="space-y-2">
                  {day.places.map((place, idx) => {
                    const isSelected = selectedIds.includes(place.id)
                    return (
                      <div
                        key={place.id}
                        onClick={() => toggleSelect(place.id)}
                        className={`cursor-pointer rounded-2xl border p-3.5 transition flex items-start gap-3 ${
                          isSelected
                            ? "bg-white border-[#1A9E7A] shadow-xs"
                            : "bg-white/60 border-[#E2E2DA] opacity-60 hover:opacity-90"
                        }`}
                      >
                        <div
                          className={`flex size-5 shrink-0 items-center justify-center rounded-lg border mt-0.5 transition ${
                            isSelected
                              ? "bg-[#1A9E7A] border-[#1A9E7A] text-white"
                              : "border-[#C8C8C0] bg-white"
                          }`}
                        >
                          {isSelected && <Check className="size-3.5 stroke-[3]" />}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="flex size-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px] font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-xs text-[#18181B]">
                              {place.name}
                            </span>
                            <span className="rounded bg-[#EDFAF4] px-1.5 py-0.5 text-[10px] font-bold text-[#1A9E7A]">
                              {place.category}
                            </span>
                            {place.estimatedTime && (
                              <span className="text-[10px] text-[#8A8A93] flex items-center gap-0.5 ml-auto">
                                <Clock className="size-3" />
                                {place.estimatedTime}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-[#6B6B72] truncate flex items-center gap-1">
                            <MapPin className="size-3 shrink-0 text-[#9E9EA4]" />
                            {place.address}
                          </p>

                          {place.memo && (
                            <p className="text-[11px] text-[#1A9E7A] bg-[#EDFAF4]/60 px-2 py-1 rounded-lg">
                              💡 {place.memo}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
        </div>

        {/* 3대 스마트 반영 액션 바 */}
        <div className="p-4 border-t border-[#E2E2DA] bg-white flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-xs text-[#6B6B72] flex items-center gap-1.5">
            <span className="font-bold text-[#18181B]">{selectedIds.length}개</span> 장소 선택됨
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. 선택한 장소만 부분 반영 */}
            <button
              onClick={() => {
                const selected = convertToPlaces(true)
                if (selected.length === 0) {
                  alert("반영할 장소를 하나 이상 선택해 주세요.")
                  return
                }
                onApplySelected(selected)
                onClose()
              }}
              className="px-3.5 py-2 rounded-xl border border-[#1A9E7A] text-[#1A9E7A] hover:bg-[#EDFAF4] font-bold text-xs transition"
            >
              선택 장소만 부분 반영
            </button>

            {/* 2. 전체 일정에 반영 */}
            <button
              onClick={() => {
                const all = convertToPlaces(false)
                onApplyAll(all)
                onClose()
              }}
              className="px-4 py-2 rounded-xl bg-[#1A9E7A] text-white hover:bg-[#158063] font-bold text-xs transition shadow-sm"
            >
              전체 일정에 일괄 반영
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
