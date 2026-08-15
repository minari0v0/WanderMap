"use client"

import React from "react"

// GradientBackground — "Jade Sky" (Original Vibrant Recipe with Subtle Softening)
export function GradientBackground({
  className = "",
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      aria-hidden="false"
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        containerType: "size",
        backgroundColor: "#CFE9F0",
      }}
    >
      {/* 21st.dev 원본 Jade Sky 그라디언트 (채도를 원본 대비 8% 미세 조정하여 눈이 편안한 생동감 유지) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-0.8cqmin",
          filter: "blur(0.4cqmin)",
          opacity: 0.92, // 원본의 생생한 색감을 살리면서 부담 없는 밸런스
          backgroundColor: "#CFE9F0",
          backgroundImage:
            "radial-gradient(circle at 65.34% 44.62%, rgba(238, 246, 227, 1) 0%, rgba(238, 246, 227, 0) 34.1%), radial-gradient(circle at 28.07% 74.48%, rgba(183, 217, 142, 1) 0%, rgba(183, 217, 142, 0) 45.65%), radial-gradient(circle at 52.42% 19.94%, rgba(127, 191, 154, 1) 0%, rgba(127, 191, 154, 0) 57.55%), radial-gradient(circle at 80.31% 84.47%, rgba(207, 233, 240, 1) 0%, rgba(207, 233, 240, 0) 69.1%)",
        }}
      />

      {/* 컨텐츠 레이어 */}
      {children && <div className="relative z-10 flex min-h-full w-full flex-col flex-1">{children}</div>}
    </div>
  )
}
