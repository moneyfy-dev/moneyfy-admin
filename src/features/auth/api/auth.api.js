import { apiClient } from '@/services/api/client'

function normalizeSessionPayload(payload) {
  const data = payload?.data || payload || {}

  return {
    manager: data.manager || data.user || null,
    sessionToken: data.sessionToken || data.token || null,
    refreshToken: data.refreshToken || null,
    message: payload?.message || data.message || '',
  }
}

export const apiAuthRepository = {
  async signIn(credentials) {
    const response = await apiClient.post(
      '/api/v1/manager/auth/log-in',
      {
        email: credentials.email,
        pwd: credentials.password,
      },
      {
        skipAuth: true,
        skipAuthRefresh: true,
      },
    )
    return normalizeSessionPayload(response.data)
  },

  async recoverPassword(email) {
    const response = await apiClient.post(
      '/api/v1/manager/auth/restore/password',
      { email },
      { skipAuth: true, skipAuthRefresh: true },
    )
    return response.data?.data || response.data
  },

  async logout() {
    await apiClient.post('/api/v1/manager/auth/logout')
  },
}
