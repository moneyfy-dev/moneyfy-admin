# Moneyfy Admin - Guia de desarrollo

Este archivo define las reglas tecnicas y de producto para trabajar en el
administrador de Moneyfy. Debe mantenerse actualizado cuando cambien la
arquitectura, los contratos de API o los flujos principales.

## Objetivo del proyecto

Moneyfy Admin es una aplicacion web interna para gestionar la operacion de
usuarios, cotizaciones y comisiones.

Alcance inicial:

- Autenticacion y recuperacion de acceso.
- Dashboard con indicadores operativos.
- Listado y filtros de comisiones.
- Exportacion de comisiones por rango de fechas.
- Importacion de archivos para actualizar estados.
- CRUD basico de usuarios cuando el backend publique sus endpoints.
- Estados de comision:
  - Pendiente de aprobacion.
  - Pendiente de pago.
  - Pagado.
  - Rechazado.
- Las cotizaciones incompletas tambien deben aparecer, aunque no tengan plan,
  compania o comision.

## Stack actual

- Vue 3 con Composition API.
- Vite.
- Tailwind CSS.
- Remix Icon.
- Vue Router 4.
- Pinia.
- Axios.
- Papa Parse.
- JavaScript.

La aplicacion usa rutas y features independientes. Los mocks siguen disponibles
como fallback controlado, pero el contrato administrativo actual se integra con
JWT sobre `/api/v1/manager/*`.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
```

Antes de cerrar una tarea se debe ejecutar al menos:

```bash
npm run build
```

Actualmente no hay lint ni pruebas automatizadas configuradas. Al incorporarlos,
se deben agregar sus comandos a `package.json` y actualizar esta seccion.

Variables disponibles:

```env
VITE_USE_MOCKS=true
VITE_COMMISSIONS_USE_MOCKS=true
VITE_DASHBOARD_USE_MOCKS=true
VITE_API_URL=https://api.moneyfy.cl/moneyfy
VITE_API_TIMEOUT=15000
VITE_MANAGER_PAGE_SIZE=100
VITE_STATUS_UPDATES_ENABLED=false
```

## Principios de implementacion

1. Leer el codigo existente antes de modificarlo.
2. Mantener los cambios acotados al requerimiento.
3. No inventar contratos de API. Usar adaptadores mock hasta recibir el contrato
   real.
4. No duplicar estado entre componentes, stores y cliente HTTP.
5. No mezclar renderizado, reglas de negocio, persistencia y llamadas HTTP en un
   mismo componente.
6. Preferir componentes pequenos y APIs explicitas antes que componentes
   configurables en exceso.
7. Los datos del backend se normalizan en una frontera de infraestructura, no
   dentro de las vistas.
8. Los errores esperables deben tener estados visuales disenados. No usar
   `alert()`.
9. No dejar credenciales, tokens, secretos ni datos personales reales en el
   repositorio.
10. Toda lista debe contemplar carga, error, vacio, filtros sin resultados y
    paginacion.

## Arquitectura objetivo

```text
src/
  app/
    App.vue
    router/
    providers/
  assets/
    fonts/
    images/
    styles/
  components/
    atoms/
    molecules/
    organisms/
  composables/
  config/
  features/
    auth/
      api/
      components/
      pages/
      schemas/
      store/
      types/
    dashboard/
    commissions/
    users/
  layouts/
  mocks/
  services/
    api/
      client.js
      errors.js
      interceptors.js
  stores/
  types/
  utils/
  main.js
