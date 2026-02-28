import type { PayloadRouter } from '../providers/RouterAdapter/index.js'

import { formatAdminURL } from 'payload/shared'

type GoBackProps = {
  adminRoute: string
  collectionSlug: string
  router: PayloadRouter
  serverURL?: string
}

export const handleGoBack = ({ adminRoute, collectionSlug, router, serverURL }: GoBackProps) => {
  const redirectRoute = formatAdminURL({
    adminRoute,
    path: collectionSlug ? `/collections/${collectionSlug}` : '/',
  })
  router.push(redirectRoute)
}
