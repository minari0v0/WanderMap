"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { authService, UserProfile } from "@/lib/auth-service"
import {
  Compass,
  Home,
  LayoutDashboard,
  User,
  ShieldCheck,
  LogOut,
  Edit2,
  Mail,
  Lock,
  Laptop,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Plane,
  Sparkles,
} from "lucide-react"

export default function MyPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const [activeTab, setActiveTab] = useState<"account" | "notifications">("account")
  
  // 독립적인 로딩 상태 분리 (버튼 간 간섭/깜빡임 방지)
  const [isEmailSending, setIsEmailSending] = useState(false)
  const [isOtpVerifying, setIsOtpVerifying] = useState(false)
  const [isPasswordChanging, setIsPasswordChanging] = useState(false)
  const [isProfileUpdating, setIsProfileUpdating] = useState(false)

  // 부드러운 불투명도(0 -> 100 -> 0) 트랜지션 토스트 상태
  const [toast, setToast] = useState<{ msg: string; visible: boolean } | null>(null)
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 1. 프로필 수정 모달 상태
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [editNickname, setEditNickname] = useState("")
  const [editBio, setEditBio] = useState("")

  // 2. 이메일 인증 발송 & 모달 상태
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [isVerificationSent, setIsVerificationSent] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(300) // 5분 = 300초
  const [resendCooldown, setResendCooldown] = useState(0) // 30초 쿨다운
  const [resendCount, setResendCount] = useState(1) // 최대 5회

  // 6박스 OTP 핀 입력 상태
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([])

  // 3. 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("")

  // 4. 알림 수신 설정
  const [tripVoteNotif, setTripVoteNotif] = useState(true)
  const [tripInviteNotif, setTripInviteNotif] = useState(true)

  // 초기 프로필 로드 (실제 JWT 토큰 검증)
  useEffect(() => {
    const token = authService.getStoredToken()
    if (!token) {
      router.push("/login")
      return
    }

    authService
      .getMyProfile()
      .then((data) => {
        setProfile(data)
        setEditNickname(data.nickname)
        setEditBio(data.bio || "함께하는 즐거운 여행을 계획하고 있습니다 🌴")
      })
      .catch(() => {
        authService.logout()
        router.push("/login")
      })
      .finally(() => {
        setIsInitializing(false)
      })
  }, [router])

  // 5분 만료 타이머
  useEffect(() => {
    let interval: any
    if (isVerificationSent && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isVerificationSent, timerSeconds])

  // 30초 재발송 쿨다운 타이머
  useEffect(() => {
    let cooldownInterval: any
    if (resendCooldown > 0) {
      cooldownInterval = setInterval(() => {
        setResendCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(cooldownInterval)
  }, [resendCooldown])

  const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,20}$/

  // 부드러운 양방향(등장 0->100 & 퇴장 100->0) 불투명도 트랜지션 토스트 함수
  function showToast(msg: string) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    // 1. 먼저 opacity-0 상태로 DOM에 마운트
    setToast({ msg, visible: false })

    // 2. 브라우저 다음 프레임에 opacity-100으로 변경하여 부드러운 슬라이드다운 & 페이드인 트리거
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setToast({ msg, visible: true })
      })
    })

    // 3. 2.5초 후 부드러운 페이드아웃 및 언마운트
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, visible: false } : null))
      setTimeout(() => setToast(null), 350)
    }, 2500)
  }

  // 이메일 인증 발송 핸들러
  const handleSendVerification = async () => {
    if (resendCooldown > 0) {
      showToast(`${resendCooldown}초 후에 재발송할 수 있습니다.`)
      return
    }
    if (resendCount > 5) {
      showToast("인증 메일 재발송 횟수(최대 5회)를 초과했습니다.")
      return
    }

    try {
      setIsEmailSending(true)
      await authService.sendVerificationEmail()
      setIsVerificationSent(true)
      setTimerSeconds(300) // 5분 초기화
      setResendCooldown(30) // 30초 쿨다운 시작
      setResendCount((prev) => prev + 1)
      setIsVerifyModalOpen(true)
      showToast("인증 번호가 전송되었습니다. (터미널 콘솔 로그 확인)")
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || "인증 메일 전송 중 오류가 발생했습니다."
      showToast(msg)
    } finally {
      setIsEmailSending(false)
    }
  }

  // OTP 6박스 붙여넣기(Ctrl+V) & 자동 포커스 이동 핸들러
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text/plain").trim()
    if (/^\d{6}$/.test(pastedData)) {
      const splitDigits = pastedData.split("").slice(0, 6)
      setOtp(splitDigits)
      otpInputsRef.current[5]?.focus()
    }
  }

  // 인증 번호 검증 제출
  const handleVerifySubmit = async () => {
    const fullCode = otp.join("")
    if (fullCode.length !== 6) {
      showToast("6자리 인증 번호를 모두 입력해주세요.")
      return
    }

    try {
      setIsOtpVerifying(true)
      await authService.verifyEmailCode(fullCode)
      setProfile((prev) => (prev ? { ...prev, emailVerified: true } : prev))
      setIsVerifyModalOpen(false)
      setIsVerificationSent(false)
      showToast("이메일 본인 인증이 완료되었습니다! 🌿")
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "인증 코드가 일치하지 않거나 유효시간이 지났습니다."
      showToast(msg)
    } finally {
      setIsOtpVerifying(false)
    }
  }

  // 프로필 수정 제출
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsProfileUpdating(true)
      const updated = await authService.updateProfile({
        nickname: editNickname,
        bio: editBio,
      })
      setProfile(updated)
      setIsEditProfileOpen(false)
      showToast("프로필이 성공적으로 변경되었습니다.")
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || "프로필 변경 중 오류가 발생했습니다."
      showToast(msg)
    } finally {
      setIsProfileUpdating(false)
    }
  }

  // 비밀번호 변경 제출
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      showToast("현재 비밀번호를 입력해주세요.")
      return
    }
    if (newPassword !== newPasswordConfirm) {
      showToast("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.")
      return
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      showToast("새 비밀번호는 8~20자의 영문과 숫자를 조합하여 입력해주세요.")
      return
    }

    try {
      setIsPasswordChanging(true)
      await authService.changePassword({
        currentPassword,
        newPassword,
        newPasswordConfirm,
      })
      setCurrentPassword("")
      setNewPassword("")
      setNewPasswordConfirm("")
      showToast("비밀번호가 성공적으로 변경되었습니다.")
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "현재 비밀번호가 일치하지 않습니다."
      showToast(msg)
    } finally {
      setIsPasswordChanging(false)
    }
  }

  // 소셜 연동 토글
  const handleToggleSocial = async (provider: string) => {
    if (!profile) return
    const isLinked = profile.linkedProviders?.includes(provider)
    try {
      let updated: UserProfile
      if (isLinked) {
        updated = await authService.unlinkSocial(provider)
      } else {
        updated = await authService.linkSocial(provider)
      }
      setProfile(updated)
      showToast(`${provider} 계정 연동 상태가 변경되었습니다.`)
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || "소셜 계정 연동 중 오류가 발생했습니다."
      showToast(msg)
    }
  }

  const handleLogout = () => {
    authService.logout()
    router.push("/")
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  if (isInitializing || !profile) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#1A9E7A] border-t-transparent" />
          <span className="text-xs font-bold text-[#8A8A93]">내 정보를 불러오는 중...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#18181B] font-sans flex flex-col justify-between">
      {/* 상단 네비게이션 헤더 */}
      <header className="border-b border-[#E2E2DA] bg-white px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2.5 text-left group"
          >
            <span className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-sm group-hover:scale-105 transition">
              <Compass className="size-4.5" />
            </span>
            <span className="text-lg font-black tracking-tight text-[#18181B]">WanderMap</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 rounded-xl border border-[#E2E2DA] bg-white px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition text-[#6B6B72]"
            >
              <LayoutDashboard className="size-3.5 text-[#1A9E7A]" /> 내 대시보드
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-xl border border-[#E2E2DA] px-3.5 py-2 text-xs text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"
            >
              <LogOut className="size-3.5" /> 로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 부드러운 불투명도 0 -> 100 -> 0 트랜지션 토스트 (화면 상단 중앙) */}
      {toast && (
        <div
          className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-[#18181B]/95 backdrop-blur-md text-white px-6 py-3.5 text-xs sm:text-sm font-semibold shadow-2xl transition-all duration-300 pointer-events-none flex items-center gap-2 border border-white/10 ${
            toast.visible
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-4 scale-95"
          }`}
        >
          <span>{toast.msg}</span>
        </div>
      )}

      {/* 메인 바디 */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row gap-8">
        {/* 좌측 사이드바: 프로필 카드 + 탭 메뉴 */}
        <aside className="w-full md:w-72 flex flex-col gap-6 shrink-0">
          {/* 프로필 카드 */}
          <div className="relative rounded-3xl bg-white border border-[#EBEAE4] p-6 shadow-sm flex flex-col items-center text-center space-y-3">
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="absolute top-5 right-5 flex items-center gap-1 text-xs font-semibold text-[#6B6B72] hover:text-[#18181B] border border-[#E2E2DA] rounded-lg px-2.5 py-1 bg-white hover:bg-slate-50 transition"
            >
              <Edit2 className="size-3" /> 수정
            </button>

            <div className="relative">
              <img
                src={profile.profileImage}
                alt={profile.nickname}
                className="size-20 rounded-full object-cover border-4 border-[#EDFAF4] shadow-md"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="text-base font-bold text-[#18181B]">{profile.nickname}</h3>
                <span className="text-[10px] font-bold text-[#1A9E7A] bg-[#EDFAF4] px-2 py-0.5 rounded-full">
                  여행 메이트
                </span>
              </div>
              <p className="text-xs text-[#8C8C94]">{profile.email}</p>
            </div>

            <p className="text-xs text-[#6B6B72] leading-relaxed pt-1 break-keep">
              {profile.bio || "함께하는 즐거운 여행을 계획하고 있습니다 🌴"}
            </p>
          </div>

          {/* 탭 네비게이션 */}
          <div className="rounded-3xl bg-white border border-[#EBEAE4] p-3 shadow-sm space-y-1 text-xs font-bold text-[#52525B]">
            <button
              onClick={() => setActiveTab("account")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition ${
                activeTab === "account" ? "bg-[#EDFAF4] text-[#1A9E7A]" : "hover:bg-slate-50 text-[#6B6B72]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <User className="size-4" /> 계정 및 보안
              </span>
              <ChevronRight className="size-4 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab("notifications")}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition ${
                activeTab === "notifications" ? "bg-[#EDFAF4] text-[#1A9E7A]" : "hover:bg-slate-50 text-[#6B6B72]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Mail className="size-4" /> 알림 설정
              </span>
              <ChevronRight className="size-4 opacity-60" />
            </button>
          </div>
        </aside>

        {/* 우측 메인 콘텐츠 영역 */}
        <main className="flex-1 space-y-6">
          {activeTab === "account" ? (
            <>
              {/* 1. 계정 기본 정보 */}
              <div className="rounded-3xl bg-white border border-[#EBEAE4] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#18181B]">계정 기본 정보</h4>
                  {profile.emailVerified ? (
                    <span className="text-xs font-bold text-[#1A9E7A] bg-[#EDFAF4] border border-[#A7F3D0] px-3 py-1 rounded-xl flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> 이메일 인증됨
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-3 py-1 rounded-xl">
                      이메일 미인증
                    </span>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 pt-1">
                  <div className="rounded-2xl bg-[#F8F9FA] p-3.5 border border-[#EBEAE4]">
                    <span className="text-[11px] text-[#8C8C94] block mb-0.5">이메일 주소</span>
                    <span className="text-xs font-bold text-[#18181B]">{profile.email}</span>
                  </div>
                  <div className="rounded-2xl bg-[#F8F9FA] p-3.5 border border-[#EBEAE4]">
                    <span className="text-[11px] text-[#8C8C94] block mb-0.5">닉네임</span>
                    <span className="text-xs font-bold text-[#18181B]">{profile.nickname}</span>
                  </div>
                </div>
              </div>

              {/* 2. 이메일 본인 인증 카드 (미인증 시) */}
              {!profile.emailVerified && (
                <div className="rounded-3xl bg-[#F0FAF7] border border-[#BDEBDC] p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-[#1A9E7A] text-white">
                      <Mail className="size-4" />
                    </span>
                    <h4 className="text-sm font-bold text-[#1A9E7A]">이메일 본인 인증</h4>
                  </div>

                  <p className="text-xs text-[#4A5568] leading-relaxed break-keep">
                    계정 보안 및 여행 초대/동선 투표 참여를 위해 이메일 본인 인증을 완료해주세요.
                    인증 코드는 터미널 콘솔 로그(또는 실제 SMTP 메일)로 전송됩니다.
                  </p>

                  {isVerificationSent ? (
                    <div className="space-y-3 pt-1">
                      <div className="rounded-2xl bg-white p-3 text-center text-xs font-bold text-[#1A9E7A] border border-[#A7F3D0] flex items-center justify-center gap-2">
                        <span>⏱️ 인증 진행 중 (남은 시간: {formatTimer(timerSeconds)})</span>
                      </div>
                      <button
                        onClick={() => setIsVerifyModalOpen(true)}
                        className="w-full rounded-2xl bg-[#1A9E7A] py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-[#158063] transition shadow-md shadow-[#1A9E7A]/20"
                      >
                        6자리 인증 코드 입력하기
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleSendVerification}
                      disabled={isEmailSending}
                      className="w-full rounded-2xl bg-[#1A9E7A] py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-[#158063] transition shadow-md shadow-[#1A9E7A]/20 disabled:opacity-50"
                    >
                      {isEmailSending ? "발송 중..." : "인증 코드 발송하기"}
                    </button>
                  )}
                </div>
              )}

              {/* 3. 소셜 계정 연동 관리 */}
              <div className="rounded-3xl bg-white border border-[#EBEAE4] p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-[#18181B]">소셜 계정 연동 관리</h4>
                  <p className="text-[11px] text-[#8C8C94] mt-0.5">
                    소셜 계정을 연동하면 별도 비밀번호 입력 없이 해당 플랫폼으로 즉시 로그인할 수 있습니다.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {/* 네이버 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-[#EBEAE4] bg-white">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-[#03C75A] text-white text-xs font-black">
                        N
                      </span>
                      <span className="text-xs font-bold text-[#18181B]">네이버 계정</span>
                    </div>
                    <button
                      onClick={() => handleToggleSocial("NAVER")}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition ${
                        profile.linkedProviders?.includes("NAVER")
                          ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]"
                          : "border-[#E2E2DA] bg-white text-[#6B6B72] hover:bg-slate-50"
                      }`}
                    >
                      {profile.linkedProviders?.includes("NAVER") ? "연동됨" : "연동하기"}
                    </button>
                  </div>

                  {/* 카카오 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-[#EBEAE4] bg-white">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-[#FEE500] text-[#191919] text-xs font-black">
                        k
                      </span>
                      <span className="text-xs font-bold text-[#18181B]">카카오 계정</span>
                    </div>
                    <button
                      onClick={() => handleToggleSocial("KAKAO")}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition ${
                        profile.linkedProviders?.includes("KAKAO")
                          ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]"
                          : "border-[#E2E2DA] bg-white text-[#6B6B72] hover:bg-slate-50"
                      }`}
                    >
                      {profile.linkedProviders?.includes("KAKAO") ? "연동됨" : "연동하기"}
                    </button>
                  </div>

                  {/* 구글 */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-[#EBEAE4] bg-white">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-[#4285F4] text-xs font-black border border-slate-200">
                        G
                      </span>
                      <span className="text-xs font-bold text-[#18181B]">구글 계정</span>
                    </div>
                    <button
                      onClick={() => handleToggleSocial("GOOGLE")}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition ${
                        profile.linkedProviders?.includes("GOOGLE")
                          ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]"
                          : "border-[#E2E2DA] bg-white text-[#6B6B72] hover:bg-slate-50"
                      }`}
                    >
                      {profile.linkedProviders?.includes("GOOGLE") ? "연동됨" : "연동하기"}
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. 비밀번호 변경 */}
              <div className="rounded-3xl bg-white border border-[#EBEAE4] p-6 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-[#18181B]">비밀번호 변경</h4>

                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B72] block mb-1">현재 비밀번호</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="현재 비밀번호 입력"
                      className="w-full rounded-xl border border-[#E2E2DA] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#1A9E7A] transition"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#6B6B72] block mb-1">새 비밀번호</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="8자 이상 영문+숫자"
                        className="w-full rounded-xl border border-[#E2E2DA] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#1A9E7A] transition"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#6B6B72] block mb-1">새 비밀번호 확인</label>
                      <input
                        type="password"
                        value={newPasswordConfirm}
                        onChange={(e) => setNewPasswordConfirm(e.target.value)}
                        placeholder="새 비밀번호 다시 입력"
                        className="w-full rounded-xl border border-[#E2E2DA] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#1A9E7A] transition"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isPasswordChanging || !newPassword}
                      className="rounded-xl bg-[#1A9E7A] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#158063] transition disabled:opacity-40"
                    >
                      {isPasswordChanging ? "변경 중..." : "비밀번호 변경하기"}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            /* 알림 설정 탭 */
            <div className="rounded-3xl bg-white border border-[#EBEAE4] p-6 shadow-sm space-y-6">
              <h4 className="text-sm font-bold text-[#18181B]">여행 알림 설정</h4>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-2xl border border-[#EBEAE4]">
                  <div>
                    <h5 className="text-xs font-bold text-[#18181B]">실시간 동선 투표 알림</h5>
                    <p className="text-[11px] text-[#8C8C94]">메이트가 새로운 장소 투표를 올렸을 때 알림 수신</p>
                  </div>
                  <button
                    onClick={() => setTripVoteNotif(!tripVoteNotif)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      tripVoteNotif ? "bg-[#1A9E7A]" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white size-4 rounded-full shadow-md transform transition duration-300 ${
                        tripVoteNotif ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl border border-[#EBEAE4]">
                  <div>
                    <h5 className="text-xs font-bold text-[#18181B]">새로운 여행 방 초대 알림</h5>
                    <p className="text-[11px] text-[#8C8C94]">초대 코드로 여행 그룹에 초대되었을 때 알림 수신</p>
                  </div>
                  <button
                    onClick={() => setTripInviteNotif(!tripInviteNotif)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                      tripInviteNotif ? "bg-[#1A9E7A]" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white size-4 rounded-full shadow-md transform transition duration-300 ${
                        tripInviteNotif ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 1. 프로필 수정 모달 */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#EBEAE4] pb-3">
              <h3 className="text-sm font-bold text-[#18181B]">프로필 정보 수정</h3>
              <button onClick={() => setIsEditProfileOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#6B6B72] block mb-1">닉네임</label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E2DA] px-3.5 py-2.5 outline-none focus:border-[#1A9E7A] transition"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#6B6B72] block mb-1">한 줄 소개</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[#E2E2DA] px-3.5 py-2.5 outline-none focus:border-[#1A9E7A] transition resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="rounded-xl border border-[#E2E2DA] px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isProfileUpdating}
                  className="rounded-xl bg-[#1A9E7A] px-5 py-2 text-xs font-bold text-white hover:bg-[#158063] transition disabled:opacity-50"
                >
                  {isProfileUpdating ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. 6박스 스마트 OTP 이메일 인증 모달 */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="flex justify-end">
              <button onClick={() => setIsVerifyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="size-4" />
              </button>
            </div>

            <div className="size-12 rounded-2xl bg-[#EDFAF4] text-[#1A9E7A] flex items-center justify-center mx-auto">
              <Mail className="size-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#18181B]">이메일 본인 인증</h3>
              <p className="text-xs text-[#6B6B72]">
                <strong className="text-[#18181B]">{profile.email}</strong> 으로 전송된 6자리 번호를 입력해주세요.
              </p>
            </div>

            {/* 6박스 OTP 핀 입력 */}
            <div className="flex justify-center gap-2 py-2" onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputsRef.current[idx] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="size-11 rounded-xl border border-[#E2E2DA] text-center text-lg font-bold text-[#18181B] outline-none focus:border-[#1A9E7A] focus:ring-2 focus:ring-[#1A9E7A]/20 transition"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-[#8C8C94] px-1">
              <span>남은 시간: <strong className="text-[#1A9E7A]">{formatTimer(timerSeconds)}</strong></span>
              <button
                onClick={handleSendVerification}
                disabled={resendCooldown > 0 || isEmailSending}
                className="text-[#1A9E7A] hover:underline font-semibold disabled:opacity-40"
              >
                {resendCooldown > 0 ? `${resendCooldown}초 후 재발송` : "인증번호 재발송"}
              </button>
            </div>

            <button
              onClick={handleVerifySubmit}
              disabled={isOtpVerifying || otp.join("").length < 6}
              className="w-full rounded-2xl bg-[#1A9E7A] py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-[#158063] transition shadow-md shadow-[#1A9E7A]/20 disabled:opacity-50"
            >
              {isOtpVerifying ? "인증 중..." : "인증 완료"}
            </button>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="w-full border-t border-[#E2E2DA] bg-white py-4 text-center text-xs text-[#8C8C94]">
        © 2026 WanderMap. All rights reserved.
      </footer>
    </div>
  )
}
