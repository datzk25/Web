import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Box, Flex, Grid, HStack, VStack, Text, Button, Input, Textarea, Spinner, Separator } from '@chakra-ui/react'
import { LuHeadphones, LuPlus, LuTicket, LuMessageCircle, LuSend, LuCircleCheck, LuClock, LuTriangleAlert, LuArrowLeft } from 'react-icons/lu'
import { supabase, formatDate, type SupportTicket, type TicketMessage } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { GlassCard, Badge } from '../components/GlassCard'
import { pageVariants, pageTransition } from '../components/AnimatedBackground'
import { Toaster, toaster } from '../components/ui/toaster'
import { EmptyState } from '../components/ui/empty-state'

const CATEGORY_LABELS: Record<string, string> = {
  order: 'Đơn Hàng',
  payment: 'Thanh Toán',
  deposit: 'Nạp Tiền',
  account: 'Tài Khoản',
  product: 'Sản Phẩm',
  other: 'Khác',
}

const CATEGORY_COLORS: Record<string, 'purple' | 'blue' | 'cyan' | 'green' | 'gold' | 'pink'> = {
  order: 'blue',
  payment: 'green',
  deposit: 'gold',
  account: 'purple',
  product: 'cyan',
  other: 'pink',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Thấp',
  medium: 'Trung Bình',
  high: 'Cao',
  urgent: 'Khẩn Cấp',
}

const PRIORITY_COLORS: Record<string, 'purple' | 'blue' | 'green' | 'red' | 'gold'> = {
  low: 'green',
  medium: 'blue',
  high: 'gold',
  urgent: 'red',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Đang Mở',
  pending: 'Chờ Trả Lời',
  resolved: 'Đã Xử Lý',
  closed: 'Đã Đóng',
}

const STATUS_COLORS: Record<string, 'purple' | 'blue' | 'green' | 'red' | 'gold' | 'cyan'> = {
  open: 'cyan',
  pending: 'gold',
  resolved: 'green',
  closed: 'red',
}

