export function formatCurrency(value) {
  if (value === null || value === undefined) return 'No disponible'

  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(value) {
  if (!value) return 'No disponible'

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export function toInputDate(value) {
  return value.toISOString().slice(0, 10)
}
