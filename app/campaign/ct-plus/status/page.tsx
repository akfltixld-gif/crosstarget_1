"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Campaign, Operator, Agency, Advertiser, MediaBudget, TargetingBudget,
  AVAILABLE_MEDIA, MEDIA_MARKUP_RATE, MEDIA_COLORS,
  DMP_TARGETS, NON_DMP_TARGETS, DMP_FEE_RATE,
  getTotalMarkup, calcSettingCost, calcSpendRate,
  getMediaTotals, getCampaignTotals, getCampaignProgress, getDday,
} from "@/lib/campaignTypes"

const STORAGE_KEY     = "ct-plus-campaigns-v7"
const OPERATOR_KEY    = "ct-plus-operators-v1"
const AGENCY_KEY      = "ct-plus-agencies-v1"
const ADVERTISER_KEY  = "ct-plus-advertisers-v1"

// ── 유틸 ─────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString("ko-KR") }

function spendRateStyle(rate: number): { text: string; bar: string } {
  if (rate <= 20)  return { text: "text-blue-500",   bar: "bg-blue-400" }
  if (rate <= 40)  return { text: "text-sky-500",    bar: "bg-sky-400" }
  if (rate <= 60)  return { text: "text-green-600",  bar: "bg-green-500" }
  if (rate <= 75)  return { text: "text-yellow-600", bar: "bg-yellow-400" }
  if (rate <= 90)  return { text: "text-orange-500", bar: "bg-orange-400" }
  if (rate <= 100) return { text: "text-red-500",    bar: "bg-red-400" }
  return                   { text: "text-red-700",   bar: "bg-red-600" }
}

function getDailySuggestion(c: Campaign): string {
  const { totalSettingCost, totalSpend } = getCampaignTotals(c)
  const remaining = totalSettingCost - totalSpend
  if (remaining <= 0) return `세팅 금액 100% 초과 소진`
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end   = new Date(c.endDate); end.setHours(0, 0, 0, 0)
  const days  = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return `미소진 ${fmt(remaining)}원 (기간 만료)`
  const daily = Math.round(remaining / days)
  return `미소진 ${fmt(remaining)}원 · 남은 ${days}일 기준 일 예산 약 ${fmt(daily)}원으로 조정 필요`
}

// ── 샘플 데이터 ───────────────────────────────────────────
const SAMPLE_AGENCIES: Agency[] = [
  { id: "ag1", name: "모티브인텔리전스", contactName: "박민준", email: "mj@motive.co.kr", phone: "02-1234-5678" },
  { id: "ag2", name: "애드플러스",       contactName: "최지연", email: "jy@adplus.co.kr", phone: "02-9876-5432" },
]
const SAMPLE_ADVERTISERS: Advertiser[] = [
  { id: "adv1", name: "트립앤샵",   agencyId: "ag1" },
  { id: "adv2", name: "에코라이프", agencyId: "ag2" },
]
const SAMPLE: Campaign[] = [
  {
    id: "c1", advertiserId: "adv1", campaignName: "2026 봄 시즌 브랜딩",
    mediaBudgets: [
      { media: "네이버 GFA",
        dmp:    { budget: 4_000_000, spend: 2_000_000, agencyFeeRate: 10, targetings: ["SKP"] },
        nonDmp: { budget: 1_000_000, spend: 350_000,   agencyFeeRate: 5,  targetings: ["리타겟팅"] } },
      { media: "Google",
        dmp:    { budget: 2_000_000, spend: 600_000,   agencyFeeRate: 5,  targetings: ["SKP", "KB"] },
        nonDmp: { budget: 1_000_000, spend: 200_000,   agencyFeeRate: 5,  targetings: ["매체 타겟팅"] } },
      { media: "META",
        dmp:    { budget: 0,         spend: 0,         agencyFeeRate: 10, targetings: [] },
        nonDmp: { budget: 2_000_000, spend: 400_000,   agencyFeeRate: 15, targetings: ["리타겟팅"] } },
    ],
    startDate: "2026-02-01", endDate: "2026-04-30",
    settlementMonth: "2026-04", agencyId: "ag1", managerId: "op1",
    status: "집행 중", createdAt: "2026-01-20T10:00:00Z",
  },
  {
    id: "c2", advertiserId: "adv2", campaignName: "그린위크 프로모션",
    mediaBudgets: [
      { media: "카카오모먼트",
        dmp:    { budget: 3_000_000, spend: 2_850_000, agencyFeeRate: 7, targetings: ["LOTTE", "TG360"] },
        nonDmp: { budget: 1_000_000, spend: 920_000,   agencyFeeRate: 7, targetings: ["매체 타겟팅"] } },
    ],
    startDate: "2026-01-01", endDate: "2026-02-28",
    settlementMonth: "2026-02", agencyId: "ag2", managerId: "op2",
    status: "종료", createdAt: "2025-12-25T09:00:00Z",
  },
]

function emptyTB(): TargetingBudget { return { budget: 0, spend: 0, agencyFeeRate: 10, targetings: [] } }
function emptyMB(media: string): MediaBudget { return { media, dmp: emptyTB(), nonDmp: emptyTB() } }

type MainTab = "campaigns" | "operators" | "agencies" | "advertisers"
type FilterStatus = "전체" | "집행 중" | "종료"
interface ConfirmCfg { title: string; message: string; onConfirm: () => void }

