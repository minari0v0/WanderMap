"use client"

import React, { useState } from "react"
import {
  MapPin,
  Clock,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  FileText,
  ChevronRight,
  X,
  Check,
} from "lucide-react"
import type { Place } from "@/lib/trip-data"
import type { UpdatePlaceDiaryPayload } from "@/lib/trip-service"
import { PlaceDiaryPanel } from "@/components/trip-detail/place-diary-panel"
import { TimePicker } from "@/components/ui/time-picker"
import { showToast } from "@/components/ui/system-alert"

export interface EnrichedPlace extends Place {
  numericId?: number
  dayNumber?: number
  memo?: string
  rating?: number | null
  review?: string
  photos?: string[]
  myVote?: "UP" | "DOWN" | null
}

export interface ItineraryTimelineProps {
  places: EnrichedPlace[]
  activeId: string | null
  activeDay: number
  onChangeDay: (day: number) => void
  dayDate?: string
  isDetailViewOpen?: boolean
  onSelectPlace: (id: string) => void
  onCloseDetailView: () => void
  onVote: (id: string, dir: "up" | "down") => void
  onAddPlaceSubmit?: (data: {
    name: string
    category: string
    address: string
    time: string
  }) => Promise<void> | void
  onUpdatePlaceDiary?: (placeId: string, payload: UpdatePlaceDiaryPayload) => Promise<void>
  onDeletePlace?: (placeId: string) => Promise<void>
  readOnly?: boolean
  totalDays?: number
}

const PLACE_CATEGORIES = ["맛집", "카페 · 디저트", "관광 · 명소", "숙소", "쇼핑"]

function formatKoreanDateWithWeekday(dateStr?: string): string {
  if (!dateStr) return ""
  const parts = dateStr.split("-")
  if (parts.length !== 3) return dateStr
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  const dateObj = new Date(y, m - 1, d)
  if (isNaN(dateObj.getTime())) return dateStr
  const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]
  return `${m}월 ${d}일 ${weekdays[dateObj.getDay()]}`
}

