"use client"

import React, { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from "lucide-react"

export interface DateRangePickerProps {
  startDate: string // YYYY-MM-DD or ""
  endDate: string // YYYY-MM-DD or ""
  onSelectRange: (start: string, end: string) => void
  onClose: () => void
  isOpen: boolean
  align?: "left" | "center" | "right"
  className?: string
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

// 어디서든 재사용 가능한 날짜 범위 포맷 헬퍼
export function parseDateRangeInfo(start: string, end: string) {
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
    duration: nights === 0 ? "당일치기" : `${nights}박 ${days}일`,
  }
}

export function DateRangePicker({
  startDate,
  endDate,
  onSelectRange,
  onClose,
  isOpen,
  align = "left",
  className = "",
}: DateRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const initialDate = startDate ? new Date(startDate) : new Date()
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth())

  const [tempStart, setTempStart] = useState<string | null>(startDate || null)
  const [tempEnd, setTempEnd] = useState<string | null>(endDate || null)
  const [hoverDate, setHoverDate] = useState<string | null>(null)

  // 바깥 클릭 및 ESC 키로 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    setTempStart(startDate || null)
    setTempEnd(endDate || null)
  }, [startDate, endDate])

  if (!isOpen) return null

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

  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  function formatYmd(year: number, month: number, day: number) {
    const m = String(month + 1).padStart(2, "0")
    const d = String(day).padStart(2, "0")
    return `${year}-${m}-${d}`
  }

  function handleDateClick(dateStr: string) {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr)
      setTempEnd(null)
    } else {
      let start = tempStart
      let end = dateStr

      if (new Date(end) < new Date(start)) {
        const swap = start
        start = end
        end = swap
      }

      setTempStart(start)
      setTempEnd(end)

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

  const alignClass =
    align === "right"
      ? "right-0"
      : align === "center"
        ? "left-1/2 -translate-x-1/2"
        : "left-0"

  return (
    <div
      ref={containerRef}
      className={`absolute top-full mt-2.5 ${alignClass} z-[60] w-80 sm:w-[340px] rounded-3xl border border-[#E2E2DA] bg-white p-5 shadow-[0_24px_60px_rgb(0,0,0,0.14)] animate-in fade-in zoom-in-95 duration-150 select-none text-[#18181B] ${className}`}
    >
      {/* 헤더: 년/월 및 이전/다음 버튼 */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E2DA]/80">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4.5 text-[#1A9E7A]" />
          <span className="text-base font-extrabold tracking-tight">
            {currentYear}년 {currentMonth + 1}월
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex size-8 items-center justify-center rounded-xl hover:bg-slate-100 text-[#6B6B72] hover:text-[#18181B] transition cursor-pointer"
            title="이전 달"
          >
            <ChevronLeft className="size-4.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex size-8 items-center justify-center rounded-xl hover:bg-slate-100 text-[#6B6B72] hover:text-[#18181B] transition cursor-pointer"
            title="다음 달"
          >
            <ChevronRight className="size-4.5" />
          </button>
        </div>
      </div>

      {/* 선택 상태 안내 */}
      <div className="py-2.5 text-center text-xs font-bold text-[#6B6B72]">
        {!tempStart ? (
          "출발일을 선택해 주세요"
        ) : !tempEnd ? (
          <span className="text-[#1A9E7A]">도착일을 선택해 주세요</span>
        ) : (
          (() => {
            const s = new Date(tempStart)
            const e = new Date(tempEnd)
            const nights = Math.max(
              0,
              Math.round(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
            )
            const days = nights + 1
            return (
              <span className="inline-flex items-center gap-2 text-[#18181B] font-extrabold">
                <span>
                  {tempStart} ~ {tempEnd}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#1A9E7A] text-white text-[11px] font-extrabold">
                  {nights === 0 ? "당일치기" : `${nights}박 ${days}일`}
                </span>
              </span>
            )
          })()
        )}
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-xs font-extrabold text-[#8A8A93] mb-1.5">
        {WEEKDAYS.map((w, idx) => (
          <div
            key={w}
            className={idx === 0 ? "text-rose-500" : idx === 6 ? "text-blue-500" : ""}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 달력 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9" />
        ))}

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
              className={`relative h-9 flex items-center justify-center cursor-pointer transition-colors ${
                isBetween || isHoverBetween ? "bg-[#EDFAF4]" : ""
              } ${isStart && tempEnd ? "rounded-l-full" : ""} ${
                isEnd && tempStart ? "rounded-r-full" : ""
              }`}
            >
              <span
                className={`flex size-8.5 items-center justify-center rounded-full text-xs sm:text-sm font-bold transition ${
                  isSelectedEndpoint
                    ? "bg-[#1A9E7A] text-white shadow-sm font-extrabold scale-105"
                    : isBetween || isHoverBetween
                      ? "text-[#1A9E7A] font-extrabold"
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
      <div className="mt-3.5 pt-3 border-t border-[#E2E2DA]/80 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs font-bold text-[#8A8A93] hover:text-rose-500 transition cursor-pointer"
        >
          <RotateCcw className="size-3.5" />
          <span>날짜 초기화</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="text-xs font-extrabold text-[#52525B] hover:text-[#18181B] px-3 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
