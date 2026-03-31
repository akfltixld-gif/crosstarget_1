"use client"

import { useState, useEffect } from "react"
import type { Campaign, Agency, Advertiser } from "@/lib/campaignTypes"
import { getCampaignTotals } from "@/lib/campaignTypes"

const STORAGE_KEY    = "ct-plus-campaigns-v7"
const AGENCY_KEY     = "ct-plus-agencies-v1"
const ADVERTISER_KEY = "ct-plus-advertisers-v1"

function toMonthStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function overlapsMonth(c: Campaign, month: string) {
  const [y, m] = month.split("-").map(Number)
  return new Date(c.startDate) <= new Date(y, m, 0) && new Date(c.endDate) >= new Date(y, m - 1, 1)
}

function fmt(n: number) { return n.toLocaleString() }

const PALETTE = [
  { border: "border-blue-400",    bg: "bg-blue-50",    text: "text-blue-700",    header: "bg-blue-50/60 border-blue-100"    },
  { border: "border-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", header: "bg-emerald-50/60 border-emerald-100" },
  { border: "border-violet-400",  bg: "bg-violet-50",  text: "text-violet-700",  header: "bg-violet-50/60 border-violet-100"  },
  { border: "border-orange-400",  bg: "bg-orange-50",  text: "text-orange-700",  header: "bg-orange-50/60 border-orange-100"  },
  { border: "border-rose-400",    bg: "bg-rose-50",    text: "text-rose-700",    header: "bg-rose-50/60 border-rose-100"      },
  { border: "border-teal-400",    bg: "bg-teal-50",    text: "text-teal-700",    header: "bg-teal-50/60 border-teal-100"      },
]

