"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { tripService } from "@/lib/trip-service"
import { authService } from "@/lib/auth-service"

interface JoinPageProps {
  params: Promise<{ inviteCode: string }>
}

export default function JoinPage({ params }: JoinPageProps) {
  const router = useRouter()
  const { inviteCode } = use(params)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function join() {
      const session = authService.getSession()
      if (!session) {
        router.replace(`/login?redirect=/join/${encodeURIComponent(inviteCode)}`)
        return
      }

      try {
        const response = await tripService.joinTrip(inviteCode, session.id)
        router.replace(`/trips/${response.inviteCode || response.id}`)
      } catch (err: any) {
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            "초대 링크가 올바르지 않거나 합류할 수 없습니다."
        )
      }
    }
    join()
  }, [inviteCode, router])

  return (
    <div className="flex h-dvh items-center justify-center bg-[#F7F7F2] text-slate-500">
      <div className="text-center space-y-4 px-4">
        {error ? (
          <div className="space-y-3 bg-white p-6 rounded-3xl border border-[#E2E2DA] shadow-xs max-w-sm mx-auto">
            <p className="text-sm font-bold text-rose-600">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="rounded-xl bg-[#18181B] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#27272A] transition cursor-pointer"
            >
              플래너 홈으로 돌아가기
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1A9E7A] border-t-transparent mx-auto"></div>
            <p className="text-sm font-bold text-[#52525B]">
              초대 코드를 확인하고 여정에 합류하는 중...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
