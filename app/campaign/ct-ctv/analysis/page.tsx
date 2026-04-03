"use client"

import { useState, useMemo } from "react"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts"

// ── 타입 ────────────────────────────────────────────────────
type Category = 'total' | 'display' | 'video' | 'ctv'

interface DailyMetrics {
  impressions: number
  clicks: number
  spend: number
  agencyFee: number
  dmpFee: number
  mediaCost: number
  completedViews: number
}

interface CampaignSnapshot {
  id: string
  name: string
  agency: string
  type: 'display' | 'video' | 'ctv'
  budget: number
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  today: DailyMetrics
  yesterday: DailyMetrics
}

// ── 기본 기준값 ───────────────────────────────────────────────
interface Settings {
  ctrDiff: number
  spendRateDiff: number
  profitRateDiff: number
  displayProfitMin: number
  videoProfitMin: number
  videoVtrMin: number
  ctvVtrMin: number
}

const DEFAULT_SETTINGS: Settings = {
  ctrDiff: 0.5,
  spendRateDiff: 10,
  profitRateDiff: 5,
  displayProfitMin: 15,
  videoProfitMin: 15,
  videoVtrMin: 60,
  ctvVtrMin: 85,
}

interface AlertMsg {
  kind: 'critical' | 'warn' | 'up'
  cat: 'ctr' | 'spend' | 'profit' | 'vtr' | 'deadline'
  text: string
}

const ALERT_CAT_LABEL: Record<AlertMsg['cat'], string> = {
  ctr: 'CTR',
  spend: '소진률',
  profit: '수익률',
  vtr: 'VTR',
  deadline: '기간 임박',
}

// ── 지표 계산 ────────────────────────────────────────────────
const calcCTR  = (clk: number, imp: number) => imp === 0 ? 0 : (clk / imp) * 100
const calcSR   = (spend: number, budget: number) => budget === 0 ? 0 : (spend / budget) * 100
const calcPR   = (m: DailyMetrics) => m.spend === 0 ? 0
  : ((m.spend - m.agencyFee - m.dmpFee - m.mediaCost) / m.spend) * 100
const calcVTR  = (m: DailyMetrics) => m.impressions === 0 ? 0 : (m.completedViews / m.impressions) * 100
const profitAmt = (m: DailyMetrics) => m.spend - m.agencyFee - m.dmpFee - m.mediaCost

const f = (n: number) => Math.round(n).toLocaleString('ko-KR')

function splitDiff(todayVal: number, yestVal: number, decimals = 2): [string, number] {
  const diff = todayVal - yestVal
  const sign = diff >= 0 ? '+' : ''
  return [`${sign}${diff.toFixed(decimals)}%`, diff]
}

function dDay(endDate: string): { label: string; color: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end   = new Date(endDate); end.setHours(0, 0, 0, 0)
  const diff  = Math.round((end.getTime() - today.getTime()) / 86400000)
  if (diff > 0)  return { label: `D-${diff}`,       color: diff <= 4 ? 'text-red-500' : diff <= 9 ? 'text-orange-500' : 'text-gray-400' }
  if (diff === 0) return { label: 'D-Day',           color: 'text-red-600 font-bold' }
  return              { label: `D+${Math.abs(diff)}`, color: 'text-gray-300' }
}

function fmtDate(d: string) { return d.slice(2).replace(/-/g, '.') } // "2026-03-01" → "26.03.01"

// ── Mock 데이터 ───────────────────────────────────────────────
function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function makeDailyMetrics(
  seed: number, budget: number, hourRatio: number,
  type: 'display' | 'video' | 'ctv',
  spendMult = 1, profitOverride?: number, vtrOverride?: number,
): DailyMetrics {
  const r = (s: number) => 0.8 + seededRand(seed + s) * 0.4
  const spend = Math.round(budget * 0.58 * hourRatio * r(1) * spendMult)
  let agencyFee: number, dmpFee: number, mediaCost: number
  if (profitOverride !== undefined) {
    agencyFee = Math.round(spend * 0.05)
    dmpFee    = Math.round(spend * 0.03)
    mediaCost = Math.round(spend * (1 - profitOverride / 100 - 0.05 - 0.03))
  } else {
    agencyFee = Math.round(spend * 0.05)
    dmpFee    = Math.round(spend * (0.02 + seededRand(seed + 9) * 0.04))
    mediaCost = Math.round(spend * (0.62 + seededRand(seed + 10) * 0.08))
  }
  const vtrBase = type === 'ctv' ? 0.93 : type === 'video' ? 0.75 : 0
  const vtrRate = vtrOverride !== undefined ? vtrOverride / 100 : (vtrBase > 0 ? vtrBase + seededRand(seed + 16) * 0.06 : 0)
  return {
    impressions: Math.round(60000 * (budget / 60000000) * hourRatio * r(2)),
    clicks:      Math.round(60000 * (budget / 60000000) * hourRatio * r(2) * (0.008 + seededRand(seed + 3) * 0.004)),
    spend, agencyFee, dmpFee, mediaCost,
    completedViews: Math.round(60000 * (budget / 60000000) * hourRatio * r(2) * vtrRate),
  }
}

