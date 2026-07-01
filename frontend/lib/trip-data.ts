export type PlaceStatus = "confirmed" | "voting"

export type Place = {
  id: string
  order: number
  category: string
  name: string
  address: string
  status: PlaceStatus
  time?: string
  transit?: string
  votesUp: number
  votesDown: number
  // position on the stylized map, in %
  x: number
  y: number
}

export const TRIP = {
  title: "부산 식도락 여행",
  region: "부산광역시",
  dayLabel: "1일차 · 10월 24일",
  members: [
    { initial: "M", tone: "bg-[oklch(0.9_0.05_60)] text-[oklch(0.45_0.1_55)]" },
    { initial: "Y", tone: "bg-[oklch(0.9_0.05_230)] text-[oklch(0.42_0.1_250)]" },
    { initial: "K", tone: "bg-[oklch(0.92_0.05_150)] text-[oklch(0.4_0.09_160)]" },
  ],
  memberCount: 3,
  voteThreshold: 2, // 과반수 (2/3)
  inviteCode: "wandermap.kr/join/b3f9a2",
}

export const INITIAL_PLACES: Place[] = [
  {
    id: "p1",
    order: 1,
    category: "한식 · 돼지국밥",
    name: "쌍둥이돼지국밥",
    address: "부산 부산진구 서면로68번길 33",
    status: "confirmed",
    time: "11:00 · 약 50분",
    votesUp: 3,
    votesDown: 0,
    x: 27,
    y: 30,
  },
  {
    id: "p2",
    order: 2,
    category: "카페 · 디저트",
    name: "모모스커피 전포점",
    address: "부산 부산진구 전포대로209번길 16",
    status: "voting",
    time: "도보 9분",
    votesUp: 2,
    votesDown: 0,
    x: 47,
    y: 55,
  },
  {
    id: "p3",
    order: 3,
    category: "전망 · 산책",
    name: "황령산 봉수대 전망대",
    address: "부산 남구 황령산로 355",
    status: "confirmed",
    time: "차량 12분",
    votesUp: 3,
    votesDown: 0,
    x: 71,
    y: 38,
  },
]
