"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"

export interface ImageHoverScrubberState {
  currentIndex: number
  setCurrentIndex: (index: number) => void
  isHovered: boolean
  totalImages: number
}

export interface ImageHoverScrubberProps {
  /** 전환할 이미지 URL 목록 */
  images: string[]
  /** 초기 이미지 인덱스 (기본값: 0) */
  initialIndex?: number
  /** 자동 슬라이드 간격(ms) - 0 이하로 설정 시 자동 슬라이드 비활성화 (기본값: 4500) */
  autoPlayInterval?: number
  /** 전환 트랜지션 클래스 (기본값: "duration-1000") */
  transitionDurationClass?: string
  /** 컨테이너 커스텀 스타일 클래스 */
  className?: string
  /** 이미지 위에 표시할 오버레이 레이어 (그라디언트, 비네트 등) */
  overlay?: React.ReactNode
  /** 내장 인디케이터 바 표시 여부 (기본값: false, children에서 직접 렌더링 가능) */
  showIndicators?: boolean
  /** 활성화된 인디케이터 색상 클래스 (기본값: "bg-[#1A9E7A]") */
  indicatorActiveClass?: string
  /** 인덱스 변경 시 콜백 함수 */
  onIndexChange?: (index: number) => void
  /** 내부 컨텐츠 (함수형 렌더 프롭 또는 일반 노드) */
  children?: React.ReactNode | ((state: ImageHoverScrubberState) => React.ReactNode)
}

/**
 * ImageHoverScrubber
 * 
 * 알리익스프레스/에어비앤비 스타일의 호버 스크러버(Hover Scrubber) 갤러리 컴포넌트입니다.
 * 마우스를 좌우로 움직이면(1/N 등분) 마우스 위치에 맞춰 이미지가 즉시 전환되며,
 * 마우스가 벗어나면 부드러운 자동 슬라이드가 재개됩니다.
 */
export function ImageHoverScrubber({
  images = [],
  initialIndex = 0,
  autoPlayInterval = 4500,
  transitionDurationClass = "duration-1000",
  className = "",
  overlay,
  showIndicators = false,
  indicatorActiveClass = "bg-[#1A9E7A]",
  onIndexChange,
  children,
}: ImageHoverScrubberProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isHovered, setIsHovered] = useState(false)

  const validImages = images.length > 0 ? images : ["/images/login/swiss.jpg"]
  const total = validImages.length

  // 인덱스 변경 래퍼
  const handleIndexChange = useCallback(
    (nextIdx: number) => {
      setCurrentIndex(nextIdx)
      onIndexChange?.(nextIdx)
    },
    [onIndexChange]
  )

  // 1/N 등분 마우스 위치 기반 스크러빙
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || total <= 1) return

      const rect = containerRef.current.getBoundingClientRect()
      if (rect.width <= 0) return

      // 마우스 X 좌표를 0 ~ rect.width 범위로 클램핑
      const relativeX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      const segmentWidth = rect.width / total
      const calculatedIndex = Math.min(Math.floor(relativeX / segmentWidth), total - 1)

      if (calculatedIndex !== currentIndex) {
        handleIndexChange(calculatedIndex)
      }
    },
    [total, currentIndex, handleIndexChange]
  )

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  // 자동 슬라이드 (호버 중일 때는 일시정지)
  useEffect(() => {
    if (isHovered || total <= 1 || autoPlayInterval <= 0) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % total
        onIndexChange?.(next)
        return next
      })
    }, autoPlayInterval)

    return () => clearInterval(timer)
  }, [isHovered, total, autoPlayInterval, onIndexChange])

  const state: ImageHoverScrubberState = {
    currentIndex,
    setCurrentIndex: handleIndexChange,
    isHovered,
    totalImages: total,
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden select-none ${className}`}
    >
      {/* 백그라운드 이미지들 (크로스페이드 & 줌 트랜지션) */}
      {validImages.map((img, idx) => (
        <div
          key={`${img}-${idx}`}
          className={`absolute inset-0 bg-cover bg-center transition-all ${transitionDurationClass} ease-in-out transform ${
            idx === currentIndex
              ? "opacity-100 scale-105"
              : "opacity-0 scale-100 pointer-events-none"
          }`}
          style={{ backgroundImage: `url(${img})` }}
        />
      ))}

      {/* 커스텀 오버레이 (비네트 / 그라디언트) */}
      {overlay}

      {/* 내부 컨텐츠 (로고, 텍스트, 사용자정의 인디케이터 등) */}
      {typeof children === "function" ? children(state) : children}

      {/* 기본 인디케이터 바 (옵션) */}
      {showIndicators && total > 1 && (
        <div className="absolute bottom-6 left-12 right-12 z-20 flex items-center gap-1.5 pointer-events-auto">
          {validImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleIndexChange(i)
              }}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? `w-7 ${indicatorActiveClass}`
                  : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
