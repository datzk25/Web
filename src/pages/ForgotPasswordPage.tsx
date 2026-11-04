import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, Flex, VStack, HStack, Text, Button, Input } from '@chakra-ui/react'
import { LuGamepad2, LuMail, LuArrowRight, LuArrowLeft } from 'react-icons/lu'
import { supabase } from '../lib/supabase'
import { GlassCard, NeonText, RainbowText, GoldText } from '../components/GlassCard'
import { pageVariants, pageTransition } from '../components/AnimatedBackground'
import { Toaster, toaster } from '../components/ui/toaster'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email) {
      setError('Vui lòng nhập email của bạn')
      return
    }
    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setLoading(false)
    if (resetError) {
      setError(resetError.message)
      toaster.error({ title: 'Gửi email thất bại', description: resetError.message })
      return
    }
    setSent(true)
    toaster.success({ title: 'Email reset đã được gửi!', description: 'Vui lòng kiểm tra hộp thư của bạn.' })
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <Flex direction="column" align="center" justify="center" minH="100vh" pt="100px" pb={16} px={4}>
        <Toaster />
        <GlassCard maxW="440px" w="full" rgbBorder glow="purple" p={8}>
          <VStack gap={5} align="stretch">
            {/* Logo */}
            <HStack gap={2} justify="center" mb={1}>
              <Box p={2} borderRadius="xl" bg="linear-gradient(135deg,#7c3aed,#3b82f6)" boxShadow="0 0 24px rgba(124,58,237,0.5)">
                <LuGamepad2 size={24} color="white" />
              </Box>
              <GoldText fontSize="2xl" fontWeight="black">NovaXStore</GoldText>
            </HStack>

            {/* Heading */}
            <VStack gap={1} align="center" mb={2}>
              <Text fontSize="2xl" fontWeight="bold" color="white">Quên Mật Khẩu</Text>
              <Text fontSize="sm" color="rgba(255,255,255,0.5)">Nhập email để khôi phục</Text>
            </VStack>

            {sent ? (
              <Box p={4} borderRadius="xl" bg="rgba(16,185,129,0.1)" border="1px solid rgba(16,185,129,0.3)" textAlign="center">
                <Text fontSize="sm" color="#6ee7b7" fontWeight="semibold" mb={2}>
                  Email reset đã được gửi!
                </Text>
                <Text fontSize="xs" color="rgba(255,255,255,0.5)">
                  Vui lòng kiểm tra hộp thư (kể cả mục spam) của {email} để đặt lại mật khẩu.
                </Text>
              </Box>
            ) : (
              <Box as="form" onSubmit={handleSubmit} w="full">
                <VStack gap={4} align="stretch">
                  {/* Email */}
                  <Box position="relative">
                    <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                      <LuMail size={16} color="rgba(168,85,247,0.6)" />
                    </Box>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email của bạn"
                      pl={10}
                      h={11}
                      bg="rgba(15,10,30,0.5)"
                      border="1px solid rgba(139,92,246,0.25)"
                      borderRadius="xl"
                      color="white"
                      _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
                      _focus={{ border: '1px solid rgba(168,85,247,0.6)', boxShadow: '0 0 0 3px rgba(168,85,247,0.1)' }}
                      fontSize="sm"
                      autoComplete="email"
                    />
                  </Box>

                  {/* Error */}
                  {error && (
                    <Box p={3} borderRadius="xl" bg="rgba(239,68,68,0.1)" border="1px solid rgba(239,68,68,0.3)">
                      <Text fontSize="sm" color="#fca5a5">{error}</Text>
                    </Box>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    w="full"
                    loading={loading}
                    h={11}
                    bg="linear-gradient(135deg,#7c3aed,#3b82f6)"
                    color="white"
                    fontSize="md"
                    fontWeight="bold"
                    borderRadius="xl"
                    boxShadow="0 4px 16px rgba(124,58,237,0.4)"
                    _hover={{ opacity: 0.9, transform: 'translateY(-1px)' }}
                    _active={{ transform: 'translateY(0)' }}
                  >
                    Gửi Email Reset <LuArrowRight size={16} />
                  </Button>
                </VStack>
              </Box>
            )}

            {/* Login link */}
            <Flex justify="center" align="center" gap={1}>
              <Text fontSize="sm" color="rgba(255,255,255,0.5)">Nhớ mật khẩu?</Text>
              <Link to="/login">
                <NeonText fontSize="sm" fontWeight="bold">Đăng nhập</NeonText>
              </Link>
            </Flex>
          </VStack>
        </GlassCard>

        {/* Back to home */}
        <Link to="/">
          <HStack gap={1} mt={6} _hover={{ opacity: 0.8 }} transition="opacity 0.2s">
            <LuArrowLeft size={14} color="rgba(255,255,255,0.5)" />
            <Text fontSize="sm" color="rgba(255,255,255,0.5)">Về trang chủ</Text>
          </HStack>
        </Link>
      </Flex>
    </motion.div>
  )
}
