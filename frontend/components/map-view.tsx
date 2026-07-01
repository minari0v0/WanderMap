"use client"

import { Home, Layers, Zap } from "lucide-react"
import type { Place } from "@/lib/trip-data"

export function MapView({
  places,
  activeId,
  onSelect,
}: {
  places: Place[]
  activeId: string | null
  onSelect: (id: string) => void
}) {
  // route points in order for the polyline
  const points = places.map((p) => `${p.x},${p.y}`).join(" ")

  return (
    <section
      aria-label="동선 지도"
      className="relative min-h-[340px] flex-1 overflow-hidden rounded-2xl border border-border bg-map"
    >
      {/* street grid */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent calc(50% - 4px), var(--map-road) calc(50% - 4px), var(--map-road) calc(50% + 4px), transparent calc(50% + 4px)), linear-gradient(0deg, transparent calc(50% - 4px), var(--map-road) calc(50% - 4px), var(--map-road) calc(50% + 4px), transparent calc(50% + 4px))",
          backgroundSize: "92px 92px",
        }}
      />
      {/* diagonal main road */}
      <div
        aria-hidden
        className="absolute -left-10 top-[30%] h-5 w-[140%] -rotate-6 rounded-full bg-map-road"
      />
      {/* park block */}
      <div
        aria-hidden
        className="absolute left-[10%] top-[14%] size-24 rounded-2xl bg-primary/12"
      />
      {/* coastline / sea band (부산 앞바다) */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[32%] bg-map-river"
        style={{ clipPath: "polygon(0 46%, 22% 30%, 55% 50%, 80% 34%, 100% 46%, 100% 100%, 0 100%)" }}
      />

      {/* API region badge */}
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
        <Layers className="size-3.5 text-primary" />
        Naver Maps API 렌더링 영역
      </div>

      {/* route + pins */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={0.7}
          strokeDasharray="2 1.6"
          strokeLinecap="round"
          opacity={0.65}
        />
      </svg>

      {places.map((p) => {
        const isActive = activeId === p.id
        const isVoting = p.status === "voting"
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
            style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: isActive ? 30 : 10 }}
            aria-label={`${p.name}${isVoting ? " (투표 진행 중)" : ""}`}
          >
            {isActive && (
              <span
                aria-hidden
                className={`absolute left-1/2 top-1/2 -z-10 size-11 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full ${
                  isVoting ? "bg-warn/40" : "bg-primary/40"
                }`}
              />
            )}
            <span
              className={`flex items-center justify-center rounded-full border-2 border-card text-xs font-bold shadow-md transition-transform ${
                isActive ? "size-9 scale-110" : "size-7"
              } ${
                isVoting
                  ? "bg-warn text-warn-foreground"
                  : "bg-pin text-pin-foreground"
              }`}
            >
              {isVoting ? "?" : p.order}
            </span>
            {isVoting && (
              <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-card/95 px-2.5 py-1 text-[11px] font-medium shadow-sm">
                투표중: {p.name}
              </span>
            )}
          </button>
        )
      })}

      {/* floating controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <button
          aria-label="현재 위치"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-secondary"
        >
          <Home className="size-4" />
        </button>
        <button className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-secondary">
          <Zap className="size-4 text-primary" />
          도보 최적화 셔틀
        </button>
      </div>
    </section>
  )
}
