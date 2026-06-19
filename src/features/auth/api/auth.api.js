import { apiClient } from '@/services/api/client'

export const apiAuthRepository = {
  async signIn(credentials) {
    const response = await apiClient.post(
      '/auth/log-in',
      {
        email: credentials.email,
        pwd: credentials.password,
      },
      {
        skipAuth: true,
        skipAuthRefresh: true,
      },
    )
    return response.data?.data || response.data
  },

  async recoverPassword(email) {
    const response = await apiClient.post(
      '/auth/restore/password',
      { email },
      { skipAuth: true, skipAuthRefresh: true },
    )
    return response.data?.data || response.data
  },

  async logout() {
    await apiClient.post('/auth/logout')
  },
}
