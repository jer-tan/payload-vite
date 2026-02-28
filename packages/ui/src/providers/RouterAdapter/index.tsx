'use client'
import React, { createContext, use, useMemo } from 'react'

import type { PayloadLinkProps, PayloadRouter, RouterAdapter } from './types.js'

const RouterAdapterContext = createContext<RouterAdapter | null>(null)

/**
 * Default Link component using standard <a> tags with client-side navigation
 */
const DefaultLink: React.FC<PayloadLinkProps> = ({
  children,
  href,
  onClick,
  ref,
  replace: _replace,
  scroll: _scroll,
  ...rest
}) => {
  return (
    <a href={href} onClick={onClick} ref={ref} {...rest}>
      {children}
    </a>
  )
}

/**
 * Default router implementation using the browser History API.
 * This is used as a fallback when no router adapter is provided.
 */
const defaultAdapter: RouterAdapter = {
  Link: DefaultLink,
  useParams: () => ({}),
  usePathname: () => {
    if (typeof window === 'undefined') {
      return '/'
    }
    return window.location.pathname
  },
  useRouter: () => ({
    push: (url: string) => {
      window.location.href = url
    },
    refresh: () => {
      window.location.reload()
    },
    replace: (url: string) => {
      window.location.replace(url)
    },
  }),
  useSearchParams: () => {
    if (typeof window === 'undefined') {
      return new URLSearchParams()
    }
    return new URLSearchParams(window.location.search)
  },
}

export const RouterAdapterProvider: React.FC<{
  adapter?: RouterAdapter
  children: React.ReactNode
}> = ({ adapter, children }) => {
  const value = useMemo(() => adapter ?? defaultAdapter, [adapter])
  return <RouterAdapterContext value={value}>{children}</RouterAdapterContext>
}

function useAdapter(): RouterAdapter {
  const ctx = use(RouterAdapterContext)
  return ctx ?? defaultAdapter
}

/**
 * Hook to get the router instance from the current router adapter.
 * Returns an object with push(), replace(), and refresh() methods.
 */
export function useRouter(): PayloadRouter {
  const adapter = useAdapter()
  return adapter.useRouter()
}

/**
 * Hook to get the current pathname from the router adapter.
 */
export function usePathname(): string {
  const adapter = useAdapter()
  return adapter.usePathname()
}

/**
 * Hook to get the current URL search params from the router adapter.
 */
export function useSearchParams(): URLSearchParams {
  const adapter = useAdapter()
  return adapter.useSearchParams()
}

/**
 * Hook to get the current route params from the router adapter.
 */
export function useParams(): Record<string, string | string[]> {
  const adapter = useAdapter()
  return adapter.useParams()
}

/**
 * Get the Link component from the current router adapter.
 */
export function useLink(): React.ComponentType<PayloadLinkProps> {
  const adapter = useAdapter()
  return adapter.Link
}

export type { PayloadLinkProps, PayloadRouter, RouterAdapter } from './types.js'
