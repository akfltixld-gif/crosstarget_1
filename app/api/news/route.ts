import { NextResponse } from "next/server"

export const revalidate = 3600

export async function GET() {
  try {
    const rssUrl = encodeURIComponent(
      "https://news.google.com/rss/search?q=모바일+광고&hl=ko&gl=KR&ceid=KR:ko"
    )
    const res = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&count=10`,
      { next: { revalidate: 3600 } }
    )
    const json = await res.json()

    if (json.status !== "ok") throw new Error("rss2json error")

    const items = (json.items ?? []).slice(0, 8).map((item: {
      title: string, link: string, author: string, pubDate: string
    }) => ({
      title: item.title,
      link: item.link,
      source: item.author,
      date: item.pubDate
        ? new Date(item.pubDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
        : "",
    }))

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
