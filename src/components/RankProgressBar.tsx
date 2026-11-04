import { useState } from 'react'
import { Box, Flex, HStack, VStack, Text, Button, Spinner } from '@chakra-ui/react'
import { LuTrendingUp, LuGift } from 'react-icons/lu'
import { supabase, formatCurrency, type MembershipRank, type Profile } from '../lib/supabase'
import { getRankProgress, RANK_CONFIG, RANK_ORDER } from '../lib/ranks'
import { GlassCard, Badge } from './GlassCard'
import { RankBadge } from './AccyUsername'

export function RankProgressBar({ profile }: { profile: Pick<Profile, 'total_deposited' | 'rank'> }) {
  const [ranks, setRanks] = useState<MembershipRank[]>([])
  const [showBenefits, setShowBenefits] = useState(false)
  const [loaded, setLoaded] = useState(false)

  if (!loaded && ranks.length === 0) {
    supabase.from('membership_ranks').select('*').order('sort_order').then(({ data }) => {
      if (data) setRanks(data as MembershipRank[])
      setLoaded(true)
    })
  }

  if (ranks.length === 0) return <Spinner color="purple.400" size="sm" />

  const { current, next, progress, remaining } = getRankProgress(profile, ranks)
  const rankCfg = RANK_CONFIG[current.rank_key] || RANK_CONFIG.member

  return (
    <GlassCard p={5} glow="purple" hover>
      <Flex align="center" justify="space-between" mb={3}>
        <HStack gap={2}>
          <Box p={2} borderRadius="xl" bg={`${rankCfg.color}15`} border={`1px solid ${rankCfg.color}30`}>
            <LuTrendingUp size={16} color={rankCfg.color} />
          </Box>
          <Box>
            <Text fontSize="xs" color="rgba(255,255,255,0.4)">Hạng hiện tại</Text>
            <RankBadge rankKey={current.rank_key} size="sm" />
          </Box>
        </HStack>
        {next && (
          <Box textAlign="right">
            <Text fontSize="xs" color="rgba(255,255,255,0.4)">Hạng tiếp theo</Text>
            <RankBadge rankKey={next.rank_key} size="sm" />
          </Box>
        )}
      </Flex>

      <Box position="relative" h={3} borderRadius="full" bg="rgba(255,255,255,0.06)" overflow="hidden" mb={2}
        css={progress > 80 ? { boxShadow: '0 0 15px rgba(168,85,247,0.4)' } : {}}>
        <Box
          h="full"
          borderRadius="full"
          bg="linear-gradient(90deg, #7c3aed, #3b82f6, #06b6d4, #a855f7)"
          bgSize="200% 100%"
          css={{ animation: 'shimmer 2s linear infinite', transition: 'width 0.5s ease' }}
          style={{ width: `${progress}%` }}
        />
      </Box>

      <Flex justify="space-between" align="center">
        <Text fontSize="xs" color="rgba(255,255,255,0.5)">
          {next ? `Còn ${formatCurrency(remaining)} để lên ${next.name}` : 'Đã đạt hạng cao nhất!'}
        </Text>
        <Button size="xs" variant="ghost" color="#a855f7" _hover={{ bg: 'rgba(168,85,247,0.1)' }} onClick={() => setShowBenefits(true)}>
          <LuGift size={12} /> Quyền lợi
        </Button>
      </Flex>

      {showBenefits && (
        <Box
          position="fixed" inset={0} zIndex={999} display="flex" alignItems="center" justifyContent="center"
          bg="rgba(0,0,0,0.7)" backdropFilter="blur(8px)"
          onClick={() => setShowBenefits(false)}
        >
          <GlassCard p={6} maxW="500px" w="90%" rgbBorder onClick={(e) => e.stopPropagation()}>
            <Text fontSize="lg" fontWeight="black" color="white" mb={4}>Bảng Hạng Thành Viên</Text>
            <VStack gap={2} align="stretch" maxH="60vh" overflowY="auto">
              {RANK_ORDER.map((key) => {
                const r = ranks.find((rk) => rk.rank_key === key)
                const cfg = RANK_CONFIG[key]
                if (!r) return null
                return (
                  <Box key={key} p={3} borderRadius="xl" bg={`${cfg.color}08`} border={`1px solid ${cfg.color}20`}>
                    <Flex justify="space-between" align="center" mb={1}>
                      <HStack gap={2}>
                        <RankBadge rankKey={key} size="sm" />
                      </HStack>
                      <Text fontSize="xs" color="rgba(255,255,255,0.4)">Nạp tối thiểu: {formatCurrency(r.min_amount)}</Text>
                    </Flex>
                    <HStack gap={2} flexWrap="wrap" mt={1}>
                      {r.benefits.map((b, i) => <Badge key={i} color="purple">{b}</Badge>)}
                    </HStack>
                    <Text fontSize="xs" color="rgba(255,255,255,0.4)" mt={1}>
                      Giảm {r.discount_percent}% • Hoàn tiền {r.cashback_percent}%
                    </Text>
                  </Box>
                )
              })}
            </VStack>
            <Button mt={4} w="full" variant="outline" borderColor="rgba(139,92,246,0.3)" color="white" onClick={() => setShowBenefits(false)}>
              Đóng
            </Button>
          </GlassCard>
        </Box>
      )}
    </GlassCard>
  )
}
