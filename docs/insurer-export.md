# Cotizaciones para aseguradoras

Exportar Excel consulta `GET /api/v1/manager/pending-quotes` y descarga todas las cotizaciones en estado **Pendiente** de todo el historial, agrupadas en hojas BCI y FDI. La fecha, búsqueda, estado visible y página de la tabla no limitan el archivo. No usa los registros de beneficiarios de comisiones como cotizaciones.

Una cotización Pendiente está **por aprobar**. Una comisión Aprobada está **por pagar**. El reporte de aseguradoras no es una nómina bancaria y no cambia el flujo de pago.

El archivo conserva las referencias BCI/FDI que entrega el servicio, incluidas sus fechas completas de vigencia. Los datos opcionales ausentes quedan vacíos; no se inventan importes, transacciones, teléfonos ni referencias de proveedores. Las identidades, estado, plan y alias deben ser válidos; los errores parciales del servicio, IDs ausentes o duplicados y aseguradoras desconocidas detienen la operación completa. El aviso identifica los registros que requieren revisión sin exponer excepciones internas del servidor.

Para importar, editar únicamente `estado` con Aprobado, Rechazado o Caducado. Una celda de estado vacía conserva la cotización sin cambios. Las filas inválidas impiden el envío parcial. Los propietarios se consultan en el catálogo global actual, incluso si la cotización está fuera de la página visible. El catálogo se consulta nuevamente al confirmar; la confirmación explícita y la autorización del backend siguen siendo obligatorias. No se confía en el propietario suministrado por Excel.

Un HTTP 200 no confirma por sí solo cada actualización. El resultado distingue actualizaciones confirmadas, rechazos y cotizaciones sin resultado verificable. Los casos pendientes de revisión permanecen visibles; comprobar su estado antes de reenviar.

El rango inicial de la tabla muestra dos meses. **Todo el historial** limpia ambas fechas y vuelve a la primera página. Las fechas reales de junio y julio comunicadas en QA estaban fuera del rango agosto-octubre; el total global y esa tabla filtrada pueden diferir sin modificar saldos.

## Verificación

`npm test` ejecuta pruebas de contratos del dashboard y del reporte, con más de 50 cotizaciones en distintas fechas, exportación/importación de XLSX reales con ExcelJS, referencias BCI/FDI, estados permitidos, identidad de propietarios, respuestas parciales y resultados individuales HTTP 200.

QA de navegador con respuestas controladas: 64 pendientes de julio, dos aseguradoras, tabla inicial vacía por fechas agosto-octubre, descarga e importación completas fuera de la primera página, botón Todo el historial y bloqueo de respuesta parcial. Verificado a 1440 y 390 píxeles. Ninguna llamada de modificación se ejecutó contra el backend real.

El cambio no modifica bases de datos, saldos ni clasificaciones y no prueba la aceptación del archivo por las aseguradoras externas. Esa aceptación requiere sus contratos y una revisión con datos reales autorizados.
