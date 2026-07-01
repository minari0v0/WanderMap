"use client"

import { Check, Copy, MapPin, Plane, UserPlus } from "lucide-react"
import { useState } from "react"
import { TRIP } from "@/lib/trip-data"

interface TopNavProps {
  tripTitle?: string
  inviteCode?: string
  members?: { initial: string; tone: string }[]
}

export function TopNav({ tripTitle, inviteCode, members }: TopNavProps) {
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
    <header className="flex items-center justify-between gap-4 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-primary text-primary-foreground shadow-sm"
          >
            <MapPin className="size-4.5" strokeWidth={2.4} />
          </span>
          <span className="text-lg font-bold tracking-tight">WanderMap</span>
        </div>
        <div className="hidden items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground sm:flex">
          <Plane className="size-3.5" />
          <span className="max-w-[10rem] truncate">{activeTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ul className="flex items-center" aria-label="여행 멤버">
          {activeMembers.map((m, i) => (
            <li
              key={m.initial}
              className={`flex size-8 items-center justify-center rounded-full border-2 border-card text-xs font-semibold ${m.tone}`}
              style={{ marginLeft: i === 0 ? 0 : -8, zIndex: activeMembers.length - i }}
            >
              {m.initial}
            </li>
          ))}
        </ul>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          {copied ? <Check className="size-4" /> : <UserPlus className="size-4" />}
          <span className="hidden sm:inline">{copied ? "링크 복사됨" : "초대 링크 복사"}</span>
        </button>
      </div>
    </header>
  )
}
