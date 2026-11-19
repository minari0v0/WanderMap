"use client"

import React, { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { GradientBackground } from "@/components/ui/jade-sky"
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar"
import { authService, type UserResponse } from "@/lib/auth-service"

export function WorkspaceAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setCurrentUser(authService.getSession())
    setIsMounted(true)

    function handleUserUpdated(e: Event) {
      const customEvent = e as CustomEvent<UserResponse | null>
      setCurrentUser(customEvent.detail)
    }

    window.addEventListener("wandermap:user-updated", handleUserUpdated)
    return () => window.removeEventListener("wandermap:user-updated", handleUserUpdated)
  }, [])

  const isTripDetailRoute =
    pathname.startsWith("/trips/") &&
    !pathname.startsWith("/trips/view/") &&
    !pathname.endsWith("/preferences")

  const isWorkspaceRoute =
    pathname === "/" ||
    pathname === "/settings" ||
    pathname === "/mypage" ||
    isTripDetailRoute

  const currentTripId = isTripDetailRoute
    ? decodeURIComponent(pathname.slice("/trips/".length).split("/")[0] || "")
    : undefined

  // 클라이언트 마운트 전에는 깜빡임 방지를 위해 조용한 배경 유지
  if (!isMounted && (pathname === "/settings" || pathname === "/mypage")) {
    return <div className="min-h-screen bg-[#F7F7F2]" />
  }

  // 로그인된 사용자의 워크스페이스 라우트(/, /settings, /mypage, /trips/[tripId])에서는
  // 좌측 풀높이 세로 도킹 사이드바를 언마운트 없이 고정 유지하고 우측 영역(children)만 부드럽게 교체합니다.
  if (isMounted && currentUser && isWorkspaceRoute) {
    return (
      <div className="flex h-dvh w-screen overflow-hidden bg-[#F8F8F6] font-sans">
        <WorkspaceSidebar variant="default" currentTripId={currentTripId} />
        {isTripDetailRoute ? (
          <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
            {children}
          </div>
        ) : (
          <GradientBackground
            variant="workspace"
            className="flex-1 h-full overflow-hidden flex flex-col min-w-0"
          >
            {children}
          </GradientBackground>
        )}
      </div>
    )
  }

  return <>{children}</>
}

