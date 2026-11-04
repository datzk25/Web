import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Box, Flex, HStack, VStack, Text, Button, Input, IconButton } from '@chakra-ui/react'
import {
  LuGamepad2, LuWallet, LuUser, LuMenu, LuX, LuBell, LuShield, LuChevronDown,
  LuLogOut, LuHistory, LuSearch, LuArrowRight, LuCircleCheck, LuCircleX,
  LuShoppingCart, LuHeadphones,
} from 'react-icons/lu'
import { useAuth } from '../lib/auth'
import { useCart } from '../lib/cart'
import { supabase, formatCurrency, type Notification } from '../lib/supabase'
import { AccyUsername, RankBadge } from './AccyUsername'
import { GoldText } from './GlassCard'
import { ColorModeButton } from './ui/color-mode'

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) cb() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, cb])
}

export function Header() {
  const { user, profile, signOut } = useAuth()
  const { totalItems: cartCount } = useCart()
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useClickOutside(userMenuRef, () => setUserMenuOpen(false))
  useClickOutside(notifRef, () => setNotifOpen(false))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (user) {
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
        .then(({ data }) => { if (data) { setNotifications(data); setUnreadCount(data.filter((n) => !n.is_read).length) } })
    }
  }, [user])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) { navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`); setMenuOpen(false) }
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const navLinks = [
    { to: '/', label: 'Trang Chủ' },
    { to: '/products', label: 'Sản Phẩm' },
    { to: '/deposit', label: 'Nạp Tiền' },
    { to: '/support', label: 'Hỗ Trợ' },
  ]

  const headerBg = scrolled ? 'rgba(10,7,20,0.85)' : 'rgba(10,7,20,0.5)'
  const headerBorder = scrolled ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent'
  const headerShadow = scrolled ? '0 8px 32px rgba(0,0,0,0.4)' : 'none'

  return (
    <>
      <Box
        as="header"
        position="fixed"
        top={{ base: 2, md: 3 }}
        left={{ base: 2, md: 4 }}
        right={{ base: 2, md: 4 }}
        zIndex={100}
        bg={headerBg}
        backdropFilter="blur(24px)"
        border={headerBorder}
        borderRadius="2xl"
        boxShadow={headerShadow}
        transition="all 0.35s cubic-bezier(0.22,1,0.36,1)"
        px={{ base: 3, md: 5 }}
        py={{ base: 2, md: 3 }}
      >
        <Flex align="center" justify="space-between" gap={3}>
          {/* Logo */}
          <Link to="/">
            <HStack gap={2} flexShrink={0}>
              <Box p={1.5} borderRadius="xl" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" boxShadow="0 0 20px rgba(124,58,237,0.4)" css={{ animation: 'glow-pulse 3s ease-in-out infinite' }}>
                <LuGamepad2 size={18} color="white" />
              </Box>
              <GoldText fontSize="lg" fontWeight="black">NovaXStore</GoldText>
            </HStack>
          </Link>

          {/* Desktop nav */}
          <HStack gap={1} flexShrink={0} hideBelow="md">
            {navLinks.map((link) => {
              const active = location.pathname === link.to
              return (
                <Link key={link.to} to={link.to}>
                  <Box
                    as="span"
                    display="inline-block"
                    px={3} py={1.5}
                    fontSize="sm" fontWeight="semibold"
                    color={active ? 'white' : 'rgba(255,255,255,0.5)'}
                    borderRadius="xl"
                    bg={active ? 'rgba(139,92,246,0.15)' : 'transparent'}
                    border={active ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent'}
                    _hover={{ bg: 'rgba(139,92,246,0.1)', color: 'white' }}
                    transition="all 0.25s"
                  >
                    {link.label}
                  </Box>
                </Link>
              )
            })}
          </HStack>

          {/* Search bar - desktop */}
          <Box as="form" onSubmit={handleSearch} position="relative" flex={1} maxW="300px" hideBelow="md">
            <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
              <LuSearch size={14} color="rgba(168,85,247,0.6)" />
            </Box>
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm sản phẩm..." pl={9} h={9} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} _focus={{ border: '1px solid rgba(168,85,247,0.6)', boxShadow: '0 0 0 3px rgba(168,85,247,0.1)' }} fontSize="sm" />
          </Box>

          {/* Right actions */}
          <HStack gap={2} flexShrink={0}>
            {/* Cart */}
            <Link to="/cart">
              <Box position="relative" display="inline-flex">
                <IconButton aria-label="Giỏ hàng" variant="ghost" color="white" size="sm" _hover={{ bg: 'rgba(139,92,246,0.15)' }}>
                  <LuShoppingCart size={16} />
                </IconButton>
                {cartCount > 0 && (
                  <Box position="absolute" top={-1} right={-1} minW={4} h={4} px={1} borderRadius="full" bg="#a855f7" display="flex" alignItems="center" justifyContent="center" fontSize="2xs" fontWeight="bold" color="white" boxShadow="0 0 8px rgba(168,85,247,0.6)">
                    {cartCount > 9 ? '9+' : cartCount}
                  </Box>
                )}
              </Box>
            </Link>

            {/* Notifications */}
            {user && (
              <Box position="relative" ref={notifRef}>
                <IconButton aria-label="Thông báo" variant="ghost" color="white" size="sm" _hover={{ bg: 'rgba(139,92,246,0.15)' }} onClick={() => setNotifOpen(!notifOpen)}>
                  <Box position="relative">
                    <LuBell size={16} />
                    {unreadCount > 0 && (
                      <Box position="absolute" top={-2} right={-2} minW={3.5} h={3.5} px={1} borderRadius="full" bg="#ef4444" display="flex" alignItems="center" justifyContent="center" fontSize="2xs" fontWeight="bold" color="white" boxShadow="0 0 6px rgba(239,68,68,0.5)">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Box>
                    )}
                  </Box>
                </IconButton>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 200 }}>
                      <Box w="320px" maxH="400px" overflowY="auto" p={3} borderRadius="2xl" bg="rgba(15,10,30,0.95)" backdropFilter="blur(20px)" border="1px solid rgba(139,92,246,0.2)" boxShadow="0 12px 40px rgba(0,0,0,0.5)">
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontSize="sm" fontWeight="bold" color="white">Thông Báo</Text>
                          {unreadCount > 0 && <Button size="xs" variant="ghost" color="#a855f7" onClick={markAllRead}>Đọc tất cả</Button>}
                        </Flex>
                        {notifications.length === 0 ? (
                          <Text fontSize="xs" color="rgba(255,255,255,0.3)" textAlign="center" py={4}>Chưa có thông báo</Text>
                        ) : (
                          <VStack gap={1} align="stretch">
                            {notifications.map((n) => (
                              <Box key={n.id} p={2} borderRadius="lg" bg={n.is_read ? 'transparent' : 'rgba(139,92,246,0.08)'} border="1px solid rgba(139,92,246,0.08)">
                                <Text fontSize="xs" fontWeight="semibold" color="white" lineClamp={1}>{n.title}</Text>
                                <Text fontSize="xs" color="rgba(255,255,255,0.4)" lineClamp={2}>{n.message}</Text>
                              </Box>
                            ))}
                          </VStack>
                        )}
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            )}

            {/* User menu / Login */}
            {user && profile ? (
              <Box position="relative" ref={userMenuRef}>
                <Button variant="ghost" color="white" size="sm" _hover={{ bg: 'rgba(139,92,246,0.15)' }} onClick={() => setUserMenuOpen(!userMenuOpen)} px={2}>
                  <HStack gap={2}>
                    <Box w={7} h={7} borderRadius="full" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" display="flex" alignItems="center" justifyContent="center" border="1px solid rgba(168,85,247,0.4)" boxShadow="0 0 12px rgba(168,85,247,0.3)">
                      <Text fontSize="xs" fontWeight="black" color="white">{profile.username[0].toUpperCase()}</Text>
                    </Box>
                    <Box hideBelow="sm" textAlign="left">
                      <AccyUsername username={profile.username} rankKey={profile.rank} fontSize="xs" />
                    </Box>
                    <LuChevronDown size={12} color="rgba(255,255,255,0.4)" />
                  </HStack>
                </Button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 200 }}>
                      <Box w="260px" p={3} borderRadius="2xl" bg="rgba(15,10,30,0.95)" backdropFilter="blur(20px)" border="1px solid rgba(139,92,246,0.2)" boxShadow="0 12px 40px rgba(0,0,0,0.5)">
                        <Box p={2} mb={2} borderRadius="xl" bg="rgba(139,92,246,0.08)" border="1px solid rgba(139,92,246,0.15)">
                          <HStack gap={2} mb={1}>
                            <Box w={9} h={9} borderRadius="full" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" display="flex" alignItems="center" justifyContent="center" border="1px solid rgba(168,85,247,0.4)" boxShadow="0 0 12px rgba(168,85,247,0.3)">
                              <Text fontSize="sm" fontWeight="black" color="white">{profile.username[0].toUpperCase()}</Text>
                            </Box>
                            <Box flex={1} minW={0}>
                              <AccyUsername username={profile.username} rankKey={profile.rank} fontSize="sm" />
                              <Text fontSize="2xs" color="rgba(255,255,255,0.4)">#{profile.customer_id}</Text>
                            </Box>
                          </HStack>
                          <HStack gap={1} mt={1}>
                            <RankBadge rankKey={profile.rank} size="xs" />
                            {profile.role === 'admin' && <Box as="span" display="inline-flex" alignItems="center" gap={1} px={1.5} py={0.5} fontSize="2xs" fontWeight="bold" borderRadius="full" bg="rgba(168,85,247,0.15)" border="1px solid rgba(168,85,247,0.3)" color="#a855f7"><LuShield size={8} />Admin</Box>}
                          </HStack>
                          <Flex align="center" justify="space-between" mt={2} pt={2} borderTop="1px solid rgba(139,92,246,0.1)">
                            <Text fontSize="2xs" color="rgba(255,255,255,0.4)">Số dư</Text>
                            <Text fontSize="sm" fontWeight="black" color="#06b6d4">{formatCurrency(profile.balance)}</Text>
                          </Flex>
                        </Box>
                        <VStack gap={1} align="stretch">
                          {[
                            { to: '/profile', icon: LuUser, label: 'Hồ Sơ Cá Nhân' },
                            { to: '/transactions', icon: LuHistory, label: 'Lịch Sử Giao Dịch' },
                            { to: '/deposit', icon: LuWallet, label: 'Nạp Tiền' },
                            { to: '/support', icon: LuHeadphones, label: 'Hỗ Trợ' },
                          ].map((item) => (
                            <Link key={item.to} to={item.to} onClick={() => setUserMenuOpen(false)}>
                              <HStack gap={2} px={2} py={1.5} borderRadius="lg" _hover={{ bg: 'rgba(139,92,246,0.1)' }} transition="all 0.2s">
                                <item.icon size={14} color="#a855f7" />
                                <Text fontSize="sm" color="rgba(255,255,255,0.7)">{item.label}</Text>
                              </HStack>
                            </Link>
                          ))}
                          {profile.role === 'admin' && (
                            <Link to="/admin" onClick={() => setUserMenuOpen(false)}>
                              <HStack gap={2} px={2} py={1.5} borderRadius="lg" _hover={{ bg: 'rgba(168,85,247,0.1)' }} transition="all 0.2s">
                                <LuShield size={14} color="#a855f7" />
                                <Text fontSize="sm" color="rgba(255,255,255,0.7)">Admin Panel</Text>
                              </HStack>
                            </Link>
                          )}
                          <Box h={1} bg="rgba(139,92,246,0.1)" borderRadius="full" my={1} />
                          <HStack gap={2} px={2} py={1.5} borderRadius="lg" _hover={{ bg: 'rgba(239,68,68,0.1)' }} transition="all 0.2s" cursor="pointer" onClick={() => { signOut(); setUserMenuOpen(false); navigate('/') }}>
                            <LuLogOut size={14} color="#ef4444" />
                            <Text fontSize="sm" color="#ef4444">Đăng Xuất</Text>
                          </HStack>
                        </VStack>
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            ) : (
              <HStack gap={2} hideBelow="sm">
                <Link to="/login"><Button variant="ghost" color="white" size="sm" _hover={{ bg: 'rgba(139,92,246,0.15)' }}>Đăng Nhập</Button></Link>
                <Link to="/register">
                  <Button size="sm" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" _hover={{ opacity: 0.9, transform: 'translateY(-1px)' }} boxShadow="0 4px 16px rgba(124,58,237,0.4)" borderRadius="xl">
                    Đăng Ký <LuArrowRight size={12} />
                  </Button>
                </Link>
              </HStack>
            )}

            {/* Mobile menu toggle */}
            <IconButton aria-label="Menu" display={{ base: 'flex', md: 'none' }} variant="ghost" color="white" size="sm" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <LuX size={18} /> : <LuMenu size={18} />}
            </IconButton>
          </HStack>
        </Flex>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
              <VStack gap={2} align="stretch" mt={3} pt={3} borderTop="1px solid rgba(139,92,246,0.15)">
                <Box as="form" onSubmit={handleSearch} position="relative">
                  <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}><LuSearch size={14} color="rgba(168,85,247,0.6)" /></Box>
                  <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm sản phẩm..." pl={9} bg="rgba(15,10,30,0.5)" border="1px solid rgba(139,92,246,0.2)" borderRadius="xl" color="white" _placeholder={{ color: 'rgba(255,255,255,0.3)' }} fontSize="sm" />
                </Box>
                {navLinks.map((link) => (
                  <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
                    <Box px={3} py={2} borderRadius="xl" bg={location.pathname === link.to ? 'rgba(139,92,246,0.15)' : 'transparent'} _hover={{ bg: 'rgba(139,92,246,0.1)' }}>
                      <Text fontSize="sm" color={location.pathname === link.to ? 'white' : 'rgba(255,255,255,0.6)'} fontWeight="semibold">{link.label}</Text>
                    </Box>
                  </Link>
                ))}
                {!user && (
                  <HStack gap={2}>
                    <Link to="/login" style={{ flex: 1 }}><Button w="full" variant="outline" borderColor="rgba(139,92,246,0.3)" color="white" size="sm" onClick={() => setMenuOpen(false)}>Đăng Nhập</Button></Link>
                    <Link to="/register" style={{ flex: 1 }}><Button w="full" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" color="white" size="sm" onClick={() => setMenuOpen(false)}>Đăng Ký</Button></Link>
                  </HStack>
                )}
              </VStack>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </>
  )
}
