import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePendingQuotesResponse, createPendingQuotesRepository, buildStatusImportPreview, summarizeStatusImportResult } from '../src/features/commissions/api/pending-quotes-contract.js'
import { buildCommissionsExcelBuffer, parseCommissionStatusExcel } from '../src/features/commissions/utils/commissions-excel.js'
import ExcelJS from 'exceljs'

const quote = (id, insurer = 'BCI') => ({ userId: 'owner-' + id, userFullName: 'Usuario QA', userEmail: 'qa@example.invalid', quotationId: id, quotationDate: id.endsWith('0') ? '2020-01-01T12:00:00' : '2026-10-03T12:00:00', quotationStatus: 'Pendiente', insurer, planId: 'plan-' + id, planName: 'Plan QA', vehiclePlate: 'QA1234', vehicleBrand: 'Marca QA', vehicleModel: 'Modelo QA', vehicleYear: 2020, ownerRut: '12345678-5', ownerFullName: 'Propietario QA', buyerRut: '12345678-5', buyerFullName: 'Comprador QA', buyerEmail: 'buyer@example.invalid', buyerPhone: '+56912345678', region: 'Region QA', commune: 'Comuna QA', street: 'Calle QA', streetNumber: '10', ...(insurer === 'BCI' ? { intNroTarificacionBCI: 1001, strNroCotizacionBCI: 'BCI-' + id, dtFinVigenciaBCI: '2026-12-31T23:59:59' } : { dealTokenFDI: 'fixture-deal-' + id, itemIdFDI: 12, quotationIdFDI: 34, fidIdFDI: 'fid-' + id, expiryDateFDI: '2026-12-31T23:59:59' }) })
const response = (rows = [quote('quote-1')], errors = []) => ({ quotations: [{ insurerAlias: 'aseguradora4', insurerQuotations: rows }], errors })
const fileOf = buffer => ({ arrayBuffer: async () => buffer })

test('global pending endpoint exports more than 50 rows across dates without page or screen filters', async () => {
  const calls = []
  const rows = Array.from({ length: 57 }, (_, i) => quote('quote-' + i))
  const repository = createPendingQuotesRepository({ get: async (...args) => { calls.push(args); return { data: { data: response(rows) } } } })
  const result = await repository.getPendingQuotes()
  assert.equal(result.total, 57)
  assert.equal(calls[0][0], '/api/v1/manager/pending-quotes')
  assert.equal(calls[0][1], undefined)
  assert.equal(result.groups[0].items.some(row => row.fecha === '2020-01-01'), true)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await buildCommissionsExcelBuffer(result))
  assert.equal(workbook.getWorksheet('BCI').rowCount - 1, 57)
})

test('backend partial errors block the entire report and never print a raw backend stack', () => {
  assert.throws(() => normalizePendingQuotesResponse(response([quote('valid')], [{ quotationId: 'missing-quote', errorMessage: 'java.lang.Error SECRET backend stack', code: 'QUOTE_MISSING' }])), error => /missing-quote/.test(error.message) && !/SECRET|java.lang/.test(error.message))
})

test('malformed collections, missing IDs, non-pending states, unknown aliases and duplicates all block', () => {
  for (const payload of [{}, { quotations: {}, errors: [] }, { quotations: [], errors: {} }, response([{ ...quote('q'), quotationId: '' }]), response([{ ...quote('q'), userId: '' }]), response([{ ...quote('q'), quotationStatus: 'Aprobado' }]), response([quote('q'), quote('q')]), { quotations: [{ insurerAlias: 'unknown', insurerQuotations: [quote('q')] }], errors: [] }, response([{ ...quote('q'), intNroTarificacionBCI: 'invalid' }]), response([{ ...quote('q'), userId: {} }]), response([{ ...quote('q'), quotationId: [] }]), response([{ ...quote('q'), planId: {} }]), response([{ ...quote('q'), intNroTarificacionBCI: true }])]) assert.throws(() => normalizePendingQuotesResponse(payload))
})

