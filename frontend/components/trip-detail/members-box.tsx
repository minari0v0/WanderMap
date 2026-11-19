"use client"

import React, { useState, useRef, useEffect } from "react"
import { Users, Link2, Check } from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import type { UserResponse } from "@/lib/auth-service"
import { tripService, type TripPresenceResponse } from "@/lib/trip-service"

export interface Member {
  id: number | string
  nickname: string
  email?: string | null
  profileImage?: string | null
  role: "OWNER" | "MEMBER" | "GUEST"
}

export interface MembersBoxProps {
  tripId: string | number
  inviteCode: string
  createdById?: number | null
  createdByName?: string
  readOnly?: boolean
  currentUser?: UserResponse | null
  currentUserRole?: "OWNER" | "MEMBER" | "GUEST"
  members?: Member[]
  onCopySuccess?: (msg: string) => void
}

/**
 * 사용자가 직접 등록한 프로필 이미지(커스텀 사진 또는 선택한 아바타)가 있을 때만 UserAvatar를 렌더링하고,
 * 프로필 이미지가 비어 있을 때는 임의의 고양이 이모지가 아닌 깔끔한 닉네임 첫 글자 배지를 표시합니다.
 */
function MemberAvatarBadge({
  profileImage,
  nickname,
  size = "sm",
}: {
  profileImage?: string | null
  nickname: string
  size?: "xs" | "sm"
}) {
  const hasExplicitProfile = Boolean(profileImage && profileImage.trim())
  const initial = (nickname || "여").trim().charAt(0).toUpperCase()

  if (hasExplicitProfile) {
    return (
      <UserAvatar
        profileImage={profileImage}
        nickname={nickname}
        size="sm"
        className={
          size === "xs"
            ? "!size-8 !text-[17px] ring-2 ring-white shadow-2xs"
            : "!size-9 !text-[19px]"
        }
      />
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-extrabold select-none shrink-0 bg-[#18181B] text-white ${size === "xs" ? "size-8 text-xs ring-2 ring-white shadow-2xs" : "size-9 text-sm"
        }`}
    >
      {initial}
    </div>
  )
}

const PRESENCE_SESSION_KEY = "wandermap_presence_session_id"

function getOrCreatePresenceSessionId(): string {
  if (typeof window === "undefined") return ""
  try {
    const existing = sessionStorage.getItem(PRESENCE_SESSION_KEY)
    if (existing && existing.trim()) return existing.trim()
    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(PRESENCE_SESSION_KEY, generated)
    return generated
  } catch {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  }
}

export function MembersBox({
  tripId,
  inviteCode,
  createdById,
  createdByName = "여행가",
  readOnly = false,
  currentUser,
  currentUserRole,
  members = [],
  onCopySuccess,
}: MembersBoxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [presence, setPresence] = useState<TripPresenceResponse | null>(null)
  const [sharePathSegment, setSharePathSegment] = useState<string>(() => {
    const validInvite =
      inviteCode && inviteCode !== "undefined" && inviteCode !== "null"
        ? inviteCode.trim()
        : ""
    if (validInvite && tripId && String(tripId) !== validInvite) {
      return `${validInvite}?id=${tripId}`
    }
    return validInvite || String(tripId)
  })
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const validInvite =
      inviteCode && inviteCode !== "undefined" && inviteCode !== "null"
        ? inviteCode.trim()
        : ""
    if (!validInvite) {
      setSharePathSegment(String(tripId))
      return
    }
    let active = true
    tripService
      .getTripByInviteCode(validInvite)
      .then(() => {
        if (active) setSharePathSegment(validInvite)
      })
      .catch(() => {
        if (active) setSharePathSegment(String(tripId))
      })
    return () => {
      active = false
    }
  }, [inviteCode, tripId])

  // 바깥 영역 클릭 또는 ESC 키 입력 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  // 실제 로그인한 내 계정 정보(프로필 이미지, 이메일)를 멤버 목록에 실시간 동기화
  const rawMembers: Member[] =
    members && members.length > 0
      ? members
      : [
        {
          id: createdById || currentUser?.id || 1,
          nickname: createdByName,
          email: null,
          profileImage: null,
          role: "OWNER",
        },
      ]

  const displayMembers: Member[] = rawMembers.map((m) => {
    const isMe =
      Boolean(currentUser) &&
      (Number(m.id) === currentUser?.id || m.nickname === currentUser?.nickname)

    if (isMe && currentUser) {
      return {
        ...m,
        nickname: currentUser.nickname || m.nickname,
        email: currentUser.email || m.email,
        profileImage: currentUser.profileImage || m.profileImage,
      }
    }
    return m
  })

  const isGuestViewer = readOnly || currentUserRole === "GUEST"
  const numericTripId = Number(tripId)

  // 실시간 접속자(Presence) 하트비트 등록 및 폴링 + 이탈 시 즉시 해제
  useEffect(() => {
    if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
      return
    }
    let active = true
    const sessionId = getOrCreatePresenceSessionId()
    const capturedToken =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") : null

    const sendBeat = async () => {
      try {
        const nextPresence = await tripService.sendPresenceHeartbeat(
          numericTripId,
          sessionId
        )
        if (active) {
          setPresence(nextPresence)
        }
      } catch {
        // 일시적 네트워크/백엔드 오류 시 기존 상태 유지
      }
    }

    void sendBeat()
    const intervalId = window.setInterval(() => {
      void sendBeat()
    }, 20_000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void sendBeat()
      }
    }

    const handlePageHide = () => {
      tripService.leavePresence(numericTripId, sessionId, capturedToken)
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("pagehide", handlePageHide)

    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("pagehide", handlePageHide)
      tripService.leavePresence(numericTripId, sessionId, capturedToken)
    }
  }, [numericTripId, currentUser?.id, isGuestViewer])

  const onlineLoggedInViewers = presence
    ? presence.viewers
        .filter((v) => !v.guest)
        .map((v) => {
          const isMe =
            Boolean(currentUser) && Number(v.userId) === currentUser?.id
          return {
            ...v,
            nickname:
              isMe && currentUser?.nickname
                ? currentUser.nickname
                : v.nickname,
            profileImage:
              isMe && currentUser?.profileImage
                ? currentUser.profileImage
                : v.profileImage,
          }
        })
    : currentUser && !isGuestViewer
      ? [
          {
            viewerKey: `user:${currentUser.id}`,
            guest: false,
            userId: currentUser.id,
            nickname: currentUser.nickname,
            profileImage: currentUser.profileImage,
            role: currentUserRole || "MEMBER",
          },
        ]
      : []

  const onlineGuestCount = presence
    ? presence.guestCount
    : isGuestViewer
      ? 1
      : 0

  const onlineUserIds = new Set(
    onlineLoggedInViewers
      .map((v) => Number(v.userId))
      .filter((id) => Number.isFinite(id) && id > 0)
  )

  const totalOnlineCount = onlineLoggedInViewers.length + onlineGuestCount

  function handleCopyInviteLink(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    const targetSegment = sharePathSegment || String(tripId)
    const inviteUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/trips/${targetSegment}`
        : `https://wandermap.io/trips/${targetSegment}`

    navigator.clipboard.writeText(inviteUrl).catch(() => { })
    setCopied(true)
    onCopySuccess?.("동행자 초대 링크가 클립보드에 복사되었습니다.")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      {/* 1. 헤더 우측 상단: 현재 실시간 접속 중인 사람만 초록 점과 함께 표시 */}
      <div className="flex items-center -space-x-1.5 pr-1">
        {onlineLoggedInViewers.map((viewer) => {
          const isMe =
            Boolean(currentUser) && Number(viewer.userId) === currentUser?.id

          return (
            <div key={viewer.viewerKey} className="relative group/avatar">
              <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative flex items-center justify-center rounded-full transition-transform hover:scale-105 hover:z-20 focus:outline-none cursor-pointer"
                aria-label={`${viewer.nickname} 프로필`}
              >
                <MemberAvatarBadge
                  profileImage={viewer.profileImage}
                  nickname={viewer.nickname}
                  size="xs"
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#1A9E7A] ring-2 ring-white"
                  title="접속 중"
                />
              </button>

              {/* 호버 시 원더맵 스타일 툴팁 */}
              <div className="pointer-events-none invisible opacity-0 group-hover/avatar:visible group-hover/avatar:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                <span>
                  {viewer.nickname}
                  {isMe ? " (나)" : ""}
                </span>
                <span className="ml-1.5 text-[#34D399]">· 접속 중</span>
              </div>
            </div>
          )
        })}

        {/* 비로그인 손님이 실시간 접속 중일 때 G (또는 G2 등) 아이콘 + 초록 점 */}
        {onlineGuestCount > 0 && (
          <div className="relative group/guest">
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="relative flex size-8 items-center justify-center rounded-full border border-dashed border-[#1A9E7A] bg-[#EDFAF4] text-[10px] font-black text-[#1A9E7A] ring-2 ring-white cursor-pointer"
              aria-label={`손님 ${onlineGuestCount}명 열람 중`}
            >
              <span>{onlineGuestCount > 1 ? `G${onlineGuestCount}` : "G"}</span>
              <span
                className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#1A9E7A] ring-2 ring-white"
                title="열람 중"
              />
            </button>
            <div className="pointer-events-none invisible opacity-0 group-hover/guest:visible group-hover/guest:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              {isGuestViewer && onlineGuestCount === 1
                ? "손님 (나) · 열람 중"
                : `손님 ${onlineGuestCount}명 · 열람 중`}
            </div>
          </div>
        )}
      </div>

      {/* 2. '공유' 드롭다운 토글 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-extrabold transition cursor-pointer ${isOpen
          ? "bg-[#18181B] text-white"
          : "bg-[#F8F8F6] hover:bg-[#EDFAF4] text-[#18181B] hover:text-[#1A9E7A] border border-[#E2E2DA]"
          }`}
      >
        <Users className="size-4 text-[#1A9E7A]" />
        <span>공유</span>
      </button>

      {/* 3. 원클릭 링크 복사 아이콘 버튼 */}
      <button
        type="button"
        onClick={handleCopyInviteLink}
        className={`flex size-9 items-center justify-center rounded-xl border transition cursor-pointer ${copied
          ? "border-[#1A9E7A] bg-[#1A9E7A] text-white"
          : "border-[#E2E2DA] bg-[#F8F8F6] hover:border-[#1A9E7A] hover:bg-[#EDFAF4] text-[#27272A] hover:text-[#1A9E7A]"
          }`}
        title="초대 링크 바로 복사"
        aria-label="초대 링크 바로 복사"
      >
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      </button>

      {/* 4. 클릭 시 열리는 현재 접속자 & 함께하는 멤버 드롭다운 팝오버 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2.5 z-50 w-[320px] sm:w-[360px] rounded-2xl border border-[#E2E2DA] bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#18181B]">
          {/* 섹션 1: 현재 보고 있는 사람 (실시간 Presence) */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E2DA] bg-[#FBFBF9]">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#1A9E7A] shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-[#18181B]">
                현재 보고 있는 사람
              </span>
              <span className="rounded-lg bg-[#EDFAF4] px-2 py-0.5 text-xs font-extrabold text-[#1A9E7A]">
                {totalOnlineCount}명
              </span>
            </div>
          </div>

          <div className="max-h-[170px] overflow-y-auto divide-y divide-[#E2E2DA]/60 px-2 py-1.5 border-b border-[#E2E2DA]">
            {onlineLoggedInViewers.map((viewer) => {
              const isMe =
                Boolean(currentUser) && Number(viewer.userId) === currentUser?.id
              const roleLabel =
                viewer.role === "OWNER"
                  ? "호스트"
                  : viewer.role === "MEMBER"
                    ? "동행 멤버"
                    : "방문자"

              return (
                <div
                  key={viewer.viewerKey}
                  className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 hover:bg-[#F8F8F6] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <MemberAvatarBadge
                        profileImage={viewer.profileImage}
                        nickname={viewer.nickname}
                        size="sm"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#1A9E7A] ring-2 ring-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-[#18181B] truncate">
                        {viewer.nickname}
                        {isMe ? "(나)" : ""}
                      </p>
                      <p className="text-xs font-medium text-[#1A9E7A]">
                        접속 중 · {roleLabel}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            {onlineGuestCount > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 hover:bg-[#F8F8F6] transition">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-[#1A9E7A] bg-[#EDFAF4] text-xs font-black text-[#1A9E7A]">
                    <span>{onlineGuestCount > 1 ? `G${onlineGuestCount}` : "G"}</span>
                    <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#1A9E7A] ring-2 ring-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-[#18181B]">
                      손님{isGuestViewer && onlineGuestCount === 1 ? " (나)" : ""}
                    </p>
                    <p className="text-xs font-medium text-[#6B6B72]">
                      {onlineGuestCount}명 열람 중
                    </p>
                  </div>
                </div>
              </div>
            )}

            {totalOnlineCount === 0 && (
              <p className="py-3 text-center text-xs font-medium text-[#8A8A93]">
                현재 접속 중인 사람이 없습니다
              </p>
            )}
          </div>

          {/* 섹션 2: 함께하는 멤버 (저장된 멤버 목록 — 접속 중인 멤버만 초록 점 표시) */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E2E2DA] bg-[#FBFBF9]">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-[#18181B]">
                함께하는 멤버
              </span>
              <span className="rounded-lg bg-[#F4F4F0] px-2 py-0.5 text-xs font-extrabold text-[#52525B]">
                {displayMembers.length}명
              </span>
            </div>
          </div>

          <div className="max-h-[200px] overflow-y-auto divide-y divide-[#E2E2DA]/60 p-2">
            {displayMembers.map((member) => {
              const isMe =
                Boolean(currentUser) &&
                (Number(member.id) === currentUser?.id ||
                  member.nickname === currentUser?.nickname)
              const isOwner = member.role === "OWNER"
              const isOnline = onlineUserIds.has(Number(member.id))

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 hover:bg-[#F8F8F6] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <MemberAvatarBadge
                        profileImage={member.profileImage}
                        nickname={member.nickname}
                        size="sm"
                      />
                      {isOnline && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#1A9E7A] ring-2 ring-white"
                          title="접속 중"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold text-[#18181B] truncate">
                          {member.nickname}
                          {isMe ? "(나)" : ""}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#6B6B72] truncate">
                        {member.email || (isOwner ? "여행 방 호스트" : "동행 멤버")}
                      </p>
                    </div>
                  </div>

                  {isOwner && (
                    <span className="shrink-0 rounded-lg bg-[#EDFAF4] border border-[#1A9E7A]/25 px-2.5 py-1 text-xs font-extrabold text-[#1A9E7A]">
                      호스트
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 하단 링크 복사 바 */}
          <div className="flex items-center justify-between gap-3 border-t border-[#E2E2DA] bg-[#FBFBF9] px-4 py-3">
            <span className="text-xs font-semibold text-[#6B6B72] truncate">
              링크를 공유해 동행자를 초대하세요
            </span>
            <button
              type="button"
              onClick={handleCopyInviteLink}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${copied
                ? "bg-[#1A9E7A] text-white"
                : "bg-[#18181B] hover:bg-[#27272A] text-white"
                }`}
            >
              {copied ? (
                <>
                  <Check className="size-3.5" />
                  <span>복사 완료</span>
                </>
              ) : (
                <>
                  <Link2 className="size-3.5" />
                  <span>링크 복사</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
