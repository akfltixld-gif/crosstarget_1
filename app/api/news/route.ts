import { NextResponse } from "next/server"

export const revalidate = 86400 // 24시간 캐시

// Google News RSS - 한국 모바일 광고 검색 (가장 안정적)
const RSS_URL = "https://news.google.com/rss/search?q=%EB%AA%A8%EB%B0%94%EC%9D%BC+%EA%B4%91%EA%B3%A0&hl=ko&gl=KR&ceid=KR:ko"

function parseItems(xml: string, limit = 10) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .slice(0, limit)
    .map(m => {
      const block = m[1]
      const title = (
        block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ??
        block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""
      ).trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
      const link =
        block.match(/<link>(https?:\/\/[^\s<]+)<\/link>/)?.[1] ??
        block.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/)?.[1] ?? "#"
      const source =
        block.match(/<source[^>]*>([^<]*)<\/source>/)?.[1] ?? ""
      const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? ""
      const date = pubDate
        ? new Date(pubDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
        : ""
      return { title, link, source, date }
    })
    .filter(i => i.title)
}

export async function GET() {
  try {
    const res = await fetch(RSS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RSS reader)" },
      next: { revalidate: 86400 },
    })
    if (res.ok) {
      const xml = await res.text()
      const items = parseItems(xml)
      if (items.length > 0) return NextResponse.json({ items })
    }
  } catch {
    // ignore
  }
  return NextResponse.json({ items: [] })
}
