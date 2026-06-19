export const COMMISSION_STATUSES = Object.freeze([
  'Pendiente de aprobación',
  'Pendiente de pago',
  'Pagado',
  'Rechazado',
  'Caducado',
])

export const INCOMPLETE_STATUS = 'Cotización incompleta'
export const STATUS_FILTERS = Object.freeze([...COMMISSION_STATUSES, INCOMPLETE_STATUS])

export const BACKEND_UPDATE_STATUSES = Object.freeze([
  'Aprobado',
  'Rechazado',
  'Caducado',
])

export const COMMISSION_COLUMNS = Object.freeze([
  ['nombre', 'Nombre'],
  ['patente', 'Patente'],
  ['estado', 'Estado'],
  ['fecha', 'Fecha'],
  ['idCotizacion', 'ID cotización'],
  ['compania', 'Compañía'],
  ['totalComision', 'Total comisión'],
  ['nombrePlan', 'Nombre plan'],
])

export const COMMISSION_TABLE_COLUMNS = Object.freeze([
  ['idCotizacion', 'ID cotización'],
  ['nombre', 'Nombre'],
  ['compania', 'Compañía'],
  ['fecha', 'Fecha'],
  ['estado', 'Estado'],
])
