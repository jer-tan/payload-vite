'use client'
import React from 'react'
import {
  Link as ReactRouterLink,
  useLocation,
  useParams as useReactRouterParams,
  useNavigate,
  useSearchParams as useReactRouterSearchParams,
} from 'react-router-dom'

import type { PayloadLinkProps, RouterAdapter } from '@payloadcms/ui/providers/RouterAdapter'

/**
 * Link component that wraps React Router's Link.
 */
const RouterLink: React.FC<PayloadLinkProps> = ({
  children,
  href,
  onClick,
  ref,
  replace,
  scroll: _scroll,
  ...rest
}) => {
  return (
    <ReactRouterLink
      onClick={onClick}
      ref={ref}
      replace={replace}
      to={href}
      {...rest}
    >
      {children}
    </ReactRouterLink>
  )
}

function usePayloadRouter() {
  const navigate = useNavigate()

  return React.useMemo(
    () => ({
      push: (url: string, options?: { scroll?: boolean }) => {
        navigate(url)
        if (options?.scroll !== false) {
          window.scrollTo(0, 0)
        }
      },
      refresh: () => {
        // In a client-side app, refresh reloads the current page
        window.location.reload()
      },
      replace: (url: string, options?: { scroll?: boolean }) => {
        navigate(url, { replace: true })
        if (options?.scroll !== false) {
          window.scrollTo(0, 0)
        }
      },
    }),
    [navigate],
  )
}

function usePayloadPathname(): string {
  const location = useLocation()
  return location.pathname
}

function usePayloadSearchParams(): URLSearchParams {
  const [searchParams] = useReactRouterSearchParams()
  return searchParams
}

function usePayloadParams(): Record<string, string | string[]> {
  return useReactRouterParams() as Record<string, string | string[]>
}

/**
 * Create a RouterAdapter that uses React Router for the Payload admin panel.
 * Pass this to the RouterAdapterProvider in your app.
 */
export function createReactRouterAdapter(): RouterAdapter {
  return {
    Link: RouterLink,
    useParams: usePayloadParams,
    usePathname: usePayloadPathname,
    useRouter: usePayloadRouter,
    useSearchParams: usePayloadSearchParams,
  }
}
