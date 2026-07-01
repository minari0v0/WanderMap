"use client"

import { Check, MapPin, Plane, UserPlus, Home } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { TRIP } from "@/lib/trip-data"

interface TopNavProps {
  tripTitle?: string
  inviteCode?: string
  members?: { initial: string; tone: string }[]
  readOnly?: boolean
}

export function TopNav({ tripTitle, inviteCode, members, readOnly }: TopNavProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const activeTitle = tripTitle || TRIP.title
  const activeInviteCode = inviteCode || TRIP.inviteCode
  const activeMembers = members || TRIP.members

  function handleCopy() {
    const link = typeof window !== "undefined" 
      ? `${window.location.origin}/join/${activeInviteCode}`
      : activeInviteCode
    navigator.clipboard?.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[#E2E2DA] bg-white px-4 py-3 shadow-sm sm:px-6 text-[#18181B]">
      <div className="flex min-w-0 items-center gap-3">
        {/* 로고 (클릭 시 대시보드 또는 홈 이동) */}
        <div 
          onClick={() => router.push(readOnly ? "/" : "/dashboard")}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition"
        >
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-sm"
          >
            <MapPin className="size-4.5" strokeWidth={2.4} />
          </span>
          <span className="text-base font-bold tracking-tight text-[#18181B]">WanderMap</span>
        </div>
        
        {/* 여행 타이틀 배지 */}
        <div className="hidden items-center gap-1.5 rounded-full bg-[#EDFAF4] px-3 py-1 text-xs font-semibold text-[#1A9E7A] sm:flex border border-[#b8eedf]">
          <Plane className="size-3.5" />
          <span className="max-w-[10rem] truncate">{activeTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* 멤버 아바타 */}
        <ul className="flex items-center" aria-label="여행 멤버">
          {activeMembers.map((m, i) => (
            <li
              key={m.initial}
              className={`flex size-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold ${m.tone}`}
              style={{ marginLeft: i === 0 ? 0 : -8, zIndex: activeMembers.length - i }}
            >
              {m.initial}
            </li>
          ))}
        </ul>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center justify-center p-2 rounded-xl border border-[#E2E2DA] hover:bg-slate-50 transition text-[#6B6B72]"
              title="대시보드로 가기"
            >
              <Home className="size-4.5" />
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl bg-[#1A9E7A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#158063] transition shadow-sm"
          >
            {copied ? <Check className="size-3.5" /> : <UserPlus className="size-3.5" />}
            <span>{copied ? "복사됨" : "초대 링크"}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
