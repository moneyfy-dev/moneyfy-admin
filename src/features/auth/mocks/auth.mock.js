import { ApiError } from '@/services/api/errors'

const DEMO_ADMIN = Object.freeze({
  managerId: 'admin-demo',
  email: 'alejandro.osses.r@gmail.com',
  name: 'Alejandro Osses',
  surname: 'Moneyfy',
  status: 'Activado',
})

const DISABLED_ADMIN = Object.freeze({
  managerId: 'admin-disabled',
  email: 'admin.desactivado@moneyfy.cl',
  name: 'Admin',
  surname: 'Desactivado',
  status: 'Desactivado',
})

const DEMO_PASSWORD = 'Moneyfy2026'

const wait = (milliseconds = 350) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export const mockAuthRepository = {
  async signIn({ email, password }) {
    await wait()

    const normalizedEmail = String(email || '').toLowerCase()

    if (normalizedEmail === DISABLED_ADMIN.email && password === DEMO_PASSWORD) {
      throw new ApiError({
        status: 424,
        code: 'FAILED_DEPENDENCY',
        message: 'cuenta de administrador desactivada',
      })
    }

    if (normalizedEmail !== DEMO_ADMIN.email || password !== DEMO_PASSWORD) {
      throw new ApiError({
        status: 423,
        code: 'LOCKED',
        message: 'credenciales incorrectas',
      })
    }

    return {
      manager: DEMO_ADMIN,
      sessionToken: 'moneyfy-admin-demo-session-token',
      refreshToken: 'moneyfy-admin-demo-refresh-token',
    }
  },

  async recoverPassword(email) {
    await wait()

    if (String(email || '').toLowerCase() === 'root.moneyfyapp@gmail.com') {
      throw new ApiError({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'El administrador principal no puede restablecer su contrasena mediante este flujo',
      })
    }

    return {
      message: 'se envio el codigo de reestablecimiento de contrasena para el usuario administrador',
    }
  },

  async resendCode(email) {
    await wait()

    if (String(email || '').toLowerCase() === 'root.moneyfyapp@gmail.com') {
      throw new ApiError({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'El administrador principal no puede restablecer su contrasena mediante este flujo',
      })
    }

    return {
      message: 'se reenvio el codigo para reestrablecer la contrasena del usuario',
    }
  },

  async confirmPasswordReset({ email, code, password, repeatedPassword }) {
    await wait()

    const normalizedEmail = String(email || '').toLowerCase()

    if (normalizedEmail === 'root.moneyfyapp@gmail.com') {
      throw new ApiError({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'El administrador principal no puede restablecer su contrasena mediante este flujo',
      })
    }

    if (!code || code !== '123456') {
      throw new ApiError({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Error de codigo: el codigo de confirmacion es invalido',
      })
    }

    if (!password || !repeatedPassword) {
      throw new ApiError({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Error de formato: las contrasenas no pueden estar vacias',
      })
    }

    if (password !== repeatedPassword) {
      throw new ApiError({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Error de formato: las contrasenas no coinciden',
      })
    }

    return {
      manager: {
        ...DEMO_ADMIN,
        email: normalizedEmail || DEMO_ADMIN.email,
      },
      sessionToken: 'moneyfy-admin-demo-session-token-reset',
      refreshToken: 'moneyfy-admin-demo-refresh-token-reset',
      message: 'se reestablecio su contrasena',
    }
  },

  async logout() {
    await wait(100)
  },
}
