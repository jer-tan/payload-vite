import type {
  APIError,
  GraphQLError,
  GraphQLFormattedError,
  Payload,
  PayloadRequest,
  SanitizedConfig,
} from 'payload'

import { configToSchema } from '@payloadcms/graphql'
import { createHandler } from 'graphql-http/lib/use/fetch'
import { status as httpStatus } from 'http-status'
import {
  addDataAndFileToRequest,
  addLocalesToRequestFromData,
  createPayloadRequest,
  headersWithCors,
  logError,
  mergeHeaders,
} from 'payload'

const handleError = async ({
  err,
  payload,
  req,
}: {
  err: GraphQLError
  payload: Payload
  req: PayloadRequest
}): Promise<GraphQLFormattedError> => {
  const status = (err.originalError as APIError).status || httpStatus.INTERNAL_SERVER_ERROR
  let errorMessage = err.message
  logError({ err, payload })

  if (!payload.config.debug && status === httpStatus.INTERNAL_SERVER_ERROR) {
    errorMessage = 'Something went wrong.'
  }

  let response: GraphQLFormattedError = {
    extensions: {
      name: err?.originalError?.name || undefined,
      data: (err && err.originalError && (err.originalError as APIError).data) || undefined,
      stack: payload.config.debug ? err.stack : undefined,
      statusCode: status,
    },
    locations: err.locations,
    message: errorMessage,
    path: err.path,
  }

  await payload.config.hooks.afterError?.reduce(async (promise, hook) => {
    await promise
    const result = await hook({
      context: req.context,
      error: err,
      graphqlResult: response,
      req,
    })
    if (result) {
      response = result.graphqlResult || response
    }
  }, Promise.resolve())

  return response
}

let cached: {
  graphql: { schema: unknown; validationRules: unknown } | null
  promise: null | Promise<unknown>
} = { graphql: null, promise: null }

const getGraphql = async (config: Promise<SanitizedConfig> | SanitizedConfig) => {
  if (process.env.NODE_ENV === 'development') {
    cached = { graphql: null, promise: null }
  }

  if (cached.graphql) {
    return cached.graphql
  }

  if (!cached.promise) {
    const resolvedConfig = await config
    cached.promise = new Promise((resolve) => {
      const schema = configToSchema(resolvedConfig)
      resolve(cached.graphql || schema)
    })
  }

  try {
    cached.graphql = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.graphql
}

/**
 * Handle GraphQL POST requests using standard Fetch API Request/Response.
 */
export const graphqlHandler = async (
  config: Promise<SanitizedConfig> | SanitizedConfig,
  request: Request,
): Promise<Response> => {
  const originalRequest = request.clone()
  const req = await createPayloadRequest({
    canSetHeaders: true,
    config,
    request,
  })

  await addDataAndFileToRequest(req)
  addLocalesToRequestFromData(req)

  const { schema, validationRules } = await getGraphql(config)
  const { payload } = req

  const headers: Record<string, string> = {}
  const apiResponse = await createHandler({
    context: { headers, req },
    onOperation: async (_request, args, result) => {
      const response =
        typeof payload.extensions === 'function'
          ? await payload.extensions({ args, req: _request, result })
          : result
      if (response.errors) {
        const errors = (await Promise.all(
          result.errors!.map((error) => handleError({ err: error, payload, req })),
        )) as GraphQLError[]
        return { ...response, errors }
      }
      return response
    },
    schema,
    validationRules: (_, args, defaultRules) => defaultRules.concat(validationRules(args)),
  })(originalRequest)

  const resHeaders = headersWithCors({
    headers: new Headers(apiResponse.headers),
    req,
  })

  for (const key in headers) {
    resHeaders.append(key, headers[key])
  }

  return new Response(apiResponse.body, {
    headers: req.responseHeaders ? mergeHeaders(req.responseHeaders, resHeaders) : resHeaders,
    status: apiResponse.status,
  })
}

/**
 * Handle GraphQL Playground GET requests.
 */
export const graphqlPlaygroundHandler = async (
  config: Promise<SanitizedConfig> | SanitizedConfig,
  request: Request,
): Promise<Response> => {
  const { renderPlaygroundPage } = await import('graphql-playground-html')
  const req = await createPayloadRequest({ config, request })

  if (
    (!req.payload.config.graphQL.disable &&
      !req.payload.config.graphQL.disablePlaygroundInProduction &&
      process.env.NODE_ENV === 'production') ||
    process.env.NODE_ENV !== 'production'
  ) {
    const { formatAdminURL } = await import('payload/shared')
    const endpoint = formatAdminURL({
      apiRoute: req.payload.config.routes.api,
      path: req.payload.config.routes.graphQL as `/${string}`,
    })
    return new Response(
      renderPlaygroundPage({
        endpoint,
        settings: { 'request.credentials': 'include' },
      }),
      {
        headers: { 'Content-Type': 'text/html' },
        status: 200,
      },
    )
  }

  return new Response('Route Not Found', { status: 404 })
}
