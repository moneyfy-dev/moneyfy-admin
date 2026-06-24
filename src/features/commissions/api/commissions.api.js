import { apiClient } from '@/services/api/client'
import { runtimeConfig } from '@/config/runtime'

const INCOMPLETE_QUOTE_STATUSES = new Set(['Iniciando', 'Cotizando', 'Recopilando'])

function normalizeDate(value) {
  if (!value || value === 'N/A') return ''
  return String(value).slice(0, 10)
}

function normalizeOptionalValue(value) {
  return value && value !== 'N/A' ? value : null
}

function normalizeAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

function normalizePaymentAccount(account) {
  if (!account || typeof account !== 'object') return null

  const normalized = {
    rut: normalizeOptionalValue(account.rut || account.personalId) || '',
    holderName: normalizeOptionalValue(account.holderName) || '',
    email: normalizeOptionalValue(account.email) || '',
    bank: normalizeOptionalValue(account.bank) || '',
    accountType: normalizeOptionalValue(account.accountType) || '',
    accountNumber: normalizeOptionalValue(account.accountNumber) || '',
  }

  return Object.values(normalized).some(Boolean) ? normalized : null
}

function normalizeReportAccount(account) {
  return normalizePaymentAccount(account)
}

function normalizeCommissionStatus(row) {
  const transactionStatus = row.transactionStatus
  const quoteStatus = row.quoteStatus

  if (transactionStatus === 'Aprobado' || quoteStatus === 'Aprobado') {
    return 'Pendiente de pago'
  }
  if (transactionStatus === 'Rechazado' || quoteStatus === 'Rechazado') {
    return 'Rechazado'
  }
  if (transactionStatus === 'Caducado' || quoteStatus === 'Caducado') {
    return 'Caducado'
  }
  if (quoteStatus === 'Pendiente') {
    return 'Pendiente de aprobación'
  }
  if (INCOMPLETE_QUOTE_STATUSES.has(quoteStatus)) {
    return 'Cotización incompleta'
  }

  return quoteStatus || 'Cotización incompleta'
}

function resolveBackendStatus(transactionStatus, quoteStatus) {
  if (transactionStatus === 'Conflictivo' || quoteStatus === 'Conflictivo') {
    return 'Conflictivo'
  }
  if (transactionStatus === 'Pagado' || quoteStatus === 'Pagado') {
    return 'Pagado'
  }
  if (transactionStatus === 'Aprobado' || quoteStatus === 'Aprobado') {
    return 'Aprobado'
  }
  if (transactionStatus === 'Rechazado' || quoteStatus === 'Rechazado') {
    return 'Rechazado'
  }
  if (transactionStatus === 'Caducado' || quoteStatus === 'Caducado') {
    return 'Caducado'
  }
  if (transactionStatus === 'Pendiente' || quoteStatus === 'Pendiente') {
    return 'Pendiente'
  }

  return transactionStatus || quoteStatus || ''
}

function normalizeResolvedCommissionStatus(backendStatus, quoteStatus) {
  if (backendStatus === 'Aprobado') {
    return 'Pendiente de pago'
  }
  if (backendStatus === 'Conflictivo') {
    return 'Conflictivo'
  }
  if (backendStatus === 'Rechazado') {
    return 'Rechazado'
  }
  if (backendStatus === 'Caducado') {
    return 'Caducado'
  }
  if (backendStatus === 'Pagado') {
    return 'Pagado'
  }
  if (backendStatus === 'Pendiente') {
    return 'Pendiente de aprobaciÃ³n'
  }
  if (INCOMPLETE_QUOTE_STATUSES.has(quoteStatus)) {
    return 'CotizaciÃ³n incompleta'
  }

  return backendStatus || quoteStatus || 'CotizaciÃ³n incompleta'
}

function normalizeDisplayStatus(backendStatus, quoteStatus) {
  if (backendStatus === 'Aprobado') {
    return 'Pendiente de pago'
  }
  if (backendStatus === 'Conflictivo') {
    return 'Conflictivo'
  }
  if (backendStatus === 'Rechazado') {
    return 'Rechazado'
  }
  if (backendStatus === 'Caducado') {
    return 'Caducado'
  }
  if (backendStatus === 'Pagado') {
    return 'Pagado'
  }
  if (backendStatus === 'Pendiente') {
    return 'Pendiente de aprobación'
  }
  if (INCOMPLETE_QUOTE_STATUSES.has(quoteStatus)) {
    return 'Cotización incompleta'
  }

  return backendStatus || quoteStatus || 'Cotización incompleta'
}

