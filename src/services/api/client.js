import axios from 'axios'
import { runtimeConfig } from '@/config/runtime'
import { normalizeApiError } from './errors'
import { tokenStorage } from './token-storage'

export const apiClient = axios.create({
  baseURL: runtimeConfig.apiUrl,
  timeout: runtimeConfig.requestTimeout,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

function applyRotatedTokens(response) {
  const nextSessionToken = response?.headers?.['x-new-session-token']
  const nextRefreshToken = response?.headers?.['x-new-refresh-token']

  if (nextSessionToken) {
    tokenStorage.setSessionToken(nextSessionToken)
  }

  if (nextRefreshToken) {
    tokenStorage.setRefreshToken(nextRefreshToken)
  }

  return response
}

apiClient.interceptors.request.use((config) => {
  const sessionToken = tokenStorage.getSessionToken()
  const refreshToken = tokenStorage.getRefreshToken()

  if (!config.skipAuth && sessionToken) {
    config.headers.Authorization = `Bearer ${sessionToken}`
  }

  if (!config.skipAuth && refreshToken) {
    config.headers['X-New-Refresh-Token'] = refreshToken
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => applyRotatedTokens(response),
  async (error) => {
    applyRotatedTokens(error?.response)

    const status = error?.response?.status
    const request = error?.config
    const shouldLogout =
      (status === 401 || status === 417) &&
      request &&
      !request.skipAuthRefresh &&
      !request.skipAuth

    if (shouldLogout) {
      tokenStorage.clear()
      unauthorizedHandler?.()
    }

    throw normalizeApiError(error)
  },
)
