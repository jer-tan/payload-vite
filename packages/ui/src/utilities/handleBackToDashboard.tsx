import type { PayloadRouter } from '../providers/RouterAdapter/index.js'

import { formatAdminURL } from 'payload/shared'

type BackToDashboardProps = {
  adminRoute: string
  router: PayloadRouter
  serverURL?: string
}

export const handleBackToDashboard = ({ adminRoute, router, serverURL }: BackToDashboardProps) => {
  const redirectRoute = formatAdminURL({
    adminRoute,
    path: '',
    serverURL,
  })
  router.push(redirectRoute)
}
