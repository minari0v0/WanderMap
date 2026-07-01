"use client"

import { useRouter } from "next/navigation"
import { Compass, ArrowRight, CheckCircle2, Map, Users, Sparkles } from "lucide-react"

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-dvh bg-[#F8F8F6] text-[#18181B] flex flex-col font-sans">
      
      {/* 상단 미니 헤더 */}
      <header className="max-w-5xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[50%_50%_50%_4px] bg-[#1A9E7A] text-white shadow-sm shadow-[#1A9E7A]/10">
            <Compass className="size-4.5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-[#18181B]">WanderMap</span>
        </div>
        
        <button 
          onClick={() => router.push("/login")}
          className="rounded-xl border border-[#E2E2DA] bg-white px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition"
        >
          로그인
        </button>
      </header>

      {/* 히어로 섹션 */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 flex flex-col items-center justify-center text-center py-16 md:py-24 space-y-8">
        
        {/* 문구 */}
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDFAF4] px-3 py-1 text-xs font-bold text-[#1A9E7A]">
            <Sparkles className="size-3.5" /> 2026년형 새로운 여행 협업 경험
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight max-w-2xl text-[#18181B]">
            엑셀로 싸우던 여행 계획,<br />
            이제 지도를 보며 함께 결정해요.
          </h1>
          <p className="text-sm md:text-base text-[#6B6B72] max-w-md mx-auto leading-relaxed">
            친구들과 동시에 실시간 장소 투표를 진행하고,<br />
            AI가 환각 없이 실제 데이터를 매핑하여 최적의 동선을 완성해 드립니다.
          </p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => router.push("/login")}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1A9E7A] px-7 py-4 text-sm font-bold text-white hover:bg-[#158063] transition shadow-md shadow-[#1A9E7A]/10"
          >
            3초 만에 시작하기 <ArrowRight className="size-4" />
          </button>
          
          <button
            onClick={() => router.push("/trips/view/999")}
            className="rounded-xl border border-[#E2E2DA] bg-white px-7 py-4 text-sm font-bold hover:bg-slate-50 transition"
          >
            데모 일정 구경하기
          </button>
        </div>

        {/* 핵심 가치 요약 */}
        <div className="grid gap-4 md:grid-cols-3 w-full pt-12">
          
          <div className="rounded-2xl border border-[#E2E2DA] bg-white p-6 text-left shadow-sm space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EDFAF4] text-[#1A9E7A] mb-2">
              <Users className="size-5" />
            </div>
            <h3 className="font-bold text-sm text-[#18181B]">실시간 그룹 투표</h3>
            <p className="text-xs text-[#6B6B72] leading-relaxed">
              의견 대립은 이제 그만. 실시간 찬반 투표를 통해 멤버 과반수가 찬성하면 즉시 일정이 지도에 핀으로 연결됩니다.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2E2DA] bg-white p-6 text-left shadow-sm space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EDFAF4] text-[#1A9E7A] mb-2">
              <Map className="size-5" />
            </div>
            <h3 className="font-bold text-sm text-[#18181B]">환각 없는 AI 동선</h3>
            <p className="text-xs text-[#6B6B72] leading-relaxed">
              Gemini로 멤버들의 취향 의도만 영리하게 구조화한 후, 실제 장소 검색과 거리 이동 연산은 네이버 API 실데이터로 연결합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2E2DA] bg-white p-6 text-left shadow-sm space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EDFAF4] text-[#1A9E7A] mb-2">
              <CheckCircle2 className="size-5" />
            </div>
            <h3 className="font-bold text-sm text-[#18181B]">비회원 관람 뷰어</h3>
            <p className="text-xs text-[#6B6B72] leading-relaxed">
              로그인하지 않아도 최종 완성된 우리들의 여행 코스를 멋지게 시각화된 전용 페이지 링크로 누구나 간편하게 볼 수 있습니다.
            </p>
          </div>

        </div>

      </main>

      {/* 푸터 */}
      <footer className="border-t border-[#E2E2DA] bg-white/50 py-8 text-center text-xs text-[#6B6B72] backdrop-blur-sm mt-16">
        <p>© 2026 WanderMap. All rights reserved.</p>
      </footer>

    </div>
  )
}
