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
  const resetMessage = ref('')

  const isAuthenticated = computed(() => Boolean(user.value && tokenStorage.hasSession()))

  function resolveAuthErrorMessage(requestError, fallbackMessage) {
    if (requestError.code === 'NETWORK_ERROR') {
      return 'No fue posible conectar con el servidor.'
    }

    return requestError.message || fallbackMessage
  }

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
      error.value = resolveAuthErrorMessage(signInError, 'No fue posible iniciar sesion.')
      throw signInError
    } finally {
      loading.value = false
    }
  }

  async function recoverPassword(email) {
    loading.value = true
    recoveryMessage.value = ''
    resetMessage.value = ''
    error.value = ''

    try {
      const result = await authRepository.recoverPassword(email)
      recoveryMessage.value = result.message || 'Solicitud enviada correctamente.'
      return result
    } catch (recoveryError) {
      error.value = resolveAuthErrorMessage(
        recoveryError,
        'No fue posible solicitar la recuperacion.',
      )
      throw recoveryError
    } finally {
      loading.value = false
    }
  }

  async function resendCode(email) {
    loading.value = true
    recoveryMessage.value = ''
    resetMessage.value = ''
    error.value = ''

    try {
      const result = await authRepository.resendCode(email)
      recoveryMessage.value = result.message || 'Codigo reenviado correctamente.'
      return result
    } catch (resendError) {
      error.value = resolveAuthErrorMessage(resendError, 'No fue posible reenviar el codigo.')
      throw resendError
    } finally {
      loading.value = false
    }
  }

  async function confirmPasswordReset(payload) {
    loading.value = true
    recoveryMessage.value = ''
    resetMessage.value = ''
    error.value = ''

    try {
      const session = await authRepository.confirmPasswordReset(payload)
      const manager = session.manager

      if (!manager || !session.sessionToken || !session.refreshToken) {
        throw new Error('Respuesta invalida al confirmar el cambio de contrasena.')
      }

      tokenStorage.setUser(manager)
      tokenStorage.setSessionToken(session.sessionToken)
      tokenStorage.setRefreshToken(session.refreshToken)
      user.value = manager
      resetMessage.value = session.message || 'Contrasena actualizada correctamente.'
      return manager
    } catch (resetError) {
      tokenStorage.clear()
      user.value = null
      error.value = resolveAuthErrorMessage(
        resetError,
        'No fue posible actualizar la contrasena.',
      )
      throw resetError
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
    resetMessage.value = ''
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
    resetMessage,
    isAuthenticated,
    initialize,
    signIn,
    recoverPassword,
    resendCode,
    confirmPasswordReset,
    logout,
    clearFeedback,
  }
})
