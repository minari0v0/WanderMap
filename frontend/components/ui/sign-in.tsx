"use client"

import React, { useState, useEffect } from "react"
import { Compass, Mail, Lock, ArrowRight } from "lucide-react"

export interface SignInPageProps {
  heroImageSrc?: string
  heroImages?: string[]
  onSignIn?: (e: React.FormEvent<HTMLFormElement>) => void
  onGoogleSignIn?: () => void
  onKakaoSignIn?: () => void
  onNaverSignIn?: () => void
  onResetPassword?: () => void
  onCreateAccount?: () => void
  onOpenTerms?: () => void
  onOpenPrivacy?: () => void
  onBack?: () => void
  isLoading?: boolean
  loginMethod?: string | null
}

export function SignInPage({
  heroImageSrc = "/images/login/swiss.jpg",
  heroImages,
  onSignIn,
  onGoogleSignIn,
  onKakaoSignIn,
  onNaverSignIn,
  onResetPassword,
  onCreateAccount,
  onOpenTerms,
  onOpenPrivacy,
  onBack,
  isLoading = false,
  loginMethod = null,
}: SignInPageProps) {
  const images = heroImages && heroImages.length > 0 ? heroImages : [heroImageSrc]
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // 4.5초마다 부드러운 사진 전환
  useEffect(() => {
    if (images.length <= 1) return
    const imgInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length)
    }, 4500)
    return () => clearInterval(imgInterval)
  }, [images.length])

  return (
    <div className="w-full max-w-5xl mx-auto min-h-[760px] lg:min-h-[820px] rounded-3xl bg-white/90 backdrop-blur-xl shadow-2xl overflow-hidden grid lg:grid-cols-[1.1fr_0.9fr] ring-1 ring-black/5">
      {/* 좌측: 감성적인 여행 사진 크로스페이드 갤러리 & 애플 스타일 타이포그래피 */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-slate-950 text-white select-none rounded-l-3xl">
        {/* 모든 사진들을 겹쳐놓고 active 인덱스만 부드럽게 페이드인 (절대 뚫고 나오지 않음) */}
        {images.map((img, idx) => (
          <div
            key={img}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform ${
              idx === currentImageIndex
                ? "opacity-100 scale-105"
                : "opacity-0 scale-100 pointer-events-none"
            }`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}

        {/* 감성적인 어두운 그라디언트 비네트 오버레이 */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-slate-950/40 pointer-events-none" />

        {/* 상단 로고 */}
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-lg shadow-[#1A9E7A]/40">
            <Compass className="size-4.5" />
          </span>
          <span className="text-xl font-black tracking-tight text-white drop-shadow-sm">WanderMap</span>
        </div>

        {/* 하단 애플 스타일 감성 타이포그래피 문구 & 인디케이터 */}
        <div className="relative z-10 space-y-4">
          <div className="space-y-2">
            <h3 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.25] text-white drop-shadow-md">
              여행의 모든 순간,<br />
              <span className="text-[#1A9E7A]">WanderMap</span>과 함께.
            </h3>
          </div>

          {/* 사진 슬라이드 인디케이터 바 */}
          {images.length > 1 && (
            <div className="flex items-center gap-1.5 pt-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentImageIndex ? "w-7 bg-[#1A9E7A]" : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Photo slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 우측: 세로로 여유롭게 확장된 실제 로그인 레이아웃 */}
      <div className="relative flex flex-col justify-between py-12 sm:py-16 px-8 sm:px-12 text-[#18181B] bg-white/75">
        {/* 상단 은은한 뒤로가기/홈 이동 버튼 */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-6 right-6 flex items-center gap-1.5 text-xs text-[#8A8A93] hover:text-[#18181B] transition p-2 rounded-full hover:bg-slate-100/70"
            title="홈으로 돌아가기"
          >
            <span className="text-[11px] font-medium">홈으로</span>
            <ArrowRight className="size-3.5" />
          </button>
        )}

        <div className="space-y-8 my-auto">
          {/* 모바일 상단 로고 */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <span className="flex size-8 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white">
              <Compass className="size-4" />
            </span>
            <span className="text-lg font-black tracking-tight">WanderMap</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#18181B]">로그인</h2>
            <p className="text-xs sm:text-sm text-[#6B6B72]">나만의 여행 지도를 만들고 친구들과 공유하세요.</p>
          </div>

          {/* 공식 SVG 로고가 적용된 SNS 간편 로그인 버튼들 (카카오, 네이버, 구글 - 로고 위치 100% 수직 일치 정렬) */}
          <div className="space-y-2.5">
            {/* 1. 카카오 공식 SVG 로그인 */}
            <button
              type="button"
              onClick={onKakaoSignIn}
              disabled={isLoading}
              className="relative w-full flex items-center justify-center rounded-xl bg-[#FEE500] py-3.5 px-4 text-xs sm:text-sm font-bold text-[#191919] hover:bg-[#FEE500]/90 transition shadow-sm disabled:opacity-50"
            >
              <span className="absolute left-5 flex items-center justify-center size-5">
                {isLoading && loginMethod === "Kakao" ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#191919] border-t-transparent" />
                ) : (
                  <svg className="size-4" viewBox="0 0 24 24" fill="#000000">
                    <path d="M12 3C6.477 3 2 6.477 2 10.767c0 2.76 1.84 5.183 4.606 6.524l-.94 3.454c-.084.31.258.56.52.385l4.137-2.738c.552.072 1.11.108 1.677.108 5.523 0 10-3.477 10-7.733C22 6.477 17.523 3 12 3z" />
                  </svg>
                )}
              </span>
              <span>카카오로 시작하기</span>
            </button>

            {/* 2. 네이버 공식 SVG 로그인 */}
            <button
              type="button"
              onClick={onNaverSignIn}
              disabled={isLoading}
              className="relative w-full flex items-center justify-center rounded-xl bg-[#03C75A] py-3.5 px-4 text-xs sm:text-sm font-bold text-white hover:bg-[#03C75A]/90 transition shadow-sm disabled:opacity-50"
            >
              <span className="absolute left-5 flex items-center justify-center size-5">
                {isLoading && loginMethod === "Naver" ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="#FFFFFF">
                    <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                  </svg>
                )}
              </span>
              <span>네이버로 시작하기</span>
            </button>

            {/* 3. 구글 공식 4색 SVG 로그인 */}
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={isLoading}
              className="relative w-full flex items-center justify-center rounded-xl border border-[#E2E2DA] bg-white py-3.5 px-4 text-xs sm:text-sm font-bold text-[#18181B] hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <span className="absolute left-5 flex items-center justify-center size-5">
                {isLoading && loginMethod === "Google" ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
                ) : (
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
              </span>
              <span>구글로 시작하기</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-5">
            <span className="absolute inset-x-0 h-px bg-[#E2E2DA]" />
            <span className="relative bg-white/90 px-3 text-[11px] font-bold text-[#6B6B72] uppercase">또는 이메일</span>
          </div>

          {/* 이메일 로그인 폼 */}
          <form onSubmit={onSignIn} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-[#6B6B72] uppercase block mb-1">이메일</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 size-4 text-[#9E9EA4]" />
                <input
                  name="email"
                  type="email"
                  defaultValue="tester@wandermap.io"
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#E2E2DA] bg-white/90 pl-10 pr-3.5 py-3 text-xs outline-none focus:border-[#1A9E7A] transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#6B6B72] uppercase">비밀번호</label>
                <button
                  type="button"
                  onClick={onResetPassword}
                  className="text-[11px] text-[#1A9E7A] hover:underline font-semibold"
                >
                  비밀번호 찾기
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 size-4 text-[#9E9EA4]" />
                <input
                  name="password"
                  type="password"
                  defaultValue="********"
                  placeholder="비밀번호 입력"
                  className="w-full rounded-xl border border-[#E2E2DA] bg-white/90 pl-10 pr-3.5 py-3 text-xs outline-none focus:border-[#1A9E7A] transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#1A9E7A] py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-[#158063] transition shadow-md shadow-[#1A9E7A]/20 disabled:opacity-50 mt-2"
            >
              {isLoading && loginMethod === "Email" ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  로그인 <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* 계정 생성 링크 */}
          <div className="text-center pt-1">
            <span className="text-xs text-[#6B6B72]">계정이 없으신가요? </span>
            <button
              type="button"
              onClick={onCreateAccount}
              className="text-xs font-bold text-[#1A9E7A] hover:underline"
            >
              회원가입
            </button>
          </div>
        </div>

        {/* 하단 이용약관 & 개인정보 처리방침 모달 트리거 */}
        <p className="text-center text-[11px] text-[#6B6B72] pt-6 border-t border-[#E2E2DA]/60">
          로그인 시 WanderMap의{" "}
          <button
            type="button"
            onClick={onOpenTerms}
            className="underline font-semibold text-[#18181B] hover:text-[#1A9E7A] transition"
          >
            서비스 이용약관
          </button>
          과{" "}
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="underline font-semibold text-[#18181B] hover:text-[#1A9E7A] transition"
          >
            개인정보 처리방침
          </button>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  )
}
