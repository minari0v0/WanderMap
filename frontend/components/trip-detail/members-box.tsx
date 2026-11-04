"use client"

import React, { useState } from "react"
import { Users, Copy, Check, Crown, Eye, LogIn } from "lucide-react"
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
  inviteCode,
  createdByName = "여행가",
  readOnly = false,
  members = [],
}: MembersBoxProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

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
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#EDFAF4] text-[#1A9E7A]">
            <Users className="size-4.5" />
          </span>
          <span className="text-sm font-extrabold text-[#18181B]">
            함께하는 멤버 ({displayMembers.length}명)
          </span>
        </div>

        {/* 초대 링크 복사 버튼 */}
        <button
          onClick={handleCopyInviteLink}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
            copied
              ? "bg-[#1A9E7A] text-white"
              : "bg-slate-100 hover:bg-slate-200/80 text-[#27272A]"
          }`}
          title="초대 링크 복사"
        >
          {copied ? (
            <>
              <Check className="size-4" />
              <span>링크 복사됨</span>
            </>
          ) : (
            <>
              <Copy className="size-4 text-[#6B6B72]" />
              <span>초대 링크</span>
            </>
          )}
        </button>
      </div>

      {/* 멤버 리스트 */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {displayMembers.map((member) => {
            const isOwner = member.role === "OWNER"
            return (
              <div
                key={member.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-[#E2E2DA]/80 text-sm shadow-2xs"
              >
                {member.profileImage ? (
                  <img
                    src={member.profileImage}
                    alt={member.nickname}
                    className="size-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-6 rounded-full bg-[#1A9E7A]/15 text-[#1A9E7A] font-extrabold text-xs flex items-center justify-center">
                    {member.nickname.charAt(0)}
                  </div>
                )}

                <span className="font-bold text-sm text-[#18181B]">
                  {member.nickname}
                </span>

                {isOwner && (
                  <span
                    className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md"
                    title="방장"
                  >
                    <Crown className="size-3.5 text-amber-500 fill-amber-500" />
                    방장
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* 게스트 관람 모드 배너 */}
        {readOnly && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 flex items-center justify-between gap-2 text-xs animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <Eye className="size-4" />
              <span>관람 전용 모드</span>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition cursor-pointer"
            >
              <LogIn className="size-3.5" />
              <span>로그인</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