test('real ExcelJS workbook preserves full BCI and FDI identifiers and round-trips three allowed states', async () => {
  const payload = { quotations: [{ insurerAlias: 'aseguradora4', insurerQuotations: [quote('bci-1'), quote('bci-2')] }, { insurerAlias: 'aseguradora5', insurerQuotations: [quote('fdi-1', 'FDI')] }], errors: [] }
  const buffer = await buildCommissionsExcelBuffer(normalizePendingQuotesResponse(payload))
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const bci = workbook.getWorksheet('BCI')
  const fdi = workbook.getWorksheet('FDI')
  const cellByHeader = (sheet, header, row = 2) => sheet.getRow(row).getCell(sheet.getRow(1).values.indexOf(header))
  assert.equal(cellByHeader(bci, 'Nro cotizacion BCI').value, 'BCI-bci-1')
  assert.equal(cellByHeader(bci, 'Fin vigencia BCI').value, '2026-12-31T23:59:59')
  assert.equal(cellByHeader(fdi, 'Deal token FDI').value, 'fixture-deal-fdi-1')
  assert.equal(cellByHeader(fdi, 'Item ID FDI').value, 12)
  assert.equal(cellByHeader(fdi, 'Quotation ID FDI').value, 34)
  assert.equal(cellByHeader(fdi, 'FID ID FDI').value, 'fid-fdi-1')
  assert.equal(cellByHeader(fdi, 'Expiry date FDI').value, '2026-12-31T23:59:59')
  cellByHeader(bci, 'estado', 2).value = 'Aprobado'
  cellByHeader(bci, 'estado', 3).value = 'Rechazado'
  cellByHeader(fdi, 'estado', 2).value = 'Caducado'
  const imported = await parseCommissionStatusExcel(fileOf(await workbook.xlsx.writeBuffer()))
  assert.deepEqual(imported.valid.map(row => row.estado), ['Aprobado', 'Rechazado', 'Caducado'])
  const prepared = buildStatusImportPreview(imported, normalizePendingQuotesResponse(payload))
  assert.equal(prepared.prepared.length, 3)
  assert.equal(prepared.payload.usersQuotes[0].userId, 'owner-bci-1')
})

test('import binds owners from global pending catalog, not current page or beneficiary rows', () => {
  const catalog = normalizePendingQuotesResponse(response(Array.from({ length: 57 }, (_, i) => quote('quote-' + i))))
  const result = buildStatusImportPreview({ valid: [{ idCotizacion: 'quote-56', estado: 'Aprobado', insurerBucket: 'BCI', rowNumber: 'BCI:2' }], rejected: [], total: 1 }, catalog)
  assert.equal(result.payload.usersQuotes[0].userId, 'owner-quote-56')
  assert.equal(result.payload.usersQuotes[0].quotes[0].quoterId, 'quote-56')
})

test('tampered status, duplicate ID, changed insurer or unknown ID blocks import instead of partial submission', () => {
  const catalog = normalizePendingQuotesResponse(response())
  const valid = { idCotizacion: 'quote-1', estado: 'Aprobado', insurerBucket: 'BCI' }
  for (const rows of [[{ ...valid, estado: 'Pagado' }], [valid, valid], [{ ...valid, insurerBucket: 'FDI' }], [{ ...valid, idCotizacion: 'missing' }]]) assert.throws(() => buildStatusImportPreview({ valid: rows, rejected: [], total: rows.length }, catalog))
})

