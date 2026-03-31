import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/signup", "/pending", "/auth/callback"]

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 환경변수 없으면 통과
  if (!supabaseUrl || !supabaseKey) {
    return response
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

    // 비로그인 → 로그인 페이지로
    if (!user && !isPublic) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    // 로그인 상태에서 로그인/회원가입 접근 → 홈으로
    if (user && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  } catch {
    // 인증 오류 시 통과
    return response
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
