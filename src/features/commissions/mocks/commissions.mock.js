export const mockCommissions = [
  { idCotizacion: 'Q-2026-1032', nombre: 'Alejandro Osses', patente: 'CTJZ47', estado: 'Pendiente de aprobación', fecha: '2026-04-12', compania: 'FDI', totalComision: 38988, nombrePlan: 'Autónomo.IA taller de marca' },
  { idCotizacion: 'Q-2026-1031', nombre: 'Camila Herrera', patente: 'LPDK21', estado: 'Pagado', fecha: '2026-04-20', compania: 'BCI', totalComision: 26399, nombrePlan: 'Plan auto protegido' },
  { idCotizacion: 'Q-2026-1030', nombre: 'Luis Rojas', patente: 'HRFT83', estado: 'Pendiente de pago', fecha: '2026-05-03', compania: 'FDI', totalComision: 33480, nombrePlan: 'Deducible 8 UF' },
  { idCotizacion: 'Q-2026-1029', nombre: 'Paula Soto', patente: 'KJPD55', estado: 'Rechazado', fecha: '2026-05-08', compania: 'BCI', totalComision: 0, nombrePlan: 'Plan full cobertura' },
  { idCotizacion: 'Q-2026-1028', nombre: 'Rodrigo Vera', patente: 'JHRT76', estado: 'Pendiente de aprobación', fecha: '2026-05-14', compania: 'FDI', totalComision: 42496, nombrePlan: 'Taller de marca con deducible' },
  { idCotizacion: 'Q-2026-1027', nombre: 'Francisca Mena', patente: 'RTYU19', estado: 'Pagado', fecha: '2026-05-18', compania: 'BCI', totalComision: 23672, nombrePlan: 'Plan protector de auto' },
  { idCotizacion: 'Q-2026-1026', nombre: 'Diego Tapia', patente: 'PXCR39', estado: 'Pendiente de pago', fecha: '2026-05-23', compania: 'FDI', totalComision: 48992, nombrePlan: 'Responsabilidad extendida' },
  { idCotizacion: 'Q-2026-1025', nombre: 'Natalia Fuentes', patente: 'BRKL02', estado: 'Cotización incompleta', fecha: '2026-05-27', compania: null, totalComision: null, nombrePlan: null },
  { idCotizacion: 'Q-2026-1024', nombre: 'Marco Silva', patente: 'MZPL14', estado: 'Cotización incompleta', fecha: '2026-06-01', compania: null, totalComision: null, nombrePlan: null },
  { idCotizacion: 'Q-2026-1023', nombre: 'Javiera Morales', patente: 'XRKD88', estado: 'Pendiente de pago', fecha: '2026-06-02', compania: 'BCI', totalComision: 31848, nombrePlan: 'Plan auto esencial' },
]

const wait = (milliseconds = 250) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

function normalizeMockDisplayStatus(backendStatus) {
  if (backendStatus === 'Aprobado') return 'Pendiente de pago'
  if (backendStatus === 'Pagado') return 'Pagado'
  if (backendStatus === 'Rechazado') return 'Rechazado'
  if (backendStatus === 'Caducado') return 'Caducado'
  if (backendStatus === 'Pendiente') return 'Pendiente de aprobación'
  return 'Cotización incompleta'
}

function normalizeMockQuoteStatusFilter(status) {
  if (!status || status === 'all') return undefined
  if (status === 'Pendiente de aprobación') return 'Pendiente'
  if (status === 'Pendiente de pago') return 'Aprobado'
  if (status === 'Cotización incompleta') return undefined
  return status
}

