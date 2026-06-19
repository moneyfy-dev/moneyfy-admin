const DEMO_ADMIN = Object.freeze({
  id: 'admin-demo',
  email: 'alejandro.osses.r@gmail.com',
  name: 'Alejandro Osses',
  role: 'admin',
})

const DEMO_PASSWORD = 'Moneyfy2026'

const wait = (milliseconds = 350) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export const mockAuthRepository = {
  async signIn({ email, password }) {
    await wait()

    if (email.trim().toLowerCase() !== DEMO_ADMIN.email || password !== DEMO_PASSWORD) {
      throw new Error('Credenciales no validas para el administrador Moneyfy.')
    }

    return {
      user: DEMO_ADMIN,
      sessionToken: 'moneyfy-admin-demo-session-token',
      refreshToken: 'moneyfy-admin-demo-refresh-token',
    }
  },

  async recoverPassword(email) {
    await wait()

    return {
      message: `Se enviaria un enlace de recuperacion a ${email}.`,
    }
  },

  async logout() {
    await wait(100)
  },
}