```

### Capas

- `components/`: piezas visuales reutilizables y sin reglas de negocio.
- `features/`: dominio vertical completo por funcionalidad.
- `services/api/`: transporte HTTP, tokens, interceptores y normalizacion de
  errores.
- `stores/`: estado global real de la aplicacion.
- `composables/`: comportamiento reutilizable y estado local compartido.
- `layouts/`: estructura de navegacion, sidebar, header y contenido.
- `mocks/`: implementaciones temporales con la misma interfaz que la API real.
- `config/`: variables de entorno, rutas y constantes globales.

No crear carpetas vacias por anticipado. La estructura se incorpora de forma
incremental a medida que se extrae funcionalidad de `App.vue`.

## Diseno atomico

Usar diseno atomico con criterio, sin convertir cada etiqueta HTML en un
componente.

### Atoms

Controles visuales basicos:

- `BaseButton`
- `BaseInput`
- `BaseSelect`
- `BaseBadge`
- `BaseIcon`
- `BaseSpinner`

No conocen stores, router ni endpoints.

### Molecules

Combinaciones pequenas:

- `SearchField`
- `DateRangeField`
- `StatusFilter`
- `MetricCard`
- `FormField`
- `EmptyState`

Pueden emitir eventos, pero no deben ejecutar peticiones HTTP.

### Organisms

Bloques funcionales:

- `AdminSidebar`
- `AdminHeader`
- `CommissionTable`
- `CommissionFilters`
- `CommissionImportPanel`
- `DashboardCharts`

Coordinan atoms y molecules. Las paginas o contenedores de feature les entregan
datos y acciones.

### Pages

Las paginas conectan router, stores y casos de uso. No deben contener cientos de
lineas de markup ni reglas de transformacion complejas.

## Estado

Usar Pinia para el estado global.

Separar claramente:

- Estado de sesion: usuario autenticado, rol y permisos.
- Estado de UI global: sidebar, notificaciones y modales.
- Estado de dominio: filtros persistentes o seleccion actual cuando varias vistas
  lo necesiten.
- Estado local: formularios, dropdowns y modales exclusivos de un componente.
- Estado remoto: datos, carga, error, paginacion y fecha de ultima consulta.

No guardar en Pinia valores que puedan calcularse con `computed`.
No copiar una respuesta completa en varios stores.
No hacer llamadas HTTP directamente desde componentes visuales.

Cada store debe exponer acciones con nombres de negocio, por ejemplo:

```js
await commissionsStore.fetchCommissions(filters)
await commissionsStore.importStatuses(file)
await authStore.signIn(credentials)
```

## API centralizada

Usar el cliente Axios unico de `src/services/api/client.js`.

Responsabilidades del cliente:

- `baseURL` desde `VITE_API_URL`.
- Timeout comun.
- Cabeceras comunes.
- Inyeccion del access token.
- Renovacion controlada del token.
- Normalizacion de errores.
- Cancelacion de solicitudes cuando corresponda.
- Cierre de sesion ante una sesion definitivamente invalida.

Estructura esperada:

```text
services/api/client.js
services/api/interceptors.js
services/api/errors.js
features/commissions/api/commissions.api.js
features/auth/api/auth.api.js
features/users/api/users.api.js
```

Los modulos de dominio no importan Axios directamente. Importan el cliente
centralizado.

### Interceptor de autenticacion

- No intentar renovar el token para login, refresh o logout.
- Una sola solicitud de refresh puede estar activa.
- Las solicitudes que reciban `401` durante el refresh deben esperar el mismo
  resultado, no iniciar renovaciones paralelas.
- Reintentar cada solicitud como maximo una vez.
- Si el refresh falla, limpiar sesion y redirigir al login.
- No registrar tokens ni payloads sensibles en consola.

Preferencia de seguridad:

- Refresh token en cookie `HttpOnly`, `Secure` y `SameSite`.
- Access token en memoria.
- Si el backend obliga a persistir tokens en Web Storage, documentar el riesgo y
  encapsular el acceso en el store de autenticacion.

### Errores

Normalizar todos los errores a una forma estable:

```js
{
  status: 422,
  code: 'VALIDATION_ERROR',
  message: 'Los datos enviados no son validos.',
  fields: {
    email: 'El correo ya esta registrado.'
  }
}
```

La UI nunca debe depender de la estructura interna de Axios.

## Contratos y mocks

Mientras los endpoints no esten disponibles:

- Mantener datos mock fuera de los componentes.
- Definir repositorios o servicios con la interfaz final esperada.
- Permitir cambiar entre mock y API mediante configuracion.
- No simular seguridad real con credenciales hardcodeadas en produccion.
- Marcar claramente los supuestos pendientes de confirmacion con backend.

Ejemplo:

```js
const commissionsRepository =
  config.commissionsUseMocks ? mockCommissionsRepository : apiCommissionsRepository
```

## Autenticacion y autorizacion

- El login actual con correo y contrasena hardcodeados es solo una maqueta.
- Nunca persistir contrasenas.
- La recuperacion de contrasena debe usar un token de un solo uso y expiracion.
- Las rutas administrativas deben tener guard de autenticacion.
- Las acciones deben validarse por permisos, no solo ocultarse visualmente.
- El backend sigue siendo la autoridad final para roles y permisos.

Roles iniciales sugeridos, sujetos al contrato real:

- `admin`: acceso completo.
- `operator`: gestion de comisiones sin administracion de usuarios.
- `viewer`: solo lectura y exportacion.

## Comisiones

Modelo visual minimo:

```js
{
  idCotizacion: '',
  nombre: '',
  patente: '',
  estado: '',
  fecha: '',
  compania: null,
  totalComision: null,
  nombrePlan: null
}
```

Reglas:

- `nombre`, `patente`, `estado` y `fecha` son obligatorios para renderizar.
- Los datos faltantes se muestran como `No disponible`, no como valores falsos.
- Filtros y ordenamiento deben ser deterministas.
- El rango de exportacion debe reflejar exactamente los filtros visibles.
- La importacion debe validar columnas, estados permitidos, duplicados y filas
  rechazadas antes de enviar cambios.
- Mostrar resumen de importacion: procesadas, actualizadas y rechazadas.
- No actualizar estados optimistamente si el backend no confirma la operacion.

## UI y sistema visual

La referencia visual es el landing de Moneyfy.

- Fuente principal: Poppins.
- Color oscuro Moneyfy: `#111111`.
- Verde principal: usar los tokens definidos en Tailwind.
- Iconos: Remix Icon.
- Radio de cards: maximo `8px`, salvo controles circulares.
- Interfaces operativas densas, ordenadas y faciles de escanear.
- Evitar composiciones de landing, decoracion excesiva y cards anidadas.
- Usar iconos en acciones conocidas y tooltip cuando la accion no sea obvia.
- Todas las tablas deben funcionar en pantallas pequenas mediante estrategia
  responsive explicita.
