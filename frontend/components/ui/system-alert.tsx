"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
} from "lucide-react"

export type ToastType = "info" | "success" | "warning" | "error"

export interface ToastOptions {
  id?: string
  message: string
  type?: ToastType
  duration?: number
}

export interface AlertModalOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: ToastType
  onConfirm?: () => void
  onCancel?: () => void
}

// 이벤트 디스패처 (전역 어디서든 import하여 즉시 호출 가능)
type ToastEventDetail = ToastOptions
type AlertEventDetail = AlertModalOptions | null

const TOAST_EVENT = "wandermap:toast"
const ALERT_EVENT = "wandermap:alert"

export function showToast(message: string, type: ToastType = "info", duration = 2600) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<ToastEventDetail>(TOAST_EVENT, {
      detail: { message, type, duration, id: String(Date.now() + Math.random()) },
    })
  )
}

export function showAlert(options: AlertModalOptions | string) {
  if (typeof window === "undefined") return
  const detail: AlertModalOptions =
    typeof options === "string" ? { message: options } : options
  window.dispatchEvent(
    new CustomEvent<AlertEventDetail>(ALERT_EVENT, { detail })
  )
}

export function showConfirm(
  message: string,
  onConfirm: () => void,
  options?: Omit<AlertModalOptions, "message" | "onConfirm">
) {
  showAlert({
    message,
    cancelText: "취소",
    confirmText: "확인",
    onConfirm,
    ...options,
  })
}

// 토스트 단일 아이템 인터페이스 (애니메이션 상태 관리: entering -> visible -> exiting)
interface ToastItemInternal extends ToastOptions {
  id: string
  stage: "entering" | "visible" | "exiting"
}

export function SystemAlertProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItemInternal[]>([])
  const [alertModal, setAlertModal] = useState<AlertModalOptions | null>(null)

  // 1. 토스트 이벤트 수신
  useEffect(() => {
    function handleToastEvent(e: Event) {
      const customEvent = e as CustomEvent<ToastEventDetail>
      const toastId = customEvent.detail.id || String(Date.now() + Math.random())

      // 1) 초기 생성: entering (보이지 않는 상단 상태: opacity-0 -translate-y-8)
      const newToast: ToastItemInternal = {
        ...customEvent.detail,
        id: toastId,
        stage: "entering",
      }

      setToasts([newToast])

      // 2) 브라우저 마운트 직후 프레임: visible (부드러운 페이드 인 + 슬라이드 다운)
      const enterTimer = setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === toastId ? { ...t, stage: "visible" } : t))
        )
      }, 20)

      const duration = newToast.duration || 2600

      // 3) 퇴장 시작: exiting (위로 슬라이드 업 + 페이드 아웃)
      const exitTimer = setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === toastId ? { ...t, stage: "exiting" } : t))
        )
      }, duration)

      // 4) DOM 완전 제거: 애니메이션 320ms 후
      const removeTimer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId))
      }, duration + 320)

      return () => {
        clearTimeout(enterTimer)
        clearTimeout(exitTimer)
        clearTimeout(removeTimer)
      }
    }

    function handleAlertEvent(e: Event) {
      const customEvent = e as CustomEvent<AlertEventDetail>
      setAlertModal(customEvent.detail)
    }

    window.addEventListener(TOAST_EVENT, handleToastEvent)
    window.addEventListener(ALERT_EVENT, handleAlertEvent)
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToastEvent)
      window.removeEventListener(ALERT_EVENT, handleAlertEvent)
    }
  }, [])

  // 토스트 수동 닫기 (exiting 애니메이션 후 제거)
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, stage: "exiting" } : t))
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 320)
  }, [])

  // Alert 모달 닫기 핸들러
  const handleAlertConfirm = useCallback(() => {
    if (alertModal?.onConfirm) alertModal.onConfirm()
    setAlertModal(null)
  }, [alertModal])

  const handleAlertCancel = useCallback(() => {
    if (alertModal?.onCancel) alertModal.onCancel()
    setAlertModal(null)
  }, [alertModal])

  // Esc 키 모달 닫기
  useEffect(() => {
    if (!alertModal) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleAlertCancel()
      if (e.key === "Enter") handleAlertConfirm()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [alertModal, handleAlertCancel, handleAlertConfirm])

  return (
    <>
      {children}

      {/* 1. 화면 중앙 최상단 슬라이드 토스트 컨테이너 (내려올 때 페이드 인 + 올라갈 때 페이드 아웃) */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none flex flex-col items-center">
        {toasts.map((toast) => {
          const typeIcon = {
            info: <Compass className="size-4 text-[#1A9E7A] shrink-0" />,
            success: <CheckCircle2 className="size-4 text-[#1A9E7A] shrink-0" />,
            warning: <AlertTriangle className="size-4 text-amber-500 shrink-0" />,
            error: <AlertCircle className="size-4 text-rose-500 shrink-0" />,
          }[toast.type || "info"]

          const isVisible = toast.stage === "visible"

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E2E2DA] shadow-xl shadow-black/10 text-xs font-bold text-[#18181B] select-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] ${
                isVisible
                  ? "translate-y-0 opacity-100 scale-100"
                  : "-translate-y-8 opacity-0 scale-95"
              }`}
            >
              {typeIcon}
              <span className="truncate max-w-[340px] sm:max-w-md">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="ml-1 text-[#8A8A93] hover:text-[#18181B] p-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer"
                aria-label="닫기"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* 2. 커스텀 시스템 Alert / Confirm 모달창 */}
      {alertModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          {/* 백드롭 */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={handleAlertCancel}
          />

          {/* 알림 모달 카드 */}
          <div className="relative w-full max-w-sm rounded-3xl bg-white border border-[#E2E2DA] shadow-2xl p-6 space-y-4 z-10 animate-in zoom-in-95 duration-200 select-none text-center">
            {/* 상태 앰블럼 아이콘 */}
            <div className="flex justify-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#EDFAF4] text-[#1A9E7A] shadow-xs">
                {alertModal.type === "warning" ? (
                  <AlertTriangle className="size-6 text-amber-500" />
                ) : alertModal.type === "error" ? (
                  <AlertCircle className="size-6 text-rose-500" />
                ) : (
                  <Compass className="size-6 text-[#1A9E7A]" />
                )}
              </span>
            </div>

            {/* 타이틀 & 메시지 */}
            <div className="space-y-1.5 px-2">
              {alertModal.title && (
                <h3 className="text-base font-black tracking-tight text-[#18181B]">
                  {alertModal.title}
                </h3>
              )}
              <p className="text-xs text-[#6B6B72] leading-relaxed whitespace-pre-wrap">
                {alertModal.message}
              </p>
            </div>

            {/* 버튼 영역 */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {alertModal.cancelText && (
                <button
                  type="button"
                  onClick={handleAlertCancel}
                  className="flex-1 py-2.5 rounded-xl border border-[#E2E2DA] bg-white hover:bg-slate-50 text-[#6B6B72] font-bold text-xs transition cursor-pointer"
                >
                  {alertModal.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={handleAlertConfirm}
                className="flex-1 py-2.5 rounded-xl bg-[#1A9E7A] hover:bg-[#158063] text-white font-bold text-xs shadow-md shadow-[#1A9E7A]/20 transition cursor-pointer"
                autoFocus
              >
                {alertModal.confirmText || "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
