import { useRef, useEffect, type ReactNode } from 'react'
import { motion, type Variants } from 'framer-motion'

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.25 } },
}

export const pageTransition = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
}

export function AnimatedBackground({ children }: { children?: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    let mouseX = w / 2
    let mouseY = h / 2

    const isMobile = w < 768
    const count = isMobile ? 30 : 60
    const colors = ['#7c3aed', '#3b82f6', '#06b6d4', '#a855f7', '#ec4899']
    const particles: Particle[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 2 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.5 + 0.2,
    }))

    let animId = 0
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        const dx = p.x - mouseX
        const dy = p.y - mouseY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const brightness = dist < 150 ? 1 - dist / 150 : 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size + brightness * 1.5, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.min(1, p.alpha + brightness * 0.4)
        ctx.shadowBlur = 8 + brightness * 12
        ctx.shadowColor = p.color
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      animId = requestAnimationFrame(draw)
    }
    draw()

    const onResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight }
    const onMouse = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY }
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouse)
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); window.removeEventListener('mousemove', onMouse) }
  }, [])

  return (
    <>
      {/* Base gradient background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -3,
        background: 'radial-gradient(ellipse at 0% 0%, rgba(124,58,237,0.12) 0%, transparent 50%), radial-gradient(ellipse at 100% 0%, rgba(59,130,246,0.10) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(6,182,212,0.08) 0%, transparent 50%), linear-gradient(180deg, #05030c 0%, #0a0518 40%, #0f0a1e 100%)',
      }} />

      {/* Tech grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -2,
        backgroundImage: 'linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
      }} />

      {/* Neon corner glows */}
      <div style={{ position: 'fixed', top: '-100px', left: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: -2, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(60px)', zIndex: -2, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-100px', left: '30%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)', filter: 'blur(80px)', zIndex: -2, pointerEvents: 'none' }} />

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }} />

      {/* RGB border sweep */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.04) 30%, rgba(59,130,246,0.04) 50%, rgba(6,182,212,0.04) 70%, transparent 100%)',
        animation: 'shimmer 8s linear infinite',
        backgroundSize: '200% 100%',
      }} />

      {children}
    </>
  )
}
