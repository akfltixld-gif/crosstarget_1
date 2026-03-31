import { NextResponse } from "next/server"

export const revalidate = 3600 // 1시간 캐시

export async function GET() {
  try {
    const res = await fetch(
      "https://news.google.com/rss/search?q=모바일+광고+한국&hl=ko&gl=KR&ceid=KR:ko",
      { next: { revalidate: 3600 } }
    )
    const xml = await res.text()

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8).map(m => {
      const block = m[1]
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?? block.match(/<title>(.*?)<\/title>/)?.[1] ?? ""
      const link = block.match(/<link>(.*?)<\/link>/)?.[1]
        ?? block.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? "#"
      const source = block.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? ""
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ""
      const date = pubDate ? new Date(pubDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : ""
      return { title, link, source, date }
    })

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
