import { ProgressBar, RouteTransitionProvider } from '@payloadcms/ui'
/**
 * Main Admin application component.
 * Wraps the Payload UI providers and renders the admin panel views.
 */
import React, { useEffect, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'

const apiRoute = window.__PAYLOAD_API_ROUTE__ || '/api'
const serverURL = window.__PAYLOAD_SERVER_URL__ || ''
const adminRoute = window.__PAYLOAD_ADMIN_ROUTE__ || '/admin'

/**
 * Fetch the client config from the Payload REST API.
 */
async function fetchClientConfig() {
  const res = await fetch(`${serverURL}${apiRoute}/payload-config`, {
    credentials: 'include',
  })
  if (res.ok) {
    return res.json()
  }
  return null
}

/**
 * Simple Login form component.
 */
function LoginView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<null | string>(null)
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    void (async () => {
      try {
        const res = await fetch(`${serverURL}${apiRoute}/users/login`, {
          body: JSON.stringify({ email, password }),
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })

        if (res.ok) {
          void navigate(adminRoute)
        } else {
          const data = await res.json()
          setError(data.errors?.[0]?.message || 'Login failed')
        }
      } catch {
        setError('Network error')
      }
    })()
  }

  return (
    <div style={{ margin: '100px auto', maxWidth: '400px', padding: '20px' }}>
      <h1>Payload Admin</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="payload-email">Email</label>
          <input
            aria-label="Email"
            id="payload-email"
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: 'block', padding: '8px', width: '100%' }}
            type="email"
            value={email}
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="payload-password">Password</label>
          <input
            aria-label="Password"
            id="payload-password"
            name="password"
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: 'block', padding: '8px', width: '100%' }}
            type="password"
            value={password}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button style={{ padding: '8px 24px' }} type="submit">
          Login
        </button>
      </form>
    </div>
  )
}

/**
 * Dashboard placeholder component.
 */
function DashboardView() {
  const location = useLocation()

  return (
    <div style={{ padding: '20px' }}>
      <h1>Payload Dashboard</h1>
      <p>Admin panel running on Express + Vite</p>
      <p>Current route: {location.pathname}</p>
      <nav>
        <ul>
          <li>
            <a href={`${adminRoute}/collections`}>Collections</a>
          </li>
        </ul>
      </nav>
    </div>
  )
}

/**
 * Main Admin App component with routing.
 */
export function AdminApp() {
  const [loading, setLoading] = useState(true)
  const [_clientConfig, setClientConfig] = useState<null | Record<string, unknown>>(null)

  useEffect(() => {
    fetchClientConfig()
      .then((config) => {
        setClientConfig(config)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div
        style={{ alignItems: 'center', display: 'flex', height: '100vh', justifyContent: 'center' }}
      >
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <RouteTransitionProvider>
      <ProgressBar />
      <Routes>
        <Route element={<LoginView />} path="login" />
        <Route element={<DashboardView />} path="*" />
      </Routes>
    </RouteTransitionProvider>
  )
}
