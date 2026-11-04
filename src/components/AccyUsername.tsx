import React from 'react'
import { Box, HStack, Text } from '@chakra-ui/react'
import * as LuIcons from 'react-icons/lu'
import { RANK_CONFIG } from '../lib/ranks'

interface AccyUsernameProps {
  username: string
  rankKey?: string
  showIcon?: boolean
  fontSize?: string | number
  fontWeight?: string | number
}

export function AccyUsername({ username, rankKey = 'member', showIcon = false, fontSize = 'sm', fontWeight = 'bold' }: AccyUsernameProps) {
  const rank = RANK_CONFIG[rankKey] || RANK_CONFIG.member
  const IconComp = showIcon ? (LuIcons as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[rank.icon] : null

  return (
    <HStack gap={1.5} align="center" css={{ userSelect: 'none' }}>
      {IconComp && <IconComp size={14} color={rank.color} />}
      <Box
        as="span"
        fontSize={fontSize}
        fontWeight={fontWeight}
        css={{
          background: rank.gradient,
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: rank.textShadow,
          animation: rank.animation !== 'none' ? rank.animation : undefined,
        }}
      >
        {username}
      </Box>
    </HStack>
  )
}

export function RankBadge({ rankKey, size = 'sm' }: { rankKey: string; size?: 'xs' | 'sm' | 'md' }) {
  const rank = RANK_CONFIG[rankKey] || RANK_CONFIG.member
  const IconComp = (LuIcons as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[rank.icon]
  const sizes = { xs: { px: 1.5, py: 0.5, fs: '2xs', icon: 10 }, sm: { px: 2, py: 0.5, fs: 'xs', icon: 12 }, md: { px: 2.5, py: 1, fs: 'sm', icon: 14 } }
  const s = sizes[size]

  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      gap={1}
      px={s.px}
      py={s.py}
      borderRadius="full"
      bg={`${rank.color}18`}
      border={`1px solid ${rank.color}40`}
      css={{
        textShadow: `0 0 8px ${rank.color}50`,
        boxShadow: `0 0 12px ${rank.color}20`,
      }}
    >
      {IconComp && <IconComp size={s.icon} color={rank.color} />}
      <Text fontSize={s.fs} fontWeight="bold" color={rank.color}>
        {rank.name}
      </Text>
    </Box>
  )
}
