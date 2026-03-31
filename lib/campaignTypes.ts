export type CampaignStatus = '집행 중' | '종료'

export const AVAILABLE_MEDIA = ['네이버 GFA', '카카오모먼트', 'Google', 'META'] as const
export type MediaName = typeof AVAILABLE_MEDIA[number]

export const MEDIA_MARKUP_RATE: Record<string, number> = {
  '네이버 GFA': 0, '카카오모먼트': 0, 'Google': 10, 'META': 10,
}

export const MEDIA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '네이버 GFA':   { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200' },
  '카카오모먼트': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  'Google':       { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200' },
  'META':         { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
}

// DMP 활용 타겟팅 → DMP 수수료 10% 고정
export const DMP_TARGETS = ['SKP', 'LOTTE', 'TG360', 'WIFI', 'KB', 'HyperLocal'] as const
// DMP 미활용 타겟팅 → DMP 수수료 0%
export const NON_DMP_TARGETS = ['리타겟팅', '매체 타겟팅'] as const
export const DMP_FEE_RATE = 10

// DMP별 개별 정산 수수료율
export const DMP_FEE_RATES: Record<string, number> = {
  'SKP': 10, 'LOTTE': 9, 'TG360': 10, 'WIFI': 10, 'KB': 10, 'HyperLocal': 0,
}

export interface TargetingBudget {
  budget: number
  spend: number
  agencyFeeRate: number
  targetings: string[]
}

export interface MediaBudget {
  media: string
  dmp: TargetingBudget    // DMP 활용 (fee=10%)
  nonDmp: TargetingBudget // DMP 미활용 (fee=0%)
}

export interface Operator {
  id: string
  name: string
  email: string
  phone: string
}

export interface Agency {
  id: string
  name: string           // 대행사명
  contactName: string    // 담당자명
  email: string
  phone: string
}

export interface Advertiser {
  id: string
  name: string
  agencyId: string       // Agency.id 참조
}

export interface Campaign {
  id: string
  advertiserId: string   // Advertiser.id 참조
  campaignName: string
  memo?: string          // 특이사항 메모
  mediaBudgets: MediaBudget[]
  startDate: string
  endDate: string
  settlementMonth: string
  agencyId: string       // Agency.id 참조
  managerId: string
  status: CampaignStatus
  createdAt: string
  agencyFeeRate?: number // 대행수수료율 (%)
}

export function getTotalMarkup(mediaMarkup: number, dmpFeeRate: number, agencyFeeRate: number): number {
  return mediaMarkup + dmpFeeRate + agencyFeeRate
}

export function calcSettingCost(budget: number, totalMarkupRate: number): number {
  return Math.round(budget * (1 - totalMarkupRate / 100))
}

export function calcSpendRate(spend: number, settingCost: number): number {
  if (settingCost <= 0) return 0
  return Math.round((spend / settingCost) * 1000) / 10
}

export function getMediaTotals(mb: MediaBudget) {
  const mm = MEDIA_MARKUP_RATE[mb.media] ?? 0
  const dmpMarkup    = getTotalMarkup(mm, DMP_FEE_RATE, mb.dmp.agencyFeeRate)
  const nonDmpMarkup = getTotalMarkup(mm, 0,            mb.nonDmp.agencyFeeRate)
  const dmpSC    = calcSettingCost(mb.dmp.budget,    dmpMarkup)
  const nonDmpSC = calcSettingCost(mb.nonDmp.budget, nonDmpMarkup)
  const totalBudget      = mb.dmp.budget    + mb.nonDmp.budget
  const totalSettingCost = dmpSC            + nonDmpSC
  const totalSpend       = mb.dmp.spend     + mb.nonDmp.spend
  return {
    totalBudget, totalSettingCost, totalSpend,
    spendRate: calcSpendRate(totalSpend, totalSettingCost),
    dmpMarkup, nonDmpMarkup, dmpSC, nonDmpSC,
  }
}

export function getCampaignTotals(c: Campaign) {
  let totalBudget = 0, totalSettingCost = 0, totalSpend = 0
  for (const mb of c.mediaBudgets) {
    const t = getMediaTotals(mb)
    totalBudget      += t.totalBudget
    totalSettingCost += t.totalSettingCost
    totalSpend       += t.totalSpend
  }
  return { totalBudget, totalSettingCost, totalSpend, spendRate: calcSpendRate(totalSpend, totalSettingCost) }
}

export function getCampaignProgress(startDate: string, endDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const start = new Date(startDate); start.setHours(0, 0, 0, 0)
  const end   = new Date(endDate);   end.setHours(0, 0, 0, 0)
  if (today <= start) return 0
  if (today >= end)   return 100
  const totalDays   = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  const elapsedDays = (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  return Math.round((elapsedDays / totalDays) * 1000) / 10
}

export function getDday(endDate: string) {
  const end = new Date(endDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0)
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return { days, label: `D+${Math.abs(days)}`, urgent: false, expired: true }
  if (days === 0) return { days, label: 'D-0',   urgent: true,  expired: false }
  return          { days, label: `D-${days}`,    urgent: days <= 7, expired: false }
}
