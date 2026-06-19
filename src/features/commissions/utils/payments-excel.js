async function createWorkbook() {
  const { default: ExcelJS } = await import('exceljs')
  return new ExcelJS.Workbook()
}

const BANK_SHEET_NAME = 'Nomina Banco'

const REQUIRED_HEADERS = [
  'userid',
  'rut',
  'titular',
  'email',
  'banco',
  'tipocuenta',
  'numerocuenta',
  'monto',
  'transacciones',
  'estado',
  'nota',
  'voucherbanco',
]

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

function styleHeader(row) {
  row.height = 24
  row.eachCell((cell) => {
    cell.fill = headerFill
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
    cell.alignment = { vertical: 'middle' }
  })
}

function addBankPayrollSheet(workbook, groups) {
  const worksheet = workbook.addWorksheet('Nomina Banco', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  worksheet.columns = [
    { key: 'userId', header: 'userId', width: 28 },
    { key: 'rut', header: 'rut', width: 18 },
    { key: 'holderName', header: 'titular', width: 28 },
    { key: 'email', header: 'email', width: 30 },
    { key: 'bank', header: 'banco', width: 24 },
    { key: 'accountType', header: 'tipoCuenta', width: 18 },
    { key: 'accountNumber', header: 'numeroCuenta', width: 22 },
    { key: 'totalComision', header: 'monto', width: 16 },
    { key: 'transactions', header: 'transacciones', width: 42 },
    { key: 'estado', header: 'estado', width: 16 },
    { key: 'nota', header: 'nota', width: 36 },
    { key: 'voucherBanco', header: 'voucherBanco', width: 28 },
  ]

  groups.forEach((group) => {
    worksheet.addRow({
      userId: group.userId,
      rut: group.selectedAccount?.rut || '',
      holderName: group.selectedAccount?.holderName || '',
      email: group.selectedAccount?.email || group.email || '',
      bank: group.selectedAccount?.bank || '',
      accountType: group.selectedAccount?.accountType || '',
      accountNumber: group.selectedAccount?.accountNumber || '',
      totalComision: Number(group.totalComision || 0),
      transactions: Array.isArray(group.transactionIds) ? group.transactionIds.join('|') : '',
      estado: '',
      nota: '',
      voucherBanco: '',
    })
  })

  styleHeader(worksheet.getRow(1))
  worksheet.autoFilter = `A1:L${Math.max(worksheet.rowCount, 1)}`
  worksheet.getColumn('totalComision').numFmt = '$#,##0'

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    ;['estado', 'nota', 'voucherBanco'].forEach((columnKey) => {
      const cell = row.getCell(columnKey)
      cell.fill = editableFill
    })

    row.getCell('estado').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Pagado,Conflictivo"'],
      showErrorMessage: true,
      errorStyle: 'stop',
      errorTitle: 'Estado no válido',
      error: 'Selecciona solo Pagado o Conflictivo.',
    }
  })

  worksheet.getCell('N1').value = 'Instrucciones'
  worksheet.getCell('N2').value = 'Solo editar columnas estado, nota y voucherBanco.'
  worksheet.getCell('N3').value = 'Si estado = Pagado, voucherBanco es obligatorio.'
  worksheet.getCell('N4').value = 'Si estado = Conflictivo, nota es obligatoria.'
  worksheet.getColumn('N').width = 54
}

