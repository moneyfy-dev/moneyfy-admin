<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import { dashboardRepository } from '../api/dashboard.repository'
import { PAGE_SIZES, periodLabel } from '../api/dashboard-contract'
import { formatCurrency } from '@/features/commissions/utils/commission-formatters'

const props = defineProps({ selection: { type: Object, default: null } })
const emit = defineEmits(['close'])
const dialog = ref(null)
const data = ref(null)
const loading = ref(false)
const error = ref('')
const page = ref(0)
const size = ref(10)
let requestId = 0
let previousOverflow = null
const reconciliation = computed(() => props.selection?.reconciliation)
const difference = computed(() => data.value && !reconciliation.value ? data.value.totalAmount - props.selection.amount : 0)
const rangeStart = computed(() => data.value?.totalElements ? data.value.page * data.value.size + 1 : 0)
const rangeEnd = computed(() => Math.min((data.value?.page + 1) * data.value?.size, data.value?.totalElements || 0))
async function load() {
  const request = ++requestId
  data.value = null
  loading.value = true
  error.value = ''
  try {
    const selection = props.selection
    if (!selection) return
    const result = selection.reconciliation
      ? await dashboardRepository.getReconciliation()
      : await dashboardRepository.getCommissions({ ...selection.period, status: selection.status, page: page.value, size: size.value })
    if (request === requestId) data.value = result
  } catch (failure) {
    if (request === requestId) error.value = failure.message || 'No fue posible cargar el detalle.'
  } finally { if (request === requestId) loading.value = false }
}
function close() { dialog.value?.close() }
function afterClose() {
  ++requestId
  if (previousOverflow !== null) document.body.style.overflow = previousOverflow
  previousOverflow = null
  emit('close')
}
function trapFocus(event) {
  if (event.key !== 'Tab') return
  const controls = [...dialog.value.querySelectorAll('button:not([disabled]), select:not([disabled]), [tabindex="0"]')]
  const first = controls[0]
  const last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
watch(() => props.selection, async selection => {
  if (!selection) { close(); return }
  page.value = 0
  size.value = 10
  await nextTick()
  if (!props.selection) return
  if (!dialog.value.open) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.value.showModal()
  }
  void load()
})
function changePage(nextPage) { page.value = nextPage; void load() }
function changeSize() { page.value = 0; void load() }
onBeforeUnmount(() => {
  ++requestId
  if (previousOverflow !== null) document.body.style.overflow = previousOverflow
})
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="ledger-dialog m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-5xl overflow-y-auto rounded-2xl bg-white p-0 text-ink shadow-2xl" aria-labelledby="ledger-title" @close="afterClose" @keydown="trapFocus" @click="($event.target === dialog) && close()">
      <template v-if="selection">
        <header class="flex items-start justify-between gap-4 bg-ink p-6 text-white">
          <div><h2 id="ledger-title" class="text-xl font-bold">{{ reconciliation ? 'Conciliación de saldos pendientes' : selection.label }}</h2><p class="mt-2 text-sm text-slate-300">{{ reconciliation ? 'Todo el historial' : periodLabel(selection.period) }}</p></div>
          <button type="button" autofocus aria-label="Cerrar detalle" class="rounded-full border border-white/30 px-3 py-2 hover:bg-white/10" @click="close">✕</button>
        </header>
        <div class="space-y-5 p-6">
          <p v-if="reconciliation" class="text-sm leading-6 text-slate-600">Compara el saldo pendiente del perfil con las comisiones Pendiente del registro de transacciones. Es una consulta de lectura: no modifica ni corrige saldos. Diferencia = saldo del perfil − registro de comisiones.</p>
          <p v-else class="text-sm leading-6 text-slate-600">Cada fila corresponde a la comisión de un beneficiario. Una transacción puede aportar varias filas o estados si sus comisiones se pagan por separado. El período usa la fecha de creación de la transacción, igual que el resumen.</p>
          <p v-if="loading" role="status" class="py-8 text-center text-slate-600">Cargando registros…</p>
          <div v-else-if="error" role="alert" class="rounded-xl bg-rose-50 p-4 text-rose-800"><p>{{ error }}</p><BaseButton class="mt-5" @click="load">Reintentar</BaseButton></div>
          <template v-else-if="data">
            <template v-if="reconciliation">
              <p class="font-semibold">{{ data.discrepancyCount }} perfiles con diferencias</p>
              <div v-if="data.content.length" class="overflow-x-auto" tabindex="0" aria-label="Diferencias de conciliación">
                <table class="w-full min-w-[650px] text-left text-sm"><thead class="bg-slate-50 text-slate-600"><tr><th class="p-3">Moneyfyer</th><th class="p-3">Saldo del perfil</th><th class="p-3">Registro pendiente</th><th class="p-3">Diferencia</th></tr></thead><tbody class="divide-y divide-slate-100"><tr v-for="row in data.content" :key="row.userId"><td class="p-3"><p>{{ row.userFullname || row.userId }}</p><p class="break-all text-xs text-slate-500">{{ row.userEmail || 'Correo no disponible' }}</p></td><td class="p-3">{{ row.walletMissing ? 'Perfil o billetera no disponible' : formatCurrency(row.walletPendingApproval) }}</td><td class="p-3">{{ formatCurrency(row.ledgerPendingApproval) }}</td><td class="p-3 font-semibold">{{ row.walletMissing ? 'No conciliable' : formatCurrency(row.difference) }}</td></tr></tbody></table>
              </div>
              <p v-else class="rounded-xl bg-moneyfy-50 p-4">No se encontraron diferencias entre los saldos y el registro pendiente.</p>
            </template>
            <template v-else>
              <div class="rounded-xl bg-slate-50 p-4"><p class="text-sm text-slate-600">Total de todos los registros de este estado y período</p><p class="mt-1 text-2xl font-bold">{{ formatCurrency(data.totalAmount) }}</p><p class="mt-2 text-sm">{{ data.totalElements }} comisiones · {{ selection.status }}</p></div>
              <p v-if="difference !== 0" role="status" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">El resumen mostraba {{ formatCurrency(selection.amount) }}. El detalle actualizado suma {{ formatCurrency(data.totalAmount) }}. Los datos cambiaron entre consultas; cierra el detalle y actualiza el resumen.</p>
              <div v-if="data.content.length" class="overflow-x-auto" tabindex="0" aria-label="Registros de comisiones">
                <table class="w-full min-w-[820px] text-left text-sm"><thead class="bg-slate-50 text-slate-600"><tr><th class="p-3">Transacción / cotización</th><th class="p-3">Moneyfyer beneficiario</th><th class="p-3">Creación</th><th class="p-3">Estado</th><th class="p-3">Comisión</th></tr></thead><tbody class="divide-y divide-slate-100"><tr v-for="(row, index) in data.content" :key="`${row.transactionId}-${row.userId}-${index}`"><td class="p-3"><p class="break-all text-xs">{{ row.transactionId }}</p><p class="mt-1 break-all text-xs text-slate-500">{{ row.quoteId || 'Sin cotización' }}</p><p v-if="row.quoteMissing" class="mt-1 text-xs text-amber-800">Cotización no encontrada; comisión conservada</p><p v-else class="mt-1 text-xs text-slate-500">{{ row.quoteStatus || 'Sin estado de cotización' }}</p></td><td class="p-3"><p>{{ row.userFullname || row.userId }}</p><p class="break-all text-xs text-slate-500">{{ row.userEmail || 'Correo no disponible' }}</p></td><td class="whitespace-nowrap p-3">{{ row.createdDate?.slice(0, 10) || 'Fecha no disponible' }}</td><td class="p-3">{{ row.status }}</td><td class="whitespace-nowrap p-3 font-semibold">{{ formatCurrency(row.amount) }}</td></tr></tbody></table>
              </div>
              <p v-else class="rounded-xl bg-slate-50 p-4">No hay comisiones con este estado en el período seleccionado.</p>
              <nav aria-label="Paginación de comisiones" class="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-sm">
                <label class="flex items-center gap-2">Filas por página<select v-model.number="size" class="rounded-lg border border-slate-300 bg-white px-3 py-2" @change="changeSize"><option v-for="option in PAGE_SIZES" :key="option" :value="option">{{ option }}</option></select></label>
                <span aria-live="polite">{{ rangeStart }}–{{ rangeEnd }} de {{ data.totalElements }}</span>
                <div class="flex items-center gap-3"><BaseButton variant="ghost" :disabled="data.page === 0" @click="changePage(data.page - 1)">Anterior</BaseButton><span>Página {{ data.page + 1 }} de {{ Math.max(1, data.totalPages) }}</span><BaseButton variant="ghost" :disabled="data.page + 1 >= data.totalPages" @click="changePage(data.page + 1)">Siguiente</BaseButton></div>
              </nav>
            </template>
          </template>
          <div class="flex justify-end pt-1"><BaseButton @click="close">Cerrar</BaseButton></div>
        </div>
      </template>
    </dialog>
  </Teleport>
</template>

<style scoped>
.ledger-dialog::backdrop { background: rgb(0 0 0 / 60%); }
</style>
