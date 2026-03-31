import { NextResponse } from "next/server"

export const revalidate = 3600

const BASE = "https://www.i-boss.co.kr"
const LIST_URL = `${BASE}/ab-7214`
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "ko-KR,ko;q=0.9",
}

async function getLatestClippingUrl(): Promise<{ url: string; date: string } | null> {
  const res = await fetch(LIST_URL, { headers: HEADERS, next: { revalidate: 3600 } })
  if (!res.ok) return null
  const html = await res.text()
  const m = html.match(/href="(\/ab-2877-\d+)"\s+title="([^"]*뉴스클리핑[^"]*)"/)
  if (!m) return null
  const dateM = m[2].match(/(\d+월\s*\d+일)/)
  return { url: BASE + m[1], date: dateM ? dateM[1] : "" }
}

async function parseClipping(url: string, clippingDate: string) {
  const res = await fetch(url, { headers: HEADERS, next: { revalidate: 3600 } })
  if (!res.ok) return []
  const html = await res.text()

  // <strong>N. 제목</strong> 뒤에 오는 <p> 요약 추출
  const blocks: { title: string; summary: string }[] = []
  const strongPattern = /<strong>(\d+)\.\s*([^<]{5,150})<\/strong>([\s\S]{0,600}?)(?=<strong>\d+\.|$)/g
  let m
  while ((m = strongPattern.exec(html)) !== null) {
    const title = m[2].trim().replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    // <p> 태그에서 요약 추출
    const pMatch = m[3].match(/<p>([^<]{10,200})<\/p>/)
    const summary = pMatch
      ? pMatch[1].trim().replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"')
      : ""
    if (!title) continue
    blocks.push({ title, summary })
    if (blocks.length >= 8) break
  }

  return blocks.map(b => ({
    title: b.title,
    summary: b.summary,
    link: url,
    source: "아이보스",
    date: clippingDate,
  }))
}

export async function GET() {
  try {
    const latest = await getLatestClippingUrl()
    if (latest) {
      const items = await parseClipping(latest.url, latest.date)
      if (items.length > 0) return NextResponse.json({ items, clippingUrl: latest.url })
    }
  } catch {
    // ignore
  }
  return NextResponse.json({ items: [], clippingUrl: "" })
}