export default function SupportPage() {
  const { user, profile } = useAuth()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)

  // New ticket form state
  const [showForm, setShowForm] = useState(false)
  const [formSubject, setFormSubject] = useState('')
  const [formCategory, setFormCategory] = useState('order')
  const [formPriority, setFormPriority] = useState('medium')
  const [formMessage, setFormMessage] = useState('')
  const [creating, setCreating] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Load user's tickets
  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setTickets([])
        } else {
          setTickets((data ?? []) as SupportTicket[])
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setLoadingMessages(true)
    setMessages([])
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true })
    setMessages((data ?? []) as TicketMessage[])
    setLoadingMessages(false)
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!formSubject.trim() || !formMessage.trim()) {
      toaster.create({ type: 'error', title: 'Thiếu thông tin', description: 'Vui lòng nhập tiêu đề và nội dung' })
      return
    }
    setCreating(true)
    const { data: ticketData, error: ticketErr } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: formSubject.trim(),
        category: formCategory,
        priority: formPriority,
        status: 'open',
      })
      .select()
      .single()

    if (ticketErr || !ticketData) {
      toaster.create({ type: 'error', title: 'Tạo ticket thất bại', description: ticketErr?.message })
      setCreating(false)
      return
    }

    const { error: msgErr } = await supabase.from('ticket_messages').insert({
      ticket_id: ticketData.id,
      sender_id: user.id,
      sender_type: 'user',
      message: formMessage.trim(),
    })

    if (msgErr) {
      toaster.create({ type: 'error', title: 'Gửi tin nhắn thất bại', description: msgErr.message })
      setCreating(false)
      return
    }

    const newTicket = ticketData as SupportTicket
    setTickets((prev) => [newTicket, ...prev])
    setSelectedTicket(newTicket)
    setMessages([
      {
        id: 'temp',
        ticket_id: newTicket.id,
        sender_id: user.id,
        sender_type: 'user',
        message: formMessage.trim(),
        created_at: new Date().toISOString(),
      },
    ])
    setFormSubject('')
    setFormCategory('order')
    setFormPriority('medium')
    setFormMessage('')
    setShowForm(false)
    setCreating(false)
    toaster.create({ type: 'success', title: 'Tạo ticket thành công', description: 'Chúng tôi sẽ phản hồi sớm nhất' })
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedTicket) return
    if (!reply.trim()) return
    setSending(true)
    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        sender_type: 'user',
        message: reply.trim(),
      })
      .select()
      .single()

    if (error || !data) {
      toaster.create({ type: 'error', title: 'Gửi thất bại', description: error?.message })
      setSending(false)
      return
    }

    setMessages((prev) => [...prev, data as TicketMessage])
    setReply('')
    setSending(false)
    // Update ticket updated_at
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicket.id ? { ...t, updated_at: new Date().toISOString() } : t)),
    )
  }

  if (!user) {
    return (
      <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
        <Box pt="100px" pb={16} maxW="1400px" mx="auto" px={{ base: 4, md: 6 }}>
          <GlassCard p={10}>
            <EmptyState
              title="Cần Đăng Nhập"
              description="Vui lòng đăng nhập để xem và tạo ticket hỗ trợ."
              icon={<LuHeadphones size={40} color="#a855f7" />}
            />
          </GlassCard>
        </Box>
        <Toaster />
      </motion.div>
    )
  }

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
      <Box pt="100px" pb={16} maxW="1400px" mx="auto" px={{ base: 4, md: 6 }}>
        <Toaster />

        {/* Heading */}
        <VStack gap={2} mb={6} align={{ base: 'center', md: 'flex-start' }}>
          <HStack gap={2}>
            <LuHeadphones size={28} color="#a855f7" />
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
              Trung Tâm Hỗ Trợ
            </Text>
          </HStack>
          <Text fontSize="sm" color="rgba(255,255,255,0.5)">
            Tạo ticket và trò chuyện trực tiếp với đội ngũ hỗ trợ
          </Text>
        </VStack>

        {loading ? (
          <Flex justify="center" align="center" py={20}>
            <VStack gap={3}>
              <Spinner size="xl" color="#a855f7" />
              <Text fontSize="sm" color="rgba(255,255,255,0.4)">Đang tải tickets...</Text>
            </VStack>
          </Flex>
        ) : (
          <Grid templateColumns={{ base: '1fr', lg: '380px 1fr' }} gap={5} alignItems="start">
            {/* ===== LEFT: Ticket list + create button ===== */}
            <VStack gap={4} align="stretch">
              <Button
                size="lg"
                bg="linear-gradient(135deg,#7c3aed,#3b82f6,#06b6d4)"
                color="white"
                fontWeight="bold"
                borderRadius="xl"
                _hover={{ opacity: 0.9, transform: 'translateY(-2px)' }}
                boxShadow="0 8px 24px rgba(124,58,237,0.35)"
                onClick={() => setShowForm((v) => !v)}
              >
                <HStack gap={2}>
                  <LuPlus size={18} />
                  Tạo Ticket Mới
                </HStack>
              </Button>

              {/* Create form */}
              {showForm && (
                <GlassCard rgbBorder glow="purple" p={5}>
                  <form onSubmit={handleCreateTicket}>
                    <VStack gap={4} align="stretch">
                      <HStack justify="space-between">
                        <Text fontSize="md" fontWeight="bold" color="white">
                          Tạo Ticket Mới
                        </Text>
                        <Button
                          size="xs"
                          variant="ghost"
                          color="rgba(255,255,255,0.5)"
                          _hover={{ color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }}
                          onClick={() => setShowForm(false)}
                        >
                          <LuArrowLeft size={14} /> Đóng
                        </Button>
                      </HStack>

                      <VStack gap={1.5} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)" fontWeight="semibold">
                          Tiêu đề
                        </Text>
                        <Input
                          value={formSubject}
                          onChange={(e) => setFormSubject(e.target.value)}
                          placeholder="Mô tả ngắn gọn vấn đề..."
                          h={10}
                          bg="rgba(15,10,30,0.5)"
                          border="1px solid rgba(139,92,246,0.2)"
                          borderRadius="xl"
                          color="white"
                          _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
                          _focus={{ border: '1px solid rgba(168,85,247,0.6)', boxShadow: '0 0 0 3px rgba(168,85,247,0.12)' }}
                        />
                      </VStack>

                      <HStack gap={3} align="start">
                        <VStack gap={1.5} align="stretch" flex={1}>
                          <Text fontSize="xs" color="rgba(255,255,255,0.6)" fontWeight="semibold">
                            Danh mục
                          </Text>
                          <select
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value)}
                            style={{ height: '40px', paddingLeft: '12px', paddingRight: '12px', background: 'rgba(15,10,30,0.5)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', color: 'white', cursor: 'pointer', outline: 'none', width: '100%' }}
                          >
                            <option value="order">Đơn Hàng</option>
                            <option value="payment">Thanh Toán</option>
                            <option value="deposit">Nạp Tiền</option>
                            <option value="account">Tài Khoản</option>
                            <option value="product">Sản Phẩm</option>
                            <option value="other">Khác</option>
                          </select>
                        </VStack>

                        <VStack gap={1.5} align="stretch" flex={1}>
                          <Text fontSize="xs" color="rgba(255,255,255,0.6)" fontWeight="semibold">
                            Mức độ ưu tiên
                          </Text>
                          <select
                            value={formPriority}
                            onChange={(e) => setFormPriority(e.target.value)}
                            style={{ height: '40px', paddingLeft: '12px', paddingRight: '12px', background: 'rgba(15,10,30,0.5)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', color: 'white', cursor: 'pointer', outline: 'none', width: '100%' }}
                          >
                            <option value="low">Thấp</option>
                            <option value="medium">Trung Bình</option>
                            <option value="high">Cao</option>
                            <option value="urgent">Khẩn Cấp</option>
                          </select>
                        </VStack>
                      </HStack>

                      <VStack gap={1.5} align="stretch">
                        <Text fontSize="xs" color="rgba(255,255,255,0.6)" fontWeight="semibold">
                          Nội dung
                        </Text>
                        <Textarea
                          value={formMessage}
                          onChange={(e) => setFormMessage(e.target.value)}
                          placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                          minH="120px"
                          bg="rgba(15,10,30,0.5)"
                          border="1px solid rgba(139,92,246,0.2)"
                          borderRadius="xl"
                          color="white"
                          _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
                          _focus={{ border: '1px solid rgba(168,85,247,0.6)', boxShadow: '0 0 0 3px rgba(168,85,247,0.12)' }}
                        />
                      </VStack>

                      <Button
                        type="submit"
                        size="lg"
                        bg="linear-gradient(135deg,#7c3aed,#3b82f6)"
                        color="white"
                        fontWeight="bold"
                        borderRadius="xl"
                        _hover={{ opacity: 0.9 }}
                        loading={creating}
                        loadingText="Đang tạo..."
                      >
                        <HStack gap={2}>
                          <LuTicket size={16} />
                          Gửi Ticket
                        </HStack>
                      </Button>
                    </VStack>
                  </form>
                </GlassCard>
              )}

              {/* Ticket list */}
              <GlassCard p={0} overflow="hidden">
                <Box p={4} borderBottom="1px solid rgba(139,92,246,0.15)">
                  <HStack justify="space-between">
                    <Text fontSize="sm" fontWeight="bold" color="white">
                      Ticket Của Bạn
                    </Text>
                    <Badge color="purple">{tickets.length}</Badge>
                  </HStack>
                </Box>
                <Box maxH="600px" overflowY="auto">
                  {tickets.length === 0 ? (
                    <Box p={8}>
                      <EmptyState
                        title="Chưa có ticket nào"
                        description="Tạo ticket mới để được hỗ trợ"
                        icon={<LuTicket size={36} color="rgba(168,85,247,0.5)" />}
                      />
                    </Box>
                  ) : (
                    <VStack gap={0} align="stretch">
                      {tickets.map((t, idx) => (
                        <Box
                          key={t.id}
                          as="button"
                          onClick={() => handleSelectTicket(t)}
                          p={4}
                          textAlign="left"
                          bg={selectedTicket?.id === t.id ? 'rgba(168,85,247,0.12)' : 'transparent'}
                          borderBottom={idx < tickets.length - 1 ? '1px solid rgba(139,92,246,0.08)' : 'none'}
                          _hover={{ bg: selectedTicket?.id === t.id ? 'rgba(168,85,247,0.12)' : 'rgba(139,92,246,0.06)' }}
                          transition="all 0.2s"
                          cursor="pointer"
                        >
                          <VStack gap={2} align="stretch">
                            <Text fontSize="sm" fontWeight="bold" color="white" lineClamp={1}>
                              {t.subject}
                            </Text>
                            <HStack gap={1.5} flexWrap="wrap">
                              <Badge color={STATUS_COLORS[t.status] || 'purple'}>
                                {STATUS_LABELS[t.status] || t.status}
                              </Badge>
                              <Badge color={PRIORITY_COLORS[t.priority] || 'blue'}>
                                {PRIORITY_LABELS[t.priority] || t.priority}
                              </Badge>
                              <Badge color={CATEGORY_COLORS[t.category] || 'pink'}>
                                {CATEGORY_LABELS[t.category] || t.category}
                              </Badge>
                            </HStack>
                            <Text fontSize="2xs" color="rgba(255,255,255,0.4)">
                              {formatDate(t.updated_at)}
                            </Text>
                          </VStack>
                        </Box>
                      ))}
                    </VStack>
                  )}
                </Box>
              </GlassCard>
            </VStack>

            {/* ===== RIGHT: Chat area ===== */}
            <GlassCard glow="purple" p={0} overflow="hidden" minH="600px" display="flex" flexDirection="column">
              {selectedTicket ? (
                <Flex direction="column" h="full" minH="600px">
                  {/* Chat header */}
                  <Box p={4} borderBottom="1px solid rgba(139,92,246,0.15)" flexShrink={0}>
                    <HStack justify="space-between" align="start">
                      <VStack gap={1} align="start">
                        <Text fontSize="md" fontWeight="bold" color="white" lineClamp={1}>
                          {selectedTicket.subject}
                        </Text>
                        <HStack gap={1.5} flexWrap="wrap">
                          <Badge color={STATUS_COLORS[selectedTicket.status] || 'purple'}>
                            {STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
                          </Badge>
                          <Badge color={PRIORITY_COLORS[selectedTicket.priority] || 'blue'}>
                            {PRIORITY_LABELS[selectedTicket.priority] || selectedTicket.priority}
                          </Badge>
                          <Badge color={CATEGORY_COLORS[selectedTicket.category] || 'pink'}>
                            {CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}
                          </Badge>
                        </HStack>
                      </VStack>
                      <Button
                        size="xs"
                        variant="ghost"
                        color="rgba(255,255,255,0.5)"
                        _hover={{ color: 'white', bg: 'rgba(139,92,246,0.1)' }}
                        onClick={() => {
                          setSelectedTicket(null)
                          setMessages([])
                        }}
                      >
                        <LuArrowLeft size={14} /> Đóng
                      </Button>
                    </HStack>
                  </Box>

                  {/* Messages */}
                  <Box flex={1} overflowY="auto" p={4}>
                    {loadingMessages ? (
                      <Flex justify="center" align="center" py={10}>
                        <Spinner size="lg" color="#a855f7" />
                      </Flex>
                    ) : messages.length === 0 ? (
                      <Flex justify="center" align="center" py={10}>
                        <VStack gap={2}>
                          <LuMessageCircle size={40} color="rgba(168,85,247,0.3)" />
                          <Text fontSize="sm" color="rgba(255,255,255,0.4)">Chưa có tin nhắn</Text>
                        </VStack>
                      </Flex>
                    ) : (
                      <VStack gap={3} align="stretch">
                        {messages.map((m) => (
                          <Flex
                            key={m.id}
                            justify={m.sender_type === 'user' ? 'flex-end' : 'flex-start'}
                            w="full"
                          >
                            <Box
                              maxW="80%"
                              p={3}
                              borderRadius="2xl"
                              bg={
                                m.sender_type === 'user'
                                  ? 'linear-gradient(135deg, rgba(124,58,237,0.9), rgba(59,130,246,0.9))'
                                  : 'rgba(30,20,50,0.85)'
                              }
                              border={
                                m.sender_type === 'user'
                                  ? '1px solid rgba(168,85,247,0.5)'
                                  : '1px solid rgba(139,92,246,0.2)'
                              }
                              borderTopRightRadius={m.sender_type === 'user' ? '4px' : '2xl'}
                              borderTopLeftRadius={m.sender_type === 'admin' ? '4px' : '2xl'}
                              css={
                                m.sender_type === 'user'
                                  ? { boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }
                                  : { boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }
                              }
                            >
                              <Text fontSize="xs" fontWeight="bold" color={m.sender_type === 'user' ? 'rgba(255,255,255,0.7)' : '#a855f7'} mb={1}>
                                {m.sender_type === 'user' ? (profile?.username || 'Bạn') : 'Admin'}
                              </Text>
                              <Text fontSize="sm" color="white" whiteSpace="pre-wrap" lineHeight="1.5">
                                {m.message}
                              </Text>
                              <Text fontSize="2xs" color="rgba(255,255,255,0.45)" mt={1.5} textAlign={m.sender_type === 'user' ? 'right' : 'left'}>
                                {formatDate(m.created_at)}
                              </Text>
                            </Box>
                          </Flex>
                        ))}
                        <div ref={chatEndRef} />
                      </VStack>
                    )}
                  </Box>

                  {/* Reply input */}
                  <Box p={4} borderTop="1px solid rgba(139,92,246,0.15)" flexShrink={0}>
                    <form onSubmit={handleSendReply}>
                      <HStack gap={2} align="end">
                        <Textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="Nhập tin nhắn của bạn..."
                          minH="48px"
                          maxH="120px"
                          resize="none"
                          flex={1}
                          bg="rgba(15,10,30,0.5)"
                          border="1px solid rgba(139,92,246,0.2)"
                          borderRadius="xl"
                          color="white"
                          _placeholder={{ color: 'rgba(255,255,255,0.3)' }}
                          _focus={{ border: '1px solid rgba(168,85,247,0.6)', boxShadow: '0 0 0 3px rgba(168,85,247,0.12)' }}
                        />
                        <Button
                          type="submit"
                          size="lg"
                          bg="linear-gradient(135deg,#7c3aed,#3b82f6)"
                          color="white"
                          borderRadius="xl"
                          _hover={{ opacity: 0.9 }}
                          loading={sending}
                          loadingText=""
                          flexShrink={0}
                          h="48px"
                          px={4}
                        >
                          <LuSend size={18} />
                        </Button>
                      </HStack>
                    </form>
                  </Box>
                </Flex>
              ) : (
                <Flex justify="center" align="center" h="600px">
                  <VStack gap={3}>
                    <Box p={4} borderRadius="full" bg="rgba(168,85,247,0.1)" border="1px solid rgba(168,85,247,0.3)">
                      <LuMessageCircle size={48} color="#a855f7" />
                    </Box>
                    <Text fontSize="md" fontWeight="bold" color="white">Chọn Ticket Để Trò Chuyện</Text>
                    <Text fontSize="sm" color="rgba(255,255,255,0.4)" textAlign="center" maxW="300px">
                      Chọn một ticket từ danh sách bên trái để xem lịch sử trò chuyện và tiếp tục phản hồi
                    </Text>
                  </VStack>
                </Flex>
              )}
            </GlassCard>
          </Grid>
        )}

        {/* ===== Quick help cards ===== */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} mt={8}>
          <GlassCard hover glow="cyan" p={5}>
            <VStack gap={3} align="center" textAlign="center">
              <Box p={3} borderRadius="2xl" bg="rgba(6,182,212,0.12)" border="1px solid rgba(6,182,212,0.35)" css={{ boxShadow: '0 0 20px rgba(6,182,212,0.2)' }}>
                <LuClock size={26} color="#06b6d4" />
              </Box>
              <Text fontSize="md" fontWeight="bold" color="#06b6d4" css={{ textShadow: '0 0 12px rgba(6,182,212,0.4)' }}>
                Thời Gian Phản Hồi
              </Text>
              <Text fontSize="sm" color="rgba(255,255,255,0.6)">
                Trung bình 30 phút trong giờ hành chính
              </Text>
            </VStack>
          </GlassCard>

          <GlassCard hover glow="green" p={5}>
            <VStack gap={3} align="center" textAlign="center">
              <Box p={3} borderRadius="2xl" bg="rgba(16,185,129,0.12)" border="1px solid rgba(16,185,129,0.35)" css={{ boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
                <LuCircleCheck size={26} color="#10b981" />
              </Box>
              <Text fontSize="md" fontWeight="bold" color="#10b981" css={{ textShadow: '0 0 12px rgba(16,185,129,0.4)' }}>
                Xử Lý Nhanh Chóng
              </Text>
              <Text fontSize="sm" color="rgba(255,255,255,0.6)">
                Đội ngũ chuyên nghiệp, giải quyết nhanh gọn
              </Text>
            </VStack>
          </GlassCard>

          <GlassCard hover glow="purple" p={5}>
            <VStack gap={3} align="center" textAlign="center">
              <Box p={3} borderRadius="2xl" bg="rgba(168,85,247,0.12)" border="1px solid rgba(168,85,247,0.35)" css={{ boxShadow: '0 0 20px rgba(168,85,247,0.2)' }}>
                <LuHeadphones size={26} color="#a855f7" />
              </Box>
              <Text fontSize="md" fontWeight="bold" color="#a855f7" css={{ textShadow: '0 0 12px rgba(168,85,247,0.4)' }}>
                Hỗ Trợ 24/7
              </Text>
              <Text fontSize="sm" color="rgba(255,255,255,0.6)">
                Luôn sẵn sàng hỗ trợ mọi lúc khi bạn cần
              </Text>
            </VStack>
          </GlassCard>
        </Grid>
      </Box>
    </motion.div>
  )
}
