import { NextResponse } from "next/server"

export const revalidate = 3600 // 1시간 캐시

const BASE = "https://www.i-boss.co.kr"
const LIST_URL = `${BASE}/ab-7214`
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "ko-KR,ko;q=0.9",
}

// 최신 뉴스클리핑 URL 찾기
async function getLatestClippingUrl(): Promise<string | null> {
  const res = await fetch(LIST_URL, { headers: HEADERS, next: { revalidate: 3600 } })
  if (!res.ok) return null
  const html = await res.text()
  // title 속성에서 "뉴스클리핑" 포함된 /ab-2877-XXXXX 링크 찾기
  const m = html.match(/href="(\/ab-2877-\d+)"\s+title="[^"]*뉴스클리핑[^"]*"/)
  return m ? BASE + m[1] : null
}

// 뉴스클리핑 기사에서 numbered <strong> 제목 추출
async function parseClipping(url: string) {
  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } })
  if (!res.ok) return []
  const html = await res.text()

  // 날짜 추출 (제목에서)
  const dateM = html.match(/(\d{4}\.\d{2}\.\d{2})/)
  const date = dateM ? dateM[1].slice(5) : "" // "MM.DD"

  // <strong>N. 제목</strong> 패턴 추출
  const pattern = /<strong>(\d+)\.\s*([^<]{5,100})<\/strong>/g
  const items: { title: string; link: string; source: string; date: string }[] = []
  let match
  while ((match = pattern.exec(html)) !== null) {
    const title = match[2].trim()
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    if (!title) continue
    items.push({ title, link: url, source: "아이보스 뉴스클리핑", date })
    if (items.length >= 10) break
  }
  return items
}

export async function GET() {
  try {
    const clippingUrl = await getLatestClippingUrl()
    if (clippingUrl) {
      const items = await parseClipping(clippingUrl)
      if (items.length > 0) return NextResponse.json({ items })
    }
  } catch {
    // ignore
  }
  return NextResponse.json({ items: [] })
}