const CAMPAIGN_DEFS = [
  { id:'c1', name:'하나카드 브랜드 캠페인', agency:'이노션',     type:'display' as const, budget:5000000, startDate:'2026-03-01', endDate:'2026-04-05' },
  { id:'c2', name:'KB국민은행 신상품 런칭', agency:'제일기획',   type:'display' as const, budget:3500000, startDate:'2026-03-01', endDate:'2026-03-31' },
  { id:'c3', name:'삼성전자 갤럭시 홍보',   agency:'제일기획',   type:'video'   as const, budget:8000000, startDate:'2026-03-10', endDate:'2026-03-28' },
  { id:'c4', name:'LG생활건강 봄 시즌',     agency:'HS애드',     type:'video'   as const, budget:4200000, startDate:'2026-03-15', endDate:'2026-04-15' },
  { id:'c5', name:'현대자동차 CTV 캠페인',  agency:'이노션',     type:'ctv'     as const, budget:6000000, startDate:'2026-02-01', endDate:'2026-03-25' },
  { id:'c6', name:'롯데백화점 봄 세일',      agency:'대홍기획',   type:'ctv'     as const, budget:2800000, startDate:'2026-03-20', endDate:'2026-04-10' },
  { id:'c7', name:'신한카드 여름 기획전',    agency:'오리콤',     type:'display' as const, budget:4500000, startDate:'2026-03-01', endDate:'2026-03-27' }, // CTR급락+수익률낮음
  { id:'c8', name:'쿠팡 프레시 홍보영상',   agency:'TBWA코리아', type:'video'   as const, budget:5500000, startDate:'2026-03-05', endDate:'2026-04-02' }, // 소진급락+VTR낮음
  { id:'c9', name:'GS칼텍스 브랜드 영상',   agency:'제일기획',   type:'video'   as const, budget:3200000, startDate:'2026-03-10', endDate:'2026-03-26' }, // 수익률낮음(동영상)
]

function mockCampaigns(currentHour: number): CampaignSnapshot[] {
  const ratio = (currentHour + 1) / 24
  return CAMPAIGN_DEFS.map((def, i) => {
    if (def.id === 'c7') {
      const today = makeDailyMetrics(i * 30, def.budget, ratio, def.type, 1, 12)
      const yest  = makeDailyMetrics(i * 30 + 100, def.budget, ratio, def.type)
      return { ...def, today, yesterday: { ...yest, clicks: Math.round(yest.impressions * 0.016) } }
    }
    if (def.id === 'c8') {
      const today = makeDailyMetrics(i * 30, def.budget, ratio, def.type, 1, undefined, 55)
      const yest  = makeDailyMetrics(i * 30 + 100, def.budget, ratio * 1.6, def.type)
      return { ...def, today, yesterday: { ...yest, dmpFee: Math.round(yest.spend * 0.08) } }
    }
    if (def.id === 'c5') {
      const today = makeDailyMetrics(i * 30, def.budget, ratio, def.type, 1, undefined, 82)
      return { ...def, today, yesterday: makeDailyMetrics(i * 30 + 100, def.budget, ratio, def.type) }
    }
    if (def.id === 'c9') {
      // 동영상 수익률 11% (기준 15% 미달)
      const today = makeDailyMetrics(i * 30, def.budget, ratio, def.type, 1, 11)
      return { ...def, today, yesterday: makeDailyMetrics(i * 30 + 100, def.budget, ratio, def.type, 1, 11) }
    }
    return { ...def, today: makeDailyMetrics(i * 30, def.budget, ratio, def.type), yesterday: makeDailyMetrics(i * 30 + 100, def.budget, ratio, def.type) }
  })
}

function mockHourlyRow(dayOffset: 0 | 1, type: 'all' | 'display' | 'video' | 'ctv', h: number) {
  const scale = type === 'all' ? 1 : type === 'display' ? 0.38 : type === 'video' ? 0.35 : 0.27
  const r = (s: number) => 0.8 + seededRand(dayOffset * 200 + h * 5 + s) * 0.4
  const spend     = Math.round(12000000 * scale * r(3) * (0.4 + h / 24))
  const agencyFee = Math.round(spend * 0.05)
  const dmpFee    = Math.round(spend * (0.020 + seededRand(dayOffset * 311 + h * 7 + 11) * 0.040))
  const mediaCost = Math.round(spend * (0.580 + seededRand(dayOffset * 417 + h * 3 + 22) * 0.110))
  const imp       = Math.round(180000 * scale * r(1) * (0.4 + h / 24))
  const clk       = Math.round(900    * scale * r(2) * (0.4 + h / 24))
  const vtrBase   = type === 'ctv' ? 0.91 : type === 'video' ? 0.73 : 0
  const vtrRate   = vtrBase > 0 ? vtrBase + seededRand(dayOffset * 523 + h * 9 + 33) * 0.08 : 0
  return { impressions: imp, clicks: clk, spend, agencyFee, dmpFee, mediaCost, completedViews: Math.round(imp * vtrRate) }
}

