"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function TopBar() {
  const pathname = usePathname()
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL

  return (
    <header className="flex h-11 shrink-0 items-center justify-end border-b border-gray-200 bg-white px-6">
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
  )
}
