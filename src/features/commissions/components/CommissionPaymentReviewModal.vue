<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import { formatCurrency } from '../utils/commission-formatters'

const props = defineProps({
  preview: {
    type: Object,
    required: true,
  },
  loading: Boolean,
})

const emit = defineEmits(['close', 'confirm'])

const preparedPreview = computed(() => props.preview.prepared.slice(0, 8))
const conflictsPreview = computed(() => (props.preview.conflicts || []).slice(0, 8))
const rejectedPreview = computed(() => props.preview.rejected.slice(0, 8))
const submittableRows = computed(() => [
  ...props.preview.prepared,
  ...(props.preview.conflicts || []),
])
const submittableCount = computed(() => submittableRows.value.length)
const payableAmount = computed(() =>
  props.preview.prepared.reduce((sum, item) => sum + Number(item.totalComision || 0), 0),
)

function closeOnEscape(event) {
  if (event.key === 'Escape' && !props.loading) emit('close')
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', closeOnEscape)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', closeOnEscape)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      @mousedown.self="!loading && $emit('close')"
    >
      <section
        class="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-y-auto rounded-[8px] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="commission-payment-review-title"
      >
        <header class="flex items-start justify-between gap-4 bg-ink px-5 py-5 text-white sm:px-7">
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-white/10 text-2xl text-moneyfy-500"
            >
              <i class="ri-bank-card-line" aria-hidden="true"></i>
            </span>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase text-moneyfy-500">Revision previa</p>
              <h2 id="commission-payment-review-title" class="truncate text-lg font-bold">
                Confirmar procesamiento de pagos
              </h2>
            </div>
          </div>

          <button
            class="flex size-10 shrink-0 items-center justify-center rounded-full text-xl text-white/70 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-50"
            type="button"
            aria-label="Cerrar revision"
            :disabled="loading"
            @click="$emit('close')"
          >
            <i class="ri-close-line" aria-hidden="true"></i>
          </button>
        </header>

        <div class="space-y-6 p-5 sm:p-7">
          <div class="grid gap-3 sm:grid-cols-4">
            <div class="rounded-[8px] border border-slate-200 p-4">
              <p class="text-xs font-semibold uppercase text-slate-500">Filas procesadas</p>
              <p class="mt-2 text-2xl font-bold text-ink">{{ preview.totalVisible }}</p>
            </div>
            <div class="rounded-[8px] border border-moneyfy-100 bg-moneyfy-50 p-4">
              <p class="text-xs font-semibold uppercase text-moneyfy-700">Listas para enviar</p>
              <p class="mt-2 text-2xl font-bold text-ink">{{ submittableCount }}</p>
            </div>
            <div class="rounded-[8px] border border-slate-200 p-4">
              <p class="text-xs font-semibold uppercase text-slate-500">Monto a pagar</p>
              <p class="mt-2 text-2xl font-bold text-ink">{{ formatCurrency(payableAmount) }}</p>
            </div>
            <div class="rounded-[8px] border border-amber-100 bg-amber-50 p-4">
              <p class="text-xs font-semibold uppercase text-amber-700">Conflictivos</p>
              <p class="mt-2 text-2xl font-bold text-ink">{{ (preview.conflicts || []).length }}</p>
            </div>
            <div class="rounded-[8px] border border-amber-100 bg-amber-50 p-4">
              <p class="text-xs font-semibold uppercase text-amber-700">Filas rechazadas</p>
              <p class="mt-2 text-2xl font-bold text-ink">{{ preview.rejected.length }}</p>
            </div>
          </div>

          <div class="rounded-[8px] border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Revisa los pagos listos para procesar y los casos conflictivos antes de confirmar la nomina.
          </div>

          <div v-if="preview.prepared.length > 0" class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-bold text-ink">Pagos que se enviaran</h3>
              <p class="text-xs text-slate-500">
                Mostrando {{ preparedPreview.length }} de {{ preview.prepared.length }}
              </p>
            </div>
            <div class="overflow-hidden rounded-[8px] border border-slate-200">
              <table class="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead class="bg-slate-50 text-slate-500">
                  <tr>
                    <th class="px-3 py-2 font-semibold">Usuario</th>
                    <th class="px-3 py-2 font-semibold">Email</th>
                    <th class="px-3 py-2 font-semibold">Cuenta</th>
                    <th class="px-3 py-2 font-semibold">Transacciones</th>
                    <th class="px-3 py-2 font-semibold">Monto</th>
                    <th class="px-3 py-2 font-semibold">Voucher</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="row in preparedPreview" :key="`${row.userId}-${row.voucher}`">
                    <td class="px-3 py-2 font-medium text-ink">{{ row.nombre }}</td>
                    <td class="px-3 py-2 text-slate-700">{{ row.email || 'No disponible' }}</td>
                    <td class="px-3 py-2 text-slate-700">{{ row.accountStatus }}</td>
                    <td class="px-3 py-2 text-slate-700">{{ row.transactionCount }}</td>
                    <td class="px-3 py-2 font-semibold text-ink">{{ formatCurrency(row.totalComision) }}</td>
                    <td class="px-3 py-2 text-slate-700">{{ row.voucher }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="(preview.conflicts || []).length > 0" class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-bold text-ink">Filas conflictivas</h3>
              <p class="text-xs text-slate-500">
                Mostrando {{ conflictsPreview.length }} de {{ (preview.conflicts || []).length }}
              </p>
            </div>
            <div class="overflow-hidden rounded-[8px] border border-amber-100 bg-amber-50">
              <table class="min-w-full divide-y divide-amber-100 text-left text-xs">
                <thead class="bg-amber-100/70 text-amber-900">
                  <tr>
                    <th class="px-3 py-2 font-semibold">Usuario</th>
                    <th class="px-3 py-2 font-semibold">Email</th>
                    <th class="px-3 py-2 font-semibold">Monto</th>
                    <th class="px-3 py-2 font-semibold">Nota</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-amber-100/80">
                  <tr v-for="row in conflictsPreview" :key="`${row.userId}-${row.note}`">
                    <td class="px-3 py-2 font-medium text-amber-900">{{ row.nombre }}</td>
                    <td class="px-3 py-2 text-amber-900">{{ row.email || 'No disponible' }}</td>
                    <td class="px-3 py-2 font-semibold text-amber-900">{{ formatCurrency(row.totalComision) }}</td>
                    <td class="px-3 py-2 text-amber-900">{{ row.note }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="preview.rejected.length > 0" class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-bold text-ink">Cotizaciones rechazadas</h3>
              <p class="text-xs text-slate-500">
                Mostrando {{ rejectedPreview.length }} de {{ preview.rejected.length }}
              </p>
            </div>
            <div class="overflow-hidden rounded-[8px] border border-red-100 bg-red-50">
              <table class="min-w-full divide-y divide-red-100 text-left text-xs">
                <thead class="bg-red-100/70 text-red-700">
                  <tr>
                    <th class="px-3 py-2 font-semibold">Referencia</th>
                    <th class="px-3 py-2 font-semibold">Motivo</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-red-100/80">
                  <tr v-for="row in rejectedPreview" :key="`${row.idCotizacion}-${row.reason}`">
                    <td class="px-3 py-2 font-medium text-red-700">
                      {{ row.idCotizacion || (row.rowNumber ? `Fila ${row.rowNumber}` : row.reference || 'N/A') }}
                    </td>
                    <td class="px-3 py-2 text-red-700">{{ row.reason }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <BaseButton variant="ghost" :disabled="loading" @click="$emit('close')">
              Cancelar
            </BaseButton>
            <BaseButton
              variant="dark"
              :loading="loading"
              :disabled="submittableCount === 0"
              @click="$emit('confirm')"
            >
              Confirmar pagos
            </BaseButton>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
