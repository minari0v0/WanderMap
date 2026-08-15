"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Check } from "lucide-react"

const WORDS = ["지도를 보며", "싸우지 않고", "투표로 쉽게", "AI 추천으로"]

export function Hero() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % WORDS.length)
        setFade(true)
      }, 250)
    }, 2600)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6 text-left">
      {/* 헤드라인 + 글자 겹침 없는 자연스러운 gap-x 애니메이션 */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-[1.25] text-[#18181B] break-keep">
        <span className="block mb-1.5">엑셀로 싸우던 여행 계획,</span>
        <span className="inline-flex items-baseline gap-x-2.5 whitespace-nowrap">
          <span
            className={`inline-block text-[#1A9E7A] transition-all duration-250 transform ${
              fade ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1.5"
            }`}
          >
            {WORDS[index]}
          </span>
          <span>함께 결정해요.</span>
        </span>
      </h1>

      <p className="text-sm sm:text-base text-[#4A4A52] max-w-lg leading-relaxed break-keep">
        가고 싶은 곳을 올리고 실시간 찬반 투표로 빠르게 조율하세요.
        모두의 취향을 분석해 최적의 이동 동선까지 한 번에 완성해 드립니다.
      </p>

      {/* 액션 버튼 */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          onClick={() => router.push("/login")}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#1A9E7A] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#158063] transition shadow-lg shadow-[#1A9E7A]/25 hover:shadow-xl hover:shadow-[#1A9E7A]/30"
        >
          3초 만에 시작하기 <ArrowRight className="size-4" />
        </button>

        <button
          onClick={() => router.push("/trips/view/999")}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#E2E2DA] bg-white/90 backdrop-blur-sm px-6 py-3.5 text-sm font-bold text-[#18181B] hover:bg-white transition shadow-sm"
        >
          데모 일정 구경하기
        </button>
      </div>

      {/* 체크포인트 */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#E2E2DA]/60 text-xs text-[#52525B]">
        <div className="flex items-center gap-1.5 font-medium">
          <Check className="size-3.5 text-[#1A9E7A] stroke-[3]" /> 카카오 간편 로그인
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <Check className="size-3.5 text-[#1A9E7A] stroke-[3]" /> 실시간 과반수 투표
        </div>
        <div className="flex items-center gap-1.5 font-medium">
          <Check className="size-3.5 text-[#1A9E7A] stroke-[3]" /> 비회원 공유 뷰
        </div>
      </div>
    </div>
  )
}
