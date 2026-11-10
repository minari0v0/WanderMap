"use client"

import { Compass } from "lucide-react"
import type { Place } from "@/lib/trip-data"

export function MapView({
  places,
  activeId,
  onSelect,
  destination,
}: {
  places: Place[]
  activeId: string | null
  onSelect: (id: string) => void
  destination?: string
}) {
  const points = places.map((p) => `${p.x},${p.y}`).join(" ")

  return (
    <section
      aria-label="동선 지도"
      className="relative h-full w-full overflow-hidden bg-map select-none"
    >
      {/* street grid */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent calc(50% - 4px), var(--map-road) calc(50% - 4px), var(--map-road) calc(50% + 4px), transparent calc(50% + 4px)), linear-gradient(0deg, transparent calc(50% - 4px), var(--map-road) calc(50% - 4px), var(--map-road) calc(50% + 4px), transparent calc(50% + 4px))",
          backgroundSize: "96px 96px",
        }}
      />
      {/* diagonal main road */}
      <div
        aria-hidden
        className="absolute -left-10 top-[34%] h-6 w-[140%] -rotate-6 rounded-full bg-map-road"
      />
      {/* park block */}
      <div
        aria-hidden
        className="absolute left-[10%] top-[16%] size-28 rounded-3xl bg-primary/12"
      />
      {/* coastline / river band */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[34%] bg-map-river"
        style={{
          clipPath:
            "polygon(0 44%, 24% 28%, 55% 48%, 82% 32%, 100% 44%, 100% 100%, 0 100%)",
        }}
      />

      {/* 상단 좌측 Google Maps 상태 배지 */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-[#E2E2DA] bg-white/95 px-3.5 py-1.5 text-xs font-bold text-[#27272A] shadow-xs backdrop-blur-xs">
        <Compass className="size-3.5 text-[#1A9E7A]" />
        <span>{destination ? `${destination} 동선 지도` : "Google Maps 동선 지도"}</span>
      </div>

      {/* route + pins */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={0.8}
          strokeDasharray="2 1.6"
          strokeLinecap="round"
          opacity={0.75}
        />
      </svg>

      {places.map((p, idx) => {
        const isActive = activeId === p.id
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none cursor-pointer group"
            style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: isActive ? 30 : 10 }}
            aria-label={p.name}
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute left-1/2 top-1/2 -z-10 size-12 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-[#1A9E7A]/35"
              />
            )}
            <span
              className={`flex items-center justify-center rounded-full border-2 border-white text-sm font-extrabold shadow-md transition-transform ${
                isActive
                  ? "size-10 scale-110 bg-[#1A9E7A] text-white"
                  : "size-8 bg-[#18181B] text-white group-hover:scale-105"
              }`}
            >
              {idx + 1}
            </span>
            <span
              className={`absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-xl border px-2.5 py-1 text-xs font-bold shadow-xs transition ${
                isActive
                  ? "border-[#1A9E7A] bg-white text-[#18181B]"
                  : "border-[#E2E2DA] bg-white/95 text-[#52525B]"
              }`}
            >
              {p.name}
            </span>
          </button>
        )
      })}
    </section>
  )
}
