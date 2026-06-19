const SESSION_TOKEN_KEY = 'moneyfy-admin-session-token'
const REFRESH_TOKEN_KEY = 'moneyfy-admin-refresh-token'
const USER_KEY = 'moneyfy-admin-user'
const SESSION_MARKER_KEY = 'moneyfy-admin-session'

let sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY)
let refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY)
let user = readUser()

function readUser() {
  const rawUser = localStorage.getItem(USER_KEY)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser)
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

function syncSessionMarker() {
  if (sessionToken && refreshToken) {
    localStorage.setItem(SESSION_MARKER_KEY, 'active')
    return
  }

  localStorage.removeItem(SESSION_MARKER_KEY)
}

export const tokenStorage = {
  getSessionToken() {
    return sessionToken
  },

  setSessionToken(token) {
    sessionToken = token || null

    if (sessionToken) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, sessionToken)
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY)
    }

    syncSessionMarker()
  },

  getRefreshToken() {
    return refreshToken
  },

  setRefreshToken(token) {
    refreshToken = token || null

    if (refreshToken) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } else {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    }

    syncSessionMarker()
  },

  getUser() {
    return user
  },

  setUser(nextUser) {
    user = nextUser || null

    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      return
    }

    localStorage.removeItem(USER_KEY)
  },

  hasSession() {
    return Boolean(sessionToken && refreshToken && localStorage.getItem(SESSION_MARKER_KEY) === 'active')
  },

  clear() {
    sessionToken = null
    refreshToken = null
    user = null
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(SESSION_MARKER_KEY)
  },
}
