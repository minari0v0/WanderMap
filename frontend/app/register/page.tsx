"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { GradientBackground } from "@/components/ui/jade-sky"
import { authService } from "@/lib/auth-service"
import { Compass, Mail, Lock, User, ArrowRight, ShieldCheck, FileText, X } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [modalType, setModalType] = useState<"terms" | "privacy" | null>(null)

  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "duplicate" | "invalid">("idle")
  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "available" | "duplicate" | "invalid">("idle")

  const NICKNAME_REGEX = /^[a-zA-Z0-9가-힣]{2,10}$/
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,20}$/

  // 닉네임 실시간 중복 확인 (400ms debounce)
  React.useEffect(() => {
    if (!nickname.trim()) {
      setNicknameStatus("idle")
      return
    }
    if (!NICKNAME_REGEX.test(nickname.trim())) {
      setNicknameStatus("invalid")
      return
    }

    setNicknameStatus("checking")
    const timer = setTimeout(async () => {
      try {
        const res = await authService.checkNickname(nickname.trim())
        setNicknameStatus(res.available ? "available" : "duplicate")
      } catch {
        setNicknameStatus("idle")
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [nickname])

  // 이메일 실시간 중복 확인 (400ms debounce)
  React.useEffect(() => {
    if (!email.trim()) {
      setEmailStatus("idle")
      return
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailStatus("invalid")
      return
    }

    setEmailStatus("checking")
    const timer = setTimeout(async () => {
      try {
        const res = await authService.checkEmail(email.trim())
        setEmailStatus(res.available ? "available" : "duplicate")
      } catch {
        setEmailStatus("idle")
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [email])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)

    if (nicknameStatus === "duplicate") {
      setErrorMsg("이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.")
      return
    }

    if (emailStatus === "duplicate") {
      setErrorMsg("이미 가입된 이메일 주소입니다. 로그인해주세요.")
      return
    }

    if (!NICKNAME_REGEX.test(nickname.trim())) {
      setErrorMsg("닉네임은 2~10자의 한글, 영문, 숫자만 사용 가능합니다.")
      return
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      setErrorMsg("올바른 이메일 형식을 입력해주세요.")
      return
    }

    if (!PASSWORD_REGEX.test(password)) {
      setErrorMsg("비밀번호는 8~20자의 영문과 숫자를 조합하여 입력해주세요.")
      return
    }

    if (password !== passwordConfirm) {
      setErrorMsg("비밀번호와 비밀번호 확인이 일치하지 않습니다.")
      return
    }

    try {
      setIsLoading(true)
      await authService.register({
        nickname: nickname.trim(),
        email: email.trim(),
        password,
        passwordConfirm,
      })
      router.push("/mypage")
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "회원가입 처리 중 오류가 발생했습니다."
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <GradientBackground className="min-h-screen">
      <div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
        <div className="w-full max-w-5xl mx-auto min-h-[760px] lg:min-h-[820px] rounded-3xl bg-white/90 backdrop-blur-xl shadow-2xl overflow-hidden grid lg:grid-cols-[1.1fr_0.9fr] ring-1 ring-black/5">
          {/* 좌측: 감성적인 여행 사진 & 환영 카피 */}
          <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-slate-950 text-white select-none rounded-l-3xl">
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105"
              style={{ backgroundImage: "url('/images/login/swiss.jpg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-slate-950/40 pointer-events-none" />

            {/* 상단 로고 */}
            <div className="relative z-10 flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-lg shadow-[#1A9E7A]/40">
                <Compass className="size-4.5" />
              </span>
              <span className="text-xl font-black tracking-tight text-white drop-shadow-sm">WanderMap</span>
            </div>

            {/* 하단 애플 스타일 감성 카피 */}
            <div className="relative z-10 space-y-2">
              <h3 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.25] text-white drop-shadow-md">
                새로운 여행의 시작,<br />
                <span className="text-[#1A9E7A]">WanderMap</span>에 오신 것을 환영해요.
              </h3>
              <p className="text-sm font-medium text-slate-200/90 drop-shadow">
                친구들과 함께 취향을 모으고 최적의 동선을 완성해 보세요.
              </p>
            </div>
          </div>

          {/* 우측: 4개 필드 회원가입 폼 */}
          <div className="relative flex flex-col justify-between py-12 sm:py-16 px-8 sm:px-12 text-[#18181B] bg-white/75">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="absolute top-6 right-6 flex items-center gap-1.5 text-xs text-[#8A8A93] hover:text-[#18181B] transition p-2 rounded-full hover:bg-slate-100/70"
            >
              <span className="text-[11px] font-medium">로그인으로</span>
              <ArrowRight className="size-3.5" />
            </button>

            <div className="space-y-5 my-auto">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#18181B]">회원가입</h2>
                <p className="text-xs text-[#6B6B72]">간단한 정보 입력으로 WanderMap을 시작하세요.</p>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* 1. 닉네임 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-[#6B6B72] uppercase">닉네임</label>
                    {nicknameStatus === "duplicate" ? (
                      <span className="text-[10px] font-bold text-red-500">이미 사용 중인 닉네임입니다</span>
                    ) : nicknameStatus === "available" ? (
                      <span className="text-[10px] font-bold text-[#1A9E7A]">✓ 사용 가능한 닉네임</span>
                    ) : (
                      <span className={`text-[10px] font-semibold ${nickname && !NICKNAME_REGEX.test(nickname) ? "text-red-500" : "text-[#8C8C94]"}`}>
                        2~10자 한글/영문/숫자
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 size-4 text-[#9E9EA4]" />
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="닉네임 입력"
                      maxLength={10}
                      className={`w-full rounded-xl border bg-white/90 pl-10 pr-3.5 py-2.5 text-xs outline-none transition ${
                        nicknameStatus === "duplicate" || (nickname && !NICKNAME_REGEX.test(nickname))
                          ? "border-red-400 focus:border-red-500"
                          : nicknameStatus === "available"
                          ? "border-[#1A9E7A] focus:border-[#1A9E7A]"
                          : "border-[#E2E2DA] focus:border-[#1A9E7A]"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* 2. 이메일 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-[#6B6B72] uppercase">이메일</label>
                    {emailStatus === "duplicate" ? (
                      <span className="text-[10px] font-bold text-red-500">이미 가입된 이메일 주소입니다</span>
                    ) : emailStatus === "available" ? (
                      <span className="text-[10px] font-bold text-[#1A9E7A]">✓ 사용 가능한 이메일</span>
                    ) : email && !EMAIL_REGEX.test(email) ? (
                      <span className="text-[10px] font-semibold text-red-500">
                        올바른 이메일 형식을 입력하세요
                      </span>
                    ) : null}
                  </div>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 size-4 text-[#9E9EA4]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="이메일 입력"
                      className={`w-full rounded-xl border bg-white/90 pl-10 pr-3.5 py-2.5 text-xs outline-none transition ${
                        emailStatus === "duplicate" || (email && !EMAIL_REGEX.test(email))
                          ? "border-red-400 focus:border-red-500"
                          : emailStatus === "available"
                          ? "border-[#1A9E7A] focus:border-[#1A9E7A]"
                          : "border-[#E2E2DA] focus:border-[#1A9E7A]"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* 3. 비밀번호 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-[#6B6B72] uppercase">비밀번호</label>
                    <span className={`text-[10px] font-semibold ${password && !PASSWORD_REGEX.test(password) ? "text-red-500" : "text-[#8C8C94]"}`}>
                      8~20자 영문 + 숫자 조합
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 size-4 text-[#9E9EA4]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호 입력"
                      maxLength={20}
                      className={`w-full rounded-xl border bg-white/90 pl-10 pr-3.5 py-2.5 text-xs outline-none transition ${
                        password && !PASSWORD_REGEX.test(password)
                          ? "border-red-400 focus:border-red-500"
                          : "border-[#E2E2DA] focus:border-[#1A9E7A]"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* 4. 비밀번호 확인 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-[#6B6B72] uppercase">비밀번호 확인</label>
                    {passwordConfirm && (
                      <span className={`text-[10px] font-semibold ${password === passwordConfirm ? "text-[#1A9E7A]" : "text-red-500"}`}>
                        {password === passwordConfirm ? "✓ 비밀번호 일치" : "비밀번호 불일치"}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 size-4 text-[#9E9EA4]" />
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="비밀번호 다시 입력"
                      maxLength={20}
                      className={`w-full rounded-xl border bg-white/90 pl-10 pr-3.5 py-2.5 text-xs outline-none transition ${
                        passwordConfirm && password !== passwordConfirm
                          ? "border-red-400 focus:border-red-500"
                          : "border-[#E2E2DA] focus:border-[#1A9E7A]"
                      }`}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#1A9E7A] py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#158063] transition shadow-md shadow-[#1A9E7A]/20 disabled:opacity-50 mt-1"
                >
                  {isLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      가입 완료하고 시작하기 <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-1">
                <span className="text-xs text-[#6B6B72]">이미 계정이 있으신가요? </span>
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="text-xs font-bold text-[#1A9E7A] hover:underline"
                >
                  로그인하기
                </button>
              </div>
            </div>

            {/* 약관 안내 */}
            <p className="text-center text-[11px] text-[#6B6B72] pt-6 border-t border-[#E2E2DA]/60">
              가입 시 WanderMap의{" "}
              <button
                type="button"
                onClick={() => setModalType("terms")}
                className="underline font-semibold text-[#18181B] hover:text-[#1A9E7A] transition"
              >
                서비스 이용약관
              </button>
              과{" "}
              <button
                type="button"
                onClick={() => setModalType("privacy")}
                className="underline font-semibold text-[#18181B] hover:text-[#1A9E7A] transition"
              >
                개인정보 처리방침
              </button>
              에 동의하게 됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* 약관 모달 다이얼로그 */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-[#E2E2DA] bg-white p-6 sm:p-8 shadow-2xl space-y-4">
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

            <div className="max-h-[60vh] overflow-y-auto text-xs text-[#52525B] leading-relaxed space-y-3 pr-1">
              {modalType === "terms" ? (
                <>
                  <p className="font-semibold text-[#18181B]">제 1 조 (목적)</p>
                  <p>본 약관은 WanderMap(이하 &apos;서비스&apos;)이 제공하는 실시간 여행 동선 조율 및 협업 플랫폼의 이용 조건과 절차에 관한 기본 사항을 규정합니다.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-[#18181B]">1. 수집하는 개인정보 항목</p>
                  <p>WanderMap은 원활한 서비스 제공을 위해 이메일, 닉네임, 비밀번호(암호화)를 수집합니다.</p>
                </>
              )}
            </div>

            <button
              onClick={() => setModalType(null)}
              className="w-full rounded-xl bg-[#1A9E7A] py-2.5 text-xs font-bold text-white hover:bg-[#158063] transition"
            >
              확인 및 닫기
            </button>
          </div>
        </div>
      )}
    </GradientBackground>
  )
}
