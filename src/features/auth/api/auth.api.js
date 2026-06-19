import { apiClient } from '@/services/api/client'

export const apiAuthRepository = {
  async signIn(credentials) {
    const response = await apiClient.post('/auth/login', credentials, {
      skipAuth: true,
      skipAuthRefresh: true,
      withCredentials: true,
    })
    return response.data?.data || response.data
  },

  async recoverPassword(email) {
    const response = await apiClient.post(
      '/auth/forgot-password',
      { email },
      { skipAuth: true, skipAuthRefresh: true },
    )
    return response.data?.data || response.data
  },

  async getProfile() {
    const response = await apiClient.get('/auth/profile')
    return response.data?.data || response.data
  },

  async logout() {
    await apiClient.post('/auth/logout', undefined, { withCredentials: true })
  },
}
