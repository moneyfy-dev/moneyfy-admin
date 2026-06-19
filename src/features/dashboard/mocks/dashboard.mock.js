export const mockWeeklyMetrics = [
  { date: '2026-06-13', label: '13/06', commissions: 180000, sales: 9, users: 21 },
  { date: '2026-06-14', label: '14/06', commissions: 215000, sales: 12, users: 26 },
  { date: '2026-06-15', label: '15/06', commissions: 260000, sales: 15, users: 31 },
  { date: '2026-06-16', label: '16/06', commissions: 245000, sales: 14, users: 35 },
  { date: '2026-06-17', label: '17/06', commissions: 318000, sales: 18, users: 42 },
  { date: '2026-06-18', label: '18/06', commissions: 346000, sales: 20, users: 48 },
  { date: '2026-06-19', label: '19/06', commissions: 398000, sales: 23, users: 56 },
]

const wait = (milliseconds = 250) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export const mockDashboardRepository = {
  async getSummary() {
    await wait()

    return {
      activeUsers: 93,
      paidCommissions: 50071,
      pendingCommissions: 114320,
      weeklyMetrics: structuredClone(mockWeeklyMetrics),
    }
  },
}
