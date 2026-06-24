export const COMMISSION_STATUSES = Object.freeze([
  'Pendiente de aprobación',
  'Pendiente de pago',
  'Pagado',
  'Conflictivo',
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
  ['fecha', 'Fecha cotizacion'],
  ['estado', 'Estado'],
  ['compania', 'Aseguradora'],
  ['idCotizacion', 'ID cotizacion'],
  ['transactionId', 'ID transaccion'],
  ['beneficiario', 'Beneficiario comision'],
  ['userEmail', 'Email beneficiario'],
  ['patente', 'Patente'],
  ['marcaVehiculo', 'Marca'],
  ['modeloVehiculo', 'Modelo'],
  ['anioVehiculo', 'Ano'],
  ['tipoVehiculo', 'Tipo vehiculo'],
  ['rutDueno', 'RUT dueno'],
  ['nombreDueno', 'Nombre dueno'],
  ['rutComprador', 'RUT comprador'],
  ['nombreComprador', 'Nombre comprador'],
  ['emailComprador', 'Email comprador'],
  ['telefonoComprador', 'Telefono comprador'],
  ['calle', 'Calle'],
  ['numeroDireccion', 'Numero'],
  ['nombrePlan', 'Nombre plan'],
  ['fechaAprobacion', 'Fecha aprobacion'],
  ['fechaPago', 'Fecha pago'],
  ['totalComision', 'Total comision'],
])

export const COMMISSION_TABLE_COLUMNS = Object.freeze([
  ['idCotizacion', 'ID cotización'],
  ['nombre', 'Nombre'],
  ['compania', 'Compañía'],
  ['fecha', 'Fecha'],
  ['estado', 'Estado'],
])
