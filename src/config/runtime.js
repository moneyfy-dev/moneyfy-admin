const parseBoolean = (value, fallback) => {
  if (value === undefined) return fallback
  return String(value).toLowerCase() === 'true'
}

const useMocks = parseBoolean(import.meta.env.VITE_USE_MOCKS, false)

export const runtimeConfig = Object.freeze({
  apiUrl: import.meta.env.VITE_API_URL || '',
  useMocks,
  commissionsUseMocks: parseBoolean(
    import.meta.env.VITE_COMMISSIONS_USE_MOCKS,
    useMocks,
  ),
  dashboardUseMocks: parseBoolean(
    import.meta.env.VITE_DASHBOARD_USE_MOCKS,
    useMocks,
  ),
  requestTimeout: Number(import.meta.env.VITE_API_TIMEOUT || 15000),
  managerApiKey: import.meta.env.VITE_MONEYFY_API_KEY || '',
  managerPageSize: Number(import.meta.env.VITE_MANAGER_PAGE_SIZE || 100),
  statusUpdatesEnabled: parseBoolean(import.meta.env.VITE_STATUS_UPDATES_ENABLED, false),
})
