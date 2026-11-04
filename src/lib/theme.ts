import { createSystem, defineConfig } from '@chakra-ui/react'
import { defaultConfig } from '@chakra-ui/react'

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#f5f3ff' },
          100: { value: '#ede9fe' },
          200: { value: '#ddd6fe' },
          300: { value: '#c4b5fd' },
          400: { value: '#a855f7' },
          500: { value: '#7c3aed' },
          600: { value: '#6d28d9' },
          700: { value: '#5b21b6' },
          800: { value: '#4c1d95' },
          900: { value: '#2e1065' },
          950: { value: '#1e0a3c' },
        },
        neon: {
          purple: { value: '#a855f7' },
          blue: { value: '#3b82f6' },
          cyan: { value: '#06b6d4' },
          green: { value: '#10b981' },
          pink: { value: '#ec4899' },
          gold: { value: '#ffd700' },
        },
        dark: {
          bg: { value: '#05030c' },
          card: { value: 'rgba(15,10,30,0.6)' },
          border: { value: 'rgba(139,92,246,0.2)' },
        },
      },
      fonts: {
        body: { value: "'Inter', system-ui, sans-serif" },
        heading: { value: "'Inter', system-ui, sans-serif" },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
