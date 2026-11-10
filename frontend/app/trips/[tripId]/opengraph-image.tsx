import { ImageResponse } from "next/og"

export const alt = "WanderMap 여행 일정 미리보기"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

function truncateTitle(title: string, maxLen = 22): string {
  const clean = (title || "우리들의 여행 일정").trim()
  if (clean.length <= maxLen) return clean
  return `${clean.slice(0, maxLen)}...`
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ tripId: string }>
}) {
  const { tripId } = await params
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
  const isNumeric = /^\d+$/.test(tripId)
  const endpoint = isNumeric
    ? `${apiBase}/api/trips/${tripId}`
    : `${apiBase}/api/trips/invite/${encodeURIComponent(tripId)}`

  let tripTitle = "함께 만드는 여행 일정"
  let destination = "WanderMap"
  let dateLabel = "여행 동선 플래너 & 다이어리"

  try {
    const res = await fetch(endpoint, { next: { revalidate: 30 } })
    if (res.ok) {
      const trip = await res.json()
      if (trip?.title) tripTitle = trip.title
      if (trip?.destination) destination = trip.destination
      if (trip?.startDate && trip?.endDate) {
        dateLabel = `${trip.startDate} ~ ${trip.endDate}`
      }
    }
  } catch {}

  const displayTitle = truncateTitle(tripTitle, 22)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px",
          background: "linear-gradient(135deg, #F7F7F2 0%, #EDFAF4 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* 상단: 원더맵 로고 배지 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "24px 24px 24px 6px",
              background: "#1A9E7A",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 900,
            }}
          >
            W
          </div>
          <span
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: "#18181B",
              letterSpacing: "-0.02em",
            }}
          >
            WanderMap
          </span>
        </div>

        {/* 정중앙: 여행 일정 제목 (길어지면 ... 처리) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            background: "#FFFFFF",
            borderRadius: "36px",
            border: "2px solid #E2E2DA",
            padding: "56px 48px",
            boxShadow: "0 20px 45px rgba(24, 24, 27, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "8px 20px",
              borderRadius: "999px",
              background: "#EDFAF4",
              color: "#1A9E7A",
              fontSize: "22px",
              fontWeight: 800,
              marginBottom: "20px",
            }}
          >
            {destination}
          </div>
          <div
            style={{
              fontSize: "54px",
              fontWeight: 900,
              color: "#18181B",
              lineHeight: 1.2,
              maxWidth: "920px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayTitle}
          </div>
          <div
            style={{
              marginTop: "18px",
              fontSize: "24px",
              fontWeight: 600,
              color: "#6B6B72",
            }}
          >
            {dateLabel}
          </div>
        </div>

        {/* 하단 캡션 */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: "20px",
            fontWeight: 700,
            color: "#1A9E7A",
          }}
        >
          여행 동선 플래너 & 여행 다이어리
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}

