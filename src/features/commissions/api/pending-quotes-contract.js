import { BACKEND_UPDATE_STATUSES } from '../constants.js'

const INSURERS = { aseguradora4: 'BCI', aseguradora5: 'FDI' }
const text = value => value === null || value === undefined || ['N/A', 'null', 'undefined'].includes(String(value).trim()) ? null : String(value).trim() || null
const reference = value => (text(value) || 'sin ID').replace(/[^\p{L}\p{N}_: .-]/gu, '').slice(0, 80)
const validNumberId = value => value !== null && value !== undefined && value !== '' && Number.isSafeInteger(Number(value)) && Number(value) > 0
const providerNumber = value => value == null ? null : (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) ? Number(value) : NaN
export function safeStatusMutationError(error) {
  return Object.assign(new Error('No fue posible confirmar las actualizaciones. Revisa el estado de las cotizaciones antes de reenviar.'), { status: error.status, code: error.code })
}
export class PendingQuotesDataError extends Error {
  constructor(issues) {
    super(`No se puede exportar ni importar un conjunto incompleto: ${issues.length} problema(s). ${issues.slice(0, 8).map(issue => `${reference(issue.id)}: ${issue.reason}`).join('; ')}${issues.length > 8 ? '; revisa los demás registros antes de continuar.' : '.'}`)
    this.name = 'PendingQuotesDataError'
    this.issues = issues
  }
}
const problem = (id, reason) => ({ id, reason })
export function summarizeStatusImportResult(result, prepared) {
  const outcomes = new Map()
  for (const user of Array.isArray(result?.users) ? result.users : []) {
    for (const quote of Array.isArray(user?.quotes) ? user.quotes : []) {
      const key = JSON.stringify([user.userId, quote.quoterId])
      const previous = outcomes.get(key) || []
      outcomes.set(key, [...previous, quote.message])
    }
  }
  const rejectedMessages = new Set([
    'Estado o ID de cotización inválido',
    'Cotización no encontrada o no está en estado Pendiente',
    'Transacción Pendiente no encontrada para la cotización',
    'Se necesita revisar transacción por referidor no encontrado previamente',
  ])
  const summary = { updated: 0, rejected: 0, unconfirmed: 0, rejectedIds: [], unconfirmedIds: [] }
  for (const row of prepared) {
    const messages = outcomes.get(JSON.stringify([row.userId, row.idCotizacion])) || []
    const message = messages.length === 1 ? messages[0] : null
    if (message === `La transacción se ha finalizado correctamente (${row.estado})`) summary.updated++
    else if (rejectedMessages.has(message) || (typeof message === 'string' && message.startsWith('Ha ocurrido una excepción en la transacción N°') && message.endsWith(' - Requiere revisión'))) {
      summary.rejected++
      summary.rejectedIds.push(reference(row.idCotizacion))
    } else {
      summary.unconfirmed++
      summary.unconfirmedIds.push(reference(row.idCotizacion))
    }
  }
  return summary
}
export function validatePendingQuotesExport(data) {
  if (!data || !Array.isArray(data.groups) || !Array.isArray(data.errors)) throw new PendingQuotesDataError([problem(null, 'respuesta de pendientes no válida')])
  const issues = data.errors.map(item => problem(item?.idCotizacion || item?.quotationId, 'el backend no pudo incluir esta cotización; revisa sus datos antes de continuar'))
  const seen = new Set()
  let total = 0
  for (const group of data.groups) {
    if (!Array.isArray(group?.items)) { issues.push(problem(null, 'grupo de aseguradora incompleto')); continue }
    const expected = INSURERS[text(group.insurerAlias)?.toLowerCase()]
    if (!expected || expected !== group.insurerBucket) issues.push(problem(group.insurerAlias, 'aseguradora o alias no compatible; no se omitieron sus filas'))
    for (const row of group.items) {
      total++
      const id = text(row?.idCotizacion)
      if (!row || !text(id)) { issues.push(problem(null, 'cotización sin ID')); continue }
      if (seen.has(id)) issues.push(problem(id, 'ID de cotización duplicado'))
      seen.add(id)
      if (!text(row.userId)) issues.push(problem(id, 'falta usuario propietario de la cotización'))
      if (row.estadoBackend !== 'Pendiente') issues.push(problem(id, 'la cotización no tiene estado Pendiente'))
      if (!text(row.planId)) issues.push(problem(id, 'falta ID del plan seleccionado'))
      if (row.insurerAlias !== group.insurerAlias || row.insurerBucket !== expected) issues.push(problem(id, 'aseguradora inconsistente entre grupo y cotización'))
      const providerNumbers = expected === 'BCI' ? ['intNroTarificacionBCI'] : expected === 'FDI' ? ['itemIdFDI', 'quotationIdFDI'] : []
      for (const field of providerNumbers) if (row[field] !== null && row[field] !== undefined && !validNumberId(row[field])) issues.push(problem(id, `referencia numérica de aseguradora no válida (${field})`))
    }
  }
  if (!Number.isInteger(data.total) || data.total !== total) issues.push(problem(null, 'cantidad de pendientes inconsistente'))
  if (issues.length) throw new PendingQuotesDataError(issues)
  return data
}
function normalizeRow(item, insurerAlias, insurerBucket) {
  return {
    userId: text(item.userId), nombre: text(item.userFullName), userEmail: text(item.userEmail),
    idCotizacion: text(item.quotationId), fecha: text(item.quotationDate)?.slice(0, 10) || '', estadoActual: text(item.quotationStatus), estadoBackend: text(item.quotationStatus),
    compania: text(item.insurer), insurerAlias, insurerBucket, planId: text(item.planId), nombrePlan: text(item.planName),
    patente: text(item.vehiclePlate), marcaVehiculo: text(item.vehicleBrand), modeloVehiculo: text(item.vehicleModel), anioVehiculo: item.vehicleYear ?? null,
    rutDueno: text(item.ownerRut), nombreDueno: text(item.ownerFullName), rutComprador: text(item.buyerRut), nombreComprador: text(item.buyerFullName), emailComprador: text(item.buyerEmail), telefonoComprador: text(item.buyerPhone),
    region: text(item.region), comuna: text(item.commune), calle: text(item.street), numeroDireccion: text(item.streetNumber),
    direccionCompleta: [[text(item.street), text(item.streetNumber)].filter(Boolean).join(' '), text(item.commune), text(item.region)].filter(Boolean).join(', '),
    intNroTarificacionBCI: providerNumber(item.intNroTarificacionBCI), strNroCotizacionBCI: text(item.strNroCotizacionBCI), dtFinVigenciaBCI: text(item.dtFinVigenciaBCI),
    dealTokenFDI: text(item.dealTokenFDI), itemIdFDI: providerNumber(item.itemIdFDI), quotationIdFDI: providerNumber(item.quotationIdFDI), fidIdFDI: text(item.fidIdFDI), expiryDateFDI: text(item.expiryDateFDI),
  }
}
export function normalizePendingQuotesResponse(data) {
  if (!data || !Array.isArray(data.quotations) || !Array.isArray(data.errors)) throw new PendingQuotesDataError([problem(null, 'respuesta de pendientes no válida')])
  const groups = data.quotations.map(group => {
    if (!group || !Array.isArray(group.insurerQuotations)) throw new PendingQuotesDataError([problem(group?.insurerAlias, 'grupo de cotizaciones no válido')])
    const insurerAlias = text(group.insurerAlias)?.toLowerCase()
    const insurerBucket = INSURERS[insurerAlias]
    const items = group.insurerQuotations.map(item => {
      if (!item || typeof item !== 'object') throw new PendingQuotesDataError([problem(null, 'fila de cotización no válida')])
      for (const field of ['quotationId', 'userId', 'planId']) if (typeof item[field] !== 'string' || !text(item[field])) throw new PendingQuotesDataError([problem(item.quotationId, `identidad de cotización no válida (${field})`)])
      const insurerName = text(item.insurer)?.toLowerCase() || ''
      if ((insurerBucket === 'BCI' && /fdi|fid/.test(insurerName)) || (insurerBucket === 'FDI' && /bci/.test(insurerName))) throw new PendingQuotesDataError([problem(item.quotationId, 'el nombre de aseguradora no coincide con su alias')])
      return normalizeRow(item, insurerAlias, insurerBucket)
    })
    return { insurerAlias, insurerBucket, insurerName: items.find(row => row.compania)?.compania || null, items }
  })
  return validatePendingQuotesExport({ groups, errors: data.errors, total: groups.reduce((sum, group) => sum + group.items.length, 0) })
}
export function createPendingQuotesRepository(client) {
  return { async getPendingQuotes() {
    try {
      const response = await client.get('/api/v1/manager/pending-quotes')
      return normalizePendingQuotesResponse(response.data?.data)
    } catch (error) {
      if (error instanceof PendingQuotesDataError) throw error
      const message = error.status === 401 || error.status === 417 ? 'La sesión administrativa expiró. Ingresa nuevamente para consultar todas las pendientes.' : error.status === 403 ? 'Tu cuenta no tiene permisos para consultar todas las pendientes.' : 'No fue posible consultar todas las cotizaciones pendientes. Intenta nuevamente; no se generó un archivo parcial.'
      throw Object.assign(new Error(message), { status: error.status, code: error.code })
    }
  } }
}
export function buildStatusImportPreview(imported, pendingQuotes) {
  validatePendingQuotesExport(pendingQuotes)
  if (!imported || !Array.isArray(imported.valid) || !Array.isArray(imported.rejected)) throw new PendingQuotesDataError([problem(null, 'archivo de respuesta no válido')])
  const lookup = new Map(pendingQuotes.groups.flatMap(group => group.items).map(row => [row.idCotizacion, row]))
  const issues = imported.rejected.map(row => problem(row.rowNumber, 'fila de Excel inválida; revisa ID, hoja y estado permitido'))
  const seen = new Set()
  const prepared = []
  for (const row of imported.valid) {
    const id = text(row.idCotizacion)
    const quote = lookup.get(id)
    if (!id || seen.has(id)) issues.push(problem(id, 'ID de cotización ausente o duplicado en el Excel'))
    seen.add(id)
    if (!BACKEND_UPDATE_STATUSES.includes(row.estado)) issues.push(problem(id, 'solo se permiten Aprobado, Rechazado y Caducado'))
    if (!quote) { issues.push(problem(id, 'no está disponible en el catálogo global de pendientes')); continue }
    if (row.insurerBucket && row.insurerBucket !== quote.insurerBucket) issues.push(problem(id, 'la hoja no coincide con la aseguradora de la cotización'))
    prepared.push({ ...row, userId: quote.userId, nombre: quote.nombre, compania: quote.compania, estadoActual: quote.estadoActual })
  }
  if (issues.length) throw new PendingQuotesDataError(issues)
  if (!prepared.length) throw new Error('El archivo no contiene actualizaciones para procesar.')
  const byUser = new Map()
  for (const row of prepared) {
    if (!byUser.has(row.userId)) byUser.set(row.userId, [])
    byUser.get(row.userId).push({ quoterId: row.idCotizacion, transactionStatus: row.estado })
  }
  return { total: imported.total, prepared, rejected: [], payload: { usersQuotes: Array.from(byUser, ([userId, quotes]) => ({ userId, quotes })) } }
}
