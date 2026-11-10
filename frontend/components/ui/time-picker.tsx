"use client"

import React, { useState, useEffect, useRef } from "react"
import { Clock, Check } from "lucide-react"

export interface TimePickerProps {
  value: string // "HH:mm" (24h format, e.g. "14:00")
  onChange: (newTime: string) => void | Promise<void>
  disabled?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  align?: "left" | "center" | "right"
  direction?: "down" | "up"
  size?: "sm" | "md"
  className?: string
  title?: string
}

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
const MINUTES_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const QUICK_TIMES = [
  { label: "오전 9시", value: "09:00" },
  { label: "오전 11시", value: "11:00" },
  { label: "오후 1시", value: "13:00" },
  { label: "오후 3시", value: "15:00" },
  { label: "오후 6시", value: "18:00" },
  { label: "오후 8시", value: "20:00" },
]

function parse24HourTime(timeStr?: string): {
  period: "AM" | "PM"
  hour12: number
  minute: number
} {
  const clean = (timeStr || "14:00").trim()
  const [hStr, mStr] = clean.split(":")
  const rawH = Number(hStr)
  const rawM = Number(mStr)
  const h24 = Number.isFinite(rawH) && rawH >= 0 && rawH <= 23 ? rawH : 14
  const m = Number.isFinite(rawM) && rawM >= 0 && rawM <= 59 ? rawM : 0

  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM"
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12
  return { period, hour12, minute: m }
}