function normalizeUiStatus(backendStatus, quoteStatus) {
  if (backendStatus === 'Aprobado') return 'Pendiente de pago'
  if (backendStatus === 'Conflictivo') return 'Conflictivo'
  if (backendStatus === 'Rechazado') return 'Rechazado'
  if (backendStatus === 'Caducado') return 'Caducado'
  if (backendStatus === 'Pagado') return 'Pagado'
  if (backendStatus === 'Pendiente') return 'Pendiente de aprobación'
  if (INCOMPLETE_QUOTE_STATUSES.has(quoteStatus)) return 'Cotización incompleta'
  return backendStatus || quoteStatus || 'Cotización incompleta'
}

function normalizeCommission(row) {
  const transactionStatus = normalizeOptionalValue(row.transactionStatus)
  const quoteStatus = normalizeOptionalValue(row.quoteStatus)
  const backendStatus = resolveBackendStatus(transactionStatus, quoteStatus)
  const buyerName = normalizeOptionalValue(row.quoterBuyerFullname)
  const beneficiaryName = normalizeOptionalValue(row.userFullname)

  return {
    userId: row.idUser || '',
    idCotizacion: row.quoteId || '',
    nombre: buyerName || beneficiaryName || 'No disponible',
    beneficiario: beneficiaryName || 'No disponible',
    patente: row.quoterCarPpu === 'N/A' ? '' : row.quoterCarPpu || '',
    marcaVehiculo: normalizeOptionalValue(row.quoterCarBrand),
    modeloVehiculo: normalizeOptionalValue(row.quoterCarModel),
    anioVehiculo: normalizeOptionalValue(row.quoterCarYear),
    tipoVehiculo: normalizeOptionalValue(row.quoterCarType),
    estado: normalizeUiStatus(backendStatus, quoteStatus),
    estadoActual: normalizeUiStatus(backendStatus, quoteStatus),
    estadoBackend: backendStatus,
    fecha: normalizeDate(row.inicialDate),
    compania: normalizeOptionalValue(row.quoterPlanInsurer),
    totalComision: normalizeAmount(row.transactionTotalCommission),
    nombrePlan: normalizeOptionalValue(row.quoterPlanName),
    rutDueno: normalizeOptionalValue(row.quoterOwnerPersonalId),
    nombreDueno: normalizeOptionalValue(row.quoterOwnerFullname),
    rutComprador: normalizeOptionalValue(row.quoterBuyerPersonalId),
    nombreComprador: buyerName,
    emailComprador: normalizeOptionalValue(row.quoterBuyerEmail),
    telefonoComprador: normalizeOptionalValue(row.quoterBuyerPhone),
    calle: normalizeOptionalValue(row.quoterAddressStreet),
    numeroDireccion: normalizeOptionalValue(row.quoterAddressStreetNumber),
    transactionId: normalizeOptionalValue(row.transactionId),
    transactionStatus,
    commissionStatus: normalizeOptionalValue(row.commissionStatus),
    approvalDate: normalizeDate(row.approvalDate),
    paymentDate: normalizeDate(row.paymentDate),
    fechaAprobacion: normalizeDate(row.approvalDate),
    fechaPago: normalizeDate(row.paymentDate),
    userEmail: normalizeOptionalValue(row.userEmail),
    selectedAccount: normalizePaymentAccount(
      row.selectedAccount || row.userSelectedAccount || row.userAccount || row.account,
    ),
  }
}