function addAdminDetailsSheet(workbook, groups) {
  const worksheet = workbook.addWorksheet('Detalle Admin', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  worksheet.columns = [
    { key: 'userId', header: 'userId', width: 28 },
    { key: 'holderName', header: 'titular', width: 28 },
    { key: 'idCotizacion', header: 'idCotizacion', width: 30 },
    { key: 'transactionId', header: 'transactionId', width: 30 },
    { key: 'compania', header: 'compania', width: 22 },
    { key: 'nombrePlan', header: 'nombrePlan', width: 30 },
    { key: 'monto', header: 'monto', width: 16 },
  ]

  groups.forEach((group) => {
    group.cotizaciones.forEach((quote, index) => {
      worksheet.addRow({
        userId: group.userId,
        holderName: group.selectedAccount?.holderName || group.nombre,
        idCotizacion: quote.idCotizacion,
        transactionId: group.transactionIds?.[index] || '',
        compania: quote.compania || '',
        nombrePlan: quote.nombrePlan || '',
        monto: Number(quote.monto || 0),
      })
    })
  })

  styleHeader(worksheet.getRow(1))
  worksheet.autoFilter = `A1:G${Math.max(worksheet.rowCount, 1)}`
  worksheet.getColumn('monto').numFmt = '$#,##0'
}

function addNotesSheet(workbook, meta) {
  const worksheet = workbook.addWorksheet('Notas')
  const rows = [
    ['generadoPor', 'Moneyfy Admin'],
    ['fecha', new Date().toISOString()],
    ['usuariosPreparados', meta.preparedCount],
    ['usuariosSinCuenta', meta.missingAccountCount],
    ['cotizacionesRechazadas', meta.rejectedCount],
    ['nota', 'La hoja "Nomina Banco" es la única hoja editable por el banco y será la fuente para reconstruir el JSON final de /pay-quotes.'],
  ]

  rows.forEach((row) => worksheet.addRow(row))
  styleHeader(worksheet.getRow(1))
  worksheet.columns = [
    { width: 24 },
    { width: 110 },
  ]
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
}

function getWorksheetValue(cellValue) {
  if (cellValue == null) return ''
  if (typeof cellValue === 'string' || typeof cellValue === 'number' || typeof cellValue === 'boolean') {
    return String(cellValue)
  }

  if (typeof cellValue === 'object') {
    if (Array.isArray(cellValue.richText)) {
      return cellValue.richText.map((part) => part.text || '').join('')
    }
    if (typeof cellValue.text === 'string') {
      return cellValue.text
    }
    if (cellValue.result != null) {
      return String(cellValue.result)
    }
  }

  return String(cellValue)
}

function parseAmount(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN
  }

  const text = String(value || '').trim()
  if (!text) return NaN

  const normalized = text
    .replace(/\$/g, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')

  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : NaN
}

function normalizePaymentStatus(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized === 'pagado') return 'Pagado'
  if (normalized === 'conflictivo') return 'Conflictivo'
  return null
}

function isCompleteAccount(account) {
  return Boolean(
    account.rut &&
    account.holderName &&
    account.email &&
    account.bank &&
    account.accountType &&
    account.accountNumber,
  )
}

function buildHeaderMap(worksheet) {
  const headerRow = worksheet.getRow(1)
  const headerMap = new Map()

  headerRow.eachCell((cell, columnNumber) => {
    headerMap.set(normalizeHeader(getWorksheetValue(cell.value)), columnNumber)
  })

  const missingHeaders = REQUIRED_HEADERS.filter((key) => !headerMap.has(key))
  if (missingHeaders.length > 0) {
    throw new Error(
      'El archivo no coincide con la nomina exportada por Moneyfy. Debes cargar la hoja "Nomina Banco" sin cambiar sus encabezados.',
    )
  }

  return headerMap
}

function getRowField(row, headerMap, key) {
  const columnNumber = headerMap.get(key)
  return getWorksheetValue(row.getCell(columnNumber).value).trim()
}

function isEmptyPayrollRow(rowData) {
  return Object.values(rowData).every((value) => !String(value || '').trim())
}

function buildPayloadRow(rowData) {
  const account = {
    rut: rowData.rut,
    holderName: rowData.holderName,
    email: rowData.email,
    bank: rowData.bank,
    accountType: rowData.accountType,
    accountNumber: rowData.accountNumber,
  }

  return {
    userId: rowData.userId,
    transactions: rowData.transactions,
    userAccount: account,
    userPayment: rowData.amount,
    userVoucher: rowData.voucherBanco || null,
    paymentStatus: rowData.status,
    paymentNote: rowData.note || null,
  }
}

