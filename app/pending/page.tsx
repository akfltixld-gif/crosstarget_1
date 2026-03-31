"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function PendingPage() {
  const router = useRouter()

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push("/login")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">승인 대기 중</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          관리자가 계정을 검토 중입니다.<br />
          승인이 완료되면 로그인하실 수 있습니다.
        </p>
        <button
          onClick={handleLogout}
          className="mt-6 w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
