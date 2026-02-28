/**
 * Admin panel client-side entry point for Vite.
 * This bootstraps the Payload admin UI using React Router for client-side routing.
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { RouterAdapterProvider } from '@payloadcms/ui/providers/RouterAdapter'
import { createReactRouterAdapter } from './router-adapter.js'
import { AdminApp } from './App.js'

declare global {
  interface Window {
    __PAYLOAD_ADMIN_ROUTE__: string
    __PAYLOAD_API_ROUTE__: string
    __PAYLOAD_SERVER_URL__: string
  }
}

const adminRoute = window.__PAYLOAD_ADMIN_ROUTE__ || '/admin'
const routerAdapter = createReactRouterAdapter()

function Root() {
  return (
    <BrowserRouter>
      <RouterAdapterProvider adapter={routerAdapter}>
        <Routes>
          <Route element={<AdminApp />} path={`${adminRoute}/*`} />
        </Routes>
      </RouterAdapterProvider>
    </BrowserRouter>
  )
}

const container = document.getElementById('app')
if (container) {
  const root = createRoot(container)
  root.render(<Root />)
}
