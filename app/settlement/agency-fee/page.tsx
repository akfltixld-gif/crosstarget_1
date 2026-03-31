"use client"

import { useState, useEffect, useCallback } from "react"
import type { Campaign, Agency, Advertiser } from "@/lib/campaignTypes"
import { MEDIA_MARKUP_RATE, DMP_FEE_RATE } from "@/lib/campaignTypes"

const STORAGE_KEY    = "ct-plus-campaigns-v7"
const AGENCY_KEY     = "ct-plus-agencies-v1"
const ADVERTISER_KEY = "ct-plus-advertisers-v1"
const AMOUNTS_KEY    = "agency-fee-amounts-v1"

type AmountMap = Record<string, number>

function toMonthStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function overlapsMonth(c: Campaign, month: string) {
  const [y, m] = month.split("-").map(Number)
  const mStart = new Date(y, m - 1, 1)
  const mEnd   = new Date(y, m, 0)
  return new Date(c.startDate) <= mEnd && new Date(c.endDate) >= mStart
}

function fmt(n: number) { return n.toLocaleString() }

// 대행사별 색상
const AGENCY_PALETTE = [
  "border-blue-400 bg-blue-50 text-blue-700",
  "border-emerald-400 bg-emerald-50 text-emerald-700",
  "border-violet-400 bg-violet-50 text-violet-700",
  "border-orange-400 bg-orange-50 text-orange-700",
  "border-rose-400 bg-rose-50 text-rose-700",
  "border-teal-400 bg-teal-50 text-teal-700",
]

type RowKey = `${string}|${string}|${"dmp" | "nondmp"}`

