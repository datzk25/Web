import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, Flex, Grid, HStack, VStack, Text, Button, Input, Spinner, Separator, Textarea } from '@chakra-ui/react'
import { LuShield, LuUsers, LuPackage, LuShoppingCart, LuCircleDollarSign, LuTrendingUp, LuTag, LuBell, LuPlus, LuPencil, LuTrash2, LuCheck, LuX, LuRefreshCw, LuArchive, LuSearch, LuHeadphones, LuImage, LuSettings, LuChartBar, LuCircleAlert, LuMessageCircle, LuSend } from 'react-icons/lu'
import { useAuth } from '../lib/auth'
import { supabase, formatCurrency, formatDate, type Product, type Category, type Order, type Profile, type DepositTransaction, type SupportTicket, type TicketMessage, type Banner, type SiteSettings } from '../lib/supabase'
import { GlassCard, Badge, RainbowText } from '../components/GlassCard'
import { AccyUsername } from '../components/AccyUsername'
import { pageVariants, pageTransition } from '../components/AnimatedBackground'
import { Toaster, toaster } from '../components/ui/toaster'
import { Switch } from '../components/ui/switch'

type Section = 'dashboard' | 'users' | 'products' | 'categories' | 'deposits' | 'tickets' | 'banners' | 'settings'

const TYPE_LABELS: Record<Product['type'], string> = {
  acc: 'Tài Khoản',
  random_acc: 'Random Acc',
  file: 'File',
  tool: 'Công Cụ',
  item: 'Vật Phẩm',
  service: 'Dịch Vụ',
}

// Shared input style constants
const inputStyle = {
  height: '40px',
  background: 'rgba(15,10,30,0.5)',
  border: '1px solid rgba(139,92,246,0.2)',
  borderRadius: '12px',
  color: 'white' as const,
  outline: 'none' as const,
}

const selectStyle = {
  height: '40px',
  paddingLeft: '12px',
  paddingRight: '12px',
  background: 'rgba(15,10,30,0.5)',
  border: '1px solid rgba(139,92,246,0.2)',
  borderRadius: '12px',
  color: 'white' as const,
  cursor: 'pointer' as const,
  outline: 'none' as const,
  width: '100%',
}

// ---------- Stat Card ----------
interface StatCardProps {
  icon: React.ReactNode
  value: string
  label: string
  glow: 'purple' | 'cyan' | 'green' | 'gold'
  color: string
}
function StatCard({ icon, value, label, glow, color }: StatCardProps) {
  return (
    <GlassCard glow={glow} hover p={5} h="full">
      <VStack gap={3} align="center" textAlign="center">
        <Box p={3} borderRadius="2xl" bg={`${color}18`} border={`1px solid ${color}40`} css={{ boxShadow: `0 0 20px ${color}30` }}>
          {icon}
        </Box>
        <Text fontSize="2xl" fontWeight="black" color={color} css={{ textShadow: `0 0 16px ${color}50` }}>
          {value}
        </Text>
        <Text fontSize="sm" color="rgba(255,255,255,0.6)">{label}</Text>
      </VStack>
    </GlassCard>
  )
}

// ---------- CSS Bar Chart ----------
interface ChartDay {
  label: string
  value: number
}
function BarChart({ data, color, gradient, label }: { data: ChartDay[]; color: string; gradient: string; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <GlassCard p={5}>
      <HStack justify="space-between" mb={4}>
        <Text fontSize="md" fontWeight="bold" color="white">{label}</Text>
        <LuChartBar size={18} color={color} />
      </HStack>
      <Flex gap={2} align="end" h="160px" w="full">
        {data.map((d, i) => (
          <Box key={i} flex={1} h="full" display="flex" flexDirection="column" justifyContent="flex-end" alignItems="center" gap={2}>
            <Text fontSize="2xs" color="rgba(255,255,255,0.5)">{d.value > 0 ? d.value : ''}</Text>
            <Box
              w="full"
              minH="4px"
              h={`${(d.value / max) * 100}%`}
              borderRadius="md"
              bg={gradient}
              css={{ boxShadow: `0 0 12px ${color}40`, transition: 'height 0.5s ease' }}
            />
            <Text fontSize="2xs" color="rgba(255,255,255,0.4)">{d.label}</Text>
          </Box>
        ))}
      </Flex>
    </GlassCard>
  )
}