// ════════════════════════════════════════════════════════
export default function CampaignStatusPage() {
  const [campaigns,    setCampaigns]    = useState<Campaign[]>([])
  const [operators,    setOperators]    = useState<Operator[]>([])
  const [agencies,     setAgencies]     = useState<Agency[]>([])
  const [advertisers,  setAdvertisers]  = useState<Advertiser[]>([])
  const [mainTab,      setMainTab]      = useState<MainTab>("campaigns")
  const [filterStatus,   setFilterStatus]   = useState<FilterStatus>("전체")
  const [filterMonth,    setFilterMonth]    = useState("")
  const [filterOperator, setFilterOperator] = useState("")
  const [filterMedia,    setFilterMedia]    = useState("")
  const [searchQuery,    setSearchQuery]    = useState("")
  const [expandedIds,    setExpandedIds]    = useState<Set<string>>(new Set())
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<Campaign | null>(null)
  const [opModalOpen,  setOpModalOpen]  = useState(false)
  const [editOp,       setEditOp]       = useState<Operator | null>(null)
  const [agModalOpen,  setAgModalOpen]  = useState(false)
  const [editAg,       setEditAg]       = useState<Agency | null>(null)
  const [advModalOpen, setAdvModalOpen] = useState(false)
  const [editAdv,      setEditAdv]      = useState<Advertiser | null>(null)
  const [confirmCfg,   setConfirmCfg]   = useState<ConfirmCfg | null>(null)
  const [alertOpen,    setAlertOpen]    = useState(true)
  const [memoTarget,   setMemoTarget]   = useState<Campaign | null>(null)

  useEffect(() => {
    try { const r = localStorage.getItem(STORAGE_KEY);    setCampaigns(r   ? JSON.parse(r) : SAMPLE)             } catch { setCampaigns(SAMPLE) }
    try { const r = localStorage.getItem(OPERATOR_KEY);   setOperators(r   ? JSON.parse(r) : [
      { id: "op1", name: "김지훈", email: "jihun@example.com", phone: "010-1234-5678" },
      { id: "op2", name: "이수진", email: "sujin@example.com", phone: "010-9876-5432" },
    ]) } catch { }
    try { const r = localStorage.getItem(AGENCY_KEY);     setAgencies(r    ? JSON.parse(r) : SAMPLE_AGENCIES)    } catch { }
    try { const r = localStorage.getItem(ADVERTISER_KEY); setAdvertisers(r ? JSON.parse(r) : SAMPLE_ADVERTISERS) } catch { }
  }, [])

  function saveCampaigns(n: Campaign[])     { setCampaigns(n);   try { localStorage.setItem(STORAGE_KEY,    JSON.stringify(n)) } catch { } }
  function saveOperators(n: Operator[])     { setOperators(n);   try { localStorage.setItem(OPERATOR_KEY,   JSON.stringify(n)) } catch { } }
  function saveAgencies(n: Agency[])        { setAgencies(n);    try { localStorage.setItem(AGENCY_KEY,     JSON.stringify(n)) } catch { } }
  function saveAdvertisers(n: Advertiser[]) { setAdvertisers(n); try { localStorage.setItem(ADVERTISER_KEY, JSON.stringify(n)) } catch { } }

  const filtered = useMemo(() => campaigns.filter(c => {
    if (filterStatus !== "전체" && c.status !== filterStatus) return false
    if (filterMonth    && c.settlementMonth !== filterMonth) return false
    if (filterOperator && c.managerId !== filterOperator) return false
    if (filterMedia    && !c.mediaBudgets.some(mb => mb.media === filterMedia)) return false
    if (searchQuery) {
      const q   = searchQuery.toLowerCase()
      const ag  = agencies.find(a => a.id === c.agencyId)?.name ?? ""
      const adv = advertisers.find(a => a.id === c.advertiserId)?.name ?? ""
      if (!adv.toLowerCase().includes(q) && !c.campaignName.toLowerCase().includes(q) && !ag.toLowerCase().includes(q)) return false
    }
    return true
  }), [campaigns, filterStatus, filterMonth, filterOperator, filterMedia, searchQuery, agencies, advertisers])

  const summary = useMemo(() => {
    let totalBudget = 0, totalSettingCost = 0
    filtered.forEach(c => { const t = getCampaignTotals(c); totalBudget += t.totalBudget; totalSettingCost += t.totalSettingCost })
    return { total: filtered.length, active: filtered.filter(c => c.status === "집행 중").length,
             ended: filtered.filter(c => c.status === "종료").length, totalBudget, totalSettingCost }
  }, [filtered])

  const laggingCampaigns = useMemo(() => filtered.filter(c => {
    if (c.status !== "집행 중") return false
    return getCampaignProgress(c.startDate, c.endDate) - getCampaignTotals(c).spendRate >= 15
  }), [filtered])

  // ── 액션 ──────────────────────────────────────────────
  function confirm(cfg: ConfirmCfg) { setConfirmCfg(cfg) }

  function handleStatusToggle(id: string) {
    const c = campaigns.find(x => x.id === id)!
    const next = c.status === "집행 중" ? "종료" : "집행 중"
    confirm({ title: "상태 변경",
      message: `"${c.campaignName}"\n캠페인을 [${next}](으)로 변경하시겠습니까?`,
      onConfirm: () => { saveCampaigns(campaigns.map(x => x.id === id ? { ...x, status: next } : x)); setConfirmCfg(null) } })
  }
  function handleDelete(id: string) {
    const c = campaigns.find(x => x.id === id)!
    confirm({ title: "캠페인 삭제",
      message: `"${advName(c.advertiserId)} - ${c.campaignName}"\n을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      onConfirm: () => { saveCampaigns(campaigns.filter(x => x.id !== id)); setConfirmCfg(null) } })
  }
  function handleDeleteOp(id: string) {
    if (campaigns.some(c => c.managerId === id)) { alert("담당 캠페인이 있어 삭제할 수 없습니다."); return }
    confirm({ title: "운영자 삭제", message: "해당 운영자를 삭제하시겠습니까?",
      onConfirm: () => { saveOperators(operators.filter(o => o.id !== id)); setConfirmCfg(null) } })
  }
  function handleDeleteAg(id: string) {
    if (advertisers.some(a => a.agencyId === id)) { alert("소속 광고주가 있어 삭제할 수 없습니다."); return }
    if (campaigns.some(c => c.agencyId === id))   { alert("담당 캠페인이 있어 삭제할 수 없습니다."); return }
    confirm({ title: "대행사 삭제", message: "해당 대행사를 삭제하시겠습니까?",
      onConfirm: () => { saveAgencies(agencies.filter(a => a.id !== id)); setConfirmCfg(null) } })
  }
  function handleDeleteAdv(id: string) {
    if (campaigns.some(c => c.advertiserId === id)) { alert("담당 캠페인이 있어 삭제할 수 없습니다."); return }
    confirm({ title: "광고주 삭제", message: "해당 광고주를 삭제하시겠습니까?",
      onConfirm: () => { saveAdvertisers(advertisers.filter(a => a.id !== id)); setConfirmCfg(null) } })
  }

  function opName(id: string)  { return operators.find(o => o.id === id)?.name  ?? "-" }
  function agName(id: string)  { return agencies.find(a => a.id === id)?.name   ?? "-" }
  function advName(id: string) { return advertisers.find(a => a.id === id)?.name ?? "-" }

  const settlementMonths = useMemo(() =>
    Array.from(new Set(campaigns.map(c => c.settlementMonth).filter(Boolean))).sort().reverse()
  , [campaigns])

  const isFiltered = filterStatus !== "전체" || filterMonth || filterOperator || filterMedia || searchQuery

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">캠페인 집행 현황</h1>
            <p className="text-xs text-gray-400 mt-0.5">캠페인 리포트 · CT+ · 집행 현황</p>
          </div>
          <div className="flex gap-2">
            {mainTab === "campaigns"   && <button onClick={() => { setEditTarget(null); setModalOpen(true) }}  className={btnPrimary}>+ 캠페인 추가</button>}
            {mainTab === "operators"   && <button onClick={() => { setEditOp(null);     setOpModalOpen(true) }} className={btnPrimary}>+ 운영자 추가</button>}
            {mainTab === "agencies"    && <button onClick={() => { setEditAg(null);     setAgModalOpen(true) }} className={btnPrimary}>+ 대행사 추가</button>}
            {mainTab === "advertisers" && <button onClick={() => { setEditAdv(null);    setAdvModalOpen(true) }} className={btnPrimary}>+ 광고주 추가</button>}
          </div>
        </div>
        <div className="mt-3 flex gap-1">
          {([
            ["campaigns",   "캠페인 목록"],
            ["operators",   "운영자 관리"],
            ["agencies",    "대행사 관리"],
            ["advertisers", "광고주 관리"],
          ] as [MainTab, string][]).map(([tab, label]) => (
            <button key={tab} onClick={() => setMainTab(tab)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${mainTab === tab ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-6 space-y-4">

        {/* ══ 캠페인 목록 탭 ══════════════════════════════ */}
        {mainTab === "campaigns" && (
          <>
            {/* 요약 카드 */}
            <div className="space-y-1.5">
              {isFiltered && <p className="text-xs text-blue-600 font-medium">필터 적용 중 · {summary.total}개 캠페인 기준</p>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <SCard label="전체 캠페인" value={`${summary.total}개`} />
                <SCard label="집행 중"     value={`${summary.active}개`} color="blue" />
                <SCard label="종료"        value={`${summary.ended}개`}  color="gray" />
                <SCard label="부킹 금액"   value={fmt(summary.totalBudget)} sub="원" />
                <SCard label="세팅 금액"   value={fmt(summary.totalSettingCost)} sub="원" />
              </div>
            </div>

            {/* 집행 속도 지연 알림 */}
            {laggingCampaigns.length > 0 && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 overflow-hidden">
                <button onClick={() => setAlertOpen(v => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-yellow-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <span className="text-sm font-semibold text-yellow-800">집행 속도 점검 필요 · {laggingCampaigns.length}개 캠페인</span>
                    <span className="text-xs text-yellow-600">진행률 대비 소진율 15%p 이상 지연</span>
                  </div>
                  <svg className={`h-4 w-4 text-yellow-500 transition-transform ${alertOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {alertOpen && (
                  <div className="border-t border-yellow-200 divide-y divide-yellow-100">
                    {laggingCampaigns.map(c => {
                      const progress      = getCampaignProgress(c.startDate, c.endDate)
                      const { spendRate } = getCampaignTotals(c)
                      return (
                        <div key={c.id} className="px-4 py-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-semibold text-yellow-900">{advName(c.advertiserId)}</span>
                              <span className="text-xs text-yellow-700 ml-2">{c.campaignName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-gray-500">담당: <strong>{opName(c.managerId)}</strong></span>
                              <span className="text-blue-600">진행률 <strong>{progress}%</strong></span>
                              <span className={spendRateStyle(spendRate).text}>소진율 <strong>{spendRate}%</strong></span>
                              <span className="rounded-full bg-yellow-200 px-2 py-0.5 font-semibold text-yellow-800">
                                -{(progress - spendRate).toFixed(1)}%p
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-yellow-700 rounded-lg bg-yellow-100 px-3 py-1.5">{getDailySuggestion(c)}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 필터 */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1">
                {(["전체", "집행 중", "종료"] as FilterStatus[]).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterStatus === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-gray-200" />
              <select value={filterMonth}    onChange={e => setFilterMonth(e.target.value)}    className={selectCls}>
                <option value="">정산 월 전체</option>
                {settlementMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filterOperator} onChange={e => setFilterOperator(e.target.value)} className={selectCls}>
                <option value="">담당자 전체</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <select value={filterMedia}    onChange={e => setFilterMedia(e.target.value)}    className={selectCls}>
                <option value="">매체 전체</option>
                {AVAILABLE_MEDIA.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {isFiltered && (
                <button onClick={() => { setFilterStatus("전체"); setFilterMonth(""); setFilterOperator(""); setFilterMedia(""); setSearchQuery("") }}
                  className="rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-400 hover:text-red-500 hover:border-red-200">
                  초기화 ✕
                </button>
              )}
              <div className="ml-auto">
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="광고주·캠페인·대행사 검색"
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs w-52 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            </div>

            {/* 캠페인 테이블 */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500">
                    <th className="w-8 px-3 py-3"></th>
                    <th className="px-4 py-3 text-left">광고주 / 캠페인</th>
                    <th className="px-4 py-3 text-left">매체</th>
                    <th className="px-4 py-3 text-right">부킹 금액</th>
                    <th className="px-4 py-3 text-right">세팅 금액</th>
                    <th className="px-4 py-3 text-right">소진 / 소진율</th>
                    <th className="px-4 py-3 text-center">진행률</th>
                    <th className="px-4 py-3 text-center">정산 월</th>
                    <th className="px-4 py-3 text-center">대행수수료율</th>
                    <th className="px-4 py-3 text-center">담당자</th>
                    <th className="px-4 py-3 text-center">상태</th>
                    <th className="px-4 py-3 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 && (
                    <tr><td colSpan={12} className="py-12 text-center text-sm text-gray-400">조건에 맞는 캠페인이 없습니다.</td></tr>
                  )}
                  {filtered.map(c => {
                    const totals    = getCampaignTotals(c)
                    const dday      = getDday(c.endDate)
                    const progress  = getCampaignProgress(c.startDate, c.endDate)
                    const isLagging = c.status === "집행 중" && (progress - totals.spendRate) >= 15
                    const expanded  = expandedIds.has(c.id)
                    const sc        = spendRateStyle(totals.spendRate)

                    return (
                      <React.Fragment key={c.id}>
                        <tr className={`hover:bg-gray-50 transition-colors ${isLagging ? "bg-yellow-50/30" : ""}`}>
                          {/* 펼치기 */}
                          <td className="px-3 py-3 text-center">
                            <button onClick={() => setExpandedIds(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })}
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-100 mx-auto">
                              <svg className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </td>

                          {/* 광고주 / 캠페인 */}
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-900">{advName(c.advertiserId)}</p>
                            <p className="text-xs text-gray-500 mt-0.5 max-w-[160px] truncate">{c.campaignName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{agName(c.agencyId)}</p>
                          </td>

                          {/* 매체 배지만 표시 */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {c.mediaBudgets.map(mb => {
                                const col = MEDIA_COLORS[mb.media] ?? { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" }
                                return (
                                  <span key={mb.media} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${col.bg} ${col.text} ${col.border}`}>
                                    {mb.media}
                                  </span>
                                )
                              })}
                            </div>
                          </td>

                          {/* 부킹 금액 */}
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm text-gray-700">{fmt(totals.totalBudget)}</span>
                            <span className="text-xs text-gray-400 ml-0.5">원</span>
                          </td>

                          {/* 세팅 금액 */}
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm text-gray-700">{fmt(totals.totalSettingCost)}</span>
                            <span className="text-xs text-gray-400 ml-0.5">원</span>
                          </td>

                          {/* 소진 / 소진율 + 지연 툴팁 */}
                          <td className="px-4 py-3 text-right">
                            <p className={`text-sm font-bold ${sc.text}`}>{fmt(totals.totalSpend)}<span className="text-xs font-normal ml-0.5">원</span></p>
                            <div className="mt-1 flex items-center justify-end gap-1">
                              <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${sc.bar}`} style={{ width: `${Math.min(totals.spendRate, 100)}%` }} />
                              </div>
                              <span className={`text-xs font-semibold ${sc.text}`}>{totals.spendRate}%</span>
                            </div>
                            {isLagging && (
                              <div className="relative mt-1 inline-block group">
                                <span className="cursor-help text-xs font-semibold text-yellow-600">⚠️ 지연</span>
                                <div className="pointer-events-none absolute bottom-full right-0 z-20 mb-1.5 w-64 rounded-lg bg-gray-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-normal">
                                  {getDailySuggestion(c)}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 진행률 — D-일자 + 기간 + 바 */}
                          <td className="px-4 py-3 text-center">
                            {c.status === "종료" ? <span className="text-xs text-gray-400">-</span> : (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={`text-xs font-bold ${dday.expired ? "text-gray-400" : dday.urgent ? "text-orange-600" : "text-blue-600"}`}>
                                  {dday.label}
                                </span>
                                <p className="text-xs text-gray-400">{c.startDate} ~ {c.endDate}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="h-1.5 w-14 rounded-full bg-gray-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-blue-300 transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                                  </div>
                                  <span className="text-xs text-blue-600 font-medium">{progress}%</span>
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center text-xs text-gray-600">{c.settlementMonth}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number" min={0} max={100} step={0.1}
                                value={c.agencyFeeRate ?? ""}
                                placeholder="0"
                                onChange={e => {
                                  const val = e.target.value === "" ? undefined : Number(e.target.value)
                                  saveCampaigns(campaigns.map(x => x.id === c.id ? { ...x, agencyFeeRate: val } : x))
                                }}
                                className="w-14 rounded-md border border-gray-200 px-1.5 py-1 text-center text-xs text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100"
                              />
                              <span className="text-xs text-gray-400">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-600">{opName(c.managerId)}</td>

                          {/* 상태 */}
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleStatusToggle(c.id)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${c.status === "집행 중" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                              {c.status}
                            </button>
                          </td>

                          {/* 관리 */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* 메모 버튼 — 호버 시 내용 표시 */}
                              <div className="relative group">
                                <button onClick={() => setMemoTarget(c)}
                                  className={`rounded px-1.5 py-1 text-sm transition-colors ${c.memo ? "text-amber-500 hover:bg-amber-50" : "text-gray-300 hover:text-gray-400 hover:bg-gray-50"}`}
                                  title={c.memo ? "메모 보기/수정" : "메모 추가"}>
                                  📝
                                </button>
                                {c.memo && (
                                  <div className="pointer-events-none absolute bottom-full right-0 z-30 mb-1.5 w-56 rounded-lg bg-gray-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-pre-wrap">
                                    {c.memo}
                                  </div>
                                )}
                              </div>
                              <button onClick={() => { setEditTarget(c); setModalOpen(true) }} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">수정</button>
                              <button onClick={() => handleDelete(c.id)} className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50">삭제</button>
                            </div>
                          </td>
                        </tr>

                        {/* 매체별 상세 — 매체를 카드로 구분 */}
                        {expanded && (
                          <tr className="bg-slate-50">
                            <td></td>
                            <td colSpan={10} className="px-4 py-3">
                              <div className="space-y-3">
                                {c.mediaBudgets.map(mb => {
                                  const mm  = MEDIA_MARKUP_RATE[mb.media] ?? 0
                                  const mt  = getMediaTotals(mb)
                                  const col = MEDIA_COLORS[mb.media] ?? { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" }
                                  const rows = [
                                    { label: "DMP 활용",   tb: mb.dmp,    dmpRate: DMP_FEE_RATE, markup: mt.dmpMarkup,    sc: mt.dmpSC,    isDmp: true  },
                                    { label: "DMP 미활용", tb: mb.nonDmp, dmpRate: 0,            markup: mt.nonDmpMarkup, sc: mt.nonDmpSC, isDmp: false },
                                  ].filter(r => r.tb.budget > 0 || r.tb.targetings.length > 0)

                                  return (
                                    <div key={mb.media} className="rounded-lg border border-gray-200 overflow-hidden">
                                      {/* 매체 헤더 */}
                                      <div className={`flex items-center justify-between px-3 py-2 ${col.bg} border-b ${col.border}`}>
                                        <span className={`text-xs font-bold ${col.text}`}>{mb.media}</span>
                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                          <span>소진 <strong className={spendRateStyle(mt.spendRate).text}>{fmt(mt.totalSpend)}원</strong></span>
                                          <span className="text-gray-300">|</span>
                                          <span>세팅비용 {fmt(mt.totalSettingCost)}원</span>
                                          <span className="text-gray-300">|</span>
                                          <span>소진율 <strong className={spendRateStyle(mt.spendRate).text}>{mt.spendRate}%</strong></span>
                                        </div>
                                      </div>
                                      {/* 세부 행 테이블 */}
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-gray-400 bg-white border-b border-gray-100">
                                            <th className="text-left py-1.5 px-3 font-medium">구간</th>
                                            <th className="text-left py-1.5 px-3 font-medium">타겟팅</th>
                                            <th className="text-right py-1.5 px-3 font-medium">마크업</th>
                                            <th className="text-right py-1.5 px-3 font-medium">부킹 금액</th>
                                            <th className="text-right py-1.5 px-3 font-medium">세팅 금액</th>
                                            <th className="text-right py-1.5 px-3 font-medium">소진</th>
                                            <th className="text-right py-1.5 px-3 font-medium">소진율</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                          {rows.map(r => (
                                            <tr key={r.label} className="hover:bg-gray-50">
                                              <td className="py-2 px-3">
                                                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${r.isDmp ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                                                  {r.label}
                                                </span>
                                              </td>
                                              <td className="py-2 px-3">
                                                <div className="flex flex-wrap gap-1">
                                                  {r.tb.targetings.length === 0
                                                    ? <span className="text-gray-300">-</span>
                                                    : r.tb.targetings.map(t => (
                                                      <span key={t} className={`rounded-full border px-1.5 py-0.5 text-xs font-medium ${r.isDmp ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>{t}</span>
                                                    ))}
                                                </div>
                                              </td>
                                              <td className="py-2 px-3 text-right text-gray-500 whitespace-nowrap">
                                                {mm > 0 && <span className="text-orange-500 font-medium">운영 {mm}%</span>}
                                                {mm > 0 && <span> + </span>}
                                                {r.dmpRate > 0 && <span>DMP {r.dmpRate}% + </span>}
                                                대행 {r.tb.agencyFeeRate}% = <strong className="text-gray-700">{r.markup}%</strong>
                                              </td>
                                              <td className="py-2 px-3 text-right text-gray-700">{fmt(r.tb.budget)}원</td>
                                              <td className="py-2 px-3 text-right text-gray-700">{fmt(r.sc)}원</td>
                                              <td className="py-2 px-3 text-right font-bold text-gray-700">{fmt(r.tb.spend)}원</td>
                                              <td className="py-2 px-3 text-right">
                                                {(() => { const s = spendRateStyle(calcSpendRate(r.tb.spend, r.sc)); return (
                                                  <span className={`font-semibold ${s.text}`}>{calcSpendRate(r.tb.spend, r.sc)}%</span>
                                                )})()}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══ 운영자 관리 탭 ══════════════════════════════ */}
        {mainTab === "operators" && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500">
                  <th className="px-4 py-3 text-left">이름</th>
                  <th className="px-4 py-3 text-left">이메일</th>
                  <th className="px-4 py-3 text-left">연락처</th>
                  <th className="px-4 py-3 text-center">담당 캠페인</th>
                  <th className="px-4 py-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {operators.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-sm text-gray-400">등록된 운영자가 없습니다.</td></tr>}
                {operators.map(op => {
                  const assigned = campaigns.filter(c => c.managerId === op.id)
                  return (
                    <tr key={op.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{op.name}</td>
                      <td className="px-4 py-3 text-gray-600">{op.email}</td>
                      <td className="px-4 py-3 text-gray-600">{op.phone}</td>
                      <td className="px-4 py-3 text-center">
                        {assigned.length === 0 ? <span className="text-xs text-gray-400">없음</span> : (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {assigned.map(c => <CampaignBadge key={c.id} c={c} label={`${advName(c.advertiserId)} · ${c.campaignName}`} />)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActionBtns onEdit={() => { setEditOp(op); setOpModalOpen(true) }} onDelete={() => handleDeleteOp(op.id)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ══ 대행사 관리 탭 ══════════════════════════════ */}
        {mainTab === "agencies" && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500">
                  <th className="px-4 py-3 text-left">대행사명</th>
                  <th className="px-4 py-3 text-left">담당자</th>
                  <th className="px-4 py-3 text-left">이메일</th>
                  <th className="px-4 py-3 text-left">연락처</th>
                  <th className="px-4 py-3 text-left">소속 광고주</th>
                  <th className="px-4 py-3 text-center">진행 캠페인</th>
                  <th className="px-4 py-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {agencies.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">등록된 대행사가 없습니다.</td></tr>}
                {agencies.map(ag => {
                  const agAdvs   = advertisers.filter(a => a.agencyId === ag.id)
                  const assigned = campaigns.filter(c => c.agencyId === ag.id)
                  return (
                    <tr key={ag.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3 font-semibold text-gray-900">{ag.name}</td>
                      <td className="px-4 py-3 text-gray-700">{ag.contactName}</td>
                      <td className="px-4 py-3 text-gray-600">{ag.email}</td>
                      <td className="px-4 py-3 text-gray-600">{ag.phone}</td>
                      <td className="px-4 py-3">
                        {agAdvs.length === 0 ? <span className="text-xs text-gray-400">없음</span> : (
                          <div className="flex flex-wrap gap-1">
                            {agAdvs.map(a => (
                              <span key={a.id} className="rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-xs text-purple-700">{a.name}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {assigned.length === 0 ? <span className="text-xs text-gray-400">없음</span> : (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {assigned.map(c => <CampaignBadge key={c.id} c={c} label={`${advName(c.advertiserId)} · ${c.campaignName}`} />)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActionBtns onEdit={() => { setEditAg(ag); setAgModalOpen(true) }} onDelete={() => handleDeleteAg(ag.id)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ══ 광고주 관리 탭 ══════════════════════════════ */}
        {mainTab === "advertisers" && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500">
                  <th className="px-4 py-3 text-left">광고주명</th>
                  <th className="px-4 py-3 text-left">소속 대행사</th>
                  <th className="px-4 py-3 text-center">진행 캠페인</th>
                  <th className="px-4 py-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {advertisers.length === 0 && <tr><td colSpan={4} className="py-12 text-center text-sm text-gray-400">등록된 광고주가 없습니다.</td></tr>}
                {advertisers.map(adv => {
                  const assigned = campaigns.filter(c => c.advertiserId === adv.id)
                  return (
                    <tr key={adv.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{adv.name}</td>
                      <td className="px-4 py-3 text-gray-600">{agName(adv.agencyId)}</td>
                      <td className="px-4 py-3 text-center">
                        {assigned.length === 0 ? <span className="text-xs text-gray-400">없음</span> : (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {assigned.map(c => <CampaignBadge key={c.id} c={c} label={c.campaignName} />)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActionBtns onEdit={() => { setEditAdv(adv); setAdvModalOpen(true) }} onDelete={() => handleDeleteAdv(adv.id)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* 모달 */}
      {modalOpen    && <CampaignModal    initial={editTarget} operators={operators} agencies={agencies} advertisers={advertisers}
                          onSave={c  => { saveCampaigns(editTarget ? campaigns.map(x => x.id === c.id ? c : x) : [...campaigns, c]); setModalOpen(false); setEditTarget(null) }}
                          onClose={() => { setModalOpen(false); setEditTarget(null) }} />}
      {opModalOpen  && <PersonModal title={editOp ? "운영자 수정" : "운영자 추가"} initial={editOp}
                          onSave={op => { saveOperators(editOp ? operators.map(o => o.id === op.id ? op : o) : [...operators, op]); setOpModalOpen(false); setEditOp(null) }}
                          onClose={() => { setOpModalOpen(false); setEditOp(null) }} />}
      {agModalOpen  && <AgencyModal initial={editAg}
                          onSave={ag => { saveAgencies(editAg ? agencies.map(a => a.id === ag.id ? ag : a) : [...agencies, ag]); setAgModalOpen(false); setEditAg(null) }}
                          onClose={() => { setAgModalOpen(false); setEditAg(null) }} />}
      {advModalOpen && <AdvertiserModal initial={editAdv} agencies={agencies}
                          onSave={adv => { saveAdvertisers(editAdv ? advertisers.map(a => a.id === adv.id ? adv : a) : [...advertisers, adv]); setAdvModalOpen(false); setEditAdv(null) }}
                          onClose={() => { setAdvModalOpen(false); setEditAdv(null) }} />}
      {confirmCfg   && <ConfirmModal title={confirmCfg.title} message={confirmCfg.message} onConfirm={confirmCfg.onConfirm} onCancel={() => setConfirmCfg(null)} />}
      {memoTarget   && <MemoModal campaign={memoTarget}
                          onSave={memo => { saveCampaigns(campaigns.map(c => c.id === memoTarget.id ? { ...c, memo } : c)); setMemoTarget(null) }}
                          onClose={() => setMemoTarget(null)} />}
    </div>
  )
}

// ── 공용 소형 컴포넌트 ────────────────────────────────────
function CampaignBadge({ c, label }: { c: Campaign; label: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${c.status === "집행 중" ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
      {label}
    </span>
  )
}
function ActionBtns({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button onClick={onEdit}   className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">수정</button>
      <button onClick={onDelete} className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50">삭제</button>
    </div>
  )
}

// ── 요약 카드 ─────────────────────────────────────────────
function SCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: "blue" | "gray" }) {
  const cls = color === "blue" ? "text-blue-600" : color === "gray" ? "text-gray-400" : "text-gray-900"
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 text-base font-semibold ${cls}`}>{value}{sub && <span className="text-xs font-normal text-gray-400 ml-0.5">{sub}</span>}</p>
    </div>
  )
}

// ── 확인 모달 ─────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 whitespace-pre-line">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onCancel}  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={onConfirm} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">확인</button>
        </div>
      </div>
    </div>
  )
}

// ── 캠페인 모달 ───────────────────────────────────────────
function CampaignModal({ initial, operators, agencies, advertisers, onSave, onClose }: {
  initial: Campaign | null; operators: Operator[]; agencies: Agency[]; advertisers: Advertiser[]
  onSave: (c: Campaign) => void; onClose: () => void
}) {
  const [agencyId,        setAgencyId]        = useState(initial?.agencyId        ?? "")
  const [advertiserId,    setAdvertiserId]    = useState(initial?.advertiserId    ?? "")
  const [campaignName,    setCampaignName]    = useState(initial?.campaignName    ?? "")
  const [managerId,       setManagerId]       = useState(initial?.managerId       ?? "")
  const [startDate,       setStartDate]       = useState(initial?.startDate       ?? "")
  const [endDate,         setEndDate]         = useState(initial?.endDate         ?? "")
  const [settlementMonth, setSettlementMonth] = useState(initial?.settlementMonth ?? "")
  const [status,          setStatus]          = useState<"집행 중" | "종료">(initial?.status ?? "집행 중")
  const [mediaBudgets,    setMediaBudgets]    = useState<MediaBudget[]>(initial?.mediaBudgets ?? [])
  const [memo,            setMemo]            = useState(initial?.memo ?? "")

  // 대행사 선택 시 해당 대행사 소속 광고주만 필터
  const filteredAdvertisers = agencyId ? advertisers.filter(a => a.agencyId === agencyId) : advertisers

  function handleAgencyChange(id: string) {
    setAgencyId(id)
    setAdvertiserId("")  // 대행사 변경 시 광고주 초기화
  }

  function toggleMedia(media: string) {
    setMediaBudgets(prev => prev.find(mb => mb.media === media) ? prev.filter(mb => mb.media !== media) : [...prev, emptyMB(media)])
  }
  function updateTB(media: string, kind: "dmp" | "nonDmp", field: keyof TargetingBudget, value: string | number | string[]) {
    setMediaBudgets(prev => prev.map(mb => mb.media === media ? { ...mb, [kind]: { ...mb[kind], [field]: value } } : mb))
  }
  function toggleTarget(media: string, kind: "dmp" | "nonDmp", t: string) {
    setMediaBudgets(prev => prev.map(mb => {
      if (mb.media !== media) return mb
      const already = mb[kind].targetings.includes(t)
      return { ...mb, [kind]: { ...mb[kind], targetings: already ? mb[kind].targetings.filter(x => x !== t) : [...mb[kind].targetings, t] } }
    }))
  }

  function handleSubmit() {
    if (!agencyId)             { alert("대행사를 선택해주세요."); return }
    if (!advertiserId)         { alert("광고주를 선택해주세요."); return }
    if (!campaignName.trim())  { alert("캠페인명을 입력해주세요."); return }
    if (!startDate)            { alert("시작일을 입력해주세요."); return }
    if (!endDate)              { alert("종료일을 입력해주세요."); return }
    if (!settlementMonth)      { alert("정산 월을 입력해주세요."); return }
    if (mediaBudgets.length === 0) { alert("1개 이상의 매체를 선택해주세요."); return }
    if (!managerId)            { alert("담당 운영자를 선택해주세요."); return }
    onSave({ id: initial?.id ?? Date.now().toString(), advertiserId, campaignName: campaignName.trim(),
      agencyId, managerId, startDate, endDate, settlementMonth, status, mediaBudgets, memo: memo.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString() })
  }

  const preview = useMemo(() => {
    let budget = 0, sc = 0
    mediaBudgets.forEach(mb => { const t = getMediaTotals(mb); budget += t.totalBudget; sc += t.totalSettingCost })
    return { budget, sc }
  }, [mediaBudgets])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 z-10">
          <h2 className="text-base font-semibold text-gray-900">{initial ? "캠페인 수정" : "캠페인 추가"}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <MF label="대행사 *">
              <select value={agencyId} onChange={e => handleAgencyChange(e.target.value)} className={ic}>
                <option value="">선택</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </MF>
            <MF label="광고주 *">
              <select value={advertiserId} onChange={e => setAdvertiserId(e.target.value)} className={ic} disabled={!agencyId}>
                <option value="">{agencyId ? "선택" : "대행사를 먼저 선택하세요"}</option>
                {filteredAdvertisers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </MF>
            <MF label="캠페인명 *"><input value={campaignName} onChange={e => setCampaignName(e.target.value)} className={ic} placeholder="예) 2026 봄 브랜딩" /></MF>
            <MF label="담당 운영자 *">
              <select value={managerId} onChange={e => setManagerId(e.target.value)} className={ic}>
                <option value="">선택</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </MF>
            <MF label="시작일 *"><input type="date"  value={startDate}        onChange={e => setStartDate(e.target.value)}        className={ic} /></MF>
            <MF label="종료일 *"><input type="date"  value={endDate}          onChange={e => setEndDate(e.target.value)}          className={ic} /></MF>
            <MF label="정산 월 *"><input type="month" value={settlementMonth} onChange={e => setSettlementMonth(e.target.value)} className={ic} /></MF>
            <MF label="상태">
              <select value={status} onChange={e => setStatus(e.target.value as "집행 중" | "종료")} className={ic}>
                <option value="집행 중">집행 중</option>
                <option value="종료">종료</option>
              </select>
            </MF>
          {/* 메모 (전체 너비) */}
          <div>
            <MF label="특이사항 메모">
              <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
                className={`${ic} resize-none`} placeholder="캠페인 특이사항을 입력하세요 (선택)" />
            </MF>
          </div>
          </div>

          {/* 매체 선택 */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-2">매체 선택 *</p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_MEDIA.map(media => {
                const sel = mediaBudgets.some(mb => mb.media === media)
                const col = MEDIA_COLORS[media] ?? { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" }
                return (
                  <button key={media} type="button" onClick={() => toggleMedia(media)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${sel ? `${col.bg} ${col.text} ${col.border}` : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                    {media}{sel && " ✓"}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 매체별 DMP / 비DMP 예산 설정 */}
          {mediaBudgets.map(mb => {
            const col = MEDIA_COLORS[mb.media] ?? { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" }
            const mt  = getMediaTotals(mb)
            const mm  = MEDIA_MARKUP_RATE[mb.media] ?? 0
            return (
              <div key={mb.media} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className={`flex items-center gap-2 px-4 py-2.5 ${col.bg}`}>
                  <span className={`text-sm font-bold ${col.text}`}>{mb.media}</span>
                  {mm > 0 && (
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                      운영수수료 {mm}%
                    </span>
                  )}
                  <span className="ml-auto text-xs text-gray-500">부킹 금액 <strong>{fmt(mt.totalBudget)}</strong>원 · 세팅 금액 <strong>{fmt(mt.totalSettingCost)}</strong>원</span>
                </div>
                <div className="divide-y divide-gray-100">
                  <TSection label="DMP 활용" isDmp={true} dmpRate={DMP_FEE_RATE} mediaMarkup={mm}
                    targets={DMP_TARGETS as unknown as string[]} tb={mb.dmp}
                    onToggle={t => toggleTarget(mb.media, "dmp", t)}
                    onUpdate={(f, v) => updateTB(mb.media, "dmp", f, v)} />
                  <TSection label="DMP 미활용" isDmp={false} dmpRate={0} mediaMarkup={mm}
                    targets={NON_DMP_TARGETS as unknown as string[]} tb={mb.nonDmp}
                    onToggle={t => toggleTarget(mb.media, "nonDmp", t)}
                    onUpdate={(f, v) => updateTB(mb.media, "nonDmp", f, v)} />
                </div>
              </div>
            )
          })}

          {mediaBudgets.length > 0 && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">전체 합계</span>
              <div className="flex gap-6">
                <div className="text-right"><p className="text-xs text-gray-400">부킹 금액</p><p className="text-sm font-semibold text-gray-800">{fmt(preview.budget)}원</p></div>
                <div className="text-right"><p className="text-xs text-gray-400">세팅 금액</p><p className="text-sm font-semibold text-gray-800">{fmt(preview.sc)}원</p></div>
              </div>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4">
          <button onClick={onClose}      className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSubmit} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">저장</button>
        </div>
      </div>
    </div>
  )
}

// ── 타겟팅 섹션 ───────────────────────────────────────────
function TSection({ label, isDmp, dmpRate, mediaMarkup, targets, tb, onToggle, onUpdate }: {
  label: string; isDmp: boolean; dmpRate: number; mediaMarkup: number
  targets: string[]; tb: TargetingBudget
  onToggle: (t: string) => void
  onUpdate: (f: keyof TargetingBudget, v: string | number) => void
}) {
  const totalMarkup = getTotalMarkup(mediaMarkup, dmpRate, tb.agencyFeeRate)
  const sc          = calcSettingCost(tb.budget, totalMarkup)
  const badge       = isDmp ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-gray-50 border-gray-200 text-gray-500"
  const btnSel      = isDmp ? "bg-violet-100 border-violet-300 text-violet-700" : "bg-gray-200 border-gray-400 text-gray-700"

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${badge}`}>{label}</span>
        {mediaMarkup > 0 && (
          <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
            운영수수료 {mediaMarkup}%
          </span>
        )}
        {dmpRate > 0 && <span className="text-xs text-gray-400">DMP 수수료 {dmpRate}%</span>}
        <span className="ml-auto text-xs text-gray-500">
          {mediaMarkup > 0 && <span className="text-orange-500">운영 {mediaMarkup}%</span>}
          {mediaMarkup > 0 && " + "}
          {dmpRate > 0 && `DMP ${dmpRate}% + `}
          대행 {tb.agencyFeeRate}% = <strong className="text-gray-700">{totalMarkup}%</strong>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {targets.map(t => {
          const sel = tb.targetings.includes(t)
          return <button key={t} type="button" onClick={() => onToggle(t)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${sel ? btnSel : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"}`}>
            {t}{sel && " ✓"}
          </button>
        })}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MF label="부킹 금액 (원)"><input type="number" min={0} value={tb.budget || ""} onChange={e => onUpdate("budget", Number(e.target.value))} className={ic} placeholder="0" /></MF>
        <MF label="소진 금액 (원)"><input type="number" min={0} value={tb.spend  || ""} onChange={e => onUpdate("spend",  Number(e.target.value))} className={ic} placeholder="0" /></MF>
        <MF label="대행수수료 (%)"><input type="number" min={0} max={100} value={tb.agencyFeeRate || ""} onChange={e => onUpdate("agencyFeeRate", Number(e.target.value))} className={ic} placeholder="10" /></MF>
      </div>
      {tb.budget > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs">
          <span className="text-gray-400">세팅 금액</span>
          <span className="font-semibold text-gray-800">{fmt(sc)}원</span>
          <span className="text-gray-400">({fmt(tb.budget)} × {100 - totalMarkup}%)</span>
        </div>
      )}
    </div>
  )
}

// ── 운영자 모달 ───────────────────────────────────────────
function PersonModal({ title, initial, onSave, onClose }: {
  title: string; initial: Operator | null
  onSave: (op: Operator) => void; onClose: () => void
}) {
  const [name,  setName]  = useState(initial?.name  ?? "")
  const [email, setEmail] = useState(initial?.email ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "")
  function handleSubmit() {
    if (!name.trim()) { alert("이름을 입력해주세요."); return }
    onSave({ id: initial?.id ?? Date.now().toString(), name: name.trim(), email: email.trim(), phone: phone.trim() })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <MF label="이름 *"><input value={name}  onChange={e => setName(e.target.value)}  className={ic} placeholder="예) 김지훈" /></MF>
          <MF label="이메일"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={ic} placeholder="example@company.com" /></MF>
          <MF label="연락처"><input value={phone} onChange={e => setPhone(e.target.value)} className={ic} placeholder="010-0000-0000" /></MF>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose}      className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSubmit} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">저장</button>
        </div>
      </div>
    </div>
  )
}

// ── 대행사 모달 ───────────────────────────────────────────
function AgencyModal({ initial, onSave, onClose }: {
  initial: Agency | null; onSave: (a: Agency) => void; onClose: () => void
}) {
  const [name,        setName]        = useState(initial?.name        ?? "")
  const [contactName, setContactName] = useState(initial?.contactName ?? "")
  const [email,       setEmail]       = useState(initial?.email       ?? "")
  const [phone,       setPhone]       = useState(initial?.phone       ?? "")
  function handleSubmit() {
    if (!name.trim()) { alert("대행사명을 입력해주세요."); return }
    onSave({ id: initial?.id ?? Date.now().toString(), name: name.trim(), contactName: contactName.trim(), email: email.trim(), phone: phone.trim() })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{initial ? "대행사 수정" : "대행사 추가"}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <MF label="대행사명 *"><input value={name}        onChange={e => setName(e.target.value)}        className={ic} placeholder="예) 모티브인텔리전스" /></MF>
          <MF label="담당자명">  <input value={contactName} onChange={e => setContactName(e.target.value)} className={ic} placeholder="예) 박민준" /></MF>
          <MF label="이메일">    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={ic} placeholder="contact@agency.co.kr" /></MF>
          <MF label="연락처">    <input value={phone} onChange={e => setPhone(e.target.value)} className={ic} placeholder="02-0000-0000" /></MF>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose}      className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSubmit} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">저장</button>
        </div>
      </div>
    </div>
  )
}

// ── 광고주 모달 ───────────────────────────────────────────
function AdvertiserModal({ initial, agencies, onSave, onClose }: {
  initial: Advertiser | null; agencies: Agency[]
  onSave: (adv: Advertiser) => void; onClose: () => void
}) {
  const [name,     setName]     = useState(initial?.name     ?? "")
  const [agencyId, setAgencyId] = useState(initial?.agencyId ?? "")
  function handleSubmit() {
    if (!name.trim()) { alert("광고주명을 입력해주세요."); return }
    if (!agencyId)    { alert("소속 대행사를 선택해주세요."); return }
    onSave({ id: initial?.id ?? Date.now().toString(), name: name.trim(), agencyId })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{initial ? "광고주 수정" : "광고주 추가"}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <MF label="광고주명 *"><input value={name} onChange={e => setName(e.target.value)} className={ic} placeholder="예) 트립앤샵" /></MF>
          <MF label="소속 대행사 *">
            <select value={agencyId} onChange={e => setAgencyId(e.target.value)} className={ic}>
              <option value="">선택</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </MF>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose}      className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
          <button onClick={handleSubmit} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">저장</button>
        </div>
      </div>
    </div>
  )
}

// ── 메모 빠른 편집 모달 ───────────────────────────────────
function MemoModal({ campaign, onSave, onClose }: {
  campaign: Campaign; onSave: (memo: string) => void; onClose: () => void
}) {
  const [memo, setMemo] = useState(campaign.memo ?? "")
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">특이사항 메모</h2>
            <p className="text-xs text-gray-400 mt-0.5">{campaign.campaignName}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5">
          <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={5}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="캠페인 특이사항, 주의사항 등을 입력하세요" />
        </div>
        <div className="flex justify-between gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={() => onSave("")} className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-400 hover:bg-red-50 hover:text-red-400 hover:border-red-200">메모 삭제</button>
          <div className="flex gap-2">
            <button onClick={onClose}           className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">취소</button>
            <button onClick={() => onSave(memo)} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">저장</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 공통 스타일 헬퍼 ─────────────────────────────────────
function MF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
const ic         = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
const selectCls  = "rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
const btnPrimary = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
