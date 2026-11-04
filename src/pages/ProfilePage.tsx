import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, Flex, Grid, HStack, VStack, Text, Button, Spinner, Separator, Tabs } from '@chakra-ui/react'
import { LuUser, LuWallet, LuShoppingBag, LuBell, LuGift, LuArrowDownToLine, LuArrowUpFromLine, LuPackage } from 'react-icons/lu'
import { useAuth } from '../lib/auth'
import { supabase, formatCurrency, formatDate, type Order, type WalletTransaction, type DepositTransaction, type Notification } from '../lib/supabase'
import { GlassCard, Badge } from '../components/GlassCard'
import { AccyUsername, RankBadge } from '../components/AccyUsername'
import { RankProgressBar } from '../components/RankProgressBar'
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

const WALLET_TYPE_LABEL: Record<string, string> = {
  deposit: 'Nạp tiền',
  purchase: 'Mua hàng',
  refund: 'Hoàn tiền',
  bonus: 'Thưởng',
  transfer: 'Chuyển khoản',
  admin: 'Quản trị',
}

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'orders'

  const [orders, setOrders] = useState<Order[]>([])
  const [walletTxns, setWalletTxns] = useState<WalletTransaction[]>([])
  const [deposits, setDeposits] = useState<DepositTransaction[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [notifOpen, setNotifOpen] = useState(false)

  // Load all data when user is available
  useEffect(() => {
    if (!user) {
      setLoadingData(false)
      return
    }
    let active = true
    setLoadingData(true)

    const run = async () => {
      const [ordersRes, walletRes, depositsRes, notifRes] = await Promise.all([
        supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('deposit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      ])

      if (!active) return
      setOrders((ordersRes.data ?? []) as Order[])
      setWalletTxns((walletRes.data ?? []) as WalletTransaction[])
      setDeposits((depositsRes.data ?? []) as DepositTransaction[])
      setNotifications((notifRes.data ?? []) as Notification[])
      setLoadingData(false)
    }

    run()
    return () => { active = false }
  }, [user])

  const onTabChange = (details: { value: string }) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', details.value)
    setSearchParams(next, { replace: true })
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    toaster.create({ type: 'success', title: 'Đã đánh dấu tất cả là đã đọc' })
  }

  if (loading) {
    return (
      <Box pt="100px" pb={16} maxW="1200px" mx="auto" px={{ base: 4, md: 6 }}>
        <Flex justify="center" align="center" py={20}>
          <VStack gap={3}>
            <Spinner size="xl" color="#a855f7" />
            <Text fontSize="sm" color="rgba(255,255,255,0.4)">Đang tải hồ sơ...</Text>
          </VStack>
        </Flex>
        <Toaster />
      </Box>
    )
  }

  if (!user || !profile) {
    return (
      <Box pt="100px" pb={16} maxW="1200px" mx="auto" px={{ base: 4, md: 6 }}>
        <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
          <GlassCard p={10} rgbBorder>
            <VStack gap={4} textAlign="center">
              <Box p={4} borderRadius="full" bg="rgba(168,85,247,0.12)" border="1px solid rgba(168,85,247,0.3)">
                <LuUser size={40} color="#a855f7" />
              </Box>
              <Text fontSize="xl" fontWeight="black" color="white">Vui lòng đăng nhập</Text>
              <Text fontSize="sm" color="rgba(255,255,255,0.5)">
                Bạn cần đăng nhập để xem hồ sơ và lịch sử hoạt động của mình.
              </Text>
              <Link to="/login">
                <Button bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" _hover={{ opacity: 0.9 }} borderRadius="xl">
                  <LuUser size={14} /> Đăng Nhập
                </Button>
              </Link>
            </VStack>
          </GlassCard>
        </motion.div>
        <Toaster />
      </Box>
    )
  }

  const avatarLetter = (profile.username || profile.email || 'U').charAt(0).toUpperCase()
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
      <Box pt="100px" pb={16} maxW="1200px" mx="auto" px={{ base: 4, md: 6 }}>
        {/* Header */}
        <HStack justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
          <HStack gap={2}>
            <LuUser size={24} color="#a855f7" />
            <Text fontSize="2xl" fontWeight="black" color="white">Hồ Sơ Của Tôi</Text>
          </HStack>
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              borderColor="rgba(139,92,246,0.3)"
              color="white"
              _hover={{ bg: 'rgba(139,92,246,0.1)' }}
              onClick={() => setNotifOpen((v) => !v)}
            >
              <LuBell size={14} /> Thông Báo
              {unreadCount > 0 && (
                <Box as="span" ml={1} px={1.5} py={0.5} borderRadius="full" bg="#ef4444" color="white" fontSize="2xs" fontWeight="bold">
                  {unreadCount}
                </Box>
              )}
            </Button>
          </HStack>
        </HStack>

        {/* Profile header card */}
        <GlassCard p={6} rgbBorder mb={6}>
          <Flex align="center" gap={{ base: 4, md: 6 }} direction={{ base: 'column', md: 'row' }} textAlign={{ base: 'center', md: 'left' }}>
            <Box
              flexShrink={0}
              w={{ base: '80px', md: '96px' }}
              h={{ base: '80px', md: '96px' }}
              borderRadius="full"
              bg="linear-gradient(135deg,#7c3aed,#3b82f6,#06b6d4,#a855f7)"
              bgSize="200% 200%"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize={{ base: '2xl', md: '3xl' }}
              fontWeight="black"
              color="white"
              css={{ animation: 'shimmer 4s linear infinite', boxShadow: '0 0 30px rgba(168,85,247,0.4)' }}
            >
              {avatarLetter}
            </Box>
            <VStack align={{ base: 'center', md: 'start' }} gap={2} flex={1}>
              <HStack gap={2} wrap="wrap" justify={{ base: 'center', md: 'start' }}>
                <AccyUsername username={profile.username} rankKey={profile.rank} showIcon fontSize="2xl" />
                <RankBadge rankKey={profile.rank} size="md" />
              </HStack>
              <HStack gap={3} wrap="wrap" justify={{ base: 'center', md: 'start' }}>
                <HStack gap={1}>
                  <Text fontSize="xs" color="rgba(255,255,255,0.4)">Mã KH:</Text>
                  <Text fontSize="sm" fontWeight="bold" color="#06b6d4" fontFamily="mono">#{profile.customer_id}</Text>
                </HStack>
                {profile.email && (
                  <HStack gap={1}>
                    <Text fontSize="xs" color="rgba(255,255,255,0.4)">Email:</Text>
                    <Text fontSize="sm" color="rgba(255,255,255,0.7)">{profile.email}</Text>
                  </HStack>
                )}
              </HStack>
              <HStack gap={2} wrap="wrap" justify={{ base: 'center', md: 'start' }}>
                {profile.is_banned && <Badge color="red">Tài khoản bị khóa</Badge>}
                {profile.role === 'admin' && <Badge color="gold">Quản Trị Viên</Badge>}
                <Badge color="purple">
                  <LuGift size={10} /> {profile.reward_points} điểm
                </Badge>
              </HStack>
            </VStack>
          </Flex>
        </GlassCard>

        {/* Notifications panel */}
        {notifOpen && (
          <GlassCard p={5} mb={6}>
            <Flex justify="space-between" align="center" mb={3}>
              <HStack gap={2}>
                <LuBell size={18} color="#a855f7" />
                <Text fontSize="lg" fontWeight="bold" color="white">Thông Báo</Text>
                {unreadCount > 0 && <Badge color="red">{unreadCount} mới</Badge>}
              </HStack>
              <HStack gap={2}>
                {unreadCount > 0 && (
                  <Button size="xs" variant="ghost" color="#a855f7" onClick={markAllRead}>Đánh dấu đã đọc</Button>
                )}
                <Button size="xs" variant="ghost" color="rgba(255,255,255,0.5)" onClick={() => setNotifOpen(false)}>Đóng</Button>
              </HStack>
            </Flex>
            <Separator mb={3} />
            {notifications.length === 0 ? (
              <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" py={4}>
                Chưa có thông báo nào
              </Text>
            ) : (
              <VStack align="stretch" gap={2} maxH="320px" overflowY="auto">
                {notifications.map((n) => (
                  <Box
                    key={n.id}
                    p={3}
                    borderRadius="lg"
                    bg={n.is_read ? 'rgba(15,10,30,0.3)' : 'rgba(168,85,247,0.08)'}
                    border={n.is_read ? '1px solid rgba(139,92,246,0.1)' : '1px solid rgba(168,85,247,0.25)'}
                  >
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="sm" fontWeight="bold" color="white">{n.title}</Text>
                      {!n.is_read && <Box w={2} h={2} borderRadius="full" bg="#a855f7" flexShrink={0} />}
                    </HStack>
                    <Text fontSize="xs" color="rgba(255,255,255,0.6)">{n.message}</Text>
                    <Text fontSize="2xs" color="rgba(255,255,255,0.3)" mt={1}>{formatDate(n.created_at)}</Text>
                  </Box>
                ))}
              </VStack>
            )}
          </GlassCard>
        )}

        {/* Stat cards */}
        <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap={4} mb={6}>
          <GlassCard p={5} glow="cyan" hover>
            <HStack gap={3}>
              <Box p={3} borderRadius="xl" bg="rgba(6,182,212,0.12)" border="1px solid rgba(6,182,212,0.3)">
                <LuWallet size={22} color="#06b6d4" />
              </Box>
              <Box>
                <Text fontSize="xs" color="rgba(255,255,255,0.4)">Số Dư Khả Dụng</Text>
                <Text fontSize="xl" fontWeight="black" color="#06b6d4" css={{ textShadow: '0 0 16px rgba(6,182,212,0.4)' }}>
                  {formatCurrency(profile.balance)}
                </Text>
              </Box>
            </HStack>
            <Link to="/deposit">
              <Button mt={3} size="xs" w="full" variant="outline" borderColor="rgba(6,182,212,0.3)" color="#06b6d4" _hover={{ bg: 'rgba(6,182,212,0.1)' }}>
                <LuArrowDownToLine size={12} /> Nạp Tiền
              </Button>
            </Link>
          </GlassCard>

          <GlassCard p={5} glow="purple" hover>
            <HStack gap={3}>
              <Box p={3} borderRadius="xl" bg="rgba(168,85,247,0.12)" border="1px solid rgba(168,85,247,0.3)">
                <LuArrowDownToLine size={22} color="#a855f7" />
              </Box>
              <Box>
                <Text fontSize="xs" color="rgba(255,255,255,0.4)">Tổng Đã Nạp</Text>
                <Text fontSize="xl" fontWeight="black" color="#a855f7" css={{ textShadow: '0 0 16px rgba(168,85,247,0.4)' }}>
                  {formatCurrency(profile.total_deposited)}
                </Text>
              </Box>
            </HStack>
            <Box mt={3} h="24px" />
          </GlassCard>

          <GlassCard p={5} glow="gold" hover>
            <HStack gap={3}>
              <Box p={3} borderRadius="xl" bg="rgba(255,215,0,0.12)" border="1px solid rgba(255,215,0,0.3)">
                <LuShoppingBag size={22} color="#ffd700" />
              </Box>
              <Box>
                <Text fontSize="xs" color="rgba(255,255,255,0.4)">Tổng Đã Chi</Text>
                <Text fontSize="xl" fontWeight="black" color="#ffd700" css={{ textShadow: '0 0 16px rgba(255,215,0,0.4)' }}>
                  {formatCurrency(profile.total_spent)}
                </Text>
              </Box>
            </HStack>
            <Box mt={3} h="24px" />
          </GlassCard>
        </Grid>

        {/* Rank progress */}
        <Box mb={6}>
          <RankProgressBar profile={profile} />
        </Box>

        {/* Tabs */}
        <GlassCard p={0} overflow="hidden">
          <Tabs.Root value={activeTab} onValueChange={onTabChange} variant="enclosed" lazyMount unmountOnExit>
            <Tabs.List bg="rgba(15,10,30,0.4)" borderBottom="1px solid rgba(139,92,246,0.15)" px={3} pt={3}>
              <Tabs.Trigger value="orders">
                <HStack gap={1.5}>
                  <LuShoppingBag size={14} />
                  <Text fontSize="sm" fontWeight="bold">Đơn Hàng</Text>
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
                  <Text fontSize="sm" fontWeight="bold">Ví Tiền</Text>
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

            {/* Orders tab */}
            <Tabs.Content value="orders" p={{ base: 3, md: 5 }}>
              {loadingData ? (
                <Flex justify="center" py={10}><Spinner color="#a855f7" /></Flex>
              ) : orders.length === 0 ? (
                <VStack gap={3} py={10} textAlign="center">
                  <LuPackage size={48} color="rgba(255,255,255,0.2)" />
                  <Text fontSize="sm" color="rgba(255,255,255,0.5)">Chưa có đơn hàng nào</Text>
                  <Link to="/products">
                    <Button size="sm" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" _hover={{ opacity: 0.9 }} borderRadius="xl">
                      Khám Phá Sản Phẩm
                    </Button>
                  </Link>
                </VStack>
              ) : (
                <VStack align="stretch" gap={3}>
                  {orders.map((o) => (
                    <Box
                      key={o.id}
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
                            <Text fontSize="sm" fontWeight="bold" color="#06b6d4" fontFamily="mono">{o.order_code}</Text>
                            <Badge color={STATUS_BADGE[o.status] ?? 'purple'}>
                              {STATUS_LABEL[o.status] ?? o.status}
                            </Badge>
                          </HStack>
                          <Text fontSize="sm" fontWeight="bold" color="white">{o.product_name}</Text>
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

                      {o.delivery_data && o.delivery_data.length > 0 && (
                        <>
                          <Separator my={3} />
                          <VStack align="stretch" gap={1}>
                            <Text fontSize="xs" color="rgba(255,255,255,0.4)">Thông tin giao hàng:</Text>
                            {o.delivery_data.map((d, i) => (
                              <Box
                                key={i}
                                p={2}
                                borderRadius="md"
                                bg="rgba(16,185,129,0.06)"
                                border="1px solid rgba(16,185,129,0.2)"
                                fontFamily="mono"
                                fontSize="xs"
                                color="white"
                                wordBreak="break-all"
                                whiteSpace="pre-wrap"
                              >
                                {d}
                              </Box>
                            ))}
                          </VStack>
                        </>
                      )}
                    </Box>
                  ))}
                </VStack>
              )}
            </Tabs.Content>

            {/* Wallet tab */}
            <Tabs.Content value="wallet" p={{ base: 3, md: 5 }}>
              {loadingData ? (
                <Flex justify="center" py={10}><Spinner color="#a855f7" /></Flex>
              ) : walletTxns.length === 0 ? (
                <VStack gap={3} py={10} textAlign="center">
                  <LuWallet size={48} color="rgba(255,255,255,0.2)" />
                  <Text fontSize="sm" color="rgba(255,255,255,0.5)">Chưa có giao dịch ví nào</Text>
                </VStack>
              ) : (
                <VStack align="stretch" gap={2}>
                  {walletTxns.map((t) => {
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
            <Tabs.Content value="deposits" p={{ base: 3, md: 5 }}>
              {loadingData ? (
                <Flex justify="center" py={10}><Spinner color="#a855f7" /></Flex>
              ) : deposits.length === 0 ? (
                <VStack gap={3} py={10} textAlign="center">
                  <LuArrowDownToLine size={48} color="rgba(255,255,255,0.2)" />
                  <Text fontSize="sm" color="rgba(255,255,255,0.5)">Chưa có giao dịch nạp tiền nào</Text>
                  <Link to="/deposit">
                    <Button size="sm" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" _hover={{ opacity: 0.9 }} borderRadius="xl">
                      <LuArrowDownToLine size={12} /> Nạp Tiền Ngay
                    </Button>
                  </Link>
                </VStack>
              ) : (
                <VStack align="stretch" gap={3}>
                  {deposits.map((d) => (
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
                              {STATUS_LABEL[d.status] ?? d.status}
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