export default function AdminPage() {
  const { user, profile, loading } = useAuth()
  const [section, setSection] = useState<Section>('dashboard')

  // Dashboard data
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [revenueChart, setRevenueChart] = useState<ChartDay[]>([])
  const [ordersChart, setOrdersChart] = useState<ChartDay[]>([])
  const [outOfStock, setOutOfStock] = useState<Product[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [recentDeposits, setRecentDeposits] = useState<DepositTransaction[]>([])
  const [dashLoading, setDashLoading] = useState(true)

  // Users
  const [users, setUsers] = useState<Profile[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [usersLoading, setUsersLoading] = useState(true)

  // Products
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [pName, setPName] = useState('')
  const [pSlug, setPSlug] = useState('')
  const [pType, setPType] = useState<Product['type']>('acc')
  const [pPrice, setPPrice] = useState('')
  const [pOrigPrice, setPOrigPrice] = useState('')
  const [pStock, setPStock] = useState('0')
  const [pCategory, setPCategory] = useState('')
  const [pShortDesc, setPShortDesc] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)
  const [inventoryProduct, setInventoryProduct] = useState<Product | null>(null)
  const [inventoryText, setInventoryText] = useState('')
  const [addingInventory, setAddingInventory] = useState(false)

  // Categories
  const [catsLoading, setCatsLoading] = useState(true)
  const [showAddCat, setShowAddCat] = useState(false)
  const [catName, setCatName] = useState('')
  const [catSlug, setCatSlug] = useState('')
  const [catIcon, setCatIcon] = useState('')
  const [catSort, setCatSort] = useState('0')
  const [addingCat, setAddingCat] = useState(false)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatSlug, setEditCatSlug] = useState('')
  const [editCatIcon, setEditCatIcon] = useState('')
  const [editCatSort, setEditCatSort] = useState('0')

  // Deposits
  const [deposits, setDeposits] = useState<DepositTransaction[]>([])
  const [depositsLoading, setDepositsLoading] = useState(true)

  // Tickets
  const [tickets, setTickets] = useState<(SupportTicket & { profiles?: Pick<Profile, 'username' | 'customer_id'> })[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<(SupportTicket & { profiles?: Pick<Profile, 'username' | 'customer_id'> }) | null>(null)
  const [ticketMessages, setTicketMessages] = useState<TicketMessage[]>([])
  const [ticketReply, setTicketReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  // Banners
  const [banners, setBanners] = useState<Banner[]>([])
  const [bannersLoading, setBannersLoading] = useState(true)
  const [showAddBanner, setShowAddBanner] = useState(false)
  const [bTitle, setBTitle] = useState('')
  const [bSubtitle, setBSubtitle] = useState('')
  const [bImageUrl, setBImageUrl] = useState('')
  const [bLinkUrl, setBLinkUrl] = useState('')
  const [bButtonText, setBButtonText] = useState('')
  const [bSortOrder, setBSortOrder] = useState('0')
  const [addingBanner, setAddingBanner] = useState(false)

  // Settings
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  // ---------- Admin guard ----------
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" color="#a855f7" />
      </Flex>
    )
  }
  if (!user || !profile || profile.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  // ---------- Dashboard load ----------
  const loadDashboard = async () => {
    setDashLoading(true)
    const now = new Date()
    const days: { date: Date; label: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      d.setHours(0, 0, 0, 0)
      days.push({ date: d, label: `${d.getDate()}/${d.getMonth() + 1}` })
    }
    const weekStart = days[0].date.toISOString()
    const weekEnd = new Date(days[6].date)
    weekEnd.setHours(23, 59, 59, 999)
    const weekEndIso = weekEnd.toISOString()

    const [usersCountRes, ordersCountRes, ordersRes, productsRes, recentOrdersRes, recentDepositsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total_price, created_at').gte('created_at', weekStart).lte('created_at', weekEndIso),
      supabase.from('products').select('*').eq('stock', 0).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('deposit_transactions').select('*').order('created_at', { ascending: false }).limit(5),
    ])

    setTotalUsers(usersCountRes.count ?? 0)
    setTotalOrders(ordersCountRes.count ?? 0)
    const allOrders = (ordersRes.data ?? []) as { total_price: number; created_at: string }[]
    const rev = allOrders.reduce((s, o) => s + (o.total_price || 0), 0)
    setTotalRevenue(rev)

    const revByDay: ChartDay[] = days.map((d) => ({
      label: d.label,
      value: allOrders.filter((o) => {
        const od = new Date(o.created_at)
        return od >= d.date && od < new Date(d.date.getTime() + 86400000)
      }).reduce((s, o) => s + (o.total_price || 0), 0),
    }))
    const ordersByDay: ChartDay[] = days.map((d) => ({
      label: d.label,
      value: allOrders.filter((o) => {
        const od = new Date(o.created_at)
        return od >= d.date && od < new Date(d.date.getTime() + 86400000)
      }).length,
    }))
    setRevenueChart(revByDay)
    setOrdersChart(ordersByDay)
    setOutOfStock((productsRes.data ?? []) as Product[])
    setRecentOrders((recentOrdersRes.data ?? []) as Order[])
    setRecentDeposits((recentDepositsRes.data ?? []) as DepositTransaction[])
    setDashLoading(false)
  }

  useEffect(() => {
    if (section === 'dashboard') loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // ---------- Users load ----------
  const loadUsers = async () => {
    setUsersLoading(true)
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100)
    if (userSearch.trim()) {
      query = query.ilike('username', `%${userSearch.trim()}%`)
    }
    const { data } = await query
    setUsers((data ?? []) as Profile[])
    setUsersLoading(false)
  }
  useEffect(() => {
    if (section === 'users') loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // ---------- Products load ----------
  const loadProducts = async () => {
    setProductsLoading(true)
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    ])
    setProducts((prodRes.data ?? []) as Product[])
    setCategories((catRes.data ?? []) as Category[])
    setProductsLoading(false)
  }
  useEffect(() => {
    if (section === 'products') loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // ---------- Categories load ----------
  const loadCategories = async () => {
    setCatsLoading(true)
    const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
    setCategories((data ?? []) as Category[])
    setCatsLoading(false)
  }
  useEffect(() => {
    if (section === 'categories') loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // ---------- Deposits load ----------
  const loadDeposits = async () => {
    setDepositsLoading(true)
    const { data } = await supabase.from('deposit_transactions').select('*').order('created_at', { ascending: false }).limit(100)
    setDeposits((data ?? []) as DepositTransaction[])
    setDepositsLoading(false)
  }
  useEffect(() => {
    if (section === 'deposits') loadDeposits()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // ---------- Tickets load ----------
  const loadTickets = async () => {
    setTicketsLoading(true)
    const { data } = await supabase
      .from('support_tickets')
      .select('*, profiles(username, customer_id)')
      .order('updated_at', { ascending: false })
      .limit(100)
    setTickets((data ?? []) as (SupportTicket & { profiles?: Pick<Profile, 'username' | 'customer_id'> })[])
    setTicketsLoading(false)
  }
  useEffect(() => {
    if (section === 'tickets') loadTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // ---------- Banners load ----------
  const loadBanners = async () => {
    setBannersLoading(true)
    const { data } = await supabase.from('banners').select('*').order('sort_order', { ascending: true })
    setBanners((data ?? []) as Banner[])
    setBannersLoading(false)
  }
  useEffect(() => {
    if (section === 'banners') loadBanners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // ---------- Settings load ----------
  const loadSettings = async () => {
    setSettingsLoading(true)
    const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
    setSettings(data as SiteSettings | null)
    setSettingsLoading(false)
  }
  useEffect(() => {
    if (section === 'settings') loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  // ---------- Actions ----------
  const handleBanToggle = async (u: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_banned: !u.is_banned }).eq('id', u.id)
    if (error) {
      toaster.create({ type: 'error', title: 'Thất bại', description: error.message })
      return
    }
    setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, is_banned: !p.is_banned } : p)))
    toaster.create({ type: 'success', title: u.is_banned ? 'Đã bỏ ban' : 'Đã ban', description: u.username })
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pName.trim() || !pSlug.trim()) {
      toaster.create({ type: 'error', title: 'Thiếu thông tin', description: 'Vui lòng nhập tên và slug' })
      return
    }
    setAddingProduct(true)
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: pName.trim(),
        slug: pSlug.trim(),
        type: pType,
        price: Number(pPrice) || 0,
        original_price: pOrigPrice ? Number(pOrigPrice) : null,
        stock: Number(pStock) || 0,
        category_id: pCategory || null,
        short_description: pShortDesc.trim() || null,
        is_active: true,
      })
      .select()
      .single()
    if (error || !data) {
      toaster.create({ type: 'error', title: 'Thêm sản phẩm thất bại', description: error?.message })
      setAddingProduct(false)
      return
    }
    setProducts((prev) => [data as Product, ...prev])
    setPName(''); setPSlug(''); setPType('acc'); setPPrice(''); setPOrigPrice(''); setPStock('0'); setPCategory(''); setPShortDesc('')
    setShowAddProduct(false)
    setAddingProduct(false)
    toaster.create({ type: 'success', title: 'Đã thêm sản phẩm' })
  }

  const handleAddInventory = async () => {
    if (!inventoryProduct || !inventoryText.trim()) return
    const lines = inventoryText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) {
      toaster.create({ type: 'error', title: 'Không có nội dung', description: 'Mỗi dòng là một item' })
      return
    }
    setAddingInventory(true)
    const rows = lines.map((content) => ({ product_id: inventoryProduct.id, content }))
    const { error } = await supabase.from('product_inventory').insert(rows)
    if (error) {
      toaster.create({ type: 'error', title: 'Thêm kho thất bại', description: error.message })
      setAddingInventory(false)
      return
    }
    // Update stock count locally
    setProducts((prev) => prev.map((p) => (p.id === inventoryProduct.id ? { ...p, stock: p.stock + lines.length } : p)))
    if (inventoryProduct) {
      setInventoryProduct({ ...inventoryProduct, stock: inventoryProduct.stock + lines.length })
    }
    setInventoryText('')
    setAddingInventory(false)
    toaster.create({ type: 'success', title: `Đã thêm ${lines.length} item vào kho` })
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!catName.trim() || !catSlug.trim()) {
      toaster.create({ type: 'error', title: 'Thiếu thông tin', description: 'Vui lòng nhập tên và slug' })
      return
    }
    setAddingCat(true)
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: catName.trim(),
        slug: catSlug.trim(),
        icon: catIcon.trim() || null,
        sort_order: Number(catSort) || 0,
        is_active: true,
      })
      .select()
      .single()
    if (error || !data) {
      toaster.create({ type: 'error', title: 'Thêm danh mục thất bại', description: error?.message })
      setAddingCat(false)
      return
    }
    setCategories((prev) => [...prev, data as Category])
    setCatName(''); setCatSlug(''); setCatIcon(''); setCatSort('0')
    setShowAddCat(false)
    setAddingCat(false)
    toaster.create({ type: 'success', title: 'Đã thêm danh mục' })
  }

  const handleStartEditCat = (c: Category) => {
    setEditCatId(c.id)
    setEditCatName(c.name)
    setEditCatSlug(c.slug)
    setEditCatIcon(c.icon || '')
    setEditCatSort(String(c.sort_order))
  }

  const handleSaveEditCat = async () => {
    if (!editCatId || !editCatName.trim() || !editCatSlug.trim()) return
    const { error } = await supabase
      .from('categories')
      .update({
        name: editCatName.trim(),
        slug: editCatSlug.trim(),
        icon: editCatIcon.trim() || null,
        sort_order: Number(editCatSort) || 0,
      })
      .eq('id', editCatId)
    if (error) {
      toaster.create({ type: 'error', title: 'Cập nhật thất bại', description: error.message })
      return
    }
    setCategories((prev) => prev.map((c) => (c.id === editCatId ? { ...c, name: editCatName.trim(), slug: editCatSlug.trim(), icon: editCatIcon.trim() || null, sort_order: Number(editCatSort) || 0 } : c)))
    setEditCatId(null)
    toaster.create({ type: 'success', title: 'Đã cập nhật danh mục' })
  }

  const handleToggleCat = async (c: Category) => {
    const { error } = await supabase.from('categories').update({ is_active: !c.is_active }).eq('id', c.id)
    if (error) {
      toaster.create({ type: 'error', title: 'Thất bại' })
      return
    }
    setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !x.is_active } : x)))
  }

  const handleDeleteCat = async (c: Category) => {
    const { error } = await supabase.from('categories').delete().eq('id', c.id)
    if (error) {
      toaster.create({ type: 'error', title: 'Xóa thất bại', description: error.message })
      return
    }
    setCategories((prev) => prev.filter((x) => x.id !== c.id))
    toaster.create({ type: 'success', title: 'Đã xóa danh mục' })
  }

  const handleApproveDeposit = async (d: DepositTransaction) => {
    const { error: depErr } = await supabase
      .from('deposit_transactions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', d.id)
    if (depErr) {
      toaster.create({ type: 'error', title: 'Duyệt thất bại', description: depErr.message })
      return
    }
    // Credit balance
    const { data: prof } = await supabase.from('profiles').select('balance, total_deposited').eq('id', d.user_id).maybeSingle()
    if (prof) {
      await supabase
        .from('profiles')
        .update({ balance: (prof as { balance: number }).balance + d.amount, total_deposited: (prof as { total_deposited: number }).total_deposited + d.amount })
        .eq('id', d.user_id)
    }
    setDeposits((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: 'completed' } : x)))
    toaster.create({ type: 'success', title: 'Đã duyệt nạp tiền', description: formatCurrency(d.amount) })
  }

  const handleSelectTicket = async (t: (SupportTicket & { profiles?: Pick<Profile, 'username' | 'customer_id'> }) | null) => {
    setSelectedTicket(t)
    if (!t) {
      setTicketMessages([])
      return
    }
    const { data } = await supabase.from('ticket_messages').select('*').eq('ticket_id', t.id).order('created_at', { ascending: true })
    setTicketMessages((data ?? []) as TicketMessage[])
  }

  const handleTicketReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedTicket || !ticketReply.trim()) return
    setSendingReply(true)
    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({ ticket_id: selectedTicket.id, sender_id: user.id, sender_type: 'admin', message: ticketReply.trim() })
      .select()
      .single()
    if (error || !data) {
      toaster.create({ type: 'error', title: 'Gửi thất bại', description: error?.message })
      setSendingReply(false)
      return
    }
    setTicketMessages((prev) => [...prev, data as TicketMessage])
    // Update ticket status to pending and updated_at
    await supabase.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', selectedTicket.id)
    setTicketReply('')
    setSendingReply(false)
  }

  const handleTicketStatus = async (status: string) => {
    if (!selectedTicket) return
    const { error } = await supabase.from('support_tickets').update({ status }).eq('id', selectedTicket.id)
    if (error) {
      toaster.create({ type: 'error', title: 'Cập nhật thất bại' })
      return
    }
    const updated = { ...selectedTicket, status }
    setSelectedTicket(updated)
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    toaster.create({ type: 'success', title: 'Đã cập nhật trạng thái' })
  }

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bTitle.trim()) {
      toaster.create({ type: 'error', title: 'Thiếu tiêu đề' })
      return
    }
    setAddingBanner(true)
    const { data, error } = await supabase
      .from('banners')
      .insert({
        title: bTitle.trim(),
        subtitle: bSubtitle.trim() || null,
        image_url: bImageUrl.trim() || null,
        link_url: bLinkUrl.trim() || null,
        button_text: bButtonText.trim() || null,
        sort_order: Number(bSortOrder) || 0,
        is_active: true,
      })
      .select()
      .single()
    if (error || !data) {
      toaster.create({ type: 'error', title: 'Thêm banner thất bại', description: error?.message })
      setAddingBanner(false)
      return
    }
    setBanners((prev) => [...prev, data as Banner])
    setBTitle(''); setBSubtitle(''); setBImageUrl(''); setBLinkUrl(''); setBButtonText(''); setBSortOrder('0')
    setShowAddBanner(false)
    setAddingBanner(false)
    toaster.create({ type: 'success', title: 'Đã thêm banner' })
  }

  const handleToggleBanner = async (b: Banner) => {
    const { error } = await supabase.from('banners').update({ is_active: !b.is_active }).eq('id', b.id)
    if (error) {
      toaster.create({ type: 'error', title: 'Thất bại' })
      return
    }
    setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, is_active: !x.is_active } : x)))
  }

  const handleDeleteBanner = async (b: Banner) => {
    const { error } = await supabase.from('banners').delete().eq('id', b.id)
    if (error) {
      toaster.create({ type: 'error', title: 'Xóa thất bại' })
      return
    }
    setBanners((prev) => prev.filter((x) => x.id !== b.id))
    toaster.create({ type: 'success', title: 'Đã xóa banner' })
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    setSavingSettings(true)
    const { error } = await supabase.from('site_settings').update({
      site_name: settings.site_name,
      bank_id: settings.bank_id,
      bank_account: settings.bank_account,
      bank_name: settings.bank_name,
      primary_color: settings.primary_color,
      referral_reward: settings.referral_reward,
      maintenance_mode: settings.maintenance_mode,
      registration_enabled: settings.registration_enabled,
      deposit_enabled: settings.deposit_enabled,
    }).eq('id', 1)
    if (error) {
      toaster.create({ type: 'error', title: 'Lưu thất bại', description: error.message })
      setSavingSettings(false)
      return
    }
    setSavingSettings(false)
    toaster.create({ type: 'success', title: 'Đã lưu cài đặt' })
  }

  const navItems: { key: Section; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LuTrendingUp size={18} /> },
    { key: 'users', label: 'Người Dùng', icon: <LuUsers size={18} /> },
    { key: 'products', label: 'Sản Phẩm', icon: <LuPackage size={18} /> },
    { key: 'categories', label: 'Danh Mục', icon: <LuTag size={18} /> },
    { key: 'deposits', label: 'Nạp Tiền', icon: <LuCircleDollarSign size={18} /> },
    { key: 'tickets', label: 'Tickets', icon: <LuHeadphones size={18} /> },
    { key: 'banners', label: 'Banners', icon: <LuImage size={18} /> },
    { key: 'settings', label: 'Cài Đặt', icon: <LuSettings size={18} /> },
  ]

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
      <Box pt="100px" pb={16} maxW="1400px" mx="auto" px={{ base: 4, md: 6 }}>
        <Toaster />

        {/* Heading */}
        <HStack gap={2} mb={6}>
          <LuShield size={28} color="#a855f7" />
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
            Admin Panel
          </Text>
          <Badge color="red" ml={2}>
            <LuShield size={10} /> ADMIN
          </Badge>
        </HStack>

        <Grid templateColumns={{ base: '1fr', lg: '240px 1fr' }} gap={5} alignItems="start">
          {/* ===== SIDEBAR ===== */}
          <GlassCard p={0} overflow="hidden" position={{ lg: 'sticky' }} top="100px">
            <Box display={{ base: 'flex', lg: 'block' }} overflowX={{ base: 'auto', lg: 'visible' }} gap={2} p={{ base: 2, lg: 3 }}>
              {navItems.map((item) => (
                <Box
                  key={item.key}
                  as="button"
                  onClick={() => setSection(item.key)}
                  flexShrink={{ base: 0, lg: 'unset' }}
                  display="flex"
                  alignItems="center"
                  gap={3}
                  p={3}
                  borderRadius="xl"
                  w="full"
                  bg={section === item.key ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(59,130,246,0.15))' : 'transparent'}
                  border={section === item.key ? '1px solid rgba(168,85,247,0.4)' : '1px solid transparent'}
                  color={section === item.key ? '#a855f7' : 'rgba(255,255,255,0.6)'}
                  fontWeight={section === item.key ? 'bold' : 'medium'}
                  fontSize="sm"
                  cursor="pointer"
                  whiteSpace="nowrap"
                  _hover={{ bg: section === item.key ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(59,130,246,0.15))' : 'rgba(139,92,246,0.08)', color: 'white' }}
                  transition="all 0.2s"
                >
                  {item.icon}
                  <Text>{item.label}</Text>
                </Box>
              ))}
            </Box>
          </GlassCard>

          {/* ===== MAIN CONTENT ===== */}
          <Box minW={0}>
            {/* ---------- DASHBOARD ---------- */}
            {section === 'dashboard' && (
              <VStack gap={5} align="stretch">
                {dashLoading ? (
                  <Flex justify="center" py={10}><Spinner size="xl" color="#a855f7" /></Flex>
                ) : (
                  <>
                    <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
                      <StatCard icon={<LuUsers size={24} color="#a855f7" />} value={totalUsers.toLocaleString('vi-VN')} label="Tổng Người Dùng" glow="purple" color="#a855f7" />
                      <StatCard icon={<LuShoppingCart size={24} color="#06b6d4" />} value={totalOrders.toLocaleString('vi-VN')} label="Tổng Đơn Hàng" glow="cyan" color="#06b6d4" />
                      <StatCard icon={<LuCircleDollarSign size={24} color="#10b981" />} value={formatCurrency(totalRevenue)} label="Doanh Thu" glow="green" color="#10b981" />
                      <StatCard icon={<LuTrendingUp size={24} color="#ffd700" />} value="98.5%" label="Tỷ Lệ Hoàn Thành" glow="gold" color="#ffd700" />
                    </Grid>

                    <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={4}>
                      <BarChart data={revenueChart} color="#10b981" gradient="linear-gradient(180deg, #10b981, #059669)" label="Doanh Thu 7 Ngày" />
                      <BarChart data={ordersChart} color="#06b6d4" gradient="linear-gradient(180deg, #06b6d4, #0891b2)" label="Đơn Hàng 7 Ngày" />
                    </Grid>

                    {/* Inventory alerts */}
                    <GlassCard glow="purple" p={5}>
                      <HStack gap={2} mb={3}>
                        <LuCircleAlert size={18} color="#ef4444" />
                        <Text fontSize="md" fontWeight="bold" color="#ef4444">Cảnh Báo Tồn Kho</Text>
                        <Badge color="red">{outOfStock.length}</Badge>
                      </HStack>
                      {outOfStock.length === 0 ? (
                        <Text fontSize="sm" color="rgba(255,255,255,0.4)">Không có sản phẩm nào hết hàng</Text>
                      ) : (
                        <VStack gap={2} align="stretch">
                          {outOfStock.slice(0, 8).map((p) => (
                            <HStack key={p.id} justify="space-between" p={2} borderRadius="lg" bg="rgba(239,68,68,0.06)" border="1px solid rgba(239,68,68,0.15)">
                              <Text fontSize="sm" color="white" lineClamp={1}>{p.name}</Text>
                              <Badge color="red">Hết hàng</Badge>
                            </HStack>
                          ))}
                        </VStack>
                      )}
                    </GlassCard>

                    <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={4}>
                      {/* Recent orders */}
                      <GlassCard p={5}>
                        <Text fontSize="md" fontWeight="bold" color="white" mb={3}>Đơn Hàng Gần Đây</Text>
                        {recentOrders.length === 0 ? (
                          <Text fontSize="sm" color="rgba(255,255,255,0.4)">Chưa có đơn hàng</Text>
                        ) : (
                          <VStack gap={2} align="stretch">
                            {recentOrders.map((o) => (
                              <HStack key={o.id} justify="space-between" p={2} borderRadius="lg" bg="rgba(139,92,246,0.05)">
                                <Box minW={0}>
                                  <Text fontSize="xs" color="white" lineClamp={1}>{o.product_name}</Text>
                                  <Text fontSize="2xs" color="rgba(255,255,255,0.4)">{formatDate(o.created_at)}</Text>
                                </Box>
                                <Text fontSize="xs" fontWeight="bold" color="#06b6d4">{formatCurrency(o.total_price)}</Text>
                              </HStack>
                            ))}
                          </VStack>
                        )}
                      </GlassCard>

                      {/* Recent deposits */}
                      <GlassCard p={5}>
                        <Text fontSize="md" fontWeight="bold" color="white" mb={3}>Nạp Tiền Gần Đây</Text>
                        {recentDeposits.length === 0 ? (
                          <Text fontSize="sm" color="rgba(255,255,255,0.4)">Chưa có giao dịch</Text>
                        ) : (
                          <VStack gap={2} align="stretch">
                            {recentDeposits.map((d) => (
                              <HStack key={d.id} justify="space-between" p={2} borderRadius="lg" bg="rgba(139,92,246,0.05)">
                                <Box minW={0}>
                                  <Text fontSize="xs" color="white" lineClamp={1}>{d.transaction_code}</Text>
                                  <Text fontSize="2xs" color="rgba(255,255,255,0.4)">{formatDate(d.created_at)}</Text>
                                </Box>
                                <HStack gap={2}>
                                  <Text fontSize="xs" fontWeight="bold" color="#10b981">{formatCurrency(d.amount)}</Text>
                                  <Badge color={d.status === 'completed' ? 'green' : d.status === 'pending' ? 'gold' : 'purple'}>
                                    {d.status}
                                  </Badge>
                                </HStack>
                              </HStack>
                            ))}
                          </VStack>
                        )}
                      </GlassCard>
                    </Grid>
                  </>
                )}
              </VStack>
            )}

            {/* ---------- USERS ---------- */}
            {section === 'users' && (
              <GlassCard p={5}>
                <HStack gap={3} mb={4} flexWrap="wrap">
                  <Text fontSize="lg" fontWeight="bold" color="white">Quản Lý Người Dùng</Text>
                  <Box flex={1} minW="200px" position="relative">
                    <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                      <LuSearch size={16} color="rgba(168,85,247,0.6)" />
                    </Box>
                    <Input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') loadUsers() }}
                      placeholder="Tìm theo username..."
                      pl={10} h={10}
                      bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white"
                      _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
                      _focus={{ border: '1px solid rgba(168,85,247,0.6)' }}
                    />
                  </Box>
                  <Button size="sm" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" borderRadius="xl" _hover={{ opacity: 0.9 }} onClick={loadUsers}>
                    <LuSearch size={14} /> Tìm
                  </Button>
                </HStack>

                {usersLoading ? (
                  <Flex justify="center" py={6}><Spinner size="lg" color="#a855f7" /></Flex>
                ) : users.length === 0 ? (
                  <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" py={6}>Không tìm thấy người dùng</Text>
                ) : (
                  <VStack gap={2} align="stretch">
                    {users.map((u) => (
                      <HStack key={u.id} p={3} borderRadius="xl" bg="rgba(139,92,246,0.04)" border="1px solid rgba(139,92,246,0.08)" _hover={{ bg: 'rgba(139,92,246,0.08)' }} gap={3}>
                        <Box w={9} h={9} borderRadius="full" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" display="flex" alignItems="center" justifyContent="center" border="1px solid rgba(168,85,247,0.4)" flexShrink={0}>
                          <Text fontSize="sm" fontWeight="black" color="white">{u.username[0]?.toUpperCase() || '?'}</Text>
                        </Box>
                        <VStack gap={0} align="start" flex={1} minW={0}>
                          <AccyUsername username={u.username} rankKey={u.rank} fontSize="sm" />
                          <Text fontSize="2xs" color="rgba(255,255,255,0.4)">ID: {u.customer_id}</Text>
                        </VStack>
                        <Text fontSize="xs" fontWeight="bold" color="#10b981" flexShrink={0}>{formatCurrency(u.balance)}</Text>
                        <Badge color={u.role === 'admin' ? 'gold' : 'blue'} flexShrink={0}>{u.role}</Badge>
                        {u.is_banned && <Badge color="red" flexShrink={0}>Banned</Badge>}
                        <Button
                          size="xs"
                          variant="outline"
                          borderColor={u.is_banned ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}
                          color={u.is_banned ? '#10b981' : '#ef4444'}
                          _hover={{ bg: u.is_banned ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}
                          borderRadius="lg"
                          onClick={() => handleBanToggle(u)}
                          flexShrink={0}
                        >
                          {u.is_banned ? 'Bỏ Ban' : 'Ban'}
                        </Button>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </GlassCard>
            )}

            {/* ---------- PRODUCTS ---------- */}
            {section === 'products' && (
              <VStack gap={5} align="stretch">
                <GlassCard p={5}>
                  <HStack justify="space-between" mb={4}>
                    <Text fontSize="lg" fontWeight="bold" color="white">Quản Lý Sản Phẩm</Text>
                    <Button size="sm" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" borderRadius="xl" _hover={{ opacity: 0.9 }} onClick={() => setShowAddProduct((v) => !v)}>
                      <LuPlus size={14} /> Thêm Sản Phẩm
                    </Button>
                  </HStack>

                  {showAddProduct && (
                    <Box as="form" onSubmit={handleAddProduct} mb={4} p={4} borderRadius="xl" bg="rgba(15,10,30,0.4)" border="1px solid rgba(139,92,246,0.2)">
                      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
                        <VStack gap={1} align="stretch">
                          <Text fontSize="xs" color="rgba(255,255,255,0.6)">Tên sản phẩm</Text>
                          <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Tên..." h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                        </VStack>
                        <VStack gap={1} align="stretch">
                          <Text fontSize="xs" color="rgba(255,255,255,0.6)">Slug</Text>
                          <Input value={pSlug} onChange={(e) => setPSlug(e.target.value)} placeholder="slug..." h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                        </VStack>
                        <VStack gap={1} align="stretch">
                          <Text fontSize="xs" color="rgba(255,255,255,0.6)">Loại</Text>
                          <select value={pType} onChange={(e) => setPType(e.target.value as Product['type'])} style={selectStyle}>
                            {Object.entries(TYPE_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                          </select>
                        </VStack>
                        <VStack gap={1} align="stretch">
                          <Text fontSize="xs" color="rgba(255,255,255,0.6)">Danh mục</Text>
                          <select value={pCategory} onChange={(e) => setPCategory(e.target.value)} style={selectStyle}>
                            <option value="">Không</option>
                            {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                          </select>
                        </VStack>
                        <VStack gap={1} align="stretch">
                          <Text fontSize="xs" color="rgba(255,255,255,0.6)">Giá (VND)</Text>
                          <Input type="number" value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="0" h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                        </VStack>
                        <VStack gap={1} align="stretch">
                          <Text fontSize="xs" color="rgba(255,255,255,0.6)">Giá gốc (VND)</Text>
                          <Input type="number" value={pOrigPrice} onChange={(e) => setPOrigPrice(e.target.value)} placeholder="0" h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                        </VStack>
                        <VStack gap={1} align="stretch">
                          <Text fontSize="xs" color="rgba(255,255,255,0.6)">Số lượng</Text>
                          <Input type="number" value={pStock} onChange={(e) => setPStock(e.target.value)} placeholder="0" h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                        </VStack>
                      </Grid>
                      <VStack gap={1} align="stretch" mb={3}>
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Mô tả ngắn</Text>
                        <Input value={pShortDesc} onChange={(e) => setPShortDesc(e.target.value)} placeholder="Mô tả ngắn..." h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <Button type="submit" size="sm" bg="linear-gradient(135deg,#10b981,#059669)" color="white" borderRadius="xl" loading={addingProduct} loadingText="Đang thêm...">
                        <LuCheck size={14} /> Thêm
                      </Button>
                    </Box>
                  )}

                  {productsLoading ? (
                    <Flex justify="center" py={6}><Spinner size="lg" color="#a855f7" /></Flex>
                  ) : (
                    <VStack gap={2} align="stretch">
                      {products.map((p) => (
                        <HStack key={p.id} p={3} borderRadius="xl" bg="rgba(139,92,246,0.04)" border="1px solid rgba(139,92,246,0.08)" gap={3} _hover={{ bg: 'rgba(139,92,246,0.08)' }}>
                          <Box flex={1} minW={0}>
                            <Text fontSize="sm" fontWeight="bold" color="white" lineClamp={1}>{p.name}</Text>
                            <HStack gap={2} mt={1}>
                              <Badge color="purple">{TYPE_LABELS[p.type]}</Badge>
                              <Badge color={p.stock > 0 ? 'green' : 'red'}>{p.stock > 0 ? `Còn ${p.stock}` : 'Hết hàng'}</Badge>
                            </HStack>
                          </Box>
                          <Text fontSize="sm" fontWeight="bold" color="#ffd700" flexShrink={0}>{formatCurrency(p.price)}</Text>
                          <Button size="xs" variant="outline" borderColor="rgba(59,130,246,0.4)" color="#3b82f6" _hover={{ bg: 'rgba(59,130,246,0.1)' }} borderRadius="lg" onClick={() => { setInventoryProduct(p); setInventoryText('') }} flexShrink={0}>
                            <LuArchive size={12} /> Kho
                          </Button>
                        </HStack>
                      ))}
                    </VStack>
                  )}
                </GlassCard>

                {/* Inventory management */}
                {inventoryProduct && (
                  <GlassCard glow="blue" p={5}>
                    <HStack justify="space-between" mb={3}>
                      <VStack gap={0} align="start">
                        <Text fontSize="md" fontWeight="bold" color="white">Quản Lý Kho: {inventoryProduct.name}</Text>
                        <Text fontSize="xs" color="rgba(255,255,255,0.4)">Tồn kho hiện tại: {inventoryProduct.stock}</Text>
                      </VStack>
                      <Button size="xs" variant="ghost" color="rgba(255,255,255,0.5)" _hover={{ color: '#ef4444' }} onClick={() => setInventoryProduct(null)}>
                        <LuX size={14} /> Đóng
                      </Button>
                    </HStack>
                    <VStack gap={1.5} align="stretch" mb={3}>
                      <Text fontSize="xs" color="rgba(255,255,255,0.6)">Thêm item vào kho (mỗi dòng 1 item)</Text>
                      <Textarea
                        value={inventoryText}
                        onChange={(e) => setInventoryText(e.target.value)}
                        placeholder={'acc1@email.com:password\nacc2@email.com:password\n...'}
                        minH="120px"
                        bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white"
                        _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
                        _focus={{ border: '1px solid rgba(168,85,247,0.6)' }}
                      />
                    </VStack>
                    <Button size="sm" bg="linear-gradient(135deg,#3b82f6,#06b6d4)" color="white" borderRadius="xl" loading={addingInventory} loadingText="Đang thêm..." onClick={handleAddInventory}>
                      <LuPlus size={14} /> Thêm Vào Kho
                    </Button>
                  </GlassCard>
                )}
              </VStack>
            )}

            {/* ---------- CATEGORIES ---------- */}
            {section === 'categories' && (
              <GlassCard p={5}>
                <HStack justify="space-between" mb={4}>
                  <Text fontSize="lg" fontWeight="bold" color="white">Quản Lý Danh Mục</Text>
                  <Button size="sm" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" borderRadius="xl" _hover={{ opacity: 0.9 }} onClick={() => setShowAddCat((v) => !v)}>
                    <LuPlus size={14} /> Thêm Danh Mục
                  </Button>
                </HStack>

                {showAddCat && (
                  <Box as="form" onSubmit={handleAddCategory} mb={4} p={4} borderRadius="xl" bg="rgba(15,10,30,0.4)" border="1px solid rgba(139,92,246,0.2)">
                    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Tên danh mục</Text>
                        <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="VD: Tài khoản game..." h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Slug</Text>
                        <Input value={catSlug} onChange={(e) => setCatSlug(e.target.value)} placeholder="vd: tai-khoan-game" h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Icon (URL hoặc tên)</Text>
                        <Input value={catIcon} onChange={(e) => setCatIcon(e.target.value)} placeholder="https://... hoặc để trống" h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Thứ tự</Text>
                        <Input type="number" value={catSort} onChange={(e) => setCatSort(e.target.value)} placeholder="0" h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                    </Grid>
                    <Button type="submit" size="sm" bg="linear-gradient(135deg,#10b981,#059669)" color="white" borderRadius="xl" loading={addingCat} loadingText="Đang thêm...">
                      <LuCheck size={14} /> Thêm Danh Mục
                    </Button>
                  </Box>
                )}

                {catsLoading ? (
                  <Flex justify="center" py={6}><Spinner size="lg" color="#a855f7" /></Flex>
                ) : categories.length === 0 ? (
                  <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" py={6}>Chưa có danh mục nào. Thêm danh mục đầu tiên!</Text>
                ) : (
                  <VStack gap={2} align="stretch">
                    {categories.map((c) => (
                      <Box key={c.id} p={3} borderRadius="xl" bg="rgba(139,92,246,0.04)" border="1px solid rgba(139,92,246,0.08)" _hover={{ bg: 'rgba(139,92,246,0.08)' }} transition="all 0.2s">
                        {editCatId === c.id ? (
                          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={2}>
                            <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} placeholder="Tên" h={9} bg="rgba(15,10,30,0.5)" border="1px solid rgba(168,85,247,0.4)" borderRadius="lg" color="white" />
                            <Input value={editCatSlug} onChange={(e) => setEditCatSlug(e.target.value)} placeholder="Slug" h={9} bg="rgba(15,10,30,0.5)" border="1px solid rgba(168,85,247,0.4)" borderRadius="lg" color="white" />
                            <Input value={editCatIcon} onChange={(e) => setEditCatIcon(e.target.value)} placeholder="Icon" h={9} bg="rgba(15,10,30,0.5)" border="1px solid rgba(168,85,247,0.4)" borderRadius="lg" color="white" />
                            <Input type="number" value={editCatSort} onChange={(e) => setEditCatSort(e.target.value)} placeholder="Thứ tự" h={9} bg="rgba(15,10,30,0.5)" border="1px solid rgba(168,85,247,0.4)" borderRadius="lg" color="white" />
                            <HStack gap={2}>
                              <Button size="xs" bg="linear-gradient(135deg,#10b981,#059669)" color="white" borderRadius="lg" onClick={handleSaveEditCat}><LuCheck size={12} /> Lưu</Button>
                              <Button size="xs" variant="ghost" color="rgba(255,255,255,0.5)" borderRadius="lg" onClick={() => setEditCatId(null)}>Hủy</Button>
                            </HStack>
                          </Grid>
                        ) : (
                          <HStack gap={3} flexWrap="wrap">
                            <Box w={9} h={9} borderRadius="xl" bg="rgba(59,130,246,0.12)" border="1px solid rgba(59,130,246,0.3)" display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                              {c.icon ? <img src={c.icon} alt={c.name} style={{ width: 20, height: 20, objectFit: 'contain' }} /> : <LuTag size={16} color="#3b82f6" />}
                            </Box>
                            <Box flex={1} minW={0}>
                              <Text fontSize="sm" fontWeight="bold" color="white">{c.name}</Text>
                              <Text fontSize="2xs" color="rgba(255,255,255,0.4)">/{c.slug} • Thứ tự: {c.sort_order}</Text>
                            </Box>
                            <Badge color={c.is_active ? 'green' : 'red'} flexShrink={0}>{c.is_active ? 'Hiện' : 'Ẩn'}</Badge>
                            <Button size="xs" variant="outline" borderColor="rgba(59,130,246,0.4)" color="#3b82f6" _hover={{ bg: 'rgba(59,130,246,0.1)' }} borderRadius="lg" onClick={() => handleStartEditCat(c)} flexShrink={0}>
                              <LuPencil size={12} /> Sửa
                            </Button>
                            <Button size="xs" variant="outline" borderColor={c.is_active ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'} color={c.is_active ? '#ef4444' : '#10b981'} _hover={{ bg: c.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }} borderRadius="lg" onClick={() => handleToggleCat(c)} flexShrink={0}>
                              {c.is_active ? 'Ẩn' : 'Hiện'}
                            </Button>
                            <Button size="xs" variant="outline" borderColor="rgba(239,68,68,0.4)" color="#ef4444" _hover={{ bg: 'rgba(239,68,68,0.1)' }} borderRadius="lg" onClick={() => handleDeleteCat(c)} flexShrink={0}>
                              <LuTrash2 size={12} />
                            </Button>
                          </HStack>
                        )}
                      </Box>
                    ))}
                  </VStack>
                )}
              </GlassCard>
            )}

            {/* ---------- DEPOSITS ---------- */}
            {section === 'deposits' && (
              <GlassCard p={5}>
                <HStack justify="space-between" mb={4}>
                  <Text fontSize="lg" fontWeight="bold" color="white">Quản Lý Nạp Tiền</Text>
                  <Button size="sm" variant="outline" borderColor="rgba(168,85,247,0.4)" color="#a855f7" borderRadius="xl" _hover={{ bg: 'rgba(168,85,247,0.1)' }} onClick={loadDeposits}>
                    <LuRefreshCw size={14} /> Làm Mới
                  </Button>
                </HStack>
                {depositsLoading ? (
                  <Flex justify="center" py={6}><Spinner size="lg" color="#a855f7" /></Flex>
                ) : deposits.length === 0 ? (
                  <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" py={6}>Chưa có giao dịch nạp tiền</Text>
                ) : (
                  <VStack gap={2} align="stretch">
                    {deposits.map((d) => (
                      <HStack key={d.id} p={3} borderRadius="xl" bg="rgba(139,92,246,0.04)" border="1px solid rgba(139,92,246,0.08)" gap={3} flexWrap="wrap">
                        <Box flex={1} minW="150px">
                          <Text fontSize="sm" fontWeight="bold" color="white">{d.transaction_code}</Text>
                          <Text fontSize="2xs" color="rgba(255,255,255,0.4)">{formatDate(d.created_at)}</Text>
                        </Box>
                        <Text fontSize="sm" fontWeight="bold" color="#10b981" flexShrink={0}>{formatCurrency(d.amount)}</Text>
                        <Badge color={d.status === 'completed' ? 'green' : d.status === 'pending' ? 'gold' : 'red'} flexShrink={0}>{d.status}</Badge>
                        {d.status === 'pending' && (
                          <Button size="xs" bg="linear-gradient(135deg,#10b981,#059669)" color="white" borderRadius="lg" _hover={{ opacity: 0.9 }} onClick={() => handleApproveDeposit(d)} flexShrink={0}>
                            <LuCheck size={12} /> Duyệt
                          </Button>
                        )}
                      </HStack>
                    ))}
                  </VStack>
                )}
              </GlassCard>
            )}

            {/* ---------- TICKETS ---------- */}
            {section === 'tickets' && (
              <VStack gap={4} align="stretch">
                <GlassCard p={5}>
                  <HStack justify="space-between" mb={4}>
                    <Text fontSize="lg" fontWeight="bold" color="white">Quản Lý Tickets</Text>
                    <Button size="sm" variant="outline" borderColor="rgba(168,85,247,0.4)" color="#a855f7" borderRadius="xl" _hover={{ bg: 'rgba(168,85,247,0.1)' }} onClick={loadTickets}>
                      <LuRefreshCw size={14} /> Làm Mới
                    </Button>
                  </HStack>
                  {ticketsLoading ? (
                    <Flex justify="center" py={6}><Spinner size="lg" color="#a855f7" /></Flex>
                  ) : tickets.length === 0 ? (
                    <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" py={6}>Chưa có ticket nào</Text>
                  ) : (
                    <VStack gap={2} align="stretch">
                      {tickets.map((t) => (
                        <Box
                          key={t.id}
                          as="button"
                          onClick={() => handleSelectTicket(t)}
                          p={3}
                          textAlign="left"
                          borderRadius="xl"
                          bg={selectedTicket?.id === t.id ? 'rgba(168,85,247,0.12)' : 'rgba(139,92,246,0.04)'}
                          border="1px solid rgba(139,92,246,0.08)"
                          _hover={{ bg: selectedTicket?.id === t.id ? 'rgba(168,85,247,0.12)' : 'rgba(139,92,246,0.08)' }}
                          cursor="pointer"
                          transition="all 0.2s"
                        >
                          <HStack justify="space-between" mb={1}>
                            <Text fontSize="sm" fontWeight="bold" color="white" lineClamp={1}>{t.subject}</Text>
                            <Text fontSize="2xs" color="rgba(255,255,255,0.4)">{formatDate(t.updated_at)}</Text>
                          </HStack>
                          <HStack gap={1.5} flexWrap="wrap">
                            <Badge color="cyan">{t.status}</Badge>
                            <Badge color="gold">{t.priority}</Badge>
                            <Badge color="blue">{t.category}</Badge>
                            {t.profiles && <Text fontSize="2xs" color="rgba(255,255,255,0.5)">{t.profiles.username}</Text>}
                          </HStack>
                        </Box>
                      ))}
                    </VStack>
                  )}
                </GlassCard>

                {/* Ticket detail / chat */}
                {selectedTicket && (
                  <GlassCard glow="purple" p={0} overflow="hidden">
                    <Box p={4} borderBottom="1px solid rgba(139,92,246,0.15)">
                      <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
                        <VStack gap={1} align="start">
                          <Text fontSize="md" fontWeight="bold" color="white">{selectedTicket.subject}</Text>
                          {selectedTicket.profiles && (
                            <Text fontSize="xs" color="rgba(255,255,255,0.5)">Từ: {selectedTicket.profiles.username} (ID: {selectedTicket.profiles.customer_id})</Text>
                          )}
                        </VStack>
                        <HStack gap={2} flexWrap="wrap">
                          <Button size="xs" variant="outline" borderColor="rgba(16,185,129,0.4)" color="#10b981" _hover={{ bg: 'rgba(16,185,129,0.1)' }} borderRadius="lg" onClick={() => handleTicketStatus('resolved')}>
                            <LuCheck size={12} /> Đã Xử Lý
                          </Button>
                          <Button size="xs" variant="outline" borderColor="rgba(239,68,68,0.4)" color="#ef4444" _hover={{ bg: 'rgba(239,68,68,0.1)' }} borderRadius="lg" onClick={() => handleTicketStatus('closed')}>
                            <LuX size={12} /> Đóng
                          </Button>
                          <Button size="xs" variant="outline" borderColor="rgba(255,215,0,0.4)" color="#ffd700" _hover={{ bg: 'rgba(255,215,0,0.1)' }} borderRadius="lg" onClick={() => handleTicketStatus('pending')}>
                            Chờ Trả Lời
                          </Button>
                        </HStack>
                      </HStack>
                    </Box>

                    <Box maxH="400px" overflowY="auto" p={4}>
                      {ticketMessages.length === 0 ? (
                        <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" py={6}>Chưa có tin nhắn</Text>
                      ) : (
                        <VStack gap={3} align="stretch">
                          {ticketMessages.map((m) => (
                            <Flex key={m.id} justify={m.sender_type === 'admin' ? 'flex-end' : 'flex-start'} w="full">
                              <Box
                                maxW="80%" p={3} borderRadius="2xl"
                                bg={m.sender_type === 'admin' ? 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(59,130,246,0.9))' : 'rgba(30,20,50,0.85)'}
                                border={m.sender_type === 'admin' ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(139,92,246,0.2)'}
                                borderTopRightRadius={m.sender_type === 'admin' ? '4px' : '2xl'}
                                borderTopLeftRadius={m.sender_type === 'user' ? '4px' : '2xl'}
                              >
                                <Text fontSize="xs" fontWeight="bold" color={m.sender_type === 'admin' ? 'rgba(255,255,255,0.7)' : '#a855f7'} mb={1}>
                                  {m.sender_type === 'admin' ? 'Admin' : 'Khách'}
                                </Text>
                                <Text fontSize="sm" color="white" whiteSpace="pre-wrap" lineHeight="1.5">{m.message}</Text>
                                <Text fontSize="2xs" color="rgba(255,255,255,0.45)" mt={1.5} textAlign="right">{formatDate(m.created_at)}</Text>
                              </Box>
                            </Flex>
                          ))}
                        </VStack>
                      )}
                    </Box>

                    <Box p={4} borderTop="1px solid rgba(139,92,246,0.15)">
                      <form onSubmit={handleTicketReply}>
                        <HStack gap={2} align="end">
                          <Textarea
                            value={ticketReply}
                            onChange={(e) => setTicketReply(e.target.value)}
                            placeholder="Phản hồi với khách hàng..."
                            minH="48px" maxH="100px" resize="none" flex={1}
                            bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white"
                            _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
                            _focus={{ border: '1px solid rgba(168,85,247,0.6)' }}
                          />
                          <Button type="submit" size="lg" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" borderRadius="xl" _hover={{ opacity: 0.9 }} loading={sendingReply} loadingText="" flexShrink={0} h="48px" px={4}>
                            <LuSend size={18} />
                          </Button>
                        </HStack>
                      </form>
                    </Box>
                  </GlassCard>
                )}
              </VStack>
            )}

            {/* ---------- BANNERS ---------- */}
            {section === 'banners' && (
              <GlassCard p={5}>
                <HStack justify="space-between" mb={4}>
                  <Text fontSize="lg" fontWeight="bold" color="white">Quản Lý Banners</Text>
                  <Button size="sm" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" borderRadius="xl" _hover={{ opacity: 0.9 }} onClick={() => setShowAddBanner((v) => !v)}>
                    <LuPlus size={14} /> Thêm Banner
                  </Button>
                </HStack>

                {showAddBanner && (
                  <Box as="form" onSubmit={handleAddBanner} mb={4} p={4} borderRadius="xl" bg="rgba(15,10,30,0.4)" border="1px solid rgba(139,92,246,0.2)">
                    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3} mb={3}>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Tiêu đề</Text>
                        <Input value={bTitle} onChange={(e) => setBTitle(e.target.value)} placeholder="Tiêu đề..." h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Phụ đề</Text>
                        <Input value={bSubtitle} onChange={(e) => setBSubtitle(e.target.value)} placeholder="Phụ đề..." h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">URL hình ảnh</Text>
                        <Input value={bImageUrl} onChange={(e) => setBImageUrl(e.target.value)} placeholder="https://..." h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Link URL</Text>
                        <Input value={bLinkUrl} onChange={(e) => setBLinkUrl(e.target.value)} placeholder="/products" h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Text nút bấm</Text>
                        <Input value={bButtonText} onChange={(e) => setBButtonText(e.target.value)} placeholder="Xem ngay" h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Thứ tự</Text>
                        <Input type="number" value={bSortOrder} onChange={(e) => setBSortOrder(e.target.value)} placeholder="0" h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                    </Grid>
                    <Button type="submit" size="sm" bg="linear-gradient(135deg,#10b981,#059669)" color="white" borderRadius="xl" loading={addingBanner} loadingText="Đang thêm...">
                      <LuCheck size={14} /> Thêm Banner
                    </Button>
                  </Box>
                )}

                {bannersLoading ? (
                  <Flex justify="center" py={6}><Spinner size="lg" color="#a855f7" /></Flex>
                ) : banners.length === 0 ? (
                  <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" py={6}>Chưa có banner nào</Text>
                ) : (
                  <VStack gap={3} align="stretch">
                    {banners.map((b) => (
                      <HStack key={b.id} p={3} borderRadius="xl" bg="rgba(139,92,246,0.04)" border="1px solid rgba(139,92,246,0.08)" gap={3} _hover={{ bg: 'rgba(139,92,246,0.08)' }}>
                        <Box w={16} h={16} borderRadius="lg" overflow="hidden" flexShrink={0} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.15)">
                          {b.image_url ? (
                            <img src={b.image_url} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Flex w="full" h="full" align="center" justify="center">
                              <LuImage size={20} color="rgba(168,85,247,0.4)" />
                            </Flex>
                          )}
                        </Box>
                        <Box flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="bold" color="white" lineClamp={1}>{b.title}</Text>
                          {b.subtitle && <Text fontSize="xs" color="rgba(255,255,255,0.5)" lineClamp={1}>{b.subtitle}</Text>}
                          <Text fontSize="2xs" color="rgba(255,255,255,0.4)">Thứ tự: {b.sort_order}</Text>
                        </Box>
                        <Badge color={b.is_active ? 'green' : 'red'} flexShrink={0}>{b.is_active ? 'Hiện' : 'Ẩn'}</Badge>
                        <Button size="xs" variant="outline" borderColor={b.is_active ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'} color={b.is_active ? '#ef4444' : '#10b981'} _hover={{ bg: b.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }} borderRadius="lg" onClick={() => handleToggleBanner(b)} flexShrink={0}>
                          {b.is_active ? 'Ẩn' : 'Hiện'}
                        </Button>
                        <Button size="xs" variant="outline" borderColor="rgba(239,68,68,0.4)" color="#ef4444" _hover={{ bg: 'rgba(239,68,68,0.1)' }} borderRadius="lg" onClick={() => handleDeleteBanner(b)} flexShrink={0}>
                          <LuTrash2 size={12} />
                        </Button>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </GlassCard>
            )}

            {/* ---------- SETTINGS ---------- */}
            {section === 'settings' && (
              <GlassCard p={5}>
                <Text fontSize="lg" fontWeight="bold" color="white" mb={4}>Cài Đặt Hệ Thống</Text>
                {settingsLoading ? (
                  <Flex justify="center" py={6}><Spinner size="lg" color="#a855f7" /></Flex>
                ) : !settings ? (
                  <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" py={6}>Chưa có cài đặt. Vui lòng khởi tạo trong database.</Text>
                ) : (
                  <VStack gap={4} align="stretch">
                    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={3}>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Tên trang web</Text>
                        <Input value={settings.site_name} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Mã ngân hàng (Bank ID)</Text>
                        <Input value={settings.bank_id} onChange={(e) => setSettings({ ...settings, bank_id: e.target.value })} h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Số tài khoản</Text>
                        <Input value={settings.bank_account} onChange={(e) => setSettings({ ...settings, bank_account: e.target.value })} h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Tên ngân hàng</Text>
                        <Input value={settings.bank_name} onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })} h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Màu chủ đạo</Text>
                        <Input value={settings.primary_color} onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })} h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                      <VStack gap={1} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)">Phần thưởng giới thiệu</Text>
                        <Input type="number" value={settings.referral_reward} onChange={(e) => setSettings({ ...settings, referral_reward: Number(e.target.value) })} h={10} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _focus={{ border: '1px solid rgba(168,85,247,0.6)' }} />
                      </VStack>
                    </Grid>

                    <Separator my={2} />

                    <VStack gap={3} align="stretch">
                      <HStack justify="space-between" p={3} borderRadius="xl" bg="rgba(139,92,246,0.04)" border="1px solid rgba(139,92,246,0.08)">
                        <VStack gap={0} align="start">
                          <Text fontSize="sm" fontWeight="bold" color="white">Chế Độ Bảo Trì</Text>
                          <Text fontSize="xs" color="rgba(255,255,255,0.4)">Tạm khóa trang web cho người dùng</Text>
                        </VStack>
                        <Switch checked={settings.maintenance_mode} onCheckedChange={(e) => setSettings({ ...settings, maintenance_mode: e.checked })} />
                      </HStack>
                      <HStack justify="space-between" p={3} borderRadius="xl" bg="rgba(139,92,246,0.04)" border="1px solid rgba(139,92,246,0.08)">
                        <VStack gap={0} align="start">
                          <Text fontSize="sm" fontWeight="bold" color="white">Đăng Ký Mới</Text>
                          <Text fontSize="xs" color="rgba(255,255,255,0.4)">Cho phép đăng ký tài khoản mới</Text>
                        </VStack>
                        <Switch checked={settings.registration_enabled} onCheckedChange={(e) => setSettings({ ...settings, registration_enabled: e.checked })} />
                      </HStack>
                      <HStack justify="space-between" p={3} borderRadius="xl" bg="rgba(139,92,246,0.04)" border="1px solid rgba(139,92,246,0.08)">
                        <VStack gap={0} align="start">
                          <Text fontSize="sm" fontWeight="bold" color="white">Nạp Tiền</Text>
                          <Text fontSize="xs" color="rgba(255,255,255,0.4)">Cho phép giao dịch nạp tiền</Text>
                        </VStack>
                        <Switch checked={settings.deposit_enabled} onCheckedChange={(e) => setSettings({ ...settings, deposit_enabled: e.checked })} />
                      </HStack>
                    </VStack>

                    <Button size="md" bg="linear-gradient(135deg,#7c3aed,#3b82f6,#06b6d4)" color="white" fontWeight="bold" borderRadius="xl" _hover={{ opacity: 0.9 }} loading={savingSettings} loadingText="Đang lưu..." onClick={handleSaveSettings} alignSelf="flex-start">
                      <LuCheck size={16} /> Lưu Cài Đặt
                    </Button>
                  </VStack>
                )}
              </GlassCard>
            )}
          </Box>
        </Grid>
      </Box>
    </motion.div>
  )
}
