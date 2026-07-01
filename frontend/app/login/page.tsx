"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Compass, Check } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<string | null>(null)

  function handleSocialLogin(provider: string) {
    setIsLoading(true)
    setLoginMethod(provider)
    
    // 임시 로그인 세션 설정 (1초 후 대시보드로 이동)
    setTimeout(() => {
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("userId", "1")
      localStorage.setItem("nickname", "여행 매니아")
      localStorage.setItem("email", "tester@wandermap.io")
      
      router.push("/dashboard")
    }, 1000)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#F8F8F6] p-4 text-[#18181B]">
      <div className="w-full max-w-sm space-y-6">
        
        {/* 상단 로고 */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-md shadow-[#1A9E7A]/10">
            <Compass className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">WanderMap 시작하기</h1>
          <p className="text-sm text-[#6B6B72]">로그인 후 나만의 여행 지도를 만들고 관리해보세요.</p>
        </div>

        {/* 로그인 카드 */}
        <div className="rounded-2xl border border-[#E2E2DA] bg-white p-6 shadow-sm space-y-4">
          
          <button
            onClick={() => handleSocialLogin("Kakao")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-3 text-sm font-semibold text-[#191919] hover:bg-[#FEE500]/90 transition-colors disabled:opacity-50"
          >
            {isLoading && loginMethod === "Kakao" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#191919] border-t-transparent"></span>
            ) : null}
            카카오로 3초 만에 시작하기
          </button>

          <button
            onClick={() => handleSocialLogin("Google")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#E2E2DA] bg-white py-3 text-sm font-semibold text-[#18181B] hover:bg-[#F8F8F6] transition-colors disabled:opacity-50"
          >
            {isLoading && loginMethod === "Google" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent"></span>
            ) : null}
            구글로 시작하기
          </button>

          <div className="relative my-4 flex items-center justify-center">
            <span className="absolute inset-x-0 h-px bg-[#E2E2DA]"></span>
            <span className="relative bg-white px-3 text-xs text-[#6B6B72] uppercase font-semibold">또는</span>
          </div>

          <button
            onClick={() => handleSocialLogin("Email")}
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            이메일 계정으로 테스트 로그인
          </button>

        </div>

        {/* 하단 안내 */}
        <p className="text-center text-xs text-[#6B6B72]">
          회원가입 시 WanderMap의 <span className="underline cursor-pointer">서비스 이용약관</span> 및 <span className="underline cursor-pointer">개인정보 처리방침</span>에 동의하게 됩니다.
        </p>

      </div>
    </div>
  )
}
