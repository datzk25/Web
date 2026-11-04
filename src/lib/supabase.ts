import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rlzedikusbkulxmsdgza.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsemVkaWt1c2JrdWx4bXNkZ3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTMxMzIsImV4cCI6MjA5OTM2OTEzMn0.re9t8viVf-22u5ICaEOrt0_TdIMRRl23morvbzAHFMg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export type Profile = {
  id: string
  customer_id: string
  username: string
  email: string | null
  avatar_url: string | null
  balance: number
  role: 'user' | 'admin'
  is_banned: boolean
  created_at: string
  updated_at: string
  total_deposited: number
  total_spent: number
  reward_points: number
  referral_code: string | null
  referred_by: string | null
  rank: string
}

export type Category = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export type Product = {
  id: string
  category_id: string | null
  name: string
  slug: string
  description: string | null
  short_description: string | null
  type: 'acc' | 'random_acc' | 'file' | 'tool' | 'item' | 'service'
  price: number
  original_price: number | null
  stock: number
  sold_count: number
  images: string[] | null
  is_active: boolean
  is_featured: boolean
  is_new: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  categories?: Category
}

export type Order = {
  id: string
  order_code: string
  user_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  discount_amount: number
  status: string
  delivery_data: string[] | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DepositTransaction = {
  id: string
  user_id: string
  transaction_code: string
  amount: number
  bank_name: string | null
  bank_account: string | null
  status: string
  payment_method: string
  qr_url: string | null
  webhook_data: Record<string, unknown> | null
  expires_at: string | null
  completed_at: string | null
  created_at: string
}

export type WalletTransaction = {
  id: string
  user_id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  reference_id: string | null
  description: string
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export type SiteStats = {
  id: number
  total_users: number
  total_orders: number
  total_revenue: number
  updated_at: string
}

export type DiscountCode = {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  min_order: number
  max_uses: number | null
  used_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export type ProductInventory = {
  id: string
  product_id: string
  content: string
  is_sold: boolean
  sold_at: string | null
  sold_to: string | null
  created_at: string
}

export type MembershipRank = {
  id: string
  rank_key: string
  name: string
  min_amount: number
  discount_percent: number
  cashback_percent: number
  icon: string | null
  color: string
  gradient: string | null
  sort_order: number
  benefits: string[]
  created_at: string
}

export type ProductReview = {
  id: string
  product_id: string
  user_id: string
  rating: number
  comment: string | null
  is_verified: boolean
  created_at: string
  profiles?: Pick<Profile, 'username' | 'customer_id' | 'rank'>
}

export type SupportTicket = {
  id: string
  user_id: string
  subject: string
  category: string
  priority: string
  status: string
  attachment_url: string | null
  created_at: string
  updated_at: string
  profiles?: Pick<Profile, 'username' | 'customer_id'>
}

export type TicketMessage = {
  id: string
  ticket_id: string
  sender_id: string
  sender_type: 'user' | 'admin'
  message: string
  created_at: string
}

export type FlashSale = {
  id: string
  name: string
  description: string | null
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
}

export type FlashSaleItem = {
  id: string
  flash_sale_id: string
  product_id: string
  sale_price: number
  max_quantity: number | null
  sold_count: number
  products?: Product
  flash_sales?: FlashSale
}

export type Banner = {
  id: string
  title: string
  subtitle: string | null
  image_url: string | null
  link_url: string | null
  button_text: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export type FAQ = {
  id: string
  question: string
  answer: string
  category: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export type SiteSettings = {
  id: number
  site_name: string
  logo_url: string | null
  favicon_url: string | null
  primary_color: string
  bank_id: string
  bank_account: string
  bank_name: string
  maintenance_mode: boolean
  registration_enabled: boolean
  deposit_enabled: boolean
  referral_reward: number
  daily_checkin_points: number
  referral_commission_percent: number
  updated_at: string
}

export function generateCustomerId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function generateOrderCode(): string {
  return 'DH' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase()
}

export function generateTransactionCode(): string {
  return 'GD' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase()
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}
