"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

interface NewsItem {
  title: string
  summary: string
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
  const [clippingUrl, setClippingUrl] = useState("")
  const [newsLoading, setNewsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/news")
      .then(r => r.json())
      .then(d => { setNews(d.items ?? []); setClippingUrl(d.clippingUrl ?? ""); setNewsLoading(false) })
      .catch(() => setNewsLoading(false))
  }, [])

  async function handleLogin(e: React.SyntheticEvent) {
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
      <div className="flex w-full flex-col items-center justify-center bg-white px-8 lg:w-[400px] lg:shrink-0 border-r border-gray-100">
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
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-[#EF4F23] focus:ring-2 focus:ring-orange-100 transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">비밀번호</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-[#EF4F23] focus:ring-2 focus:ring-orange-100 transition"
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

      {/* 우측: 마케팅 뉴스 */}
      <div className="hidden flex-1 flex-col bg-gray-50 lg:flex overflow-y-auto">
        <div className="flex flex-col h-full px-10 py-10">
          {/* 헤더 */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#EF4F23]">Daily Marketing News</p>
              <h2 className="text-2xl font-bold text-gray-900">오늘의 마케팅 뉴스</h2>
              {news.length > 0 && news[0].date && (
                <p className="mt-1 text-xs text-gray-400">{news[0].date} · 아이보스 뉴스클리핑</p>
              )}
            </div>
            {clippingUrl && (
              <a href={clippingUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-[#EF4F23] transition-colors flex items-center gap-1">
                전체보기
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          {/* 뉴스 카드 그리드 */}
          {newsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-white p-5 shadow-sm">
                  <div className="mb-3 h-3 w-1/4 rounded bg-gray-100" />
                  <div className="mb-2 h-4 w-full rounded bg-gray-100" />
                  <div className="h-4 w-3/4 rounded bg-gray-100" />
                  <div className="mt-3 h-3 w-full rounded bg-gray-100" />
                  <div className="mt-1 h-3 w-2/3 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : news.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-gray-400">뉴스를 불러올 수 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {news.map((item, i) => (
                <a key={i} href={clippingUrl || item.link} target="_blank" rel="noopener noreferrer"
                  className="group rounded-2xl bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4F23]/10 text-[10px] font-bold text-[#EF4F23]">
                      {i + 1}
                    </span>
                    <span className="text-xs text-gray-400">{item.source}</span>
                  </div>
                  <p className="text-sm font-semibold leading-snug text-gray-800 group-hover:text-[#EF4F23] transition-colors line-clamp-2 mb-2">
                    {item.title}
                  </p>
                  {item.summary && (
                    <p className="text-xs leading-relaxed text-gray-400 line-clamp-2 mt-auto">
                      {item.summary}
                    </p>
                  )}
                </a>
              ))}
            </div>
          )}

          <div className="mt-auto pt-8 text-xs text-gray-300">
            © 2025 CrossTarget. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  )
}
