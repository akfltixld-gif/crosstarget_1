import { NextResponse } from "next/server"

export const revalidate = 3600 // 1시간 캐시

const BASE = "https://www.i-boss.co.kr"
const LIST_URL = `${BASE}/ab-7214`

export async function GET() {
  try {
    const res = await fetch(LIST_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) return NextResponse.json({ items: [] })

    const html = await res.text()

    // 기사 링크 추출: /ab-2877-NNNNN 형태
    const linkPattern = /href="(\/ab-2877-(\d+))"[^>]*>([^<]{5,120})</g
    const items: { title: string; link: string; source: string; date: string }[] = []
    const seen = new Set<string>()

    let match
    while ((match = linkPattern.exec(html)) !== null) {
      const path = match[1]
      const title = match[3].trim()
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'")

      if (!title || title.length < 5 || seen.has(path)) continue
      // 광고성/불필요한 항목 제외
      if (/^\d+$/.test(title) || title.includes("댓글") || title.includes("조회")) continue

      seen.add(path)
      items.push({ title, link: BASE + path, source: "아이보스", date: "" })
      if (items.length >= 12) break
    }

    // 날짜 추출 시도 (pubDate 형식)
    const datePattern = /(\d{2}\.\d{2})|(\d{1,2}:\d{2})/g
    const dates: string[] = []
    let dm
    while ((dm = datePattern.exec(html)) !== null) {
      dates.push(dm[0])
    }
    items.forEach((item, i) => {
      if (dates[i]) item.date = dates[i]
    })

    if (items.length > 0) return NextResponse.json({ items })
  } catch {
    // ignore
  }

  return NextResponse.json({ items: [] })
}
