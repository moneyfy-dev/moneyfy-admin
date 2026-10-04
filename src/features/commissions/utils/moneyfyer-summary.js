const amount = value => {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) throw new Error('El consolidado recibió importes incompletos o inválidos. Vuelve a consultar.')
  return Number(value)
}
export function moneyfyerAmounts(item, accountDataAvailable) {
  if (item.pendingApprovalCommissions === undefined || item.conflictCommissions === undefined) throw new Error('El consolidado requiere el backend actualizado con comisiones por aprobar y conflictivas separadas.')
  const pendingPaymentAmount = amount(item.pendingPayments)
  const pendingApprovalAmount = amount(item.pendingApprovalCommissions)
  const conflictAmount = amount(item.conflictCommissions)
  const paidAmount = amount(item.paidCommissions)
  let statusLabel = 'Sin comisiones aprobadas'
  if (pendingPaymentAmount > 0) statusLabel = accountDataAvailable ? 'Listo para nómina' : 'Falta cuenta bancaria'
  else if (pendingApprovalAmount > 0) statusLabel = 'Pendiente de aprobación'
  else if (conflictAmount > 0) statusLabel = 'Conflictivo'
  else if (paidAmount > 0) statusLabel = 'Pagado'
  return { pendingPaymentAmount, pendingApprovalAmount, conflictAmount, paidAmount, totalGeneratedAmount: amount(item.totalCommissions), statusLabel }
}
