"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

interface NewsItem {
  title: string
  link: string
  source: string
  date: string
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [news, setNews]         = useState<NewsItem[]>([])
  const [newsLoading, setNewsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/news")
      .then(r => r.json())
      .then(d => { setNews(d.items ?? []); setNewsLoading(false) })
      .catch(() => setNewsLoading(false))
  }, [])

  async function handleLogin(e: React.FormEvent) {
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

      {/* 우측: 뉴스 피드 */}
      <div className="hidden flex-1 flex-col bg-[#0f1729] px-12 py-12 lg:flex overflow-y-auto">
        {/* 로고 */}
        <div className="mb-10">
          <Image src="/logo/CrossTarget_BI_w.png" alt="CrossTarget" width={160} height={40} className="h-10 w-auto object-contain" />
          <p className="mt-2 text-xs text-white/40">광고 운영 대시보드</p>
        </div>

        {/* 헤더 */}
        <div className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#EF4F23]">Industry News</p>
          <h2 className="text-2xl font-bold text-white">마케팅 최신 뉴스</h2>
          <p className="mt-1 text-xs text-white/40">출처: 아이보스 (i-boss.co.kr)</p>
        </div>

        {newsLoading ? (
          <div className="space-y-5">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="mb-2 h-4 w-4/5 rounded bg-white/10" />
                <div className="h-3 w-1/4 rounded bg-white/5" />
              </div>
            ))}
          </div>
        ) : news.length === 0 ? (
          <p className="text-sm text-white/40">뉴스를 불러올 수 없습니다.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {news.map((item, i) => (
              <li key={i} className="group py-4">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                  <p className="text-sm font-medium leading-snug text-white/85 group-hover:text-[#EF4F23] transition-colors line-clamp-2">
                    {item.title}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-white/30">
                    <span>{item.source}</span>
                    {item.date && <><span>·</span><span>{item.date}</span></>}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-8 text-xs text-white/20">
          © 2025 CrossTarget. All rights reserved.
        </div>
      </div>
    </div>
  )
}
