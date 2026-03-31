"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface Profile {
  id: string
  email: string
  name: string
  status: "pending" | "approved" | "rejected"
  created_at: string
}

const STATUS_LABEL: Record<string, string> = {
  pending:  "대기 중",
  approved: "승인됨",
  rejected: "거절됨",
}

const STATUS_COLOR: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
}

export default function AdminPage() {
  const [profiles, setProfiles]   = useState<Profile[]>([])
  const [loading, setLoading]     = useState(true)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [updating, setUpdating]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      if (user.email !== adminEmail) { setLoading(false); return }
      setIsAdmin(true)

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
      setProfiles(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(id: string, status: "approved" | "rejected") {
    setUpdating(id)
    const supabase = createClient()
    await supabase.from("profiles").update({ status }).eq("id", id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    setUpdating(null)
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-sm text-gray-400">로딩 중...</div>
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-gray-500">관리자 권한이 필요합니다.</p>
      </div>
    )
  }

  const pending  = profiles.filter(p => p.status === "pending")
  const others   = profiles.filter(p => p.status !== "pending")

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900">회원 승인 관리</h1>
        <p className="text-xs text-gray-400 mt-0.5">가입 신청한 사용자를 승인하거나 거절합니다</p>
      </header>

      <main className="p-6 space-y-6">
        {/* 대기 중 */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700">승인 대기</h2>
            {pending.length > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </div>
          {pending.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center">
              <p className="text-sm text-gray-400">대기 중인 가입 신청이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">이름</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">이메일</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">신청일시</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pending.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800 text-xs">{p.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{p.email}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(p.created_at).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => updateStatus(p.id, "approved")}
                            disabled={updating === p.id}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {updating === p.id ? "..." : "승인"}
                          </button>
                          <button
                            onClick={() => updateStatus(p.id, "rejected")}
                            disabled={updating === p.id}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                          >
                            거절
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 처리 완료 */}
        {others.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">처리 완료</h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">이름</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">이메일</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">상태</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">변경</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {others.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800 text-xs">{p.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{p.email}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLOR[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === "approved" ? (
                          <button
                            onClick={() => updateStatus(p.id, "rejected")}
                            disabled={updating === p.id}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            승인 취소
                          </button>
                        ) : (
                          <button
                            onClick={() => updateStatus(p.id, "approved")}
                            disabled={updating === p.id}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            재승인
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
