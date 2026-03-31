"use client"

import { usePathname } from "next/navigation"
import Sidebar from "@/components/Sidebar"

const NO_SIDEBAR = ["/login", "/signup", "/pending"]

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideSidebar = NO_SIDEBAR.some(p => pathname.startsWith(p))

  if (hideSidebar) {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">{children}</div>
    </>
  )
}
