"use client"

import { useRouter } from "next/navigation"
import { Compass, Users, MapPin, ThumbsUp, ThumbsDown, Plane, ArrowRight, Plus } from "lucide-react"
import { GradientBackground } from "@/components/ui/jade-sky"
import { Hero } from "@/components/ui/animated-hero"
import { Badge } from "@/components/ui/badge"

export default function HomePage() {
  const router = useRouter()

  return (
    <GradientBackground className="min-h-screen text-[#18181B] font-sans flex flex-col justify-between">
      <div className="flex flex-col min-h-screen justify-between">
        {/* 상단 앱 네비게이션 헤더 */}
        <header className="max-w-6xl w-full mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-sm shadow-[#1A9E7A]/20">
              <Compass className="size-4.5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-[#18181B]">WanderMap</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/login")}
              className="rounded-xl border border-[#E2E2DA] bg-white/90 backdrop-blur-sm px-4 py-2 text-xs font-semibold hover:bg-white transition text-[#18181B]"
            >
              로그인
            </button>
            <button
              onClick={() => router.push("/login")}
              className="rounded-xl bg-[#1A9E7A] px-4 py-2 text-xs font-bold text-white hover:bg-[#158063] transition shadow-sm"
            >
              새 여행 만들기
            </button>
          </div>
        </header>

        {/* 메인 작업/시작 영역 */}
        <main className="max-w-6xl w-full mx-auto px-6 py-6 md:py-12 flex-1 flex flex-col justify-center">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-8 items-center">
            {/* 좌측: 타이틀 및 액션 */}
            <Hero />

            {/* 우측: 실제 여행 워크스페이스 목업 카드 */}
            <div className="relative">
              <div className="relative rounded-3xl border border-[#E2E2DA] bg-white/95 backdrop-blur-md p-6 shadow-xl space-y-4">
                {/* 목업 헤더 */}
                <div className="flex items-center justify-between border-b border-[#E2E2DA]/70 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-[#EDFAF4] text-[#1A9E7A]">
                      <Plane className="size-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-[#18181B]">제주도 동쪽 힐링 코스 🌴</h4>
                      <p className="text-[11px] text-[#6B6B72]">1일차 일정 · 3명 참여 중</p>
                    </div>
                  </div>
                  <Badge variant="live">실시간 투표 중</Badge>
                </div>

                {/* 실시간 투표 진행 카드 */}
                <div className="rounded-2xl border border-[#F3E2B8] bg-[#FFFBF0]/70 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-[#9A6B00]">카페 / 디저트</span>
                      <h5 className="text-sm font-bold text-[#18181B]">런던 베이글 뮤지엄 제주</h5>
                      <p className="text-[11px] text-[#6B6B72] flex items-center gap-1">
                        <MapPin className="size-3 text-[#1A9E7A]" /> 제주시 구좌읍 동복리
                      </p>
                    </div>
                    <Badge variant="voting">투표 진행 중</Badge>
                  </div>

                  {/* 찬반 투표 버튼 */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-[#1A9E7A]/40 bg-[#EDFAF4] py-2 text-xs font-bold text-[#1A9E7A]">
                      <ThumbsUp className="size-3.5" /> 찬성 2
                    </div>
                    <div className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E2E2DA] bg-white py-2 text-xs font-semibold text-[#6B6B72]">
                      <ThumbsDown className="size-3.5" /> 반대 0
                    </div>
                  </div>

                  <p className="text-center text-[10px] font-semibold text-[#1A9E7A]">
                    ✓ 과반수(2/3) 달성 · 동선 자동 확정 대기
                  </p>
                </div>

                {/* 확정된 동선 카드 */}
                <div className="rounded-2xl border border-[#E2E2DA] bg-white p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-[#1A9E7A] text-white text-xs font-bold">
                      2
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-[#18181B]">비자림 숲길 산책</h5>
                      <p className="text-[10px] text-[#6B6B72]">차량 15분 이동</p>
                    </div>
                  </div>
                  <Badge variant="confirmed">확정됨</Badge>
                </div>

                {/* 방 입장 버튼 */}
                <button
                  onClick={() => router.push("/trips/view/999")}
                  className="w-full flex items-center justify-center gap-1 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
                >
                  이 여행 방 바로 둘러보기 <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* 푸터 */}
        <footer className="w-full border-t border-[#E2E2DA]/80 bg-white/50 py-5 text-center text-xs text-[#6B6B72] backdrop-blur-md">
          <p>© 2026 WanderMap. All rights reserved.</p>
        </footer>
      </div>
    </GradientBackground>
  )
}
