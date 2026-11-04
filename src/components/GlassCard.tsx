import React from 'react'
import { Box, type BoxProps } from '@chakra-ui/react'

interface GlassCardProps extends BoxProps {
  children: React.ReactNode
  glow?: 'purple' | 'blue' | 'cyan' | 'green' | 'pink' | 'gold' | 'none'
  hover?: boolean
  rgbBorder?: boolean
  radius?: string
}

export function GlassCard({ children, glow = 'none', hover = false, rgbBorder = false, radius = '2xl', ...rest }: GlassCardProps) {
  const glowMap: Record<string, string> = {
    purple: '0 0 30px rgba(168,85,247,0.15),0 8px 32px rgba(0,0,0,0.4)',
    blue: '0 0 30px rgba(59,130,246,0.15),0 8px 32px rgba(0,0,0,0.4)',
    cyan: '0 0 30px rgba(6,182,212,0.15),0 8px 32px rgba(0,0,0,0.4)',
    green: '0 0 30px rgba(16,185,129,0.15),0 8px 32px rgba(0,0,0,0.4)',
    pink: '0 0 30px rgba(236,72,153,0.15),0 8px 32px rgba(0,0,0,0.4)',
    gold: '0 0 30px rgba(255,215,0,0.15),0 8px 32px rgba(0,0,0,0.4)',
    none: '0 8px 32px rgba(0,0,0,0.4)',
  }

  return (
    <Box
      position="relative"
      bg="rgba(15,10,30,0.55)"
      backdropFilter="blur(24px)"
      border={rgbBorder ? '1px solid transparent' : '1px solid rgba(139,92,246,0.15)'}
      borderRadius={radius}
      boxShadow={glowMap[glow]}
      transition="all 0.35s cubic-bezier(0.22,1,0.36,1)"
      overflow="hidden"
      _hover={hover ? {
        border: '1px solid rgba(168,85,247,0.4)',
        boxShadow: `0 16px 48px rgba(0,0,0,0.5),${glowMap[glow].split(',')[0]}`,
        transform: 'translateY(-4px)',
      } : undefined}
      {...(rgbBorder ? {
        css: {
          backgroundClip: 'padding-box',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            padding: '1px',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.6), rgba(59,130,246,0.6), rgba(6,182,212,0.6), rgba(168,85,247,0.6))',
            backgroundSize: '300% 300%',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            animation: 'shimmer 4s linear infinite',
            pointerEvents: 'none',
          },
        },
      } : {})}
      {...rest}
    >
      {children}
    </Box>
  )
}

export function GlassInput({ ...props }: BoxProps) {
  return (
    <Box
      as="div"
      bg="rgba(15,10,30,0.5)"
      border="1px solid rgba(139,92,246,0.25)"
      borderRadius="xl"
      _focusWithin={{ border: '1px solid rgba(168,85,247,0.6)', boxShadow: '0 0 0 3px rgba(168,85,247,0.12)' }}
      transition="all 0.25s"
      {...props}
    />
  )
}

export function NeonText({ children, color = 'purple', ...props }: BoxProps & { color?: 'purple' | 'blue' | 'cyan' | 'green' | 'gold' | 'pink' }) {
  const colorMap: Record<string, string> = {
    purple: '#a855f7', blue: '#3b82f6', cyan: '#06b6d4', green: '#10b981', gold: '#ffd700', pink: '#ec4899',
  }
  return (
    <Box as="span" color={colorMap[color]} css={{ textShadow: `0 0 20px ${colorMap[color]}80` }} {...props}>
      {children}
    </Box>
  )
}

export function GoldText({ children, ...props }: BoxProps) {
  return (
    <Box
      as="span"
      css={{
        background: 'linear-gradient(90deg, #B8860B, #FFD700, #FFFACD, #FFD700, #DAA520, #FFD700)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'shimmer 3s linear infinite',
        filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.3))',
      }}
      {...props}
    >
      {children}
    </Box>
  )
}

export function RainbowText({ children, ...props }: BoxProps) {
  return (
    <Box
      as="span"
      css={{
        background: 'linear-gradient(90deg, #a855f7, #3b82f6, #06b6d4, #10b981, #ec4899, #a855f7)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'shimmer 3s linear infinite',
      }}
      {...props}
    >
      {children}
    </Box>
  )
}

export function Badge({ children, color = 'purple', ...props }: BoxProps & { color?: 'purple' | 'blue' | 'cyan' | 'green' | 'red' | 'gold' | 'pink' }) {
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    purple: { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)', text: '#a855f7' },
    blue: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', text: '#3b82f6' },
    cyan: { bg: 'rgba(6,182,212,0.12)', border: 'rgba(6,182,212,0.35)', text: '#06b6d4' },
    green: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', text: '#10b981' },
    red: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', text: '#ef4444' },
    gold: { bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.35)', text: '#ffd700' },
    pink: { bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.35)', text: '#ec4899' },
  }
  const c = colorMap[color]
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      gap={1}
      px={2}
      py={0.5}
      fontSize="xs"
      fontWeight="semibold"
      borderRadius="full"
      bg={c.bg}
      border={`1px solid ${c.border}`}
      color={c.text}
      css={{ textShadow: `0 0 10px ${c.text}40` }}
      {...props}
    >
      {children}
    </Box>
  )
}
