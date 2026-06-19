import { runtimeConfig } from '@/config/runtime'
import { apiCommissionsRepository } from './commissions.api'
import { mockCommissionsRepository } from '../mocks/commissions.mock'

export const commissionsRepository = runtimeConfig.commissionsUseMocks
  ? mockCommissionsRepository
  : apiCommissionsRepository
