<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import EmptyState from '@/components/molecules/EmptyState.vue'
import { formatCurrency } from '../utils/commission-formatters'

const props = defineProps({ items: { type: Array, required: true } })
const pageSize = ref(10)
const currentPage = ref(1)
const dialog = ref(null)
const selectedId = ref(null)
let previousOverflow = null
const selectedItem = computed(() => props.items.find((item) => item.userId === selectedId.value))
const totalPages = computed(() => Math.max(1, Math.ceil(props.items.length / pageSize.value)))
const firstIndex = computed(() => (currentPage.value - 1) * pageSize.value)
const visibleItems = computed(() => props.items.slice(firstIndex.value, firstIndex.value + pageSize.value))

watch(pageSize, () => { currentPage.value = 1 })
watch(totalPages, (pages) => { currentPage.value = Math.min(currentPage.value, pages) })
watch(selectedItem, (item) => { if (!item && dialog.value?.open) dialog.value.close() })

async function openDetail(item) {
  selectedId.value = item.userId
  await nextTick()
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value.showModal()
}
function closeDetail() { dialog.value?.close() }
function afterClose() {
  selectedId.value = null
  if (previousOverflow !== null) document.body.style.overflow = previousOverflow
  previousOverflow = null
}
onBeforeUnmount(afterClose)
function trapFocus(event) {
  if (event.key !== 'Tab') return
  const controls = [...dialog.value.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')]
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
function accountLabel(item) {
  if (!item.selectedAccount) return 'Sin cuenta expuesta'
  return `${item.selectedAccount.bank || 'Banco no disponible'} · ${item.selectedAccount.accountNumber || 'Sin número'}`
}
function statusClass(status) {
  if (status === 'Listo para nómina') return 'bg-moneyfy-50 text-moneyfy-700'
  if (status === 'Pagado') return 'bg-sky-50 text-sky-700'
  if (status === 'Pendiente de aprobación' || status === 'Falta cuenta bancaria') return 'bg-amber-50 text-amber-800'
  if (status === 'Conflictivo') return 'bg-orange-50 text-orange-700'
  if (status === 'Sin comisiones aprobadas') return 'bg-slate-100 text-slate-600'
  return 'bg-rose-50 text-rose-700'
}
</script>

<template>
  <EmptyState v-if="items.length === 0" icon="ri-user-shared-line" title="No hay registros disponibles" message="No hay información para mostrar en este momento." />
  <div v-else>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[760px] table-fixed text-left text-[12px] leading-4" aria-label="Moneyfyers consolidados">
        <colgroup><col class="w-[23%]" /><col class="w-[30%]" /><col class="w-[30%]" /><col class="w-[17%]" /></colgroup>
        <thead class="bg-slate-50 text-[12px] uppercase text-slate-500">
          <tr><th class="px-3 py-2.5 font-bold">Moneyfyer</th><th class="px-3 py-2.5 font-bold">Contacto</th><th class="px-3 py-2.5 font-bold">Cuenta bancaria</th><th class="px-3 py-2.5 font-bold">Acción</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="item in visibleItems" :key="item.userId" class="bg-white hover:bg-moneyfy-50/45">
            <td class="px-3 py-3 align-top"><p class="break-words font-semibold text-ink">{{ item.nombre }}</p><p class="mt-1 break-all text-[11px] text-slate-500">{{ item.userId }}</p></td>
            <td class="px-3 py-3 align-top"><p class="break-all text-slate-700">{{ item.email || 'No disponible' }}</p><span class="mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" :class="statusClass(item.statusLabel)">{{ item.statusLabel }}</span></td>
            <td class="px-3 py-3 align-top"><p class="break-words text-slate-700">{{ accountLabel(item) }}</p><p class="mt-1 text-[11px] text-slate-500">{{ item.selectedAccount?.holderName || 'Titular no disponible' }}</p></td>
            <td class="px-3 py-3 align-top"><button type="button" class="rounded-full border border-moneyfy-500 px-3 py-2 font-semibold text-moneyfy-700 hover:bg-moneyfy-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moneyfy-500" :aria-label="`Ver detalle de ${item.nombre}`" @click="openDetail(item)">Ver detalle</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <nav aria-label="Paginación de Moneyfyers" class="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
      <label class="flex items-center gap-2">Filas por página
        <select v-model.number="pageSize" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-ink"><option v-for="size in [10, 25, 50, 100]" :key="size" :value="size">{{ size }}</option></select>
      </label>
      <p aria-live="polite">{{ firstIndex + 1 }}–{{ Math.min(firstIndex + pageSize, items.length) }} de {{ items.length }} Moneyfyers</p>
      <div class="flex items-center gap-3">
        <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40" :disabled="currentPage === 1" @click="currentPage--">Anterior</button>
        <span>Página {{ currentPage }} de {{ totalPages }}</span>
        <button type="button" class="rounded-lg border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40" :disabled="currentPage === totalPages" @click="currentPage++">Siguiente</button>
      </div>
    </nav>
  </div>
  <Teleport to="body">
    <dialog ref="dialog" @keydown="trapFocus" aria-labelledby="moneyfyer-detail-title" class="moneyfyer-detail m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl bg-white p-0 text-ink shadow-2xl" @close="afterClose" @click="($event.target === dialog) && closeDetail()">
      <template v-if="selectedItem">
        <header class="flex items-start justify-between gap-4 bg-ink p-6 text-white">
          <div class="min-w-0"><p class="text-xs font-semibold text-moneyfy-400">Detalle de Moneyfyer</p><h2 id="moneyfyer-detail-title" class="mt-1 break-words text-xl font-bold">{{ selectedItem.nombre }}</h2><p class="mt-2 break-all text-sm text-slate-300">{{ selectedItem.email || 'Correo no disponible' }}</p></div>
          <button type="button" autofocus aria-label="Cerrar detalle" class="rounded-full border border-white/30 px-3 py-2 hover:bg-white/10" @click="closeDetail">✕</button>
        </header>
        <div class="p-6">
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div class="rounded-xl bg-slate-50 p-4"><dt class="text-sm text-slate-600">Cotizaciones</dt><dd class="mt-2 text-xl font-bold">{{ selectedItem.quoteCount }}</dd></div>
            <div class="rounded-xl bg-amber-50 p-4"><dt class="text-sm text-slate-600">Pend. pago</dt><dd class="mt-2 text-xl font-bold text-amber-700">{{ formatCurrency(selectedItem.pendingPaymentAmount) }}</dd></div>
            <div class="rounded-xl bg-sky-50 p-4"><dt class="text-sm text-slate-600">Pagado</dt><dd class="mt-2 text-xl font-bold text-sky-700">{{ formatCurrency(selectedItem.paidAmount) }}</dd></div>
            <div class="rounded-xl bg-emerald-50 p-4"><dt class="text-sm text-slate-600">Generado propio</dt><dd class="mt-2 text-xl font-bold text-emerald-700">{{ formatCurrency(selectedItem.ownCommissions) }}</dd></div>
            <div class="rounded-xl bg-violet-50 p-4"><dt class="text-sm text-slate-600">Generado por referidos</dt><dd class="mt-2 text-xl font-bold text-violet-700">{{ formatCurrency(selectedItem.referredCommissions) }}</dd></div>
            <div class="rounded-xl bg-moneyfy-50 p-4"><dt class="text-sm text-slate-600">Total generado</dt><dd class="mt-2 text-xl font-bold text-moneyfy-700">{{ formatCurrency(selectedItem.totalGeneratedAmount) }}</dd></div>
          </dl>
          <p class="mt-5 text-sm leading-6 text-slate-600">Pend. pago incluye comisiones con estado Aprobado o Conflictivo. Los importes generados incluyen esas comisiones y las pagadas; excluyen las pendientes de aprobación. Cotizaciones cuenta las comisiones recibidas, incluidas las originadas por referidos.</p>
          <div class="mt-6 border-t border-slate-100 pt-4"><p class="break-words text-sm text-slate-700">{{ accountLabel(selectedItem) }}</p><p class="mt-1 text-sm text-slate-500">{{ selectedItem.selectedAccount?.holderName || 'Titular no disponible' }}</p></div>
          <div class="mt-6 flex justify-end"><button type="button" class="btn-primary" @click="closeDetail">Cerrar</button></div>
        </div>
      </template>
    </dialog>
  </Teleport>
</template>

<style scoped>
.moneyfyer-detail::backdrop { background: rgb(0 0 0 / 60%); }
</style>
