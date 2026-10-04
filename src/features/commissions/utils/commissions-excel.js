import { BACKEND_UPDATE_STATUSES } from '../constants.js'
import { validatePendingQuotesExport } from '../api/pending-quotes-contract.js'

const CATALOG_SHEET = 'Catalogos'
const REQUIRED_HEADERS = ['idcotizacion', 'estado']
const EDITABLE_STATUS_HEADER = 'estado'
const BASE_EXPORT_COLUMNS = Object.freeze([
  ['fecha', 'Fecha cotizacion'],
  ['estadoActual', 'Estado actual'],
  ['compania', 'Aseguradora'],
  ['idCotizacion', 'ID cotizacion'],
  ['planId', 'ID plan'],
  ['nombrePlan', 'Nombre plan'],
  ['patente', 'Patente'],
  ['marcaVehiculo', 'Marca'],
  ['modeloVehiculo', 'Modelo'],
  ['anioVehiculo', 'Ano'],
  ['rutDueno', 'RUT dueno'],
  ['nombreDueno', 'Nombre dueno'],
  ['rutComprador', 'RUT comprador'],
  ['nombreComprador', 'Nombre comprador'],
  ['emailComprador', 'Email comprador'],
  ['telefonoComprador', 'Telefono comprador'],
  ['region', 'Region'],
  ['comuna', 'Comuna'],
  ['calle', 'Calle'],
  ['numeroDireccion', 'Numero'],
  ['direccionCompleta', 'Direccion completa'],
])
const INSURER_BUCKETS = Object.freeze([
  {
    key: 'BCI',
    sheetName: 'BCI',
    extraColumns: [
      ['intNroTarificacionBCI', 'Nro tarificacion BCI'],
      ['strNroCotizacionBCI', 'Nro cotizacion BCI'],
      ['dtFinVigenciaBCI', 'Fin vigencia BCI'],
    ],
  },
  {
    key: 'FDI',
    sheetName: 'FDI',
    extraColumns: [
      ['dealTokenFDI', 'Deal token FDI'],
      ['itemIdFDI', 'Item ID FDI'],
      ['quotationIdFDI', 'Quotation ID FDI'],
      ['fidIdFDI', 'FID ID FDI'],
      ['expiryDateFDI', 'Expiry date FDI'],
    ],
  },
  {
    key: 'OTRAS',
    sheetName: 'Otras companias',
    extraColumns: [],
  },
])

async function createWorkbook() {
  const { default: ExcelJS } = await import('exceljs')
  return new ExcelJS.Workbook()
}

const headerFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF111111' },
}

const editableFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' },
}

function getCellText(cell) {
  const value = cell?.value

  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    if ('text' in value) return String(value.text || '').trim()
    if ('result' in value) return String(value.result || '').trim()
  }

  return String(value).trim()
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
}

function styleHeader(row) {
  row.height = 24
  row.eachCell((cell) => {
    cell.fill = headerFill
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
    cell.alignment = { vertical: 'middle' }
  })
}

function getColumnWidth(key) {
  if (['idCotizacion', 'planId', 'dealTokenFDI', 'fidIdFDI'].includes(key)) return 24
  if (['nombrePlan', 'nombreDueno', 'nombreComprador', 'direccionCompleta'].includes(key)) return 30
  if (['emailComprador'].includes(key)) return 28
  if (['calle', 'region', 'comuna'].includes(key)) return 20
  if (['rutDueno', 'rutComprador', 'patente', 'telefonoComprador'].includes(key)) return 18
  if (
    [
      'fecha',
      'estadoActual',
      'anioVehiculo',
      'dtFinVigenciaBCI',
      'expiryDateFDI',
      'estado',
    ].includes(key)
  ) {
    return 16
  }

  return 18
}

function buildExportColumns(extraColumns = []) {
  return [
    ...BASE_EXPORT_COLUMNS.map(([key, header]) => ({ key, header, width: getColumnWidth(key) })),
    ...extraColumns.map(([key, header]) => ({ key, header, width: getColumnWidth(key) })),
    { key: 'estado', header: EDITABLE_STATUS_HEADER, width: getColumnWidth('estado') },
  ]
}

function buildCommissionExportRow(commission, extraColumns = []) {
  const keys = [...BASE_EXPORT_COLUMNS, ...extraColumns].map(([key]) => key)
  const baseRow = Object.fromEntries(keys.map((key) => [key, commission[key] ?? '']))

  return {
    ...baseRow,
    estado: '',
  }
}

function addInsurerSheet(workbook, config, commissions) {
  const worksheet = workbook.addWorksheet(config.sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  worksheet.columns = buildExportColumns(config.extraColumns)

  commissions.forEach((commission) => {
    worksheet.addRow(buildCommissionExportRow(commission, config.extraColumns))
  })

  styleHeader(worksheet.getRow(1))
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(worksheet.rowCount, 1), column: worksheet.columns.length },
  }

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const statusCell = row.getCell('estado')
    statusCell.fill = editableFill
    statusCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`'${CATALOG_SHEET}'!$A$2:$A$${BACKEND_UPDATE_STATUSES.length + 1}`],
      showErrorMessage: true,
      errorTitle: 'Estado no valido',
      error: 'Selecciona un estado disponible en la lista.',
    }
  })
}

