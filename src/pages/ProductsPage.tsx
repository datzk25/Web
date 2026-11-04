import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, Flex, Grid, HStack, VStack, Text, Button, Input, Spinner, NativeSelect } from '@chakra-ui/react'
import { LuSearch, LuFlame, LuPackage, LuStar, LuArrowRight, LuFilter, LuLayoutGrid } from 'react-icons/lu'
import { supabase, formatCurrency, type Product, type Category } from '../lib/supabase'
import { GlassCard, Badge } from '../components/GlassCard'
import { pageVariants, pageTransition, staggerContainer, staggerItem } from '../components/AnimatedBackground'
import { EmptyState } from '../components/ui/empty-state'

const TYPE_LABELS: Record<Product['type'], string> = {
  acc: 'Tài Khoản',
  random_acc: 'Random Acc',
  file: 'File',
  tool: 'Công Cụ',
  item: 'Vật Phẩm',
  service: 'Dịch Vụ',
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới Nhất' },
  { value: 'price-low', label: 'Giá: Thấp → Cao' },
  { value: 'price-high', label: 'Giá: Cao → Thấp' },
  { value: 'best-seller', label: 'Bán Chạy Nhất' },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]['value']

function ProductCard({ product }: { product: Product }) {
  const image = product.images && product.images.length > 0 ? product.images[0] : null
  const onSale = product.original_price != null && product.original_price > product.price
  const isHot = product.sold_count >= 10
  const inStock = product.stock === -1 || product.stock > 0

  return (
    <motion.div variants={staggerItem}>
      <Link to={`/products/${product.slug}`}>
        <GlassCard hover glow="purple" p={0} h="full" display="flex" flexDirection="column">
          {/* Image area */}
          <Box
            position="relative"
            h="180px"
            bg={image ? 'transparent' : 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(59,130,246,0.25), rgba(6,182,212,0.25))'}
            overflow="hidden"
            borderTopRadius="2xl"
          >
            {image ? (
              <img src={image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <Flex h="full" align="center" justify="center">
                <LuPackage size={40} color="rgba(255,255,255,0.25)" />
              </Flex>
            )}

            {/* Top-left badges */}
            <HStack position="absolute" top={2} left={2} gap={1}>
              {isHot && (
                <Badge color="red">
                  <LuFlame size={10} /> HOT
                </Badge>
              )}
              {product.is_new && (
                <Badge color="cyan">
                  <LuStar size={10} /> NEW
                </Badge>
              )}
              {onSale && <Badge color="gold">SALE</Badge>}
            </HStack>

            {/* Top-right stock */}
            <Box position="absolute" top={2} right={2}>
              <Badge color={inStock ? 'green' : 'red'}>
                {inStock ? `Còn ${product.stock === -1 ? '∞' : product.stock}` : 'Hết Hàng'}
              </Badge>
            </Box>
          </Box>

          {/* Body */}
          <VStack align="stretch" gap={2} p={3} flex={1}>
            <Text fontSize="sm" fontWeight="bold" color="white" lineClamp={1}>
              {product.name}
            </Text>

            <HStack justify="space-between" align="center">
              <Badge color="purple">{TYPE_LABELS[product.type]}</Badge>
              <HStack gap={0.5}>
                <LuFlame size={11} color="#ef4444" />
                <Text fontSize="2xs" color="rgba(255,255,255,0.5)">
                  {product.sold_count} đã bán
                </Text>
              </HStack>
            </HStack>

            <Box mt="auto">
              <HStack align="baseline" gap={2} wrap="wrap">
                <Text
                  fontSize="lg"
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
                  {formatCurrency(product.price)}
                </Text>
                {onSale && (
                  <Text fontSize="xs" color="rgba(255,255,255,0.35)" textDecoration="line-through">
                    {formatCurrency(product.original_price as number)}
                  </Text>
                )}
              </HStack>
            </Box>

            <HStack justify="space-between" align="center" mt={1} pt={2} borderTop="1px solid rgba(139,92,246,0.12)">
              <Text fontSize="2xs" color="rgba(255,255,255,0.4)">
                Xem chi tiết
              </Text>
              <LuArrowRight size={14} color="#a855f7" />
            </HStack>
          </VStack>
        </GlassCard>
      </Link>
    </motion.div>
  )
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const q = searchParams.get('q') ?? ''
  const cat = searchParams.get('cat') ?? ''
  const sort = (searchParams.get('sort') as SortValue | null) ?? 'newest'

  const [searchInput, setSearchInput] = useState(q)

  // Keep the controlled search input in sync when navigating from the header
  useEffect(() => {
    setSearchInput(q)
  }, [q])

  // Load categories once
  useEffect(() => {
    let active = true
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (active && data) setCategories(data as Category[])
      })
    return () => {
      active = false
    }
  }, [])

  // Load products whenever filters change
  useEffect(() => {
    let active = true
    setLoading(true)

    const buildQuery = () => {
      let query = supabase
        .from('products')
        .select('*, categories(*)')
        .eq('is_active', true)

      if (q.trim()) {
        // ilike on name, plus a loose match on slug
        query = query.or(`name.ilike.%${q.trim()}%,slug.ilike.%${q.trim()}%`)
      }
      if (cat) {
        query = query.eq('category_id', cat)
      }
      return query
    }

    const run = async () => {
      let query = buildQuery()

      switch (sort) {
        case 'price-low':
          query = query.order('price', { ascending: true })
          break
        case 'price-high':
          query = query.order('price', { ascending: false })
          break
        case 'best-seller':
          query = query.order('sold_count', { ascending: false })
          break
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false })
          break
      }

      const { data, error } = await query.limit(60)
      if (!active) return
      if (error) {
        setProducts([])
      } else {
        setProducts((data ?? []) as Product[])
      }
      setLoading(false)
    }

    run()
    return () => {
      active = false
    }
  }, [q, cat, sort])

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateParam('q', searchInput.trim())
  }

  const resultCount = useMemo(() => products.length, [products])

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
      <Box pt="100px" pb={16} maxW="1400px" mx="auto" px={{ base: 4, md: 6 }}>
        {/* Heading */}
        <VStack gap={2} mb={6} align={{ base: 'center', md: 'flex-start' }}>
          <HStack gap={2}>
            <LuLayoutGrid size={28} color="#a855f7" />
            <Text
              fontSize={{ base: '3xl', md: '4xl' }}
              fontWeight="black"
              css={{
                background: 'linear-gradient(90deg, #a855f7, #3b82f6, #06b6d4, #10b981, #ec4899, #a855f7)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 3s linear infinite',
              }}
            >
              Sản Phẩm
            </Text>
          </HStack>
          <Text fontSize="sm" color="rgba(255,255,255,0.5)">
            Khám phá kho tài khoản, vật phẩm và công cụ giá tốt nhất
          </Text>
        </VStack>

        {/* Filter bar */}
        <GlassCard p={4} mb={6}>
          <Flex
            direction={{ base: 'column', md: 'row' }}
            gap={3}
            align={{ base: 'stretch', md: 'center' }}
          >
            <Box as="form" onSubmit={handleSearch} position="relative" flex={1} minW={0}>
              <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                <LuSearch size={16} color="rgba(168,85,247,0.6)" />
              </Box>
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                pl={10}
                h={10}
                bg="rgba(15,10,30,0.5)"
                border="1px solid rgba(139,92,246,0.2)"
                borderRadius="xl"
                color="white"
                _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
                _focus={{ border: '1px solid rgba(168,85,247,0.6)', boxShadow: '0 0 0 3px rgba(168,85,247,0.12)' }}
              />
            </Box>

            <HStack gap={3} flexShrink={0}>
              <Box position="relative">
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1} pointerEvents="none">
                  <LuFilter size={14} color="rgba(168,85,247,0.6)" />
                </Box>
                <NativeSelect.Root variant="outline" size="md">
                  <NativeSelect.Field
                    value={cat}
                    onChange={(e) => updateParam('cat', e.target.value)}
                    pl={9}
                    pr={8}
                    h="40px"
                    bg="rgba(15,10,30,0.5)"
                    border="1px solid rgba(139,92,246,0.2)"
                    borderColor="rgba(139,92,246,0.2)"
                    borderRadius="xl"
                    color="white"
                    cursor="pointer"
                    _focus={{ border: '1px solid rgba(168,85,247,0.6)' }}
                  >
                    <option value="">Tất cả danh mục</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect.Field>
                </NativeSelect.Root>
              </Box>

              <NativeSelect.Root variant="outline" size="md">
                <NativeSelect.Field
                  value={sort}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  px={3}
                  pr={8}
                  h="40px"
                  bg="rgba(15,10,30,0.5)"
                  border="1px solid rgba(139,92,246,0.2)"
                  borderColor="rgba(139,92,246,0.2)"
                  borderRadius="xl"
                  color="white"
                  cursor="pointer"
                  _focus={{ border: '1px solid rgba(168,85,247,0.6)' }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect.Field>
              </NativeSelect.Root>

              {(q || cat) && (
                <Button
                  size="sm"
                  h={10}
                  variant="ghost"
                  color="rgba(255,255,255,0.6)"
                  _hover={{ bg: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                  onClick={() => {
                    setSearchInput('')
                    setSearchParams(new URLSearchParams(), { replace: true })
                  }}
                >
                  Xóa lọc
                </Button>
              )}
            </HStack>
          </Flex>
        </GlassCard>

        {/* Result summary */}
        <HStack justify="space-between" mb={4}>
          <Text fontSize="sm" color="rgba(255,255,255,0.5)">
            {loading ? 'Đang tải...' : `${resultCount} sản phẩm`}
          </Text>
        </HStack>

        {/* Content */}
        {loading ? (
          <Flex justify="center" align="center" py={20}>
            <VStack gap={3}>
              <Spinner size="xl" color="#a855f7" />
              <Text fontSize="sm" color="rgba(255,255,255,0.4)">
                Đang tải sản phẩm...
              </Text>
            </VStack>
          </Flex>
        ) : products.length === 0 ? (
          <GlassCard p={10}>
            <EmptyState
              title="Không tìm thấy sản phẩm"
              description="Thử thay đổi từ khóa hoặc bộ lọc để xem thêm kết quả."
              icon={<LuPackage size={40} color="#a855f7" />}
            >
              <Button
                mt={4}
                size="sm"
                bg="linear-gradient(135deg,#7c3aed,#3b82f6)"
                color="white"
                _hover={{ opacity: 0.9 }}
                borderRadius="xl"
                onClick={() => {
                  setSearchInput('')
                  setSearchParams(new URLSearchParams(), { replace: true })
                }}
              >
                Xóa bộ lọc
              </Button>
            </EmptyState>
          </GlassCard>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </Grid>
          </motion.div>
        )}
      </Box>
    </motion.div>
  )
}
