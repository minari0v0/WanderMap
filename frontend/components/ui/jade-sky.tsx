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
  // 1. 워크스페이스용: 과하지 않으면서도 생동감 있는 Jade Sky 대기광 (중앙 가독성 보호 + 은은한 민트/스카이/자스민 밸런스)
  if (variant === "workspace") {
    return (
      <div
        aria-hidden="false"
        className={`relative w-full overflow-hidden ${className}`}
        style={{
          backgroundColor: "#EBF4F6",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, rgba(246, 252, 243, 0.90) 0%, rgba(246, 252, 243, 0) 56%),
              radial-gradient(circle at 10% 15%, rgba(127, 191, 154, 0.38) 0%, rgba(127, 191, 154, 0) 60%),
              radial-gradient(circle at 90% 18%, rgba(185, 224, 235, 0.50) 0%, rgba(185, 224, 235, 0) 60%),
              radial-gradient(circle at 15% 85%, rgba(183, 217, 142, 0.32) 0%, rgba(183, 217, 142, 0) 58%),
              radial-gradient(circle at 88% 85%, rgba(127, 191, 154, 0.32) 0%, rgba(127, 191, 154, 0) 58%),
              linear-gradient(180deg, #E6F3F6 0%, #F8FCFA 48%, #EBF4F2 100%)
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
