"use client"

import React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "live" | "voting" | "confirmed" | "tag" | "outline"
  children: React.ReactNode
}

export function Badge({ variant = "tag", className = "", children, ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full transition-colors"

  const variantStyles = {
    // 실시간 상태 표시 (움직이는 핑 애니메이션 제거, 세련된 고정 도트)
    live: "bg-red-50 text-red-600 border border-red-200/80 font-medium text-[11px]",
    
    // 투표 진행 중 (자연스럽고 부드러운 웜 톤)
    voting: "bg-[#FFF8E7] text-[#9A6B00] border border-[#F3E2B8] text-[11px]",
    
    // 확정됨 (차분한 소프트 에메랄드 톤)
    confirmed: "bg-[#EAF7F1] text-[#1A9E7A] border border-[#C5EBDD] text-[11px]",
    
    // 기본 태그
    tag: "bg-[#EDFAF4] text-[#1A9E7A] border border-[#B8EEDF] text-xs",
    
    // 아웃라인
    outline: "bg-white/80 backdrop-blur-sm text-[#6B6B72] border border-[#E2E2DA] text-xs",
  }

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {variant === "live" && <span className="size-1.5 rounded-full bg-red-500 shrink-0" />}
      {children}
    </span>
  )
}
