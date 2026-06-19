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
    rut: account.rut || account.personalId || '',
    holderName: account.holderName || '',
    email: account.email || '',
    bank: account.bank || '',
    accountType: account.accountType || '',
    accountNumber: account.accountNumber || '',
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

function normalizeCommission(row) {
  const transactionStatus = normalizeOptionalValue(row.transactionStatus)
  const quoteStatus = normalizeOptionalValue(row.quoteStatus)

  return {
    userId: row.idUser || '',
    idCotizacion: row.quoteId || '',
    nombre: row.quoterBuyerFullname && row.quoterBuyerFullname !== 'N/A'
      ? row.quoterBuyerFullname
      : row.userFullname || 'No disponible',
    patente: row.quoterCarPpu === 'N/A' ? '' : row.quoterCarPpu || '',
    estado: normalizeCommissionStatus(row),
    estadoBackend: transactionStatus || quoteStatus || '',
    fecha: normalizeDate(row.inicialDate),
    compania: normalizeOptionalValue(row.quoterPlanInsurer),
    totalComision: normalizeAmount(row.transactionTotalCommission),
    nombrePlan: normalizeOptionalValue(row.quoterPlanName),
    transactionId: normalizeOptionalValue(row.transactionId),
    transactionStatus,
    commissionStatus: normalizeOptionalValue(row.commissionStatus),
    approvalDate: normalizeDate(row.approvalDate),
    paymentDate: normalizeDate(row.paymentDate),
    userEmail: normalizeOptionalValue(row.userEmail),
    selectedAccount: normalizePaymentAccount(
      row.selectedAccount || row.userSelectedAccount || row.userAccount || row.account,
    ),
  }
}

function getManagerHeaders() {
  if (!runtimeConfig.managerApiKey) {
    throw new Error('Falta configurar VITE_MONEYFY_API_KEY para consultar el dashboard.')
  }

  return {
    'X-Moneyfy-Api-Key': runtimeConfig.managerApiKey,
  }
}

function shouldFallbackToLegacyFinalize(error) {
  const info = String(error?.fields?.info || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()

  return (
    (error?.status === 404 || error?.status === 424) &&
    (
      info.includes('no static resource api/v1/manager/finalize/quote') ||
      message.includes('no static resource api/v1/manager/finalize/quote')
    )
  )
}

export const apiCommissionsRepository = {
  async list(filters = {}) {
    const pageSize = runtimeConfig.managerPageSize
    const items = []
    let page = 0
    let totalPages = 1

    do {
      const response = await apiClient.get('/api/v1/manager/dashboard/quotes', {
        headers: getManagerHeaders(),
        params: {
          page,
          size: pageSize,
          userId: filters.userId || undefined,
          quoteStatus: filters.quoteStatus || undefined,
        },
        skipAuth: true,
        skipAuthRefresh: true,
      })
      const data = response.data?.data
      const content = Array.isArray(data?.content) ? data.content : []

      items.push(...content.map(normalizeCommission))
      totalPages = Math.max(Number(data?.totalPages || 1), 1)
      page += 1
    } while (page < totalPages)

    return items
  },

  async updateStatuses(payload) {
    if (!runtimeConfig.statusUpdatesEnabled) {
      return {
        submitted: false,
        payload,
      }
    }

    try {
      const response = await apiClient.put('/api/v1/manager/finalize/quote', payload, {
        headers: getManagerHeaders(),
        skipAuth: true,
        skipAuthRefresh: true,
      })
      return response.data?.data || response.data
    } catch (error) {
      if (!shouldFallbackToLegacyFinalize(error)) {
        throw error
      }

      const legacyResponse = await apiClient.put('/quoter/finalize/quote', payload, {
        headers: getManagerHeaders(),
        skipAuth: true,
        skipAuthRefresh: true,
      })

      return legacyResponse.data?.data || legacyResponse.data
    }
  },

  async generatePaymentReport(payload) {
    const response = await apiClient.post('/api/v1/manager/pay-quotes/report', payload, {
      headers: getManagerHeaders(),
      skipAuth: true,
      skipAuthRefresh: true,
    })

    const data = response.data?.data || {}

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

  async payQuotes(payload) {
    if (!runtimeConfig.statusUpdatesEnabled) {
      return {
        submitted: false,
        payload,
      }
    }

    const response = await apiClient.post('/api/v1/manager/pay-quotes', payload, {
      headers: getManagerHeaders(),
      skipAuth: true,
      skipAuthRefresh: true,
    })

    return response.data?.data || response.data
  },
}