export default function AgencyFeePage() {
  const today = new Date()
  const [month, setMonth]             = useState(toMonthStr(today))
  const [campaigns, setCampaigns]     = useState<Campaign[]>([])
  const [agencies, setAgencies]       = useState<Agency[]>([])
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([])
  const [amounts, setAmounts]         = useState<AmountMap>({})
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null)
  const [copied, setCopied]           = useState(false)

  useEffect(() => {
    try {
      const c  = localStorage.getItem(STORAGE_KEY)
      const ag = localStorage.getItem(AGENCY_KEY)
      const adv = localStorage.getItem(ADVERTISER_KEY)
      const am = localStorage.getItem(AMOUNTS_KEY)
      if (c)   setCampaigns(JSON.parse(c))
      if (ag)  setAgencies(JSON.parse(ag))
      if (adv) setAdvertisers(JSON.parse(adv))
      if (am)  setAmounts(JSON.parse(am))
    } catch {}
  }, [])

  const saveAmounts = useCallback((next: AmountMap) => {
    setAmounts(next)
    try { localStorage.setItem(AMOUNTS_KEY, JSON.stringify(next)) } catch {}
  }, [])

  function getSpend(cId: string, media: string, type: "dmp" | "nondmp") {
    return amounts[`${cId}|${media}|${type}` as RowKey] ?? 0
  }
  function setSpend(cId: string, media: string, type: "dmp" | "nondmp", val: number) {
    saveAmounts({ ...amounts, [`${cId}|${media}|${type}`]: val })
  }

  const filtered = campaigns.filter(c => overlapsMonth(c, month))

  function getAdvertiserName(c: Campaign) {
    return advertisers.find(a => a.id === c.advertiserId)?.name ?? "-"
  }
  function getAgencyForCampaign(c: Campaign): Agency | undefined {
    const adv = advertisers.find(a => a.id === c.advertiserId)
    return agencies.find(a => a.id === adv?.agencyId) ?? agencies.find(a => a.id === c.agencyId)
  }

  // 대행사별 집계
  type AgencySummary = { agency: Agency; campaigns: Campaign[]; totalSpend: number; totalFee: number }
  const agencyMap = new Map<string, AgencySummary>()

  for (const c of filtered) {
    const ag = getAgencyForCampaign(c)
    if (!ag) continue
    if (!agencyMap.has(ag.id)) agencyMap.set(ag.id, { agency: ag, campaigns: [], totalSpend: 0, totalFee: 0 })
    const entry = agencyMap.get(ag.id)!
    entry.campaigns.push(c)
    for (const mb of c.mediaBudgets) {
      const dmpSpend    = getSpend(c.id, mb.media, "dmp")
      const nonDmpSpend = getSpend(c.id, mb.media, "nondmp")
      const dmpFee    = Math.round(dmpSpend    * (mb.dmp.agencyFeeRate    ?? 0) / 100)
      const nonDmpFee = Math.round(nonDmpSpend * (mb.nonDmp.agencyFeeRate ?? 0) / 100)
      entry.totalSpend += dmpSpend + nonDmpSpend
      entry.totalFee   += dmpFee + nonDmpFee
    }
  }

  const agencySummaries = Array.from(agencyMap.values())
  const visibleSummaries = selectedAgencyId
    ? agencySummaries.filter(s => s.agency.id === selectedAgencyId)
    : agencySummaries

  const grandTotalSpend = visibleSummaries.reduce((s, a) => s + a.totalSpend, 0)
  const grandTotalFee   = visibleSummaries.reduce((s, a) => s + a.totalFee, 0)

  function shiftMonth(dir: -1 | 1) {
    const [y, m] = month.split("-").map(Number)
    setMonth(toMonthStr(new Date(y, m - 1 + dir, 1)))
  }

  function copyAsExcel() {
    const lines: string[] = []
    lines.push(["대행사", "광고주", "캠페인", "매체", "구분", "매체마크업", "수수료율", "집행금액", "대행수수료"].join("\t"))
    for (const { agency, campaigns: cList } of visibleSummaries) {
      for (const c of cList) {
        for (const mb of c.mediaBudgets) {
          const mm = MEDIA_MARKUP_RATE[mb.media] ?? 0
          const rows = [
            { type: "DMP 활용",    feeRate: mb.dmp.agencyFeeRate,    spend: getSpend(c.id, mb.media, "dmp"),    key: "dmp" as const },
            { type: "DMP 미활용",  feeRate: mb.nonDmp.agencyFeeRate, spend: getSpend(c.id, mb.media, "nondmp"), key: "nondmp" as const },
          ]
          for (const r of rows) {
            if (r.spend === 0 && r.feeRate === 0) continue
            const fee = Math.round(r.spend * r.feeRate / 100)
            lines.push([agency.name, getAdvertiserName(c), c.campaignName, mb.media, r.type, `${mm}%`, `${r.feeRate}%`, r.spend, fee].join("\t"))
          }
        }
      }
    }
    lines.push(["합계", "", "", "", "", "", "", grandTotalSpend, grandTotalFee].join("\t"))
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900">대행사별 대행수수료</h1>
        <p className="text-xs text-gray-400 mt-0.5">정산 리포트 · 대행사별 대행수수료</p>
      </header>

      <main className="p-6 space-y-6">

        {/* 월 선택 */}
        <div className="flex items-center gap-3">
          <button onClick={() => shiftMonth(-1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">‹</button>
          <input
            type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={() => shiftMonth(1)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">›</button>
          <span className="text-sm text-gray-400">정산 대상 캠페인 {filtered.length}개</span>
        </div>

        {/* 대행사 요약 카드 */}
        {agencySummaries.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">대행사 선택</span>
              {selectedAgencyId && (
                <button onClick={() => setSelectedAgencyId(null)}
                  className="rounded-full border border-gray-200 bg-white px-3 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100">
                  전체 보기
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {agencySummaries.map((s, idx) => {
                const clr     = AGENCY_PALETTE[idx % AGENCY_PALETTE.length]
                const isOn    = selectedAgencyId === s.agency.id
                const isDimmed = selectedAgencyId !== null && !isOn
                return (
                  <button key={s.agency.id} onClick={() => setSelectedAgencyId(isOn ? null : s.agency.id)}
                    className={`relative rounded-xl border-2 px-4 py-3 text-left shadow-sm transition-all ${
                      isOn ? `${clr} ring-2 ring-offset-1 scale-[1.02]`
                           : isDimmed ? "border-gray-200 bg-white opacity-40"
                           : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                    }`}
                  >
                    {isOn && <span className="absolute top-2 right-2 text-[10px] font-bold">✓</span>}
                    <p className="text-xs font-bold text-gray-800 truncate">{s.agency.name}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{s.campaigns.length}개 캠페인</p>
                    <p className="mt-2 text-sm font-semibold text-gray-800">{fmt(s.totalFee)}원</p>
                    <p className="text-xs text-gray-400">집행 {fmt(s.totalSpend)}원</p>
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
        ) : agencySummaries.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
            대행사 정보가 없습니다. 캠페인 집행 현황에서 대행사를 먼저 등록해주세요.
          </div>
        ) : (
          <>
            {/* 집행금액 입력 테이블 */}
            {visibleSummaries.map(({ agency, campaigns: cList }, agIdx) => (
              <div key={agency.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* 대행사 헤더 */}
                <div className={`flex items-center justify-between border-b px-5 py-3.5 ${
                  AGENCY_PALETTE[agIdx % AGENCY_PALETTE.length].includes("blue") ? "border-blue-100 bg-blue-50/50" :
                  AGENCY_PALETTE[agIdx % AGENCY_PALETTE.length].includes("emerald") ? "border-emerald-100 bg-emerald-50/50" :
                  AGENCY_PALETTE[agIdx % AGENCY_PALETTE.length].includes("violet") ? "border-violet-100 bg-violet-50/50" :
                  AGENCY_PALETTE[agIdx % AGENCY_PALETTE.length].includes("orange") ? "border-orange-100 bg-orange-50/50" :
                  AGENCY_PALETTE[agIdx % AGENCY_PALETTE.length].includes("rose")   ? "border-rose-100 bg-rose-50/50" :
                  "border-teal-100 bg-teal-50/50"
                }`}>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">{agency.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">캠페인 {cList.length}개 · {agency.contactName ? `담당자: ${agency.contactName}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">총 대행수수료</p>
                    <p className="text-base font-bold text-blue-700">
                      {fmt(cList.reduce((sum, c) => {
                        let fee = 0
                        for (const mb of c.mediaBudgets) {
                          fee += Math.round(getSpend(c.id, mb.media, "dmp")    * (mb.dmp.agencyFeeRate    ?? 0) / 100)
                          fee += Math.round(getSpend(c.id, mb.media, "nondmp") * (mb.nonDmp.agencyFeeRate ?? 0) / 100)
                        }
                        return sum + fee
                      }, 0))}원
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                        <th className="px-4 py-2.5 text-left font-medium">광고주</th>
                        <th className="px-4 py-2.5 text-left font-medium">캠페인</th>
                        <th className="px-4 py-2.5 text-left font-medium">매체</th>
                        <th className="px-4 py-2.5 text-left font-medium">구분</th>
                        <th className="px-4 py-2.5 text-right font-medium">매체마크업</th>
                        <th className="px-4 py-2.5 text-right font-medium">수수료율</th>
                        <th className="px-4 py-2.5 text-right font-medium w-40">집행금액 (원)</th>
                        <th className="px-4 py-2.5 text-right font-medium">대행수수료 (원)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {cList.map(c => {
                        const rows: { media: string; type: "dmp" | "nondmp"; label: string; feeRate: number; markupRate: number }[] = []
                        for (const mb of c.mediaBudgets) {
                          const mm = MEDIA_MARKUP_RATE[mb.media] ?? 0
                          if (mb.dmp.agencyFeeRate > 0 || mb.dmp.budget > 0)
                            rows.push({ media: mb.media, type: "dmp",    label: "DMP 활용",   feeRate: mb.dmp.agencyFeeRate,    markupRate: mm + DMP_FEE_RATE })
                          if (mb.nonDmp.agencyFeeRate > 0 || mb.nonDmp.budget > 0)
                            rows.push({ media: mb.media, type: "nondmp", label: "DMP 미활용", feeRate: mb.nonDmp.agencyFeeRate, markupRate: mm })
                        }
                        if (rows.length === 0) return null
                        return rows.map((r, ri) => {
                          const spend = getSpend(c.id, r.media, r.type)
                          const fee   = Math.round(spend * r.feeRate / 100)
                          return (
                            <tr key={`${c.id}|${r.media}|${r.type}`} className="hover:bg-gray-50/50 transition-colors">
                              {ri === 0 && (
                                <td rowSpan={rows.length} className="px-4 py-2.5 align-top">
                                  <p className="font-medium text-gray-800">{getAdvertiserName(c)}</p>
                                </td>
                              )}
                              {ri === 0 && (
                                <td rowSpan={rows.length} className="px-4 py-2.5 align-top">
                                  <p className="text-gray-700">{c.campaignName}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{c.startDate} ~ {c.endDate}</p>
                                </td>
                              )}
                              <td className="px-4 py-2.5">
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{r.media}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{r.label}</td>
                              <td className="px-4 py-2.5 text-right text-xs text-gray-400">{r.markupRate}%</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className="font-medium text-gray-700">{r.feeRate}%</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <input
                                  type="number" min={0} step={1000}
                                  value={spend || ""}
                                  placeholder="0"
                                  onChange={e => setSpend(c.id, r.media, r.type, Number(e.target.value))}
                                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-right text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-blue-700">
                                {spend > 0 ? fmt(fee) : "-"}
                              </td>
                            </tr>
                          )
                        })
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* 정산 결과 요약 */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">정산 결과 요약</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selectedAgencyId ? `${visibleSummaries[0]?.agency.name} 선택됨` : "전체 대행사"} · 대행사별 수수료 합계
                  </p>
                </div>
                <button onClick={copyAsExcel}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    copied ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {copied ? "✓ 복사됨" : "📋 엑셀 복사"}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                      <th className="px-4 py-2.5 text-left font-medium">대행사</th>
                      <th className="px-4 py-2.5 text-right font-medium">캠페인 수</th>
                      <th className="px-4 py-2.5 text-right font-medium">총 집행금액</th>
                      <th className="px-4 py-2.5 text-right font-medium">총 대행수수료</th>
                      <th className="px-4 py-2.5 text-right font-medium">실효 수수료율</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visibleSummaries.map(s => {
                      const effectiveRate = s.totalSpend > 0
                        ? ((s.totalFee / s.totalSpend) * 100).toFixed(1) : "-"
                      return (
                        <tr key={s.agency.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{s.agency.name}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{s.campaigns.length}개</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">{s.totalSpend > 0 ? fmt(s.totalSpend) : "-"}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{s.totalFee > 0 ? fmt(s.totalFee) : "-"}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{effectiveRate !== "-" ? `${effectiveRate}%` : "-"}</td>
                        </tr>
                      )
                    })}
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                      <td className="px-4 py-2.5 text-gray-700">합계 {selectedAgencyId ? `(${visibleSummaries[0]?.agency.name})` : "(전체)"}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {visibleSummaries.reduce((s, a) => s + a.campaigns.length, 0)}개
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-800">{grandTotalSpend > 0 ? fmt(grandTotalSpend) : "-"}</td>
                      <td className="px-4 py-2.5 text-right text-blue-700">{grandTotalFee > 0 ? fmt(grandTotalFee) : "-"}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {grandTotalSpend > 0 ? `${((grandTotalFee / grandTotalSpend) * 100).toFixed(1)}%` : "-"}
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
