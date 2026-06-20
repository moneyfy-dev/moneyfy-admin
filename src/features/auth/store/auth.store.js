import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authRepository } from '../api/auth.repository'
import { tokenStorage } from '@/services/api/token-storage'
import { setUnauthorizedHandler } from '@/services/api/client'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(tokenStorage.getUser())
  const loading = ref(false)
  const initialized = ref(false)
  const error = ref('')
  const recoveryMessage = ref('')

  const isAuthenticated = computed(() => Boolean(user.value && tokenStorage.hasSession()))

  async function initialize() {
    if (initialized.value) return

    if (!tokenStorage.hasSession()) {
      tokenStorage.clear()
      user.value = null
      initialized.value = true
      return
    }

    const storedUser = tokenStorage.getUser()

    if (!storedUser) {
      tokenStorage.clear()
      user.value = null
      initialized.value = true
      return
    }

    user.value = storedUser
    initialized.value = true
  }

  async function signIn(credentials) {
    loading.value = true
    error.value = ''

    try {
      const session = await authRepository.signIn(credentials)
      const manager = session.manager

      if (!manager || !session.sessionToken || !session.refreshToken) {
        throw new Error('Respuesta de autenticacion administrativa invalida.')
      }

      tokenStorage.setUser(manager)
      tokenStorage.setSessionToken(session.sessionToken)
      tokenStorage.setRefreshToken(session.refreshToken)
      user.value = manager
      return manager
    } catch (signInError) {
      tokenStorage.clear()
      user.value = null
      error.value =
        signInError.code === 'NETWORK_ERROR'
          ? 'No fue posible conectar con el servidor.'
          : signInError.message || 'No fue posible iniciar sesion.'
      throw signInError
    } finally {
      loading.value = false
    }
  }

  async function recoverPassword(email) {
    loading.value = true
    recoveryMessage.value = ''
    error.value = ''

    try {
      const result = await authRepository.recoverPassword(email)
      recoveryMessage.value = result.message || 'Solicitud enviada correctamente.'
    } catch (recoveryError) {
      error.value = recoveryError.message || 'No fue posible solicitar la recuperacion.'
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authRepository.logout()
    } catch {
    } finally {
      tokenStorage.clear()
      user.value = null
    }
  }

  function clearFeedback() {
    error.value = ''
    recoveryMessage.value = ''
  }

  setUnauthorizedHandler(() => {
    tokenStorage.clear()
    user.value = null
    window.location.assign('/login')
  })

  return {
    user,
    loading,
    initialized,
    error,
    recoveryMessage,
    isAuthenticated,
    initialize,
    signIn,
    recoverPassword,
    logout,
    clearFeedback,
  }
})
