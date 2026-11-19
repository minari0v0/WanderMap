"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { Wallet, ChevronDown, ChevronUp, Users, X } from "lucide-react"
import type {
  ExpenseItem,
  MemberExpenseTotal,
  DayExpenseSummary,
  TripMemberItem,
  CreateExpensePayload,
} from "@/lib/trip-service"
import { UserAvatar } from "@/components/ui/user-avatar"
import { showToast } from "@/components/ui/system-alert"

export interface DayExpenseBarProps {
  activeDay: number
  daySummary?: DayExpenseSummary | null
  tripTotalAmount: number
  tripTotalsByCurrency?: Record<string, number>
  members?: TripMemberItem[]
  currentUserId?: number
  readOnly?: boolean
  isOpen?: boolean
  onToggleOpen?: () => void
  onAddExpense?: (payload: CreateExpensePayload) => Promise<void> | void
  onDeleteExpense?: (expenseId: number) => Promise<void> | void
}

const CURRENCY_OPTIONS = [
  { code: "KRW", selectLabel: "원 (KRW)", buttonLabel: "원", shortSuffix: "원", prefix: "" },
  { code: "JPY", selectLabel: "¥ (JPY)", buttonLabel: "¥", shortSuffix: "¥", prefix: "" },
  { code: "USD", selectLabel: "$ (USD)", buttonLabel: "$", shortSuffix: "", prefix: "$" },
  { code: "EUR", selectLabel: "€ (EUR)", buttonLabel: "€", shortSuffix: "", prefix: "€" },
  { code: "TWD", selectLabel: "NT$ (TWD)", buttonLabel: "NT$", shortSuffix: "", prefix: "NT$" },
  { code: "THB", selectLabel: "฿ (THB)", buttonLabel: "฿", shortSuffix: "", prefix: "฿" },
  { code: "VND", selectLabel: "₫ (VND)", buttonLabel: "₫", shortSuffix: "₫", prefix: "" },
  { code: "CNY", selectLabel: "CN¥ (CNY)", buttonLabel: "CN¥", shortSuffix: "", prefix: "CN¥" },
  { code: "GBP", selectLabel: "£ (GBP)", buttonLabel: "£", shortSuffix: "", prefix: "£" },
] as const

export function formatMoney(amount: number, currency = "KRW"): string {
  const safeAmount = Math.round(Number(amount) || 0)
  const formatted = safeAmount.toLocaleString()
  const upper = (currency || "KRW").toUpperCase()
  switch (upper) {
    case "JPY":
      return `${formatted}¥`
    case "USD":
      return `$${formatted}`
    case "EUR":
      return `€${formatted}`
    case "TWD":
      return `NT$${formatted}`
    case "THB":
      return `฿${formatted}`
    case "VND":
      return `${formatted}₫`
    case "CNY":
      return `CN¥${formatted}`
    case "GBP":
      return `£${formatted}`
    case "KRW":
    default:
      return `${formatted}원`
  }
}

function formatCurrencyTotals(
  totalsByCurrency?: Record<string, number>,
  fallbackAmount = 0,
  emptyLabel = "0원"
): string {
  if (totalsByCurrency) {
    const entries = Object.entries(totalsByCurrency).filter(
      ([, value]) => Number(value) > 0
    )
    if (entries.length > 0) {
      return entries
        .map(([code, value]) => formatMoney(value, code))
        .join(" · ")
    }
  }
  if (fallbackAmount > 0) {
    return formatMoney(fallbackAmount, "KRW")
  }
  return emptyLabel
}

interface AvatarSummaryCard {
  key: string
  payerType: "MEMBER" | "SHARED"
  memberId?: number
  label: string
  rawName: string
  profileImage?: string | null
  isShared: boolean
  isSelf: boolean
  totalsByCurrency: Record<string, number>
  fallbackAmount: number
}

