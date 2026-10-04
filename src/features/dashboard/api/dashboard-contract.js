export const COMMISSION_STATUSES = ['Pendiente', 'Aprobado', 'Pagado', 'Conflictivo']
export const PAGE_SIZES = [10, 25, 50, 100]
const incomplete = () => new Error('El dashboard recibió datos incompletos. Verifica que el backend esté actualizado.')
function number(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) throw incomplete()
  return Number(value)
}
function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
export function periodParams({ dateFrom = '', dateTo = '' } = {}) {
  if (!dateFrom && !dateTo) return {}
  if (!validDate(dateFrom) || !validDate(dateTo) || dateFrom > dateTo) throw new Error('Selecciona fechas válidas de inicio y fin, en orden cronológico.')
  return { dateFrom, dateTo }
}
export function periodLabel(period = {}) {
  return period.dateFrom && period.dateTo ? `${period.dateFrom} al ${period.dateTo}` : 'Todo el historial'
}
export function dashboardMetrics(summary) {
  return [
    { icon: 'ri-user-star-line', label: 'Usuarios activos', amount: summary.activeUsers, eyebrow: 'Actual' },
    { icon: 'ri-hourglass-line', label: 'Comisiones por aprobar', amount: summary.pendingApprovalCommissions, status: 'Pendiente', eyebrow: 'Pendiente', tone: 'amber' },
    { icon: 'ri-time-line', label: 'Comisiones por pagar', amount: summary.pendingCommissions, status: 'Aprobado', eyebrow: 'Aprobado' },
    { icon: 'ri-checkbox-circle-line', label: 'Comisiones pagadas', amount: summary.paidCommissions, status: 'Pagado', eyebrow: 'Pagado' },
    { icon: 'ri-error-warning-line', label: 'Comisiones conflictivas', amount: summary.conflictCommissions, status: 'Conflictivo', eyebrow: 'Conflictivo', tone: 'amber' },
  ]
}
const dataOf = response => response.data?.data
function checkPeriod(data, params) {
  if ((data.dateFrom || '') !== (params.dateFrom || '') || (data.dateTo || '') !== (params.dateTo || '')) throw new Error('La respuesta no corresponde al período seleccionado. Vuelve a consultar.')
}
export function createDashboardRepository(client) {
  return {
    async getSummary(period = {}) {
      const params = periodParams(period)
      const response = await client.get('/api/v1/manager/dashboard/summary', { params })
      const data = dataOf(response)?.summary || dataOf(response)
      if (!data || !Array.isArray(data.weeklyMetrics)) throw incomplete()
      checkPeriod(data, params)
      const summary = { ...data }
      for (const key of ['activeUsers', 'paidCommissions', 'pendingCommissions', 'pendingApprovalCommissions', 'conflictCommissions']) summary[key] = number(data[key])
      summary.weeklyMetrics = data.weeklyMetrics.map(item => ({ ...item, label: item.label || item.date || '', commissions: number(item.commissions), sales: number(item.sales), users: number(item.users) }))
      return summary
    },
    async getCommissions({ status, page = 0, size = 10, userId, ...period } = {}) {
      if (!COMMISSION_STATUSES.includes(status) || !PAGE_SIZES.includes(size) || !Number.isInteger(page) || page < 0) throw new Error('Estado o paginación inválidos.')
      const params = { ...periodParams(period), status, page, size, ...(userId ? { userId } : {}) }
      const data = dataOf(await client.get('/api/v1/manager/dashboard/commissions', { params }))
      if (!data || !Array.isArray(data.content) || data.status !== status) throw incomplete()
      checkPeriod(data, params)
      return { ...data, content: data.content.map(row => ({ ...row, amount: number(row.amount) })), page: number(data.page), size: number(data.size), totalPages: number(data.totalPages), totalElements: number(data.totalElements), totalAmount: number(data.totalAmount) }
    },
    async getReconciliation() {
      const data = dataOf(await client.get('/api/v1/manager/dashboard/commission-reconciliation', { params: {} }))
      if (!data || !Array.isArray(data.content)) throw incomplete()
      return { ...data, discrepancyCount: number(data.discrepancyCount), content: data.content.map(row => ({ ...row, walletPendingApproval: row.walletMissing ? null : number(row.walletPendingApproval), ledgerPendingApproval: number(row.ledgerPendingApproval), difference: row.walletMissing ? null : number(row.difference) })) }
    },
  }
}
