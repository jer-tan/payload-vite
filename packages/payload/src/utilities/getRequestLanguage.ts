import type { AcceptedLanguages } from '@payloadcms/translations'

import { extractHeaderLanguage } from '@payloadcms/translations'

import type { SanitizedConfig } from '../config/types.js'

type ReadonlyRequestCookies = {
  get: (name: string) => { name: string; value: string } | undefined
  getAll: () => Array<{ name: string; value: string }>
  has: (name: string) => boolean
}

type GetRequestLanguageArgs = {
  config: SanitizedConfig
  cookies: Map<string, string> | ReadonlyRequestCookies
  defaultLanguage?: AcceptedLanguages
  headers: Request['headers']
}

export const getRequestLanguage = ({
  config,
  cookies,
  headers,
}: GetRequestLanguageArgs): AcceptedLanguages => {
  const supportedLanguageKeys = Object.keys(config.i18n.supportedLanguages) as AcceptedLanguages[]
  const langCookie = cookies.get(`${config.cookiePrefix || 'payload'}-lng`)

  const languageFromCookie: AcceptedLanguages = (
    typeof langCookie === 'string' ? langCookie : langCookie?.value
  ) as AcceptedLanguages

  if (languageFromCookie && supportedLanguageKeys.includes(languageFromCookie)) {
    return languageFromCookie
  }

  const languageFromHeader = headers.get('Accept-Language')
    ? extractHeaderLanguage(headers.get('Accept-Language')!)
    : undefined

  if (languageFromHeader && supportedLanguageKeys.includes(languageFromHeader)) {
    return languageFromHeader
  }

  return config.i18n.fallbackLanguage
}
