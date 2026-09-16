"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { authService, UserProfile } from "@/lib/auth-service"
import {
  Compass,
  Home,
  Search,
  Bookmark,
  Hash,
  LayoutDashboard,
  Settings,
  User,
  FileText,
  ShieldCheck,
  LogOut,
  Edit2,
  Mail,
  Lock,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react"

export default function MyPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const [activeTab, setActiveTab] = useState<"account" | "appSettings">("account")
  const [isLoading, setIsLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

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

  // 4. 어플리케이션 설정 상태 (스크린샷 1)
  const [selectedFolder, setSelectedFolder] = useState("기본 저장소")
  const [selectedTheme, setSelectedTheme] = useState("기본 테마")
  const [themeNotif, setThemeNotif] = useState(true)
  const [plannerNotif, setPlannerNotif] = useState(true)

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
        setEditBio(data.bio || "나만의 특별한 무드를 담은 취향 저장소를 만들고 있습니다.")
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

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
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
      setIsLoading(true)
      await authService.sendVerificationEmail()
      setIsVerificationSent(true)
      setTimerSeconds(300) // 5분 초기화
      setResendCooldown(30) // 30초 쿨다운 시작
      setResendCount((prev) => prev + 1)
      setIsVerifyModalOpen(true)
      showToast("인증 번호가 이메일로 전송되었습니다. (5분 유효)")
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || "인증 메일 전송 중 오류가 발생했습니다."
      showToast(msg)
    } finally {
      setIsLoading(false)
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
      setIsLoading(true)
      await authService.verifyEmailCode(fullCode)
      setProfile((prev) => (prev ? { ...prev, emailVerified: true } : prev))
      setIsVerifyModalOpen(false)
      setIsVerificationSent(false)
      showToast("이메일 본인 인증이 성공적으로 완료되었습니다! 🍊")
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "인증 코드가 일치하지 않거나 유효시간이 지났습니다."
      showToast(msg)
    } finally {
      setIsLoading(false)
    }
  }

  // 프로필 수정 제출
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
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
      setIsLoading(false)
    }
  }

  // 비밀번호 변경 제출
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== newPasswordConfirm) {
      showToast("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.")
      return
    }
    if (newPassword.length < 6) {
      showToast("새 비밀번호는 최소 6자 이상이어야 합니다.")
      return
    }

    try {
      setIsLoading(true)
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
      setIsLoading(false)
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
    router.push("/login")
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
      {/* 토스트 알림 */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl bg-slate-900 text-white px-5 py-3 text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          {toastMsg}
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        {/* 1. 최좌측 글로벌 사이드바 (스크린샷 2) */}
        <aside className="hidden xl:flex w-56 flex-col justify-between py-2 shrink-0">
          <div className="space-y-6">
            <div className="flex items-center gap-2.5 px-2">
              <span className="flex size-8 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#FF5A36] text-white font-black text-sm">
                P
              </span>
              <span className="text-lg font-black tracking-tight text-[#18181B]">PickPl</span>
            </div>

            <nav className="space-y-1 text-xs font-bold text-[#52525B]">
              <button
                onClick={() => router.push("/")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white transition text-left"
              >
                <Home className="size-4 text-[#8C8C94]" /> 홈 · 발견
              </button>
              <button
                onClick={() => router.push("/trips/view/999")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white transition text-left"
              >
                <Search className="size-4 text-[#8C8C94]" /> 공간 탐색
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white transition text-left"
              >
                <Bookmark className="size-4 text-[#8C8C94]" /> 내 컬렉션
              </button>
            </nav>

            <div className="pt-2">
              <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider px-3 block mb-2">
                빠른 태그 검색
              </span>
              <div className="space-y-0.5 text-xs text-[#6B6B72]">
                {["#햇살맛집", "#코지한", "#디저트맛집", "#대형카페"].map((tag) => (
                  <button
                    key={tag}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white font-medium transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3 border border-[#EBEAE4] shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={profile.profileImage}
                alt={profile.nickname}
                className="size-8 rounded-full object-cover border border-slate-200"
              />
              <div>
                <h5 className="text-xs font-bold text-[#18181B]">{profile.nickname}</h5>
                <p className="text-[10px] text-[#8C8C94]">마이페이지</p>
              </div>
            </div>
            <button
              onClick={() => {
                authService.logout()
                router.push("/login")
              }}
              className="text-[11px] text-[#A1A1AA] hover:text-red-500 font-semibold transition"
            >
              로그아웃
            </button>
          </div>
        </aside>

        {/* 2. 중앙 레이아웃: 프로필 사이드바 + 메인 카드 영역 */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6">
          {/* 중앙 좌측: 프로필 카드 및 메뉴 탭 */}
          <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
            <h1 className="text-2xl font-black tracking-tight text-[#18181B] px-1">마이페이지</h1>

            {/* 프로필 서머리 카드 */}
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
                  className="size-24 rounded-full object-cover border-4 border-[#FFF5F0] shadow-md"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="text-lg font-bold text-[#18181B]">{profile.nickname}</h3>
                  <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                    취향 탐험가
                  </span>
                </div>
                <p className="text-xs text-[#8C8C94]">{profile.email}</p>
              </div>

              <p className="text-xs text-[#6B6B72] leading-relaxed pt-1 break-keep">{profile.bio}</p>
            </div>

            {/* 네비게이션 메뉴 탭 */}
            <div className="rounded-3xl bg-white border border-[#EBEAE4] p-4 shadow-sm space-y-1 text-xs font-bold text-[#52525B]">
              <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-wider px-3 py-1.5 block">
                계정 설정 및 정보
              </span>

              <button
                onClick={() => router.push("/dashboard")}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50 transition"
              >
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard className="size-4 text-[#8C8C94]" /> 내 대시보드
                </span>
                <ChevronRight className="size-4 text-[#C4C4CC]" />
              </button>

              <button
                onClick={() => setActiveTab("appSettings")}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition ${
                  activeTab === "appSettings" ? "bg-[#F4F4F5] text-[#18181B]" : "hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Settings className="size-4 text-[#8C8C94]" /> 픽플 설정
                </span>
                <ChevronRight className="size-4 text-[#C4C4CC]" />
              </button>

              <button
                onClick={() => setActiveTab("account")}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition ${
                  activeTab === "account" ? "bg-[#F4F4F5] text-[#18181B]" : "hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <User className="size-4 text-[#8C8C94]" /> 계정 설정
                </span>
                <ChevronRight className="size-4 text-[#C4C4CC]" />
              </button>

              <div className="pt-2 border-t border-[#EBEAE4] space-y-1">
                <button
                  onClick={() => window.open("/terms", "_blank")}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition text-xs font-medium text-[#6B6B72]"
                >
                  <span className="flex items-center gap-2.5">
                    <FileText className="size-4 text-[#8C8C94]" /> 서비스 이용약관
                  </span>
                  <span className="text-xs text-[#A1A1AA]">↗</span>
                </button>

                <button
                  onClick={() => window.open("/privacy", "_blank")}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition text-xs font-medium text-[#6B6B72]"
                >
                  <span className="flex items-center gap-2.5">
                    <ShieldCheck className="size-4 text-[#8C8C94]" /> 개인정보 처리방침
                  </span>
                  <span className="text-xs text-[#A1A1AA]">↗</span>
                </button>
              </div>

              <button
                onClick={() => {
                  authService.logout()
                  router.push("/login")
                }}
                className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl hover:bg-red-50 transition text-xs font-bold text-red-500 pt-3"
              >
                <LogOut className="size-4" /> 로그아웃
              </button>
            </div>
          </div>

          {/* 중앙 우측: 설정 콘텐츠 카드들 */}
          <div className="flex-1 space-y-6 pt-0 lg:pt-9">
            {activeTab === "account" ? (
              <>
                {/* 탭 헤더 */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-md">
                    프로필 및 보안 설정
                  </span>
                  <h2 className="text-xl font-black tracking-tight text-[#18181B]">계정 설정</h2>
                </div>

                {/* 1. 계정 기본 정보 카드 */}
                <div className="rounded-3xl bg-white border border-[#EBEAE4] p-6 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-[#18181B]">계정 기본 정보</h4>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[11px] text-[#8C8C94] block">이메일 주소</span>
                      <span className="text-sm font-bold text-[#18181B]">{profile.email}</span>
                    </div>
                    {profile.emailVerified ? (
                      <span className="text-xs font-bold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> 이메일 인증됨
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] px-3 py-1.5 rounded-xl">
                        이메일 미인증
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. 이메일 본인 인증 카드 (미인증 시 또는 발송 중 시 노출) */}
                {!profile.emailVerified && (
                  <div className="rounded-3xl bg-[#FFF8F5] border border-[#FFD9CC] p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">✉️</span>
                      <h4 className="text-sm font-bold text-[#FF5A36]">이메일 본인 인증</h4>
                    </div>

                    <p className="text-xs text-[#6B6B72] leading-relaxed break-keep">
                      현재 계정은 이메일 인증이 완료되지 않았습니다. 인증을 완료하시면 프로필 설정 수정 권한이
                      부여되며 소셜 다중 통합 계정을 안전하게 연동하실 수 있습니다.
                    </p>

                    {isVerificationSent ? (
                      /* 발송 진행 중 카드 (스크린샷 4) */
                      <div className="space-y-3 pt-1">
                        <div className="rounded-2xl bg-[#FFF0EB] p-3 text-center text-xs font-bold text-[#FF5A36] flex items-center justify-center gap-2">
                          <span>⏱️ 인증 진행 중 (남은 시간: {formatTimer(timerSeconds)})</span>
                        </div>
                        <button
                          onClick={() => setIsVerifyModalOpen(true)}
                          className="w-full rounded-2xl bg-[#18181B] py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 transition shadow-sm"
                        >
                          인증 코드 입력하기
                        </button>
                      </div>
                    ) : (
                      /* 최초 인증하기 버튼 (스크린샷 2) */
                      <button
                        onClick={handleSendVerification}
                        disabled={isLoading}
                        className="w-full rounded-2xl bg-[#FF5A36] py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-[#E04B2B] transition shadow-md shadow-[#FF5A36]/20 disabled:opacity-50"
                      >
                        {isLoading ? "발송 중..." : "이메일 인증하기"}
                      </button>
                    )}
                  </div>
                )}

                {/* 3. 소셜 계정 연동 관리 카드 */}
                <div className="rounded-3xl bg-white border border-[#EBEAE4] p-6 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-[#18181B]">소셜 계정 연동 관리</h4>
                    <p className="text-[11px] text-[#8C8C94] mt-0.5">
                      일반 이메일 계정으로 로그인한 경우, 소셜 계정들을 연동하여 다음 로그인 시 해당 소셜 로그인으로 바로
                      접속하실 수 있습니다.
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

                {/* 4. 비밀번호 변경 카드 */}
                <div className="rounded-3xl bg-white border border-[#EBEAE4] p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-[#18181B]">비밀번호 변경</h4>

                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#6B6B72] block mb-1">현재 비밀번호</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="현재 비밀번호 입력"
                        className="w-full rounded-xl border border-[#E2E2DA] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#FF5A36] transition"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-[#6B6B72] block mb-1">새 비밀번호</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="새 비밀번호 입력"
                          className="w-full rounded-xl border border-[#E2E2DA] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#FF5A36] transition"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-[#6B6B72] block mb-1">새 비밀번호 확인</label>
                        <input
                          type="password"
                          value={newPasswordConfirm}
                          onChange={(e) => setNewPasswordConfirm(e.target.value)}
                          placeholder="새 비밀번호 다시 입력"
                          className="w-full rounded-xl border border-[#E2E2DA] bg-white px-3.5 py-2.5 text-xs outline-none focus:border-[#FF5A36] transition"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={isLoading || !newPassword}
                        className="rounded-xl bg-[#18181B] px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition disabled:opacity-40"
                      >
                        비밀번호 변경하기
                      </button>
                    </div>
                  </form>
                </div>

                {/* 5. 로그인 기록 카드 (스크린샷 3) */}
                <div className="space-y-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-[#18181B]">로그인 기록</h4>
                    <p className="text-[11px] text-[#8C8C94]">현재 로그인되어 있는 기기 및 세션 정보입니다.</p>
                  </div>

                  <div className="space-y-2.5">
                    {/* 세션 1: Safari mac */}
                    <div className="rounded-2xl bg-white border border-[#EBEAE4] p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-[#F4F4F5] text-[#6B6B72]">
                          <Laptop className="size-5" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#18181B]">Seoul</span>
                          </div>
                          <p className="text-[11px] text-[#8C8C94]">14분 전 • Safari • macOS</p>
                        </div>
                      </div>
                      <button
                        onClick={() => showToast("해당 원격 세션이 로그아웃되었습니다.")}
                        className="text-xs font-bold text-[#FF5A36] bg-[#FFF5F0] hover:bg-[#FFEAE0] border border-[#FFD9CC] rounded-xl px-3.5 py-1.5 transition flex items-center gap-1"
                      >
                        <LogOut className="size-3.5" /> 로그아웃
                      </button>
                    </div>

                    {/* 세션 2: 현재 기기 Chrome Windows */}
                    <div className="rounded-2xl bg-white border border-[#EBEAE4] p-4 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-[#F4F4F5] text-[#6B6B72]">
                          <Laptop className="size-5" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#18181B]">Seoul</span>
                            <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                              현재 기기
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8C8C94]">13분 전 • Chrome • Windows</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* 픽플 어플리케이션 설정 탭 (스크린샷 1) */
              <>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-md">
                    어플리케이션 설정
                  </span>
                  <h2 className="text-xl font-black tracking-tight text-[#18181B]">픽플 설정</h2>
                </div>

                <div className="rounded-3xl bg-white border border-[#EBEAE4] p-6 shadow-sm space-y-6">
                  {/* 기본 스크랩 폴더 설정 */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#18181B]">기본 스크랩 폴더 설정</label>
                    <select
                      value={selectedFolder}
                      onChange={(e) => setSelectedFolder(e.target.value)}
                      className="w-full rounded-2xl border border-[#E2E2DA] bg-[#FAFAFA] px-4 py-3 text-xs font-semibold text-[#18181B] outline-none"
                    >
                      <option value="기본 저장소">기본 저장소</option>
                      <option value="제주도 여행 폴더">제주도 여행 폴더</option>
                      <option value="맛집 모음집">맛집 모음집</option>
                    </select>
                  </div>

                  {/* 픽플 어플리케이션 테마 */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-[#18181B]">픽플 어플리케이션 테마</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { name: "기본 테마", dot: "bg-orange-500" },
                        { name: "차분한 샌드", dot: "bg-amber-200" },
                        { name: "세이지 그린", dot: "bg-emerald-300" },
                        { name: "웜 코랄", dot: "bg-rose-300" },
                      ].map((th) => (
                        <button
                          key={th.name}
                          onClick={() => setSelectedTheme(th.name)}
                          className={`flex items-center justify-center gap-2 rounded-2xl border py-3 px-3 text-xs font-bold transition ${
                            selectedTheme === th.name
                              ? "border-[#FF5A36] text-[#FF5A36] bg-[#FFF5F0]"
                              : "border-[#E2E2DA] text-[#6B6B72] hover:bg-slate-50"
                          }`}
                        >
                          <span className={`size-2.5 rounded-full ${th.dot}`} />
                          {th.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 알림 수신 설정 */}
                  <div className="space-y-4 pt-2 border-t border-[#EBEAE4]">
                    <span className="text-[11px] font-bold text-[#8C8C94] uppercase tracking-wider block">
                      알림 수신 설정
                    </span>

                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-[#18181B]">새로운 추천 테마 알림</h5>
                        <p className="text-[11px] text-[#8C8C94]">날씨, 계절 및 감성 공간 추천 푸시 알림 수신</p>
                      </div>
                      <button
                        onClick={() => setThemeNotif(!themeNotif)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                          themeNotif ? "bg-[#FF5A36]" : "bg-slate-300"
                        }`}
                      >
                        <div
                          className={`bg-white size-4 rounded-full shadow-md transform transition duration-300 ${
                            themeNotif ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-[#18181B]">공동 플래너 활동 알림</h5>
                        <p className="text-[11px] text-[#8C8C94]">친구와 공유 중인 플래너 실시간 변동 알림 수신</p>
                      </div>
                      <button
                        onClick={() => setPlannerNotif(!plannerNotif)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                          plannerNotif ? "bg-[#FF5A36]" : "bg-slate-300"
                        }`}
                      >
                        <div
                          className={`bg-white size-4 rounded-full shadow-md transform transition duration-300 ${
                            plannerNotif ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 🍊 스마트 6자리 OTP 인증 번호 입력 모달 (스크린샷 5) */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-[#E2E2DA] bg-white p-7 sm:p-8 shadow-2xl space-y-6 text-center">
            <button
              onClick={() => setIsVerifyModalOpen(false)}
              className="absolute top-5 right-5 flex size-8 items-center justify-center rounded-full hover:bg-slate-100 transition text-[#8C8C94]"
            >
              <X className="size-4" />
            </button>

            {/* 오렌지 심볼 */}
            <div className="text-4xl pt-1">🍊</div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold text-[#18181B] tracking-tight">인증 번호 입력</h3>
              <p className="text-xs text-[#6B6B72] leading-relaxed break-keep">
                가입하신 이메일(<span className="font-bold text-[#18181B]">{profile.email}</span>)로 인증번호가
                발송되었습니다. 아래에 6자리 코드를 입력해주세요.
              </p>
            </div>

            {/* OTP 라벨 & 5분 타이머 뱃지 */}
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-[#18181B]">
                <span>인증 번호 입력</span>
                <span className="text-[#FF5A36] bg-[#FFF0EB] px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  ⏱️ {formatTimer(timerSeconds)}
                </span>
              </div>

              {/* 6개의 스마트 OTP 입력 박스 (복사-붙여넣기 완벽 지원) */}
              <div className="grid grid-cols-6 gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputsRef.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="size-12 sm:size-13 text-center text-xl font-extrabold text-[#18181B] rounded-2xl border-2 border-[#E2E2DA] bg-[#FAFAFA] focus:border-[#FF5A36] focus:bg-white focus:outline-none transition"
                  />
                ))}
              </div>
            </div>

            {/* 인증 완료 액션 버튼 */}
            <button
              onClick={handleVerifySubmit}
              disabled={isLoading || otp.join("").length !== 6}
              className="w-full rounded-2xl bg-[#6B7280] py-3.5 text-sm font-bold text-white hover:bg-[#4B5563] transition shadow-md disabled:opacity-40"
            >
              {isLoading ? "확인 중..." : "인증 완료"}
            </button>

            {/* 하단 재발송 안내 (30초 쿨다운 & 최대 5회) */}
            <div className="pt-2 text-center text-xs text-[#8C8C94] space-y-1">
              <p>이메일을 받지 못하셨나요?</p>
              <button
                onClick={handleSendVerification}
                disabled={resendCooldown > 0 || resendCount > 5}
                className="font-bold text-[#FF5A36] hover:underline disabled:opacity-40"
              >
                {resendCooldown > 0
                  ? `인증번호 다시 보내기 (${resendCooldown}초)`
                  : resendCount > 5
                  ? "재발송 횟수 초과"
                  : "인증번호 다시 보내기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프로필 수정 모달 */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-[#E2E2DA] bg-white p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBEAE4] pb-3">
              <h3 className="text-base font-bold text-[#18181B]">프로필 정보 수정</h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="flex size-8 items-center justify-center rounded-full hover:bg-slate-100 transition text-[#8C8C94]"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#6B6B72] block mb-1">닉네임</label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E2DA] px-3.5 py-2.5 text-xs outline-none focus:border-[#FF5A36] transition"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#6B6B72] block mb-1">한 줄 소개</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[#E2E2DA] px-3.5 py-2 text-xs outline-none focus:border-[#FF5A36] transition resize-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="flex-1 rounded-xl border border-[#E2E2DA] py-2.5 text-xs font-bold text-[#6B6B72] hover:bg-slate-50 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-xl bg-[#18181B] py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