// ── 상수 ─────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<Category, string> = { total:'총 합계', display:'디스플레이', video:'동영상', ctv:'CTV' }
const TYPE_LABEL: Record<string, string> = { display:'디스플레이', video:'동영상', ctv:'CTV' }
const TYPE_COLOR: Record<string, string> = {
  display:'bg-blue-50 text-blue-600', video:'bg-purple-50 text-purple-600', ctv:'bg-green-50 text-green-600',
}
const VTR_AVG = { video:'75~80%', ctv:'95% 이상' }

// ── 서브 컴포넌트 ─────────────────────────────────────────────
function KpiCard({ label, todayVal, yestVal, threshold, decimals = 2, note, benchmarkMin }: {
  label: string; todayVal: number; yestVal: number; threshold: number; decimals?: number; note?: string; benchmarkMin?: number
}) {
  const diff = todayVal - yestVal
  const exceeded = Math.abs(diff) >= threshold
  const belowBenchmark = benchmarkMin !== undefined && todayVal < benchmarkMin
  const isAlert = exceeded || belowBenchmark
  const up = diff >= 0
  return (
    <div className={`rounded-xl border bg-white px-5 py-4 ${isAlert ? 'border-red-200 ring-1 ring-red-200' : 'border-gray-200'}`}>
      <p className="text-[11px] font-medium text-gray-400 mb-1">{label}</p>
      {note && <p className="text-[10px] text-gray-300 mb-1.5">{note}</p>}
      <p className={`text-2xl font-bold ${belowBenchmark ? 'text-red-600' : 'text-gray-900'}`}>{todayVal.toFixed(decimals)}%</p>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-[11px] text-gray-400">전일 {yestVal.toFixed(decimals)}%</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          exceeded ? (up ? 'text-blue-600 bg-blue-50' : 'text-red-600 bg-red-50') : 'text-gray-500 bg-gray-50'
        }`}>
          {up ? '▲' : '▼'} {Math.abs(diff).toFixed(decimals)}%{exceeded && ' ⚠'}
        </span>
      </div>
      {belowBenchmark && (
        <p className="mt-1.5 text-[10px] font-semibold text-red-500">
          ⚠ 기준 {benchmarkMin}% 미달
        </p>
      )}
      {exceeded && !belowBenchmark && <p className="mt-1.5 text-[10px] text-red-500">임계값 ±{threshold}% 초과</p>}
    </div>
  )
}

// 이상/상승 아이콘 with hover tooltip
function AlertIcon({ msgs }: { msgs: AlertMsg[] }) {
  const [show, setShow] = useState(false)
  const criticals = msgs.filter(m => m.kind === 'critical')
  const warns     = msgs.filter(m => m.kind === 'warn')
  const ups       = msgs.filter(m => m.kind === 'up')
  const hasCritical = criticals.length > 0
  const hasWarn     = warns.length > 0

  if (msgs.length === 0) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-50 text-green-500">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    )
  }
  return (
    <span className="relative inline-flex items-center justify-center">
      <button
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
          hasCritical ? 'animate-pulse bg-red-600 text-white hover:bg-red-700'
          : hasWarn   ? 'bg-red-100 text-red-500 hover:bg-red-200'
          : 'bg-blue-100 text-blue-500 hover:bg-blue-200'
        }`}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {(hasCritical || hasWarn) ? (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        )}
      </button>
      {show && (
        <div className="absolute bottom-full right-0 mb-2 z-50 w-60 rounded-lg border border-gray-200 bg-white shadow-lg p-3">
          {criticals.length > 0 && (
            <>
              <p className="text-[11px] font-bold text-red-700 mb-1.5">🚨 광고 미게재 감지</p>
              <div className="space-y-1 mb-2">
                {criticals.map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0 animate-pulse" />
                    <span>{m.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {warns.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-red-600 mb-1.5">이상 감지</p>
              <div className="space-y-1">
                {warns.map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    <span>{m.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {ups.length > 0 && (
            <>
              {warns.length > 0 && <div className="border-t border-gray-100 my-2" />}
              <p className="text-[11px] font-semibold text-blue-600 mb-1.5">상승 감지</p>
              <div className="space-y-1">
                {ups.map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span>{m.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="absolute -bottom-1.5 right-2 w-3 h-3 rotate-45 border-r border-b border-gray-200 bg-white" />
        </div>
      )}
    </span>
  )
}

// 기준 수치 설정 패널
function SettingsPanel({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const field = (label: string, key: keyof Settings, unit = '%p') => (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-gray-600 whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.1"
          min="0"
          value={settings[key]}
          onChange={e => onChange({ ...settings, [key]: parseFloat(e.target.value) || 0 })}
          className="w-16 rounded-md border border-gray-200 px-2 py-1 text-xs text-right focus:border-blue-400 focus:outline-none"
        />
        <span className="text-[11px] text-gray-400">{unit}</span>
      </div>
    </label>
  )
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-5 py-4">
      <p className="mb-4 text-xs font-semibold text-blue-800">기준 수치 설정</p>
      <div className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-4">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">전일비교 임계값</p>
          {field('CTR 차이',    'ctrDiff',        '%p')}
          {field('소진률 차이', 'spendRateDiff',  '%p')}
          {field('수익률 차이', 'profitRateDiff', '%p')}
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">디스플레이 기준</p>
          {field('수익률 최소',  'displayProfitMin', '%')}
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">동영상 기준</p>
          {field('수익률 최소', 'videoProfitMin', '%')}
          {field('VTR 최소',   'videoVtrMin',    '%')}
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">CTV 기준</p>
          {field('VTR 최소', 'ctvVtrMin', '%')}
        </div>
      </div>
      <button
        onClick={() => onChange(DEFAULT_SETTINGS)}
        className="mt-4 text-[11px] text-blue-500 hover:text-blue-700 underline"
      >
        기본값으로 초기화
      </button>
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────
export default function CtCtvAnalysisPage() {
  const [category, setCategory]         = useState<Category>('total')
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings]         = useState<Settings>(DEFAULT_SETTINGS)

  const today = new Date()
  const currentHour = today.getHours()
  const showVTR = category === 'video' || category === 'ctv'

  const campaigns = useMemo(() => mockCampaigns(currentHour), [currentHour])
  const filtered  = useMemo(() =>
    category === 'total' ? campaigns : campaigns.filter(c => c.type === category),
  [campaigns, category])

  // 차트
  const chartType = category === 'total' ? 'all' : category
  const chartData = useMemo(() =>
    Array.from({ length: currentHour + 1 }, (_, h) => {
      const t = mockHourlyRow(0, chartType, h)
      const y = mockHourlyRow(1, chartType, h)
      return {
        hour: `${String(h).padStart(2, '0')}시`,
        '오늘 CTR':    parseFloat(calcCTR(t.clicks, t.impressions).toFixed(2)),
        '전일 CTR':    parseFloat(calcCTR(y.clicks, y.impressions).toFixed(2)),
        '오늘 수익률': parseFloat(calcPR(t).toFixed(2)),
        '전일 수익률': parseFloat(calcPR(y).toFixed(2)),
        ...(showVTR ? { '오늘 VTR': parseFloat(calcVTR(t).toFixed(2)), '전일 VTR': parseFloat(calcVTR(y).toFixed(2)) } : {}),
      }
    }),
  [chartType, currentHour, showVTR])

  // 합계
  const zero = { impressions:0, clicks:0, spend:0, agencyFee:0, dmpFee:0, mediaCost:0, completedViews:0 }
  const sumT = useMemo(() => filtered.reduce((a, c) => ({
    impressions:    a.impressions    + c.today.impressions,
    clicks:         a.clicks         + c.today.clicks,
    spend:          a.spend          + c.today.spend,
    agencyFee:      a.agencyFee      + c.today.agencyFee,
    dmpFee:         a.dmpFee         + c.today.dmpFee,
    mediaCost:      a.mediaCost      + c.today.mediaCost,
    completedViews: a.completedViews + c.today.completedViews,
    budget:         (a as typeof a & {budget:number}).budget + c.budget,
  }), { ...zero, budget:0 }), [filtered])

  const sumY = useMemo(() => filtered.reduce((a, c) => ({
    impressions:    a.impressions    + c.yesterday.impressions,
    clicks:         a.clicks         + c.yesterday.clicks,
    spend:          a.spend          + c.yesterday.spend,
    agencyFee:      a.agencyFee      + c.yesterday.agencyFee,
    dmpFee:         a.dmpFee         + c.yesterday.dmpFee,
    mediaCost:      a.mediaCost      + c.yesterday.mediaCost,
    completedViews: a.completedViews + c.yesterday.completedViews,
    budget:         (a as typeof a & {budget:number}).budget + c.budget,
  }), { ...zero, budget:0 }), [filtered])

  // 캠페인별 이상/상승 메시지 생성
  function getAlertMessages(c: CampaignSnapshot): AlertMsg[] {
    const msgs: AlertMsg[] = []

    // 🚨 노출/비용 0 — 광고 미게재 (최우선 critical)
    if (c.today.impressions === 0)
      msgs.push({ kind: 'critical', cat: 'spend', text: '🚨 노출 0 — 광고가 게재되지 않고 있습니다' })
    if (c.today.spend === 0)
      msgs.push({ kind: 'critical', cat: 'spend', text: '🚨 비용 0 — 광고 소진이 없습니다' })

    const ctrT = calcCTR(c.today.clicks, c.today.impressions)
    const ctrY = calcCTR(c.yesterday.clicks, c.yesterday.impressions)
    const ctrD = ctrT - ctrY
    const srT  = calcSR(c.today.spend, c.budget)
    const srY  = calcSR(c.yesterday.spend, c.budget)
    const srD  = srT - srY
    const prT  = calcPR(c.today)
    const prY  = calcPR(c.yesterday)
    const prD  = prT - prY
    const vtrT = calcVTR(c.today)
    const vtrY = calcVTR(c.yesterday)
    const vtrD = vtrT - vtrY

    // CTR 전일비교 (하락=이상, 상승=상승감지)
    if (Math.abs(ctrD) >= settings.ctrDiff)
      msgs.push({ kind: ctrD < 0 ? 'warn' : 'up', cat: 'ctr',
        text: `CTR 전일比 ${ctrD > 0 ? '▲' : '▼'}${Math.abs(ctrD).toFixed(2)}%p` })

    // 소진률 전일비교 (하락=이상, 상승=상승감지)
    if (Math.abs(srD) >= settings.spendRateDiff)
      msgs.push({ kind: srD < 0 ? 'warn' : 'up', cat: 'spend',
        text: `소진률 전일比 ${srD > 0 ? '▲' : '▼'}${Math.abs(srD).toFixed(2)}%p` })

    // 수익률 전일비교 (하락=이상, 상승=상승감지)
    if (Math.abs(prD) >= settings.profitRateDiff)
      msgs.push({ kind: prD < 0 ? 'warn' : 'up', cat: 'profit',
        text: `수익률 전일比 ${prD > 0 ? '▲' : '▼'}${Math.abs(prD).toFixed(2)}%p` })

    // 수익률 기준 미달
    if (c.type === 'display' && prT < settings.displayProfitMin)
      msgs.push({ kind: 'warn', cat: 'profit', text: `수익률 ${prT.toFixed(2)}% (기준 ${settings.displayProfitMin}% 미달)` })
    if (c.type === 'video'   && prT < settings.videoProfitMin)
      msgs.push({ kind: 'warn', cat: 'profit', text: `수익률 ${prT.toFixed(2)}% (기준 ${settings.videoProfitMin}% 미달)` })

    // VTR 전일비교 (하락=이상, 상승=상승감지)
    if ((c.type === 'video' || c.type === 'ctv') && Math.abs(vtrD) >= 5)
      msgs.push({ kind: vtrD < 0 ? 'warn' : 'up', cat: 'vtr',
        text: `VTR 전일比 ${vtrD > 0 ? '▲' : '▼'}${Math.abs(vtrD).toFixed(2)}%p` })

    // VTR 기준 미달
    if (c.type === 'video' && vtrT < settings.videoVtrMin)
      msgs.push({ kind: 'warn', cat: 'vtr', text: `VTR ${vtrT.toFixed(2)}% (기준 ${settings.videoVtrMin}% 미달)` })
    if (c.type === 'ctv'   && vtrT < settings.ctvVtrMin)
      msgs.push({ kind: 'warn', cat: 'vtr', text: `VTR ${vtrT.toFixed(2)}% (기준 ${settings.ctvVtrMin}% 미달)` })

    // 기간 종료 임박 (3일 이하)
    const todayMs = new Date().setHours(0, 0, 0, 0)
    const diffDays = Math.round((new Date(c.endDate).getTime() - todayMs) / 86400000)
    if (diffDays >= 0 && diffDays <= 3)
      msgs.push({ kind: 'warn', cat: 'deadline',
        text: diffDays === 0 ? '캠페인 종료 D-Day' : `캠페인 종료 ${diffDays}일 전` })

    return msgs
  }

  const alertCampaigns = useMemo(() => filtered.filter(c => getAlertMessages(c).length > 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [filtered, settings])

  const dc = (diff: number, alerted: boolean) =>
    alerted ? (diff > 0 ? 'text-blue-600' : 'text-red-600') : (diff >= 0 ? 'text-blue-500' : 'text-red-400')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-base font-semibold text-gray-900">데이터 분석</h1>
            <p className="text-xs text-gray-400 mt-0.5">캠페인 리포트 · CT/CTV · 데이터 분석</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              기준 시각 {String(currentHour).padStart(2, '0')}:00 vs 전일 {String(currentHour).padStart(2, '0')}:00
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-600 font-medium">
              MCP 미연결 — 임시 데이터
            </span>
            <button
              onClick={() => setShowSettings(v => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                showSettings ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              기준 수치 설정
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-5">

        {/* 기준 수치 설정 패널 */}
        {showSettings && <SettingsPanel settings={settings} onChange={setSettings} />}

        {/* 분석 기준 탭 */}
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                category === cat ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* 알림 배너 — 카테고리별 분리 */}
        {alertCampaigns.length > 0 && (() => {
          // 카테고리별로 모든 알림 수집
          const catGroups = (Object.keys(ALERT_CAT_LABEL) as AlertMsg['cat'][]).map(cat => {
            const items: { campaign: CampaignSnapshot; msg: AlertMsg }[] = []
            alertCampaigns.forEach(c => {
              getAlertMessages(c).filter(m => m.cat === cat).forEach(msg => items.push({ campaign: c, msg }))
            })
            return { cat, label: ALERT_CAT_LABEL[cat], items }
          }).filter(g => g.items.length > 0)

          const warnGroups = catGroups.filter(g => g.items.some(i => i.msg.kind === 'warn'))
          const upGroups   = catGroups.filter(g => g.items.every(i => i.msg.kind === 'up') && !warnGroups.find(w => w.cat === g.cat))

          return (
            <div className="space-y-2">
              {warnGroups.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-red-700">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    이상 감지
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {warnGroups.map(g => (
                      <div key={g.cat} className="rounded-lg border border-red-200 bg-white px-3 py-2.5">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500">{g.label}</p>
                        <div className="space-y-1.5">
                          {g.items.filter(i => i.msg.kind === 'warn').map((item, idx) => (
                            <div key={idx} className="text-[11px]">
                              <span className="font-semibold text-gray-700">{item.campaign.name}</span>
                              <span className="ml-1.5 text-red-600">{item.msg.text.replace(/^(CTR|소진률|수익률|VTR) 전일比 /, '')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {upGroups.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-blue-700">
                    <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    상승 감지
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {upGroups.map(g => (
                      <div key={g.cat} className="rounded-lg border border-blue-200 bg-white px-3 py-2.5">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-500">{g.label}</p>
                        <div className="space-y-1.5">
                          {g.items.map((item, idx) => (
                            <div key={idx} className="text-[11px]">
                              <span className="font-semibold text-gray-700">{item.campaign.name}</span>
                              <span className="ml-1.5 text-blue-600">{item.msg.text.replace(/^(CTR|소진률|수익률|VTR) 전일比 /, '')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* KPI 카드 */}
        <section>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            전체 합계 · {CATEGORY_LABELS[category]} · 전일 동시간 비교
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="CTR (클릭률)"  todayVal={calcCTR(sumT.clicks, sumT.impressions)} yestVal={calcCTR(sumY.clicks, sumY.impressions)} threshold={settings.ctrDiff} />
            <KpiCard label="소진금액률"     todayVal={calcSR(sumT.spend, (sumT as typeof sumT & {budget:number}).budget)} yestVal={calcSR(sumY.spend, (sumY as typeof sumY & {budget:number}).budget)} threshold={settings.spendRateDiff} />
            <KpiCard label="수익률"
              todayVal={calcPR(sumT)} yestVal={calcPR(sumY)} threshold={settings.profitRateDiff}
              benchmarkMin={category === 'display' ? settings.displayProfitMin : category === 'video' ? settings.videoProfitMin : undefined}
            />
            {showVTR
              ? <KpiCard label="VTR (완료율)" todayVal={calcVTR(sumT)} yestVal={calcVTR(sumY)} threshold={5} note={`평균 기준: ${VTR_AVG[category as 'video'|'ctv']}`} />
              : <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                  <p className="text-[11px] font-medium text-gray-400 mb-2">총 집행금액</p>
                  <p className="text-2xl font-bold text-gray-900">{f(sumT.spend)}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">전일 {f(sumY.spend)}</span>
                    {(() => { const d = sumT.spend - sumY.spend; return <span className={`text-[11px] font-semibold ${d >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{d >= 0 ? '▲' : '▼'} {f(Math.abs(d))}</span> })()}
                  </div>
                </div>
            }
          </div>
        </section>

        {/* 차트 */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="mb-4 text-xs font-semibold text-gray-700">시간대별 CTR 추이 — 오늘 vs 전일</p>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chartData} margin={{ top:4, right:12, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize:10 }} interval={2} />
                <YAxis tick={{ fontSize:10 }} tickFormatter={v => `${v}%`} width={38} />
                <Tooltip formatter={(v:unknown, n:unknown) => [`${Number(v).toFixed(2)}%`, String(n)]} labelStyle={{ fontSize:11 }} contentStyle={{ fontSize:11, borderRadius:8 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize:11 }} />
                <Line type="monotone" dataKey="오늘 CTR" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r:3 }} />
                <Line type="monotone" dataKey="전일 CTR" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="mb-4 text-xs font-semibold text-gray-700">
              시간대별 {showVTR ? 'VTR' : '수익률'} 추이 — 오늘 vs 전일
              {showVTR && <span className="ml-2 text-[11px] font-normal text-gray-400">평균 기준: {VTR_AVG[category as 'video'|'ctv']}</span>}
            </p>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chartData} margin={{ top:4, right:12, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize:10 }} interval={2} />
                <YAxis tick={{ fontSize:10 }} tickFormatter={v => `${v}%`} width={38} />
                <Tooltip formatter={(v:unknown, n:unknown) => [`${Number(v).toFixed(2)}%`, String(n)]} labelStyle={{ fontSize:11 }} contentStyle={{ fontSize:11, borderRadius:8 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize:11 }} />
                {showVTR ? <>
                  <Line type="monotone" dataKey="오늘 VTR"  stroke="#16a34a" strokeWidth={2} dot={false} activeDot={{ r:3 }} />
                  <Line type="monotone" dataKey="전일 VTR"  stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r:3 }} />
                </> : <>
                  <Line type="monotone" dataKey="오늘 수익률" stroke="#16a34a" strokeWidth={2} dot={false} activeDot={{ r:3 }} />
                  <Line type="monotone" dataKey="전일 수익률" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 2" dot={false} activeDot={{ r:3 }} />
                </>}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 캠페인별 표 */}
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3.5 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">캠페인별 현황 — {CATEGORY_LABELS[category]}</p>
            <span className="text-[11px] text-gray-400">금일 / (전일비교)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 font-semibold">
                  <th className="px-4 py-2.5 text-left">캠페인</th>
                  <th className="px-3 py-2.5 text-center">유형</th>
                  <th className="px-3 py-2.5 text-right">
                    <div>캠페인 기간</div>
                    <div className="font-normal text-gray-400">(잔여)</div>
                  </th>
                  <th className="px-3 py-2.5 text-right">
                    <div>일예산</div>
                    <div className="font-normal text-gray-400">(소진률)</div>
                  </th>
                  <th className="px-3 py-2.5 text-right">노출</th>
                  <th className="px-3 py-2.5 text-right">클릭</th>
                  <th className="px-3 py-2.5 text-right">CTR</th>
                  {showVTR && <th className="px-3 py-2.5 text-right">VTR</th>}
                  <th className="px-3 py-2.5 text-right">소진 금액</th>
                  <th className="px-3 py-2.5 text-right">
                    <div>수익 금액</div>
                    <div className="font-normal text-gray-400">(수익률)</div>
                  </th>
                  <th className="px-3 py-2.5 text-center">이상</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const ctrT = calcCTR(c.today.clicks, c.today.impressions)
                  const ctrY = calcCTR(c.yesterday.clicks, c.yesterday.impressions)
                  const prT  = calcPR(c.today)
                  const prY  = calcPR(c.yesterday)
                  const vtrT = calcVTR(c.today)
                  const srT  = calcSR(c.today.spend, c.budget)
                  const srD  = srT - calcSR(c.yesterday.spend, c.budget)

                  const [ctrSub, ctrDiff] = splitDiff(ctrT, ctrY)
                  const [prSub,  prDiff]  = splitDiff(prT,  prY)
                  const [vtrSub, vtrDiff] = splitDiff(vtrT, calcVTR(c.yesterday))

                  const ctrAlert    = Math.abs(ctrDiff) >= settings.ctrDiff
                  const srAlert     = Math.abs(srD)     >= settings.spendRateDiff
                  const prDiffAlert = Math.abs(prDiff)  >= settings.profitRateDiff
                  const prBench     = (c.type === 'display' && prT < settings.displayProfitMin) || (c.type === 'video' && prT < settings.videoProfitMin)
                  const vtrBench    = (c.type === 'video' && vtrT < settings.videoVtrMin) || (c.type === 'ctv' && vtrT < settings.ctvVtrMin)
                  const alertMsgs   = getAlertMessages(c)
                  const hasAlert    = alertMsgs.some(m => m.kind === 'warn' || m.kind === 'critical')
                  const hasCritical = alertMsgs.some(m => m.kind === 'critical')

                  const ddayInfo = dDay(c.endDate)

                  return (
                    <tr key={c.id} className={`border-b border-gray-50 ${hasCritical ? 'bg-red-100/60' : hasAlert ? 'bg-red-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      {/* 캠페인명 + 대행사 */}
                      <td className="px-4 py-3 max-w-[170px]">
                        <div className="font-medium text-gray-800 truncate">{c.name}</div>
                        <div className="text-[11px] text-gray-300 truncate">{c.agency}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLOR[c.type]}`}>{TYPE_LABEL[c.type]}</span>
                      </td>
                      {/* 캠페인 기간 + 잔여 */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="text-gray-600">{fmtDate(c.startDate)}~{fmtDate(c.endDate)}</div>
                        <div className={`text-[11px] font-semibold ${ddayInfo.color}`}>{ddayInfo.label}</div>
                      </td>
                      {/* 일예산 + 소진률 */}
                      <td className="px-3 py-3 text-right">
                        <div className="font-medium text-gray-700">{f(c.budget)}</div>
                        <div className={`text-[11px] font-semibold ${srAlert ? (srD > 0 ? 'text-blue-600' : 'text-red-600') : 'text-gray-400'}`}>
                          ({srT.toFixed(2)}%{srAlert ? ' ⚠' : ''})
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-600">{f(c.today.impressions)}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{f(c.today.clicks)}</td>
                      {/* CTR */}
                      <td className="px-3 py-3 text-right">
                        <div className="font-semibold text-gray-800">{ctrT.toFixed(2)}%</div>
                        <div className={`text-[11px] font-medium ${dc(ctrDiff, ctrAlert)}`}>({ctrSub}){ctrAlert ? ' ⚠' : ''}</div>
                      </td>
                      {/* VTR */}
                      {showVTR && (
                        <td className="px-3 py-3 text-right">
                          <div className={`font-semibold ${vtrBench ? 'text-red-600' : 'text-gray-800'}`}>{vtrT.toFixed(2)}%{vtrBench ? ' ⚠' : ''}</div>
                          <div className={`text-[11px] font-medium ${dc(vtrDiff, Math.abs(vtrDiff) >= 5)}`}>({vtrSub})</div>
                        </td>
                      )}
                      <td className="px-3 py-3 text-right text-gray-700">{f(c.today.spend)}</td>
                      {/* 수익금액 + 수익률 */}
                      <td className="px-3 py-3 text-right">
                        <div className="font-medium text-gray-800">{f(profitAmt(c.today))}</div>
                        <div className={`text-[11px] font-semibold ${prBench ? 'text-red-600' : 'text-gray-600'}`}>({prT.toFixed(2)}%)</div>
                        <div className={`text-[11px] font-medium ${dc(prDiff, prDiffAlert)}`}>({prSub}){prDiffAlert || prBench ? ' ⚠' : ''}</div>
                      </td>
                      {/* 이상 아이콘 */}
                      <td className="px-3 py-3 text-center">
                        <AlertIcon msgs={alertMsgs} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-gray-700">
                  <td className="px-4 py-3" colSpan={2}>합계</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right">
                    <div>{f((sumT as typeof sumT & {budget:number}).budget)}</div>
                    <div className="text-[11px] font-normal text-gray-400">({calcSR(sumT.spend, (sumT as typeof sumT & {budget:number}).budget).toFixed(2)}%)</div>
                  </td>
                  <td className="px-3 py-3 text-right">{f(sumT.impressions)}</td>
                  <td className="px-3 py-3 text-right">{f(sumT.clicks)}</td>
                  <td className="px-3 py-3 text-right">
                    {(() => { const [s, d] = splitDiff(calcCTR(sumT.clicks, sumT.impressions), calcCTR(sumY.clicks, sumY.impressions)); return <><div>{calcCTR(sumT.clicks, sumT.impressions).toFixed(2)}%</div><div className={`text-[11px] ${d >= 0 ? 'text-blue-500' : 'text-red-400'}`}>({s})</div></> })()}
                  </td>
                  {showVTR && <td className="px-3 py-3 text-right">
                    {(() => { const [s, d] = splitDiff(calcVTR(sumT), calcVTR(sumY)); return <><div>{calcVTR(sumT).toFixed(2)}%</div><div className={`text-[11px] ${d >= 0 ? 'text-blue-500' : 'text-red-400'}`}>({s})</div></> })()}
                  </td>}
                  <td className="px-3 py-3 text-right">{f(sumT.spend)}</td>
                  <td className="px-3 py-3 text-right">
                    {(() => { const [s, d] = splitDiff(calcPR(sumT), calcPR(sumY)); return <><div>{f(profitAmt(sumT))}</div><div className="text-[11px] text-gray-500">({calcPR(sumT).toFixed(2)}%)</div><div className={`text-[11px] ${d >= 0 ? 'text-blue-500' : 'text-red-400'}`}>({s})</div></> })()}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

      </main>
    </div>
  )
}
