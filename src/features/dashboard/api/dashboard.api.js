import { apiClient } from '@/services/api/client'
import { createDashboardRepository } from './dashboard-contract'

export const apiDashboardRepository = createDashboardRepository(apiClient)
