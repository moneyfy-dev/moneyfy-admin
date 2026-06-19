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

export const mockCommissionsRepository = {
  async list() {
    await wait()
    return structuredClone(mockCommissions).map((commission, index) => ({
      ...commission,
      userId: `mock-user-${index + 1}`,
      estadoBackend: commission.estado === 'Pendiente de aprobaciÃ³n'
        ? 'Pendiente'
        : commission.estado,
    }))
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
      ],
      backendPayload: [
        {
          userId: 'mock-user-3',
          transactions: ['tx-mock-3'],
          userAccount: {
            rut: '11.111.111-1',
            holderName: 'Luis Rojas',
            email: 'luis@moneyfy.test',
            bank: 'Banco Santander',
            accountType: 'Corriente',
            accountNumber: '123456789',
          },
          userPayment: 33480,
          userVoucher: null,
        },
      ],
      conflicts: [],
    }
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
