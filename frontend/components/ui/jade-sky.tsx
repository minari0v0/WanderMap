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
  // 1. 워크스페이스용: 원본 Jade Sky의 생동감 넘치는 색감(민트, 스카이블루, 자스민)을 그대로 살리되, 넓은 방사형 확산으로 얼룩 없이 조화로운 Ambient Jade Sky
  if (variant === "workspace") {
    return (
      <div
        aria-hidden="false"
        className={`relative w-full overflow-hidden ${className}`}
        style={{
          backgroundColor: "#DCEEF2",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 48%, rgba(242, 249, 235, 0.92) 0%, rgba(242, 249, 235, 0) 52%),
              radial-gradient(circle at 12% 18%, rgba(127, 191, 154, 0.65) 0%, rgba(127, 191, 154, 0) 58%),
              radial-gradient(circle at 88% 22%, rgba(207, 233, 240, 0.85) 0%, rgba(207, 233, 240, 0) 60%),
              radial-gradient(circle at 18% 82%, rgba(183, 217, 142, 0.55) 0%, rgba(183, 217, 142, 0) 58%),
              radial-gradient(circle at 85% 82%, rgba(127, 191, 154, 0.52) 0%, rgba(127, 191, 154, 0) 58%),
              linear-gradient(180deg, #E2F2F5 0%, #F5FAF7 50%, #E8F4F0 100%)
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
