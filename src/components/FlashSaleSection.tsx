import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, Flex, HStack, VStack, Text, Grid, Spinner } from '@chakra-ui/react'
import { LuZap, LuFlame, LuClock, LuShoppingCart, LuGamepad2 } from 'react-icons/lu'
import { supabase, formatCurrency, type FlashSaleItem } from '../lib/supabase'
import { GlassCard, Badge } from './GlassCard'

function CountdownTimer({ endTime }: { endTime: string }) {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endTime).getTime() - Date.now()
      if (diff <= 0) { setTime({ h: 0, m: 0, s: 0 }); return }
      setTime({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [endTime])

  const pad = (n: number) => n.toString().padStart(2, '0')

  return (
    <HStack gap={1}>
      <Box px={2} py={1} borderRadius="md" bg="rgba(239,68,68,0.2)" border="1px solid rgba(239,68,68,0.4)">
        <Text fontSize="sm" fontWeight="black" color="#ef4444" fontFamily="mono">{pad(time.h)}</Text>
      </Box>
      <Text color="#ef4444" fontWeight="bold">:</Text>
      <Box px={2} py={1} borderRadius="md" bg="rgba(239,68,68,0.2)" border="1px solid rgba(239,68,68,0.4)">
        <Text fontSize="sm" fontWeight="black" color="#ef4444" fontFamily="mono">{pad(time.m)}</Text>
      </Box>
      <Text color="#ef4444" fontWeight="bold">:</Text>
      <Box px={2} py={1} borderRadius="md" bg="rgba(239,68,68,0.2)" border="1px solid rgba(239,68,68,0.4)">
        <Text fontSize="sm" fontWeight="black" color="#ef4444" fontFamily="mono">{pad(time.s)}</Text>
      </Box>
    </HStack>
  )
}

export function FlashSaleSection() {
  const [items, setItems] = useState<FlashSaleItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('flash_sale_items')
      .select('*, products(*), flash_sales(*)')
      .gte('flash_sales.end_time', new Date().toISOString())
      .eq('flash_sales.is_active', true)
      .limit(4)
      .then(({ data }) => {
        if (data) setItems(data as FlashSaleItem[])
        setLoading(false)
      })
  }, [])

  if (loading) return null
  if (items.length === 0) return null

  const sale = items[0]?.flash_sales
  if (!sale) return null

  return (
    <Box mb={16}>
      <GlassCard p={6} rgbBorder>
        <Flex align="center" justify="space-between" mb={6} flexWrap="wrap" gap={3}>
          <HStack gap={3}>
            <Box p={2} borderRadius="xl" bg="rgba(239,68,68,0.15)" border="1px solid rgba(239,68,68,0.3)" animation="glow-pulse 2s ease-in-out infinite">
              <LuFlame size={22} color="#ef4444" />
            </Box>
            <Box>
              <Text fontSize="xl" fontWeight="black" color="#ef4444" textShadow="0 0 20px rgba(239,68,68,0.4)">
                FLASH SALE
              </Text>
              <Text fontSize="xs" color="rgba(255,255,255,0.4)">{sale.name}</Text>
            </Box>
          </HStack>
          <HStack gap={2}>
            <LuClock size={14} color="#ef4444" />
            <Text fontSize="xs" color="rgba(255,255,255,0.5)">Kết thúc trong:</Text>
            <CountdownTimer endTime={sale.end_time} />
          </HStack>
        </Flex>

        <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(4,1fr)' }} gap={3}>
          {items.map((item) => {
            if (!item.products) return null
            const p = item.products
            const soldPct = item.max_quantity ? (item.sold_count / item.max_quantity) * 100 : 50
            return (
              <Link key={item.id} to={`/products/${p.slug}`}>
                <GlassCard overflow="hidden" cursor="pointer" hover h="full">
                  <Box position="relative" h="120px" bg="linear-gradient(135deg, rgba(239,68,68,0.3), rgba(168,85,247,0.3))">
                    {p.images?.[0] ? (
                      <Box as="img" src={p.images[0]} alt={p.name} w="full" h="full" objectFit="cover" />
                    ) : (
                      <Flex align="center" justify="center" h="full">
                        <LuGamepad2 size={36} color="rgba(239,68,68,0.4)" />
                      </Flex>
                    )}
                    <Badge color="red" position="absolute" top={2} left={2}>
                      <LuZap size={10} /> SALE
                    </Badge>
                  </Box>
                  <Box p={3}>
                    <Text fontSize="xs" fontWeight="bold" color="white" lineClamp={1} mb={1}>{p.name}</Text>
                    <HStack gap={1} mb={1}>
                      <Text fontSize="sm" fontWeight="black" color="#ef4444">{formatCurrency(item.sale_price)}</Text>
                      <Text fontSize="xs" color="rgba(255,255,255,0.3)" textDecoration="line-through">{formatCurrency(p.price)}</Text>
                    </HStack>
                    {/* Sold progress */}
                    <Box h={1.5} borderRadius="full" bg="rgba(255,255,255,0.1)" overflow="hidden">
                      <Box h="full" borderRadius="full" bg="linear-gradient(90deg,#ef4444,#f97316)" style={{ width: `${soldPct}%` }} />
                    </Box>
                    <Text fontSize="2xs" color="rgba(255,255,255,0.3)" mt={0.5}>
                      Đã bán {item.sold_count}{item.max_quantity ? `/${item.max_quantity}` : ''}
                    </Text>
                  </Box>
                </GlassCard>
              </Link>
            )
          })}
        </Grid>
      </GlassCard>
    </Box>
  )
}
