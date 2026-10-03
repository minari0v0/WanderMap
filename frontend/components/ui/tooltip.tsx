"use client"

import React, { useState, useRef, useEffect } from "react"

export interface TooltipProps {
  content: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  delay?: number
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function Tooltip({
  content,
  side = "top",
  delay = 120,
  children,
  className = "",
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  function handleMouseEnter() {
    if (disabled || !content) return
    timerRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  function handleMouseLeave() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // 위치별 스타일 클래스
  const positionStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[side]

  return (
    <div
      className="relative inline-flex items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      {isVisible && !disabled && content && (
        <div
          role="tooltip"
          className={`absolute ${positionStyles} z-50 pointer-events-none px-2.5 py-1 rounded-lg bg-[#18181B]/95 text-white text-[11px] font-semibold tracking-normal shadow-lg shadow-black/15 border border-white/10 backdrop-blur-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 ${className}`}
        >
          {content}
        </div>
      )}
    </div>
  )
}
