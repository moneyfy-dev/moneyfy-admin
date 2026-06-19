import {
  BACKEND_UPDATE_STATUSES,
  COMMISSION_COLUMNS,
} from '../constants'

const DETAILS_SHEET = 'Comisiones'
const UPDATES_SHEET = 'Actualizacion estados'
const CATALOG_SHEET = 'Catalogos'
const UPDATE_HEADERS = ['idCotizacion', 'estado']

async function createWorkbook() {
  const { default: ExcelJS } = await import('exceljs')
  return new ExcelJS.Workbook()
}

const headerFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF111111' },
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

function getWorksheetHeaders(worksheet) {
  return worksheet.getRow(1).values
    .slice(1)
    .map((value) => String(value || '').trim())
}

function styleHeader(row) {
  row.height = 24
  row.eachCell((cell) => {
    cell.fill = headerFill
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
    cell.alignment = { vertical: 'middle' }
  })
}

function addDetailsSheet(workbook, commissions) {
  const worksheet = workbook.addWorksheet(DETAILS_SHEET, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  worksheet.columns = COMMISSION_COLUMNS.map(([key, label]) => ({
    key,
    header: label,
    width: key === 'idCotizacion' || key === 'nombrePlan' ? 28 : 20,
  }))

  commissions.forEach((commission) => {
    worksheet.addRow(
      Object.fromEntries(
        COMMISSION_COLUMNS.map(([key]) => [key, commission[key] ?? '']),
      ),
    )
  })

  styleHeader(worksheet.getRow(1))
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(worksheet.rowCount, 1), column: COMMISSION_COLUMNS.length },
  }
  worksheet.getColumn('totalComision').numFmt = '$#,##0'
}

function addUpdatesSheet(workbook, commissions) {
  const worksheet = workbook.addWorksheet(UPDATES_SHEET, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  worksheet.columns = [
    { key: 'idCotizacion', header: 'idCotizacion', width: 30 },
    { key: 'estado', header: 'estado', width: 24 },
  ]

  commissions
    .filter((commission) => commission.estadoBackend === 'Pendiente')
    .forEach((commission) => {
    worksheet.addRow({
      idCotizacion: commission.idCotizacion,
      estado: '',
    })
    })

  styleHeader(worksheet.getRow(1))

  for (let row = 2; row <= Math.max(worksheet.rowCount, 2); row += 1) {
    worksheet.getCell(`B${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`'${CATALOG_SHEET}'!$A$2:$A$${BACKEND_UPDATE_STATUSES.length + 1}`],
      showErrorMessage: true,
      errorTitle: 'Estado no valido',
      error: 'Selecciona un estado disponible en la lista.',
    }
  }

  worksheet.autoFilter = `A1:B${Math.max(worksheet.rowCount, 1)}`
}

function addCatalogSheet(workbook) {
  const worksheet = workbook.addWorksheet(CATALOG_SHEET)
  worksheet.getCell('A1').value = 'Estados permitidos'

  BACKEND_UPDATE_STATUSES.forEach((status, index) => {
    worksheet.getCell(`A${index + 2}`).value = status
  })

  worksheet.state = 'veryHidden'
}

export async function exportCommissionsExcel(commissions) {
  const workbook = await createWorkbook()
  workbook.creator = 'Moneyfy Admin'
  workbook.created = new Date()

  addUpdatesSheet(workbook, commissions)
  addDetailsSheet(workbook, commissions)
  addCatalogSheet(workbook)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `moneyfy-comisiones-${new Date().toISOString().slice(0, 10)}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}

export async function parseCommissionStatusExcel(file) {
  const workbook = await createWorkbook()
  await workbook.xlsx.load(await file.arrayBuffer())

  const worksheet = workbook.getWorksheet(UPDATES_SHEET)
  if (!worksheet) {
    throw new Error('El archivo no contiene la hoja "Actualizacion estados".')
  }

  const headers = getWorksheetHeaders(worksheet)
  const hasValidHeaders =
    headers.length >= UPDATE_HEADERS.length &&
    UPDATE_HEADERS.every((header, index) => headers[index] === header)

  if (!hasValidHeaders) {
    throw new Error('La hoja "Actualizacion estados" fue modificada. Descarga nuevamente el archivo base y edita solo la columna "estado".')
  }

  const idColumn = headers.indexOf('idCotizacion') + 1
  const statusColumn = headers.indexOf('estado') + 1
  const valid = []
  const rejected = []
  const seenIds = new Set()
  let processedRows = 0

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const idCotizacion = getCellText(row.getCell(idColumn))
    const requestedStatus = getCellText(row.getCell(statusColumn))
    const estado = BACKEND_UPDATE_STATUSES.find(
      (status) => status.toLowerCase() === requestedStatus.toLowerCase(),
    )

    if (!idCotizacion && !requestedStatus) continue
    processedRows += 1

    if (!idCotizacion || !estado) {
      rejected.push({
        rowNumber,
        reason: 'ID o estado no valido.',
      })
      continue
    }

    if (seenIds.has(idCotizacion)) {
      rejected.push({
        rowNumber,
        reason: 'ID de cotizacion duplicado.',
      })
      continue
    }

    seenIds.add(idCotizacion)
    valid.push({ rowNumber, idCotizacion, estado })
  }

  return {
    valid,
    rejected,
    total: processedRows,
  }
}
