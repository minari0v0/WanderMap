"use client"

import React, { useState } from "react"
import { Compass, Mail, Lock, ArrowRight, User as UserIcon, AlertCircle } from "lucide-react"
import { ImageHoverScrubber } from "./image-hover-scrubber"

export interface SignInPageProps {
  heroImageSrc?: string
  heroImages?: string[]
  mode?: "signin" | "signup"
  onModeChange?: (mode: "signin" | "signup") => void
  onSignIn?: (data: { email: string; password: string }) => void
  onSignUp?: (data: { nickname: string; email: string; password: string }) => void
  onGoogleSignIn?: () => void
  onKakaoSignIn?: () => void
  onNaverSignIn?: () => void
  onResetPassword?: () => void
  onOpenTerms?: () => void
  onOpenPrivacy?: () => void
  onBack?: () => void
  isLoading?: boolean
  loginMethod?: string | null
  errorMessage?: string | null
}

export function SignInPage({
  heroImageSrc = "/images/login/swiss.jpg",
  heroImages,
  mode: initialMode = "signin",
  onModeChange,
  onSignIn,
  onSignUp,
  onGoogleSignIn,
  onKakaoSignIn,
  onNaverSignIn,
  onResetPassword,
  onOpenTerms,
  onOpenPrivacy,
  onBack,
  isLoading = false,
  loginMethod = null,
  errorMessage = null,
}: SignInPageProps) {
  const images = heroImages && heroImages.length > 0 ? heroImages : [heroImageSrc]
  const [currentMode, setCurrentMode] = useState<"signin" | "signup">(initialMode)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  const handleToggleMode = (targetMode: "signin" | "signup") => {
    setCurrentMode(targetMode)
    setLocalError(null)
    onModeChange?.(targetMode)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLocalError(null)

    if (currentMode === "signup") {
      if (!nickname.trim()) {
        setLocalError("닉네임을 입력해 주세요.")
        return
      }
      if (!email.trim()) {
        setLocalError("이메일을 입력해 주세요.")
        return
      }
      if (password.length < 4) {
        setLocalError("비밀번호는 최소 4자 이상이어야 합니다.")
        return
      }
      if (password !== passwordConfirm) {
        setLocalError("비밀번호 확인이 일치하지 않습니다.")
        return
      }
      onSignUp?.({ nickname: nickname.trim(), email: email.trim(), password })
    } else {
      if (!email.trim() || !password) {
        setLocalError("이메일과 비밀번호를 모두 입력해 주세요.")
        return
      }
      onSignIn?.({ email: email.trim(), password })
    }
  }

  const displayedError = localError || errorMessage

  return (
    <div className="w-full max-w-5xl mx-auto min-h-[760px] lg:min-h-[840px] rounded-3xl bg-white/90 backdrop-blur-xl shadow-2xl overflow-hidden grid lg:grid-cols-[1.1fr_0.9fr] ring-1 ring-black/5">
      {/* 좌측: 감성적인 여행 사진 크로스페이드 갤러리 & 호버 스크러버 */}
      <ImageHoverScrubber
        images={images}
        className="hidden lg:flex flex-col justify-between p-12 bg-slate-950 text-white rounded-l-3xl"
        overlay={
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-slate-950/40 pointer-events-none" />
        }
      >
        {({ currentIndex, setCurrentIndex }) => (
          <>
            {/* 상단 로고 */}
            <div className="relative z-10 flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-lg shadow-[#1A9E7A]/40">
                <Compass className="size-4.5" />
              </span>
              <span className="text-xl font-black tracking-tight text-white drop-shadow-sm">WanderMap</span>
            </div>

            {/* 하단 감성 타이포그래피 문구 & 인디케이터 */}
            <div className="relative z-10 space-y-4">
              <div className="space-y-2">
                <h3 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.25] text-white drop-shadow-md">
                  여행의 모든 순간,<br />
                  <span className="text-[#1A9E7A]">WanderMap</span>과 함께.
                </h3>
              </div>

              {/* 사진 슬라이드 인디케이터 바 (마우스 호버 & 클릭 연동) */}
              {images.length > 1 && (
                <div className="flex items-center gap-1.5 pt-2">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentIndex(i)
                      }}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i === currentIndex ? "w-7 bg-[#1A9E7A]" : "w-1.5 bg-white/40 hover:bg-white/70"
                      }`}
                      aria-label={`Photo slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </ImageHoverScrubber>

      {/* 우측: 실제 로그인/회원가입 폼 레이아웃 */}
      <div className="relative flex flex-col justify-between py-10 sm:py-14 px-8 sm:px-12 text-[#18181B] bg-white/75">
        {/* 상단 홈 이동 버튼 */}
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

        <div className="space-y-6 my-auto">
          {/* 모바일 상단 로고 */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <span className="flex size-8 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white">
              <Compass className="size-4" />
            </span>
            <span className="text-lg font-black tracking-tight">WanderMap</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#18181B]">
              {currentMode === "signup" ? "회원가입" : "로그인"}
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6B72]">
              {currentMode === "signup"
                ? "WanderMap에 가입하고 친구들과 함께 여행을 계획해보세요."
                : "나만의 여행 지도를 만들고 친구들과 공유하세요."}
            </p>
          </div>

          {/* 에러 메시지 알림 바 */}
          {displayedError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-2.5 text-xs text-rose-600 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="size-4 shrink-0" />
              <span>{displayedError}</span>
            </div>
          )}

          {/* 공식 SVG 로고가 적용된 SNS 간편 로그인 버튼들 */}
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
              <span>카카오로 {currentMode === "signup" ? "간편 가입" : "시작하기"}</span>
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
              <span>네이버로 {currentMode === "signup" ? "간편 가입" : "시작하기"}</span>
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
              <span>구글로 {currentMode === "signup" ? "간편 가입" : "시작하기"}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-4">
            <span className="absolute inset-x-0 h-px bg-[#E2E2DA]" />
            <span className="relative bg-white/90 px-3 text-[11px] font-bold text-[#6B6B72] uppercase">
              또는 이메일 {currentMode === "signup" ? "회원가입" : "로그인"}
            </span>
          </div>

          {/* 이메일 로그인 / 회원가입 폼 */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {currentMode === "signup" && (
              <div>
                <label className="text-[11px] font-bold text-[#6B6B72] uppercase block mb-1">
                  닉네임
                </label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3.5 size-4 text-[#9E9EA4]" />
                  <input
                    name="nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="활동할 닉네임 입력 (예: 제주여행자)"
                    className="w-full rounded-xl border border-[#E2E2DA] bg-white/90 pl-10 pr-3.5 py-3 text-xs outline-none focus:border-[#1A9E7A] transition"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-[#6B6B72] uppercase block mb-1">
                이메일 (ID)
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 size-4 text-[#9E9EA4]" />
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#E2E2DA] bg-white/90 pl-10 pr-3.5 py-3 text-xs outline-none focus:border-[#1A9E7A] transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#6B6B72] uppercase">비밀번호</label>
                {currentMode === "signin" && onResetPassword && (
                  <button
                    type="button"
                    onClick={onResetPassword}
                    className="text-[11px] text-[#1A9E7A] hover:underline font-semibold"
                  >
                    비밀번호 찾기
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 size-4 text-[#9E9EA4]" />
                <input
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={currentMode === "signup" ? "비밀번호 (4자 이상)" : "비밀번호 입력"}
                  className="w-full rounded-xl border border-[#E2E2DA] bg-white/90 pl-10 pr-3.5 py-3 text-xs outline-none focus:border-[#1A9E7A] transition"
                  required
                />
              </div>
            </div>

            {currentMode === "signup" && (
              <div>
                <label className="text-[11px] font-bold text-[#6B6B72] uppercase block mb-1">
                  비밀번호 확인
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 size-4 text-[#9E9EA4]" />
                  <input
                    name="passwordConfirm"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="비밀번호 다시 입력"
                    className="w-full rounded-xl border border-[#E2E2DA] bg-white/90 pl-10 pr-3.5 py-3 text-xs outline-none focus:border-[#1A9E7A] transition"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#1A9E7A] py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-[#158063] transition shadow-md shadow-[#1A9E7A]/20 disabled:opacity-50 mt-3"
            >
              {isLoading && loginMethod === "Email" ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : currentMode === "signup" ? (
                <>
                  회원가입 완료 <ArrowRight className="size-4" />
                </>
              ) : (
                <>
                  로그인 <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* 모드 전환 링크 (회원가입 <-> 로그인) */}
          <div className="text-center pt-1">
            {currentMode === "signup" ? (
              <>
                <span className="text-xs text-[#6B6B72]">이미 계정이 있으신가요? </span>
                <button
                  type="button"
                  onClick={() => handleToggleMode("signin")}
                  className="text-xs font-bold text-[#1A9E7A] hover:underline"
                >
                  로그인하기
                </button>
              </>
            ) : (
              <>
                <span className="text-xs text-[#6B6B72]">계정이 없으신가요? </span>
                <button
                  type="button"
                  onClick={() => handleToggleMode("signup")}
                  className="text-xs font-bold text-[#1A9E7A] hover:underline"
                >
                  회원가입
                </button>
              </>
            )}
          </div>
        </div>

        {/* 하단 이용약관 & 개인정보 처리방침 모달 트리거 */}
        <p className="text-center text-[11px] text-[#6B6B72] pt-6 border-t border-[#E2E2DA]/60">
          계속 진행할 경우 WanderMap의{" "}
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