function normalizeMoneyfyer(item) {
  const selectedAccount = normalizePaymentAccount(item.activeAccount)
  const quoteCount = normalizeAmount(item.realizedCommissions)
  const pendingPaymentAmount = normalizeAmount(item.pendingPayments)
  const paidAmount = normalizeAmount(item.paidCommissions)
  const totalGeneratedAmount = normalizeAmount(item.totalCommissions)
  const accountDataAvailable = Boolean(selectedAccount)

  let statusLabel = 'Sin comisiones aprobadas'

  if (pendingPaymentAmount > 0 && !accountDataAvailable) {
    statusLabel = 'Falta cuenta bancaria'
  } else if (pendingPaymentAmount > 0) {
    statusLabel = 'Listo para nómina'
  } else if (paidAmount > 0) {
    statusLabel = 'Pagado'
  }

  return {
    userId: item.idUser || '',
    nombre: item.userFullname || 'No disponible',
    email: normalizeOptionalValue(item.userEmail) || '',
    selectedAccount,
    quoteCount,
    pendingPaymentAmount,
    paidAmount,
    totalGeneratedAmount,
    accountDataAvailable,
    statusLabel,
    ownCommissions: normalizeAmount(item.ownCommissions),
    referredCommissions: normalizeAmount(item.referredCommissions),
  }
}

function normalizeQuoteStatusFilter(status) {
  if (!status || status === 'all') return undefined
  if (status === 'Pendiente de aprobación') return 'Pendiente'
  if (status === 'Pendiente de pago') return 'Aprobado'
  if (status === 'Cotización incompleta') return undefined
  return status
}

export const apiCommissionsRepository = {
  async list(filters = {}) {
    const requestedPage = Math.max(Number(filters.page || 0), 0)
    const requestedSize = Math.max(Number(filters.size || runtimeConfig.managerPageSize), 1)
    const response = await apiClient.get('/api/v1/manager/dashboard/quotes', {
      params: {
        page: requestedPage,
        size: requestedSize,
        userId: filters.userId || undefined,
        quoteStatus: normalizeQuoteStatusFilter(filters.quoteStatus),
      },
    })
    const data = response.data?.data || {}
    const content = Array.isArray(data.content) ? data.content : []

    return {
      items: content.map(normalizeCommission),
      page: Math.max(Number(data.page ?? requestedPage), 0),
      size: Math.max(Number(data.size ?? requestedSize), 1),
      totalElements: Math.max(Number(data.totalElements || 0), 0),
      totalPages: Math.max(Number(data.totalPages || 1), 1),
    }
  },

  async updateStatuses(payload) {
    if (!runtimeConfig.statusUpdatesEnabled) {
      return {
        submitted: false,
        payload,
      }
    }

    const response = await apiClient.put('/api/v1/manager/finalize/quote', payload)
    return response.data?.data || response.data
  },

  async generatePaymentReport(payload) {
    const response = await apiClient.post('/api/v1/manager/pay-quotes/report', payload)

    const data = response.data?.data?.report || response.data?.data || {}

    return {
      bankPayroll: Array.isArray(data.bankPayroll)
        ? data.bankPayroll.map((item) => ({
            userId: item.userId || '',
            userAccount: normalizeReportAccount(item.userAccount),
            totalPayment: normalizeAmount(item.totalPayment),
          }))
        : [],
      backendPayload: Array.isArray(data.backendPayload)
        ? data.backendPayload.map((item) => ({
            userId: item.userId || '',
            transactions: Array.isArray(item.transactions) ? item.transactions.filter(Boolean) : [],
            userAccount: normalizeReportAccount(item.userAccount),
            userPayment: normalizeAmount(item.userPayment),
            userTransactionStatus: normalizeOptionalValue(item.userTransactionStatus),
            userNote: item.userNote || null,
            userVoucher: item.userVoucher || null,
          }))
        : [],
      conflicts: Array.isArray(data.conflicts)
        ? data.conflicts.map((item) => ({
            userId: item.userId || '',
            userName: item.userName || 'No disponible',
            message: item.message || 'Conflicto no informado',
          }))
        : [],
    }
  },

  async getMoneyfyers() {
    const response = await apiClient.get('/api/v1/manager/moneyfyers')
    const data = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
        ? response.data
        : []

    return data.map(normalizeMoneyfyer)
  },

  async payQuotes(payload) {
    if (!runtimeConfig.statusUpdatesEnabled) {
      return {
        submitted: false,
        payload,
      }
    }

    const response = await apiClient.post('/api/v1/manager/pay-quotes', payload)

    return response.data?.data || response.data
  },
}