function to24HourString(period: "AM" | "PM", hour12: number, minute: number): string {
  let h24 = hour12 % 12
  if (period === "PM") h24 += 12
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

export function formatKoreanTimeDisplay(timeStr?: string): string {
  const { period, hour12, minute } = parse24HourTime(timeStr)
  const prefix = period === "AM" ? "오전" : "오후"
  return `${prefix} ${hour12}:${String(minute).padStart(2, "0")}`
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  open: controlledOpen,
  onOpenChange,
  align = "right",
  direction = "down",
  size = "sm",
  className = "",
  title,
}: TimePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const containerRef = useRef<HTMLDivElement | null>(null)

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) {
      setInternalOpen(next)
    }
    onOpenChange?.(next)
  }

  const parsed = parse24HourTime(value)
  const [period, setPeriod] = useState<"AM" | "PM">(parsed.period)
  const [hour12, setHour12] = useState<number>(parsed.hour12)
  const [minute, setMinute] = useState<number>(parsed.minute)

  // 값 변경 시 또는 팝오버 열림/닫힘, 혹은 상위 편집 모드 종료(disabled 전환) 시 미저장 선택값 취소 및 닫기
  useEffect(() => {
    const next = parse24HourTime(value)
    setPeriod(next.period)
    setHour12(next.hour12)
    setMinute(next.minute)
  }, [value, isOpen, disabled])

  useEffect(() => {
    if (disabled && isOpen) {
      setOpen(false)
    }
  }, [disabled, isOpen])

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const previewTime24 = to24HourString(period, hour12, minute)

  async function handleConfirm(targetTime?: string) {
    const finalTime = targetTime || previewTime24
    setOpen(false)
    if (finalTime !== value) {
      await onChange(finalTime)
    }
  }

  const alignClass =
    align === "left"
      ? "left-0"
      : align === "center"
        ? "left-1/2 -translate-x-1/2"
        : "right-0"

  const directionClass =
    direction === "up" ? "bottom-full mb-2" : "top-full mt-2"

  return (
    <div
      ref={containerRef}
      className={`relative inline-block select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 트리거 버튼 */}
      <button
        type="button"
        disabled={disabled}
        title={title || (disabled ? "방문 예정 시간" : "클릭하여 방문 시간 설정")}
        onClick={() => {
          if (!disabled) setOpen(!isOpen)
        }}
        className={`inline-flex items-center gap-1.5 rounded-xl border transition ${
          size === "md"
            ? "px-3.5 py-2 text-xs sm:text-[13px] font-extrabold"
            : "px-3 py-1.5 text-xs sm:text-[13px] font-extrabold"
        } ${
          isOpen
            ? "border-[#1A9E7A] bg-[#EDFAF4] text-[#1A9E7A] ring-2 ring-[#1A9E7A]/15"
            : disabled
              ? "border-[#E2E2DA] bg-[#F7F7F2] text-[#27272A] cursor-default"
              : "border-[#1A9E7A]/50 bg-[#EDFAF4]/50 hover:bg-[#EDFAF4] hover:border-[#1A9E7A] text-[#18181B] hover:text-[#1A9E7A] cursor-pointer"
        }`}
      >
        <Clock className="size-3.5 text-[#1A9E7A] shrink-0" />
        <span>{value || "14:00"}</span>
      </button>

      {/* WanderMap 전용 타임피커 팝오버 */}
      {isOpen && (
        <div
          className={`absolute ${directionClass} ${alignClass} z-[80] w-[268px] rounded-3xl border border-[#E2E2DA] bg-white p-4 shadow-[0_24px_60px_rgb(0,0,0,0.16)] animate-in fade-in zoom-in-95 duration-150 text-[#18181B]`}
        >
          {/* 상단 현재 선택 시간 표시 */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E2DA]/80">
            <div className="flex items-center gap-1.5">
              <Clock className="size-4 text-[#1A9E7A]" />
              <span className="text-xs font-extrabold text-[#6B6B72]">방문 시간 설정</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EDFAF4] text-[#1A9E7A] text-xs font-black tracking-tight">
              {period === "AM" ? "오전" : "오후"} {hour12}:{String(minute).padStart(2, "0")} ({previewTime24})
            </span>
          </div>

          {/* 빠른 시간 선택 칩 */}
          <div className="grid grid-cols-3 gap-1.5 py-2.5 border-b border-[#E2E2DA]/60">
            {QUICK_TIMES.map((qt) => {
              const active = previewTime24 === qt.value
              return (
                <button
                  key={qt.value}
                  type="button"
                  onClick={() => handleConfirm(qt.value)}
                  className={`py-1.5 rounded-xl text-[11px] font-extrabold transition cursor-pointer ${
                    active
                      ? "bg-[#1A9E7A] text-white"
                      : "bg-[#F7F7F2] hover:bg-[#EDFAF4] text-[#52525B] hover:text-[#1A9E7A]"
                  }`}
                >
                  {qt.label}
                </button>
              )
            })}
          </div>

          {/* 3열 휠/그리드 선택기: [오전/오후] | [시] | [분] */}
          <div className="grid grid-cols-3 gap-2 py-2.5">
            {/* 1. 오전 / 오후 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-[#8A8A93] text-center">구분</span>
              {(["AM", "PM"] as const).map((p) => {
                const active = period === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                      active
                        ? "bg-[#18181B] text-white shadow-xs"
                        : "bg-[#F7F7F2] hover:bg-slate-200/70 text-[#52525B]"
                    }`}
                  >
                    {p === "AM" ? "오전" : "오후"}
                  </button>
                )
              })}
            </div>

            {/* 2. 시 (1~12) */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#8A8A93] text-center">시</span>
              <div className="h-[136px] overflow-y-auto pr-0.5 space-y-1 custom-scrollbar">
                {HOURS_12.map((h) => {
                  const active = hour12 === h
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHour12(h)}
                      className={`w-full py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        active
                          ? "bg-[#1A9E7A] text-white shadow-xs"
                          : "hover:bg-[#F7F7F2] text-[#27272A]"
                      }`}
                    >
                      {h}시
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. 분 (00~55) */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#8A8A93] text-center">분</span>
              <div className="h-[136px] overflow-y-auto pr-0.5 space-y-1 custom-scrollbar">
                {MINUTES_5.map((m) => {
                  const active = minute === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinute(m)}
                      className={`w-full py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                        active
                          ? "bg-[#1A9E7A] text-white shadow-xs"
                          : "hover:bg-[#F7F7F2] text-[#27272A]"
                      }`}
                    >
                      {String(m).padStart(2, "0")}분
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 하단 취소 / 적용 버튼 */}
          <div className="pt-2.5 border-t border-[#E2E2DA]/80 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#6B6B72] hover:bg-slate-100 transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => handleConfirm()}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#1A9E7A] hover:bg-[#158063] text-white text-xs font-extrabold transition shadow-xs cursor-pointer"
            >
              <Check className="size-3.5" />
              <span>시간 적용</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

