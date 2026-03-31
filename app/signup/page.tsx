"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function SignupPage() {
  const [name, setName]         = useState("")
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (password.length < 8) { setError("비밀번호는 8자 이상이어야 합니다."); return }
    setLoading(true)
    const supabase = createClient()

    // 1. Supabase Auth 회원가입
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (signupError) {
      setError(signupError.message === "User already registered"
        ? "이미 등록된 이메일입니다."
        : "회원가입 중 오류가 발생했습니다.")
      setLoading(false)
      return
    }

    // 2. profiles 테이블에 pending 상태로 등록
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        name,
        status: "pending",
      })
    }

    // 3. 로그아웃 (승인 전 접근 차단)
    await supabase.auth.signOut()
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900">회원가입 신청 완료</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            관리자 승인 후 로그인하실 수 있습니다.<br />
            승인이 완료되면 알려드리겠습니다.
          </p>
          <Link href="/login"
            className="mt-6 block rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            로그인으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8 flex flex-col items-center gap-2">
        <svg viewBox="0 0 112 26" xmlns="http://www.w3.org/2000/svg" className="h-10 w-auto">
          <g>
            <path fill="#EF4F23" d="M47,17.292h7.046v1.74h-2.462v6.436h-2.123v-6.436h-2.462L47,17.292L47,17.292z"/>
            <path fill="#EF4F23" d="M57.28,25.468l2.721-8.176h2.925l2.71,8.176h-2.315l-0.491-1.604h-2.738l-0.485,1.604H57.28z M62.333,22.239l-0.841-2.744h-0.068l-0.836,2.744H62.333z"/>
            <path fill="#EF4F23" d="M70.153,17.292h3.477c1.829,0,3.026,1.039,3.026,2.767c0,1.129-0.519,1.926-1.401,2.343l1.671,3.066h-2.337l-1.451-2.721h-0.841v2.721h-2.145L70.153,17.292L70.153,17.292z M73.133,21.064c0.807,0,1.282-0.293,1.276-1.005c0.005-0.722-0.468-1.044-1.276-1.05h-0.836v2.055L73.133,21.064L73.133,21.064z"/>
            <path fill="#EF4F23" d="M85.294,19.054c-1.141,0-1.807,0.853-1.807,2.315c0,1.468,0.621,2.331,1.795,2.337c1.016-0.006,1.547-0.485,1.559-1.243h-1.513v-1.536h3.591v1.118c0,2.224-1.524,3.535-3.659,3.535c-2.372,0-3.98-1.598-3.986-4.19c0.005-2.686,1.773-4.211,3.975-4.211c1.919,0,3.399,1.163,3.579,2.8h-2.179C86.502,19.393,86.011,19.054,85.294,19.054z"/>
            <path fill="#EF4F23" d="M93.695,17.292h5.838v1.74H95.84v1.479h3.387v1.739H95.84v1.479h3.681v1.739h-5.827L93.695,17.292L93.695,17.292z"/>
            <path fill="#EF4F23" d="M104.127,17.292h7.046v1.74h-2.462v6.436h-2.123v-6.436h-2.462L104.127,17.292L104.127,17.292z"/>
            <path fill="#1F2353" d="M33.242,1.443c-2.297-0.915-4.811-1.176-7.237-0.741c-2.037,0.349-3.987,1.219-5.591,2.527c-0.563,1.525-1.084,3.006-1.647,4.531c-0.39-0.392-0.823-0.784-1.344-1.089c-0.997,1.743-1.56,3.748-1.647,5.751c-0.087,2.352,0.477,4.705,1.647,6.753c1.56-0.349,3.163-0.697,4.724-1.002c-0.563,1.525-1.127,3.049-1.69,4.574c2.124,1.699,4.811,2.658,7.542,2.744c3.034,0.087,6.111-0.915,8.495-2.876c2.124-1.743,3.597-4.226,4.16-6.883c0.737-3.355,0.043-7.014-1.907-9.846C37.403,3.883,35.453,2.358,33.242,1.443z"/>
            <path fill="#EF4F23" d="M23.447,6.826c-1.56,0.305-3.12,0.653-4.681,0.959c0.13,0.13,0.26,0.305,0.39,0.479c0.607,0.784,1.084,1.699,1.344,2.701c0.347,1.351,0.347,2.788-0.043,4.139c0.303,1.176,0.91,2.222,1.733,3.093c-1.56,0.305-3.163,0.697-4.724,1.002c-1.473,1.002-3.251,1.525-4.984,1.481c-2.167,0-4.377-0.784-5.938-2.352c-1.257-1.263-2.037-3.006-2.167-4.792S4.81,9.92,5.894,8.482c1.3-1.699,3.251-2.788,5.33-3.093c2.124-0.305,4.421,0.087,6.241,1.307c0.477,0.305,0.91,0.697,1.344,1.089c0.563-1.525,1.084-3.006,1.647-4.531c-1.95-1.525-4.334-2.483-6.805-2.658c-2.341-0.218-4.767,0.218-6.891,1.307C4.464,3.036,2.558,4.952,1.387,7.217C0.563,8.829,0.087,10.659,0,12.489v0.959c0.043,2.309,0.78,4.661,2.081,6.578c1.344,2.004,3.337,3.616,5.591,4.488c2.514,1.002,5.33,1.219,7.974,0.566c1.733-0.435,3.38-1.219,4.811-2.352c0.563-1.525,1.171-3.049,1.69-4.574c0.39,0.392,0.823,0.784,1.257,1.089c1.257-2.179,1.821-4.749,1.604-7.275C24.921,10.137,24.357,8.394,23.447,6.826z"/>
          </g>
        </svg>
        <p className="text-xs text-gray-400 font-medium">광고 운영 대시보드</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white px-8 py-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-gray-900">회원가입</h1>
        <p className="mb-6 text-xs text-gray-400">관리자 승인 후 이용 가능합니다</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">이름</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              required placeholder="홍길동"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">이메일</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="name@company.com"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-600">비밀번호</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="8자 이상"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "처리 중..." : "회원가입 신청"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-gray-400">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">로그인</Link>
        </p>
      </div>
    </div>
  )
}
