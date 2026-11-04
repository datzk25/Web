import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ChakraProvider } from '@chakra-ui/react'
import { system } from './lib/theme'
import { AuthProvider } from './lib/auth'
import { CartProvider } from './lib/cart'
import { AnimatedBackground } from './components/AnimatedBackground'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { FloatingButtons } from './components/FloatingButtons'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ProfilePage from './pages/ProfilePage'
import DepositPage from './pages/DepositPage'
import AdminPage from './pages/AdminPage'
import CartPage from './pages/CartPage'
import SupportPage from './pages/SupportPage'
import TransactionHistoryPage from './pages/TransactionHistoryPage'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname + location.search}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/transactions" element={<TransactionHistoryPage />} />
        <Route path="/deposit" element={<DepositPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <ChakraProvider value={system}>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <div style={{ minHeight: '100vh', background: 'rgb(5,3,12)', color: 'white' }}>
              <AnimatedBackground />
              <Header />
              <main style={{ position: 'relative', zIndex: 1 }}>
                <AnimatedRoutes />
              </main>
              <Footer />
              <FloatingButtons />
            </div>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ChakraProvider>
  )
}