- No usar blur costoso en listas grandes.

Estados obligatorios:

- Loading con skeleton o indicador estable.
- Error con accion para reintentar.
- Empty state.
- Sin resultados por filtros.
- Disabled.
- Confirmacion para acciones destructivas.
- Feedback de exito o error mediante toast o modal Moneyfy.

## Accesibilidad

- Usar HTML semantico.
- Todo control debe ser operable con teclado.
- Mantener foco visible.
- Inputs siempre asociados a `label`.
- Modales deben atrapar y devolver el foco.
- Icon buttons requieren `aria-label`.
- No usar solo color para comunicar estados.
- Contraste minimo WCAG AA.

## Formularios

- Mantener estado y validacion fuera del markup principal.
- Validar antes de enviar y mapear errores de backend por campo.
- Deshabilitar doble envio mientras una operacion esta en curso.
- No borrar datos del usuario ante un error recuperable.
- Para importacion usar un parser CSV/XLSX real; no separar filas con
  `split(';')` cuando se implemente produccion.

## Seguridad

- No usar `v-html` con datos externos.
- Escapar y validar archivos importados.
- Limitar tipo y tamano de archivos.
- No confiar en extensiones; validar MIME y contenido.
- Evitar datos personales en logs.
- No guardar respuestas completas del backend en consola.
- Variables `VITE_*` son publicas en el bundle: nunca contienen secretos.
- La autenticacion administrativa actual depende de `sessionToken` y `refreshToken`
  emitidos por `/api/v1/manager/auth/*`, no de API keys embebidas en frontend.
- `VITE_STATUS_UPDATES_ENABLED` existe como interruptor de seguridad para evitar
  escrituras accidentales en ambientes de desarrollo cuando se trabaja contra
  endpoints reales.
- Configurar CSP, HTTPS y cabeceras de seguridad en el hosting.

## Rendimiento

- Paginar tablas grandes desde backend.
- Aplicar debounce a busquedas remotas.
- Cancelar busquedas obsoletas.
- No renderizar graficos o tablas ocultas innecesariamente.
- Usar carga diferida por ruta.
- Evitar watchers profundos cuando un `computed` sea suficiente.
- Virtualizar listas solo cuando el volumen lo justifique.

## Pruebas

Objetivo al iniciar la refactorizacion:

- Vitest para funciones, stores y composables.
- Vue Test Utils para componentes.
- Playwright para flujos criticos.

Flujos E2E prioritarios:

1. Login y recuperacion de contrasena.
2. Filtros y ordenamiento de comisiones.
3. Exportacion por rango de fechas.
4. Importacion valida e invalida.
5. Expiracion y renovacion de sesion.
6. Restricciones por rol.

## Flujo de trabajo

Para cada feature:

1. Confirmar requerimiento y contrato.
2. Definir tipos o esquema de datos.
3. Implementar repositorio mock o API.
4. Implementar store/composable.
5. Construir componentes desde atoms a pagina.
6. Cubrir estados de carga, error y vacio.
7. Agregar pruebas proporcionales al riesgo.
8. Ejecutar build y revisar responsive.

## Criterios de terminado

Una tarea no esta terminada si:

- Solo funciona con datos mock incrustados en la vista.
- Duplica estado o reglas ya existentes.
- No contempla error, carga o vacio.
- Introduce credenciales o secretos.
- Rompe navegacion responsive o accesibilidad basica.
- No compila con `npm run build`.
- El comportamiento depende de una respuesta de backend no documentada.

## Decisiones pendientes

No implementar como definitivas hasta recibir confirmacion:

- URL y version de la API administrativa.
- Roles y permisos.
- Endpoints de dashboard, usuarios y comisiones.
- Paginacion, filtros y ordenamiento soportados por backend.
- Formato oficial de exportacion e importacion.
- Limites y validaciones del archivo.
- Estrategia de hosting y variables por ambiente.
