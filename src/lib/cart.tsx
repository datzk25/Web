import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Product } from './supabase'

export interface CartItem {
  product: Product
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  addToCart: (product: Product, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'cart_items'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  const persist = (next: CartItem[]) => {
    setItems(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const addToCart = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      const next = existing
        ? prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i)
        : [...prev, { product, quantity }]
      persist(next)
      return next
    })
  }

  const removeFromCart = (productId: string) => {
    setItems((prev) => { const next = prev.filter((i) => i.product.id !== productId); persist(next); return next })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return
    setItems((prev) => { const next = prev.map((i) => i.product.id === productId ? { ...i, quantity } : i); persist(next); return next })
  }

  const clearCart = () => persist([])

  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = items.reduce((s, i) => s + i.product.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
