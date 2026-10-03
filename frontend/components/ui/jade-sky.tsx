"use client"

import React from "react"

export interface GradientBackgroundProps {
  className?: string
  variant?: "vibrant" | "workspace"
  children?: React.ReactNode
}

// GradientBackground — "Jade Sky"
export function GradientBackground({
  className = "",
  variant = "vibrant",
  children,
}: GradientBackgroundProps) {
  // 1. 워크스페이스용: 복잡도와 국소 얼룩을 덜어내고, 화면 중앙 집중도를 극대화한 차분하고 세련된 Ambient Jade Sky
  if (variant === "workspace") {
    return (
      <div
        aria-hidden="false"
        className={`relative w-full overflow-hidden ${className}`}
        style={{
          backgroundColor: "#F5F9F7",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(ellipse 90% 55% at 50% -12%, rgba(207, 233, 240, 0.5) 0%, transparent 75%),
              radial-gradient(ellipse 65% 50% at 15% 105%, rgba(183, 217, 142, 0.20) 0%, transparent 60%),
              radial-gradient(ellipse 65% 50% at 85% 100%, rgba(127, 191, 154, 0.18) 0%, transparent 60%),
              linear-gradient(180deg, #F2F8F6 0%, #FAFCFB 45%, #EFF7F5 100%)
            `,
          }}
        />

        {/* 컨텐츠 레이어 */}
        {children && (
          <div className="relative z-10 flex h-full w-full flex-col flex-1">
            {children}
          </div>
        )}
      </div>
    )
  }

  // 2. 랜딩 페이지용: 원본의 생생한 색감을 살린 Vibrant Jade Sky
  return (
    <div
      aria-hidden="false"
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        containerType: "size",
        backgroundColor: "#CFE9F0",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-0.8cqmin",
          filter: "blur(0.4cqmin)",
          opacity: 0.92,
          backgroundColor: "#CFE9F0",
          backgroundImage:
            "radial-gradient(circle at 65.34% 44.62%, rgba(238, 246, 227, 1) 0%, rgba(238, 246, 227, 0) 34.1%), radial-gradient(circle at 28.07% 74.48%, rgba(183, 217, 142, 1) 0%, rgba(183, 217, 142, 0) 45.65%), radial-gradient(circle at 52.42% 19.94%, rgba(127, 191, 154, 1) 0%, rgba(127, 191, 154, 0) 57.55%), radial-gradient(circle at 80.31% 84.47%, rgba(207, 233, 240, 1) 0%, rgba(207, 233, 240, 0) 69.1%)",
        }}
      />

      {/* 컨텐츠 레이어 */}
      {children && (
        <div className="relative z-10 flex min-h-full w-full flex-col flex-1">
          {children}
        </div>
      )}
    </div>
  )
}
