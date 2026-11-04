import type { MembershipRank, Profile } from './supabase'

export const RANK_CONFIG: Record<string, {
  name: string
  color: string
  gradient: string
  textShadow: string
  animation: string
  icon: string
}> = {
  member: { name: 'Thành Viên', color: '#94a3b8', gradient: 'linear-gradient(90deg,#cbd5e1,#94a3b8,#cbd5e1)', textShadow: '0 0 8px rgba(148,163,184,0.4)', animation: 'none', icon: 'LuUser' },
  dong: { name: 'Đồng', color: '#cd7f32', gradient: 'linear-gradient(90deg,#cd7f32,#e8a951,#cd7f32)', textShadow: '0 0 10px rgba(205,127,50,0.5)', animation: 'shimmer 3s linear infinite', icon: 'LuMedal' },
  bac: { name: 'Bạc', color: '#c0c0c0', gradient: 'linear-gradient(90deg,#c0c0c0,#e8e8e8,#f5f5f5,#c0c0c0)', textShadow: '0 0 12px rgba(192,192,192,0.6)', animation: 'shimmer 2.5s linear infinite', icon: 'LuAward' },
  vang: { name: 'Vàng', color: '#ffd700', gradient: 'linear-gradient(90deg,#ffd700,#ffed4e,#ffa500,#ffd700)', textShadow: '0 0 14px rgba(255,215,0,0.6)', animation: 'shimmer 2s linear infinite', icon: 'LuCrown' },
  bachkim: { name: 'Bạch Kim', color: '#e5e4e2', gradient: 'linear-gradient(90deg,#e5e4e2,#00e5ff,#ffffff,#00e5ff,#e5e4e2)', textShadow: '0 0 14px rgba(0,229,255,0.6)', animation: 'shimmer 1.8s linear infinite', icon: 'LuGem' },
  kimcuong: { name: 'Kim Cương', color: '#3b82f6', gradient: 'linear-gradient(90deg,#3b82f6,#a855f7,#06b6d4,#3b82f6)', textShadow: '0 0 16px rgba(59,130,246,0.6)', animation: 'shimmer 1.5s linear infinite', icon: 'LuDiamond' },
  vip: { name: 'VIP', color: '#a855f7', gradient: 'linear-gradient(90deg,#a855f7,#ec4899,#3b82f6,#a855f7)', textShadow: '0 0 18px rgba(168,85,247,0.7)', animation: 'shimmer 1.2s linear infinite', icon: 'LuStar' },
  supervip: { name: 'Siêu VIP', color: '#ec4899', gradient: 'linear-gradient(90deg,#ec4899,#a855f7,#3b82f6,#06b6d4,#10b981,#ec4899)', textShadow: '0 0 20px rgba(236,72,153,0.8),0 0 40px rgba(168,85,247,0.4)', animation: 'shimmer 1s linear infinite,glow-pulse 2s ease-in-out infinite', icon: 'LuZap' },
}

export const RANK_ORDER = ['member', 'dong', 'bac', 'vang', 'bachkim', 'kimcuong', 'vip', 'supervip']

export function getRankFromAmount(amount: number, ranks: MembershipRank[]): MembershipRank {
  let result = ranks[0]
  for (const rank of ranks) { if (amount >= rank.min_amount) result = rank }
  return result
}

export function getNextRank(currentKey: string, ranks: MembershipRank[]): MembershipRank | null {
  const idx = RANK_ORDER.indexOf(currentKey)
  if (idx === -1 || idx >= RANK_ORDER.length - 1) return null
  return ranks.find((r) => r.rank_key === RANK_ORDER[idx + 1]) || null
}

export function getRankProgress(profile: Pick<Profile, 'total_deposited' | 'rank'>, ranks: MembershipRank[]) {
  const current = ranks.find((r) => r.rank_key === profile.rank) || ranks[0]
  const next = getNextRank(profile.rank, ranks)
  const currentMin = current?.min_amount || 0
  const nextMin = next?.min_amount || currentMin
  if (!next) return { current, next: null, progress: 100, remaining: 0, currentMin, nextMin }
  const progress = Math.min(100, Math.max(0, ((profile.total_deposited - currentMin) / (nextMin - currentMin)) * 100))
  const remaining = Math.max(0, nextMin - profile.total_deposited)
  return { current, next, progress, remaining, currentMin, nextMin }
}
