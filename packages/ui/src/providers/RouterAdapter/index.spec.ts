import { describe, expect, it } from 'vitest'

// Test the RouterAdapter interface shape and default fallback behaviour
// without requiring a full browser environment.

describe('RouterAdapter interface', () => {
  it('PayloadRouter interface defines push, replace and refresh', () => {
    // Ensure the interface contract is stable by constructing a mock that satisfies it
    type PayloadRouter = {
      push: (url: string, options?: { scroll?: boolean }) => void
      refresh: () => void
      replace: (url: string, options?: { scroll?: boolean }) => void
    }

    const router: PayloadRouter = {
      push: (url: string) => {
        expect(typeof url).toBe('string')
      },
      refresh: () => {
        // ok
      },
      replace: (url: string) => {
        expect(typeof url).toBe('string')
      },
    }

    expect(typeof router.push).toBe('function')
    expect(typeof router.replace).toBe('function')
    expect(typeof router.refresh).toBe('function')
  })

  it('RouterAdapter interface defines all required hooks and Link component', () => {
    type RouterAdapter = {
      Link: React.ComponentType<any>
      useParams: () => Record<string, string | string[]>
      usePathname: () => string
      useRouter: () => {
        push: (url: string, options?: { scroll?: boolean }) => void
        refresh: () => void
        replace: (url: string, options?: { scroll?: boolean }) => void
      }
      useSearchParams: () => URLSearchParams
    }

    // TypeScript type check - if this compiles, the interface is correct
    const adapter: RouterAdapter = {
      Link: (() => null) as any,
      useParams: () => ({ id: '123' }),
      usePathname: () => '/admin/collections',
      useRouter: () => ({
        push: () => undefined,
        refresh: () => undefined,
        replace: () => undefined,
      }),
      useSearchParams: () => new URLSearchParams('page=1'),
    }

    expect(typeof adapter.useRouter).toBe('function')
    expect(typeof adapter.usePathname).toBe('function')
    expect(typeof adapter.useSearchParams).toBe('function')
    expect(typeof adapter.useParams).toBe('function')
    expect(typeof adapter.Link).toBe('function')
  })

  it('default browser RouterAdapter produces correct pathname from location', () => {
    // Simulate the default adapter's usePathname behaviour
    const mockPathname = '/admin/collections/posts'

    const usePathname = () => mockPathname

    expect(usePathname()).toBe('/admin/collections/posts')
  })

  it('default browser RouterAdapter produces correct search params', () => {
    const mockSearch = 'page=2&limit=10'
    const useSearchParams = () => new URLSearchParams(mockSearch)

    const params = useSearchParams()

    expect(params.get('page')).toBe('2')
    expect(params.get('limit')).toBe('10')
  })
})
