import { runtimeConfig } from '@/config/runtime'
import { apiDashboardRepository } from './dashboard.api'
import { mockDashboardRepository } from '../mocks/dashboard.mock'

export const dashboardRepository = runtimeConfig.dashboardUseMocks
  ? mockDashboardRepository
  : apiDashboardRepository
