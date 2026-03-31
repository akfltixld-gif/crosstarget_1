"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

const BENCHMARKS = [
  {
    category: "디스플레이 배너",
    metrics: [
      { label: "평균 CTR", value: "0.08%", sub: "업계 평균" },
      { label: "평균 CPM", value: "₩2,500", sub: "모바일 기준" },
    ],
  },
  {
    category: "동영상 광고",
    metrics: [
      { label: "평균 VTR", value: "28%", sub: "15초 기준" },
      { label: "평균 CPV", value: "₩45", sub: "조회당 단가" },
    ],
  },
  {
    category: "카카오 비즈보드",
    metrics: [
      { label: "평균 CTR", value: "0.35%", sub: "피드 지면" },
      { label: "평균 CPC", value: "₩180", sub: "클릭당 단가" },
    ],
  },
  {
    category: "앱 설치 캠페인",
    metrics: [
      { label: "평균 CVR", value: "3.2%", sub: "클릭→설치" },
      { label: "평균 CPI", value: "₩2,800", sub: "설치당 단가" },
    ],
  },
]

const TRENDS = [
  { icon: "📱", text: "국내 모바일 광고 시장 규모", value: "7.2조원", year: "2024" },
  { icon: "📈", text: "전년 대비 모바일 광고 성장률", value: "+12.4%", year: "2024" },
  { icon: "🎯", text: "전체 디지털 광고 중 모바일 비중", value: "68%", year: "2024" },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.")
      setLoading(false)
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen">
      {/* 좌측: 로그인 폼 */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-8 lg:w-[420px] lg:shrink-0">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex flex-col gap-1">
            <Image src="/logo/CrossTarget_BI.png" alt="CrossTarget" width={160} height={40} className="h-10 w-auto object-contain" priority />
            <p className="mt-2 text-xs text-gray-400">광고 운영 대시보드</p>
          </div>

          <h1 className="mb-1 text-xl font-bold text-gray-900">로그인</h1>
          <p className="mb-7 text-sm text-gray-400">계정 정보를 입력해주세요</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">이메일</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="name@company.com"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">비밀번호</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full rounded-xl bg-[#EF4F23] py-2.5 text-sm font-semibold text-white hover:bg-[#d94420] disabled:opacity-50 transition-colors"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="font-medium text-[#EF4F23] hover:underline">회원가입 신청</Link>
          </p>
        </div>
      </div>

      {/* 우측: 업계 벤치마크 */}
      <div className="hidden flex-1 flex-col bg-[#0f1729] px-12 py-12 lg:flex overflow-y-auto">
        {/* 로고 */}
        <div className="mb-10">
          <Image src="/logo/CrossTarget_BI_w.png" alt="CrossTarget" width={160} height={40} className="h-10 w-auto object-contain" />
          <p className="mt-2 text-xs text-white/40">광고 운영 대시보드</p>
        </div>

        {/* 헤더 */}
        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#EF4F23]">Industry Benchmark</p>
          <h2 className="text-2xl font-bold text-white">한국 모바일 광고 현황</h2>
          <p className="mt-1 text-xs text-white/40">출처: IAB Korea, 한국방송광고진흥공사 (2024)</p>
        </div>

        {/* 시장 트렌드 */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          {TRENDS.map((t, i) => (
            <div key={i} className="rounded-2xl bg-white/5 p-4">
              <p className="mb-2 text-xl">{t.icon}</p>
              <p className="text-lg font-bold text-[#EF4F23]">{t.value}</p>
              <p className="mt-1 text-xs leading-snug text-white/50">{t.text}</p>
              <p className="mt-1 text-xs text-white/25">{t.year}년 기준</p>
            </div>
          ))}
        </div>

        {/* 매체별 벤치마크 */}
        <div className="grid grid-cols-2 gap-4">
          {BENCHMARKS.map((b, i) => (
            <div key={i} className="rounded-2xl bg-white/5 p-5">
              <p className="mb-4 text-xs font-semibold text-white/60">{b.category}</p>
              <div className="space-y-3">
                {b.metrics.map((m, j) => (
                  <div key={j} className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-white/40">{m.label}</p>
                      <p className="text-xs text-white/25">{m.sub}</p>
                    </div>
                    <p className="text-xl font-bold text-white">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-8 text-xs text-white/20">
          © 2025 CrossTarget. All rights reserved.
        </div>
      </div>
    </div>
  )
}
