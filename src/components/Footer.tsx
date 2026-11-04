import { Link } from 'react-router-dom'
import { Box, Flex, Grid, HStack, VStack, Text, Input, Button, IconButton } from '@chakra-ui/react'
import { LuGamepad2, LuFacebook, LuSend, LuMessageCircle, LuPhone, LuMail, LuShield, LuZap, LuHeadphones } from 'react-icons/lu'
import { GlassCard, GoldText } from './GlassCard'

export function Footer() {
  return (
    <Box as="footer" position="relative" zIndex={1} mt={20} borderTop="1px solid rgba(139,92,246,0.1)" pt={12} pb={8} px={{ base: 4, md: 6 }}>
      <Box maxW="1400px" mx="auto">
        <Grid templateColumns={{ base: '1fr', md: '2fr 1fr 1fr 1fr' }} gap={8}>
          {/* Brand */}
          <VStack align="flex-start" gap={3}>
            <HStack gap={2}>
              <Box p={2} borderRadius="xl" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" boxShadow="0 0 20px rgba(124,58,237,0.3)">
                <LuGamepad2 size={20} color="white" />
              </Box>
              <GoldText fontSize="xl" fontWeight="black">NovaXStore</GoldText>
            </HStack>
            <Text fontSize="sm" color="rgba(255,255,255,0.4)" maxW="320px">
              Hệ thống mua bán tài nguyên game, vật phẩm và dịch vụ gaming uy tín số 1 Việt Nam. Giao hàng tự động 24/7, bảo mật tuyệt đối.
            </Text>
            <HStack gap={2} mt={2}>
              {[
                { icon: LuFacebook, url: 'https://facebook.com', color: '#3b82f6' },
                { icon: LuSend, url: 'https://t.me/novaxstore', color: '#06b6d4' },
                { icon: LuMessageCircle, url: 'https://zalo.me', color: '#10b981' },
                { icon: LuPhone, url: 'tel:0123456789', color: '#a855f7' },
              ].map((s, i) => (
                <IconButton key={i} as="a" href={s.url} target="_blank" aria-label="Social" size="sm" variant="ghost" borderRadius="xl" border="1px solid rgba(139,92,246,0.2)" _hover={{ bg: 'rgba(139,92,246,0.1)', transform: 'translateY(-2px)' }} transition="all 0.25s">
                  <s.icon size={16} color={s.color} />
                </IconButton>
              ))}
            </HStack>
          </VStack>

          {/* Links */}
          {[
            { title: 'Khám Phá', links: [{ to: '/products', label: 'Sản Phẩm' }, { to: '/deposit', label: 'Nạp Tiền' }, { to: '/support', label: 'Hỗ Trợ' }, { to: '/cart', label: 'Giỏ Hàng' }] },
            { title: 'Hỗ Trợ', links: [{ to: '/support', label: 'Trung Tâm Hỗ Trợ' }, { to: '/register', label: 'Đăng Ký' }, { to: '/login', label: 'Đăng Nhập' }, { to: '/forgot-password', label: 'Quên Mật Khẩu' }] },
          ].map((col) => (
            <VStack key={col.title} align="flex-start" gap={2}>
              <Text fontSize="sm" fontWeight="bold" color="white" mb={1}>{col.title}</Text>
              {col.links.map((l) => (
                <Link key={l.to} to={l.to}>
                  <Text fontSize="sm" color="rgba(255,255,255,0.4)" _hover={{ color: '#a855f7' }} transition="color 0.2s">{l.label}</Text>
                </Link>
              ))}
            </VStack>
          ))}

          {/* Trust */}
          <VStack align="flex-start" gap={2}>
            <Text fontSize="sm" fontWeight="bold" color="white" mb={1}>Cam Kết</Text>
            {[
              { icon: LuZap, text: 'Giao hàng tự động 24/7' },
              { icon: LuShield, text: 'Bảo mật SSL tuyệt đối' },
              { icon: LuHeadphones, text: 'Hỗ trợ khách hàng tận tâm' },
              { icon: LuMail, text: 'Email: support@novaxstore.vn' },
            ].map((item, i) => (
              <HStack key={i} gap={2}>
                <item.icon size={14} color="#a855f7" />
                <Text fontSize="sm" color="rgba(255,255,255,0.4)">{item.text}</Text>
              </HStack>
            ))}
          </VStack>
        </Grid>

        <Box mt={8} pt={6} borderTop="1px solid rgba(139,92,246,0.08)">
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
            <Text fontSize="xs" color="rgba(255,255,255,0.3)">© 2026 NovaXStore. Tất cả quyền được bảo lưu.</Text>
            <Text fontSize="xs" color="rgba(255,255,255,0.3)">Designed with passion for gamers</Text>
          </Flex>
        </Box>
      </Box>
    </Box>
  )
}
