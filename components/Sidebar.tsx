"use client"

import { useState } from "react"
import Link from "next/link"
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
      { label: "대행사별 대행수수료", href: "/settlement/agency-fee" },
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
      <div className="border-b border-gray-100 px-5 py-4 space-y-2">
        <svg viewBox="0 0 112 26" xmlns="http://www.w3.org/2000/svg" className="h-7 w-auto">
          <g>
            <g>
              <path fill="#EF4F23" d="M47,17.292h7.046v1.74h-2.462v6.436h-2.123v-6.436h-2.462L47,17.292L47,17.292z"/>
              <path fill="#EF4F23" d="M57.28,25.468l2.721-8.176h2.925l2.71,8.176h-2.315l-0.491-1.604h-2.738l-0.485,1.604H57.28z M62.333,22.239l-0.841-2.744h-0.068l-0.836,2.744H62.333z"/>
              <path fill="#EF4F23" d="M70.153,17.292h3.477c1.829,0,3.026,1.039,3.026,2.767c0,1.129-0.519,1.926-1.401,2.343l1.671,3.066h-2.337l-1.451-2.721h-0.841v2.721h-2.145L70.153,17.292L70.153,17.292z M73.133,21.064c0.807,0,1.282-0.293,1.276-1.005c0.005-0.722-0.468-1.044-1.276-1.05h-0.836v2.055L73.133,21.064L73.133,21.064z"/>
              <path fill="#EF4F23" d="M85.294,19.054c-1.141,0-1.807,0.853-1.807,2.315c0,1.468,0.621,2.331,1.795,2.337c1.016-0.006,1.547-0.485,1.559-1.243h-1.513v-1.536h3.591v1.118c0,2.224-1.524,3.535-3.659,3.535c-2.372,0-3.98-1.598-3.986-4.19c0.005-2.686,1.773-4.211,3.975-4.211c1.919,0,3.399,1.163,3.579,2.8h-2.179C86.502,19.393,86.011,19.054,85.294,19.054z"/>
              <path fill="#EF4F23" d="M93.695,17.292h5.838v1.74H95.84v1.479h3.387v1.739H95.84v1.479h3.681v1.739h-5.827L93.695,17.292L93.695,17.292z"/>
              <path fill="#EF4F23" d="M104.127,17.292h7.046v1.74h-2.462v6.436h-2.123v-6.436h-2.462L104.127,17.292L104.127,17.292z"/>
            </g>
            <path fill="#1F2353" d="M33.242,1.443c-2.297-0.915-4.811-1.176-7.237-0.741c-2.037,0.349-3.987,1.219-5.591,2.527c-0.563,1.525-1.084,3.006-1.647,4.531c-0.39-0.392-0.823-0.784-1.344-1.089c-0.997,1.743-1.56,3.748-1.647,5.751c-0.087,2.352,0.477,4.705,1.647,6.753c1.56-0.349,3.163-0.697,4.724-1.002c-0.563,1.525-1.127,3.049-1.69,4.574c2.124,1.699,4.811,2.658,7.542,2.744c3.034,0.087,6.111-0.915,8.495-2.876c2.124-1.743,3.597-4.226,4.16-6.883c0.737-3.355,0.043-7.014-1.907-9.846C37.403,3.883,35.453,2.358,33.242,1.443z M35.365,17.083c-1.171,1.743-3.034,2.962-5.071,3.398c-2.341,0.522-4.854,0.13-6.848-1.219c-1.473-0.959-2.558-2.483-2.991-4.182c-0.39-1.351-0.39-2.832,0.043-4.182l0.043,0.044c-0.217-1.002-0.694-1.917-1.344-2.701c-0.13-0.174-0.26-0.305-0.39-0.479c1.56-0.305,3.12-0.653,4.681-0.959c1.604-1.133,3.597-1.612,5.504-1.525c1.95,0.087,3.901,0.828,5.33,2.179c1.3,1.176,2.081,2.876,2.254,4.618C36.752,13.816,36.319,15.646,35.365,17.083z"/>
            <path fill="#EF4F23" d="M23.447,6.826c-1.56,0.305-3.12,0.653-4.681,0.959c0.13,0.13,0.26,0.305,0.39,0.479c0.607,0.784,1.084,1.699,1.344,2.701c0.347,1.351,0.347,2.788-0.043,4.139c0.303,1.176,0.91,2.222,1.733,3.093c-1.56,0.305-3.163,0.697-4.724,1.002c-1.473,1.002-3.251,1.525-4.984,1.481c-2.167,0-4.377-0.784-5.938-2.352c-1.257-1.263-2.037-3.006-2.167-4.792S4.81,9.92,5.894,8.482c1.3-1.699,3.251-2.788,5.33-3.093c2.124-0.305,4.421,0.087,6.241,1.307c0.477,0.305,0.91,0.697,1.344,1.089c0.563-1.525,1.084-3.006,1.647-4.531c-1.95-1.525-4.334-2.483-6.805-2.658c-2.341-0.218-4.767,0.218-6.891,1.307C4.464,3.036,2.558,4.952,1.387,7.217C0.563,8.829,0.087,10.659,0,12.489v0.959c0.043,2.309,0.78,4.661,2.081,6.578c1.344,2.004,3.337,3.616,5.591,4.488c2.514,1.002,5.33,1.219,7.974,0.566c1.733-0.435,3.38-1.219,4.811-2.352c0.563-1.525,1.171-3.049,1.69-4.574c0.39,0.392,0.823,0.784,1.257,1.089c1.257-2.179,1.821-4.749,1.604-7.275C24.921,10.137,24.357,8.394,23.447,6.826z"/>
            <g>
              <path fill="#1F2353" d="M53.092,3.614c-1.904,0-2.974,1.449-2.974,3.903c0,2.576,1.099,3.893,2.955,3.902c1.392-0.009,2.264-0.748,2.463-1.97l3.657,0.038c-0.199,2.349-2.245,5.077-6.195,5.077c-3.761,0-6.583-2.5-6.592-7.047c0.01-4.566,2.908-7.048,6.592-7.048c3.42,0,5.892,1.913,6.195,5.286h-3.657C55.412,4.467,54.551,3.614,53.092,3.614z"/>
              <path fill="#1F2353" d="M60.939,0.659h5.835c3.068,0,5.077,1.743,5.077,4.641c0,1.894-0.871,3.23-2.349,3.931l2.804,5.143h-3.921l-2.434-4.566h-1.412v4.566H60.94L60.939,0.659L60.939,0.659z M65.94,6.987c1.355,0,2.15-0.493,2.141-1.685c0.009-1.212-0.786-1.753-2.141-1.762h-1.401v3.448L65.94,6.987L65.94,6.987z"/>
              <path fill="#1F2353" d="M80.036,14.564c-3.741,0-6.64-2.51-6.649-7.047c0.01-4.566,2.908-7.047,6.649-7.047c3.704,0,6.63,2.482,6.63,7.047S83.74,14.564,80.036,14.564z M80.036,11.419c1.875-0.009,2.926-1.383,2.917-3.902c0.009-2.529-1.043-3.903-2.917-3.903c-1.894,0-2.936,1.373-2.936,3.903C77.101,10.036,78.143,11.41,80.036,11.419z"/>
              <path fill="#1F2353" d="M93.907,3.444c-1.184-0.009-1.733,0.464-1.743,1.099c-0.029,0.711,0.615,1.099,1.894,1.364l1.137,0.265c2.946,0.626,4.262,2.055,4.281,4.167c-0.019,2.69-2.084,4.196-5.55,4.205c-3.542-0.009-5.844-1.544-5.873-4.925H91.5c0.057,1.278,0.938,1.951,2.368,1.951c1.241,0,1.904-0.502,1.913-1.231c-0.009-0.663-0.578-1.051-2.103-1.383l-1.383-0.303c-2.415-0.53-3.893-1.724-3.883-3.846c-0.018-2.595,2.274-4.338,5.495-4.338c3.287,0,5.361,1.771,5.38,4.433H95.82C95.744,3.984,95.138,3.435,93.907,3.444z"/>
              <path fill="#1F2353" d="M106.432,3.444c-1.184-0.009-1.733,0.464-1.743,1.099c-0.029,0.711,0.615,1.099,1.894,1.364l1.137,0.265c2.946,0.626,4.262,2.055,4.281,4.167c-0.019,2.69-2.084,4.196-5.55,4.205c-3.542-0.009-5.844-1.544-5.873-4.925h3.448c0.057,1.278,0.938,1.951,2.368,1.951c1.241,0,1.903-0.502,1.913-1.231c-0.009-0.663-0.578-1.051-2.103-1.383l-1.383-0.303c-2.415-0.53-3.893-1.724-3.883-3.846c-0.018-2.595,2.274-4.338,5.495-4.338c3.287,0,5.361,1.771,5.38,4.433h-3.467C108.269,3.984,107.663,3.435,106.432,3.444z"/>
            </g>
          </g>
        </svg>
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

      {/* 관리자 */}
      <div className="px-3 pt-1">
        <Link href="/admin"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
            pathname === "/admin" ? "bg-blue-50 font-medium text-blue-700" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          회원 승인 관리
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
