"use client"

import React, { useState, useEffect } from "react"
import {
  X,
  User,
  Mail,
  ShieldCheck,
  Bell,
  Calendar,
  LogOut,
  Check,
  AlertCircle,
  KeyRound,
} from "lucide-react"
import type { UserResponse } from "@/lib/auth-service"

export interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserResponse | null
  onLogout?: () => void
  onUpdateNickname?: (newNickname: string) => Promise<void> | void
}

export function AccountSettingsModal({
  isOpen,
  onClose,
  user,
  onLogout,
  onUpdateNickname,
}: AccountSettingsModalProps) {
  const [nickname, setNickname] = useState(user?.nickname || "")
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [emailNotif, setEmailNotif] = useState(true)
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "info" } | null>(null)

  useEffect(() => {
    if (user) {
      setNickname(user.nickname)
    }
  }, [user])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !user) return null

  function showMessage(text: string, type: "success" | "info" = "success") {
    setFeedbackMsg({ text, type })
    setTimeout(() => setFeedbackMsg(null), 3000)
  }

  async function handleSaveNickname() {
    if (!nickname.trim() || nickname === user?.nickname) {
      setIsEditingNickname(false)
      return
    }
    try {
      if (onUpdateNickname) {
        await onUpdateNickname(nickname.trim())
      }
      setIsEditingNickname(false)
      showMessage("닉네임이 성공적으로 변경되었습니다.")
    } catch {
      showMessage("닉네임 변경에 실패했습니다.", "info")
    }
  }

  function handleResendVerification() {
    showMessage("인증 메일이 재발송되었습니다. 받은 편지함을 확인해 주세요.")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 백드롭 */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* 모달 본문 */}
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-[#E2E2DA] shadow-2xl p-6 sm:p-7 space-y-6 z-10 animate-in zoom-in-95 duration-200 select-none">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-[#E2E2DA]/80 pb-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-[#18181B]">계정 설정</h2>
            <p className="text-xs text-[#8A8A93] mt-0.5">내 프로필 정보와 환경설정을 관리합니다</p>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full hover:bg-slate-100 text-[#6B6B72] hover:text-[#18181B] transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* 피드백 메시지 알림바 */}
        {feedbackMsg && (
          <div
            className={`flex items-center gap-2 p-3 rounded-2xl text-xs font-semibold animate-in fade-in slide-in-from-top-1 ${
              feedbackMsg.type === "success"
                ? "bg-[#EDFAF4] text-[#1A9E7A] border border-[#1A9E7A]/20"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            <Check className="size-4 shrink-0" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* 1. 프로필 섹션 */}
        <div className="space-y-4">
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#E2E2DA]">
            <div className="size-12 rounded-full bg-[#1A9E7A] text-white flex items-center justify-center font-black text-lg shadow-sm shadow-[#1A9E7A]/30 shrink-0">
              {user.nickname ? user.nickname.charAt(0) : "W"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#8A8A93]">닉네임</span>
                {!isEditingNickname ? (
                  <button
                    onClick={() => setIsEditingNickname(true)}
                    className="text-[11px] text-[#1A9E7A] font-bold hover:underline cursor-pointer"
                  >
                    수정
                  </button>
                ) : (
                  <button
                    onClick={handleSaveNickname}
                    className="text-[11px] text-[#1A9E7A] font-bold hover:underline cursor-pointer"
                  >
                    저장
                  </button>
                )}
              </div>
              {!isEditingNickname ? (
                <p className="text-sm font-bold text-[#18181B] truncate">{user.nickname}</p>
              ) : (
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full text-xs font-bold border-b border-[#1A9E7A] bg-transparent outline-none py-0.5 mt-0.5 text-[#18181B]"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* 이메일 및 인증 상태 */}
          <div className="p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#E2E2DA] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-[#6B6B72]">
                <Mail className="size-3.5" />
                <span className="font-semibold">이메일 계정</span>
              </div>
              {user.emailVerified ? (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="size-3" />
                  인증 완료
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  <AlertCircle className="size-3" />
                  미인증
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#18181B] truncate">{user.email}</p>
              {!user.emailVerified && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="shrink-0 text-[11px] font-bold text-[#1A9E7A] hover:underline cursor-pointer"
                >
                  인증 메일 발송
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. 환경 설정 옵션 */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#8A8A93] uppercase tracking-wider px-1">알림 & 연동</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-3 rounded-2xl border border-[#E2E2DA] hover:bg-slate-50 transition">
              <div className="flex items-center gap-2.5">
                <Bell className="size-4 text-[#6B6B72]" />
                <div>
                  <p className="text-xs font-bold text-[#18181B]">일정 및 초대 알림</p>
                  <p className="text-[10px] text-[#8A8A93]">여행 초대 및 동선 수정 알림 수신</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(e) => setEmailNotif(e.target.checked)}
                className="size-4 accent-[#1A9E7A] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl border border-[#E2E2DA] opacity-60">
              <div className="flex items-center gap-2.5">
                <Calendar className="size-4 text-[#6B6B72]" />
                <div>
                  <p className="text-xs font-bold text-[#18181B]">구글 캘린더 동기화</p>
                  <p className="text-[10px] text-[#8A8A93]">확정된 여행 일정 자동 등록</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                준비 중
              </span>
            </div>
          </div>
        </div>

        {/* 3. 하단 액션 버튼 (로그아웃 & 닫기) */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E2E2DA]/80">
          {onLogout ? (
            <button
              onClick={() => {
                onClose()
                onLogout()
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>로그아웃</span>
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-[#18181B] hover:bg-[#27272A] text-white font-bold text-xs transition shadow-sm cursor-pointer"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
