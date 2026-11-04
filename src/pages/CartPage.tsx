import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, Flex, Grid, HStack, VStack, Text, Button, Input, Separator } from '@chakra-ui/react'
import { LuShoppingCart, LuTrash2, LuArrowLeft, LuArrowRight, LuZap, LuCheck, LuShield, LuPackage, LuGamepad2, LuCircleCheck } from 'react-icons/lu'
import { supabase, formatCurrency, generateOrderCode, generateTransactionCode, type Product, type DiscountCode, type ProductInventory } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { GlassCard, Badge } from '../components/GlassCard'
import { pageVariants, pageTransition } from '../components/AnimatedBackground'
import { Toaster, toaster } from '../components/ui/toaster'
import { EmptyState } from '../components/ui/empty-state'

interface DeliveredOrder {
  orderCode: string
  productName: string
  items: string[]
}

export default function CartPage() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { items, removeFromCart, updateQuantity, clearCart, totalPrice, totalItems } = useCart()

  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCode | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [delivered, setDelivered] = useState<DeliveredOrder[] | null>(null)

  const discountAmount = appliedCoupon
    ? appliedCoupon.type === 'percent'
      ? Math.round(totalPrice * (appliedCoupon.value / 100))
      : Math.min(appliedCoupon.value, totalPrice)
    : 0
  const finalTotal = Math.max(0, totalPrice - discountAmount)
  const balanceSufficient = profile ? profile.balance >= finalTotal : false

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponError(null)

    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) {
      setAppliedCoupon(null)
      setCouponError('Mã giảm giá không hợp lệ hoặc không tồn tại')
      return
    }

    const coupon = data as DiscountCode
    const now = new Date()
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      setAppliedCoupon(null)
      setCouponError('Mã giảm giá đã hết hạn')
      return
    }
    if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
      setAppliedCoupon(null)
      setCouponError('Mã giảm giá đã được sử dụng hết')
      return
    }
    if (totalPrice < coupon.min_order) {
      setAppliedCoupon(null)
      setCouponError(`Đơn hàng tối thiểu ${formatCurrency(coupon.min_order)} để dùng mã này`)
      return
    }

    setAppliedCoupon(coupon)
    setCouponError(null)
    toaster.create({ type: 'success', title: 'Áp dụng mã thành công', description: `Mã ${coupon.code} đã được áp dụng` })
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError(null)
  }

  const handleCheckout = async () => {
    if (!user || !profile) {
      toaster.create({ type: 'info', title: 'Vui lòng đăng nhập', description: 'Bạn cần đăng nhập để thanh toán' })
      navigate('/login')
      return
    }
    if (items.length === 0) return
    if (profile.is_banned) {
      toaster.create({ type: 'error', title: 'Tài khoản đã bị khóa', description: 'Vui lòng liên hệ hỗ trợ' })
      return
    }
    if (!balanceSufficient) {
      toaster.create({
        type: 'error',
        title: 'Số dư không đủ',
        description: `Cần ${formatCurrency(finalTotal)}, bạn đang có ${formatCurrency(profile.balance)}`,
      })
      return
    }

    setCheckingOut(true)
    try {
      const balanceBefore = profile.balance
      const balanceAfter = balanceBefore - finalTotal
      const txnCode = generateTransactionCode()
      const deliveredOrders: DeliveredOrder[] = []
      let perItemDiscount = 0
      if (appliedCoupon && discountAmount > 0) {
        perItemDiscount = Math.round(discountAmount / items.length)
      }

      // Process each cart item: create order, mark inventory sold, update product stats
      for (const item of items) {
        const itemDiscount = appliedCoupon ? Math.min(perItemDiscount, item.product.price * item.quantity) : 0
        const itemTotal = item.product.price * item.quantity - itemDiscount
        const orderCode = generateOrderCode()

        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert({
            order_code: orderCode,
            user_id: user.id,
            product_id: item.product.id,
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.price,
            total_price: itemTotal,
            discount_amount: itemDiscount,
            status: 'completed',
            delivery_data: [],
            notes: appliedCoupon ? `Coupon: ${appliedCoupon.code}` : null,
          })
          .select()
          .single()

        if (orderErr || !order) {
          throw new Error(`Không thể tạo đơn hàng cho ${item.product.name}: ${orderErr?.message ?? 'lỗi không xác định'}`)
        }

        // Mark inventory sold for account-type products
        const deliveredItems: string[] = []
        if (item.product.type === 'acc' || item.product.type === 'random_acc' || item.product.type === 'file') {
          const { data: inv } = await supabase
            .from('product_inventory')
            .select('*')
            .eq('product_id', item.product.id)
            .eq('is_sold', false)
            .order('created_at', { ascending: true })
            .limit(item.quantity)

          if (inv && inv.length > 0) {
            for (const invRow of inv as ProductInventory[]) {
              await supabase
                .from('product_inventory')
                .update({ is_sold: true, sold_at: new Date().toISOString(), sold_to: user.id, order_id: order.id })
                .eq('id', invRow.id)
              deliveredItems.push(invRow.content)
            }
          }
        }

        deliveredOrders.push({ orderCode, productName: item.product.name, items: deliveredItems })

        // Update product sold_count and stock
        if (item.product.stock !== -1) {
          await supabase
            .from('products')
            .update({
              sold_count: item.product.sold_count + item.quantity,
              stock: Math.max(0, item.product.stock - item.quantity),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.product.id)
        } else {
          await supabase
            .from('products')
            .update({ sold_count: item.product.sold_count + item.quantity, updated_at: new Date().toISOString() })
            .eq('id', item.product.id)
        }
      }

      // Deduct balance + update totals
      await supabase
        .from('profiles')
        .update({
          balance: balanceAfter,
          total_spent: profile.total_spent + finalTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      // Create wallet transaction
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'purchase',
        amount: -finalTotal,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_id: txnCode,
        description: `Thanh toán ${items.length} đơn hàng - ${txnCode}`,
      })

      // Update coupon usage
      if (appliedCoupon) {
        await supabase
          .from('discount_codes')
          .update({ used_count: appliedCoupon.used_count + 1 })
          .eq('id', appliedCoupon.id)
      }

      await refreshProfile()
      clearCart()
      setDelivered(deliveredOrders)
      setAppliedCoupon(null)
      setCouponInput('')
      setCouponError(null)
      toaster.create({
        type: 'success',
        title: 'Thanh toán thành công!',
        description: `Đã tạo ${deliveredOrders.length} đơn hàng`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi thanh toán'
      toaster.create({ type: 'error', title: 'Thanh toán thất bại', description: message })
    } finally {
      setCheckingOut(false)
    }
  }

  /* --- Order confirmation screen --- */
  if (delivered) {
    return (
      <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
        <Box pt="100px" pb={16} maxW="900px" mx="auto" px={{ base: 4, md: 6 }}>
          <GlassCard p={8} glow="green" rgbBorder>
            <VStack align="stretch" gap={5}>
              <VStack gap={3} textAlign="center">
                <Box p={5} borderRadius="full" bg="rgba(16,185,129,0.12)" border="2px solid rgba(16,185,129,0.4)" css={{ animation: 'glow-pulse 2s ease-in-out infinite' }}>
                  <LuCircleCheck size={56} color="#10b981" />
                </Box>
                <Text fontSize="2xl" fontWeight="black" color="#10b981">Đặt Hàng Thành Công!</Text>
                <Text fontSize="sm" color="rgba(255,255,255,0.6)">
                  Cảm ơn bạn đã mua hàng. Thông tin giao hàng chi tiết bên dưới.
                </Text>
              </VStack>

              <Separator />

              {delivered.map((d, idx) => (
                <Box key={idx} p={4} borderRadius="xl" bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)">
                  <HStack justify="space-between" align="start" mb={2} wrap="wrap" gap={2}>
                    <VStack align="start" gap={1}>
                      <Text fontSize="sm" fontWeight="bold" color="white">{d.productName}</Text>
                      <HStack gap={2}>
                        <Text fontSize="xs" color="rgba(255,255,255,0.4)">Mã ĐH:</Text>
                        <Text fontSize="sm" fontWeight="bold" color="#06b6d4" fontFamily="mono">{d.orderCode}</Text>
                      </HStack>
                    </VStack>
                    <Badge color="green"><LuCheck size={10} /> Hoàn thành</Badge>
                  </HStack>
                  {d.items.length > 0 ? (
                    <VStack align="stretch" gap={1} mt={2}>
                      <Text fontSize="xs" color="rgba(255,255,255,0.4)">Thông tin giao hàng:</Text>
                      {d.items.map((item, i) => (
                        <Box
                          key={i}
                          p={2}
                          borderRadius="md"
                          bg="rgba(16,185,129,0.06)"
                          border="1px solid rgba(16,185,129,0.25)"
                          fontFamily="mono"
                          fontSize="xs"
                          color="white"
                          wordBreak="break-all"
                          whiteSpace="pre-wrap"
                        >
                          {item}
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text fontSize="xs" color="rgba(255,255,255,0.5)" mt={2}>
                      Đơn hàng đã được ghi nhận. Vui lòng liên hệ hỗ trợ để nhận sản phẩm.
                    </Text>
                  )}
                </Box>
              ))}

              <Text fontSize="xs" color="rgba(255,255,255,0.4)" textAlign="center">
                Hãy lưu lại thông tin này. Bạn cũng có thể xem lại trong Lịch sử mua hàng.
              </Text>

              <HStack gap={3} justify="center" wrap="wrap">
                <Link to="/profile?tab=orders">
                  <Button variant="outline" borderColor="rgba(139,92,246,0.3)" color="white" _hover={{ bg: 'rgba(139,92,246,0.1)' }} borderRadius="xl">
                    <LuPackage size={14} /> Xem Lịch Sử
                  </Button>
                </Link>
                <Link to="/products">
                  <Button bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" _hover={{ opacity: 0.9 }} borderRadius="xl">
                    <LuArrowRight size={14} /> Tiếp Tục Mua Sắm
                  </Button>
                </Link>
              </HStack>
            </VStack>
          </GlassCard>
          <Toaster />
        </Box>
      </motion.div>
    )
  }

  /* --- Empty cart --- */
  if (items.length === 0) {
    return (
      <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
        <Box pt="100px" pb={16} maxW="1400px" mx="auto" px={{ base: 4, md: 6 }}>
          <GlassCard p={10} minH="50vh" display="flex" alignItems="center" justifyContent="center">
            <EmptyState
              title="Giỏ Hàng Trống"
              description="Bạn chưa có sản phẩm nào trong giỏ hàng. Khám phá ngay các sản phẩm hấp dẫn của chúng tôi!"
              icon={<LuShoppingCart size={48} color="#a855f7" />}
            >
              <HStack gap={3} justify="center" mt={4}>
                <Link to="/products">
                  <Button bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" _hover={{ opacity: 0.9 }} borderRadius="xl">
                    <LuArrowRight size={14} /> Khám Phá Sản Phẩm
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="outline" borderColor="rgba(139,92,246,0.3)" color="white" _hover={{ bg: 'rgba(139,92,246,0.1)' }} borderRadius="xl">
                    <LuArrowLeft size={14} /> Về Trang Chủ
                  </Button>
                </Link>
              </HStack>
            </EmptyState>
          </GlassCard>
          <Toaster />
        </Box>
      </motion.div>
    )
  }

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
      <Box pt="100px" pb={16} maxW="1400px" mx="auto" px={{ base: 4, md: 6 }}>
        {/* Header */}
        <HStack justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
          <HStack gap={2}>
            <LuShoppingCart size={24} color="#a855f7" />
            <Text fontSize="2xl" fontWeight="black" color="white">Giỏ Hàng</Text>
            <Badge color="purple">{totalItems} sản phẩm</Badge>
          </HStack>
          <Link to="/products">
            <Button size="sm" variant="outline" borderColor="rgba(139,92,246,0.3)" color="white" _hover={{ bg: 'rgba(139,92,246,0.1)' }}>
              <LuArrowLeft size={14} /> Tiếp Tục Mua
            </Button>
          </Link>
        </HStack>

        <Grid templateColumns={{ base: '1fr', lg: '1fr 380px' }} gap={6}>
          {/* Left: cart items */}
          <VStack align="stretch" gap={3}>
            {items.map((item) => {
              const image = item.product.images && item.product.images.length > 0 ? item.product.images[0] : null
              const subtotal = item.product.price * item.quantity
              const inStock = item.product.stock === -1 || item.product.stock > 0
              return (
                <GlassCard key={item.product.id} p={4} hover>
                  <Flex gap={{ base: 3, md: 4 }} align="center" wrap={{ base: 'wrap', md: 'nowrap' }}>
                    {/* Image */}
                    <Box
                      flexShrink={0}
                      w={{ base: '70px', md: '90px' }}
                      h={{ base: '70px', md: '90px' }}
                      borderRadius="xl"
                      overflow="hidden"
                      bg={image ? 'transparent' : 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(59,130,246,0.25), rgba(6,182,212,0.25))'}
                    >
                      {image ? (
                        <img src={image} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <Flex w="full" h="full" align="center" justify="center">
                          <LuPackage size={28} color="rgba(255,255,255,0.3)" />
                        </Flex>
                      )}
                    </Box>

                    {/* Info */}
                    <VStack align="start" gap={1} flex={1} minW="0">
                      <HStack gap={2} wrap="wrap">
                        <Badge color="purple"><LuGamepad2 size={10} /> {item.product.type}</Badge>
                        {!inStock && <Badge color="red">Hết hàng</Badge>}
                      </HStack>
                      <Text fontSize="sm" fontWeight="bold" color="white" lineClamp={2}>{item.product.name}</Text>
                      <Text fontSize="sm" fontWeight="black" color="#ffd700">{formatCurrency(item.product.price)}</Text>
                    </VStack>

                    {/* Quantity */}
                    <HStack gap={1} flexShrink={0}>
                      <Button
                        size="xs"
                        variant="outline"
                        borderColor="rgba(139,92,246,0.3)"
                        color="white"
                        _hover={{ bg: 'rgba(139,92,246,0.1)' }}
                        w={7}
                        h={7}
                        p={0}
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        −
                      </Button>
                      <Text fontSize="sm" fontWeight="bold" color="white" minW="28px" textAlign="center" fontFamily="mono">
                        {item.quantity}
                      </Text>
                      <Button
                        size="xs"
                        variant="outline"
                        borderColor="rgba(139,92,246,0.3)"
                        color="white"
                        _hover={{ bg: 'rgba(139,92,246,0.1)' }}
                        w={7}
                        h={7}
                        p={0}
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </HStack>

                    {/* Subtotal */}
                    <VStack align="end" gap={1} flexShrink={0} minW="90px">
                      <Text fontSize="md" fontWeight="black" color="#06b6d4">{formatCurrency(subtotal)}</Text>
                      <Button
                        size="xs"
                        variant="ghost"
                        color="#ef4444"
                        _hover={{ bg: 'rgba(239,68,68,0.1)' }}
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <LuTrash2 size={12} /> Xóa
                      </Button>
                    </VStack>
                  </Flex>
                </GlassCard>
              )
            })}

            <Button
              size="sm"
              variant="ghost"
              color="rgba(255,255,255,0.5)"
              _hover={{ color: '#ef4444', bg: 'rgba(239,68,68,0.08)' }}
              alignSelf="start"
              onClick={() => {
                clearCart()
                setAppliedCoupon(null)
                setCouponInput('')
                toaster.create({ type: 'info', title: 'Đã xóa toàn bộ giỏ hàng' })
              }}
            >
              <LuTrash2 size={14} /> Xóa Tất Cả
            </Button>
          </VStack>

          {/* Right: checkout summary */}
          <Box position={{ lg: 'sticky' }} top="100px">
            <GlassCard p={5} rgbBorder>
              <VStack align="stretch" gap={4}>
                <HStack gap={2}>
                  <LuZap size={18} color="#a855f7" />
                  <Text fontSize="lg" fontWeight="black" color="white">Thanh Toán</Text>
                </HStack>

                <Separator />

                {/* Coupon */}
                <VStack align="stretch" gap={2}>
                  {appliedCoupon ? (
                    <HStack justify="space-between" px={3} py={2} borderRadius="lg" bg="rgba(16,185,129,0.1)" border="1px solid rgba(16,185,129,0.3)">
                      <HStack gap={2}>
                        <LuCheck size={14} color="#10b981" />
                        <Text fontSize="sm" fontWeight="bold" color="#10b981">{appliedCoupon.code}</Text>
                        <Text fontSize="xs" color="rgba(255,255,255,0.5)">
                          {appliedCoupon.type === 'percent' ? `-${appliedCoupon.value}%` : `-${formatCurrency(appliedCoupon.value)}`}
                        </Text>
                      </HStack>
                      <Button size="xs" variant="ghost" color="#ef4444" onClick={removeCoupon}>Gỡ</Button>
                    </HStack>
                  ) : (
                    <HStack gap={2}>
                      <Input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Mã giảm giá..."
                        h={9}
                        bg="rgba(15,10,30,0.5)"
                        border="1px solid rgba(139,92,246,0.2)"
                        borderRadius="xl"
                        color="white"
                        textTransform="uppercase"
                        _placeholder={{ color: 'rgba(255,255,255,0.3)', textTransform: 'none' }}
                        _focus={{ border: '1px solid rgba(168,85,247,0.6)' }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }}
                      />
                      <Button size="sm" h={9} variant="outline" borderColor="rgba(139,92,246,0.3)" color="white" _hover={{ bg: 'rgba(139,92,246,0.1)' }} onClick={applyCoupon}>
                        Áp dụng
                      </Button>
                    </HStack>
                  )}
                  {couponError && <Text fontSize="xs" color="#ef4444">{couponError}</Text>}
                </VStack>

                <Separator />

                {/* Summary */}
                <VStack align="stretch" gap={2}>
                  <Flex justify="space-between">
                    <Text fontSize="sm" color="rgba(255,255,255,0.6)">Tạm tính ({totalItems} SP)</Text>
                    <Text fontSize="sm" color="white">{formatCurrency(totalPrice)}</Text>
                  </Flex>
                  {discountAmount > 0 && (
                    <Flex justify="space-between">
                      <Text fontSize="sm" color="#10b981">Giảm giá</Text>
                      <Text fontSize="sm" color="#10b981">-{formatCurrency(discountAmount)}</Text>
                    </Flex>
                  )}
                  <Flex justify="space-between" align="baseline">
                    <Text fontSize="sm" color="rgba(255,255,255,0.6)">Số dư ví</Text>
                    <Text fontSize="sm" fontWeight="bold" color={balanceSufficient ? '#06b6d4' : '#ef4444'}>
                      {profile ? formatCurrency(profile.balance) : '—'}
                    </Text>
                  </Flex>
                </VStack>

                <Separator />

                {/* Total */}
                <Flex justify="space-between" align="baseline">
                  <Text fontSize="md" fontWeight="bold" color="white">Tổng cộng</Text>
                  <Text
                    fontSize="2xl"
                    fontWeight="black"
                    css={{
                      background: 'linear-gradient(90deg, #ffd700, #ffa500, #ffd700)',
                      backgroundSize: '200% auto',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animation: 'shimmer 3s linear infinite',
                    }}
                  >
                    {formatCurrency(finalTotal)}
                  </Text>
                </Flex>

                {/* Balance warning */}
                {profile && !balanceSufficient && (
                  <Box p={3} borderRadius="lg" bg="rgba(239,68,68,0.08)" border="1px solid rgba(239,68,68,0.25)">
                    <Text fontSize="xs" color="#ef4444">
                      Số dư không đủ. Cần thêm {formatCurrency(finalTotal - profile.balance)} để thanh toán.
                    </Text>
                    <Link to="/deposit">
                      <Button mt={2} size="xs" w="full" variant="outline" borderColor="rgba(239,68,68,0.3)" color="#ef4444" _hover={{ bg: 'rgba(239,68,68,0.1)' }}>
                        Nạp Tiền Ngay
                      </Button>
                    </Link>
                  </Box>
                )}

                {/* Checkout button */}
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
                  loading={checkingOut}
                  disabled={!profile || !balanceSufficient}
                  onClick={handleCheckout}
                >
                  <LuZap size={18} /> Thanh Toán Ngay
                </Button>

                {!user && (
                  <Text fontSize="xs" color="#a855f7" textAlign="center">
                    <Link to="/login" style={{ textDecoration: 'underline' }}>Đăng nhập</Link> để thanh toán
                  </Text>
                )}

                {/* Trust badges */}
                <Box mt={2}>
                  <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                    <VStack gap={1}>
                      <Box p={2} borderRadius="lg" bg="rgba(16,185,129,0.1)" border="1px solid rgba(16,185,129,0.2)">
                        <LuZap size={16} color="#10b981" />
                      </Box>
                      <Text fontSize="2xs" color="rgba(255,255,255,0.5)" textAlign="center">Giao tự động</Text>
                    </VStack>
                    <VStack gap={1}>
                      <Box p={2} borderRadius="lg" bg="rgba(59,130,246,0.1)" border="1px solid rgba(59,130,246,0.2)">
                        <LuShield size={16} color="#3b82f6" />
                      </Box>
                      <Text fontSize="2xs" color="rgba(255,255,255,0.5)" textAlign="center">Bảo mật</Text>
                    </VStack>
                    <VStack gap={1}>
                      <Box p={2} borderRadius="lg" bg="rgba(255,215,0,0.1)" border="1px solid rgba(255,215,0,0.2)">
                        <LuCheck size={16} color="#ffd700" />
                      </Box>
                      <Text fontSize="2xs" color="rgba(255,255,255,0.5)" textAlign="center">Bảo hành</Text>
                    </VStack>
                  </Grid>
                </Box>
              </VStack>
            </GlassCard>
          </Box>
        </Grid>

        <Toaster />
      </Box>
    </motion.div>
  )
}