export function ItineraryTimeline({
  places,
  activeId,
  activeDay,
  onChangeDay,
  dayDate,
  isDetailViewOpen = false,
  onSelectPlace,
  onCloseDetailView,
  onVote,
  onAddPlaceSubmit,
  onUpdatePlaceDiary,
  onDeletePlace,
  readOnly = false,
  totalDays = 3,
}: ItineraryTimelineProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [openTimePlaceId, setOpenTimePlaceId] = useState<string | null>(null)

  // 하단 장소 직접 추가 폼 상태
  const [isAddingPlace, setIsAddingPlace] = useState(false)
  const [newPlaceName, setNewPlaceName] = useState("")
  const [newPlaceAddress, setNewPlaceAddress] = useState("")
  const [newPlaceTime, setNewPlaceTime] = useState("14:00")
  const [newPlaceCategory, setNewPlaceCategory] = useState(PLACE_CATEGORIES[0])

  const formattedDate = formatKoreanDateWithWeekday(dayDate)
  const selectedPlace = places.find((p) => p.id === activeId) || places[0] || null
  const showDetailSlide = Boolean(isDetailViewOpen && selectedPlace)

  function handleToggleEditMode() {
    setIsEditMode((prev) => {
      const next = !prev
      if (!next) {
        // 상위 '편집 완료' 클릭 시 열려 있던 하위 시간 피커도 즉시 취소 및 비활성화
        setOpenTimePlaceId(null)
      }
      return next
    })
  }

  async function handleInlineTimeChange(placeId: string, nextTime: string) {
    if (readOnly) {
      showToast("로그인이 필요한 기능입니다.", "warning")
      return
    }
    setOpenTimePlaceId(null)
    if (onUpdatePlaceDiary) {
      await onUpdatePlaceDiary(placeId, { expectedVisitTime: nextTime })
    }
  }

  async function handleCreateNewPlace(e: React.FormEvent) {
    e.preventDefault()
    if (!newPlaceName.trim() || !onAddPlaceSubmit) return
    await onAddPlaceSubmit({
      name: newPlaceName.trim(),
      category: newPlaceCategory,
      address: newPlaceAddress.trim(),
      time: newPlaceTime || "14:00",
    })
    setNewPlaceName("")
    setNewPlaceAddress("")
    setIsAddingPlace(false)
  }

  return (
    <div className="flex-1 flex flex-col rounded-2xl border border-[#E2E2DA] bg-white shadow-xs overflow-hidden text-[#18181B]">
      {/* 좌우 슬라이드 컨테이너: [좌측 50%: 일정 장소 리스트] ↔ [우측 50%: 선택한 장소 상세 및 마크다운 기록] */}
      <div
        className={`flex w-[200%] h-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
          showDetailSlide ? "-translate-x-1/2" : "translate-x-0"
        }`}
      >
        {/* =================================================================
            SLIDE 1: 일자 탭 + 시간순 장소 리스트 뷰
           ================================================================= */}
        <div className="w-1/2 h-full flex flex-col overflow-hidden">
          {/* 1. 상단: Day 탭 바 */}
          <div className="px-4 pt-3.5 pb-3 border-b border-[#E2E2DA] bg-[#FBFBF9] shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    onChangeDay(day)
                    setOpenTimePlaceId(null)
                    setIsEditMode(false)
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-extrabold transition shrink-0 cursor-pointer ${
                    activeDay === day
                      ? "bg-[#1A9E7A] text-white shadow-xs"
                      : "bg-white border border-[#E2E2DA] text-[#52525B] hover:border-[#1A9E7A]/50 hover:text-[#18181B]"
                  }`}
                >
                  Day {day}
                </button>
              ))}
            </div>

            {/* 서브 라인: 선택된 일자의 날짜/요일 & 우측 편집 토글 */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#E2E2DA]/60">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-extrabold text-[#18181B]">
                  {formattedDate || `${activeDay}일차`}
                </span>
                <span className="text-xs font-semibold text-[#8A8A93]">
                  · 시간순 정렬
                </span>
              </div>

              {!readOnly && places.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleEditMode}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    isEditMode
                      ? "bg-[#18181B] text-white"
                      : "text-[#52525B] hover:bg-slate-200/60 hover:text-[#18181B]"
                  }`}
                >
                  {isEditMode ? "편집 완료" : "일정 편집"}
                </button>
              )}
            </div>
          </div>

          {/* 2. 장소 카드 리스트 (클릭 시 우측 슬라이드 상세 기록 뷰로 부드럽게 전환) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#F8F8F6]/60">
            {places.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <p className="text-base font-extrabold text-[#52525B]">
                  아직 등록된 장소가 없습니다
                </p>
                <p className="text-sm font-medium text-[#8A8A93]">
                  아래 [+ 장소 추가] 버튼을 눌러 일정을 채워보세요.
                </p>
              </div>
            ) : (
              places.map((place, idx) => {
                const isActive = activeId === place.id
                const hasDiaryNote =
                  Boolean(place.memo?.trim()) ||
                  Boolean(place.review?.trim()) ||
                  (place.photos && place.photos.length > 0)

                return (
                  <div
                    key={place.id}
                    onClick={() => {
                      setOpenTimePlaceId(null)
                      onSelectPlace(place.id)
                    }}
                    className={`group relative cursor-pointer rounded-2xl border p-4 sm:p-5 transition-all ${
                      isActive
                        ? "bg-white border-[#1A9E7A] shadow-md ring-2 ring-[#1A9E7A]/15"
                        : "bg-white border-[#E2E2DA] hover:border-[#1A9E7A]/50 shadow-2xs"
                    }`}
                  >
                    {/* 상단: 순서 번호 + 장소명 + 일정 시간(일정 편집 활성화 시 하위 항목으로 타임피커 활성) */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold mt-0.5 transition ${
                            isActive
                              ? "bg-[#1A9E7A] text-white"
                              : "bg-[#18181B] text-white"
                          }`}
                        >
                          {idx + 1}
                        </span>

                        <div className="min-w-0">
                          <h4 className="text-[17px] font-extrabold text-[#18181B] group-hover:text-[#1A9E7A] transition leading-snug truncate">
                            {place.name}
                          </h4>
                          <p className="text-[13px] font-semibold text-[#6B6B72] truncate flex items-center gap-1.5 mt-1">
                            <MapPin className="size-3.5 text-[#1A9E7A] shrink-0" />
                            <span>{place.address || "위치 미지정"}</span>
                          </p>
                        </div>
                      </div>

                      {/* 우측: WanderMap 전용 타임피커 (일정 편집의 하위 항목으로 동작: 편집 완료 클릭 시 즉시 취소 및 비활성화) */}
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => {
                          if (isEditMode) {
                            e.stopPropagation()
                          }
                        }}
                      >
                        <TimePicker
                          value={place.time || "14:00"}
                          onChange={(nextTime) => handleInlineTimeChange(place.id, nextTime)}
                          disabled={!isEditMode || readOnly}
                          open={!readOnly && isEditMode && openTimePlaceId === place.id}
                          onOpenChange={(nextOpen) =>
                            setOpenTimePlaceId(nextOpen ? place.id : null)
                          }
                          align="right"
                          direction="down"
                          title={
                            isEditMode && !readOnly
                              ? "클릭하여 방문 시간 변경 (시간순 자동 재정렬)"
                              : "방문 예정 시간 ('일정 편집'에서 변경 가능)"
                          }
                        />

                        {isEditMode && !readOnly && (
                          <button
                            type="button"
                            onClick={() => onDeletePlace?.(place.id)}
                            className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            title="장소 삭제"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 하단: 찬반 투표 버튼 & 상세 기록 진입 안내 */}
                    <div className="mt-4 pt-3 border-t border-[#E2E2DA]/70 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onVote(place.id, "up")
                          }}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[13px] font-extrabold transition cursor-pointer ${
                            place.myVote === "UP"
                              ? "border-[#1A9E7A] bg-[#1A9E7A] text-white"
                              : "border-[#E2E2DA] bg-[#F8F8F6] hover:border-[#1A9E7A]/50 text-[#27272A]"
                          }`}
                        >
                          <ThumbsUp className="size-3.5" />
                          <span>찬성 {place.votesUp}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onVote(place.id, "down")
                          }}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-[13px] font-extrabold transition cursor-pointer ${
                            place.myVote === "DOWN"
                              ? "border-rose-500 bg-rose-500 text-white"
                              : "border-[#E2E2DA] bg-[#F8F8F6] hover:border-rose-300 text-[#6B6B72]"
                          }`}
                        >
                          <ThumbsDown className="size-3.5" />
                          <span>반대 {place.votesDown}</span>
                        </button>
                      </div>

                      <span
                        className={`flex items-center gap-1 text-xs font-extrabold transition ${
                          hasDiaryNote
                            ? "text-[#1A9E7A]"
                            : "text-[#8A8A93] group-hover:text-[#18181B]"
                        }`}
                      >
                        {hasDiaryNote && <FileText className="size-3.5" />}
                        <span>{hasDiaryNote ? "메모 보기" : "상세 · 메모"}</span>
                        <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 3. 하단: 장소 직접 추가 폼 / 버튼 (비로그인 시 클릭하면 상단 중앙 토스트 안내) */}
          {onAddPlaceSubmit && (
            <div className="p-3.5 border-t border-[#E2E2DA] bg-white shrink-0">
              {isAddingPlace && !readOnly ? (
                <form onSubmit={handleCreateNewPlace} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#18181B]">
                      Day {activeDay} 새 장소 추가 (시간순 자동 배치)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingPlace(false)}
                      className="text-[#8A8A93] hover:text-[#18181B] cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newPlaceName}
                    onChange={(e) => setNewPlaceName(e.target.value)}
                    placeholder="장소명 입력 (예: 도톤보리, 런던베이글)"
                    className="w-full rounded-xl border border-[#E2E2DA] bg-[#F8F8F6] focus:bg-white px-3.5 py-2.5 text-sm font-bold outline-none focus:border-[#1A9E7A]"
                    autoFocus
                    required
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newPlaceAddress}
                      onChange={(e) => setNewPlaceAddress(e.target.value)}
                      placeholder="위치 / 주소 (선택)"
                      className="flex-1 min-w-0 rounded-xl border border-[#E2E2DA] bg-[#F8F8F6] focus:bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#1A9E7A]"
                    />
                    <TimePicker
                      value={newPlaceTime}
                      onChange={(nextTime) => setNewPlaceTime(nextTime)}
                      align="right"
                      direction="up"
                      size="md"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <select
                      value={newPlaceCategory}
                      onChange={(e) => setNewPlaceCategory(e.target.value)}
                      className="rounded-xl border border-[#E2E2DA] bg-[#F8F8F6] px-3 py-2 text-xs font-bold text-[#27272A] outline-none"
                    >
                      {PLACE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-[#1A9E7A] hover:bg-[#158063] py-2 text-xs sm:text-sm font-extrabold text-white transition cursor-pointer"
                    >
                      추가하기
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (readOnly) {
                      showToast("로그인이 필요한 기능입니다.", "warning")
                      return
                    }
                    setIsAddingPlace(true)
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[#D4D4CD] hover:border-[#1A9E7A] hover:bg-[#EDFAF4]/40 text-sm font-extrabold text-[#27272A] hover:text-[#1A9E7A] transition cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>장소 추가</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* =================================================================
            SLIDE 2: 선택한 장소 상세 & 마크다운 메모 뷰 (리스트에서 옆으로 부드럽게 전환됨)
           ================================================================= */}
        <div className="w-1/2 h-full flex flex-col overflow-hidden">
          <PlaceDiaryPanel
            place={selectedPlace}
            dayNumber={activeDay}
            readOnly={readOnly}
            onBackToList={onCloseDetailView}
            onVote={onVote}
            onSaveDiary={onUpdatePlaceDiary}
          />
        </div>
      </div>
    </div>
  )
}
