import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { commissionsRepository } from '../api/commissions.repository'
import { toInputDate } from '../utils/commission-formatters'

const PAGE_SIZE_OPTIONS = Object.freeze([10, 25, 50, 100])

function buildFinalizeQuotePayload(updates) {
  const updatesByUser = new Map()

  updates.forEach(({ userId, idCotizacion, estado }) => {
    if (!updatesByUser.has(userId)) {
      updatesByUser.set(userId, [])
    }

    updatesByUser.get(userId).push({
      quoterId: idCotizacion,
      transactionStatus: estado,
    })
  })

  return {
    usersQuotes: Array.from(updatesByUser, ([userId, quotes]) => ({
      userId,
      quotes,
    })),
  }
}

function buildPayQuotesPayload(groups) {
  return {
    usersQuotes: groups.map((group) => ({
      userId: group.userId,
      userTransactionStatus: 'Pagado',
      userNote: group.note || '',
      transactions: group.transactionIds,
      userAccount: group.selectedAccount,
      userPayment: group.totalComision,
      userVoucher: group.voucher,
    })),
  }
}

function mapImportedPaymentRow(row) {
  return {
    userId: row.userId,
    nombre: row.userAccount?.holderName || 'No disponible',
    email: row.userAccount?.email || '',
    totalComision: Number(row.amount || 0),
    transactionIds: [...row.transactions],
    transactionCount: row.transactions.length,
    cotizaciones: [],
    selectedAccount: row.userAccount,
    voucher: row.voucherBanco || '',
    note: row.note || '',
    status: row.status || 'Pagado',
    accountDataAvailable: hasCompletePaymentAccount(row.userAccount),
    accountStatus: hasCompletePaymentAccount(row.userAccount)
      ? 'Cuenta cargada desde Excel'
      : 'Cuenta incompleta en Excel',
  }
}

function hasCompletePaymentAccount(account) {
  return Boolean(
    account &&
    account.rut &&
    account.holderName &&
    account.email &&
    account.bank &&
    account.accountType &&
    account.accountNumber,
  )
}

function getMutationErrorMessage(requestError, fallbackMessage) {
  if (requestError.status === 403) {
    return 'La cuenta autenticada no tiene permisos para completar esta accion.'
  }

  if (requestError.status === 401 || requestError.status === 417) {
    return 'La sesion administrativa expiro o ya no es valida. Ingresa nuevamente.'
  }

  if (requestError.code === 'NETWORK_ERROR') {
    return 'No fue posible conectar con el servicio. Intenta nuevamente en unos minutos.'
  }

  return requestError.message || fallbackMessage
}