const MOCK_CONTRACT_BY_QUOTE_ID = Object.freeze({
  'Q-2026-1032': {
    transactionId: 'tx-mock-1032',
    userEmail: 'alejandro@moneyfy.test',
    estadoBackend: 'Pendiente',
  },
  'Q-2026-1031': {
    transactionId: 'tx-mock-1031',
    userEmail: 'camila@moneyfy.test',
    estadoBackend: 'Pagado',
    selectedAccount: {
      rut: '12.345.678-9',
      holderName: 'Camila Herrera',
      email: 'camila@moneyfy.test',
      bank: 'Banco de Chile',
      accountType: 'Corriente',
      accountNumber: '1234567890',
    },
  },
  'Q-2026-1030': {
    transactionId: 'tx-mock-1030',
    userEmail: 'luis@moneyfy.test',
    estadoBackend: 'Aprobado',
    selectedAccount: {
      rut: '11.111.111-1',
      holderName: 'Luis Rojas',
      email: 'luis@moneyfy.test',
      bank: 'Banco Santander',
      accountType: 'Corriente',
      accountNumber: '123456789',
    },
  },
  'Q-2026-1029': {
    transactionId: 'tx-mock-1029',
    userEmail: 'paula@moneyfy.test',
    estadoBackend: 'Rechazado',
  },
  'Q-2026-1028': {
    transactionId: 'tx-mock-1028',
    userEmail: 'rodrigo@moneyfy.test',
    estadoBackend: 'Pendiente',
  },
  'Q-2026-1027': {
    transactionId: 'tx-mock-1027',
    userEmail: 'francisca@moneyfy.test',
    estadoBackend: 'Pagado',
    selectedAccount: {
      rut: '15.555.555-5',
      holderName: 'Francisca Mena',
      email: 'francisca@moneyfy.test',
      bank: 'BCI',
      accountType: 'Vista',
      accountNumber: '9988776655',
    },
  },
  'Q-2026-1026': {
    transactionId: 'tx-mock-1026',
    userEmail: 'diego@moneyfy.test',
    estadoBackend: 'Aprobado',
    selectedAccount: null,
  },
  'Q-2026-1025': {
    transactionId: null,
    userEmail: 'natalia@moneyfy.test',
    estadoBackend: 'Cotizando',
  },
  'Q-2026-1024': {
    transactionId: null,
    userEmail: 'marco@moneyfy.test',
    estadoBackend: 'Cotizando',
  },
  'Q-2026-1023': {
    transactionId: 'tx-mock-1023',
    userEmail: 'javiera@moneyfy.test',
    estadoBackend: 'Aprobado',
    selectedAccount: {
      rut: '17.777.777-7',
      holderName: 'Javiera Morales',
      email: 'javiera@moneyfy.test',
      bank: 'Banco Estado',
      accountType: 'Cuenta RUT',
      accountNumber: '177777777',
    },
  },
})

