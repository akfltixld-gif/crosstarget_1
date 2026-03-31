"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface NewsItem {
  title: string
  summary: string
  link: string
  source: string
  date: string
  keyword?: string
}

function NewsPopup({ onClose }: { onClose: () => void }) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/news")
      .then(r => r.json())
      .then(d => { setNews(d.items ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div ref={ref} className="relative mr-4 mt-14 w-[520px] max-h-[80vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#EF4F23]">Daily News</p>
            <h3 className="text-base font-bold text-gray-900">오늘의 마케팅/AI 뉴스</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 뉴스 리스트 */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="mb-2 h-3 w-1/4 rounded bg-gray-100" />
                  <div className="h-4 w-full rounded bg-gray-100" />
                  <div className="mt-1 h-4 w-3/4 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : news.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">뉴스를 불러올 수 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {news.map((item, i) => (
                <li key={i} className="group py-3.5">
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="mb-1.5 flex items-center gap-2">
                      {item.keyword && (
                        <span className="rounded-full bg-[#EF4F23]/10 px-2 py-0.5 text-[10px] font-semibold text-[#EF4F23]">
                          #{item.keyword}
                        </span>
                      )}
                      {item.source && <span className="text-xs text-gray-400">{item.source}</span>}
                      {item.date && <span className="ml-auto text-xs text-gray-300">{item.date}</span>}
                    </div>
                    <p className="text-sm font-medium leading-snug text-gray-800 group-hover:text-[#EF4F23] transition-colors line-clamp-2">
                      {item.title}
                    </p>
                    {item.summary && (
                      <p className="mt-1 text-xs leading-relaxed text-gray-400 line-clamp-2">{item.summary}</p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TopBar() {
  const pathname = usePathname()
  const [showNews, setShowNews] = useState(false)

  return (
    <>
      <header className="flex h-11 shrink-0 items-center justify-end gap-2 border-b border-gray-200 bg-white px-6">
        {/* 뉴스 버튼 */}
        <button
          onClick={() => setShowNews(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-orange-50 hover:text-[#EF4F23] transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 12h6m-6 4h.01" />
          </svg>
          오늘의 마케팅/AI 뉴스
        </button>

        {/* 회원 승인 관리 */}
        <Link
          href="/admin"
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            pathname === "/admin"
              ? "bg-blue-50 text-blue-700"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          회원 승인 관리
        </Link>
      </header>

      {showNews && <NewsPopup onClose={() => setShowNews(false)} />}
    </>
  )
}
