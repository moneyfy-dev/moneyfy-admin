import { apiClient } from '@/services/api/client'

function normalizeNumber(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function normalizeMetric(item) {
  return {
    date: item?.date || '',
    label: item?.label || item?.date || '',
    commissions: normalizeNumber(item?.commissions),
    sales: normalizeNumber(item?.sales),
    users: normalizeNumber(item?.users),
  }
}

export const apiDashboardRepository = {
  async getSummary() {
    const response = await apiClient.get('/api/v1/manager/dashboard/summary')

    const data = response.data?.data?.summary || response.data?.data || {}

    return {
      activeUsers: normalizeNumber(data.activeUsers),
      paidCommissions: normalizeNumber(data.paidCommissions),
      pendingCommissions: normalizeNumber(data.pendingCommissions),
      weeklyMetrics: Array.isArray(data.weeklyMetrics)
        ? data.weeklyMetrics.map(normalizeMetric)
        : [],
    }
  },
}
