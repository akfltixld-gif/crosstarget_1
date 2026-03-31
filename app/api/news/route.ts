import { NextResponse } from "next/server"

export const revalidate = 86400 // 24시간 캐시

const RSS_SOURCES = [
  "https://www.mobiinside.co.kr/feed/",   // 모비인사이드 (모바일 광고 전문)
  "https://platum.kr/feed",               // 플래텀 (스타트업/디지털 마케팅)
]

function parseItems(xml: string, limit = 8) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .slice(0, limit)
    .map(m => {
      const block = m[1]
      const title = (
        block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ??
        block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""
      ).trim()
      const link =
        block.match(/<link>(https?:\/\/[^\s<]+)<\/link>/)?.[1] ??
        block.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/)?.[1] ?? "#"
      const source =
        block.match(/<source[^>]*><!\[CDATA\[(.*?)\]\]><\/source>/)?.[1] ??
        block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? ""
      const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ""
      const date = pubDate
        ? new Date(pubDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
        : ""
      return { title, link, source, date }
    })
    .filter(i => i.title)
}

export async function GET() {
  for (const url of RSS_SOURCES) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RSS reader)" },
        next: { revalidate: 86400 },
      })
      if (!res.ok) continue
      const xml = await res.text()
      const items = parseItems(xml)
      if (items.length > 0) return NextResponse.json({ items })
    } catch {
      continue
    }
  }
  return NextResponse.json({ items: [] })
}
