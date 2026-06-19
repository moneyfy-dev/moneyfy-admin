import { runtimeConfig } from '@/config/runtime'
import { apiAuthRepository } from './auth.api'
import { mockAuthRepository } from '../mocks/auth.mock'

export const authRepository = runtimeConfig.useMocks
  ? mockAuthRepository
  : apiAuthRepository
