"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { tripService } from "@/lib/trip-service"

interface JoinPageProps {
  params: Promise<{ inviteCode: string }>
}

export default function JoinPage({ params }: JoinPageProps) {
  const router = useRouter()
  const { inviteCode } = use(params)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function join() {
      try {
        const response = await tripService.joinTrip(inviteCode, 1) // 임시 테스터 ID 1
        router.push(`/trips/${response.id}`)
      } catch (err: any) {
        setError(err.response?.data?.message || "초대 링크가 올바르지 않거나 합류할 수 없습니다.")
      }
    }
    join()
  }, [inviteCode, router])

  return (
    <div className="flex h-dvh items-center justify-center bg-background text-slate-500">
      <div className="text-center space-y-4">
        {error ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-red-500">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              홈으로 돌아가기
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent mx-auto"></div>
            <p className="text-sm font-medium">초대 코드를 검증하고 방에 참여하는 중...</p>
          </div>
        )}
      </div>
    </div>
  )
}
