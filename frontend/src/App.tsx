import { useCallback, useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import type { PageResults } from './api.ts'
import ChatWidget from './components/ChatWidget.tsx'
import Footer from './components/Footer.tsx'
import NavBar from './components/NavBar.tsx'
import About from './pages/About.tsx'
import CreateAccount from './pages/CreateAccount.tsx'
import Home from './pages/Home.tsx'
import Login from './pages/Login.tsx'
import ProductPage from './pages/ProductPage.tsx'
import Products from './pages/Products.tsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function NotFound() {
  return (
    <section className="page narrow center">
      <p className="eyebrow">Page not found</p>
      <h1>We couldn't find that page.</h1>
      <Link className="button" to="/products">Browse the shop</Link>
    </section>
  )
}

export default function App() {
  const navigate = useNavigate()
  // Search matches the chat assistant put on the page; kept here so they survive visiting a product and coming back.
  const [chatResults, setChatResults] = useState<PageResults | null>(null)

  const showChatResults = useCallback(
    (results: PageResults) => {
      setChatResults(results)
      navigate('/products')
      window.scrollTo(0, 0)
    },
    [navigate],
  )

  return (
    <>
      <ScrollToTop />
      <a className="skip-link" href="#main">Skip to content</a>
      <NavBar />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/products"
            element={<Products chatResults={chatResults} onClearChatResults={() => setChatResults(null)} />}
          />
          <Route path="/products/:productId" element={<ProductPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <ChatWidget onPageResults={showChatResults} resultsTitle={chatResults?.title} />
    </>
  )
}
