import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Box, Flex, Grid, HStack, VStack, Text, Button, Input, Spinner, Separator } from '@chakra-ui/react'
import { LuWallet, LuArrowDownToLine, LuQrCode, LuClock, LuCircleCheck, LuCopy, LuCircleDollarSign } from 'react-icons/lu'
import { useAuth } from '../lib/auth'
import { supabase, formatCurrency, formatDate, generateTransactionCode, type DepositTransaction } from '../lib/supabase'
import { GlassCard, Badge } from '../components/GlassCard'
import { RankProgressBar } from '../components/RankProgressBar'
import { pageVariants, pageTransition } from '../components/AnimatedBackground'
import { Toaster, toaster } from '../components/ui/toaster'

const PRESET_AMOUNTS = [
  { label: '50K', value: 50000 },
  { label: '100K', value: 100000 },
  { label: '200K', value: 200000 },
  { label: '500K', value: 500000 },
  { label: '1M', value: 1000000 },
]

type RecentDeposit = Pick<DepositTransaction, 'id' | 'transaction_code' | 'amount' | 'status' | 'created_at'>

const STATUS_BADGE: Record<string, 'green' | 'gold' | 'red' | 'blue' | 'pink'> = {
  completed: 'green',
  pending: 'gold',
  processing: 'blue',
  expired: 'red',
  cancelled: 'red',
  failed: 'red',
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'Hoàn thành',
  pending: 'Chờ thanh toán',
  processing: 'Đang xử lý',
  expired: 'Hết hạn',
  cancelled: 'Đã hủy',
  failed: 'Thất bại',
}

