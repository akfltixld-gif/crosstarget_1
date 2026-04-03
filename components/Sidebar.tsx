"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface SubItem {
  label: string
  href: string
}

interface SubSection {
  label: string
  items: SubItem[]
}

interface NavItem {
  label: string
  sections?: SubSection[]
  items?: SubItem[]
}

const navItems: NavItem[] = [
  {
    label: "정산 리포트",
    items: [
      { label: "DMP 수수료", href: "/settlement/dmp-fee" },
    ],
  },
  {
    label: "캠페인 리포트",
    sections: [
      {
        label: "CT/CTV",
        items: [
          { label: "종료 리포트", href: "/campaign/ct-ctv/final" },
        ],
      },
      {
        label: "CT+",
        items: [
          { label: "데일리 리포트", href: "/campaign/ct-plus/daily" },
          { label: "종료 리포트", href: "/campaign/ct-plus/final" },
          { label: "캠페인 집행 현황", href: "/campaign/ct-plus/status" },
        ],
      },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [openMenus, setOpenMenus]       = useState<string[]>([])
  const [openSections, setOpenSections] = useState<string[]>([])

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push("/login")
  }

  function toggleMenu(label: string) {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  function toggleSection(label: string) {
    setOpenSections((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    )
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r border-gray-200 bg-white">
      {/* 로고 */}
      <div className="border-b border-gray-100 px-5 py-4 space-y-1">
        <Image src="/logo/CrossTarget_BI.png" alt="CrossTarget" width={140} height={36} className="h-8 w-auto object-contain" priority />
        <p className="text-xs font-semibold text-gray-700">광고 운영 대시보드</p>
      </div>

      {/* 단독 링크 */}
      <div className="px-3 pt-3 space-y-0.5">
        <Link
          href="/campaign/ct-ctv/analysis"
          className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === "/campaign/ct-ctv/analysis"
              ? "bg-blue-50 font-medium text-blue-700"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          데이터 분석 대시보드
        </Link>
        <Link
          href="/campaign/ct-plus/creative-check"
          className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname === "/campaign/ct-plus/creative-check"
              ? "bg-blue-50 font-medium text-blue-700"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          소재 및 랜딩URL 확인
        </Link>
        <Link
          href="/mockup"
          className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
            pathname.startsWith("/mockup")
              ? "bg-blue-50 font-medium text-blue-700"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          목업 게재 이미지 생성
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.map((nav) => (
          <div key={nav.label}>
            {/* 상위 메뉴 버튼 */}
            <button
              onClick={() => toggleMenu(nav.label)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>{nav.label}</span>
              <svg
                className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                  openMenus.includes(nav.label) ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 하위 메뉴 */}
            {openMenus.includes(nav.label) && (
              <div className="ml-2 mt-1 space-y-0.5">
                {/* 단순 아이템 목록 */}
                {nav.items?.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                      pathname === item.href
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    <span className="mr-2 text-gray-300">·</span>
                    {item.label}
                  </Link>
                ))}

                {/* 섹션이 있는 경우 (CT/CTV, CT+) */}
                {nav.sections?.map((section) => (
                  <div key={section.label}>
                    <button
                      onClick={() => toggleSection(section.label)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      <span>{section.label}</span>
                      <svg
                        className={`h-3 w-3 transition-transform duration-200 ${
                          openSections.includes(section.label) ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {openSections.includes(section.label) && (
                      <div className="ml-2 space-y-0.5">
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                              pathname === item.href
                                ? "bg-blue-50 font-medium text-blue-700"
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                            }`}
                          >
                            <span className="mr-2 text-gray-300">·</span>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* 하단 로그아웃 */}
      <div className="border-t border-gray-100 px-3 py-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          로그아웃
        </button>
      </div>
    </aside>
  )
}
