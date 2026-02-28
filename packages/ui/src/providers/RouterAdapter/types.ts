import type React from 'react'

/**
 * Router adapter interface that abstracts framework-specific routing.
 * This allows @payloadcms/ui to work with any routing framework
 * (Next.js, React Router, TanStack Router, etc.)
 */

export type PayloadRouter = {
  /** Navigate to a new URL, pushing a new history entry */
  push: (url: string, options?: { scroll?: boolean }) => void
  /** Refresh the current route data (no-op in client-only routers) */
  refresh: () => void
  /** Navigate to a new URL, replacing the current history entry */
  replace: (url: string, options?: { scroll?: boolean }) => void
}

export type PayloadLinkProps = {
  children?: React.ReactNode
  className?: string
  href: string
  id?: string
  onClick?: React.MouseEventHandler<HTMLAnchorElement>
  prefetch?: boolean
  ref?: React.Ref<HTMLAnchorElement>
  replace?: boolean
  scroll?: boolean
  style?: React.CSSProperties
  tabIndex?: number
  target?: string
  title?: string
}

export type RouterAdapter = {
  /** A link component that integrates with the router */
  Link: React.ComponentType<PayloadLinkProps>
  /** Hook to get current route parameters */
  useParams: () => Record<string, string | string[]>
  /** Hook to get current pathname */
  usePathname: () => string
  /** Hook to get the router instance */
  useRouter: () => PayloadRouter
  /** Hook to get current URL search params */
  useSearchParams: () => URLSearchParams
}
