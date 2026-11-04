import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, Flex, HStack, VStack, Text, Button, Spinner, Separator, Tabs, Input } from '@chakra-ui/react'
import {
  LuHistory, LuPackage, LuWallet, LuArrowDownToLine, LuArrowUpFromLine,
  LuSearch, LuCircleCheck, LuCircleX, LuClock, LuCopy, LuArrowLeft,
} from 'react-icons/lu'
import { useAuth } from '../lib/auth'
import { supabase, formatCurrency, formatDate, type Order, type WalletTransaction, type DepositTransaction } from '../lib/supabase'
import { GlassCard, Badge } from '../components/GlassCard'
import { pageVariants, pageTransition } from '../components/AnimatedBackground'
import { Toaster, toaster } from '../components/ui/toaster'

const STATUS_BADGE: Record<string, 'purple' | 'blue' | 'cyan' | 'green' | 'red' | 'gold' | 'pink'> = {
  completed: 'green',
  pending: 'gold',
  processing: 'blue',
  cancelled: 'red',
  failed: 'red',
  refunded: 'pink',
  expired: 'red',
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Hoàn thành',
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  cancelled: 'Đã hủy',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
  expired: 'Hết hạn',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  completed: <LuCircleCheck size={12} color="#10b981" />,
  pending: <LuClock size={12} color="#ffd700" />,
  processing: <LuClock size={12} color="#3b82f6" />,
  cancelled: <LuCircleX size={12} color="#ef4444" />,
  failed: <LuCircleX size={12} color="#ef4444" />,
  refunded: <LuCircleX size={12} color="#ec4899" />,
  expired: <LuCircleX size={12} color="#ef4444" />,
}

const WALLET_TYPE_LABEL: Record<string, string> = {
  deposit: 'Nạp tiền',
  purchase: 'Mua hàng',
  refund: 'Hoàn tiền',
  bonus: 'Thưởng',
  transfer: 'Chuyển khoản',
  admin: 'Quản trị',
}

