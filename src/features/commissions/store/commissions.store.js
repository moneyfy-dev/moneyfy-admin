import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { commissionsRepository } from '../api/commissions.repository'
import { toInputDate } from '../utils/commission-formatters'

const DISPLAY_STATUS_BY_BACKEND_STATUS = Object.freeze({
  Aprobado: 'Pendiente de pago',
  Pagado: 'Pagado',
  Conflictivo: 'Conflictivo',
  Rechazado: 'Rechazado',
  Caducado: 'Caducado',
})

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
    return 'El navegador no pudo conectar con el endpoint administrativo. Revisa CORS, URL base o disponibilidad del backend.'
  }

  return requestError.message || fallbackMessage
}

function collectPaymentGroups(sourceItems) {
  const grouped = new Map()
  const rejected = []
  let approvedCount = 0

  sourceItems.forEach((commission) => {
    if (commission.estadoBackend !== 'Aprobado') {
      return
    }

    approvedCount += 1

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
    approvedCount,
    hasApprovedRows: approvedCount > 0,
    accountDataAvailable: prepared.length > 0 && missingAccountCount === 0,
    missingAccountCount,
    prepared,
    processable,
    rejected,
    payload: buildPayQuotesPayload(processable),
  }
}

function collectMoneyfyerRows(sourceItems) {
  const grouped = new Map()

  sourceItems.forEach((commission) => {
    if (!commission.userId) {
      return
    }

    if (!grouped.has(commission.userId)) {
      grouped.set(commission.userId, {
        userId: commission.userId,
        nombre: commission.nombre,
        email: commission.userEmail || '',
        selectedAccount: commission.selectedAccount || null,
        quoteIds: new Set(),
        pendingApprovalAmount: 0,
        pendingPaymentAmount: 0,
        conflictiveAmount: 0,
        paidAmount: 0,
      })
    }

    const row = grouped.get(commission.userId)
    row.quoteIds.add(commission.idCotizacion)

    if (!row.selectedAccount && commission.selectedAccount) {
      row.selectedAccount = commission.selectedAccount
    }

    const amount = Number(commission.totalComision || 0)

    if (commission.estadoBackend === 'Pagado') {
      row.paidAmount += amount
      return
    }

    if (commission.estadoBackend === 'Conflictivo') {
      row.conflictiveAmount += amount
      return
    }

    if (commission.estadoBackend === 'Aprobado') {
      row.pendingPaymentAmount += amount
      return
    }

    if (commission.estadoBackend === 'Pendiente' || commission.estado === 'Pendiente de aprobación') {
      row.pendingApprovalAmount += amount
    }
  })

  return Array.from(grouped.values())
    .map((row) => {
      const accountDataAvailable = hasCompletePaymentAccount(row.selectedAccount)
      const totalGeneratedAmount =
        row.pendingPaymentAmount + row.paidAmount + row.conflictiveAmount
      let statusLabel = 'Sin comisiones aprobadas'

      if (row.pendingPaymentAmount > 0 && !accountDataAvailable) {
        statusLabel = 'Falta cuenta bancaria'
      } else if (row.pendingPaymentAmount > 0) {
        statusLabel = 'Listo para nómina'
      } else if (row.pendingApprovalAmount > 0) {
        statusLabel = 'Pendiente de aprobación'
      } else if (row.conflictiveAmount > 0) {
        statusLabel = 'Conflictivo'
      } else if (row.paidAmount > 0) {
        statusLabel = 'Pagado'
      }

      return {
        ...row,
        quoteCount: row.quoteIds.size,
        totalGeneratedAmount,
        accountDataAvailable,
        statusLabel,
      }
    })
    .sort((first, second) => first.nombre.localeCompare(second.nombre, 'es'))
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
  const approvedItems = sourceItems.filter((item) => item.estadoBackend === 'Aprobado')
  const visibleTransactionIds = new Set(
    approvedItems
      .map((item) => item.transactionId)
      .filter(Boolean),
  )
  const approvedByUser = approvedItems.reduce((map, item) => {
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
      const userRows = approvedByUser.get(group.userId) || []
      const payroll = payrollByUser.get(group.userId)
      const selectedAccount = group.userAccount || payroll?.userAccount || null
      const transactionIds = Array.isArray(group.transactions)
        ? group.transactions.filter((transactionId) => visibleTransactionIds.has(transactionId))
        : []
      const matchingQuotes = userRows.filter((item) => transactionIds.includes(item.transactionId))
      const fallbackRow = userRows[0]
      const status = group.userTransactionStatus === 'Conflictivo' ? 'Conflictivo' : 'Pagado'

      if (transactionIds.length === 0) {
        return null
      }

      return {
        userId: group.userId,
        nombre: fallbackRow?.nombre || 'No disponible',
        email: fallbackRow?.userEmail || selectedAccount?.email || '',
        totalComision:
          matchingQuotes.length > 0
            ? matchingQuotes.reduce((sum, item) => sum + Number(item.totalComision || 0), 0)
            : Number(group.userPayment || payroll?.totalPayment || 0),
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

  const invalidAccountRows = groupedRows.filter((group) => !group.accountDataAvailable)
  const actionableRows = groupedRows.filter((group) => group.accountDataAvailable)
  const prepared = actionableRows.filter((group) => group.status !== 'Conflictivo')
  const conflictRows = actionableRows.filter((group) => group.status === 'Conflictivo')

  const rejected = [
    ...invalidAccountRows.map((group) => ({
      reference: group.userId || 'N/A',
      reason: `${group.nombre || 'No disponible'}: el backend no expuso una cuenta bancaria completa para este pago.`,
    })),
    ...conflicts.map((conflict) => ({
      reference: conflict.userId || 'N/A',
      reason: `${conflict.userName || 'No disponible'}: ${conflict.message}`,
    })),
  ]

  const missingAccountCount =
    invalidAccountRows.length +
    conflicts.filter((item) =>
      String(item.message || '').toLowerCase().includes('cuenta bancaria'),
    ).length

  return {
    totalVisible: approvedItems.length,
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
    accountDataAvailable: actionableRows.length > 0 && missingAccountCount === 0,
    missingAccountCount,
    hasApprovedRows: approvedItems.length > 0,
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
  const loading = ref(false)
  const error = ref('')
  const importSummary = ref(null)
  const pendingImport = ref(null)
  const paymentSummary = ref(null)
  const pendingPayment = ref(null)
  const filters = reactive({
    status: 'all',
    search: '',
    dateRange: createDefaultDateRange(),
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
  const moneyfyerRows = computed(() => collectMoneyfyerRows(filteredItems.value))

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

  async function fetchCommissions() {
    loading.value = true
    error.value = ''
    clearAlerts()

    try {
      items.value = await commissionsRepository.list()
    } catch (fetchError) {
      if (fetchError.status === 403) {
        error.value = 'La cuenta autenticada no tiene permisos para consultar las comisiones.'
      } else if (fetchError.status === 401 || fetchError.status === 417) {
        error.value = 'La sesion administrativa expiro o ya no es valida. Ingresa nuevamente.'
      } else if (fetchError.code === 'NETWORK_ERROR') {
        error.value = 'El navegador no pudo conectar con el endpoint administrativo. Revisa CORS, URL base o disponibilidad del backend.'
      } else {
        error.value = fetchError.message || 'No fue posible cargar las comisiones.'
      }
    } finally {
      loading.value = false
    }
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
          reason: 'El backend solo permite finalizar cotizaciones Pendientes.',
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
        prepared.forEach(({ idCotizacion, estado }) => {
          const commission = items.value.find((item) => item.idCotizacion === idCotizacion)
          if (!commission) return

          commission.estado = DISPLAY_STATUS_BY_BACKEND_STATUS[estado] || commission.estado
          commission.estadoBackend = estado
        })
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
        const successfulGroups = submittableGroups

        successfulGroups.forEach((group) => {
          const groupKey = `${group.userId}::${group.transactionIds.slice().sort().join('|')}`
          if (failedGroups.has(groupKey)) {
            return
          }

          items.value.forEach((commission) => {
            if (commission.userId !== group.userId) return
            if (!group.transactionIds.includes(commission.transactionId)) return

            const backendStatus = group.status === 'Conflictivo' ? 'Conflictivo' : 'Pagado'
            commission.estado = DISPLAY_STATUS_BY_BACKEND_STATUS[backendStatus] || commission.estado
            commission.estadoBackend = backendStatus
            commission.paymentDate =
              backendStatus === 'Pagado' ? new Date().toISOString().slice(0, 10) : ''
            if (backendStatus === 'Conflictivo') {
              conflictCount += 1
            } else {
              paidCount += 1
            }
          })
        })
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
    loading,
    error,
    filters,
    sorting,
    importSummary,
    pendingImport,
    paymentSummary,
    pendingPayment,
    filteredItems,
    paymentPreparation,
    moneyfyerRows,
    generatePaymentPreview,
    fetchCommissions,
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
