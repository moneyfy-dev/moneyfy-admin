import { ref } from 'vue'
import { defineStore } from 'pinia'
import { dashboardRepository } from '../api/dashboard.repository'

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref(null)
  const loading = ref(false)
  const error = ref('')

  async function fetchSummary() {
    loading.value = true
    error.value = ''

    try {
      summary.value = await dashboardRepository.getSummary()
    } catch (fetchError) {
      error.value = fetchError.message || 'No fue posible cargar el dashboard.'
    } finally {
      loading.value = false
    }
  }

  return {
    summary,
    loading,
    error,
    fetchSummary,
  }
})