function collectPaymentGroups(sourceItems) {
  const eligibleStatuses = new Set(['Aprobado', 'Conflictivo'])
  const grouped = new Map()
  const rejected = []
  let eligibleCount = 0

  sourceItems.forEach((commission) => {
    if (!eligibleStatuses.has(commission.estadoBackend)) {
      return
    }

    eligibleCount += 1

    if (!commission.userId) {
      rejected.push({
        idCotizacion: commission.idCotizacion,
        reason: 'La cotizacion no tiene un usuario asociado.',
      })
      return
    }

    if (!commission.transactionId) {
      rejected.push({
        idCotizacion: commission.idCotizacion,
        reason: 'La cotizacion no tiene una transaccion asociada.',
      })
      return
    }

    if (!grouped.has(commission.userId)) {
      grouped.set(commission.userId, {
        userId: commission.userId,
        nombre: commission.nombre,
        email: commission.userEmail,
        totalComision: 0,
        transactionIds: [],
        transactionCount: 0,
        cotizaciones: [],
        selectedAccount: commission.selectedAccount || null,
        voucher: `PAY-${new Date().toISOString().slice(0, 19).replaceAll('-', '').replaceAll(':', '').replace('T', '')}-${commission.userId.slice(-6).toUpperCase()}`,
      })
    }

    const group = grouped.get(commission.userId)

    if (!group.selectedAccount && commission.selectedAccount) {
      group.selectedAccount = commission.selectedAccount
    }

    if (!group.transactionIds.includes(commission.transactionId)) {
      group.transactionIds.push(commission.transactionId)
    }

    group.totalComision += Number(commission.totalComision || 0)
    group.transactionCount = group.transactionIds.length
    group.cotizaciones.push({
      idCotizacion: commission.idCotizacion,
      compania: commission.compania,
      nombrePlan: commission.nombrePlan,
      monto: Number(commission.totalComision || 0),
    })
  })

  const prepared = Array.from(grouped.values())
    .map((group) => ({
      ...group,
      transactionIds: [...group.transactionIds],
      selectedAccount: group.selectedAccount || null,
      accountDataAvailable: hasCompletePaymentAccount(group.selectedAccount),
      accountStatus: hasCompletePaymentAccount(group.selectedAccount)
        ? 'Cuenta lista'
        : 'Cuenta no disponible en dashboard',
    }))
    .sort((first, second) => first.nombre.localeCompare(second.nombre, 'es'))

  const processable = prepared.filter((group) => group.accountDataAvailable)
  const missingAccountCount = prepared.length - processable.length

  return {
    approvedCount: eligibleCount,
    hasApprovedRows: eligibleCount > 0,
    accountDataAvailable: prepared.length > 0 && missingAccountCount === 0,
    missingAccountCount,
    prepared,
    processable,
    rejected,
    payload: buildPayQuotesPayload(processable),
  }
}

function getSubmittablePaymentGroups(preview) {
  return [
    ...(Array.isArray(preview?.prepared) ? preview.prepared : []),
    ...(Array.isArray(preview?.conflicts) ? preview.conflicts : []),
  ].filter(
    (group) =>
      Array.isArray(group.transactionIds) &&
      group.transactionIds.length > 0 &&
      group.accountDataAvailable !== false,
  )
}

function buildPaymentPreviewFromReport(report, sourceItems) {
  const eligibleStatuses = new Set(['Aprobado', 'Conflictivo'])
  const eligibleItems = sourceItems.filter((item) => eligibleStatuses.has(item.estadoBackend))
  const visibleTransactionIds = new Set(
    eligibleItems
      .map((item) => item.transactionId)
      .filter(Boolean),
  )
  const eligibleByUser = eligibleItems.reduce((map, item) => {
    if (!map.has(item.userId)) {
      map.set(item.userId, [])
    }

    map.get(item.userId).push(item)
    return map
  }, new Map())

  const payrollByUser = new Map((report.bankPayroll || []).map((row) => [row.userId, row]))
  const backendPayload = Array.isArray(report.backendPayload) ? report.backendPayload : []
  const conflicts = Array.isArray(report.conflicts) ? report.conflicts : []

  const groupedRows = backendPayload
    .map((group) => {
      const userRows = eligibleByUser.get(group.userId) || []
      const payroll = payrollByUser.get(group.userId)
      const selectedAccount = group.userAccount || payroll?.userAccount || null
      const transactionIds = Array.isArray(group.transactions)
        ? group.transactions.filter((transactionId) => visibleTransactionIds.has(transactionId))
        : []
      const matchingQuotes = userRows.filter((item) => transactionIds.includes(item.transactionId))
      const fallbackRow = matchingQuotes[0] || userRows[0]
      const status = group.userTransactionStatus === 'Conflictivo' ? 'Conflictivo' : 'Pagado'

      if (transactionIds.length === 0) {
        return null
      }

      return {
        userId: group.userId,
        nombre: fallbackRow?.nombre || 'No disponible',
        email: fallbackRow?.userEmail || selectedAccount?.email || '',
        totalComision:
          Number(group.userPayment || payroll?.totalPayment || 0) ||
          matchingQuotes.reduce((sum, item) => sum + Number(item.totalComision || 0), 0),
        transactionIds,
        transactionCount: transactionIds.length,
        cotizaciones: matchingQuotes.map((item) => ({
          idCotizacion: item.idCotizacion,
          compania: item.compania,
          nombrePlan: item.nombrePlan,
          monto: Number(item.totalComision || 0),
        })),
        selectedAccount,
        voucher: group.userVoucher || '',
        note: group.userNote || '',
        status,
        accountDataAvailable: hasCompletePaymentAccount(selectedAccount),
        accountStatus: hasCompletePaymentAccount(selectedAccount)
          ? 'Cuenta lista'
          : 'Cuenta no disponible en reporte',
      }
    })
    .filter(Boolean)
    .sort((first, second) => first.nombre.localeCompare(second.nombre, 'es'))

  const actionableRows = groupedRows.filter((group) => group.accountDataAvailable)
  const prepared = actionableRows.filter((group) => group.status !== 'Conflictivo')
  const conflictRows = actionableRows.filter((group) => group.status === 'Conflictivo')

  const rejected = [
    ...conflicts.map((conflict) => ({
      reference: conflict.userId || 'N/A',
      reason: `${conflict.userName || 'No disponible'}: ${conflict.message}`,
    })),
  ]

  const missingAccountCount = conflicts.filter((item) =>
      String(item.message || '').toLowerCase().includes('cuenta bancaria'),
    ).length

  return {
    totalVisible: eligibleItems.length,
    prepared,
    conflicts: conflictRows,
    rejected,
    payload: {
      usersQuotes: actionableRows.map((group) => ({
        userId: group.userId,
        userTransactionStatus: group.status,
        userNote: group.note || null,
        transactions: [...group.transactionIds],
        userAccount: group.selectedAccount,
        userPayment: Number(group.totalComision || 0),
        userVoucher: group.voucher || null,
      })),
    },
    accountDataAvailable: missingAccountCount === 0,
    missingAccountCount,
    hasApprovedRows: eligibleItems.length > 0,
  }
}