export const mockCommissionsRepository = {
  async list(filters = {}) {
    await wait()
    const requestedPage = Math.max(Number(filters.page || 0), 0)
    const requestedSize = Math.max(Number(filters.size || 100), 1)
    const backendStatusFilter = normalizeMockQuoteStatusFilter(filters.quoteStatus)
    const normalizedItems = structuredClone(mockCommissions).map((commission, index) => {
      const backendContract = MOCK_CONTRACT_BY_QUOTE_ID[commission.idCotizacion] || {}
      const estadoBackend = backendContract.estadoBackend || commission.estado

      return {
        ...commission,
        ...backendContract,
        userId: `mock-user-${index + 1}`,
        estado: normalizeMockDisplayStatus(estadoBackend),
        estadoBackend,
        selectedAccount: backendContract.selectedAccount || null,
        transactionId: backendContract.transactionId || null,
        userEmail: backendContract.userEmail || '',
      }
    })
    const filteredItems = backendStatusFilter
      ? normalizedItems.filter((item) => item.estadoBackend === backendStatusFilter)
      : normalizedItems
    const totalElements = filteredItems.length
    const totalPages = Math.max(Math.ceil(totalElements / requestedSize), 1)
    const page = Math.min(requestedPage, totalPages - 1)
    const start = page * requestedSize
    const items = filteredItems.slice(start, start + requestedSize)

    return {
      items,
      page,
      size: requestedSize,
      totalElements,
      totalPages,
    }
  },

  async updateStatuses(updates) {
    await wait()
    return {
      submitted: true,
      payload: updates,
    }
  },

  async generatePaymentReport() {
    await wait()
    return {
      bankPayroll: [
        {
          userId: 'mock-user-3',
          userAccount: {
            rut: '11.111.111-1',
            holderName: 'Luis Rojas',
            email: 'luis@moneyfy.test',
            bank: 'Banco Santander',
            accountType: 'Corriente',
            accountNumber: '123456789',
          },
          totalPayment: 33480,
        },
        {
          userId: 'mock-user-10',
          userAccount: {
            rut: '17.777.777-7',
            holderName: 'Javiera Morales',
            email: 'javiera@moneyfy.test',
            bank: 'Banco Estado',
            accountType: 'Cuenta RUT',
            accountNumber: '177777777',
          },
          totalPayment: 31848,
        },
      ],
      backendPayload: [
        {
          userId: 'mock-user-3',
          transactions: ['tx-mock-1030'],
          userAccount: {
            rut: '11.111.111-1',
            holderName: 'Luis Rojas',
            email: 'luis@moneyfy.test',
            bank: 'Banco Santander',
            accountType: 'Corriente',
            accountNumber: '123456789',
          },
          userPayment: 33480,
          userTransactionStatus: 'Pagado',
          userNote: null,
          userVoucher: null,
        },
        {
          userId: 'mock-user-10',
          transactions: ['tx-mock-1023'],
          userAccount: {
            rut: '17.777.777-7',
            holderName: 'Javiera Morales',
            email: 'javiera@moneyfy.test',
            bank: 'Banco Estado',
            accountType: 'Cuenta RUT',
            accountNumber: '177777777',
          },
          userPayment: 31848,
          userTransactionStatus: 'Pagado',
          userNote: null,
          userVoucher: null,
        },
      ],
      conflicts: [
        {
          userId: 'mock-user-7',
          userName: 'Diego Tapia',
          message: 'Falta cuenta bancaria seleccionada para procesar este pago.',
        },
      ],
    }
  },

  async getMoneyfyers() {
    await wait()
    return [
      {
        userId: 'mock-user-3',
        nombre: 'Luis Rojas',
        email: 'luis@moneyfy.test',
        selectedAccount: {
          rut: '11.111.111-1',
          holderName: 'Luis Rojas',
          email: 'luis@moneyfy.test',
          bank: 'Banco Santander',
          accountType: 'Corriente',
          accountNumber: '123456789',
        },
        quoteCount: 1,
        pendingPaymentAmount: 33480,
        paidAmount: 0,
        totalGeneratedAmount: 33480,
        accountDataAvailable: true,
        statusLabel: 'Listo para nómina',
        ownCommissions: 33480,
        referredCommissions: 0,
      },
      {
        userId: 'mock-user-7',
        nombre: 'Diego Tapia',
        email: 'diego@moneyfy.test',
        selectedAccount: null,
        quoteCount: 1,
        pendingPaymentAmount: 48992,
        paidAmount: 0,
        totalGeneratedAmount: 48992,
        accountDataAvailable: false,
        statusLabel: 'Falta cuenta bancaria',
        ownCommissions: 48992,
        referredCommissions: 0,
      },
      {
        userId: 'mock-user-10',
        nombre: 'Javiera Morales',
        email: 'javiera@moneyfy.test',
        selectedAccount: {
          rut: '17.777.777-7',
          holderName: 'Javiera Morales',
          email: 'javiera@moneyfy.test',
          bank: 'Banco Estado',
          accountType: 'Cuenta RUT',
          accountNumber: '177777777',
        },
        quoteCount: 1,
        pendingPaymentAmount: 0,
        paidAmount: 31848,
        totalGeneratedAmount: 31848,
        accountDataAvailable: true,
        statusLabel: 'Pagado',
        ownCommissions: 31848,
        referredCommissions: 0,
      },
    ]
  },

  async payQuotes(payload) {
    await wait()
    return {
      submitted: true,
      failedPayments: [],
      payload,
    }
  },
}
