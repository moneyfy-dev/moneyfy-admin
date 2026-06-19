export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN_ERROR', message, fields = null, cause }) {
    super(message || 'No fue posible completar la solicitud.')
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.cause = cause
  }
}

export function normalizeApiError(error) {
  if (error instanceof ApiError) return error

  const response = error?.response
  const payload = response?.data

  return new ApiError({
    status: response?.status || 0,
    code: payload?.code || (response ? 'API_ERROR' : 'NETWORK_ERROR'),
    message:
      payload?.message ||
      (response ? 'La API rechazó la solicitud.' : 'No fue posible conectar con el servidor.'),
    fields: payload?.fields || payload?.data || null,
    cause: error,
  })
}