function buildPaymentPreviewFromExcelImport(imported) {
  return {
    totalVisible: imported.total,
    prepared: imported.paidRows.map(mapImportedPaymentRow),
    conflicts: imported.conflictRows.map(mapImportedPaymentRow),
    rejected: imported.rejected.slice().sort((first, second) => first.rowNumber - second.rowNumber),
    payload: imported.payload,
    accountDataAvailable: imported.paidRows.every((row) => hasCompletePaymentAccount(row.userAccount)),
    missingAccountCount: imported.paidRows.filter((row) => !hasCompletePaymentAccount(row.userAccount)).length,
    hasApprovedRows: imported.paidRows.length > 0,
  }
}

function createDefaultDateRange() {
  const today = new Date()
  const twoMonthsAgo = new Date(today)
  twoMonthsAgo.setMonth(today.getMonth() - 2)

  return {
    from: toInputDate(twoMonthsAgo),
    to: toInputDate(today),
  }
}

export const useCommissionsStore = defineStore('commissions', () => {
  let importSummaryTimer = null
  let paymentSummaryTimer = null

  const items = ref([])
  const moneyfyerRows = ref([])
  const loading = ref(false)
  const moneyfyersLoading = ref(false)
  const error = ref('')
  const moneyfyersError = ref('')
  const importSummary = ref(null)
  const pendingImport = ref(null)
  const paymentSummary = ref(null)
  const pendingPayment = ref(null)
  const filters = reactive({
    status: 'all',
    search: '',
    dateRange: createDefaultDateRange(),
  })
  const pagination = reactive({
    page: 0,
    size: 25,
    totalElements: 0,
    totalPages: 1,
  })
  const sorting = reactive({
    key: 'fecha',
    direction: 'desc',
  })

  const filteredItems = computed(() => {
    const query = filters.search.trim().toLowerCase()
    const fromDate = filters.dateRange.from
      ? new Date(`${filters.dateRange.from}T00:00:00`)
      : null
    const toDate = filters.dateRange.to
      ? new Date(`${filters.dateRange.to}T23:59:59`)
      : null

    const rows = items.value.filter((item) => {
      const statusMatch = filters.status === 'all' || item.estado === filters.status
      const queryMatch =
        !query ||
        [
          item.idCotizacion,
          item.nombre,
          item.patente,
          item.compania,
          item.nombrePlan,
          item.estado,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)

      const itemDate = new Date(`${item.fecha}T12:00:00`)
      const dateMatch =
        (!fromDate || itemDate >= fromDate) && (!toDate || itemDate <= toDate)

      return statusMatch && queryMatch && dateMatch
    })

    return [...rows].sort((first, second) => {
      const firstValue = first[sorting.key] ?? ''
      const secondValue = second[sorting.key] ?? ''
      const modifier = sorting.direction === 'asc' ? 1 : -1

      if (typeof firstValue === 'number' && typeof secondValue === 'number') {
        return (firstValue - secondValue) * modifier
      }

      return String(firstValue).localeCompare(String(secondValue), 'es') * modifier
    })
  })

  const paymentPreparation = computed(() => collectPaymentGroups(filteredItems.value))
  const pageSizeOptions = PAGE_SIZE_OPTIONS
  const pageNumber = computed(() => pagination.page + 1)
  const hasPreviousPage = computed(() => pagination.page > 0)
  const hasNextPage = computed(() => pagination.page + 1 < pagination.totalPages)
  const visibleRangeStart = computed(() => {
    if (pagination.totalElements === 0 || items.value.length === 0) return 0
    return pagination.page * pagination.size + 1
  })
  const visibleRangeEnd = computed(() => {
    if (pagination.totalElements === 0 || items.value.length === 0) return 0
    return pagination.page * pagination.size + items.value.length
  })

  function scheduleImportSummaryClear() {
    if (importSummaryTimer) {
      clearTimeout(importSummaryTimer)
    }

    importSummaryTimer = window.setTimeout(() => {
      importSummary.value = null
      importSummaryTimer = null
    }, 6000)
  }

  function schedulePaymentSummaryClear() {
    if (paymentSummaryTimer) {
      clearTimeout(paymentSummaryTimer)
    }

    paymentSummaryTimer = window.setTimeout(() => {
      paymentSummary.value = null
      paymentSummaryTimer = null
    }, 6000)
  }

  function clearImportSummary() {
    if (importSummaryTimer) {
      clearTimeout(importSummaryTimer)
      importSummaryTimer = null
    }

    importSummary.value = null
  }

  function clearPaymentSummary() {
    if (paymentSummaryTimer) {
      clearTimeout(paymentSummaryTimer)
      paymentSummaryTimer = null
    }

    paymentSummary.value = null
  }

  function clearAlerts() {
    clearImportSummary()
    clearPaymentSummary()
  }

  async function generatePaymentPreview() {
    const report = await commissionsRepository.generatePaymentReport({
      dateFrom: filters.dateRange.from || null,
      dateTo: filters.dateRange.to || null,
    })

    return buildPaymentPreviewFromReport(report, filteredItems.value)
  }

  async function fetchCommissions(options = {}) {
    const requestedPage = Math.max(Number(options.page ?? pagination.page), 0)
    const requestedSize = Math.max(Number(options.size ?? pagination.size), 1)

    loading.value = true
    error.value = ''
    clearAlerts()

    try {
      const response = await commissionsRepository.list({
        page: requestedPage,
        size: requestedSize,
        quoteStatus: filters.status,
      })

      items.value = Array.isArray(response.items) ? response.items : []
      pagination.page = Math.max(Number(response.page ?? requestedPage), 0)
      pagination.size = Math.max(Number(response.size ?? requestedSize), 1)
      pagination.totalElements = Math.max(Number(response.totalElements || 0), 0)
      pagination.totalPages = Math.max(Number(response.totalPages || 1), 1)

      if (
        pagination.totalElements > 0 &&
        pagination.page >= pagination.totalPages &&
        pagination.totalPages > 0
      ) {
        pagination.page = pagination.totalPages - 1
        await fetchCommissions({ page: pagination.page, size: pagination.size })
      }
    } catch (fetchError) {
      if (fetchError.status === 403) {
        error.value = 'La cuenta autenticada no tiene permisos para consultar las comisiones.'
      } else if (fetchError.status === 401 || fetchError.status === 417) {
        error.value = 'La sesion administrativa expiro o ya no es valida. Ingresa nuevamente.'
      } else if (fetchError.code === 'NETWORK_ERROR') {
        error.value = 'No fue posible conectar con el servicio. Intenta nuevamente en unos minutos.'
      } else {
        error.value = fetchError.message || 'No fue posible cargar las comisiones.'
      }
    } finally {
      loading.value = false
    }
  }

  function setStatusFilter(status) {
    filters.status = status
    pagination.page = 0
    fetchCommissions({ page: 0 })
  }

  function setPage(page) {
    const normalizedPage = Math.max(Number(page), 0)
    if (normalizedPage === pagination.page || normalizedPage >= pagination.totalPages) {
      return
    }

    pagination.page = normalizedPage
    fetchCommissions({ page: normalizedPage })
  }

  function nextPage() {
    if (!hasNextPage.value) return
    setPage(pagination.page + 1)
  }

  function previousPage() {
    if (!hasPreviousPage.value) return
    setPage(pagination.page - 1)
  }

  function setPageSize(size) {
    const normalizedSize = Math.max(Number(size), 1)
    if (normalizedSize === pagination.size) return

    pagination.size = normalizedSize
    pagination.page = 0
    fetchCommissions({ page: 0, size: normalizedSize })
  }

  function setSort(key) {
    if (sorting.key === key) {
      sorting.direction = sorting.direction === 'asc' ? 'desc' : 'asc'
      return
    }

    sorting.key = key
    sorting.direction = 'asc'
  }

  function resetDateRange() {
    Object.assign(filters.dateRange, createDefaultDateRange())
  }

  function clearPendingImport() {
    pendingImport.value = null
  }

  function clearPendingPayment() {
    pendingPayment.value = null
  }

  function preparePaymentsFromExcel(imported) {
    error.value = ''
    clearPaymentSummary()
    pendingPayment.value = buildPaymentPreviewFromExcelImport(imported)
  }

  function prepareStatusImport({ valid, rejected, total }) {
    error.value = ''
    clearImportSummary()

    const prepared = []
    const localRejected = [...rejected]

    valid.forEach(({ rowNumber, idCotizacion, estado }) => {
      const commission = items.value.find((item) => item.idCotizacion === idCotizacion)

      if (!commission) {
        localRejected.push({
          rowNumber,
          reason: 'La cotizacion no existe en los datos cargados.',
        })
        return
      }
      if (!commission.userId) {
        localRejected.push({
          rowNumber,
          reason: 'La cotizacion no tiene un usuario asociado.',
        })
        return
      }
      if (commission.estadoBackend !== 'Pendiente') {
        localRejected.push({
          rowNumber,
          reason: 'Solo es posible actualizar cotizaciones que aún están pendientes.',
        })
        return
      }

      prepared.push({
        rowNumber,
        userId: commission.userId,
        idCotizacion,
        estado,
        nombre: commission.nombre,
        compania: commission.compania,
        estadoActual: commission.estado,
      })
    })

    const payload = buildFinalizeQuotePayload(prepared)

    pendingImport.value = {
      total,
      prepared,
      rejected: localRejected.sort((first, second) => first.rowNumber - second.rowNumber),
      payload,
    }
  }

  async function submitPendingImport() {
    if (!pendingImport.value) return

    loading.value = true
    error.value = ''

    try {
      const { prepared, rejected, total, payload } = pendingImport.value
      const result = prepared.length > 0
        ? await commissionsRepository.updateStatuses(payload)
        : { submitted: false }
      const submitted = result?.submitted !== false

      if (submitted) {
        await fetchCommissions({ page: pagination.page, size: pagination.size })
        await fetchMoneyfyers()
      }

      importSummary.value = {
        total,
        prepared: prepared.length,
        updated: submitted ? prepared.length : 0,
        rejected: rejected.length,
        submitted,
        payload,
      }
      scheduleImportSummaryClear()

      pendingImport.value = null
    } catch (importError) {
      error.value = getMutationErrorMessage(importError, 'No fue posible actualizar las comisiones.')
    } finally {
      loading.value = false
    }
  }

  async function fetchMoneyfyers() {
    moneyfyersLoading.value = true
    moneyfyersError.value = ''

    try {
      moneyfyerRows.value = await commissionsRepository.getMoneyfyers()
    } catch (fetchError) {
      moneyfyerRows.value = []
      moneyfyersError.value = getMutationErrorMessage(
        fetchError,
        'No fue posible cargar el consolidado de moneyfyers.',
      )
    } finally {
      moneyfyersLoading.value = false
    }
  }

  async function preparePayments() {
    loading.value = true
    error.value = ''
    clearPaymentSummary()

    try {
      pendingPayment.value = await generatePaymentPreview()
    } catch (paymentError) {
      error.value = getMutationErrorMessage(paymentError, 'No fue posible preparar el reporte de pagos.')
    } finally {
      loading.value = false
    }
  }

  async function submitPendingPayment() {
    if (!pendingPayment.value) return

    loading.value = true
    error.value = ''

    try {
      const { prepared, rejected, totalVisible, payload } = pendingPayment.value
      const conflicts = Array.isArray(pendingPayment.value.conflicts) ? pendingPayment.value.conflicts : []
      const submittableGroups = getSubmittablePaymentGroups(pendingPayment.value)
      const result = submittableGroups.length > 0
        ? await commissionsRepository.payQuotes(payload)
        : { submitted: false, failedPayments: [] }
      const submitted = result?.submitted !== false
      const failedPayments = Array.isArray(result?.failedPayments) ? result.failedPayments : []

      const failedGroups = new Set(
        failedPayments.map((item) => {
          const transactions = Array.isArray(item.transactionIds)
            ? item.transactionIds
            : Array.isArray(item.transactions)
              ? item.transactions
              : []

          return `${item.userId}::${transactions.slice().sort().join('|')}`
        }),
      )

      let paidCount = 0
      let conflictCount = 0

      if (submitted) {
        submittableGroups.forEach((group) => {
          const groupKey = `${group.userId}::${group.transactionIds.slice().sort().join('|')}`
          if (failedGroups.has(groupKey)) return

          if (group.status === 'Conflictivo') {
            conflictCount += group.transactionIds.length
          } else {
            paidCount += group.transactionIds.length
          }
        })

        await fetchCommissions({ page: pagination.page, size: pagination.size })
        await fetchMoneyfyers()
      }

      paymentSummary.value = {
        totalVisible,
        prepared: submittableGroups.length,
        paid: paidCount,
        conflicts: conflictCount || conflicts.length,
        rejected: rejected.length,
        failed: failedPayments.length,
        submitted,
      }
      schedulePaymentSummaryClear()

      pendingPayment.value = null
    } catch (paymentError) {
      error.value = getMutationErrorMessage(paymentError, 'No fue posible procesar los pagos.')
    } finally {
      loading.value = false
    }
  }

  return {
    items,
    moneyfyerRows,
    loading,
    moneyfyersLoading,
    error,
    moneyfyersError,
    filters,
    pagination,
    pageSizeOptions,
    sorting,
    importSummary,
    pendingImport,
    paymentSummary,
    pendingPayment,
    filteredItems,
    paymentPreparation,
    pageNumber,
    hasPreviousPage,
    hasNextPage,
    visibleRangeStart,
    visibleRangeEnd,
    generatePaymentPreview,
    fetchCommissions,
    fetchMoneyfyers,
    setStatusFilter,
    setPage,
    nextPage,
    previousPage,
    setPageSize,
    setSort,
    resetDateRange,
    clearPendingImport,
    clearPendingPayment,
    clearImportSummary,
    clearPaymentSummary,
    clearAlerts,
    preparePaymentsFromExcel,
    prepareStatusImport,
    submitPendingImport,
    preparePayments,
    submitPendingPayment,
  }
})
