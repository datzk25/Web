import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, Flex, HStack, VStack, Text, Button, Heading, Image, SimpleGrid, Grid } from '@chakra-ui/react'
import {
  LuGamepad2, LuZap, LuShield, LuFlame, LuStar, LuCrown,
  LuUsers, LuShoppingCart, LuCircleDollarSign, LuArrowRight, LuPackage,
  LuCircleCheck, LuActivity, LuCircleHelp, LuChevronDown, LuSparkles, LuGift, LuClock,
} from 'react-icons/lu'
import {
  supabase, formatCurrency, type Product, type Category, type Banner,
  type ProductReview, type FAQ, type SiteStats, type Profile,
} from '../lib/supabase'
import { GlassCard, Badge, NeonText, RainbowText, GoldText } from '../components/GlassCard'
import { AccyUsername } from '../components/AccyUsername'
import {
  pageVariants, pageTransition, cardVariants, staggerContainer, staggerItem,
} from '../components/AnimatedBackground'
import { AccordionRoot, AccordionItem, AccordionItemTrigger, AccordionItemContent } from '../components/ui/accordion'
import { EmptyState } from '../components/ui/empty-state'

// ---------- Inline ProductCard ----------
function ProductCard({ product }: { product: Product }) {
  const image = product.images && product.images.length > 0 ? product.images[0] : null
  const hasDiscount = product.original_price != null && product.original_price > product.price
  const inStock = product.stock === -1 || product.stock > 0
  const typeLabel: Record<Product['type'], string> = {
    acc: 'Account', random_acc: 'Random Acc', file: 'File', tool: 'Tool', item: 'Item', service: 'Service',
  }

  return (
    <motion.div variants={staggerItem}>
      <Link to={`/products/${product.slug}`} style={{ display: 'block', height: '100%' }}>
        <GlassCard hover glow="purple" radius="2xl" h="full" display="flex" flexDirection="column">
          {/* Image area */}
          <Box position="relative" h="200px" overflow="hidden" bg="linear-gradient(135deg, rgba(124,58,237,0.25), rgba(59,130,246,0.2), rgba(6,182,212,0.15))">
            {image ? (
              <Image src={image} alt={product.name} w="full" h="full" objectFit="cover" loading="lazy" />
            ) : (
              <Flex w="full" h="full" align="center" justify="center" color="rgba(168,85,247,0.4)">
                <LuPackage size={48} />
              </Flex>
            )}
            {/* Overlay gradient */}
            <Box position="absolute" inset={0} bg="linear-gradient(180deg, transparent 60%, rgba(5,3,12,0.6) 100%)" pointerEvents="none" />

            {/* HOT / NEW / SALE badges */}
            <HStack position="absolute" top={2} left={2} gap={1}>
              {product.is_featured && (
                <Badge color="pink">
                  <LuFlame size={10} /> HOT
                </Badge>
              )}
              {product.is_new && (
                <Badge color="cyan">
                  <LuSparkles size={10} /> NEW
                </Badge>
              )}
              {hasDiscount && (
                <Badge color="gold">
                  <LuZap size={10} /> SALE
                </Badge>
              )}
            </HStack>

            {/* Stock badge */}
            <Box position="absolute" top={2} right={2}>
              <Badge color={inStock ? 'green' : 'red'}>
                {inStock ? (product.stock === -1 ? '∞ Còn hàng' : `Còn ${product.stock}`) : 'Hết hàng'}
              </Badge>
            </Box>
          </Box>

          {/* Body */}
          <VStack gap={2} p={3} align="stretch" flex={1}>
            <Text fontWeight="bold" color="white" fontSize="sm" lineClamp={1}>
              {product.name}
            </Text>
            <Text fontSize="xs" color="rgba(255,255,255,0.4)" lineClamp={1}>
              {product.short_description || product.categories?.name || typeLabel[product.type]}
            </Text>

            {/* Price row */}
            <HStack gap={2} align="baseline" mt="auto">
              <Text
                fontSize="lg"
                fontWeight="black"
                css={{
                  background: 'linear-gradient(90deg,#ffd700,#ffed4e)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {formatCurrency(product.price)}
              </Text>
              {hasDiscount && (
                <Text fontSize="xs" color="rgba(255,255,255,0.3)" textDecoration="line-through">
                  {formatCurrency(product.original_price!)}
                </Text>
              )}
            </HStack>

            {/* Bottom row */}
            <HStack justify="space-between" pt={2} borderTop="1px solid rgba(139,92,246,0.12)">
              <HStack gap={1}>
                <LuFlame size={12} color="#ec4899" />
                <Text fontSize="xs" color="rgba(255,255,255,0.5)">Đã bán {product.sold_count}</Text>
              </HStack>
              <HStack gap={1} color="#a855f7" _hover={{ gap: 2 }} transition="all 0.2s">
                <Text fontSize="xs" fontWeight="bold">Mua Ngay</Text>
                <LuArrowRight size={12} />
              </HStack>
            </HStack>
          </VStack>
        </GlassCard>
      </Link>
    </motion.div>
  )
}

// ---------- Empty placeholder ----------
function EmptyNote({ label }: { label: string }) {
  return (
    <GlassCard p={6}>
      <Text textAlign="center" fontSize="sm" color="rgba(255,255,255,0.3)">{label}</Text>
    </GlassCard>
  )
}

// ---------- Leaderboard row ----------
interface LeaderRowProps {
  index: number
  username: string
  rankKey?: string
  amount: string
}
function LeaderRow({ index, username, rankKey, amount }: LeaderRowProps) {
  const medalColors = ['#ffd700', '#c0c0c0', '#cd7f32']
  const medalColor = index < 3 ? medalColors[index] : 'rgba(255,255,255,0.4)'
  const medalIcons = [LuCrown, LuStar, LuShield]
  const MedalIcon = index < 3 ? medalIcons[index] : null
  return (
    <HStack gap={3} p={2} borderRadius="xl" bg="rgba(139,92,246,0.05)" border="1px solid rgba(139,92,246,0.08)" _hover={{ bg: 'rgba(139,92,246,0.1)' }} transition="all 0.25s">
      <Flex w={7} h={7} borderRadius="full" align="center" justify="center" bg={`${medalColor}20`} border={`1px solid ${medalColor}50`} flexShrink={0}>
        {MedalIcon ? <MedalIcon size={14} color={medalColor} /> : <Text fontSize="xs" fontWeight="bold" color={medalColor}>{index + 1}</Text>}
      </Flex>
      <Box flex={1} minW={0}>
        <AccyUsername username={username} rankKey={rankKey} fontSize="sm" />
      </Box>
      <Text fontSize="sm" fontWeight="bold" color="#06b6d4" flexShrink={0}>
        {amount}
      </Text>
    </HStack>
  )
}

// ---------- HomePage ----------
export default function HomePage() {
  const [stats, setStats] = useState<SiteStats | null>(null)
  const [banners, setBanners] = useState<Banner[]>([])
  const [currentBanner, setCurrentBanner] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [featured, setFeatured] = useState<Product[]>([])
  const [fresh, setFresh] = useState<Product[]>([])
  const [topDepositors, setTopDepositors] = useState<Profile[]>([])
  const [topBuyers, setTopBuyers] = useState<Profile[]>([])
  const [reviews, setReviews] = useState<(ProductReview & { profiles?: Pick<Profile, 'username' | 'customer_id' | 'rank'> })[]>([])
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [activeProducts, setActiveProducts] = useState(0)

  useEffect(() => {
    // Fetch all data in parallel
    const load = async () => {
      const [statsRes, bannersRes, catsRes, featuredRes, freshRes, depRes, buyRes, reviewRes, faqRes, prodCountRes] = await Promise.all([
        supabase.from('site_stats').select('*').limit(1).maybeSingle(),
        supabase.from('banners').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('products').select('*, categories(*)').eq('is_active', true).eq('is_featured', true).order('sold_count', { ascending: false }).limit(8),
        supabase.from('products').select('*, categories(*)').eq('is_active', true).eq('is_new', true).order('created_at', { ascending: false }).limit(8),
        supabase.from('profiles').select('*').order('total_deposited', { ascending: false }).limit(5),
        supabase.from('profiles').select('*').order('total_spent', { ascending: false }).limit(5),
        supabase.from('product_reviews').select('*, profiles(username, customer_id, rank)').eq('is_verified', true).order('created_at', { ascending: false }).limit(6),
        supabase.from('faqs').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ])

      if (statsRes.data) setStats(statsRes.data)
      if (bannersRes.data) setBanners(bannersRes.data)
      if (catsRes.data) setCategories(catsRes.data)
      if (featuredRes.data) setFeatured(featuredRes.data as Product[])
      if (freshRes.data) setFresh(freshRes.data as Product[])
      if (depRes.data) setTopDepositors(depRes.data)
      if (buyRes.data) setTopBuyers(buyRes.data)
      if (reviewRes.data) setReviews(reviewRes.data as (ProductReview & { profiles?: Pick<Profile, 'username' | 'customer_id' | 'rank'> })[])
      if (faqRes.data) setFaqs(faqRes.data)
      if (prodCountRes.count != null) setActiveProducts(prodCountRes.count)
    }
    load()
  }, [])

  // Banner auto-rotate every 5s
  const nextBanner = useCallback(() => {
    setCurrentBanner((prev) => (banners.length > 0 ? (prev + 1) % banners.length : 0))
  }, [banners.length])

  useEffect(() => {
    if (banners.length <= 1) return
    const id = setInterval(nextBanner, 5000)
    return () => clearInterval(id)
  }, [nextBanner, banners.length])

  const activeBanner = banners[currentBanner]

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <Box pt="100px" pb={16} maxW="1400px" mx="auto" px={{ base: 4, md: 6 }}>
        <VStack gap={10} align="stretch">

          {/* ============ 1. HERO BANNER ============ */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible">
            <GlassCard rgbBorder glow="purple" radius="3xl" p={{ base: 6, md: 10 }} position="relative" overflow="hidden">
              {/* Decorative glows */}
              <Box position="absolute" top="-80px" right="-80px" w="300px" h="300px" borderRadius="50%" bg="radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)" filter="blur(60px)" pointerEvents="none" />
              <Box position="absolute" bottom="-80px" left="-80px" w="300px" h="300px" borderRadius="50%" bg="radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)" filter="blur(60px)" pointerEvents="none" />

              <VStack gap={5} align="center" textAlign="center" position="relative">
                <Badge color="purple">
                  <LuShield size={10} /> Uy Tín #1 Việt Nam
                </Badge>

                <Heading as="h1" fontSize={{ base: '4xl', md: '6xl' }} fontWeight="black" lineHeight="1.1">
                  <GoldText fontSize={{ base: '4xl', md: '6xl' }} fontWeight="black">NovaXStore</GoldText>
                </Heading>

                <Text fontSize={{ base: 'md', md: 'xl' }} color="rgba(255,255,255,0.7)" maxW="600px">
                  Mua Bán Tài Nguyên Game Uy Tín #1 Việt Nam
                </Text>

                <HStack gap={3} flexWrap="wrap" justify="center">
                  <Link to="/products">
                    <Button size="lg" bg="linear-gradient(135deg,#7c3aed,#3b82f6,#06b6d4)" color="white" fontWeight="bold" borderRadius="xl" _hover={{ opacity: 0.9, transform: 'translateY(-2px)' }} boxShadow="0 8px 24px rgba(124,58,237,0.4)">
                      <HStack gap={2}>Khám Phá <LuArrowRight size={16} /></HStack>
                    </Button>
                  </Link>
                  <Link to="/deposit">
                    <Button size="lg" variant="outline" borderColor="rgba(168,85,247,0.4)" color="white" fontWeight="bold" borderRadius="xl" _hover={{ bg: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.6)' }}>
                      <HStack gap={2}><LuCircleDollarSign size={16} /> Nạp Tiền</HStack>
                    </Button>
                  </Link>
                </HStack>

                {/* Stats row */}
                <HStack gap={{ base: 4, md: 8 }} mt={3} flexWrap="wrap" justify="center">
                  <VStack gap={0}>
                    <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="black" color="#a855f7" css={{ textShadow: '0 0 16px rgba(168,85,247,0.5)' }}>
                      {stats ? stats.total_users.toLocaleString('vi-VN') : '...'}
                    </Text>
                    <Text fontSize="xs" color="rgba(255,255,255,0.5)"><LuUsers size={10} style={{ display: 'inline' }} /> Thành Viên</Text>
                  </VStack>
                  <Box w="1px" h="40px" bg="rgba(139,92,246,0.2)" />
                  <VStack gap={0}>
                    <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="black" color="#06b6d4" css={{ textShadow: '0 0 16px rgba(6,182,212,0.5)' }}>
                      {stats ? stats.total_orders.toLocaleString('vi-VN') : '...'}
                    </Text>
                    <Text fontSize="xs" color="rgba(255,255,255,0.5)"><LuShoppingCart size={10} style={{ display: 'inline' }} /> Đơn Hàng</Text>
                  </VStack>
                  <Box w="1px" h="40px" bg="rgba(139,92,246,0.2)" />
                  <VStack gap={0}>
                    <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="black" color="#10b981" css={{ textShadow: '0 0 16px rgba(16,185,129,0.5)' }}>
                      {activeProducts.toLocaleString('vi-VN')}
                    </Text>
                    <Text fontSize="xs" color="rgba(255,255,255,0.5)"><LuPackage size={10} style={{ display: 'inline' }} /> Tài Nguyên</Text>
                  </VStack>
                </HStack>
              </VStack>
            </GlassCard>
          </motion.div>

          {/* ============ 2. BANNER SLIDER ============ */}
          {banners.length > 0 && (
            <motion.div variants={cardVariants} initial="hidden" animate="visible">
              <GlassCard rgbBorder radius="2xl" p={0} overflow="hidden" position="relative" h={{ base: '220px', md: '300px' }}>
                {activeBanner && (
                  <Box position="absolute" inset={0}>
                    {activeBanner.image_url ? (
                      <Image src={activeBanner.image_url} alt={activeBanner.title} w="full" h="full" objectFit="cover" />
                    ) : (
                      <Box w="full" h="full" bg="linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.25), rgba(6,182,212,0.2))" />
                    )}
                    <Box position="absolute" inset={0} bg="linear-gradient(90deg, rgba(5,3,12,0.85) 0%, rgba(5,3,12,0.5) 60%, transparent 100%)" />
                  </Box>
                )}
                <Flex position="relative" h="full" align="center" p={{ base: 5, md: 8 }} z-index={1}>
                  <VStack gap={3} align="start" maxW="500px">
                    {activeBanner && (
                      <>
                        <Text fontSize={{ base: 'xl', md: '3xl' }} fontWeight="black" color="white" css={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                          {activeBanner.title}
                        </Text>
                        {activeBanner.subtitle && (
                          <Text fontSize={{ base: 'sm', md: 'md' }} color="rgba(255,255,255,0.8)" css={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                            {activeBanner.subtitle}
                          </Text>
                        )}
                        {activeBanner.button_text && activeBanner.link_url && (
                          <Link to={activeBanner.link_url}>
                            <Button size="md" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" fontWeight="bold" borderRadius="xl" _hover={{ opacity: 0.9, transform: 'translateY(-1px)' }}>
                              <HStack gap={2}>{activeBanner.button_text} <LuArrowRight size={14} /></HStack>
                            </Button>
                          </Link>
                        )}
                      </>
                    )}
                  </VStack>
                </Flex>

                {/* Dots */}
                {banners.length > 1 && (
                  <HStack position="absolute" bottom={3} left="50%" transform="translateX(-50%)" gap={2} z-index={2}>
                    {banners.map((_, i) => (
                      <Box
                        key={i}
                        as="button"
                        w={i === currentBanner ? '24px' : '8px'}
                        h="8px"
                        borderRadius="full"
                        bg={i === currentBanner ? 'linear-gradient(90deg,#a855f7,#06b6d4)' : 'rgba(255,255,255,0.3)'}
                        transition="all 0.3s"
                        onClick={() => setCurrentBanner(i)}
                        cursor="pointer"
                      />
                    ))}
                  </HStack>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* ============ 3. CATEGORIES ============ */}
          {categories.length > 0 && (
            <Box>
              <HStack justify="space-between" align="center" mb={4}>
                <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="black">
                  <RainbowText fontSize={{ base: 'xl', md: '2xl' }} fontWeight="black">Danh Mục Sản Phẩm</RainbowText>
                </Heading>
                <Link to="/products">
                  <HStack gap={1} color="rgba(168,85,247,0.8)" _hover={{ color: '#a855f7' }} fontSize="sm">
                    <Text>Tất cả</Text>
                    <LuArrowRight size={14} />
                  </HStack>
                </Link>
              </HStack>
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 6 }} gap={3}>
                  {categories.map((cat) => (
                    <motion.div key={cat.id} variants={staggerItem}>
                      <Link to={`/products?cat=${cat.slug}`}>
                        <GlassCard hover glow="blue" radius="2xl" p={4} h="full">
                          <VStack gap={2} align="center" textAlign="center">
                            <Box p={2.5} borderRadius="xl" bg="rgba(59,130,246,0.12)" border="1px solid rgba(59,130,246,0.3)" css={{ boxShadow: '0 0 16px rgba(59,130,246,0.2)' }}>
                              <LuGamepad2 size={22} color="#3b82f6" />
                            </Box>
                            <Text fontSize="sm" fontWeight="bold" color="white" lineClamp={1}>{cat.name}</Text>
                          </VStack>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  ))}
                </SimpleGrid>
              </motion.div>
            </Box>
          )}

          {/* ============ 4. FEATURED PRODUCTS ============ */}
          <Box>
            <HStack justify="space-between" align="center" mb={4}>
              <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="black">
                <RainbowText fontSize={{ base: 'xl', md: '2xl' }} fontWeight="black">Sản Phẩm Nổi Bật</RainbowText>
              </Heading>
              <Link to="/products">
                <HStack gap={1} color="rgba(168,85,247,0.8)" _hover={{ color: '#a855f7' }} fontSize="sm">
                  <Text>Xem tất cả</Text>
                  <LuArrowRight size={14} />
                </HStack>
              </Link>
            </HStack>
            {featured.length > 0 ? (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                <SimpleGrid columns={{ base: 2, sm: 2, md: 3, lg: 4 }} gap={4}>
                  {featured.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </SimpleGrid>
              </motion.div>
            ) : (
              <EmptyState title="Chưa có dữ liệu" description="Sản phẩm nổi bật sẽ xuất hiện tại đây" />
            )}
          </Box>

          {/* ============ 5. NEW PRODUCTS ============ */}
          <Box>
            <HStack justify="space-between" align="center" mb={4}>
              <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="black">
                <RainbowText fontSize={{ base: 'xl', md: '2xl' }} fontWeight="black">Sản Phẩm Mới</RainbowText>
              </Heading>
              <Link to="/products">
                <HStack gap={1} color="rgba(168,85,247,0.8)" _hover={{ color: '#a855f7' }} fontSize="sm">
                  <Text>Xem tất cả</Text>
                  <LuArrowRight size={14} />
                </HStack>
              </Link>
            </HStack>
            {fresh.length > 0 ? (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                <SimpleGrid columns={{ base: 2, sm: 2, md: 3, lg: 4 }} gap={4}>
                  {fresh.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </SimpleGrid>
              </motion.div>
            ) : (
              <EmptyState title="Chưa có dữ liệu" description="Sản phẩm mới sẽ xuất hiện tại đây" />
            )}
          </Box>

          {/* ============ 6. TOP DEPOSITORS + TOP BUYERS ============ */}
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <motion.div variants={cardVariants} initial="hidden" animate="visible">
              <GlassCard glow="gold" radius="2xl" p={5} h="full">
                <VStack gap={3} align="stretch">
                  <HStack gap={2}>
                    <LuCrown size={18} color="#ffd700" />
                    <Text fontSize="lg" fontWeight="black" color="#ffd700" css={{ textShadow: '0 0 12px rgba(255,215,0,0.4)' }}>
                      Top Nạp Tiền
                    </Text>
                  </HStack>
                  {topDepositors.length > 0 ? (
                    <VStack gap={2} align="stretch">
                      {topDepositors.map((p, i) => (
                        <LeaderRow key={p.id} index={i} username={p.username} rankKey={p.rank} amount={formatCurrency(p.total_deposited)} />
                      ))}
                    </VStack>
                  ) : (
                    <EmptyNote label="Chưa có dữ liệu" />
                  )}
                </VStack>
              </GlassCard>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible">
              <GlassCard glow="pink" radius="2xl" p={5} h="full">
                <VStack gap={3} align="stretch">
                  <HStack gap={2}>
                    <LuFlame size={18} color="#ec4899" />
                    <Text fontSize="lg" fontWeight="black" color="#ec4899" css={{ textShadow: '0 0 12px rgba(236,72,153,0.4)' }}>
                      Top Mua Hàng
                    </Text>
                  </HStack>
                  {topBuyers.length > 0 ? (
                    <VStack gap={2} align="stretch">
                      {topBuyers.map((p, i) => (
                        <LeaderRow key={p.id} index={i} username={p.username} rankKey={p.rank} amount={formatCurrency(p.total_spent)} />
                      ))}
                    </VStack>
                  ) : (
                    <EmptyNote label="Chưa có dữ liệu" />
                  )}
                </VStack>
              </GlassCard>
            </motion.div>
          </Grid>

          {/* ============ 7. CUSTOMER REVIEWS ============ */}
          <Box>
            <HStack justify="space-between" align="center" mb={4}>
              <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="black">
                <RainbowText fontSize={{ base: 'xl', md: '2xl' }} fontWeight="black">Đánh Giá Khách Hàng</RainbowText>
              </Heading>
            </HStack>
            {reviews.length > 0 ? (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
                  {reviews.map((r) => (
                    <motion.div key={r.id} variants={staggerItem}>
                      <GlassCard hover glow="cyan" radius="2xl" p={5} h="full">
                        <VStack gap={3} align="stretch">
                          <HStack justify="space-between" align="start">
                            <HStack gap={2}>
                              <Box w={9} h={9} borderRadius="full" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" display="flex" alignItems="center" justifyContent="center" border="1px solid rgba(168,85,247,0.4)" flexShrink={0}>
                                <Text fontSize="sm" fontWeight="black" color="white">{(r.profiles?.username || '?')[0].toUpperCase()}</Text>
                              </Box>
                              <Box>
                                <AccyUsername username={r.profiles?.username || 'Ẩn danh'} rankKey={r.profiles?.rank} fontSize="sm" />
                                {r.is_verified && (
                                  <HStack gap={1}>
                                    <LuCircleCheck size={10} color="#10b981" />
                                    <Text fontSize="2xs" color="rgba(16,185,129,0.8)">Đã xác minh</Text>
                                  </HStack>
                                )}
                              </Box>
                            </HStack>
                          </HStack>
                          <HStack gap={0.5}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <LuStar key={i} size={13} color={i < r.rating ? '#ffd700' : 'rgba(255,255,255,0.15)'} fill={i < r.rating ? '#ffd700' : 'transparent'} />
                            ))}
                          </HStack>
                          <Text fontSize="sm" color="rgba(255,255,255,0.7)" lineHeight="1.5" lineClamp={4}>
                            "{r.comment || 'Khách hàng không để lại lời nhận xét.'}"
                          </Text>
                        </VStack>
                      </GlassCard>
                    </motion.div>
                  ))}
                </SimpleGrid>
              </motion.div>
            ) : (
              <EmptyState title="Chưa có dữ liệu" description="Đánh giá từ khách hàng sẽ xuất hiện tại đây" />
            )}
          </Box>

          {/* ============ 8. FAQ ============ */}
          {faqs.length > 0 && (
            <Box>
              <HStack justify="space-between" align="center" mb={4}>
                <Heading as="h2" fontSize={{ base: 'xl', md: '2xl' }} fontWeight="black">
                  <RainbowText fontSize={{ base: 'xl', md: '2xl' }} fontWeight="black">Câu Hỏi Thường Gặp</RainbowText>
                </Heading>
                <LuCircleHelp size={20} color="rgba(168,85,247,0.5)" />
              </HStack>
              <motion.div variants={cardVariants} initial="hidden" animate="visible">
                <GlassCard radius="2xl" p={{ base: 3, md: 5 }}>
                  <AccordionRoot collapsible multiple gap={2}>
                    {faqs.map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id} border="1px solid rgba(139,92,246,0.12)" borderRadius="xl" bg="rgba(139,92,246,0.04)" _hover={{ bg: 'rgba(139,92,246,0.08)' }} transition="all 0.25s">
                        <AccordionItemTrigger p={4} cursor="pointer">
                          <Text fontSize="sm" fontWeight="bold" color="white" flex={1}>{faq.question}</Text>
                        </AccordionItemTrigger>
                        <AccordionItemContent p={4} pt={0}>
                          <Text fontSize="sm" color="rgba(255,255,255,0.6)" lineHeight="1.6">{faq.answer}</Text>
                        </AccordionItemContent>
                      </AccordionItem>
                    ))}
                  </AccordionRoot>
                </GlassCard>
              </motion.div>
            </Box>
          )}

          {/* ============ 9. SYSTEM STATUS ============ */}
          <motion.div variants={cardVariants} initial="hidden" animate="visible">
            <GlassCard glow="green" rgbBorder radius="2xl" p={5}>
              <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                <HStack gap={3}>
                  <Box position="relative" w={3} h={3} borderRadius="full" bg="#10b981" flexShrink={0}>
                    <Box position="absolute" inset={0} borderRadius="full" bg="#10b981" css={{ animation: 'glow-pulse 1.5s ease-in-out infinite' }} />
                  </Box>
                  <VStack gap={0} align="start">
                    <Text fontSize="sm" fontWeight="bold" color="#10b981" css={{ textShadow: '0 0 10px rgba(16,185,129,0.4)' }}>
                      Hệ thống hoạt động bình thường
                    </Text>
                    <Text fontSize="xs" color="rgba(255,255,255,0.4)">Tất cả dịch vụ đang online</Text>
                  </VStack>
                </HStack>
                <HStack gap={{ base: 4, md: 8 }} flexWrap="wrap">
                  <HStack gap={2}>
                    <LuActivity size={16} color="#10b981" />
                    <VStack gap={0} align="start">
                      <Text fontSize="xs" color="rgba(255,255,255,0.4)">Uptime</Text>
                      <Text fontSize="sm" fontWeight="bold" color="#10b981">99.9%</Text>
                    </VStack>
                  </HStack>
                  <HStack gap={2}>
                    <LuPackage size={16} color="#a855f7" />
                    <VStack gap={0} align="start">
                      <Text fontSize="xs" color="rgba(255,255,255,0.4)">Sản phẩm</Text>
                      <Text fontSize="sm" fontWeight="bold" color="#a855f7">{activeProducts.toLocaleString('vi-VN')}</Text>
                    </VStack>
                  </HStack>
                  <HStack gap={2}>
                    <LuClock size={16} color="#06b6d4" />
                    <VStack gap={0} align="start">
                      <Text fontSize="xs" color="rgba(255,255,255,0.4)">Hỗ trợ</Text>
                      <Text fontSize="sm" fontWeight="bold" color="#06b6d4">24/7</Text>
                    </VStack>
                  </HStack>
                </HStack>
              </Flex>
            </GlassCard>
          </motion.div>

        </VStack>
      </Box>
    </motion.div>
  )
}
