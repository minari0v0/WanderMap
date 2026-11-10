"use client"

import React, { useState, useRef, useEffect } from "react"
import { Users, Link2, Check, Eye } from "lucide-react"
import { UserAvatar } from "@/components/ui/user-avatar"
import type { UserResponse } from "@/lib/auth-service"
import { tripService } from "@/lib/trip-service"

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
      className={`rounded-full flex items-center justify-center font-extrabold select-none shrink-0 bg-[#18181B] text-white ${
        size === "xs" ? "size-8 text-xs ring-2 ring-white shadow-2xs" : "size-9 text-sm"
      }`}
    >
      {initial}
    </div>
  )
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

  function handleCopyInviteLink(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    const targetSegment = sharePathSegment || String(tripId)
    const inviteUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/trips/${targetSegment}`
        : `https://wandermap.io/trips/${targetSegment}`

    navigator.clipboard.writeText(inviteUrl).catch(() => {})
    setCopied(true)
    onCopySuccess?.("동행자 초대 링크가 클립보드에 복사되었습니다.")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      {/* 1. 헤더 우측 상단 프로필 아바타 그룹 (호버 시 원더맵 툴팁, 클릭 시 드롭다운 오픈) */}
      <div className="flex items-center -space-x-1.5 pr-1">
        {displayMembers.map((member) => {
          const isMe =
            Boolean(currentUser) &&
            (Number(member.id) === currentUser?.id ||
              member.nickname === currentUser?.nickname)
          const isOwner = member.role === "OWNER"

          return (
            <div key={member.id} className="relative group/avatar">
              <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative flex items-center justify-center rounded-full transition-transform hover:scale-105 hover:z-20 focus:outline-none cursor-pointer"
                aria-label={`${member.nickname} 프로필`}
              >
                <MemberAvatarBadge
                  profileImage={member.profileImage}
                  nickname={member.nickname}
                  size="xs"
                />
                {isOwner && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-[#1A9E7A] ring-2 ring-white"
                    title="호스트"
                  />
                )}
              </button>

              {/* 호버 시 원더맵 스타일 툴팁 */}
              <div className="pointer-events-none invisible opacity-0 group-hover/avatar:visible group-hover/avatar:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                <span>
                  {member.nickname}
                  {isMe ? " (나)" : ""}
                </span>
                <span className="ml-1.5 text-[#34D399]">
                  · {isOwner ? "호스트" : "동행 멤버"}
                </span>
              </div>
            </div>
          )
        })}

        {/* 비로그인 게스트 열람 중일 때 GUEST 아이콘 배지 */}
        {isGuestViewer && (
          <div className="relative group/guest">
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="flex size-8 items-center justify-center rounded-full border border-dashed border-[#1A9E7A] bg-[#EDFAF4] text-[10px] font-black text-[#1A9E7A] ring-2 ring-white cursor-pointer"
            >
              G
            </button>
            <div className="pointer-events-none invisible opacity-0 group-hover/guest:visible group-hover/guest:opacity-100 transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 whitespace-nowrap rounded-xl bg-[#18181B] px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              GUEST (열람 중)
            </div>
          </div>
        )}
      </div>

      {/* 2. '공유' 드롭다운 토글 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs sm:text-sm font-extrabold transition cursor-pointer ${
          isOpen
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
        className={`flex size-9 items-center justify-center rounded-xl border transition cursor-pointer ${
          copied
            ? "border-[#1A9E7A] bg-[#1A9E7A] text-white"
            : "border-[#E2E2DA] bg-[#F8F8F6] hover:border-[#1A9E7A] hover:bg-[#EDFAF4] text-[#27272A] hover:text-[#1A9E7A]"
        }`}
        title="초대 링크 바로 복사"
        aria-label="초대 링크 바로 복사"
      >
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      </button>

      {/* 4. 클릭 시 열리는 멤버 & 링크 공유 드롭다운 팝오버 (권한 설정 없음) */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2.5 z-50 w-[320px] sm:w-[360px] rounded-2xl border border-[#E2E2DA] bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#18181B]">
          {/* 상단 타이틀 헤더 */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E2E2DA] bg-[#FBFBF9]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-[#18181B]">
                함께하는 멤버
              </span>
              <span className="rounded-lg bg-[#EDFAF4] px-2 py-0.5 text-xs font-extrabold text-[#1A9E7A]">
                {displayMembers.length}명
              </span>
            </div>
            {isGuestViewer && (
              <span className="flex items-center gap-1 text-xs font-extrabold text-[#1A9E7A]">
                <Eye className="size-3.5" />
                GUEST 열람 중
              </span>
            )}
          </div>

          {/* 멤버 목록 (프로필 아이콘 + 닉네임(나) + 이메일 + 호스트 배지) */}
          <div className="max-h-[260px] overflow-y-auto divide-y divide-[#E2E2DA]/60 p-2">
            {displayMembers.map((member) => {
              const isMe =
                Boolean(currentUser) &&
                (Number(member.id) === currentUser?.id ||
                  member.nickname === currentUser?.nickname)
              const isOwner = member.role === "OWNER"

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2.5 hover:bg-[#F8F8F6] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MemberAvatarBadge
                      profileImage={member.profileImage}
                      nickname={member.nickname}
                      size="sm"
                    />
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
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
                copied
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
