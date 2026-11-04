import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, Flex, Grid, HStack, VStack, Text, Button, Input, Spinner, Separator } from '@chakra-ui/react'
import { LuGamepad2, LuShoppingCart, LuPackage, LuCheck, LuFlame, LuStar, LuShield, LuZap, LuTag, LuArrowLeft } from 'react-icons/lu'
import {
  supabase,
  formatCurrency,
  generateOrderCode,
  generateTransactionCode,
  formatDate,
  type Product,
  type ProductReview,
  type ProductInventory,
  type DiscountCode,
} from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { GlassCard, Badge, NeonText } from '../components/GlassCard'
import { AccyUsername } from '../components/AccyUsername'
import { pageVariants, pageTransition } from '../components/AnimatedBackground'
import { Toaster, toaster } from '../components/ui/toaster'

const TYPE_LABELS: Record<Product['type'], string> = {
  acc: 'Tài Khoản',
  random_acc: 'Random Acc',
  file: 'File',
  tool: 'Công Cụ',
  item: 'Vật Phẩm',
  service: 'Dịch Vụ',
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <HStack gap={0.5}>
      {[1, 2, 3, 4, 5].map((i) => (
        <LuStar
          key={i}
          size={size}
          color={i <= rating ? '#ffd700' : 'rgba(255,255,255,0.2)'}
          fill={i <= rating ? '#ffd700' : 'transparent'}
        />
      ))}
    </HStack>
  )
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { addToCart } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [category, setCategory] = useState<{ name: string } | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)

  // Coupon state
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCode | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)

  // Delivered order result
  const [delivered, setDelivered] = useState<{ orderCode: string; items: string[] } | null>(null)

  const onSale = product?.original_price != null && product.original_price > product.price
  const inStock = product ? product.stock === -1 || product.stock > 0 : false

  const discountedPrice = useMemo(() => {
    if (!product) return 0
    if (!appliedCoupon) return product.price
    if (appliedCoupon.type === 'percent') {
      return Math.max(0, Math.round(product.price * (1 - appliedCoupon.value / 100)))
    }
    return Math.max(0, product.price - appliedCoupon.value)
  }, [product, appliedCoupon])

  const discountAmount = product ? product.price - discountedPrice : 0

  // Load product + related + reviews
  useEffect(() => {
    if (!slug) return
    let active = true
    setLoading(true)
    setProduct(null)
    setRelated([])
    setReviews([])
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError(null)
    setDelivered(null)

    const run = async () => {
      const { data: prod } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()

      if (!active) return
      const p = prod as Product | null
      setProduct(p)
      setLoading(false)

      if (!p) return

      // Category
      if (p.category_id) {
        const { data: cat } = await supabase
          .from('categories')
          .select('name')
          .eq('id', p.category_id)
          .maybeSingle()
        if (active) setCategory((cat as { name: string } | null) ?? null)
      }

      // Related (same category, exclude self)
      const { data: rel } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('category_id', p.category_id)
        .neq('id', p.id)
        .order('sold_count', { ascending: false })
        .limit(4)
      if (active) setRelated((rel ?? []) as Product[])

      // Reviews with profiles join
      const { data: revs } = await supabase
        .from('product_reviews')
        .select('*, profiles:profiles(username, customer_id, rank)')
        .eq('product_id', p.id)
        .order('created_at', { ascending: false })
      if (active) setReviews((revs ?? []) as ProductReview[])
    }

    run()
    return () => {
      active = false
    }
  }, [slug])

  const applyCoupon = async () => {
    if (!product) return
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
    if (product.price < coupon.min_order) {
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

  const handleAddToCart = () => {
    if (!product) return
    if (!inStock) {
      toaster.create({ type: 'error', title: 'Sản phẩm đã hết hàng' })
      return
    }
    addToCart(product, 1)
    toaster.create({ type: 'success', title: 'Đã thêm vào giỏ hàng', description: product.name })
  }

  const handleBuyNow = async () => {
    if (!product) return
    if (!inStock) {
      toaster.create({ type: 'error', title: 'Sản phẩm đã hết hàng' })
      return
    }
    if (!user || !profile) {
      toaster.create({ type: 'info', title: 'Vui lòng đăng nhập', description: 'Bạn cần đăng nhập để mua hàng' })
      navigate('/login')
      return
    }
    if (profile.is_banned) {
      toaster.create({ type: 'error', title: 'Tài khoản đã bị khóa', description: 'Vui lòng liên hệ hỗ trợ' })
      return
    }
    if (profile.balance < discountedPrice) {
      toaster.create({
        type: 'error',
        title: 'Số dư không đủ',
        description: `Cần ${formatCurrency(discountedPrice)}, bạn đang có ${formatCurrency(profile.balance)}`,
      })
      return
    }

    setBuying(true)
    try {
      const orderCode = generateOrderCode()
      const txnCode = generateTransactionCode()
      const balanceBefore = profile.balance
      const balanceAfter = balanceBefore - discountedPrice

      // 1. Create the order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_code: orderCode,
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          total_price: discountedPrice,
          discount_amount: discountAmount,
          status: 'completed',
          delivery_data: [],
          notes: appliedCoupon ? `Coupon: ${appliedCoupon.code}` : null,
        })
        .select()
        .single()

      if (orderErr || !order) {
        throw new Error(orderErr?.message ?? 'Không thể tạo đơn hàng')
      }

      // 2. Mark an inventory item sold (for account-type products with stock items)
      const deliveredItems: string[] = []
      if (product.type === 'acc' || product.type === 'random_acc' || product.type === 'file') {
        const { data: inv } = await supabase
          .from('product_inventory')
          .select('*')
          .eq('product_id', product.id)
          .eq('is_sold', false)
          .order('created_at', { ascending: true })
          .limit(1)

        if (inv && inv.length > 0) {
          const invItem = inv[0] as ProductInventory
          await supabase
            .from('product_inventory')
            .update({ is_sold: true, sold_at: new Date().toISOString(), sold_to: user.id, order_id: order.id })
            .eq('id', invItem.id)
          deliveredItems.push(invItem.content)
        }
      }

      // 3. Deduct balance + update totals
      await supabase
        .from('profiles')
        .update({
          balance: balanceAfter,
          total_spent: profile.total_spent + discountedPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      // 4. Create wallet transaction
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: 'purchase',
        amount: -discountedPrice,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_id: order.id,
        description: `Thanh toán đơn hàng ${orderCode} - ${product.name}`,
      })

      // 5. Update product sold_count and stock (skip for unlimited stock = -1)
      if (product.stock !== -1) {
        await supabase
          .from('products')
          .update({
            sold_count: product.sold_count + 1,
            stock: Math.max(0, product.stock - 1),
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id)
      } else {
        await supabase
          .from('products')
          .update({ sold_count: product.sold_count + 1, updated_at: new Date().toISOString() })
          .eq('id', product.id)
      }

      // 6. Update coupon usage
      if (appliedCoupon) {
        await supabase
          .from('discount_codes')
          .update({ used_count: appliedCoupon.used_count + 1 })
          .eq('id', appliedCoupon.id)
      }

      // 7. Refresh profile balance in the header
      await refreshProfile()

      // 8. Show delivery data
      setDelivered({ orderCode, items: deliveredItems })
      toaster.create({
        type: 'success',
        title: 'Mua hàng thành công!',
        description: `Đơn hàng ${orderCode} đã hoàn tất`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi mua hàng'
      toaster.create({ type: 'error', title: 'Mua hàng thất bại', description: message })
    } finally {
      setBuying(false)
    }
  }

  if (loading) {
    return (
      <Box pt="100px" pb={16} maxW="1200px" mx="auto" px={{ base: 4, md: 6 }}>
        <Flex justify="center" align="center" py={20}>
          <VStack gap={3}>
            <Spinner size="xl" color="#a855f7" />
            <Text fontSize="sm" color="rgba(255,255,255,0.4)">
              Đang tải sản phẩm...
            </Text>
          </VStack>
        </Flex>
        <Toaster />
      </Box>
    )
  }

  if (!product) {
    return (
      <Box pt="100px" pb={16} maxW="1200px" mx="auto" px={{ base: 4, md: 6 }}>
        <GlassCard p={10}>
          <VStack gap={4} textAlign="center">
            <LuPackage size={48} color="rgba(255,255,255,0.3)" />
            <Text fontSize="lg" fontWeight="bold" color="white">
              Không tìm thấy sản phẩm
            </Text>
            <Text fontSize="sm" color="rgba(255,255,255,0.5)">
              Sản phẩm có thể đã bị gỡ hoặc không tồn tại.
            </Text>
            <Link to="/products">
              <Button bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" _hover={{ opacity: 0.9 }} borderRadius="xl">
                <LuArrowLeft size={14} /> Quay lại danh sách
              </Button>
            </Link>
          </VStack>
        </GlassCard>
        <Toaster />
      </Box>
    )
  }

  const image = product.images && product.images.length > 0 ? product.images[0] : null

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
      <Box pt="100px" pb={16} maxW="1200px" mx="auto" px={{ base: 4, md: 6 }}>
        {/* Breadcrumb */}
        <HStack mb={4} gap={1} fontSize="sm" color="rgba(255,255,255,0.5)" wrap="wrap">
          <Link to="/">
            <Text _hover={{ color: '#a855f7' }} color="rgba(255,255,255,0.5)">Trang Chủ</Text>
          </Link>
          <Text>/</Text>
          <Link to="/products">
            <Text _hover={{ color: '#a855f7' }} color="rgba(255,255,255,0.5)">Sản Phẩm</Text>
          </Link>
          {category && (
            <>
              <Text>/</Text>
              <Text color="rgba(255,255,255,0.4)">{category.name}</Text>
            </>
          )}
        </HStack>

        {/* Back link */}
        <Link to="/products">
          <HStack gap={1} mb={4} _hover={{ color: '#a855f7' }} color="rgba(255,255,255,0.6)" transition="all 0.2s">
            <LuArrowLeft size={14} />
            <Text fontSize="sm">Quay lại sản phẩm</Text>
          </HStack>
        </Link>

        <Grid templateColumns={{ base: '1fr', md: '1fr 1.2fr' }} gap={6}>
          {/* Left: Image */}
          <Box>
            <GlassCard p={0} overflow="hidden">
              <Box
                position="relative"
                h={{ base: '280px', md: '380px' }}
                bg={image ? 'transparent' : 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(59,130,246,0.25), rgba(6,182,212,0.25))'}
                overflow="hidden"
              >
                {image ? (
                  <img src={image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <Flex h="full" align="center" justify="center">
                    <LuPackage size={64} color="rgba(255,255,255,0.25)" />
                  </Flex>
                )}

                <HStack position="absolute" top={3} left={3} gap={1}>
                  {product.sold_count >= 10 && (
                    <Badge color="red">
                      <LuFlame size={11} /> HOT
                    </Badge>
                  )}
                  {product.is_new && (
                    <Badge color="cyan">
                      <LuStar size={11} /> NEW
                    </Badge>
                  )}
                  {onSale && <Badge color="gold">SALE</Badge>}
                </HStack>

                <Box position="absolute" top={3} right={3}>
                  <Badge color={inStock ? 'green' : 'red'}>
                    {inStock ? `Còn ${product.stock === -1 ? '∞' : product.stock}` : 'Hết Hàng'}
                  </Badge>
                </Box>
              </Box>
            </GlassCard>
          </Box>

          {/* Right: Info */}
          <VStack align="stretch" gap={4}>
            <VStack align="stretch" gap={2}>
              <HStack gap={2} wrap="wrap">
                <Badge color="purple">
                  <LuGamepad2 size={11} /> {TYPE_LABELS[product.type]}
                </Badge>
                {category && <Badge color="blue">{category.name}</Badge>}
              </HStack>

              <Text fontSize="2xl" fontWeight="black" color="white" lineHeight="1.2">
                {product.name}
              </Text>

              {product.short_description && (
                <Text fontSize="sm" color="rgba(255,255,255,0.6)">
                  {product.short_description}
                </Text>
              )}
            </VStack>

            <Separator />

            {/* Price */}
            <GlassCard p={4} glow="gold">
              <VStack align="stretch" gap={1}>
                <HStack align="baseline" gap={3} wrap="wrap">
                  <Text
                    fontSize="3xl"
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
                    {formatCurrency(discountedPrice)}
                  </Text>
                  {onSale && (
                    <Text fontSize="lg" color="rgba(255,255,255,0.35)" textDecoration="line-through">
                      {formatCurrency(product.original_price as number)}
                    </Text>
                  )}
                  {appliedCoupon && discountAmount > 0 && (
                    <Badge color="green">
                      <LuTag size={10} /> -{formatCurrency(discountAmount)}
                    </Badge>
                  )}
                </HStack>
                {onSale && (
                  <Text fontSize="xs" color="#ffd700">
                    Tiết kiệm {formatCurrency((product.original_price as number) - product.price)}
                  </Text>
                )}
              </VStack>
            </GlassCard>

            {/* Stats */}
            <HStack gap={3} wrap="wrap">
              <GlassCard px={3} py={2} flex={1} minW="120px">
                <HStack gap={2}>
                  <LuFlame size={18} color="#ef4444" />
                  <Box>
                    <Text fontSize="2xs" color="rgba(255,255,255,0.4)">Đã bán</Text>
                    <Text fontSize="sm" fontWeight="bold" color="white">{product.sold_count}</Text>
                  </Box>
                </HStack>
              </GlassCard>
              <GlassCard px={3} py={2} flex={1} minW="120px">
                <HStack gap={2}>
                  <LuPackage size={18} color="#06b6d4" />
                  <Box>
                    <Text fontSize="2xs" color="rgba(255,255,255,0.4)">Kho</Text>
                    <Text fontSize="sm" fontWeight="bold" color="white">
                      {product.stock === -1 ? 'Không giới hạn' : product.stock}
                    </Text>
                  </Box>
                </HStack>
              </GlassCard>
              <GlassCard px={3} py={2} flex={1} minW="120px">
                <HStack gap={2}>
                  {inStock ? <LuCheck size={18} color="#10b981" /> : <LuPackage size={18} color="#ef4444" />}
                  <Box>
                    <Text fontSize="2xs" color="rgba(255,255,255,0.4)">Trạng thái</Text>
                    <Text fontSize="sm" fontWeight="bold" color={inStock ? '#10b981' : '#ef4444'}>
                      {inStock ? 'Còn hàng' : 'Hết hàng'}
                    </Text>
                  </Box>
                </HStack>
              </GlassCard>
            </HStack>

            {/* Coupon input */}
            <GlassCard p={3}>
              <VStack align="stretch" gap={2}>
                <HStack gap={2}>
                  <LuTag size={16} color="#ffd700" />
                  <Text fontSize="sm" fontWeight="bold" color="white">Mã giảm giá</Text>
                </HStack>
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
                      placeholder="Nhập mã giảm giá..."
                      h={9}
                      bg="rgba(15,10,30,0.5)"
                      border="1px solid rgba(139,92,246,0.2)"
                      borderRadius="xl"
                      color="white"
                      textTransform="uppercase"
                      _placeholder={{ color: 'rgba(255,255,255,0.3)', textTransform: 'none' }}
                      _focus={{ border: '1px solid rgba(168,85,247,0.6)' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          applyCoupon()
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      h={9}
                      variant="outline"
                      borderColor="rgba(139,92,246,0.3)"
                      color="white"
                      _hover={{ bg: 'rgba(139,92,246,0.1)' }}
                      onClick={applyCoupon}
                    >
                      Áp dụng
                    </Button>
                  </HStack>
                )}
                {couponError && (
                  <Text fontSize="xs" color="#ef4444">{couponError}</Text>
                )}
              </VStack>
            </GlassCard>

            {/* Buy actions */}
            <HStack gap={3}>
              <Button
                flex={1}
                h={12}
                bg="linear-gradient(135deg,#7c3aed,#3b82f6)"
                color="white"
                fontSize="md"
                fontWeight="bold"
                borderRadius="xl"
                boxShadow="0 8px 24px rgba(124,58,237,0.4)"
                _hover={{ opacity: 0.9, transform: 'translateY(-2px)' }}
                _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                loading={buying}
                onClick={handleBuyNow}
                disabled={!inStock}
              >
                <LuZap size={18} /> Mua Ngay
              </Button>
              <Button
                flex={1}
                h={12}
                variant="outline"
                borderColor="rgba(139,92,246,0.4)"
                color="white"
                fontSize="md"
                fontWeight="bold"
                borderRadius="xl"
                _hover={{ bg: 'rgba(139,92,246,0.1)' }}
                onClick={handleAddToCart}
                disabled={!inStock}
              >
                <LuShoppingCart size={18} /> Thêm Vào Giỏ
              </Button>
            </HStack>

            {/* Trust badges */}
            <HStack gap={4} justify="center" pt={2}>
              <HStack gap={1}>
                <LuShield size={14} color="#10b981" />
                <Text fontSize="xs" color="rgba(255,255,255,0.5)">Bảo hành</Text>
              </HStack>
              <HStack gap={1}>
                <LuCheck size={14} color="#06b6d4" />
                <Text fontSize="xs" color="rgba(255,255,255,0.5)">Giao tự động</Text>
              </HStack>
              <HStack gap={1}>
                <LuStar size={14} color="#ffd700" />
                <Text fontSize="xs" color="rgba(255,255,255,0.5)">Uy tín</Text>
              </HStack>
            </HStack>
          </VStack>
        </Grid>

        {/* Delivery result */}
        {delivered && (
          <GlassCard mt={6} p={5} glow="green">
            <VStack align="stretch" gap={3}>
              <HStack gap={2}>
                <LuCheck size={22} color="#10b981" />
                <Text fontSize="lg" fontWeight="black" color="#10b981">Mua hàng thành công!</Text>
              </HStack>
              <HStack justify="space-between" wrap="wrap">
                <Text fontSize="sm" color="rgba(255,255,255,0.6)">
                  Mã đơn hàng: <Text as="span" fontWeight="bold" color="#06b6d4">{delivered.orderCode}</Text>
                </Text>
                <Link to="/profile?tab=orders">
                  <Text fontSize="sm" color="#a855f7" _hover={{ textDecoration: 'underline' }}>
                    Xem trong lịch sử mua →
                  </Text>
                </Link>
              </HStack>
              <Separator />
              {delivered.items.length > 0 ? (
                <VStack align="stretch" gap={2}>
                  <Text fontSize="sm" fontWeight="bold" color="white">Thông tin giao hàng:</Text>
                  {delivered.items.map((item, idx) => (
                    <Box
                      key={idx}
                      p={3}
                      borderRadius="lg"
                      bg="rgba(16,185,129,0.08)"
                      border="1px solid rgba(16,185,129,0.25)"
                      fontFamily="mono"
                      fontSize="sm"
                      color="white"
                      wordBreak="break-all"
                      whiteSpace="pre-wrap"
                    >
                      {item}
                    </Box>
                  ))}
                  <Text fontSize="xs" color="rgba(255,255,255,0.4)">
                    Hãy lưu lại thông tin này. Bạn cũng có thể xem lại trong Lịch sử mua hàng.
                  </Text>
                </VStack>
              ) : (
                <Text fontSize="sm" color="rgba(255,255,255,0.6)">
                  Đơn hàng đã được ghi nhận. Vui lòng liên hệ hỗ trợ để nhận sản phẩm.
                </Text>
              )}
            </VStack>
          </GlassCard>
        )}

        {/* Description */}
        {product.description && (
          <GlassCard mt={6} p={5}>
            <VStack align="stretch" gap={3}>
              <Text fontSize="lg" fontWeight="bold" color="white">Mô tả sản phẩm</Text>
              <Separator />
              <Box
                fontSize="sm"
                color="rgba(255,255,255,0.7)"
                lineHeight="1.7"
                whiteSpace="pre-wrap"
                css={{ '& h1, & h2, & h3': { fontWeight: 'bold', color: 'white', mt: 3, mb: 1 } }}
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </VStack>
          </GlassCard>
        )}

        {/* Reviews */}
        <GlassCard mt={6} p={5}>
          <VStack align="stretch" gap={3}>
            <HStack justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="bold" color="white">Đánh giá sản phẩm</Text>
              {reviews.length > 0 && (
                <HStack gap={2}>
                  <StarRow rating={Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)} />
                  <Text fontSize="sm" color="rgba(255,255,255,0.6)">
                    {reviews.length} đánh giá
                  </Text>
                </HStack>
              )}
            </HStack>
            <Separator />
            {reviews.length === 0 ? (
              <HStack justify="center" py={6}>
                <Text fontSize="sm" color="rgba(255,255,255,0.4)">Chưa có đánh giá nào cho sản phẩm này</Text>
              </HStack>
            ) : (
              <VStack align="stretch" gap={3}>
                {reviews.map((r) => (
                  <Box key={r.id} p={3} borderRadius="lg" bg="rgba(15,10,30,0.4)" border="1px solid rgba(139,92,246,0.12)">
                    <HStack justify="space-between" mb={2}>
                      <AccyUsername
                        username={r.profiles?.username ?? 'Ẩn danh'}
                        rankKey={r.profiles?.rank ?? 'member'}
                        showIcon
                        fontSize="sm"
                      />
                      {r.is_verified && (
                        <Badge color="green">
                          <LuCheck size={10} /> Đã mua
                        </Badge>
                      )}
                    </HStack>
                    <StarRow rating={r.rating} />
                    {r.comment && (
                      <Text fontSize="sm" color="rgba(255,255,255,0.7)" mt={2} whiteSpace="pre-wrap">
                        {r.comment}
                      </Text>
                    )}
                    <Text fontSize="2xs" color="rgba(255,255,255,0.3)" mt={2}>
                      {formatDate(r.created_at)}
                    </Text>
                  </Box>
                ))}
              </VStack>
            )}
          </VStack>
        </GlassCard>

        {/* Related products */}
        {related.length > 0 && (
          <Box mt={8}>
            <HStack gap={2} mb={4}>
              <LuPackage size={22} color="#a855f7" />
              <Text fontSize="xl" fontWeight="bold" color="white">Sản phẩm liên quan</Text>
            </HStack>
            <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={4}>
              {related.map((rp) => {
                const rpImage = rp.images && rp.images.length > 0 ? rp.images[0] : null
                const rpInStock = rp.stock === -1 || rp.stock > 0
                return (
                  <Link key={rp.id} to={`/products/${rp.slug}`}>
                    <GlassCard hover p={0} h="full">
                      <Box
                        position="relative"
                        h="140px"
                        bg={rpImage ? 'transparent' : 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(59,130,246,0.25), rgba(6,182,212,0.25))'}
                        overflow="hidden"
                        borderTopRadius="2xl"
                      >
                        {rpImage ? (
                          <img src={rpImage} alt={rp.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <Flex h="full" align="center" justify="center">
                            <LuPackage size={32} color="rgba(255,255,255,0.25)" />
                          </Flex>
                        )}
                        <Box position="absolute" top={2} right={2}>
                          <Badge color={rpInStock ? 'green' : 'red'}>
                            {rpInStock ? 'Còn hàng' : 'Hết'}
                          </Badge>
                        </Box>
                      </Box>
                      <VStack align="stretch" gap={1} p={3}>
                        <Text fontSize="sm" fontWeight="bold" color="white" lineClamp={1}>{rp.name}</Text>
                        <Text
                          fontSize="md"
                          fontWeight="black"
                          css={{
                            background: 'linear-gradient(90deg, #ffd700, #ffa500, #ffd700)',
                            backgroundSize: '200% auto',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {formatCurrency(rp.price)}
                        </Text>
                        <HStack gap={1}>
                          <LuFlame size={11} color="#ef4444" />
                          <Text fontSize="2xs" color="rgba(255,255,255,0.5)">{rp.sold_count} đã bán</Text>
                        </HStack>
                      </VStack>
                    </GlassCard>
                  </Link>
                )
              })}
            </Grid>
          </Box>
        )}

        <Toaster />
      </Box>
    </motion.div>
  )
}
