"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GradientBackground } from "@/components/ui/jade-sky"
import { SignInPage, type Testimonial } from "@/components/ui/sign-in"
import { X, ShieldCheck, FileText } from "lucide-react"

const wanderMapTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    name: "이지은",
    handle: "@jieun_travel",
    text: "친구 4명이서 제주도 3박 4일 일정 짤 때 매번 싸웠는데, WanderMap 실시간 투표로 10분 만에 코스 확정했어요!"
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    name: "박민호",
    handle: "@minho_journey",
    text: "AI가 멤버들 취향 분석해서 네이버 실데이터로 이동 동선 묶어주는 게 진짜 사기네요. 엑셀 쓸 일 없습니다."
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    name: "김수현",
    handle: "@suhyun_trips",
    text: "비회원 친구한테 링크 하나만 툭 보내도 완성된 지도를 깔끔하게 뷰어로 볼 수 있어서 너무 편해요."
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<string | null>(null)

  // 약관 모달 상태
  const [modalType, setModalType] = useState<"terms" | "privacy" | null>(null)

  function performLogin(provider: string) {
    setIsLoading(true)
    setLoginMethod(provider)

    setTimeout(() => {
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("userId", "1")
      localStorage.setItem("nickname", "여행 매니아")
      localStorage.setItem("email", "tester@wandermap.io")
      router.push("/dashboard")
    }, 800)
  }

  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    performLogin("Email")
  }

  const handleGoogleSignIn = () => {
    performLogin("Google")
  }

  const handleKakaoSignIn = () => {
    performLogin("Kakao")
  }

  const handleNaverSignIn = () => {
    performLogin("Naver")
  }

  const handleResetPassword = () => {
    alert("테스트 환경에서는 비밀번호 재설정이 비활성화되어 있습니다. 기본 계정으로 로그인해 주세요.")
  }

  const handleCreateAccount = () => {
    performLogin("Kakao")
  }

  return (
    <GradientBackground className="min-h-screen">
      <div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6 lg:p-8">
        <SignInPage
          heroImages={[
            "/images/login/swiss.jpg",
            "/images/login/france.jpg",
            "/images/login/iceland.jpg",
            "/images/login/japan.jpg",
            "/images/login/europe.jpg",
            "/images/login/usa.jpg",
            "/images/login/bietnam.jpg",
            "/images/login/china.jpg",
            "/images/login/seoul.jpg",
          ]}
          testimonials={wanderMapTestimonials}
          onSignIn={handleSignIn}
          onGoogleSignIn={handleGoogleSignIn}
          onKakaoSignIn={handleKakaoSignIn}
          onNaverSignIn={handleNaverSignIn}
          onResetPassword={handleResetPassword}
          onCreateAccount={handleCreateAccount}
          onOpenTerms={() => setModalType("terms")}
          onOpenPrivacy={() => setModalType("privacy")}
          onBack={() => router.push("/")}
          isLoading={isLoading}
          loginMethod={loginMethod}
        />
      </div>

      {/* 약관 및 개인정보 처리방침 모달 다이얼로그 */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-[#E2E2DA] bg-white p-6 sm:p-8 shadow-2xl space-y-4">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-[#E2E2DA] pb-3">
              <div className="flex items-center gap-2">
                {modalType === "terms" ? (
                  <FileText className="size-5 text-[#1A9E7A]" />
                ) : (
                  <ShieldCheck className="size-5 text-[#1A9E7A]" />
                )}
                <h3 className="text-lg font-bold text-[#18181B]">
                  {modalType === "terms" ? "서비스 이용약관" : "개인정보 처리방침"}
                </h3>
              </div>
              <button
                onClick={() => setModalType(null)}
                className="flex size-8 items-center justify-center rounded-full hover:bg-slate-100 transition text-[#6B6B72]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* 모달 본문 (간단하고 명확한 요약문) */}
            <div className="max-h-[60vh] overflow-y-auto text-xs text-[#52525B] leading-relaxed space-y-3 pr-1">
              {modalType === "terms" ? (
                <>
                  <p className="font-semibold text-[#18181B]">제 1 조 (목적)</p>
                  <p>본 약관은 WanderMap(이하 &apos;서비스&apos;)이 제공하는 실시간 여행 동선 조율 및 협업 플랫폼의 이용 조건과 절차에 관한 기본 사항을 규정합니다.</p>
                  
                  <p className="font-semibold text-[#18181B] mt-2">제 2 조 (회원의 의무 및 방 생성)</p>
                  <p>1. 회원은 타인의 정보를 도용하지 않으며, 서비스 내 투표 및 일정 조율 기능을 건전한 목적으로 사용해야 합니다.<br />2. 생성된 여행 방의 초대 링크는 방 개설자 및 초대된 멤버의 동의 하에 공유되어야 합니다.</p>

                  <p className="font-semibold text-[#18181B] mt-2">제 3 조 (서비스의 제공 및 변경)</p>
                  <p>WanderMap은 실시간 투표, AI 기반 동선 추천 및 네이버 지도 연동 기능을 지속적으로 고도화하여 제공합니다.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-[#18181B]">1. 수집하는 개인정보 항목</p>
                  <p>WanderMap은 간편 로그인 및 원활한 서비스 제공을 위해 아래 정보를 수집합니다.<br />- 필수 항목: 소셜 계정 고유 ID, 이메일, 닉네임, 프로필 이미지<br />- 선택 항목: 여행 선호도 설문 데이터(음식/활동 카테고리, 메모 등)</p>
                  
                  <p className="font-semibold text-[#18181B] mt-2">2. 개인정보의 이용 목적</p>
                  <p>- 여행 방 생성 및 초대 멤버 식별<br />- AI 기반 맞춤형 여행지 추천 및 최적 동선 생성<br />- 실시간 투표 집계 및 상태 브로드캐스트</p>

                  <p className="font-semibold text-[#18181B] mt-2">3. 개인정보의 보유 및 파기</p>
                  <p>회원 탈퇴 시 또는 목적 달성 시 관련 법령에 따라 지체 없이 안전하게 파기됩니다.</p>
                </>
              )}
            </div>

            {/* 모달 닫기 버튼 */}
            <div className="pt-2">
              <button
                onClick={() => setModalType(null)}
                className="w-full rounded-xl bg-[#1A9E7A] py-2.5 text-xs font-bold text-white hover:bg-[#158063] transition"
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </GradientBackground>
  )
}
