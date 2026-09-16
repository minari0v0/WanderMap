"use client"

import { useEffect, useState } from "react"
import { authService } from "@/lib/auth-service"
import { LandingView } from "@/components/home/landing-view"
import { HomeWorkspace } from "@/components/home/home-workspace"

export default function RootPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    // 로컬 스토리지에 JWT 토큰이 있거나 인증 상태인지 확인
    const token = authService.getStoredToken()
    setIsLoggedIn(!!token)
  }, [])

  // 초기 클라이언트 하이드레이션 완료 전 깜빡임 방지
  if (isLoggedIn === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAF9F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-3 border-[#839758] border-t-transparent" />
          <span className="text-xs font-bold text-[#8C8C94]">WanderMap 로드 중...</span>
        </div>
      </div>
    )
  }

  // 로그인 상태에 따른 뷰 분기 (단일 루트 URI '/')
  return isLoggedIn ? <HomeWorkspace /> : <LandingView />
}