export default function TransactionHistoryPage() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<string>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [walletTxns, setWalletTxns] = useState<WalletTransaction[]>([])
  const [deposits, setDeposits] = useState<DepositTransaction[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoadingData(false)
      return
    }
    let active = true
    setLoadingData(true)

    const run = async () => {
      const [ordersRes, walletRes, depositsRes] = await Promise.all([
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('deposit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      ])

      if (!active) return
      setOrders((ordersRes.data ?? []) as Order[])
      setWalletTxns((walletRes.data ?? []) as WalletTransaction[])
      setDeposits((depositsRes.data ?? []) as DepositTransaction[])
      setLoadingData(false)
    }

    run()
    return () => { active = false }
  }, [user])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toaster.create({ type: 'success', title: 'Đã sao chép' })
  }

  if (loading) {
    return (
      <Box pt="100px" pb={16} maxW="1000px" mx="auto" px={{ base: 4, md: 6 }}>
        <Flex justify="center" py={20}>
          <Spinner size="xl" color="#a855f7" />
        </Flex>
        <Toaster />
      </Box>
    )
  }

  if (!user) {
    return (
      <Box pt="100px" pb={16} maxW="1000px" mx="auto" px={{ base: 4, md: 6 }}>
        <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
          <GlassCard p={10} rgbBorder>
            <VStack gap={4} textAlign="center">
              <Box p={4} borderRadius="full" bg="rgba(168,85,247,0.12)" border="1px solid rgba(168,85,247,0.3)">
                <LuHistory size={40} color="#a855f7" />
              </Box>
              <Text fontSize="xl" fontWeight="black" color="white">Vui lòng đăng nhập</Text>
              <Text fontSize="sm" color="rgba(255,255,255,0.5)">
                Bạn cần đăng nhập để xem lịch sử giao dịch.
              </Text>
              <Link to="/login">
                <Button bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" _hover={{ opacity: 0.9 }} borderRadius="xl">
                  Đăng Nhập
                </Button>
              </Link>
            </VStack>
          </GlassCard>
        </motion.div>
        <Toaster />
      </Box>
    )
  }

  const filteredOrders = search.trim()
    ? orders.filter((o) =>
        o.order_code.toLowerCase().includes(search.toLowerCase()) ||
        o.product_name.toLowerCase().includes(search.toLowerCase())
      )
    : orders

  const filteredDeposits = search.trim()
    ? deposits.filter((d) => d.transaction_code.toLowerCase().includes(search.toLowerCase()))
    : deposits

  const filteredWallet = search.trim()
    ? walletTxns.filter((t) =>
        (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (WALLET_TYPE_LABEL[t.type] || t.type).toLowerCase().includes(search.toLowerCase())
      )
    : walletTxns

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
      <Box pt="100px" pb={16} maxW="1000px" mx="auto" px={{ base: 4, md: 6 }}>
        {/* Header */}
        <HStack justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
          <HStack gap={2}>
            <LuHistory size={24} color="#a855f7" />
            <Text fontSize="2xl" fontWeight="black" color="white">Lịch Sử Giao Dịch</Text>
          </HStack>
          <Link to="/profile">
            <Button size="sm" variant="ghost" color="rgba(255,255,255,0.6)" _hover={{ color: 'white', bg: 'rgba(139,92,246,0.1)' }}>
              <LuArrowLeft size={14} /> Hồ Sơ
            </Button>
          </Link>
        </HStack>

        {/* Summary cards */}
        <Box display="grid" gridTemplateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap={4} mb={6}>
          <GlassCard p={4} glow="cyan" hover>
            <VStack gap={1} align="start">
              <Text fontSize="xs" color="rgba(255,255,255,0.4)">Tổng Đơn Hàng</Text>
              <Text fontSize="2xl" fontWeight="black" color="#06b6d4" css={{ textShadow: '0 0 16px rgba(6,182,212,0.4)' }}>
                {orders.length}
              </Text>
            </VStack>
          </GlassCard>
          <GlassCard p={4} glow="green" hover>
            <VStack gap={1} align="start">
              <Text fontSize="xs" color="rgba(255,255,255,0.4)">Đã Hoàn Thành</Text>
              <Text fontSize="2xl" fontWeight="black" color="#10b981" css={{ textShadow: '0 0 16px rgba(16,185,129,0.4)' }}>
                {orders.filter((o) => o.status === 'completed').length}
              </Text>
            </VStack>
          </GlassCard>
          <GlassCard p={4} glow="purple" hover>
            <VStack gap={1} align="start">
              <Text fontSize="xs" color="rgba(255,255,255,0.4)">Tổng Chi Tiêu</Text>
              <Text fontSize="2xl" fontWeight="black" color="#a855f7" css={{ textShadow: '0 0 16px rgba(168,85,247,0.4)' }}>
                {formatCurrency(orders.reduce((s, o) => s + o.total_price, 0))}
              </Text>
            </VStack>
          </GlassCard>
        </Box>

        {/* Tabs */}
        <GlassCard p={0} overflow="hidden">
          <Tabs.Root value={tab} onValueChange={(d) => setTab(d.value)}>
            <Box px={{ base: 3, md: 5 }} pt={4}>
              <Tabs.List>
                <Tabs.Trigger value="orders">
                  <HStack gap={1.5}>
                    <LuPackage size={14} />
                    <Text fontSize="sm" fontWeight="bold">Tài Nguyên Đã Mua</Text>
                    {orders.length > 0 && (
                      <Box as="span" px={1.5} py={0.5} borderRadius="full" bg="rgba(168,85,247,0.15)" fontSize="2xs" fontWeight="bold" color="#a855f7">
                        {orders.length}
                      </Box>
                    )}
                  </HStack>
                </Tabs.Trigger>
                <Tabs.Trigger value="wallet">
                  <HStack gap={1.5}>
                    <LuWallet size={14} />
                    <Text fontSize="sm" fontWeight="bold">Giao Dịch Ví</Text>
                  </HStack>
                </Tabs.Trigger>
                <Tabs.Trigger value="deposits">
                  <HStack gap={1.5}>
                    <LuArrowDownToLine size={14} />
                    <Text fontSize="sm" fontWeight="bold">Nạp Tiền</Text>
                  </HStack>
                </Tabs.Trigger>
                <Tabs.Indicator />
              </Tabs.List>
            </Box>

            {/* Search bar */}
            <Box px={{ base: 3, md: 5 }} py={3}>
              <Box position="relative">
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                  <LuSearch size={14} color="rgba(168,85,247,0.6)" />
                </Box>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo mã giao dịch, tên tài nguyên..."
                  pl={9} h={9}
                  bg="rgba(15,10,30,0.5)"
                  border="1px solid rgba(139,92,246,0.2)"
                  borderRadius="xl"
                  color="white"
                  _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
                  _focus={{ border: '1px solid rgba(168,85,247,0.6)', boxShadow: '0 0 0 3px rgba(168,85,247,0.1)' }}
                  fontSize="sm"
                />
              </Box>
            </Box>

            {/* Orders tab */}
            <Tabs.Content value="orders" p={{ base: 3, md: 5 }} pt={0}>
              {loadingData ? (
                <Flex justify="center" py={10}><Spinner color="#a855f7" /></Flex>
              ) : filteredOrders.length === 0 ? (
                <VStack gap={3} py={10} textAlign="center">
                  <LuPackage size={48} color="rgba(255,255,255,0.2)" />
                  <Text fontSize="sm" color="rgba(255,255,255,0.5)">
                    {search.trim() ? 'Không tìm thấy đơn hàng nào' : 'Chưa có đơn hàng nào'}
                  </Text>
                  {!search.trim() && (
                    <Link to="/products">
                      <Button size="sm" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" _hover={{ opacity: 0.9 }} borderRadius="xl">
                        Khám Phá Tài Nguyên
                      </Button>
                    </Link>
                  )}
                </VStack>
              ) : (
                <VStack align="stretch" gap={3}>
                  {filteredOrders.map((o) => {
                    const isExpanded = expandedOrder === o.id
                    return (
                      <Box
                        key={o.id}
                        p={4}
                        borderRadius="xl"
                        bg="rgba(15,10,30,0.4)"
                        border={isExpanded ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(139,92,246,0.12)'}
                        _hover={{ border: '1px solid rgba(168,85,247,0.3)' }}
                        transition="all 0.25s"
                      >
                        {/* Order header */}
                        <Box
                          as="button"
                          w="full"
                          textAlign="left"
                          cursor="pointer"
                          onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                        >
                          <Flex justify="space-between" align="start" wrap="wrap" gap={2}>
                            <VStack align="start" gap={1} flex={1} minW={0}>
                              <HStack gap={2} wrap="wrap">
                                <Text fontSize="sm" fontWeight="bold" color="#06b6d4" fontFamily="mono">{o.order_code}</Text>
                                <Badge color={STATUS_BADGE[o.status] ?? 'purple'}>
                                  {STATUS_ICON[o.status]} {STATUS_LABEL[o.status] ?? o.status}
                                </Badge>
                              </HStack>
                              <Text fontSize="sm" fontWeight="bold" color="white" lineClamp={1}>{o.product_name}</Text>
                              <HStack gap={3} wrap="wrap" fontSize="xs" color="rgba(255,255,255,0.5)">
                                <HStack gap={1}><LuPackage size={11} /> SL: {o.quantity}</HStack>
                                <Text>{formatDate(o.created_at)}</Text>
                              </HStack>
                            </VStack>
                            <VStack align="end" gap={1}>
                              <Text fontSize="md" fontWeight="black" color="#ffd700">{formatCurrency(o.total_price)}</Text>
                              {o.discount_amount > 0 && (
                                <Text fontSize="2xs" color="#10b981">Giảm {formatCurrency(o.discount_amount)}</Text>
                              )}
                            </VStack>
                          </Flex>
                        </Box>

                        {/* Expanded delivery data */}
                        {isExpanded && o.delivery_data && o.delivery_data.length > 0 && (
                          <>
                            <Separator my={3} />
                            <VStack align="stretch" gap={2}>
                              <Text fontSize="xs" fontWeight="bold" color="rgba(255,255,255,0.6)">
                                Mã tài nguyên / Thông tin giao hàng:
                              </Text>
                              {o.delivery_data.map((d, i) => (
                                <Flex
                                  key={i}
                                  gap={2}
                                  align="center"
                                  p={2}
                                  borderRadius="md"
                                  bg="rgba(16,185,129,0.06)"
                                  border="1px solid rgba(16,185,129,0.2)"
                                >
                                  <Box
                                    flex={1}
                                    fontFamily="mono"
                                    fontSize="xs"
                                    color="white"
                                    wordBreak="break-all"
                                    whiteSpace="pre-wrap"
                                  >
                                    {d}
                                  </Box>
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    color="rgba(16,185,129,0.8)"
                                    _hover={{ bg: 'rgba(16,185,129,0.1)' }}
                                    borderRadius="md"
                                    flexShrink={0}
                                    onClick={() => copyToClipboard(d)}
                                  >
                                    <LuCopy size={12} />
                                  </Button>
                                </Flex>
                              ))}
                            </VStack>
                          </>
                        )}

                        {/* Expanded: no delivery data */}
                        {isExpanded && (!o.delivery_data || o.delivery_data.length === 0) && (
                          <>
                            <Separator my={3} />
                            <Text fontSize="xs" color="rgba(255,255,255,0.4)" textAlign="center" py={2}>
                              {o.status === 'pending' || o.status === 'processing'
                                ? 'Đang xử lý, thông tin giao hàng sẽ cập nhật sớm...'
                                : 'Không có thông tin giao hàng'}
                            </Text>
                          </>
                        )}
                      </Box>
                    )
                  })}
                </VStack>
              )}
            </Tabs.Content>

            {/* Wallet tab */}
            <Tabs.Content value="wallet" p={{ base: 3, md: 5 }} pt={0}>
              {loadingData ? (
                <Flex justify="center" py={10}><Spinner color="#a855f7" /></Flex>
              ) : filteredWallet.length === 0 ? (
                <VStack gap={3} py={10} textAlign="center">
                  <LuWallet size={48} color="rgba(255,255,255,0.2)" />
                  <Text fontSize="sm" color="rgba(255,255,255,0.5)">
                    {search.trim() ? 'Không tìm thấy giao dịch nào' : 'Chưa có giao dịch ví nào'}
                  </Text>
                </VStack>
              ) : (
                <VStack align="stretch" gap={2}>
                  {filteredWallet.map((t) => {
                    const positive = t.amount >= 0
                    return (
                      <Box
                        key={t.id}
                        p={3}
                        borderRadius="lg"
                        bg="rgba(15,10,30,0.4)"
                        border="1px solid rgba(139,92,246,0.12)"
                        _hover={{ border: '1px solid rgba(168,85,247,0.3)' }}
                        transition="all 0.25s"
                      >
                        <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                          <HStack gap={3} align="start">
                            <Box
                              p={2}
                              borderRadius="lg"
                              bg={positive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}
                              border={`1px solid ${positive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`}
                            >
                              {positive ? <LuArrowDownToLine size={16} color="#10b981" /> : <LuArrowUpFromLine size={16} color="#ef4444" />}
                            </Box>
                            <VStack align="start" gap={0.5}>
                              <Text fontSize="sm" fontWeight="bold" color="white">
                                {WALLET_TYPE_LABEL[t.type] ?? t.type}
                              </Text>
                              <Text fontSize="xs" color="rgba(255,255,255,0.5)">{t.description}</Text>
                              <Text fontSize="2xs" color="rgba(255,255,255,0.3)">{formatDate(t.created_at)}</Text>
                            </VStack>
                          </HStack>
                          <VStack align="end" gap={0.5}>
                            <Text fontSize="md" fontWeight="black" color={positive ? '#10b981' : '#ef4444'}>
                              {positive ? '+' : ''}{formatCurrency(t.amount)}
                            </Text>
                            <Text fontSize="2xs" color="rgba(255,255,255,0.4)">
                              Còn: {formatCurrency(t.balance_after)}
                            </Text>
                          </VStack>
                        </Flex>
                      </Box>
                    )
                  })}
                </VStack>
              )}
            </Tabs.Content>

            {/* Deposits tab */}
            <Tabs.Content value="deposits" p={{ base: 3, md: 5 }} pt={0}>
              {loadingData ? (
                <Flex justify="center" py={10}><Spinner color="#a855f7" /></Flex>
              ) : filteredDeposits.length === 0 ? (
                <VStack gap={3} py={10} textAlign="center">
                  <LuArrowDownToLine size={48} color="rgba(255,255,255,0.2)" />
                  <Text fontSize="sm" color="rgba(255,255,255,0.5)">
                    {search.trim() ? 'Không tìm thấy giao dịch nào' : 'Chưa có giao dịch nạp tiền nào'}
                  </Text>
                  {!search.trim() && (
                    <Link to="/deposit">
                      <Button size="sm" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" _hover={{ opacity: 0.9 }} borderRadius="xl">
                        <LuArrowDownToLine size={12} /> Nạp Tiền Ngay
                      </Button>
                    </Link>
                  )}
                </VStack>
              ) : (
                <VStack align="stretch" gap={3}>
                  {filteredDeposits.map((d) => (
                    <Box
                      key={d.id}
                      p={4}
                      borderRadius="xl"
                      bg="rgba(15,10,30,0.4)"
                      border="1px solid rgba(139,92,246,0.12)"
                      _hover={{ border: '1px solid rgba(168,85,247,0.3)' }}
                      transition="all 0.25s"
                    >
                      <Flex justify="space-between" align="start" wrap="wrap" gap={2}>
                        <VStack align="start" gap={1}>
                          <HStack gap={2} wrap="wrap">
                            <Text fontSize="sm" fontWeight="bold" color="#06b6d4" fontFamily="mono">{d.transaction_code}</Text>
                            <Badge color={STATUS_BADGE[d.status] ?? 'gold'}>
                              {STATUS_ICON[d.status]} {STATUS_LABEL[d.status] ?? d.status}
                            </Badge>
                          </HStack>
                          {d.bank_name && (
                            <Text fontSize="xs" color="rgba(255,255,255,0.5)">{d.bank_name}</Text>
                          )}
                          <Text fontSize="2xs" color="rgba(255,255,255,0.3)">{formatDate(d.created_at)}</Text>
                        </VStack>
                        <Text fontSize="md" fontWeight="black" color="#10b981">+{formatCurrency(d.amount)}</Text>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              )}
            </Tabs.Content>
          </Tabs.Root>
        </GlassCard>

        <Toaster />
      </Box>
    </motion.div>
  )
}
