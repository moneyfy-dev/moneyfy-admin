import { ref } from 'vue'
import { defineStore } from 'pinia'
import { dashboardRepository } from '../api/dashboard.repository'

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref(null)
  const loading = ref(false)
  const error = ref('')
  const period = ref({})
  let requestId = 0

  async function fetchSummary(nextPeriod = period.value) {
    const request = ++requestId
    loading.value = true
    error.value = ''

    try {
      const result = await dashboardRepository.getSummary(nextPeriod)
      if (request !== requestId) return
      summary.value = result
      period.value = { dateFrom: result.dateFrom || '', dateTo: result.dateTo || '' }
    } catch (fetchError) {
      if (request === requestId) error.value = fetchError.message || 'No fue posible cargar el dashboard.'
    } finally {
      if (request === requestId) loading.value = false
    }
  }

  return {
    summary,
    loading,
    error,
    period,
    fetchSummary,
  }
})
