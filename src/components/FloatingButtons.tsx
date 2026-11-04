import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Box, Flex, VStack, HStack, Text, Button, IconButton } from '@chakra-ui/react'
import { LuArrowUp, LuMessageCircle, LuSend, LuX, LuHeadphones, LuFacebook } from 'react-icons/lu'
import { Link } from 'react-router-dom'

export function FloatingButtons() {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showChat, setShowChat] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <VStack position="fixed" right={{ base: 3, md: 5 }} bottom={{ base: 3, md: 5 }} zIndex={1000} gap={2} align="flex-end">
      <AnimatePresence>
        {showScrollTop && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
            <IconButton aria-label="Lên đầu trang" onClick={scrollToTop} bg="rgba(15,10,30,0.8)" backdropFilter="blur(10px)" border="1px solid rgba(139,92,246,0.3)" color="#a855f7" borderRadius="full" boxShadow="0 4px 20px rgba(124,58,237,0.3)" _hover={{ bg: 'rgba(139,92,246,0.2)', transform: 'translateY(-2px)' }} size="sm">
              <LuArrowUp size={18} />
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} style={{ marginBottom: '8px' }}>
            <Box w="280px" p={4} borderRadius="2xl" bg="rgba(15,10,30,0.95)" backdropFilter="blur(20px)" border="1px solid rgba(139,92,246,0.3)" boxShadow="0 12px 40px rgba(0,0,0,0.5)">
              <Flex align="center" justify="space-between" mb={3}>
                <HStack>
                  <Box p={1.5} borderRadius="lg" bg="linear-gradient(135deg,#7c3aed,#3b82f6)"><LuHeadphones size={14} color="white" /></Box>
                  <Text fontSize="sm" fontWeight="bold" color="white">Hỗ Trợ Khách Hàng</Text>
                </HStack>
                <IconButton aria-label="Đóng" size="xs" variant="ghost" color="rgba(255,255,255,0.5)" onClick={() => setShowChat(false)}><LuX size={14} /></IconButton>
              </Flex>
              <Text fontSize="xs" color="rgba(255,255,255,0.5)" mb={3}>Chọn kênh liên hệ nhanh:</Text>
              <VStack gap={2} align="stretch">
                <Link to="/support"><Button size="sm" variant="outline" borderColor="rgba(139,92,246,0.3)" color="white" w="full" _hover={{ bg: 'rgba(139,92,246,0.1)' }} justifyContent="flex-start"><LuMessageCircle size={14} /> Tạo Ticket Hỗ Trợ</Button></Link>
                <Button as="a" href="https://t.me/novaxstore" target="_blank" size="sm" variant="outline" borderColor="rgba(59,130,246,0.3)" color="#3b82f6" w="full" _hover={{ bg: 'rgba(59,130,246,0.1)' }} justifyContent="flex-start"><LuSend size={14} /> Telegram</Button>
                <Button as="a" href="https://zalo.me" target="_blank" size="sm" variant="outline" borderColor="rgba(6,182,212,0.3)" color="#06b6d4" w="full" _hover={{ bg: 'rgba(6,182,212,0.1)' }} justifyContent="flex-start"><LuMessageCircle size={14} /> Zalo</Button>
                <Button as="a" href="https://m.me/novaxstore" target="_blank" size="sm" variant="outline" borderColor="rgba(59,130,246,0.3)" color="#3b82f6" w="full" _hover={{ bg: 'rgba(59,130,246,0.1)' }} justifyContent="flex-start"><LuFacebook size={14} /> Facebook</Button>
              </VStack>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      <IconButton aria-label="Hỗ trợ" onClick={() => setShowChat(!showChat)} bg="linear-gradient(135deg, #7c3aed, #3b82f6)" color="white" borderRadius="full" boxShadow="0 4px 20px rgba(124,58,237,0.5)" _hover={{ transform: 'scale(1.05)' }} size="md">
        {showChat ? <LuX size={20} /> : <LuMessageCircle size={20} />}
      </IconButton>
    </VStack>
  )
}