export default function DepositPage() {
  const { user, profile, loading, refreshProfile } = useAuth()

  const [amount, setAmount] = useState<number>(100000)
  const [customAmount, setCustomAmount] = useState('')
  const [settings, setSettings] = useState<{ bank_id: string; bank_account: string; bank_name: string } | null>(null)
  const [pendingTxn, setPendingTxn] = useState<DepositTransaction | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [countdown, setCountdown] = useState<number>(0)
  const [completed, setCompleted] = useState(false)
  const [recentDeposits, setRecentDeposits] = useState<RecentDeposit[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load bank settings
  useEffect(() => {
    supabase
      .from('site_settings')
      .select('bank_id, bank_account, bank_name')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data as { bank_id: string; bank_account: string; bank_name: string })
      })
  }, [])

  // Load recent deposits
  useEffect(() => {
    if (!user) {
      setLoadingRecent(false)
      return
    }
    let active = true
    supabase
      .from('deposit_transactions')
      .select('id, transaction_code, amount, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (active) {
          setRecentDeposits((data ?? []) as RecentDeposit[])
          setLoadingRecent(false)
        }
      })
    return () => { active = false }
  }, [user])

  const finalAmount = customAmount ? Math.max(0, parseInt(customAmount, 10) || 0) : amount

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard?.writeText(text)
      toaster.create({ type: 'success', title: 'Đã sao chép', description: text })
    } catch {
      toaster.create({ type: 'error', title: 'Không thể sao chép' })
    }
  }

  const startCountdown = (expiresAt: string) => {
    const end = new Date(expiresAt).getTime()
    const tick = () => {
      const remain = Math.max(0, Math.floor((end - Date.now()) / 1000))
      setCountdown(remain)
      if (remain <= 0) {
        stopPolling()
        setPendingTxn(null)
        setQrUrl(null)
        toaster.create({ type: 'info', title: 'Hết thời gian thanh toán', description: 'Vui lòng tạo giao dịch mới' })
      }
    }
    tick()
    countdownRef.current = setInterval(tick, 1000)
  }

  const startPolling = (txnId: string) => {
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('deposit_transactions')
        .select('*')
        .eq('id', txnId)
        .maybeSingle()
      const t = data as DepositTransaction | null
      if (t && t.status === 'completed') {
        stopPolling()
        setCompleted(true)
        setPendingTxn(null)
        setQrUrl(null)
        await refreshProfile()
        toaster.create({
          type: 'success',
          title: 'Nạp tiền thành công!',
          description: `+${formatCurrency(t.amount)} đã được cộng vào ví`,
        })
        // Refresh recent list
        if (user) {
          const { data: recents } = await supabase
            .from('deposit_transactions')
            .select('id, transaction_code, amount, status, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5)
          setRecentDeposits((recents ?? []) as RecentDeposit[])
        }
      }
    }, 5000)
  }

  const handleCreateQR = async () => {
    if (!user || !profile) return
    if (finalAmount < 10000) {
      toaster.create({ type: 'error', title: 'Số tiền tối thiểu 10.000đ' })
      return
    }
    if (!settings) {
      toaster.create({ type: 'error', title: 'Chưa cấu hình ngân hàng', description: 'Vui lòng liên hệ quản trị' })
      return
    }
    if (profile.is_banned) {
      toaster.create({ type: 'error', title: 'Tài khoản đã bị khóa' })
      return
    }

    setCreating(true)
    setCompleted(false)
    try {
      const txnCode = generateTransactionCode()
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

      // Build VietQR URL
      const addInfo = encodeURIComponent(txnCode)
      const accountName = encodeURIComponent(settings.bank_name)
      const url = `https://img.vietqr.io/image/${settings.bank_id}-${settings.bank_account}-compact2.png?amount=${finalAmount}&addInfo=${addInfo}&accountName=${accountName}`

      const { data, error } = await supabase
        .from('deposit_transactions')
        .insert({
          user_id: user.id,
          transaction_code: txnCode,
          amount: finalAmount,
          bank_name: settings.bank_name,
          bank_account: settings.bank_account,
          status: 'pending',
          payment_method: 'vietqr',
          qr_url: url,
          expires_at: expiresAt,
        })
        .select()
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? 'Không thể tạo giao dịch')
      }

      const txn = data as DepositTransaction
      setPendingTxn(txn)
      setQrUrl(url)
      startCountdown(expiresAt)
      startPolling(txn.id)
      toaster.create({ type: 'success', title: 'Đã tạo mã QR', description: 'Quét mã để thanh toán' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi'
      toaster.create({ type: 'error', title: 'Tạo giao dịch thất bại', description: message })
    } finally {
      setCreating(false)
    }
  }

  const handleCancel = async () => {
    if (!pendingTxn) return
    stopPolling()
    await supabase.from('deposit_transactions').update({ status: 'cancelled' }).eq('id', pendingTxn.id)
    setPendingTxn(null)
    setQrUrl(null)
    setCountdown(0)
    toaster.create({ type: 'info', title: 'Đã hủy giao dịch' })
  }

  const handleReset = () => {
    setCompleted(false)
    setPendingTxn(null)
    setQrUrl(null)
    setCountdown(0)
    setCustomAmount('')
    setAmount(100000)
  }

  if (loading) {
    return (
      <Box pt="100px" pb={16} maxW="800px" mx="auto" px={{ base: 4, md: 6 }}>
        <Flex justify="center" align="center" py={20}>
          <VStack gap={3}>
            <Spinner size="xl" color="#a855f7" />
            <Text fontSize="sm" color="rgba(255,255,255,0.4)">Đang tải...</Text>
          </VStack>
        </Flex>
        <Toaster />
      </Box>
    )
  }

  if (!user || !profile) {
    return (
      <Box pt="100px" pb={16} maxW="800px" mx="auto" px={{ base: 4, md: 6 }}>
        <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
          <GlassCard p={10} rgbBorder>
            <VStack gap={4} textAlign="center">
              <Box p={4} borderRadius="full" bg="rgba(168,85,247,0.12)" border="1px solid rgba(168,85,247,0.3)">
                <LuWallet size={40} color="#a855f7" />
              </Box>
              <Text fontSize="xl" fontWeight="black" color="white">Vui lòng đăng nhập</Text>
              <Text fontSize="sm" color="rgba(255,255,255,0.5)">
                Bạn cần đăng nhập để nạp tiền vào ví.
              </Text>
            </VStack>
          </GlassCard>
        </motion.div>
        <Toaster />
      </Box>
    )
  }

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
      <Box pt="100px" pb={16} maxW="800px" mx="auto" px={{ base: 4, md: 6 }}>
        <HStack gap={2} mb={6}>
          <LuArrowDownToLine size={24} color="#a855f7" />
          <Text fontSize="2xl" fontWeight="black" color="white">Nạp Tiền</Text>
        </HStack>

        {/* Balance card */}
        <GlassCard p={5} glow="cyan" mb={6} rgbBorder>
          <HStack justify="space-between" align="center" wrap="wrap" gap={3}>
            <HStack gap={3}>
              <Box p={3} borderRadius="xl" bg="rgba(6,182,212,0.12)" border="1px solid rgba(6,182,212,0.3)">
                <LuWallet size={24} color="#06b6d4" />
              </Box>
              <Box>
                <Text fontSize="xs" color="rgba(255,255,255,0.4)">Số Dư Hiện Tại</Text>
                <Text fontSize="2xl" fontWeight="black" color="#06b6d4" css={{ textShadow: '0 0 20px rgba(6,182,212,0.4)' }}>
                  {formatCurrency(profile.balance)}
                </Text>
              </Box>
            </HStack>
            <Badge color="cyan"><LuCircleDollarSign size={11} /> Ví chính</Badge>
          </HStack>
        </GlassCard>

        {completed ? (
          /* Success screen */
          <GlassCard p={8} glow="green" rgbBorder>
            <VStack gap={5} textAlign="center">
              <Box p={5} borderRadius="full" bg="rgba(16,185,129,0.12)" border="2px solid rgba(16,185,129,0.4)" css={{ animation: 'glow-pulse 2s ease-in-out infinite' }}>
                <LuCircleCheck size={56} color="#10b981" />
              </Box>
              <VStack gap={1}>
                <Text fontSize="2xl" fontWeight="black" color="#10b981">Nạp Tiền Thành Công!</Text>
                <Text fontSize="sm" color="rgba(255,255,255,0.6)">
                  Số dư mới của bạn: <Text as="span" fontWeight="bold" color="#06b6d4">{formatCurrency(profile.balance)}</Text>
                </Text>
              </VStack>
              <Button bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" _hover={{ opacity: 0.9 }} borderRadius="xl" onClick={handleReset}>
                <LuArrowDownToLine size={14} /> Nạp tiếp
              </Button>
            </VStack>
          </GlassCard>
        ) : qrUrl && pendingTxn ? (
          /* QR payment screen */
          <GlassCard p={6} glow="purple" mb={6} rgbBorder>
            <VStack align="stretch" gap={5}>
              <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
                <HStack gap={2}>
                  <LuQrCode size={20} color="#a855f7" />
                  <Text fontSize="lg" fontWeight="black" color="white">Quét Mã Để Thanh Toán</Text>
                </HStack>
                <HStack gap={1} px={3} py={1.5} borderRadius="full" bg={countdown < 300 ? 'rgba(239,68,68,0.12)' : 'rgba(168,85,247,0.12)'} border={`1px solid ${countdown < 300 ? 'rgba(239,68,68,0.3)' : 'rgba(168,85,247,0.3)'}`}>
                  <LuClock size={14} color={countdown < 300 ? '#ef4444' : '#a855f7'} />
                  <Text fontSize="sm" fontWeight="bold" fontFamily="mono" color={countdown < 300 ? '#ef4444' : '#a855f7'}>{timeStr}</Text>
                </HStack>
              </Flex>

              <Separator />

              {/* Amount */}
              <Box textAlign="center">
                <Text fontSize="xs" color="rgba(255,255,255,0.4)">Số tiền cần thanh toán</Text>
                <Text fontSize="3xl" fontWeight="black" color="#ffd700" css={{ textShadow: '0 0 20px rgba(255,215,0,0.4)' }}>
                  {formatCurrency(pendingTxn.amount)}
                </Text>
              </Box>

              {/* QR image */}
              <Flex justify="center">
                <Box
                  p={3}
                  borderRadius="2xl"
                  bg="white"
                  boxShadow="0 0 40px rgba(168,85,247,0.3)"
                >
                  <img src={qrUrl} alt="VietQR" style={{ width: '240px', height: '240px', display: 'block' }} />
                </Box>
              </Flex>

              {/* Transaction info */}
              <VStack align="stretch" gap={2}>
                <Box p={3} borderRadius="lg" bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)">
                  <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                    <VStack align="start" gap={0.5}>
                      <Text fontSize="2xs" color="rgba(255,255,255,0.4)">Mã giao dịch (nội dung CK)</Text>
                      <Text fontSize="sm" fontWeight="bold" color="#06b6d4" fontFamily="mono">{pendingTxn.transaction_code}</Text>
                    </VStack>
                    <Button size="xs" variant="outline" borderColor="rgba(139,92,246,0.3)" color="white" _hover={{ bg: 'rgba(139,92,246,0.1)' }} onClick={() => handleCopy(pendingTxn.transaction_code)}>
                      <LuCopy size={12} /> Sao chép
                    </Button>
                  </Flex>
                </Box>

                {settings && (
                  <Box p={3} borderRadius="lg" bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)">
                    <VStack align="start" gap={1}>
                      <HStack gap={2}>
                        <Text fontSize="2xs" color="rgba(255,255,255,0.4)">Ngân hàng:</Text>
                        <Text fontSize="xs" fontWeight="bold" color="white">{settings.bank_name}</Text>
                      </HStack>
                      <HStack gap={2} justify="space-between" w="full">
                        <HStack gap={2}>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.4)">STK:</Text>
                          <Text fontSize="xs" fontWeight="bold" color="white" fontFamily="mono">{settings.bank_account}</Text>
                        </HStack>
                        <Button size="xs" variant="ghost" color="#a855f7" onClick={() => handleCopy(settings.bank_account)}>
                          <LuCopy size={11} />
                        </Button>
                      </HStack>
                    </VStack>
                  </Box>
                )}
              </VStack>

              <Box p={3} borderRadius="lg" bg="rgba(168,85,247,0.08)" border="1px solid rgba(168,85,247,0.2)">
                <HStack gap={2} wrap="wrap">
                  <LuClock size={14} color="#a855f7" />
                  <Text fontSize="xs" color="rgba(255,255,255,0.7)">
                    Hệ thống tự động kiểm tra trạng thái mỗi 5 giây. Vui lòng chuyển khoản đúng nội dung để được cộng tiền tự động.
                  </Text>
                </HStack>
              </Box>

              <Button variant="outline" borderColor="rgba(239,68,68,0.3)" color="#ef4444" _hover={{ bg: 'rgba(239,68,68,0.1)' }} onClick={handleCancel}>
                Hủy giao dịch
              </Button>
            </VStack>
          </GlassCard>
        ) : (
          /* Amount selection + generate QR */
          <>
            <GlassCard p={6} mb={6} rgbBorder>
              <VStack align="stretch" gap={5}>
                <HStack gap={2}>
                  <LuCircleDollarSign size={20} color="#a855f7" />
                  <Text fontSize="lg" fontWeight="black" color="white">Chọn Số Tiền Nạp</Text>
                </HStack>

                <Separator />

                {/* Preset amounts */}
                <Grid templateColumns={{ base: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)' }} gap={2}>
                  {PRESET_AMOUNTS.map((p) => (
                    <Button
                      key={p.value}
                      h={12}
                      variant={amount === p.value && !customAmount ? 'solid' : 'outline'}
                      bg={amount === p.value && !customAmount ? 'linear-gradient(135deg,#7c3aed,#3b82f6)' : 'transparent'}
                      borderColor="rgba(139,92,246,0.3)"
                      color="white"
                      fontWeight="bold"
                      borderRadius="xl"
                      _hover={{ bg: amount === p.value && !customAmount ? 'linear-gradient(135deg,#7c3aed,#3b82f6)' : 'rgba(139,92,246,0.1)' }}
                      onClick={() => { setAmount(p.value); setCustomAmount('') }}
                    >
                      {p.label}
                    </Button>
                  ))}
                </Grid>

                {/* Custom amount */}
                <VStack align="stretch" gap={2}>
                  <Text fontSize="xs" color="rgba(255,255,255,0.5)">Hoặc nhập số tiền khác (tối thiểu 10.000đ)</Text>
                  <HStack gap={2}>
                    <Input
                      value={customAmount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, '')
                        setCustomAmount(v)
                      }}
                      placeholder="Nhập số tiền..."
                      h={12}
                      bg="rgba(15,10,30,0.5)"
                      border="1px solid rgba(139,92,246,0.2)"
                      borderRadius="xl"
                      color="white"
                      fontSize="lg"
                      fontWeight="bold"
                      inputMode="numeric"
                      _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
                      _focus={{ border: '1px solid rgba(168,85,247,0.6)' }}
                    />
                    <Text fontSize="sm" color="rgba(255,255,255,0.5)" whiteSpace="nowrap">VNĐ</Text>
                  </HStack>
                </VStack>

                {/* Selected amount summary */}
                <Box p={4} borderRadius="xl" bg="rgba(168,85,247,0.08)" border="1px solid rgba(168,85,247,0.2)">
                  <Flex justify="space-between" align="center">
                    <Text fontSize="sm" color="rgba(255,255,255,0.6)">Tổng tiền nạp</Text>
                    <Text fontSize="2xl" fontWeight="black" color="#ffd700">{formatCurrency(finalAmount)}</Text>
                  </Flex>
                </Box>

                <Button
                  h={12}
                  bg="linear-gradient(135deg,#7c3aed,#3b82f6)"
                  color="white"
                  fontSize="md"
                  fontWeight="bold"
                  borderRadius="xl"
                  boxShadow="0 8px 24px rgba(124,58,237,0.4)"
                  _hover={{ opacity: 0.9, transform: 'translateY(-2px)' }}
                  _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                  loading={creating}
                  disabled={finalAmount < 10000 || !settings}
                  onClick={handleCreateQR}
                >
                  <LuQrCode size={18} /> Tạo Mã QR Thanh Toán
                </Button>

                {!settings && (
                  <Text fontSize="xs" color="#ef4444" textAlign="center">
                    Chưa cấu hình thông tin ngân hàng. Vui lòng liên hệ quản trị.
                  </Text>
                )}
              </VStack>
            </GlassCard>

            {/* Rank progress */}
            <Box mb={6}>
              <RankProgressBar profile={profile} />
            </Box>

            {/* Recent deposits */}
            <GlassCard p={5}>
              <HStack gap={2} mb={3}>
                <LuArrowDownToLine size={18} color="#a855f7" />
                <Text fontSize="md" fontWeight="bold" color="white">Lịch Sử Nạp Gần Đây</Text>
              </HStack>
              <Separator mb={3} />
              {loadingRecent ? (
                <Flex justify="center" py={4}><Spinner color="#a855f7" size="sm" /></Flex>
              ) : recentDeposits.length === 0 ? (
                <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" py={4}>
                  Chưa có giao dịch nạp tiền nào
                </Text>
              ) : (
                <VStack align="stretch" gap={2}>
                  {recentDeposits.map((d) => (
                    <Box
                      key={d.id}
                      p={3}
                      borderRadius="lg"
                      bg="rgba(15,10,30,0.4)"
                      border="1px solid rgba(139,92,246,0.12)"
                    >
                      <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
                        <VStack align="start" gap={0.5}>
                          <HStack gap={2}>
                            <Text fontSize="sm" fontWeight="bold" color="#06b6d4" fontFamily="mono">{d.transaction_code}</Text>
                            <Badge color={STATUS_BADGE[d.status] ?? 'gold'}>
                              {STATUS_LABEL[d.status] ?? d.status}
                            </Badge>
                          </HStack>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.3)">{formatDate(d.created_at)}</Text>
                        </VStack>
                        <Text fontSize="md" fontWeight="black" color={d.status === 'completed' ? '#10b981' : 'rgba(255,255,255,0.7)'}>
                          {d.status === 'completed' ? '+' : ''}{formatCurrency(d.amount)}
                        </Text>
                      </Flex>
                    </Box>
                  ))}
                </VStack>
              )}
            </GlassCard>
          </>
        )}

        <Toaster />
      </Box>
    </motion.div>
  )
}
