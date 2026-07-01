"use client"

import { MapPin, MessageCircle, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react"
import { useState } from "react"
import { TRIP, type Place } from "@/lib/trip-data"

export function ItineraryPanel({
  places,
  activeId,
  onSelect,
  onVote,
}: {
  places: Place[]
  activeId: string | null
  onSelect: (id: string) => void
  onVote: (id: string, dir: "up" | "down") => void
}) {
  return (
    <section
      aria-label="실시간 동선 조율"
      className="flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* header */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3.5">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
          </span>
          실시간 동선 조율
        </h2>
        <button className="flex items-center gap-1 rounded-full border border-warn/40 bg-warn-surface px-2.5 py-1 text-xs font-medium text-warn-foreground transition-colors hover:brightness-98">
          <Sparkles className="size-3.5" />
          AI 긴급 우회
        </button>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        <span className="w-fit rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {TRIP.dayLabel}
        </span>

        {places.map((p) => (
          <PlaceCard
            key={p.id}
            place={p}
            active={activeId === p.id}
            onSelect={() => onSelect(p.id)}
            onVote={(dir) => onVote(p.id, dir)}
          />
        ))}
      </div>

      {/* chat input */}
      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 py-1.5 pl-4 pr-1.5"
        >
          <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="채팅 또는 다음 장소 검색..."
          />
          <button
            type="submit"
            aria-label="전송"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Sparkles className="size-4" />
          </button>
        </form>
      </div>
    </section>
  )
}

function PlaceCard({
  place,
  active,
  onSelect,
  onVote,
}: {
  place: Place
  active: boolean
  onSelect: () => void
  onVote: (dir: "up" | "down") => void
}) {
  const isVoting = place.status === "voting"
  const reached = place.votesUp >= TRIP.voteThreshold

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border p-3.5 text-left transition-all ${
        active
          ? "border-primary/60 bg-accent shadow-sm ring-1 ring-primary/20"
          : isVoting
            ? "border-warn/40 bg-warn-surface/40"
            : "border-border bg-card hover:bg-secondary/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            isVoting ? "bg-warn text-warn-foreground" : "bg-pin text-pin-foreground"
          }`}
        >
          {isVoting ? "?" : place.order}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{place.category}</span>
            {isVoting ? (
              <span className="shrink-0 rounded-md bg-warn/25 px-2 py-0.5 text-[11px] font-medium text-warn-foreground">
                투표 진행 중
              </span>
            ) : (
              <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                확정됨
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-semibold">{place.name}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{place.address}</span>
          </p>
          {place.time && (
            <p className="mt-1 text-[11px] text-muted-foreground">{place.time}</p>
          )}

          {isVoting && (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onVote("up")
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation()
                      onVote("up")
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <ThumbsUp className="size-4" />
                  {place.votesUp}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onVote("down")
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation()
                      onVote("down")
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
                >
                  <ThumbsDown className="size-4" />
                  {place.votesDown}
                </span>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {reached ? (
                  <span className="font-medium text-primary">과반수 달성 · 동선 확정 대기</span>
                ) : (
                  <>과반수({TRIP.voteThreshold}/{TRIP.memberCount}) 찬성 시 동선 확정</>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </button>
  )
}
