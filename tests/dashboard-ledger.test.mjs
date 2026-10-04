import test from 'node:test'
import assert from 'node:assert/strict'
import { createDashboardRepository, dashboardMetrics, periodParams, periodLabel } from '../src/features/dashboard/api/dashboard-contract.js'
import { moneyfyerAmounts } from '../src/features/commissions/utils/moneyfyer-summary.js'

test('four monetary cards retain independent backend statuses and amounts', () => {
  const cards = dashboardMetrics({ activeUsers: 3, pendingApprovalCommissions: 245000, pendingCommissions: 35000, paidCommissions: 70000, conflictCommissions: 5000 })
  assert.deepEqual(cards.filter(card => card.status).map(({ status, amount }) => [status, amount]), [
    ['Pendiente', 245000], ['Aprobado', 35000], ['Pagado', 70000], ['Conflictivo', 5000],
  ])
  assert.equal(cards[0].amount, 3)
})

test('period defaults to full history and rejects incomplete, impossible or reversed dates', () => {
  assert.deepEqual(periodParams({}), {})
  assert.equal(periodLabel({}), 'Todo el historial')
  for (const period of [{ dateFrom: '2026-10-01' }, { dateFrom: '2026-10-02', dateTo: '2026-10-01' }, { dateFrom: '2026-02-30', dateTo: '2026-10-01' }]) {
    assert.throws(() => periodParams(period))
  }
})

test('summary and ledger send exactly the same period and preserve partial commission rows', async () => {
  const requests = []
  const rows = [
    { transactionId: 'tx', userId: 'owner', status: 'Pagado', amount: 35000 },
    { transactionId: 'tx', userId: 'referrer', status: 'Pagado', amount: 5000 },
  ]
  const repository = createDashboardRepository({ get: async (url, config) => {
    requests.push({ url, params: config.params })
    return { data: { data: url.endsWith('/summary') ? { activeUsers: 2, pendingApprovalCommissions: 245000, pendingCommissions: 0, paidCommissions: 40000, conflictCommissions: 0, weeklyMetrics: [], dateFrom: '2026-10-01', dateTo: '2026-10-03' } : { content: rows, page: 0, size: 10, totalElements: 2, totalPages: 1, totalAmount: 40000, dateFrom: '2026-10-01', dateTo: '2026-10-03', status: 'Pagado' } } }
  } })
  const period = { dateFrom: '2026-10-01', dateTo: '2026-10-03' }
  await repository.getSummary(period)
  const ledger = await repository.getCommissions({ ...period, status: 'Pagado', page: 0, size: 10 })
  assert.deepEqual(requests[0].params, period)
  assert.deepEqual(requests[1].params, { ...period, status: 'Pagado', page: 0, size: 10 })
  assert.equal(ledger.content.length, 2)
  assert.equal(ledger.totalAmount, 40000)
})

test('missing new monetary fields are rejected rather than displayed as zero', async () => {
  const repository = createDashboardRepository({ get: async () => ({ data: { data: { activeUsers: 2, paidCommissions: 0, pendingCommissions: 0, weeklyMetrics: [] } } }) })
  await assert.rejects(repository.getSummary(), /actualizad|incomplet/i)
})

test('ledger validates statuses and page sizes before issuing requests', async () => {
  let called = false
  const repository = createDashboardRepository({ get: async () => { called = true } })
  await assert.rejects(repository.getCommissions({ status: 'Pendiente pago', page: 0, size: 10 }))
  await assert.rejects(repository.getCommissions({ status: 'Pendiente', page: 0, size: 12 }))
  assert.equal(called, false)
})

test('reconciliation is read-only, unfiltered and preserves discrepancy evidence', async () => {
  const calls = []
  const repository = createDashboardRepository({ get: async (...args) => {
    calls.push(args)
    return { data: { data: { content: [{ userId: 'user', walletPendingApproval: 245000, ledgerPendingApproval: 210000, difference: 35000 }], discrepancyCount: 1 } } }
  } })
  const result = await repository.getReconciliation()
  assert.equal(calls[0][0], '/api/v1/manager/dashboard/commission-reconciliation')
  assert.equal(result.content[0].difference, 35000)
  assert.equal(result.discrepancyCount, 1)
})

test('moneyfyer pending approval and conflict amounts never become payable commissions', () => {
  const row = moneyfyerAmounts({ pendingPayments: 0, paidCommissions: 0, pendingApprovalCommissions: 245000, conflictCommissions: 35000, totalCommissions: 35000 }, true)
  assert.equal(row.pendingPaymentAmount, 0)
  assert.equal(row.pendingApprovalAmount, 245000)
  assert.equal(row.conflictAmount, 35000)
  assert.equal(row.totalGeneratedAmount, 35000)
  assert.equal(row.statusLabel, 'Pendiente de aprobación')
})

test('invalid moneyfyer amounts are rejected rather than fabricated as zero', () => {
  assert.throws(() => moneyfyerAmounts({ pendingPayments: null, paidCommissions: 0,
    pendingApprovalCommissions: 245000, conflictCommissions: 0, totalCommissions: 0 }, true), /incomplet|inválid/i)
})

test('reconciliation retains a missing wallet as unavailable, never as a fabricated zero', async () => {
  const repository = createDashboardRepository({ get: async () => ({ data: { data: { content: [{ userId: 'missing', walletMissing: true, walletPendingApproval: null, ledgerPendingApproval: 35000, difference: null }], discrepancyCount: 1 } } }) })
  const result = await repository.getReconciliation()
  assert.equal(result.content[0].walletPendingApproval, null)
  assert.equal(result.content[0].difference, null)
})
