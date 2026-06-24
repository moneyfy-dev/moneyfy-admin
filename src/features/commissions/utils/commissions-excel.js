import {
  BACKEND_UPDATE_STATUSES,
  COMMISSION_COLUMNS,
} from '../constants'

const CATALOG_SHEET = 'Catalogos'
const REQUIRED_HEADERS = ['idcotizacion', 'estado']
const EDITABLE_STATUS_HEADER = 'estado'
const INSURER_BUCKETS = Object.freeze([
  { key: 'BCI', sheetName: 'BCI' },
  { key: 'FDI', sheetName: 'FDI' },
  { key: 'OTRAS', sheetName: 'Otras companias' },
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
  if (['idCotizacion', 'transactionId'].includes(key)) return 30
  if (['beneficiario', 'nombreDueno', 'nombreComprador', 'nombrePlan', 'userEmail', 'emailComprador'].includes(key)) {
    return 28
  }
  if (key === 'calle') return 24
  if (key === 'compania') return 22
  if (['telefonoComprador', 'rutDueno', 'rutComprador', 'patente'].includes(key)) return 18
  if (['fecha', 'fechaAprobacion', 'fechaPago', 'anioVehiculo', 'tipoVehiculo', 'estadoActual'].includes(key)) return 16
  if (key === 'estado') return 18
  return 20
}

function normalizeInsurerBucket(compania) {
  const normalized = String(compania || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized.includes('bci')) return 'BCI'
  if (normalized.includes('fdi')) return 'FDI'
  return 'OTRAS'
}

function getPendingCommissions(commissions) {
  return commissions.filter((commission) => commission.estadoBackend === 'Pendiente')
}

function buildExportColumns() {
  return [
    ...COMMISSION_COLUMNS.map(([key, label]) => ({ key, header: label, width: getColumnWidth(key) })),
    { key: 'estado', header: EDITABLE_STATUS_HEADER, width: getColumnWidth('estado') },
  ]
}

function buildCommissionExportRow(commission) {
  const baseRow = Object.fromEntries(
    COMMISSION_COLUMNS.map(([key]) => [key, commission[key] ?? '']),
  )

  return {
    ...baseRow,
    estado: '',
  }
}

function addInsurerSheet(workbook, sheetName, commissions) {
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  worksheet.columns = buildExportColumns()

  commissions.forEach((commission) => {
    worksheet.addRow(buildCommissionExportRow(commission))
  })

  styleHeader(worksheet.getRow(1))
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(worksheet.rowCount, 1), column: worksheet.columns.length },
  }
  worksheet.getColumn('totalComision').numFmt = '$#,##0'

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

export async function exportCommissionsExcel(commissions) {
  const pendingCommissions = getPendingCommissions(commissions)

  if (pendingCommissions.length === 0) {
    throw new Error('No hay cotizaciones pendientes visibles para exportar a las aseguradoras.')
  }

  const workbook = await createWorkbook()
  workbook.creator = 'Moneyfy Admin'
  workbook.created = new Date()

  INSURER_BUCKETS.forEach(({ key, sheetName }) => {
    const filtered = pendingCommissions.filter(
      (commission) => normalizeInsurerBucket(commission.compania) === key,
    )

    if (filtered.length === 0) {
      return
    }

    addInsurerSheet(workbook, sheetName, filtered)
  })

  addCatalogSheet(workbook)
  workbook.views = [{ activeTab: 0 }]

  const buffer = await workbook.xlsx.writeBuffer()
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

  INSURER_BUCKETS.forEach(({ sheetName }) => {
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

      if (!idCotizacion && !requestedStatus) continue
      processedRows += 1

      const rowReference = `${sheetName}:${rowNumber}`
      const rowOrder = getSheetOrder(sheetName) * 100000 + rowNumber

      if (!idCotizacion || !estado) {
        rejected.push({
          rowNumber: rowReference,
          rowOrder,
          reason: 'ID o estado no valido.',
        })
        continue
      }

      if (seenIds.has(idCotizacion)) {
        rejected.push({
          rowNumber: rowReference,
          rowOrder,
          reason: 'ID de cotizacion duplicado.',
        })
        continue
      }

      seenIds.add(idCotizacion)
      valid.push({ rowNumber: rowReference, rowOrder, idCotizacion, estado })
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
