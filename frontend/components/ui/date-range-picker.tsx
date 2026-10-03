"use client"

import React, { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from "lucide-react"

export interface DateRangePickerProps {
  startDate: string // YYYY-MM-DD or ""
  endDate: string // YYYY-MM-DD or ""
  onSelectRange: (start: string, end: string) => void
  onClose: () => void
  isOpen: boolean
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

export function DateRangePicker({
  startDate,
  endDate,
  onSelectRange,
  onClose,
  isOpen,
}: DateRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // 달력 기준 월 (기본값: startDate가 있으면 해당 월, 없으면 오늘)
  const initialDate = startDate ? new Date(startDate) : new Date()
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()) // 0 ~ 11

  // 선택 중인 임시 상태
  const [tempStart, setTempStart] = useState<string | null>(startDate || null)
  const [tempEnd, setTempEnd] = useState<string | null>(endDate || null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  // 동기화
  useEffect(() => {
    setTempStart(startDate || null)
    setTempEnd(endDate || null)
  }, [startDate, endDate])

  if (!isOpen) return null

  // 월 이동
  function handlePrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  function handleNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  // 날짜 계산
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  function formatYmd(year: number, month: number, day: number) {
    const m = String(month + 1).padStart(2, "0")
    const d = String(day).padStart(2, "0")
    return `${year}-${m}-${d}`
  }

  // 날짜 클릭 처리 (2번 클릭으로 시작일과 종료일 지정, 역순 자동 보정)
  function handleDateClick(dateStr: string) {
    if (!tempStart || (tempStart && tempEnd)) {
      // 1번째 클릭: 새 시작일 지정
      setTempStart(dateStr)
      setTempEnd(null)
    } else {
      // 2번째 클릭: 종료일 지정 및 역순 자동 정렬
      let start = tempStart
      let end = dateStr

      if (new Date(end) < new Date(start)) {
        // 역순 선택 시 자동 반전
        const swap = start
        start = end
        end = swap
      }

      setTempStart(start)
      setTempEnd(end)

      // 부모에게 반영 후 부드럽게 자동 닫기 (220ms 피드백 딜레이)
      onSelectRange(start, end)
      setTimeout(() => {
        onClose()
      }, 220)
    }
  }

  function handleReset() {
    setTempStart(null)
    setTempEnd(null)
    onSelectRange("", "")
  }

  return (
    <div
      ref={containerRef}
      className="absolute top-full mt-2.5 z-50 w-76 sm:w-80 rounded-3xl border border-[#E2E2DA] bg-white/98 backdrop-blur-xl p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 select-none text-[#18181B]"
    >
      {/* 헤더: 년/월 및 이전/다음 버튼 */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E2DA]/80">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="size-4 text-[#1A9E7A]" />
          <span className="text-sm font-bold tracking-tight">
            {currentYear}년 {currentMonth + 1}월
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex size-7 items-center justify-center rounded-lg hover:bg-slate-100 text-[#6B6B72] hover:text-[#18181B] transition"
            title="이전 달"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex size-7 items-center justify-center rounded-lg hover:bg-slate-100 text-[#6B6B72] hover:text-[#18181B] transition"
            title="다음 달"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* 안내 문구 */}
      <div className="py-2 text-center text-[11px] font-semibold text-[#8A8A93]">
        {!tempStart
          ? "출발일을 선택해 주세요"
          : !tempEnd
          ? "도착일을 선택해 주세요 (역순 자동 정렬)"
          : `${tempStart} ~ ${tempEnd}`}
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-[#8A8A93] mb-1">
        {WEEKDAYS.map((w, idx) => (
          <div key={w} className={idx === 0 ? "text-rose-500" : idx === 6 ? "text-blue-500" : ""}>
            {w}
          </div>
        ))}
      </div>

      {/* 달력 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {/* 첫째 날 이전 빈 칸 */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8" />
        ))}

        {/* 날짜들 */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = formatYmd(currentYear, currentMonth, day)

          const isStart = tempStart === dateStr
          const isEnd = tempEnd === dateStr
          const isBetween =
            tempStart && tempEnd && dateStr > tempStart && dateStr < tempEnd
          const isHoverBetween =
            tempStart &&
            !tempEnd &&
            hoverDate &&
            ((dateStr > tempStart && dateStr <= hoverDate) ||
              (dateStr < tempStart && dateStr >= hoverDate))

          const isSelectedEndpoint = isStart || isEnd

          return (
            <div
              key={dateStr}
              onMouseEnter={() => setHoverDate(dateStr)}
              onClick={() => handleDateClick(dateStr)}
              className={`relative h-8 flex items-center justify-center cursor-pointer transition-colors ${
                isBetween || isHoverBetween ? "bg-[#EDFAF4]" : ""
              } ${isStart && tempEnd ? "rounded-l-full" : ""} ${
                isEnd && tempStart ? "rounded-r-full" : ""
              }`}
            >
              <span
                className={`flex size-7.5 items-center justify-center rounded-full text-xs font-semibold transition ${
                  isSelectedEndpoint
                    ? "bg-[#1A9E7A] text-white shadow-sm font-bold scale-105"
                    : isBetween || isHoverBetween
                    ? "text-[#1A9E7A] font-bold"
                    : "hover:bg-slate-100 text-[#27272A]"
                }`}
              >
                {day}
              </span>
            </div>
          )
        })}
      </div>

      {/* 하단 툴바 (초기화 & 닫기) */}
      <div className="mt-3 pt-2.5 border-t border-[#E2E2DA]/80 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 text-[11px] font-semibold text-[#8A8A93] hover:text-rose-500 transition"
        >
          <RotateCcw className="size-3" />
          <span>초대일 초기화</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="text-[11px] font-bold text-[#6B6B72] hover:text-[#18181B] px-2.5 py-1 rounded-lg hover:bg-slate-100 transition"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
