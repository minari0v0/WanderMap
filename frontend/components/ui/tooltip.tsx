"use client"

import React, { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"

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
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{ left: number; top: number; transform: string }>({
    left: 0,
    top: 0,
    transform: "",
  })

  const triggerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  function updatePosition() {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()

    let left = 0
    let top = 0
    let transform = ""

    switch (side) {
      case "right":
        left = rect.right + 8
        top = rect.top + rect.height / 2
        transform = "translateY(-50%)"
        break
      case "left":
        left = rect.left - 8
        top = rect.top + rect.height / 2
        transform = "translate(-100%, -50%)"
        break
      case "bottom":
        left = rect.left + rect.width / 2
        top = rect.bottom + 8
        transform = "translateX(-50%)"
        break
      case "top":
      default:
        left = rect.left + rect.width / 2
        top = rect.top - 8
        transform = "translate(-50%, -100%)"
        break
    }

    setCoords({ left, top, transform })
  }

  function handleMouseEnter() {
    if (disabled || !content) return
    updatePosition()
    timerRef.current = setTimeout(() => {
      updatePosition()
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

  // 화면 스크롤 또는 리사이즈 시 툴팁 자동 닫기 (오정렬 방지)
  useEffect(() => {
    if (!isVisible) return
    function handleScroll() {
      setIsVisible(false)
    }
    window.addEventListener("scroll", handleScroll, true)
    window.addEventListener("resize", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll, true)
      window.removeEventListener("resize", handleScroll)
    }
  }, [isVisible])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      {mounted &&
        isVisible &&
        !disabled &&
        content &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              top: `${coords.top}px`,
              transform: coords.transform,
              zIndex: 99999,
            }}
            className={`pointer-events-none px-2.5 py-1.5 rounded-xl bg-[#18181B]/95 text-white text-[11px] font-semibold tracking-normal shadow-2xl shadow-black/20 border border-white/10 backdrop-blur-md whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 ${className}`}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  )
}
