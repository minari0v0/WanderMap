"use client"

import React, { useState } from "react"
import { Users, Copy, Check, Crown, Eye, UserPlus, LogIn } from "lucide-react"
import { useRouter } from "next/navigation"

export interface Member {
  id: number | string
  nickname: string
  profileImage?: string | null
  role: "OWNER" | "MEMBER" | "GUEST"
}

export interface MembersBoxProps {
  tripId: string | number
  inviteCode: string
  createdByName?: string
  readOnly?: boolean
  currentUserRole?: "OWNER" | "MEMBER" | "GUEST"
  members?: Member[]
}

export function MembersBox({
  tripId,
  inviteCode,
  createdByName = "여행가",
  readOnly = false,
  currentUserRole = "MEMBER",
  members = [],
}: MembersBoxProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  // 기본 멤버 목록이 없을 경우 초기 목업 구성
  const displayMembers: Member[] =
    members.length > 0
      ? members
      : [
          {
            id: 1,
            nickname: createdByName,
            role: "OWNER",
            profileImage: null,
          },
          {
            id: 2,
            nickname: "소연",
            role: "MEMBER",
            profileImage: null,
          },
        ]

  // 초대 링크 복사
  function handleCopyInviteLink() {
    const inviteUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/join/${inviteCode}`
        : `https://wandermap.io/join/${inviteCode}`

    navigator.clipboard.writeText(inviteUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-[#E2E2DA] bg-white p-4 shadow-sm space-y-3.5 text-[#18181B]">
      {/* 헤더: 참여 인원 & 초대 링크 복사 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#EDFAF4] text-[#1A9E7A]">
            <Users className="size-4" />
          </span>
          <span className="text-xs font-bold text-[#18181B]">
            함께하는 친구들 ({displayMembers.length}명)
          </span>
        </div>

        {/* 초대 링크 복사 버튼 */}
        <button
          onClick={handleCopyInviteLink}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs ${
            copied
              ? "bg-[#1A9E7A] text-white"
              : "bg-slate-100 hover:bg-slate-200/80 text-[#27272A]"
          }`}
          title="초대 링크 복사"
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              <span>복사됨!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5 text-[#6B6B72]" />
              <span>초대 링크</span>
            </>
          )}
        </button>
      </div>

      {/* 멤버 리스트 */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {displayMembers.map((member) => {
            const isOwner = member.role === "OWNER"
            return (
              <div
                key={member.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-[#E2E2DA]/80 text-xs shadow-2xs"
              >
                {/* 프로필 이미지 (없을 경우 이니셜) */}
                {member.profileImage ? (
                  <img
                    src={member.profileImage}
                    alt={member.nickname}
                    className="size-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-5 rounded-full bg-[#1A9E7A]/15 text-[#1A9E7A] font-bold text-[10px] flex items-center justify-center">
                    {member.nickname.charAt(0)}
                  </div>
                )}

                <span className="font-semibold text-xs text-[#18181B]">
                  {member.nickname}
                </span>

                {isOwner && (
                  <span
                    className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"
                    title="여행 방 개설자"
                  >
                    <Crown className="size-3 text-amber-500 fill-amber-500" />
                    방장
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* 게스트(Guest) 관람 모드일 경우 안내 배너 */}
        {readOnly && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 flex items-start justify-between gap-2 text-xs animate-in fade-in">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 font-bold text-amber-800">
                <Eye className="size-3.5" />
                <span>관람 모드 (Guest)</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-snug">
                초대 링크로 접속한 게스트 상태입니다. 동선 조회만 가능하며, 투표 및 편집은 로그인이 필요합니다.
              </p>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition"
            >
              <LogIn className="size-3" />
              <span>로그인</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
