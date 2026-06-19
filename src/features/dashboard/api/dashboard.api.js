import { apiClient } from '@/services/api/client'
import { runtimeConfig } from '@/config/runtime'

function getManagerHeaders() {
  if (!runtimeConfig.managerApiKey) {
    throw new Error('Falta configurar VITE_MONEYFY_API_KEY para consultar el dashboard.')
  }

  return {
    'X-Moneyfy-Api-Key': runtimeConfig.managerApiKey,
  }
}

function normalizeMetric(item) {
  return {
    date: item?.date || '',
    label: item?.label || item?.date || '',
    commissions: Number(item?.commissions || 0),
    sales: Number(item?.sales || 0),
    users: Number(item?.users || 0),
  }
}

export const apiDashboardRepository = {
  async getSummary() {
    const response = await apiClient.get('/api/v1/manager/dashboard/summary', {
      headers: getManagerHeaders(),
      skipAuth: true,
      skipAuthRefresh: true,
    })

    const data = response.data?.data || {}

    return {
      activeUsers: Number(data.activeUsers || 0),
      paidCommissions: Number(data.paidCommissions || 0),
      pendingCommissions: Number(data.pendingCommissions || 0),
      weeklyMetrics: Array.isArray(data.weeklyMetrics)
        ? data.weeklyMetrics.map(normalizeMetric)
        : [],
    }
  },
}