export async function parsePaymentPayrollExcel(file) {
  const workbook = await createWorkbook()
  await workbook.xlsx.load(await file.arrayBuffer())

  const worksheet = workbook.getWorksheet(BANK_SHEET_NAME)
  if (!worksheet) {
    throw new Error(
      'No encontramos la hoja "Nomina Banco". Carga el archivo exacto que exportaste desde Moneyfy.',
    )
  }

  const headerMap = buildHeaderMap(worksheet)
  const paidRows = []
  const conflictRows = []
  const rejected = []
  let total = 0

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const rowData = {
      userId: getRowField(row, headerMap, 'userid'),
      rut: getRowField(row, headerMap, 'rut'),
      holderName: getRowField(row, headerMap, 'titular'),
      email: getRowField(row, headerMap, 'email'),
      bank: getRowField(row, headerMap, 'banco'),
      accountType: getRowField(row, headerMap, 'tipocuenta'),
      accountNumber: getRowField(row, headerMap, 'numerocuenta'),
      amount: parseAmount(getRowField(row, headerMap, 'monto')),
      transactions: getRowField(row, headerMap, 'transacciones')
        .split('|')
        .map((value) => value.trim())
        .filter(Boolean),
      status: normalizePaymentStatus(getRowField(row, headerMap, 'estado')),
      note: getRowField(row, headerMap, 'nota'),
      voucherBanco: getRowField(row, headerMap, 'voucherbanco'),
    }

    if (isEmptyPayrollRow({
      userId: rowData.userId,
      rut: rowData.rut,
      holderName: rowData.holderName,
      email: rowData.email,
      bank: rowData.bank,
      accountNumber: rowData.accountNumber,
      status: rowData.status,
      note: rowData.note,
      voucherBanco: rowData.voucherBanco,
    })) {
      continue
    }

    total += 1

    if (!rowData.userId) {
      rejected.push({ rowNumber, reason: 'Falta userId.' })
      continue
    }

    if (!rowData.status) {
      rejected.push({ rowNumber, reason: 'El estado debe ser Pagado o Conflictivo.' })
      continue
    }

    if (!rowData.transactions.length) {
      rejected.push({ rowNumber, reason: 'La fila no incluye transacciones.' })
      continue
    }

    if (!Number.isFinite(rowData.amount) || rowData.amount <= 0) {
      rejected.push({ rowNumber, reason: 'El monto debe ser mayor a cero.' })
      continue
    }

    const account = {
      rut: rowData.rut,
      holderName: rowData.holderName,
      email: rowData.email,
      bank: rowData.bank,
      accountType: rowData.accountType,
      accountNumber: rowData.accountNumber,
    }

    if (!isCompleteAccount(account)) {
      rejected.push({ rowNumber, reason: 'Faltan datos bancarios obligatorios en la fila.' })
      continue
    }

    if (rowData.status === 'Pagado' && !rowData.voucherBanco) {
      rejected.push({ rowNumber, reason: 'Si el estado es Pagado, voucherBanco es obligatorio.' })
      continue
    }

    if (rowData.status === 'Conflictivo' && !rowData.note) {
      rejected.push({ rowNumber, reason: 'Si el estado es Conflictivo, nota es obligatoria.' })
      continue
    }

    const normalizedRow = {
      ...rowData,
      userAccount: account,
    }

    if (rowData.status === 'Pagado') {
      paidRows.push(normalizedRow)
      continue
    }

    conflictRows.push(normalizedRow)
  }

  if (total === 0) {
    throw new Error('La hoja "Nomina Banco" no contiene filas para procesar.')
  }

  const validRows = [...paidRows, ...conflictRows]

  return {
    total,
    paidRows,
    conflictRows,
    rejected,
    payload: {
      usersQuotes: paidRows.map((row) => ({
        userId: row.userId,
        transactions: row.transactions,
        userAccount: row.userAccount,
        userPayment: row.amount,
        userVoucher: row.voucherBanco || null,
      })),
      bankResponses: validRows.map(buildPayloadRow),
    },
  }
}

export async function exportPaymentPayrollExcel(preview) {
  const workbook = await createWorkbook()
  workbook.creator = 'Moneyfy Admin'
  workbook.created = new Date()

  addBankPayrollSheet(workbook, preview.prepared)
  addAdminDetailsSheet(workbook, preview.prepared)
  addNotesSheet(workbook, {
    preparedCount: preview.prepared.length,
    missingAccountCount: preview.missingAccountCount || 0,
    rejectedCount: preview.rejected.length,
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `moneyfy-nomina-pagos-${new Date().toISOString().slice(0, 10)}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