test('optional provider and contact metadata stays blank while complete addresses preserve street and number', async () => {
  const original = quote('optional')
  for (const field of ['buyerPhone', 'ownerRut', 'region', 'commune', 'intNroTarificacionBCI', 'strNroCotizacionBCI', 'dtFinVigenciaBCI']) original[field] = null
  const data = normalizePendingQuotesResponse(response([original]))
  assert.equal(data.groups[0].items[0].direccionCompleta, 'Calle QA 10')
  assert.equal(normalizePendingQuotesResponse(response()).groups[0].items[0].direccionCompleta, 'Calle QA 10, Comuna QA, Region QA')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await buildCommissionsExcelBuffer(data))
  const sheet = workbook.getWorksheet('BCI')
  assert.equal(sheet.getRow(2).getCell(sheet.getRow(1).values.indexOf('Direccion completa')).value, 'Calle QA 10')
  assert.equal(sheet.getRow(2).getCell(sheet.getRow(1).values.indexOf('Nro tarificacion BCI')).value, '')
})

test('HTTP 200 does not imply all rows were updated: inspect each requested quote outcome', () => {
  const prepared = [{ userId: 'owner', idCotizacion: 'ok', estado: 'Aprobado' }, { userId: 'owner', idCotizacion: 'ok2', estado: 'Rechazado' }, { userId: 'owner', idCotizacion: 'rejected', estado: 'Caducado' }, { userId: 'missing', idCotizacion: 'omitted', estado: 'Rechazado' }, { userId: 'owner', idCotizacion: 'unknown', estado: 'Caducado' }]
  const result = summarizeStatusImportResult({ users: [{ userId: 'owner', quotes: [{ quoterId: 'ok', message: 'La transacción se ha finalizado correctamente (Aprobado)' }, { quoterId: 'ok2', message: 'La transacción se ha finalizado correctamente (Rechazado)' }, { quoterId: 'rejected', message: 'Cotización no encontrada o no está en estado Pendiente' }, { quoterId: 'unknown', message: 'java.lang.Error SECRET' }] }] }, prepared)
  assert.equal(result.updated, 2)
  assert.equal(result.rejected, 1)
  assert.deepEqual(result.rejectedIds, ['rejected'])
  assert.equal(result.unconfirmed, 2)
  assert.deepEqual(result.unconfirmedIds, ['omitted', 'unknown'])
  assert.equal(JSON.stringify(result).includes('SECRET'), false)
  assert.equal(summarizeStatusImportResult({}, prepared).updated, 0)
})

test('XLSX missing or duplicate IDs and invalid states prevent any partial preview, blank states are unchanged', async () => {
  const data = normalizePendingQuotesResponse(response([quote('a'), quote('b')]))
  for (const kind of ['missing', 'duplicate', 'status']) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await buildCommissionsExcelBuffer(data))
    const sheet = workbook.getWorksheet('BCI')
    const idCol = sheet.getRow(1).values.indexOf('ID cotizacion')
    const statusCol = sheet.getRow(1).values.indexOf('estado')
    sheet.getRow(2).getCell(statusCol).value = 'Aprobado'
    if (kind === 'missing') sheet.getRow(3).getCell(idCol).value = ''
    if (kind === 'duplicate') sheet.getRow(3).getCell(idCol).value = 'a'
    if (kind === 'status') sheet.getRow(3).getCell(statusCol).value = 'Pagado'
    const imported = await parseCommissionStatusExcel(fileOf(await workbook.xlsx.writeBuffer()))
    assert.equal(imported.rejected.length, 1)
    assert.throws(() => buildStatusImportPreview(imported, data))
  }
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await buildCommissionsExcelBuffer(data))
  const sheet = workbook.getWorksheet('BCI')
  sheet.getRow(2).getCell(sheet.getRow(1).values.indexOf('estado')).value = 'Caducado'
  const imported = await parseCommissionStatusExcel(fileOf(await workbook.xlsx.writeBuffer()))
  assert.equal(imported.total, 1)
  assert.equal(imported.valid.length, 1)
})

test('network failures never expose raw server exceptions', async () => {
  const repository = createPendingQuotesRepository({ get: async () => { throw Object.assign(new Error('SECRET stack'), { status: 500 }) } })
  await assert.rejects(repository.getPendingQuotes(), error => /consultar/.test(error.message) && !/SECRET/.test(error.message))
})
