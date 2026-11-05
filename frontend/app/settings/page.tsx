"use client"

import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Compass,
  ArrowLeft,
  X,
  User as UserIcon,
  Settings,
  FileText,
  ShieldCheck,
  LogOut,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Mail,
  Lock,
  Laptop,
  Smartphone,
  Tablet,
  Bell,
  ChevronRight,
  Clock,
  Columns2,
  BookOpen,
  Car,
  TrainFront,
  Footprints,
  Ruler,
  Map,
} from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import { ProfileEditModal } from "@/components/modals/profile-edit-modal"
import { MyJourneysView } from "@/components/trips/my-journeys-view"
import { authService, type UserResponse } from "@/lib/auth-service"
import { tripService, type TripResponse } from "@/lib/trip-service"
import { showToast, showConfirm } from "@/components/ui/system-alert"

interface SessionDeviceInfo {
  deviceType: "PC" | "TABLET" | "MOBILE"
  osName: string
  browserName: string
  regionLabel: string
}

function detectSessionDevice(): SessionDeviceInfo {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      deviceType: "PC",
      osName: "Desktop OS",
      browserName: "웹 브라우저",
      regionLabel: "대한민국",
    }
  }

  const ua = navigator.userAgent || ""
  const isIPad =
    /iPad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const isTablet =
    isIPad ||
    /Tablet|PlayBook|Silk/i.test(ua) ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua))
  const isMobile =
    !isTablet && /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua)

  const deviceType: "PC" | "TABLET" | "MOBILE" = isTablet
    ? "TABLET"
    : isMobile
    ? "MOBILE"
    : "PC"

  let osName = "운영체제"
  if (isIPad) osName = "iPadOS"
  else if (/iPhone|iPod/i.test(ua)) osName = "iOS (iPhone)"
  else if (/Android/i.test(ua)) osName = isTablet ? "Android 태블릿" : "Android"
  else if (/Windows/i.test(ua)) osName = "Windows PC"
  else if (/Mac OS X|Macintosh/i.test(ua)) osName = "macOS"
  else if (/Linux/i.test(ua)) osName = "Linux"

  let browserName = "브라우저"
  if (/Edg\//i.test(ua)) browserName = "Edge 브라우저"
  else if (/OPR\/|Opera/i.test(ua)) browserName = "Opera 브라우저"
  else if (/Whale\//i.test(ua)) browserName = "Whale 브라우저"
  else if (/Chrome\//i.test(ua)) browserName = "Chrome 브라우저"
  else if (/Firefox\//i.test(ua)) browserName = "Firefox 브라우저"
  else if (/Safari\//i.test(ua)) browserName = "Safari 브라우저"

  let regionLabel = "대한민국"
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz && !tz.includes("Seoul")) {
      regionLabel = `대한민국 (${tz})`
    }
  } catch {}

  return { deviceType, osName, browserName, regionLabel }
}

export interface WanderMapAppSettings {
  defaultMapMode: "SPLIT" | "DIARY_FOCUS"
  defaultTransportMode: "TRANSIT" | "CAR" | "WALK"
  aiSchedulePace: "RELAXED" | "PACKED"
  distanceUnit: "KM" | "MILE"
  voteNotification: boolean
  inviteNotification: boolean
  diaryReminderNotification: boolean
}

const DEFAULT_APP_SETTINGS: WanderMapAppSettings = {
  defaultMapMode: "SPLIT",
  defaultTransportMode: "TRANSIT",
  aiSchedulePace: "RELAXED",
  distanceUnit: "KM",
  voteNotification: true,
  inviteNotification: true,
  diaryReminderNotification: true,
}

export default function SettingsPage() {
  const router = useRouter()

  const [user, setUser] = useState<UserResponse | null>(() => authService.getSession())
  const [trips, setTrips] = useState<TripResponse[]>([])
  const [isInitializing, setIsInitializing] = useState(true)
  const [deviceInfo, setDeviceInfo] = useState<SessionDeviceInfo>({
    deviceType: "PC",
    osName: "Windows PC",
    browserName: "Chrome 브라우저",
    regionLabel: "대한민국",
  })

  // 좌측 탭 상태: 'account' (계정 설정) | 'general' (원더맵 설정) | 'journeys' (내 여정)
  const [activeTab, setActiveTab] = useState<"account" | "general" | "journeys">("account")

  // 프로필 설정 모달 상태
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  // 약관/개인정보 모달 상태
  const [termsModalType, setTermsModalType] = useState<"terms" | "privacy" | null>(null)

  // =========================================================================
  // 1. 이메일 인증 (2단계 인증 스타일 6자리 개별 박스 모달 + Ctrl+A 일괄 선택/삭제)
  // =========================================================================
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [isVerificationSent, setIsVerificationSent] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [isAllOtpSelected, setIsAllOtpSelected] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(300) // 5분 (300초)
  const [resendCooldown, setResendCooldown] = useState(0) // 30초 쿨다운
  const [devIssuedCode, setDevIssuedCode] = useState<string | null>(null)
  const [showHelpHint, setShowHelpHint] = useState(false)
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // =========================================================================
  // 2. 비밀번호 변경 폼 상태
  // =========================================================================
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // =========================================================================
  // 3. 원더맵 플래너 환경 설정 상태 (클릭 즉시 자동 저장)
  // =========================================================================
  const [appSettings, setAppSettings] = useState<WanderMapAppSettings>(DEFAULT_APP_SETTINGS)

  // 초기 세션, 기기 정보, 서버 최신 프로필 로드
  useEffect(() => {
    setDeviceInfo(detectSessionDevice())

    const session = authService.getSession()
    if (!session) {
      router.push("/login")
      return
    }
    setUser(session)

    try {
      const savedSettings = localStorage.getItem("wandermap_app_settings")
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setAppSettings((prev) => ({ ...prev, ...parsed }))
      }
    } catch {}

    Promise.allSettled([
      authService.getMe(session.id),
      tripService.getMyTrips(session.id),
    ]).then(([userRes, tripsRes]) => {
      if (userRes.status === "fulfilled" && userRes.value) {
        setUser(userRes.value)
        authService.setSession(userRes.value)
      }
      if (tripsRes.status === "fulfilled" && Array.isArray(tripsRes.value)) {
        setTrips(tripsRes.value)
      }
      setIsInitializing(false)
    })
  }, [router])

  // 전역 유저 업데이트 이벤트 수신
  useEffect(() => {
    function handleUserUpdated(e: Event) {
      const customEvent = e as CustomEvent<UserResponse | null>
      if (customEvent.detail) {
        setUser(customEvent.detail)
      }
    }
    window.addEventListener("wandermap:user-updated", handleUserUpdated)
    return () => window.removeEventListener("wandermap:user-updated", handleUserUpdated)
  }, [])

  // ESC 키로 모달 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isVerifyModalOpen) setIsVerifyModalOpen(false)
        if (termsModalType) setTermsModalType(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVerifyModalOpen, termsModalType])

  // 5분 유효시간 카운트다운 타이머
  useEffect(() => {
    if (!isVerificationSent || timerSeconds <= 0) return
    const timer = setInterval(() => {
      setTimerSeconds((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [isVerificationSent, timerSeconds])

  // 30초 재전송 쿨다운 타이머
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // 모달이 열릴 때 첫 번째 빈 입력칸 자동 포커스
  useEffect(() => {
    if (isVerifyModalOpen) {
      setIsAllOtpSelected(false)
      setTimeout(() => {
        const firstEmptyIdx = otpDigits.findIndex((d) => !d)
        const targetIdx = firstEmptyIdx === -1 ? 0 : firstEmptyIdx
        otpInputRefs.current[targetIdx]?.focus()
      }, 80)
    }
  }, [isVerifyModalOpen])

  // 환경 설정 변경 시 즉시 자동 저장
  const updateAppSetting = <K extends keyof WanderMapAppSettings>(
    key: K,
    value: WanderMapAppSettings[K]
  ) => {
    setAppSettings((prev) => {
      if (prev[key] === value) return prev
      const updated = { ...prev, [key]: value }
      try {
        localStorage.setItem("wandermap_app_settings", JSON.stringify(updated))
      } catch {}
      showToast("원더맵 설정이 자동 저장되었습니다.", "success")
      return updated
    })
  }

  // 프로필 설정 모달 오픈 핸들러 (이메일 미인증 시 차단)
  const handleOpenProfileEdit = () => {
    if (user && user.provider === "LOCAL" && !user.emailVerified) {
      showToast("프로필 설정을 변경하려면 먼저 이메일 인증을 완료해 주세요.", "warning")
      setActiveTab("account")
      return
    }
    setIsProfileModalOpen(true)
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // 이메일 인증 코드 발송 / 재전송
  const handleSendVerificationCode = async () => {
    if (!user) return
    if (resendCooldown > 0) {
      showToast(`${resendCooldown}초 후에 코드를 다시 전송할 수 있습니다.`, "info")
      return
    }

    setIsSendingCode(true)
    try {
      const res = await authService.requestEmailVerification(user.id, user.email)
      setIsVerificationSent(true)
      setTimerSeconds(300)
      setResendCooldown(30)
      setOtpDigits(["", "", "", "", "", ""])
      setIsAllOtpSelected(false)
      if (res.devCode) {
        setDevIssuedCode(res.devCode)
      }
      setIsVerifyModalOpen(true)
      showToast(`${user.email}(으)로 6자리 인증 코드가 전송되었습니다.`, "success")
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "인증 코드 발송 중 문제가 발생했습니다."
      showToast(msg, "error")
    } finally {
      setIsSendingCode(false)
    }
  }

  // 6자리 개별 입력박스 핸들러
  const handleOtpDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "")

    // Ctrl+A 전체 선택 상태에서 숫자를 입력한 경우 전체 초기화 후 첫 칸부터 입력
    if (isAllOtpSelected) {
      setIsAllOtpSelected(false)
      const next = ["", "", "", "", "", ""]
      if (cleaned) {
        cleaned
          .slice(0, 6)
          .split("")
          .forEach((ch, idx) => {
            next[idx] = ch
          })
        setOtpDigits(next)
        const nextFocus = Math.min(cleaned.length, 5)
        otpInputRefs.current[nextFocus]?.focus()
      } else {
        setOtpDigits(next)
        otpInputRefs.current[0]?.focus()
      }
      return
    }

    if (!cleaned) {
      const next = [...otpDigits]
      next[index] = ""
      setOtpDigits(next)
      return
    }

    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 6).split("")
      const next = [...otpDigits]
      chars.forEach((ch, idx) => {
        if (index + idx < 6) next[index + idx] = ch
      })
      setOtpDigits(next)
      const focusIdx = Math.min(index + chars.length, 5)
      otpInputRefs.current[focusIdx]?.focus()
      return
    }

    const next = [...otpDigits]
    next[index] = cleaned.slice(-1)
    setOtpDigits(next)

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // 1. Ctrl+A / Cmd+A: 6칸 전체 선택 토글
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault()
      setIsAllOtpSelected(true)
      return
    }

    // 2. Backspace 또는 Delete 처리 (Ctrl+A 전체 선택 상태에서는 6칸 한 번에 삭제!)
    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault()
      if (isAllOtpSelected || e.ctrlKey || e.metaKey) {
        setOtpDigits(["", "", "", "", "", ""])
        setIsAllOtpSelected(false)
        otpInputRefs.current[0]?.focus()
        return
      }

      if (otpDigits[index]) {
        const next = [...otpDigits]
        next[index] = ""
        setOtpDigits(next)
      } else if (e.key === "Backspace" && index > 0) {
        const next = [...otpDigits]
        next[index - 1] = ""
        setOtpDigits(next)
        otpInputRefs.current[index - 1]?.focus()
      }
      return
    }

    if (e.key === "ArrowLeft" && index > 0) {
      setIsAllOtpSelected(false)
      otpInputRefs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < 5) {
      setIsAllOtpSelected(false)
      otpInputRefs.current[index + 1]?.focus()
    } else if (e.key === "Enter") {
      const full = otpDigits.join("")
      if (full.length === 6) {
        handleVerifyCodeSubmit()
      }
    } else if (/^\d$/.test(e.key) && isAllOtpSelected) {
      // Ctrl+A 상태에서 바로 숫자 키를 누른 경우 전체 지우고 첫 칸에 입력
      e.preventDefault()
      setIsAllOtpSelected(false)
      const next = [e.key, "", "", "", "", ""]
      setOtpDigits(next)
      otpInputRefs.current[1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    setIsAllOtpSelected(false)
    const next = ["", "", "", "", "", ""]
    pasted.split("").forEach((ch, i) => {
      next[i] = ch
    })
    setOtpDigits(next)
    otpInputRefs.current[Math.min(pasted.length, 6) - 1]?.focus()
  }

  // 코드 인증 완료 요청
  const handleVerifyCodeSubmit = async () => {
    if (!user) return
    const code = otpDigits.join("")
    if (code.length < 6) {
      showToast("6자리 인증 코드를 모두 입력해 주세요.", "warning")
      return
    }
    if (timerSeconds <= 0) {
      showToast("인증 코드 유효시간이 만료되었습니다. 재전송을 눌러주세요.", "error")
      return
    }

    setIsVerifyingCode(true)
    try {
      const res = await authService.verifyEmailCode(user.id, user.email, code)
      const updatedUser = res.user?.id ? res.user : { ...user, emailVerified: true }
      setUser(updatedUser)
      authService.setSession(updatedUser)
      setIsVerifyModalOpen(false)
      setIsVerificationSent(false)
      showToast("이메일 본인 인증이 성공적으로 완료되었습니다!", "success")
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "인증 코드가 일치하지 않습니다. 다시 확인해 주세요."
      showToast(msg, "error")
    } finally {
      setIsVerifyingCode(false)
    }
  }

  // 소셜 계정 연동 / 해제
  const handleToggleSocialLink = async (
    providerKey: "NAVER" | "KAKAO" | "GOOGLE",
    label: string
  ) => {
    if (!user) return
    const linkedList = user.linkedProviders || []
    const isLinked = user.provider === providerKey || linkedList.includes(providerKey)

    if (user.provider === providerKey) {
      showToast(`${label} 계정은 최초 가입된 주 계정으로 연동 해제할 수 없습니다.`, "info")
      return
    }

    if (isLinked) {
      showConfirm(`정말로 ${label} 계정 연동을 해제하시겠습니까?`, async () => {
        try {
          const updated = await authService.unlinkSocial(user.id, providerKey)
          setUser(updated)
          showToast(`${label} 계정 연동이 해제되었습니다.`, "success")
        } catch (err: any) {
          showToast(err.response?.data?.error || "연동 해제에 실패했습니다.", "error")
        }
      })
    } else {
      try {
        const updated = await authService.linkSocial(user.id, providerKey)
        setUser(updated)
        showToast(`${label} 계정이 성공적으로 연동되었습니다.`, "success")
      } catch (err: any) {
        showToast(err.response?.data?.error || "소셜 계정 연동에 실패했습니다.", "error")
      }
    }
  }

  // 비밀번호 변경 처리
  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!currentPassword) {
      showToast("현재 비밀번호를 입력해 주세요.", "warning")
      return
    }
    if (newPassword.length < 8) {
      showToast("새 비밀번호는 영문과 숫자를 포함하여 8자 이상이어야 합니다.", "warning")
      return
    }
    if (newPassword !== newPasswordConfirm) {
      showToast("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.", "error")
      return
    }

    setIsChangingPassword(true)
    try {
      await authService.changePassword({
        userId: user.id,
        currentPassword,
        newPassword,
        newPasswordConfirm,
      })
      setCurrentPassword("")
      setNewPassword("")
      setNewPasswordConfirm("")
      showToast("비밀번호가 안전하게 변경되었습니다.", "success")
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해 주세요."
      showToast(msg, "error")
    } finally {
      setIsChangingPassword(false)
    }
  }

  // 로그아웃 확인
  const handleConfirmLogout = () => {
    showConfirm("정말 로그아웃 하시겠습니까?", () => {
      authService.clearSession()
      router.push("/")
    })
  }

  // 회원 탈퇴 확인
  const handleConfirmWithdraw = () => {
    if (!user) return
    showConfirm(
      "회원 탈퇴 시 모든 여행 일정과 기록이 영구 삭제되며 복구할 수 없습니다. 계속하시겠습니까?",
      async () => {
        try {
          await authService.withdraw(user.id)
          showToast("회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.", "info")
          router.push("/")
        } catch (err: any) {
          showToast(err.response?.data?.error || "회원 탈퇴 처리 중 오류가 발생했습니다.", "error")
        }
      }
    )
  }

  if (!user) {
    return null
  }

  const isFullOtpEntered = otpDigits.join("").length === 6

  return (
    <>
      {/* ===================================================================
          우측 실 서비스 영역: 설정 및 내 여정 워크스페이스
          (좌측 사이드바 쉘은 WorkspaceAppShell에서 언마운트 없이 고정 유지)
         =================================================================== */}
      <main className="flex-1 h-full overflow-y-auto [scrollbar-gutter:stable] custom-scrollbar px-4 sm:px-6 lg:px-10 xl:pl-44 2xl:px-10 py-6 lg:py-8 select-none animate-in fade-in duration-150">
        <div className="w-full max-w-[1040px] mx-auto flex flex-col gap-6 pb-16">
          {/* 상단 워크스페이스 타이틀 바
              - '설정 및 내 여정'은 아래 프로필 카드 좌측 라인과 1:1 수직 정렬
              - '플래너 홈으로' 버튼만 좌측 바깥으로 삐죽 튀어나오도록 배치 */}
          <div className="relative flex items-center gap-3.5 xl:block">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="xl:absolute xl:right-[calc(100%+20px)] xl:top-1/2 xl:-translate-y-1/2 px-4 py-2 rounded-full border border-[#E2E2DA] bg-white hover:bg-[#FBFBF9] hover:border-[#1A9E7A] hover:text-[#1A9E7A] text-xs sm:text-[13px] font-extrabold text-[#18181B] shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
            >
              <ArrowLeft className="size-3.5" />
              <span>플래너 홈으로</span>
            </button>

            <div className="min-w-0 xl:pl-1">
              <h1 className="text-xl sm:text-2xl lg:text-[25px] font-extrabold tracking-tight text-[#18181B] truncate">
                설정 및 내 여정
              </h1>
              <p className="text-xs sm:text-sm text-[#6B6B72] font-medium mt-0.5 truncate">
                내 프로필과 계정 보안, 플래너 환경 및 여정 기록을 관리합니다
              </p>
            </div>
          </div>

          {/* 2열 고정 그리드 레이아웃 (탭 전환 시에도 좌우 박스 너비 100% 고정) */}
          <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-6 w-full items-start">
            {/* 좌측 칼럼: 프로필 카드 & 메뉴 */}
            <div className="w-full flex flex-col gap-4">
              {/* [모바일/태블릿 전용] 컴팩트 프로필 카드 (뱃지 및 한 줄 소개 제거) */}
              <div className="xl:hidden bg-white rounded-[26px] p-5 border border-[#E2E2DA] shadow-xs flex items-center justify-between gap-4">
                <div
                  onClick={handleOpenProfileEdit}
                  className="flex items-center gap-3.5 min-w-0 cursor-pointer"
                >
                  <UserAvatar
                    profileImage={user.profileImage}
                    nickname={user.nickname}
                    size="lg"
                    className="border-2 border-white shadow-sm ring-1 ring-[#E2E2DA]"
                  />
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-[#18181B] truncate mb-0.5">
                      {user.nickname}
                    </h2>
                    <p className="text-xs font-semibold text-[#6B6B72] truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenProfileEdit}
                  className="px-3.5 py-2 rounded-xl bg-[#F7F7F2] hover:bg-[#E2E2DA]/70 text-xs font-bold text-[#27272A] flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  <Edit3 className="size-3.5 text-[#1A9E7A]" />
                  <span>수정</span>
                </button>
              </div>

              {/* [모바일/태블릿 전용] Segmented 탭바 */}
              <div className="xl:hidden bg-[#E9E9E2] p-1.5 rounded-2xl grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("account")}
                  className={`py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "account"
                      ? "bg-white text-[#18181B] shadow-xs"
                      : "text-[#6B6B72]"
                  }`}
                >
                  <UserIcon className="size-4 text-[#1A9E7A]" />
                  <span>계정 설정</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("general")}
                  className={`py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "general"
                      ? "bg-white text-[#18181B] shadow-xs"
                      : "text-[#6B6B72]"
                  }`}
                >
                  <Settings className="size-4 text-[#1A9E7A]" />
                  <span>원더맵 설정</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("journeys")}
                  className={`py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "journeys"
                      ? "bg-white text-[#18181B] shadow-xs"
                      : "text-[#6B6B72]"
                  }`}
                >
                  <Compass className="size-4 text-[#1A9E7A]" />
                  <span>내 여정</span>
                </button>
              </div>

              {/* [데스크톱 전용] 프로필 카드 (여행 플래너 뱃지 & 한 줄 소개 제거, 깔끔한 닉네임+이메일 구성) */}
              <div className="hidden xl:flex bg-white rounded-[30px] p-7 border border-[#E2E2DA] shadow-xs flex-col items-center text-center gap-3.5 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 size-36 bg-[#1A9E7A]/8 rounded-full blur-2xl pointer-events-none" />

                <button
                  type="button"
                  onClick={handleOpenProfileEdit}
                  className="absolute top-5 right-5 px-3 py-1.5 rounded-xl bg-[#F7F7F2] hover:bg-[#E2E2DA]/70 active:scale-95 text-[#27272A] font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="size-3.5 text-[#1A9E7A]" />
                  <span>수정</span>
                </button>

                <UserAvatar
                  profileImage={user.profileImage}
                  nickname={user.nickname}
                  size="xl"
                  onClick={handleOpenProfileEdit}
                  title="클릭하여 프로필 아바타 및 닉네임 수정"
                  className="border-4 border-white shadow-md ring-1 ring-[#E2E2DA] hover:scale-105 transition-transform cursor-pointer"
                />

                <div className="w-full flex flex-col items-center">
                  <h2 className="text-[21px] font-extrabold text-[#18181B] tracking-tight">
                    {user.nickname}
                  </h2>
                  <p className="text-sm font-semibold text-[#6B6B72] mt-1 break-all">
                    {user.email}
                  </p>
                </div>
              </div>

                {/* [데스크톱 전용] 좌측 메뉴 및 탭 전환 카드 */}
                <div className="hidden xl:flex bg-white rounded-[28px] p-5 border border-[#E2E2DA] shadow-xs flex-col gap-1.5">
                  <h3 className="font-extrabold text-xs text-[#8A8A93] mb-1.5 tracking-wider px-2">
                    설정 및 여정 관리
                  </h3>

                  <button
                    type="button"
                    onClick={() => setActiveTab("account")}
                    className={`flex items-center justify-between w-full py-3.5 px-4 rounded-2xl transition text-left cursor-pointer ${
                      activeTab === "account"
                        ? "bg-[#EDFAF4] text-[#1A9E7A] font-extrabold shadow-2xs"
                        : "text-[#52525B] hover:bg-[#F7F7F2] hover:text-[#18181B] font-semibold"
                    }`}
                  >
                    <span className="text-[15px] flex items-center gap-3">
                      <UserIcon className="size-5" />
                      <span>계정 설정</span>
                    </span>
                    <ChevronRight className="size-4 opacity-70" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("general")}
                    className={`flex items-center justify-between w-full py-3.5 px-4 rounded-2xl transition text-left cursor-pointer ${
                      activeTab === "general"
                        ? "bg-[#EDFAF4] text-[#1A9E7A] font-extrabold shadow-2xs"
                        : "text-[#52525B] hover:bg-[#F7F7F2] hover:text-[#18181B] font-semibold"
                    }`}
                  >
                    <span className="text-[15px] flex items-center gap-3">
                      <Settings className="size-5" />
                      <span>원더맵 설정</span>
                    </span>
                    <ChevronRight className="size-4 opacity-70" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("journeys")}
                    className={`flex items-center justify-between w-full py-3.5 px-4 rounded-2xl transition text-left cursor-pointer ${
                      activeTab === "journeys"
                        ? "bg-[#EDFAF4] text-[#1A9E7A] font-extrabold shadow-2xs"
                        : "text-[#52525B] hover:bg-[#F7F7F2] hover:text-[#18181B] font-semibold"
                    }`}
                  >
                    <span className="text-[15px] flex items-center gap-3">
                      <Compass className="size-5" />
                      <span>내 여정</span>
                    </span>
                    <ChevronRight className="size-4 opacity-70" />
                  </button>

                  <div className="h-px bg-[#E2E2DA]/80 my-2" />

                  <button
                    type="button"
                    onClick={() => setTermsModalType("terms")}
                    className="flex items-center justify-between w-full py-3 px-4 rounded-2xl text-[#52525B] hover:bg-[#F7F7F2] hover:text-[#18181B] transition font-semibold text-left cursor-pointer"
                  >
                    <span className="text-[14.5px] flex items-center gap-3">
                      <FileText className="size-4.5 text-[#8A8A93]" />
                      <span>서비스 이용약관</span>
                    </span>
                    <ChevronRight className="size-4 text-[#8A8A93]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setTermsModalType("privacy")}
                    className="flex items-center justify-between w-full py-3 px-4 rounded-2xl text-[#52525B] hover:bg-[#F7F7F2] hover:text-[#18181B] transition font-semibold text-left cursor-pointer"
                  >
                    <span className="text-[14.5px] flex items-center gap-3">
                      <ShieldCheck className="size-4.5 text-[#8A8A93]" />
                      <span>개인정보 처리방침</span>
                    </span>
                    <ChevronRight className="size-4 text-[#8A8A93]" />
                  </button>

                  <div className="h-px bg-[#E2E2DA]/80 my-2" />

                  <button
                    type="button"
                    onClick={handleConfirmLogout}
                    className="flex items-center justify-between w-full py-3.5 px-4 rounded-2xl hover:bg-rose-50 text-rose-600 font-bold transition text-left cursor-pointer"
                  >
                    <span className="text-[15px] flex items-center gap-3">
                      <LogOut className="size-5" />
                      <span>로그아웃</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* ===============================================================
                  우측 칼럼: 탭별 상세 콘텐츠
                 =============================================================== */}
              <div className="flex-1 w-full min-w-0 flex flex-col gap-6">
                {/* -------------------------------------------------------------
                    탭 1: 계정 설정
                   ------------------------------------------------------------- */}
                {activeTab === "account" && (
                  <div className="w-full flex flex-col gap-6 animate-in fade-in duration-150">
                    {/* 1. 계정 기본 정보 & 프로필 요약 카드 */}
                    <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-[#E2E2DA] shadow-xs flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-extrabold text-lg text-[#18181B]">계정 기본 정보</h3>
                          <p className="text-sm text-[#6B6B72] mt-0.5">
                            로그인 계정 및 프로필 정보를 확인하고 수정할 수 있습니다
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenProfileEdit}
                          className="px-4 py-2.5 rounded-2xl bg-[#EDFAF4] hover:bg-[#D9F5E8] text-[#1A9E7A] font-extrabold text-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Edit3 className="size-4" />
                          <span>프로필 설정</span>
                        </button>
                      </div>

                      {/* 이메일 주소 */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 px-5 bg-[#F7F7F2] rounded-2xl border border-[#E2E2DA]">
                        <div>
                          <p className="text-xs font-bold text-[#8A8A93] mb-1">이메일 주소</p>
                          <p className="text-[15px] font-extrabold text-[#18181B] break-all">
                            {user.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {user.provider === "LOCAL" ? (
                            user.emailVerified ? (
                              <span className="px-3 py-1.5 rounded-xl bg-[#EDFAF4] text-[#1A9E7A] text-xs font-extrabold border border-[#BDEBDC] flex items-center gap-1.5">
                                <CheckCircle2 className="size-4" />
                                <span>이메일 인증 완료</span>
                              </span>
                            ) : (
                              <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-extrabold border border-amber-200 flex items-center gap-1.5">
                                <AlertCircle className="size-4" />
                                <span>이메일 미인증</span>
                              </span>
                            )
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-[#EDFAF4] text-[#1A9E7A] text-xs font-extrabold border border-[#BDEBDC]">
                              {user.provider} 간편가입 완료
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 닉네임 및 프로필 아바타 요약 */}
                      <div className="flex items-center justify-between gap-3 py-4 px-5 bg-[#F7F7F2] rounded-2xl border border-[#E2E2DA]">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <UserAvatar
                            profileImage={user.profileImage}
                            nickname={user.nickname}
                            size="md"
                            className="border-2 border-white shadow-xs ring-1 ring-[#E2E2DA]"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#8A8A93] mb-0.5">
                              현재 프로필 닉네임
                            </p>
                            <p className="text-[15px] font-extrabold text-[#18181B] truncate">
                              {user.nickname}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenProfileEdit}
                          className="px-3.5 py-2 rounded-xl border border-[#E2E2DA] bg-white hover:border-[#1A9E7A] hover:text-[#1A9E7A] text-xs font-bold text-[#27272A] transition shrink-0 cursor-pointer"
                        >
                          아바타 · 닉네임 변경
                        </button>
                      </div>
                    </div>

                    {/* 2. 이메일 본인 인증 카드 (미인증 상태일 때 노출) */}
                    {!user.emailVerified && (
                      <div className="bg-[#EDFAF4]/80 rounded-[28px] p-6 lg:p-8 border border-[#BDEBDC] shadow-xs flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-2xl bg-[#1A9E7A] text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Mail className="size-5" />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-lg text-[#18181B]">
                                이메일 본인 인증
                              </h3>
                              <p className="text-sm text-[#4E5968] mt-0.5 font-medium">
                                프로필 설정(닉네임 · 아바타 변경) 및 소셜 계정 연동 기능을 이용하려면 이메일 인증을 완료해 주세요.
                              </p>
                            </div>
                          </div>
                        </div>

                        {isVerificationSent ? (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                            <div className="px-4 py-3 rounded-2xl bg-white border border-[#BDEBDC] text-sm font-bold text-[#1A9E7A] flex items-center gap-2">
                              <Clock className="size-4 shrink-0" />
                              <span>
                                인증 코드 입력 대기 중 (남은 유효시간 {formatTimer(timerSeconds)})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSendVerificationCode}
                                disabled={isSendingCode || resendCooldown > 0}
                                className="px-4 py-3.5 rounded-2xl border border-[#BDEBDC] bg-white hover:bg-[#F7F7F2] text-sm font-bold text-[#27272A] transition disabled:opacity-50 cursor-pointer"
                              >
                                {resendCooldown > 0 ? `${resendCooldown}초 후 재전송` : "코드 재전송"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsVerifyModalOpen(true)}
                                className="px-6 py-3.5 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] text-sm font-extrabold text-white shadow-sm shadow-[#1A9E7A]/20 transition cursor-pointer"
                              >
                                6자리 코드 입력하기
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={handleSendVerificationCode}
                              disabled={isSendingCode}
                              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] text-[15px] font-extrabold text-white shadow-sm shadow-[#1A9E7A]/20 transition disabled:opacity-50 cursor-pointer"
                            >
                              {isSendingCode ? "인증 코드 전송 중..." : "이메일 인증 코드 받기"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. 소셜 계정 연동 관리 (실제 브랜드 SVG 배지 적용) */}
                    <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-[#E2E2DA] shadow-xs flex flex-col gap-5">
                      <div>
                        <h3 className="font-extrabold text-lg text-[#18181B]">
                          소셜 계정 연동 관리
                        </h3>
                        <p className="text-sm text-[#6B6B72] mt-0.5 font-medium">
                          소셜 계정을 연동해 두면 비밀번호 입력 없이 간편하게 원더맵에 로그인할 수 있습니다
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {/* 네이버 */}
                        {(() => {
                          const isLinked =
                            user.provider === "NAVER" ||
                            (user.linkedProviders || []).includes("NAVER")
                          return (
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F7F7F2] border border-[#E2E2DA]">
                              <div className="flex items-center gap-3.5">
                                <div className="size-10 rounded-full bg-[#03C75A] flex items-center justify-center shadow-2xs shrink-0">
                                  <svg className="size-4 text-white fill-current" viewBox="0 0 24 24">
                                    <path d="M16.273 12.845 7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-[15px] font-extrabold text-[#18181B]">
                                    네이버 계정
                                  </p>
                                  <p className="text-xs font-medium text-[#6B6B72]">
                                    {isLinked
                                      ? "현재 계정과 연동되어 있습니다"
                                      : "연동된 계정이 없습니다"}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleSocialLink("NAVER", "네이버")}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                                  isLinked
                                    ? "bg-[#EDFAF4] text-[#1A9E7A] border border-[#BDEBDC] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                                    : "bg-white text-[#27272A] border border-[#E2E2DA] hover:border-[#1A9E7A] hover:text-[#1A9E7A]"
                                }`}
                              >
                                {isLinked ? "연동 완료" : "연동하기"}
                              </button>
                            </div>
                          )
                        })()}

                        {/* 카카오 */}
                        {(() => {
                          const isLinked =
                            user.provider === "KAKAO" ||
                            (user.linkedProviders || []).includes("KAKAO")
                          return (
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F7F7F2] border border-[#E2E2DA]">
                              <div className="flex items-center gap-3.5">
                                <div className="size-10 rounded-full bg-[#FEE500] flex items-center justify-center shadow-2xs shrink-0">
                                  <svg
                                    className="size-5 text-[#191919] fill-current"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 3C6.477 3 2 6.463 2 10.735c0 2.79 1.888 5.236 4.732 6.6-.208.77-.754 2.792-.864 3.226-.135.534.196.527.412.383.17-.113 2.712-1.842 3.806-2.587.619.09 1.258.138 1.914.138 5.523 0 10-3.463 10-7.735S17.523 3 12 3z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-[15px] font-extrabold text-[#18181B]">
                                    카카오 계정
                                  </p>
                                  <p className="text-xs font-medium text-[#6B6B72]">
                                    {isLinked
                                      ? "현재 계정과 연동되어 있습니다"
                                      : "연동된 계정이 없습니다"}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleSocialLink("KAKAO", "카카오")}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                                  isLinked
                                    ? "bg-[#EDFAF4] text-[#1A9E7A] border border-[#BDEBDC] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                                    : "bg-white text-[#27272A] border border-[#E2E2DA] hover:border-[#1A9E7A] hover:text-[#1A9E7A]"
                                }`}
                              >
                                {isLinked ? "연동 완료" : "연동하기"}
                              </button>
                            </div>
                          )
                        })()}

                        {/* 구글 (공식 4색 Google G 로고 SVG) */}
                        {(() => {
                          const isLinked =
                            user.provider === "GOOGLE" ||
                            (user.linkedProviders || []).includes("GOOGLE")
                          return (
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F7F7F2] border border-[#E2E2DA]">
                              <div className="flex items-center gap-3.5">
                                <div className="size-10 rounded-full bg-white border border-[#E2E2DA] flex items-center justify-center shadow-2xs shrink-0">
                                  <svg className="size-5" viewBox="0 0 24 24">
                                    <path
                                      fill="#4285F4"
                                      d="M23.49 12.275c0-.85-.075-1.665-.215-2.45H12v4.635h6.445c-.28 1.495-1.125 2.765-2.395 3.615v3.005h3.875c2.265-2.085 3.565-5.16 3.565-8.805z"
                                    />
                                    <path
                                      fill="#34A853"
                                      d="M12 24c3.24 0 5.955-1.075 7.94-2.91l-3.875-3.005c-1.075.72-2.45 1.145-4.065 1.145-3.125 0-5.775-2.11-6.72-4.945H1.275v3.1C3.25 21.305 7.31 24 12 24z"
                                    />
                                    <path
                                      fill="#FBBC05"
                                      d="M5.28 14.285c-.24-.72-.375-1.49-.375-2.285s.135-1.565.375-2.285v-3.1H1.275C.465 8.23 0 10.06 0 12s.465 3.77 1.275 5.385l4.005-3.1z"
                                    />
                                    <path
                                      fill="#EA4335"
                                      d="M12 4.77c1.76 0 3.34.605 4.585 1.795l3.44-3.44C17.95 1.19 15.235 0 12 0 7.31 0 3.25 2.695 1.275 6.615l4.005 3.1C6.225 6.88 8.875 4.77 12 4.77z"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-[15px] font-extrabold text-[#18181B]">
                                    구글 계정
                                  </p>
                                  <p className="text-xs font-medium text-[#6B6B72]">
                                    {isLinked
                                      ? "현재 계정과 연동되어 있습니다"
                                      : "연동된 계정이 없습니다"}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleSocialLink("GOOGLE", "구글")}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                                  isLinked
                                    ? "bg-[#EDFAF4] text-[#1A9E7A] border border-[#BDEBDC] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                                    : "bg-white text-[#27272A] border border-[#E2E2DA] hover:border-[#1A9E7A] hover:text-[#1A9E7A]"
                                }`}
                              >
                                {isLinked ? "연동 완료" : "연동하기"}
                              </button>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* 4. 비밀번호 변경 (LOCAL 계정) */}
                    {user.provider === "LOCAL" && (
                      <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-[#E2E2DA] shadow-xs flex flex-col gap-5">
                        <div className="flex items-center gap-2.5">
                          <Lock className="size-5 text-[#1A9E7A]" />
                          <h3 className="font-extrabold text-lg text-[#18181B]">비밀번호 변경</h3>
                        </div>

                        <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-[#27272A] mb-1.5">
                              현재 비밀번호
                            </label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="현재 사용 중인 비밀번호 입력"
                              className="w-full h-12 rounded-2xl border border-[#E2E2DA] bg-[#F7F7F2] focus:bg-white px-4 text-[15px] font-medium outline-none focus:border-[#1A9E7A] transition"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-[#27272A] mb-1.5">
                                새 비밀번호
                              </label>
                              <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="영문 + 숫자 포함 8~20자"
                                className="w-full h-12 rounded-2xl border border-[#E2E2DA] bg-[#F7F7F2] focus:bg-white px-4 text-[15px] font-medium outline-none focus:border-[#1A9E7A] transition"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-[#27272A] mb-1.5">
                                새 비밀번호 확인
                              </label>
                              <input
                                type="password"
                                value={newPasswordConfirm}
                                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                placeholder="새 비밀번호 한 번 더 입력"
                                className={`w-full h-12 rounded-2xl border bg-[#F7F7F2] focus:bg-white px-4 text-[15px] font-medium outline-none transition ${
                                  newPasswordConfirm.length > 0
                                    ? newPassword === newPasswordConfirm
                                      ? "border-[#1A9E7A]"
                                      : "border-rose-400"
                                    : "border-[#E2E2DA] focus:border-[#1A9E7A]"
                                }`}
                              />
                              {newPasswordConfirm.length > 0 && (
                                <p
                                  className={`text-xs font-bold mt-1.5 pl-1 ${
                                    newPassword === newPasswordConfirm
                                      ? "text-[#1A9E7A]"
                                      : "text-rose-500"
                                  }`}
                                >
                                  {newPassword === newPasswordConfirm
                                    ? "비밀번호가 일치합니다."
                                    : "비밀번호가 일치하지 않습니다."}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="pt-1">
                            <button
                              type="submit"
                              disabled={
                                isChangingPassword ||
                                !currentPassword ||
                                !newPassword ||
                                newPassword !== newPasswordConfirm
                              }
                              className="px-6 h-12 rounded-2xl bg-[#18181B] hover:bg-[#27272A] text-sm font-extrabold text-white transition disabled:opacity-40 cursor-pointer"
                            >
                              {isChangingPassword ? "변경 중..." : "비밀번호 변경하기"}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* 5. 로그인 기록 (간결한 세션 정보 + 우측 소프트 로즈 로그아웃 버튼) */}
                    <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-[#E2E2DA] shadow-xs flex flex-col gap-4">
                      <div>
                        <h3 className="font-extrabold text-lg text-[#18181B]">
                          로그인 기록
                        </h3>
                        <p className="text-sm text-[#6B6B72] mt-0.5 font-medium">
                          현재 로그인되어 있는 기기 및 세션 정보입니다.
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#FBFBF9] border border-[#E2E2DA]">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="size-11 rounded-full bg-[#F2F4F6] flex items-center justify-center text-[#52525B] shrink-0">
                            {deviceInfo.deviceType === "MOBILE" ? (
                              <Smartphone className="size-5" />
                            ) : deviceInfo.deviceType === "TABLET" ? (
                              <Tablet className="size-5" />
                            ) : (
                              <Laptop className="size-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[15px] font-extrabold text-[#18181B]">
                                {deviceInfo.regionLabel}
                              </p>
                              <span className="px-2 py-0.5 rounded-md bg-[#EDFAF4] text-[#1A9E7A] text-[11px] font-extrabold">
                                현재 기기
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-[#8A8A93] mt-0.5 truncate">
                              지금 접속 중 · {deviceInfo.browserName.replace(" 브라우저", "")} · {deviceInfo.osName} (
                              {deviceInfo.deviceType === "MOBILE"
                                ? "모바일"
                                : deviceInfo.deviceType === "TABLET"
                                ? "태블릿"
                                : "PC"}
                              )
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleConfirmLogout}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <LogOut className="size-3.5" />
                          <span>로그아웃</span>
                        </button>
                      </div>
                    </div>

                    {/* 6. 회원 탈퇴 (Danger Zone 카드) */}
                    <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-rose-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="size-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertCircle className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-lg text-[#18181B]">
                            회원 탈퇴
                          </h3>
                          <p className="text-xs sm:text-sm text-[#6B6B72] mt-1 font-medium leading-relaxed break-keep">
                            탈퇴 시 계정 정보와 직접 만든 여행 일정, 사진 · 다이어리 기록 및 소셜 연동 정보가 모두 영구 삭제되며 복구할 수 없습니다.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmWithdraw}
                        className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 text-xs sm:text-sm font-extrabold transition shrink-0 self-end sm:self-center cursor-pointer"
                      >
                        회원 탈퇴하기
                      </button>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    탭 2: 원더맵 설정 (한눈에 들어오는 행 기반 설정 리스트 + 즉시 자동 저장)
                   ------------------------------------------------------------- */}
                {activeTab === "general" && (
                  <div className="w-full flex flex-col gap-6 animate-in fade-in duration-150">
                    {/* 1. 플래너 및 동선 기본 설정 */}
                    <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-[#E2E2DA] shadow-xs flex flex-col">
                      <div className="flex items-center gap-2.5 pb-5 border-b border-[#E2E2DA]">
                        <Map className="size-5 text-[#1A9E7A]" />
                        <div>
                          <h3 className="font-extrabold text-lg text-[#18181B]">
                            플래너 기본 설정
                          </h3>
                          <p className="text-xs sm:text-sm text-[#6B6B72] mt-0.5 font-medium">
                            여행 일정 화면의 기본 보기와 경로 탐색 기준을 설정합니다
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-[#E2E2DA]/70">
                        {/* 항목 1: 여행 상세 기본 화면 */}
                        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                          <div className="min-w-0">
                            <p className="text-[15px] font-extrabold text-[#18181B]">
                              여행 상세 기본 화면
                            </p>
                            <p className="text-xs font-medium text-[#6B6B72] mt-0.5">
                              일정 페이지 진입 시 기본으로 보여줄 레이아웃을 선택합니다
                            </p>
                          </div>

                          <div className="inline-flex bg-[#F2F2EC] p-1 rounded-2xl shrink-0 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() => updateAppSetting("defaultMapMode", "SPLIT")}
                              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                                appSettings.defaultMapMode === "SPLIT"
                                  ? "bg-white text-[#1A9E7A] shadow-2xs"
                                  : "text-[#6B6B72] hover:text-[#18181B]"
                              }`}
                            >
                              <Columns2 className="size-3.5" />
                              <span>지도 · 일정 분할</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateAppSetting("defaultMapMode", "DIARY_FOCUS")}
                              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                                appSettings.defaultMapMode === "DIARY_FOCUS"
                                  ? "bg-white text-[#1A9E7A] shadow-2xs"
                                  : "text-[#6B6B72] hover:text-[#18181B]"
                              }`}
                            >
                              <BookOpen className="size-3.5" />
                              <span>기록 · 다이어리 확장</span>
                            </button>
                          </div>
                        </div>

                        {/* 항목 2: 기본 이동 수단 */}
                        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                          <div className="min-w-0">
                            <p className="text-[15px] font-extrabold text-[#18181B]">
                              기본 이동 수단
                            </p>
                            <p className="text-xs font-medium text-[#6B6B72] mt-0.5">
                              장소 간 이동 경로와 소요시간을 계산할 기본 수단입니다
                            </p>
                          </div>

                          <div className="inline-flex bg-[#F2F2EC] p-1 rounded-2xl shrink-0 self-start sm:self-center">
                            {[
                              { id: "TRANSIT" as const, icon: TrainFront, label: "대중교통" },
                              { id: "CAR" as const, icon: Car, label: "자동차" },
                              { id: "WALK" as const, icon: Footprints, label: "도보" },
                            ].map((item) => {
                              const IconComp = item.icon
                              const active = appSettings.defaultTransportMode === item.id
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => updateAppSetting("defaultTransportMode", item.id)}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                                    active
                                      ? "bg-white text-[#1A9E7A] shadow-2xs"
                                      : "text-[#6B6B72] hover:text-[#18181B]"
                                  }`}
                                >
                                  <IconComp className="size-3.5" />
                                  <span>{item.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* 항목 3: 일정 코스 구성 밀도 */}
                        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                          <div className="min-w-0">
                            <p className="text-[15px] font-extrabold text-[#18181B]">
                              일정 코스 구성 밀도
                            </p>
                            <p className="text-xs font-medium text-[#6B6B72] mt-0.5">
                              하루당 계획할 방문 장소 수의 기본 기준을 설정합니다
                            </p>
                          </div>

                          <div className="inline-flex bg-[#F2F2EC] p-1 rounded-2xl shrink-0 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() => updateAppSetting("aiSchedulePace", "RELAXED")}
                              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                                appSettings.aiSchedulePace === "RELAXED"
                                  ? "bg-white text-[#1A9E7A] shadow-2xs"
                                  : "text-[#6B6B72] hover:text-[#18181B]"
                              }`}
                            >
                              <Clock className="size-3.5" />
                              <span>여유롭게 (3~4곳)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateAppSetting("aiSchedulePace", "PACKED")}
                              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                                appSettings.aiSchedulePace === "PACKED"
                                  ? "bg-white text-[#1A9E7A] shadow-2xs"
                                  : "text-[#6B6B72] hover:text-[#18181B]"
                              }`}
                            >
                              <Compass className="size-3.5" />
                              <span>알차게 (5~6곳)</span>
                            </button>
                          </div>
                        </div>

                        {/* 항목 4: 지도 거리 표시 단위 */}
                        <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                          <div className="min-w-0">
                            <p className="text-[15px] font-extrabold text-[#18181B]">
                              지도 거리 표시 단위
                            </p>
                            <p className="text-xs font-medium text-[#6B6B72] mt-0.5">
                              지도 위 동선 거리를 표시할 기본 단위를 선택합니다
                            </p>
                          </div>

                          <div className="inline-flex bg-[#F2F2EC] p-1 rounded-2xl shrink-0 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() => updateAppSetting("distanceUnit", "KM")}
                              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                                appSettings.distanceUnit === "KM"
                                  ? "bg-white text-[#1A9E7A] shadow-2xs"
                                  : "text-[#6B6B72] hover:text-[#18181B]"
                              }`}
                            >
                              <Ruler className="size-3.5" />
                              <span>킬로미터 (km)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateAppSetting("distanceUnit", "MILE")}
                              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                                appSettings.distanceUnit === "MILE"
                                  ? "bg-white text-[#1A9E7A] shadow-2xs"
                                  : "text-[#6B6B72] hover:text-[#18181B]"
                              }`}
                            >
                              <Ruler className="size-3.5" />
                              <span>마일 (mi)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. 알림 수신 설정 */}
                    <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-[#E2E2DA] shadow-xs flex flex-col">
                      <div className="flex items-center gap-2.5 pb-5 border-b border-[#E2E2DA]">
                        <Bell className="size-5 text-[#1A9E7A]" />
                        <div>
                          <h3 className="font-extrabold text-lg text-[#18181B]">
                            알림 수신 설정
                          </h3>
                          <p className="text-xs sm:text-sm text-[#6B6B72] mt-0.5 font-medium">
                            동행 메이트와의 일정 조율 및 기록 알림을 설정합니다
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-[#E2E2DA]/70">
                        {[
                          {
                            key: "voteNotification" as const,
                            title: "실시간 장소 투표 및 동선 확정 알림",
                            desc: "동행 메이트가 여행지를 추가하거나 투표를 완료했을 때 안내합니다",
                            checked: appSettings.voteNotification,
                          },
                          {
                            key: "inviteNotification" as const,
                            title: "여행 일정 초대 및 멤버 합류 알림",
                            desc: "새로운 메이트가 초대코드로 여행 방에 합류했을 때 안내합니다",
                            checked: appSettings.inviteNotification,
                          },
                          {
                            key: "diaryReminderNotification" as const,
                            title: "여행 중 사진 · 다이어리 기록 리마인더",
                            desc: "여행 기간 중 오늘 방문한 장소의 사진과 메모를 남길 수 있도록 안내합니다",
                            checked: appSettings.diaryReminderNotification,
                          },
                        ].map((item, idx, arr) => (
                          <div
                            key={item.key}
                            onClick={() => updateAppSetting(item.key, !item.checked)}
                            className={`flex items-center justify-between gap-4 cursor-pointer ${
                              idx === arr.length - 1 ? "pt-4" : idx === 0 ? "py-4" : "py-4"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-[15px] font-extrabold text-[#18181B]">
                                {item.title}
                              </p>
                              <p className="text-xs font-medium text-[#6B6B72] mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={item.checked}
                              className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-200 shrink-0 cursor-pointer ${
                                item.checked ? "bg-[#1A9E7A]" : "bg-[#D5D5CB]"
                              }`}
                            >
                              <span
                                className={`bg-white size-5 rounded-full shadow-xs transform transition-transform duration-200 ${
                                  item.checked ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    탭 3: 내 여정 (재사용 가능한 통합 여정 컴포넌트)
                   ------------------------------------------------------------- */}
                {activeTab === "journeys" && (
                  <div className="w-full animate-in fade-in duration-150">
                    <MyJourneysView
                      user={user}
                      trips={trips}
                      isLoading={isInitializing}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

      {/* =====================================================================
          모달 1: 프로필 설정 모달 (이모지 + 배경 컬러 / 직접 사진 업로드)
         ===================================================================== */}
      <ProfileEditModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onSaved={(updated) => setUser(updated)}
      />

      {/* =====================================================================
          모달 2: 2단계 인증 스타일 6자리 개별 박스 이메일 인증 모달
          (Ctrl+A 전체 선택 후 Backspace/Delete 일괄 삭제 지원)
         ===================================================================== */}
      {isVerifyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsVerifyModalOpen(false)}
        >
          <div
            className="relative w-full max-w-[440px] rounded-[28px] bg-white px-6 sm:px-8 pt-6 pb-8 shadow-[0_24px_60px_rgba(0,0,0,0.18)] border border-[#E2E2DA] flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => {
              e.stopPropagation()
              if (isAllOtpSelected) setIsAllOtpSelected(false)
            }}
          >
            {/* 상단 네비게이션 바: 좌측 뒤로가기 화살표(←) & 우측 원형 닫기 버튼(×) */}
            <div className="w-full flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-full text-[#8A8A93] hover:text-[#18181B] hover:bg-[#F2F4F6] transition cursor-pointer"
                aria-label="뒤로가기"
              >
                <ArrowLeft className="size-5" />
              </button>

              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="flex size-7 items-center justify-center rounded-full bg-[#ECECEF] hover:bg-[#DDDDE2] text-[#6B6B72] transition cursor-pointer"
                aria-label="닫기"
              >
                <X className="size-4 stroke-[2.5]" />
              </button>
            </div>

            {/* 타이틀 & 전송 안내 문구 + 인라인 재전송 버튼 */}
            <h3 className="text-[21px] font-extrabold text-[#18181B] tracking-tight mb-2">
              이메일 인증
            </h3>
            <p className="text-[14.5px] text-[#6B6B72] font-medium leading-relaxed max-w-[330px] break-keep">
              <span className="font-semibold text-[#27272A]">{user.email}</span>(으)로 전송된 코드를 입력해
              <br />
              설정을 완료하세요.{" "}
              <button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={isSendingCode || resendCooldown > 0}
                className="text-[#1A9E7A] hover:text-[#158063] font-bold hover:underline disabled:opacity-45 cursor-pointer ml-0.5"
              >
                {resendCooldown > 0 ? `재전송(${resendCooldown}s)` : "재전송"}
              </button>
            </p>

            {/* 6자리 개별 입력 박스 영역 (Ctrl+V 일괄 붙여넣기 & Ctrl+A 전체 선택 삭제 지원) */}
            <div
              className="grid grid-cols-6 gap-2 sm:gap-2.5 w-full my-6"
              onPaste={handleOtpPaste}
            >
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpInputRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onFocus={() => setIsAllOtpSelected(false)}
                  onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className={`w-full h-16 sm:h-[68px] rounded-xl text-center text-2xl font-extrabold outline-none transition-all ${
                    isAllOtpSelected
                      ? "bg-[#EDFAF4] border-2 border-[#1A9E7A] text-[#1A9E7A] ring-3 ring-[#1A9E7A]/25"
                      : digit
                      ? "bg-white border-2 border-[#1A9E7A] text-[#18181B] shadow-2xs"
                      : "bg-[#F3F3F1] border border-[#DCDCD5] text-[#18181B] focus:bg-white focus:border-2 focus:border-[#1A9E7A] focus:ring-3 focus:ring-[#1A9E7A]/15"
                  }`}
                />
              ))}
            </div>

            {/* 코드 인증 버튼 (전체 너비) */}
            <button
              type="button"
              onClick={handleVerifyCodeSubmit}
              disabled={isVerifyingCode || !isFullOtpEntered}
              className={`w-full h-13 rounded-xl text-[15.5px] font-extrabold text-white transition-all cursor-pointer ${
                isFullOtpEntered
                  ? "bg-[#1A9E7A] hover:bg-[#158063] shadow-md shadow-[#1A9E7A]/20 active:scale-[0.99]"
                  : "bg-[#1A9E7A]/40 cursor-not-allowed"
              }`}
            >
              {isVerifyingCode ? "코드 확인 중..." : "코드 인증"}
            </button>

            {/* 하단 도움말 / 유효시간 안내 */}
            <div className="mt-5 flex flex-col items-center gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowHelpHint(!showHelpHint)}
                className="text-sm font-semibold text-[#52525B] hover:text-[#18181B] transition flex items-center gap-1 cursor-pointer"
              >
                <span>도움이 필요하신가요?</span>
                <span className="text-xs text-[#1A9E7A] font-bold">
                  ({formatTimer(timerSeconds)})
                </span>
              </button>

              {showHelpHint && (
                <div className="mt-1 rounded-2xl bg-[#F7F7F2] border border-[#E2E2DA] px-4 py-3 text-xs text-[#52525B] leading-relaxed text-left w-full animate-in fade-in duration-150">
                  <p className="font-bold text-[#18181B] mb-1">
                    메일이 도착하지 않았거나 다시 입력하고 싶으신가요?
                  </p>
                  <p>
                    • 입력창에서 <strong>Ctrl + A</strong>를 누른 뒤 Backspace를 누르면 6자리를 한 번에 지울 수 있습니다.
                  </p>
                  {devIssuedCode && (
                    <div className="mt-2 pt-2 border-t border-[#E2E2DA] flex items-center justify-between">
                      <span className="text-[#1A9E7A] font-extrabold">
                        개발 환경 인증 코드: {devIssuedCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAllOtpSelected(false)
                          setOtpDigits(devIssuedCode.split("").slice(0, 6))
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#1A9E7A] text-white font-bold text-[11px] cursor-pointer"
                      >
                        자동 입력
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          모달 3: 서비스 이용약관 / 개인정보 처리방침 모달
         ===================================================================== */}
      {termsModalType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setTermsModalType(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-[#E2E2DA] bg-white p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E2DA] pb-4">
              <div className="flex items-center gap-2.5">
                {termsModalType === "terms" ? (
                  <FileText className="size-5 text-[#1A9E7A]" />
                ) : (
                  <ShieldCheck className="size-5 text-[#1A9E7A]" />
                )}
                <h3 className="text-lg font-extrabold text-[#18181B]">
                  {termsModalType === "terms" ? "서비스 이용약관" : "개인정보 처리방침"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTermsModalType(null)}
                className="flex size-8 items-center justify-center rounded-full hover:bg-slate-100 transition text-[#6B6B72] cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto text-sm text-[#52525B] leading-relaxed space-y-3 pr-1">
              {termsModalType === "terms" ? (
                <>
                  <p className="font-bold text-[#18181B]">제 1 조 (목적)</p>
                  <p>
                    본 약관은 WanderMap(이하 &apos;서비스&apos;)이 제공하는 실시간 여행 동선 계획 및 여행 기록·다이어리 관리 플랫폼의 이용 조건과 절차에 관한 기본 사항을 규정합니다.
                  </p>
                  <p className="font-bold text-[#18181B] mt-3">제 2 조 (회원의 의무 및 일정 공유)</p>
                  <p>
                    1. 회원은 타인의 정보를 도용하지 않으며, 서비스 내 일정 조율 및 다이어리 기록 기능을 건전한 목적으로 사용해야 합니다.
                    <br />
                    2. 생성된 여행 일정의 초대코드는 개설자 및 동행 멤버의 동의 하에 공유되어야 합니다.
                  </p>
                  <p className="font-bold text-[#18181B] mt-3">제 3 조 (서비스의 제공 및 변경)</p>
                  <p>
                    WanderMap은 지도 기반 경로 계획, 일자별 여행지 리스트, 실시간 사진·마크다운 기록 및 장소 평가 기능을 지속적으로 고도화하여 제공합니다.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-[#18181B]">1. 수집하는 개인정보 항목</p>
                  <p>
                    WanderMap은 원활한 서비스 제공을 위해 아래 정보를 수집합니다.
                    <br />- 필수 항목: 이메일, 닉네임, 비밀번호(암호화)
                    <br />- 선택 항목: 프로필 이미지, 여행 선호도 설문 및 일정 기록 데이터
                  </p>
                  <p className="font-bold text-[#18181B] mt-3">2. 개인정보의 이용 목적</p>
                  <p>
                    - 여행 일정 생성 및 초대된 동행 멤버 식별
                    <br />- 맞춤형 여행지 추천 및 최적 동선 계획
                    <br />- 여행 중/후 사진 첨부 및 마크다운 다이어리 아카이빙
                  </p>
                  <p className="font-bold text-[#18181B] mt-3">3. 개인정보의 보유 및 파기</p>
                  <p>
                    회원 탈퇴 시 또는 목적 달성 시 관련 법령에 따라 지체 없이 안전하게 파기됩니다.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setTermsModalType(null)}
              className="w-full h-12 rounded-2xl bg-[#1A9E7A] hover:bg-[#158063] text-sm font-extrabold text-white transition cursor-pointer"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  )
}
