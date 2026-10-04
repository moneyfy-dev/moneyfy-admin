# Comisiones: criterios y aceptación

El dashboard separa comisiones por aprobar (`Pendiente`), por pagar (`Aprobado`), pagadas (`Pagado`) y conflictivas (`Conflictivo`). El importe y estado corresponden a cada beneficiario; una transacción parcialmente pagada puede aparecer en más de un detalle.

El período de las tarjetas y su detalle utiliza la fecha de creación de la transacción. Por defecto se consulta todo el historial. Los gráficos conservan los últimos siete días y usuarios activos conserva el indicador actual. El consolidado Moneyfyers también corresponde a todo el historial; pendientes de pago excluye conflictivas y por aprobar. Generado propio/referidos/total incluye Aprobado + Pagado + Conflictivo.

Cada tarjeta monetaria abre un detalle paginado 10/25/50/100. El total del detalle cubre todos los registros coincidentes, no solo la página visible. Si cambió entre consultas, se muestra la diferencia y se pide actualizar el resumen. Las comisiones con cotización ausente siguen visibles.

La conciliación compara el saldo pendiente del perfil con las comisiones Pendiente del historial completo. Es solo lectura: no repara importes. Un perfil o billetera ausente se informa como no conciliable. Revisar cualquier diferencia con los registros y respuestas de aseguradoras antes de aprobar una reparación de datos.

## Validación y despliegue

- Publicar primero el backend con los nuevos campos/endpoints. Una respuesta de backend anterior falla explícitamente; no se inventan importes cero.
- `npm test` cubre separación de estados, período, contrato, paginación, conciliación y consolidado. El despliegue ejecuta estas pruebas antes del build.
- QA aislado en Edge 1440/390 verifica cuatro estados, período compartido, página 2 con total persistente, cambio de tamaño, error/reintento/vacío, importes cambiados, huérfanos, conciliación, backend antiguo, teclado/foco y ausencia de desbordamiento.
- Falta aceptación autenticada con datos reales: abrir los cuatro detalles, contrastar sumas con el consolidado y revisar conciliación. Las pruebas aisladas no acreditan los importes concretos de una cuenta real.

No se publican los seis cambios locales anteriores de exportación/importación por aseguradora. Permanecen independientes de esta corrección.