export default function AgencyFeePage() {
  const [month, setMonth]             = useState(toMonthStr(new Date()))
  const [campaigns, setCampaigns]     = useState<Campaign[]>([])
  const [agencies, setAgencies]       = useState<Agency[]>([])
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([])
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null)
  const [copied, setCopied]           = useState(false)

  useEffect(() => {
    try {
      const c  = localStorage.getItem(STORAGE_KEY)
      const ag = localStorage.getItem(AGENCY_KEY)
      const adv = localStorage.getItem(ADVERTISER_KEY)
      if (c)   setCampaigns(JSON.parse(c))
      if (ag)  setAgencies(JSON.parse(ag))
      if (adv) setAdvertisers(JSON.parse(adv))
    } catch {}
  }, [])

  function saveCampaigns(next: Campaign[]) {
    setCampaigns(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  function updateFeeRate(id: string, val: number | undefined) {
    saveCampaigns(campaigns.map(c => c.id === id ? { ...c, agencyFeeRate: val } : c))
  }

  function advName(id: string) { return advertisers.find(a => a.id === id)?.name ?? "-" }
  function agencyById(id: string) { return agencies.find(a => a.id === id) }

  const filtered = campaigns.filter(c => overlapsMonth(c, month))

  // 대행사별 그룹핑 (campaign.agencyId 기준)
  const agencyMap = new Map<string, { agency: Agency; campaigns: Campaign[] }>()
  for (const c of filtered) {
    const ag = agencyById(c.agencyId)
    if (!ag) continue
    if (!agencyMap.has(ag.id)) agencyMap.set(ag.id, { agency: ag, campaigns: [] })
    agencyMap.get(ag.id)!.campaigns.push(c)
  }
  const groups = Array.from(agencyMap.values())
  const visible = selectedAgencyId ? groups.filter(g => g.agency.id === selectedAgencyId) : groups

  // 집계
  function calcFee(c: Campaign) {
    const { totalBudget } = getCampaignTotals(c)
    const rate = c.agencyFeeRate ?? 0
    return Math.round(totalBudget * rate / 100)
  }
  function groupTotals(cList: Campaign[]) {
    return cList.reduce((acc, c) => {
      const t = getCampaignTotals(c)
      return { budget: acc.budget + t.totalBudget, spend: acc.spend + t.totalSpend, fee: acc.fee + calcFee(c) }
    }, { budget: 0, spend: 0, fee: 0 })
  }

  const grandTotal = visible.reduce((acc, g) => {
    const t = groupTotals(g.campaigns)
    return { budget: acc.budget + t.budget, spend: acc.spend + t.spend, fee: acc.fee + t.fee }
  }, { budget: 0, spend: 0, fee: 0 })

  function shiftMonth(dir: -1 | 1) {
    const [y, m] = month.split("-").map(Number)
    setMonth(toMonthStr(new Date(y, m - 1 + dir, 1)))
  }

  function copyAsExcel() {
    const lines: string[] = [["대행사", "광고주", "캠페인", "부킹금액", "소진금액", "대행수수료율(%)", "대행수수료"].join("\t")]
    for (const { agency, campaigns: cList } of visible) {
      for (const c of cList) {
        const t = getCampaignTotals(c)
        lines.push([agency.name, advName(c.advertiserId), c.campaignName, t.totalBudget, t.totalSpend, c.agencyFeeRate ?? 0, calcFee(c)].join("\t"))
      }
      const t = groupTotals(cList)
      lines.push([`${agency.name} 소계`, "", "", t.budget, t.spend, "", t.fee].join("\t"))
    }
    lines.push(["합계", "", "", grandTotal.budget, grandTotal.spend, "", grandTotal.fee].join("\t"))
    navigator.clipboard.writeText(lines.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900">대행사별 대행수수료</h1>
        <p className="text-xs text-gray-400 mt-0.5">정산 리포트 · 대행사별 대행수수료</p>
      </header>

      <main className="p-6 space-y-6">

        {/* 월 선택 */}
        <div className="flex items-center gap-3">
          <button onClick={() => shiftMonth(-1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">‹</button>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => shiftMonth(1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">›</button>
          <span className="text-sm text-gray-400">정산 대상 캠페인 {filtered.length}개</span>
        </div>

        {/* 대행사 요약 카드 */}
        {groups.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">대행사 필터</span>
              {selectedAgencyId && (
                <button onClick={() => setSelectedAgencyId(null)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100">
                  전체 보기
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {groups.map((g, idx) => {
                const p = PALETTE[idx % PALETTE.length]
                const t = groupTotals(g.campaigns)
                const isOn = selectedAgencyId === g.agency.id
                const isDimmed = selectedAgencyId !== null && !isOn
                return (
                  <button key={g.agency.id} onClick={() => setSelectedAgencyId(isOn ? null : g.agency.id)}
                    className={`relative rounded-xl border-2 px-4 py-3 text-left shadow-sm transition-all ${
                      isOn    ? `${p.border} ${p.bg} ring-2 ring-offset-1 scale-[1.02]`
                      : isDimmed ? "border-gray-200 bg-white opacity-40"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"}`}>
                    {isOn && <span className="absolute top-2 right-2 text-[10px] font-bold">✓</span>}
                    <p className={`text-xs font-bold truncate ${isOn ? p.text : "text-gray-800"}`}>{g.agency.name}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{g.campaigns.length}개 캠페인</p>
                    <p className="mt-2 text-sm font-semibold text-gray-800">{t.fee > 0 ? fmt(t.fee) : "-"}원</p>
                    <p className="text-xs text-gray-400">부킹 {fmt(t.budget)}원</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
            해당 월에 집행된 캠페인이 없습니다.
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
            대행사가 연결된 캠페인이 없습니다. 캠페인 집행 현황에서 대행사를 먼저 등록해주세요.
          </div>
        ) : (
          <>
            {/* 대행사별 테이블 */}
            {visible.map((g, idx) => {
              const p = PALETTE[idx % PALETTE.length]
              const t = groupTotals(g.campaigns)
              return (
                <div key={g.agency.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className={`flex items-center justify-between border-b px-5 py-3.5 ${p.header}`}>
                    <div>
                      <h2 className={`text-sm font-semibold ${p.text}`}>{g.agency.name}</h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {g.campaigns.length}개 캠페인
                        {g.agency.contactName ? ` · 담당자: ${g.agency.contactName}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">총 대행수수료</p>
                      <p className="text-base font-bold text-blue-700">{t.fee > 0 ? fmt(t.fee) : "-"}원</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                          <th className="px-4 py-2.5 text-left font-medium">광고주</th>
                          <th className="px-4 py-2.5 text-left font-medium">캠페인</th>
                          <th className="px-4 py-2.5 text-right font-medium">부킹 금액 (매출)</th>
                          <th className="px-4 py-2.5 text-right font-medium">소진 금액</th>
                          <th className="px-4 py-2.5 text-center font-medium">대행수수료율 (%)</th>
                          <th className="px-4 py-2.5 text-right font-medium">대행수수료</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {g.campaigns.map(c => {
                          const totals = getCampaignTotals(c)
                          const fee = calcFee(c)
                          return (
                            <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-800">{advName(c.advertiserId)}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-gray-700">{c.campaignName}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{c.startDate} ~ {c.endDate}</p>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <p className="font-medium text-gray-800">{fmt(totals.totalBudget)}원</p>
                              </td>
                              <td className="px-4 py-3 text-right text-gray-600">
                                {fmt(totals.totalSpend)}원
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-0.5">
                                  <input
                                    type="number" min={0} max={100} step={0.1}
                                    value={c.agencyFeeRate ?? ""}
                                    placeholder="0"
                                    onChange={e => updateFeeRate(c.id, e.target.value === "" ? undefined : Number(e.target.value))}
                                    className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-center text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                  />
                                  <span className="text-xs text-gray-400">%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {(c.agencyFeeRate ?? 0) > 0
                                  ? <span className="font-semibold text-blue-700">{fmt(fee)}원</span>
                                  : <span className="text-gray-300">-</span>}
                              </td>
                            </tr>
                          )
                        })}
                        {/* 소계 */}
                        <tr className="border-t border-gray-200 bg-gray-50/80 font-semibold text-sm">
                          <td colSpan={2} className="px-4 py-2.5 text-gray-600">{g.agency.name} 소계</td>
                          <td className="px-4 py-2.5 text-right text-gray-800">{fmt(t.budget)}원</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{fmt(t.spend)}원</td>
                          <td className="px-4 py-2.5 text-center text-gray-400 text-xs">
                            {t.budget > 0 ? `실효 ${((t.fee / t.budget) * 100).toFixed(1)}%` : "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right text-blue-700">{t.fee > 0 ? fmt(t.fee) : "-"}원</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}

            {/* 전체 합계 */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">정산 결과 요약</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedAgencyId ? `${visible[0]?.agency.name} 선택됨` : "전체 대행사"} · 대행사별 수수료 합계
                  </p>
                </div>
                <button onClick={copyAsExcel}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    copied ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                  {copied ? "✓ 복사됨" : "📋 엑셀 복사"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                      <th className="px-4 py-2.5 text-left font-medium">대행사</th>
                      <th className="px-4 py-2.5 text-right font-medium">캠페인 수</th>
                      <th className="px-4 py-2.5 text-right font-medium">부킹 금액 (매출)</th>
                      <th className="px-4 py-2.5 text-right font-medium">소진 금액</th>
                      <th className="px-4 py-2.5 text-right font-medium">대행수수료</th>
                      <th className="px-4 py-2.5 text-right font-medium">실효 수수료율</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visible.map(g => {
                      const t = groupTotals(g.campaigns)
                      return (
                        <tr key={g.agency.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{g.agency.name}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{g.campaigns.length}개</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">{fmt(t.budget)}원</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{fmt(t.spend)}원</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{t.fee > 0 ? fmt(t.fee) : "-"}원</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">
                            {t.budget > 0 ? `${((t.fee / t.budget) * 100).toFixed(1)}%` : "-"}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                      <td className="px-4 py-2.5 text-gray-700">합계</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {visible.reduce((s, g) => s + g.campaigns.length, 0)}개
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-800">{fmt(grandTotal.budget)}원</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(grandTotal.spend)}원</td>
                      <td className="px-4 py-2.5 text-right text-blue-700">{grandTotal.fee > 0 ? fmt(grandTotal.fee) : "-"}원</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {grandTotal.budget > 0 ? `${((grandTotal.fee / grandTotal.budget) * 100).toFixed(1)}%` : "-"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