export function DayExpenseBar({
  activeDay,
  daySummary,
  tripTotalAmount,
  tripTotalsByCurrency,
  members = [],
  currentUserId,
  readOnly = false,
  isOpen,
  onToggleOpen,
  onAddExpense,
  onDeleteExpense,
}: DayExpenseBarProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isExpanded = isOpen !== undefined ? isOpen : internalExpanded

  const [title, setTitle] = useState("")
  const [amountDigits, setAmountDigits] = useState("")
  const [currency, setCurrency] = useState<string>("KRW")
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false)
  const [payerType, setPayerType] = useState<"UNSPECIFIED" | "SHARED" | "MEMBER">("UNSPECIFIED")
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const titleInputRef = useRef<HTMLInputElement | null>(null)
  const amountInputRef = useRef<HTMLInputElement | null>(null)
  const currencyMenuRef = useRef<HTMLDivElement | null>(null)

  const formattedAmountInput = amountDigits
    ? Number(amountDigits).toLocaleString()
    : ""
  const parsedAmountValue = amountDigits ? Number(amountDigits) : 0
  const canSubmit = Boolean(title.trim() && parsedAmountValue > 0)

  useEffect(() => {
    if (!isCurrencyMenuOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (
        currencyMenuRef.current &&
        !currencyMenuRef.current.contains(e.target as Node)
      ) {
        setIsCurrencyMenuOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsCurrencyMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isCurrencyMenuOpen])

  const totalAmount = daySummary?.totalAmount ?? 0
  const sharedAmount = daySummary?.sharedAmount ?? 0
  const memberTotals: MemberExpenseTotal[] = daySummary?.memberTotals ?? []
  const items: ExpenseItem[] = daySummary?.items ?? []

  const hasAnyDayExpense =
    totalAmount > 0 ||
    Object.values(daySummary?.totalsByCurrency || {}).some((v) => v > 0)

  const formattedDayTotal = formatCurrencyTotals(
    daySummary?.totalsByCurrency,
    totalAmount,
    "0원"
  )

  const formattedTripTotal = formatCurrencyTotals(
    tripTotalsByCurrency,
    tripTotalAmount,
    "0원"
  )

  const hasTripTotalDifference =
    (tripTotalAmount > totalAmount && tripTotalAmount > 0) ||
    Object.entries(tripTotalsByCurrency || {}).some(
      ([code, val]) => val > (daySummary?.totalsByCurrency?.[code] ?? 0)
    )

  // 현재 사용자를 맨 앞에 정렬한 멤버 목록
  const sortedMembers = useMemo(() => {
    if (!members || members.length === 0) return []
    return [...members].sort((a, b) => {
      const aIsMe = Boolean(currentUserId && a.id === currentUserId)
      const bIsMe = Boolean(currentUserId && b.id === currentUserId)
      if (aIsMe && !bIsMe) return -1
      if (!aIsMe && bIsMe) return 1
      return 0
    })
  }, [members, currentUserId])

  useEffect(() => {
    if (
      payerType === "MEMBER" &&
      selectedMemberId !== null &&
      !sortedMembers.some((m) => m.id === selectedMemberId)
    ) {
      setPayerType("UNSPECIFIED")
      setSelectedMemberId(null)
    }
  }, [payerType, selectedMemberId, sortedMembers])

  // 아바타 그리드에 표시할 인물 / 우리(공통) 카드 생성
  const avatarCards: AvatarSummaryCard[] = useMemo(() => {
    const cards: AvatarSummaryCard[] = []
    const matchedMemberKeys = new Set<string>()

    for (const m of sortedMembers) {
      const isMe = Boolean(currentUserId && m.id === currentUserId)
      const matched = memberTotals.find(
        (mt) =>
          (mt.userId != null && Number(mt.userId) === Number(m.id)) ||
          (mt.userId == null && mt.label === m.nickname)
      )
      if (matched) {
        matchedMemberKeys.add(
          matched.userId != null ? `u:${matched.userId}` : `n:${matched.label}`
        )
      }

      cards.push({
        key: `member-${m.id}`,
        payerType: "MEMBER",
        memberId: m.id,
        label: isMe ? `${m.nickname}(나)` : m.nickname,
        rawName: m.nickname,
        profileImage: m.profileImage,
        isShared: false,
        isSelf: isMe,
        totalsByCurrency: matched?.totalsByCurrency || {},
        fallbackAmount: matched?.amount ?? 0,
      })
    }

    // 기존 기록에만 남은 이전 멤버 포함
    for (const mt of memberTotals) {
      const mtKey = mt.userId != null ? `u:${mt.userId}` : `n:${mt.label}`
      if (matchedMemberKeys.has(mtKey)) continue
      const isMe = Boolean(currentUserId && mt.userId === currentUserId)
      cards.push({
        key: `extra-${mtKey}`,
        payerType: "MEMBER",
        memberId: mt.userId ?? undefined,
        label: isMe ? `${mt.label}(나)` : mt.label,
        rawName: mt.label,
        profileImage: null,
        isShared: false,
        isSelf: isMe,
        totalsByCurrency: mt.totalsByCurrency || {},
        fallbackAmount: mt.amount ?? 0,
      })
    }

    const hasSharedExpense =
      sharedAmount > 0 ||
      Object.values(daySummary?.sharedTotalsByCurrency || {}).some((v) => v > 0)

    if (sortedMembers.length > 1 || hasSharedExpense) {
      cards.push({
        key: "shared",
        payerType: "SHARED",
        label: "우리(공통)",
        rawName: "우리",
        profileImage: null,
        isShared: true,
        isSelf: false,
        totalsByCurrency: daySummary?.sharedTotalsByCurrency || {},
        fallbackAmount: sharedAmount,
      })
    }

    return cards
  }, [
    sortedMembers,
    memberTotals,
    currentUserId,
    sharedAmount,
    daySummary?.sharedTotalsByCurrency,
  ])

  const selectedAvatarCard = useMemo<AvatarSummaryCard | null>(() => {
    if (payerType === "SHARED") {
      return avatarCards.find((c) => c.isShared) ?? null
    }
    if (payerType === "MEMBER" && selectedMemberId !== null) {
      return (
        avatarCards.find(
          (c) => c.payerType === "MEMBER" && c.memberId === selectedMemberId
        ) ?? null
      )
    }
    return null
  }, [payerType, selectedMemberId, avatarCards])

  const selectedCurrencyOption = useMemo(
    () =>
      CURRENCY_OPTIONS.find((opt) => opt.code === currency) ??
      CURRENCY_OPTIONS[0],
    [currency]
  )

  function handleToggleBar() {
    if (onToggleOpen) {
      onToggleOpen()
    } else {
      setInternalExpanded((prev) => !prev)
    }
  }

  function handleSelectAvatarCard(card: AvatarSummaryCard) {
    if (card.isShared) {
      if (payerType === "SHARED") {
        setPayerType("UNSPECIFIED")
        setSelectedMemberId(null)
      } else {
        setPayerType("SHARED")
        setSelectedMemberId(null)
      }
      return
    }

    if (card.memberId !== undefined) {
      if (payerType === "MEMBER" && selectedMemberId === card.memberId) {
        setPayerType("UNSPECIFIED")
        setSelectedMemberId(null)
      } else {
        setPayerType("MEMBER")
        setSelectedMemberId(card.memberId)
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (readOnly) {
      showToast("로그인이 필요한 기능입니다.", "warning")
      return
    }

    const trimmedTitle = title.trim()
    const parsedAmount = Math.round(Number(amountDigits))

    if (!trimmedTitle) {
      showToast("항목명을 입력해 주세요.", "warning")
      return
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showToast("올바른 금액을 입력해 주세요.", "warning")
      return
    }
    if (!onAddExpense) return

    const selectedCard =
      selectedAvatarCard?.payerType === "MEMBER" ? selectedAvatarCard : undefined

    const payload: CreateExpensePayload = {
      dayNumber: activeDay,
      title: trimmedTitle,
      amount: parsedAmount,
      currency,
      payerType: selectedCard
        ? "MEMBER"
        : payerType === "MEMBER"
          ? "UNSPECIFIED"
          : payerType,
    }

    if (selectedCard?.memberId !== undefined) {
      payload.payerUserId = selectedCard.memberId
      payload.payerName = selectedCard.rawName
    }

    setIsSubmitting(true)
    try {
      await onAddExpense(payload)
      setTitle("")
      setAmountDigits("")
      setIsCurrencyMenuOpen(false)
      titleInputRef.current?.focus()
    } catch {
      showToast("지출 추가에 실패했습니다.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(expenseId: number) {
    if (readOnly) {
      showToast("로그인이 필요한 기능입니다.", "warning")
      return
    }
    if (!onDeleteExpense) return

    setDeletingId(expenseId)
    try {
      await onDeleteExpense(expenseId)
    } catch {
      showToast("지출 삭제에 실패했습니다.", "error")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div
      className={`border-b border-[#E2E2DA] bg-white text-[#18181B] ${
        isExpanded ? "flex-1 flex flex-col min-h-0 overflow-hidden" : "shrink-0"
      }`}
    >
      {/* 1. 상단 1줄 토글 바 (칩/뱃지 없이 깔끔한 요약) */}
      <button
        type="button"
        onClick={handleToggleBar}
        aria-expanded={isExpanded}
        className="w-full px-4 py-2.5 flex items-center justify-between gap-2 bg-[#FBFBF9] hover:bg-[#F8F8F6] transition cursor-pointer text-left shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Wallet className="size-4 text-[#1A9E7A] shrink-0" />
          <span className="text-xs font-extrabold text-[#18181B] shrink-0">
            Day {activeDay} 지출
          </span>
          {hasAnyDayExpense ? (
            <span className="text-[13px] font-black text-[#18181B] tabular-nums truncate">
              {formattedDayTotal}
            </span>
          ) : (
            <span className="text-xs font-medium text-[#8A8A93] truncate">
              기록 없음
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[#6B6B72]">
          {isExpanded && (
            <span className="text-[11px] font-bold text-[#1A9E7A]">일정 보기</span>
          )}
          {isExpanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </div>
      </button>

      {/* 2. 펼쳐졌을 때: 대형 아바타 중심의 시원하고 직관적인 지출 화면 */}
      {isExpanded && (
        <div className="flex-1 flex flex-col min-h-0 border-t border-[#E2E2DA]/70 bg-white overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-6 space-y-7">
            {/* 상단 대형 타이틀: DAY N : 40,500원 */}
            <div className="text-center space-y-1">
              <h3 className="text-2xl sm:text-[26px] font-black tracking-tight text-[#18181B] tabular-nums">
                <span className="text-[#1A9E7A]">DAY {activeDay}</span>
                <span className="mx-2 text-[#C8C8C0] font-bold">:</span>
                <span>{formattedDayTotal}</span>
              </h3>
              {hasTripTotalDifference && (
                <p className="text-xs font-semibold text-[#8A8A93] tabular-nums">
                  여행 전체 누적 {formattedTripTotal}
                </p>
              )}
            </div>

            {/* 대형 원형 프로필 아바타 그리드 (아바타 클릭으로 부담자 직관 선택) */}
            {avatarCards.length > 0 && (
              <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-8">
                {avatarCards.map((card) => {
                  const isSelected = card.isShared
                    ? payerType === "SHARED"
                    : payerType === "MEMBER" && selectedMemberId === card.memberId

                  const cardAmountText = formatCurrencyTotals(
                    card.totalsByCurrency,
                    card.fallbackAmount,
                    "0원"
                  )
                  const hasCardSpend = cardAmountText !== "0원"

                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => handleSelectAvatarCard(card)}
                      className="group flex flex-col items-center gap-2.5 focus:outline-none cursor-pointer"
                    >
                      <div
                        className={`rounded-full p-0.5 transition-all duration-150 ${
                          isSelected
                            ? "ring-[3px] ring-[#1A9E7A] ring-offset-2 scale-[1.03]"
                            : "ring-1 ring-[#E2E2DA] group-hover:ring-[#1A9E7A]/60"
                        }`}
                      >
                        {card.isShared ? (
                          <div className="size-[68px] sm:size-[72px] rounded-full bg-[#EDFAF4] flex items-center justify-center text-[#1A9E7A]">
                            <Users className="size-7" />
                          </div>
                        ) : (
                          <UserAvatar
                            profileImage={card.profileImage}
                            nickname={card.rawName}
                            size="lg"
                            className="!size-[68px] sm:!size-[72px] !text-[36px] sm:!text-[38px]"
                          />
                        )}
                      </div>

                      <div className="text-center space-y-0.5">
                        <p className="text-sm font-extrabold text-[#18181B]">
                          {card.label}
                        </p>
                        <p
                          className={`text-[15px] font-bold tabular-nums ${
                            hasCardSpend ? "text-[#18181B]" : "text-[#9CA3AF]"
                          }`}
                        >
                          {cardAmountText}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* 깔끔한 구분선 기반 지출 내역 리스트 (칩/뱃지 없음) */}
            <div className="pt-2 border-t border-[#E2E2DA]/80">
              {items.length > 0 ? (
                <ul className="divide-y divide-[#E2E2DA]/60">
                  {items.map((item) => {
                    const showPersonSuffix =
                      item.payerType === "SHARED" || item.payerType === "MEMBER"
                    const personSuffix =
                      item.payerType === "SHARED" ? "우리" : item.payerLabel

                    return (
                      <li
                        key={item.id}
                        className="group flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0 flex items-baseline gap-1.5">
                          <span className="font-bold text-[#18181B] truncate">
                            {item.title}
                          </span>
                          {showPersonSuffix && personSuffix && (
                            <span className="text-xs font-semibold text-[#8A8A93] shrink-0">
                              · {personSuffix}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-extrabold text-[#18181B] tabular-nums">
                            {formatMoney(item.amount, item.currency)}
                          </span>
                          <button
                            type="button"
                            disabled={deletingId === item.id}
                            onClick={() => handleDelete(item.id)}
                            aria-label={`${item.title} 지출 삭제`}
                            className="p-1 rounded-lg text-[#9CA3AF] hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer disabled:opacity-40"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="py-4 text-center text-xs font-medium text-[#8A8A93]">
                  기록된 지출이 없습니다
                </p>
              )}
            </div>
          </div>

          {/* 하단 고정 2단 통합 입력 카드 */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-[#E2E2DA]/70 bg-white px-4 py-3 shrink-0"
          >
            <div className="rounded-2xl border border-[#E2E2DA] bg-[#FBFBF9] focus-within:bg-white focus-within:border-[#1A9E7A] transition-colors">
              {selectedAvatarCard && (
                <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {selectedAvatarCard.isShared ? (
                      <div className="size-5 rounded-full bg-[#EDFAF4] flex items-center justify-center text-[#1A9E7A] shrink-0">
                        <Users className="size-3" />
                      </div>
                    ) : (
                      <UserAvatar
                        profileImage={selectedAvatarCard.profileImage}
                        nickname={selectedAvatarCard.rawName}
                        size="sm"
                        className="!size-5 [&>span]:!text-[11px]"
                      />
                    )}
                    <span className="text-xs font-extrabold text-[#1A9E7A] truncate">
                      {selectedAvatarCard.label}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPayerType("UNSPECIFIED")
                      setSelectedMemberId(null)
                    }}
                    aria-label="전체 지출로 변경"
                    className="p-0.5 rounded-full text-[#9CA3AF] hover:text-[#18181B] hover:bg-black/5 transition cursor-pointer shrink-0"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}

              <div className={selectedAvatarCard ? "px-3.5 pt-1 pb-2" : "px-3.5 pt-3 pb-2"}>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onFocus={() => {
                    if (readOnly) {
                      showToast("로그인이 필요한 기능입니다.", "warning")
                    }
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.nativeEvent.isComposing &&
                      !amountDigits
                    ) {
                      e.preventDefault()
                      amountInputRef.current?.focus()
                    }
                  }}
                  placeholder="지출 내용"
                  aria-label="지출 내용"
                  className="w-full bg-transparent text-sm font-semibold text-[#18181B] placeholder:text-[#A1A1AA] outline-none"
                />
              </div>

              <div className="mx-3.5 h-px bg-[#E2E2DA]/70" />

              <div className="flex items-center gap-2 px-3.5 py-2">
                <input
                  ref={amountInputRef}
                  type="text"
                  inputMode="numeric"
                  value={formattedAmountInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 10)
                    setAmountDigits(digits)
                  }}
                  onFocus={() => {
                    if (readOnly) {
                      showToast("로그인이 필요한 기능입니다.", "warning")
                    }
                  }}
                  placeholder="0"
                  aria-label="금액"
                  className="flex-1 min-w-0 bg-transparent text-lg font-black text-[#18181B] placeholder:text-[#C4C4CC] tabular-nums outline-none"
                />

                <div ref={currencyMenuRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCurrencyMenuOpen((prev) => !prev)}
                    aria-label="통화 단위 선택"
                    aria-expanded={isCurrencyMenuOpen}
                    className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-sm font-extrabold text-[#52525B] hover:text-[#18181B] hover:bg-black/[0.04] transition cursor-pointer"
                  >
                    <span>{selectedCurrencyOption.buttonLabel}</span>
                    <ChevronDown className="size-3.5 text-[#8A8A93]" />
                  </button>

                  {isCurrencyMenuOpen && (
                    <div className="absolute right-0 bottom-full mb-2 z-40 w-56 rounded-2xl border border-[#E2E2DA] bg-white p-1.5 shadow-lg grid grid-cols-3 gap-1">
                      {CURRENCY_OPTIONS.map((opt) => {
                        const isActive = opt.code === currency
                        return (
                          <button
                            key={opt.code}
                            type="button"
                            onClick={() => {
                              setCurrency(opt.code)
                              setIsCurrencyMenuOpen(false)
                              amountInputRef.current?.focus()
                            }}
                            className={`flex flex-col items-center justify-center rounded-xl py-1.5 px-1 text-center transition cursor-pointer ${
                              isActive
                                ? "bg-[#EDFAF4] text-[#1A9E7A]"
                                : "text-[#27272A] hover:bg-[#F8F8F6]"
                            }`}
                          >
                            <span className="text-sm font-black leading-tight">
                              {opt.buttonLabel}
                            </span>
                            <span className="text-[10px] font-bold opacity-75">
                              {opt.code}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer disabled:opacity-50 ${
                    canSubmit
                      ? "bg-[#1A9E7A] hover:bg-[#158063] text-white"
                      : "bg-[#EAEAE4] hover:bg-[#DFDFD8] text-[#71717A]"
                  }`}
                >
                  추가
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