function addCatalogSheet(workbook) {
  const worksheet = workbook.addWorksheet(CATALOG_SHEET)
  worksheet.getCell('A1').value = 'Estados permitidos'

  BACKEND_UPDATE_STATUSES.forEach((status, index) => {
    worksheet.getCell(`A${index + 2}`).value = status
  })

  worksheet.state = 'veryHidden'
}

function buildHeaderMap(worksheet) {
  const headerRow = worksheet.getRow(1)
  const headerMap = new Map()

  headerRow.eachCell((cell, columnNumber) => {
    headerMap.set(normalizeHeader(getCellText(cell)), columnNumber)
  })

  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headerMap.has(header))
  if (missingHeaders.length > 0) {
    throw new Error(
      `La hoja "${worksheet.name}" fue modificada. Descarga nuevamente el archivo base y edita solo la columna "estado".`,
    )
  }

  return headerMap
}

function getRowField(row, headerMap, key) {
  const columnNumber = headerMap.get(key)
  return getCellText(row.getCell(columnNumber)).trim()
}

function getSheetOrder(sheetName) {
  const index = INSURER_BUCKETS.findIndex((sheet) => sheet.sheetName === sheetName)
  return index >= 0 ? index : INSURER_BUCKETS.length
}

function getGroupsCollection(source) {
  if (Array.isArray(source)) return source
  if (Array.isArray(source?.groups)) return source.groups
  return []
}

function getSheetRows(groups, bucketKey) {
  return groups
    .filter((group) => group.insurerBucket === bucketKey)
    .flatMap((group) => (Array.isArray(group.items) ? group.items : []))
    .sort((first, second) => {
      const companyComparison = String(first.compania || '').localeCompare(String(second.compania || ''), 'es')
      if (companyComparison !== 0) return companyComparison

      const dateComparison = String(first.fecha || '').localeCompare(String(second.fecha || ''), 'es')
      if (dateComparison !== 0) return dateComparison

      return String(first.idCotizacion || '').localeCompare(String(second.idCotizacion || ''), 'es')
    })
}

export async function buildCommissionsExcelBuffer(pendingQuotesExport) {
  validatePendingQuotesExport(pendingQuotesExport)
  const groups = getGroupsCollection(pendingQuotesExport)

  if (groups.length === 0) {
    throw new Error('No hay cotizaciones pendientes para exportar a las aseguradoras.')
  }

  const workbook = await createWorkbook()
  workbook.creator = 'Moneyfy Admin'
  workbook.created = new Date()

  INSURER_BUCKETS.forEach((config) => {
    const rows = getSheetRows(groups, config.key)

    if (rows.length === 0) {
      return
    }

    addInsurerSheet(workbook, config, rows)
  })

  addCatalogSheet(workbook)
  workbook.views = [{ activeTab: 0 }]

  return workbook.xlsx.writeBuffer()
}

export async function exportCommissionsExcel(pendingQuotesExport) {
  const buffer = await buildCommissionsExcelBuffer(pendingQuotesExport)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `moneyfy-comisiones-pendientes-${new Date().toISOString().slice(0, 10)}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}

export async function parseCommissionStatusExcel(file) {
  const workbook = await createWorkbook()
  await workbook.xlsx.load(await file.arrayBuffer())

  const valid = []
  const rejected = []
  const seenIds = new Set()
  let processedRows = 0

  const unknownSheets = workbook.worksheets.filter(sheet => sheet.name !== CATALOG_SHEET && !INSURER_BUCKETS.some(config => config.sheetName === sheet.name))
  if (unknownSheets.length) throw new Error('El archivo contiene hojas desconocidas. Usa el Excel exportado y edita solo la columna estado.')
  INSURER_BUCKETS.forEach(({ sheetName, key: insurerBucket }) => {
    const worksheet = workbook.getWorksheet(sheetName)
    if (!worksheet) {
      return
    }

    const headerMap = buildHeaderMap(worksheet)
    const idColumnKey = 'idcotizacion'
    const statusColumnKey = 'estado'

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber)
      const idCotizacion = getRowField(row, headerMap, idColumnKey)
      const requestedStatus = getRowField(row, headerMap, statusColumnKey)
      const estado = BACKEND_UPDATE_STATUSES.find(
        (status) => status.toLowerCase() === requestedStatus.toLowerCase(),
      )

      const hasData = row.values.some(value => value !== null && value !== undefined && String(value).trim())
      if (!hasData) continue

      const rowReference = `${sheetName}:${rowNumber}`
      const rowOrder = getSheetOrder(sheetName) * 100000 + rowNumber

      if (!idCotizacion) {
        processedRows++
        rejected.push({
          rowNumber: rowReference,
          rowOrder,
          reason: 'Falta ID de cotización.',
        })
        continue
      }

      if (seenIds.has(idCotizacion)) {
        processedRows++
        rejected.push({
          rowNumber: rowReference,
          rowOrder,
          reason: 'ID de cotizacion duplicado.',
        })
        continue
      }

      seenIds.add(idCotizacion)
      if (!requestedStatus) continue // Blank status means unchanged; the exported file starts blank.
      processedRows++
      if (!estado) { rejected.push({ rowNumber: rowReference, rowOrder, reason: 'Estado no válido: solo Aprobado, Rechazado o Caducado.' }); continue }
      valid.push({ rowNumber: rowReference, rowOrder, idCotizacion, estado, insurerBucket })
    }
  })

  if (processedRows === 0) {
    throw new Error('El archivo no contiene actualizaciones para procesar.')
  }

  return {
    valid,
    rejected,
    total: processedRows,
  }
}
