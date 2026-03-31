import { NextResponse } from "next/server"

export const revalidate = 1800 // 30분 캐시

const FEEDS = [
  { url: "https://www.google.com/alerts/feeds/13442181224149692886/16291869171071229649", keyword: "AI광고" },
  { url: "https://www.google.com/alerts/feeds/13442181224149692886/6861982569625520685",  keyword: "네이버광고" },
  { url: "https://www.google.com/alerts/feeds/13442181224149692886/8568302798968202023",  keyword: "카카오광고" },
  { url: "https://www.google.com/alerts/feeds/13442181224149692886/14413156495951533672", keyword: "구글광고" },
  { url: "https://www.google.com/alerts/feeds/13442181224149692886/4887735634593926073",  keyword: "모바일광고" },
]

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim()
}

function extractRealUrl(googleUrl: string) {
  try {
    const m = googleUrl.match(/[?&]url=([^&]+)/)
    if (m) return decodeURIComponent(m[1])
  } catch { /* ignore */ }
  return googleUrl
}

function extractSource(url: string) {
  try {
    const host = new URL(url).hostname.replace("www.", "")
    const map: Record<string, string> = {
      "digitaltoday.co.kr": "디지털투데이",
      "etnews.com": "전자신문",
      "zdnet.co.kr": "ZDNet Korea",
      "bloter.net": "블로터",
      "newsis.com": "뉴시스",
      "yonhapnews.co.kr": "연합뉴스",
      "hankyung.com": "한국경제",
      "mk.co.kr": "매일경제",
      "mt.co.kr": "머니투데이",
      "chosun.com": "조선일보",
      "joins.com": "중앙일보",
      "hani.co.kr": "한겨레",
      "dt.co.kr": "디지털타임스",
      "itchannelnews.com": "IT채널뉴스",
      "mobiinside.co.kr": "모비인사이드",
      "platum.kr": "플래텀",
      "ainet.link": "아이넷",
      "sedaily.com": "서울경제",
      "fnnews.com": "파이낸셜뉴스",
    }
    return map[host] ?? host
  } catch { return "" }
}

async function parseFeed(feedUrl: string, keyword: string) {
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RSS reader)" },
      next: { revalidate: 1800 },
    })
    if (!res.ok) return []
    const xml = await res.text()

    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
      const block = m[1]
      const titleRaw = block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? ""
      const title = stripHtml(titleRaw)
      const linkHref = block.match(/<link[^>]+href="([^"]+)"/)?.[1] ?? ""
      const link = extractRealUrl(linkHref)
      const pubDate = block.match(/<published>([\s\S]*?)<\/published>/)?.[1] ?? ""
      const date = pubDate
        ? new Date(pubDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
        : ""
      const source = extractSource(link)
      const contentRaw = block.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? ""
      const summary = stripHtml(contentRaw).slice(0, 120)
      const ts = pubDate ? new Date(pubDate).getTime() : 0
      return { title, link, source, date, keyword, summary, ts }
    }).filter(i => i.title && i.link)
  } catch { return [] }
}

export async function GET() {
  try {
    const results = await Promise.all(FEEDS.map(f => parseFeed(f.url, f.keyword)))
    const all = results.flat()

    // 중복 URL 제거 후 최신순 정렬, 최대 12개
    const seen = new Set<string>()
    const items = all
      .sort((a, b) => b.ts - a.ts)
      .filter(i => { if (seen.has(i.link)) return false; seen.add(i.link); return true })
      .slice(0, 12)
      .map(({ ts: _ts, keyword: _k, ...rest }) => rest)

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
