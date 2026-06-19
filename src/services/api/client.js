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

let refreshPromise = null
let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post('/auth/refresh', undefined, {
        withCredentials: true,
        skipAuthRefresh: true,
      })
      .then((response) => {
        const token = response.data?.data?.accessToken || response.data?.accessToken
        if (!token) throw new Error('La API no devolvió un access token.')
        tokenStorage.setAccessToken(token)
        return token
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()

  if (token && !config.skipAuth) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config
    const canRefresh =
      error.response?.status === 401 &&
      request &&
      !request.skipAuthRefresh &&
      !request._retry

    if (canRefresh) {
      request._retry = true

      try {
        const token = await refreshAccessToken()
        request.headers.Authorization = `Bearer ${token}`
        return apiClient(request)
      } catch (refreshError) {
        tokenStorage.clear()
        unauthorizedHandler?.()
        throw normalizeApiError(refreshError)
      }
    }

    throw normalizeApiError(error)
  },
)
