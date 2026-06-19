const ACCESS_TOKEN_KEY = 'moneyfy-admin-access-token'
const SESSION_MARKER_KEY = 'moneyfy-admin-session'

let accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY)

export const tokenStorage = {
  getAccessToken() {
    return accessToken
  },

  setAccessToken(token) {
    accessToken = token || null

    if (accessToken) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
      localStorage.setItem(SESSION_MARKER_KEY, 'active')
      return
    }

    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(SESSION_MARKER_KEY)
  },

  hasSession() {
    return Boolean(accessToken || localStorage.getItem(SESSION_MARKER_KEY) === 'active')
  },

  clear() {
    accessToken = null
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(SESSION_MARKER_KEY)
  },
}
