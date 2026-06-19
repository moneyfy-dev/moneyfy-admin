<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import StatusBadge from '@/components/atoms/StatusBadge.vue'
import { formatCurrency, formatDate } from '../utils/commission-formatters'

defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])

function closeOnEscape(event) {
  if (event.key === 'Escape') emit('close')
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
      @mousedown.self="$emit('close')"
    >
      <section
        class="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[8px] bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="commission-detail-title"
      >
        <header class="flex items-start justify-between gap-4 bg-ink px-5 py-5 text-white sm:px-7">
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-white/10 text-2xl text-moneyfy-500"
            >
              <i class="ri-file-list-3-line" aria-hidden="true"></i>
            </span>
            <div class="min-w-0">
              <p class="text-xs font-semibold uppercase text-moneyfy-500">Detalle de comisión</p>
              <h2 id="commission-detail-title" class="truncate text-lg font-bold">
                {{ item.idCotizacion }}
              </h2>
            </div>
          </div>

          <button
            class="flex size-10 shrink-0 items-center justify-center rounded-full text-xl text-white/70 transition hover:bg-white/10 hover:text-white"
            type="button"
            aria-label="Cerrar detalle"
            @click="$emit('close')"
          >
            <i class="ri-close-line" aria-hidden="true"></i>
          </button>
        </header>

        <div class="space-y-6 p-5 sm:p-7">
          <div class="rounded-[8px] border border-moneyfy-100 bg-moneyfy-50 p-5">
            <div class="flex items-center gap-2 text-xs font-bold uppercase text-moneyfy-700">
              <i class="ri-money-dollar-circle-line text-lg" aria-hidden="true"></i>
              Comisión total
            </div>
            <p class="mt-2 text-3xl font-bold text-ink sm:text-4xl">
              {{ formatCurrency(item.totalComision) }}
            </p>
            <div class="mt-4">
              <StatusBadge :status="item.estado" />
            </div>
          </div>

          <dl class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-[8px] border border-slate-200 p-4">
              <dt class="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <i class="ri-user-3-line text-base text-moneyfy-600" aria-hidden="true"></i>
                Cliente
              </dt>
              <dd class="mt-2 font-semibold text-ink">{{ item.nombre }}</dd>
            </div>

            <div class="rounded-[8px] border border-slate-200 p-4">
              <dt class="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <i class="ri-car-line text-base text-moneyfy-600" aria-hidden="true"></i>
                Patente
              </dt>
              <dd class="mt-2 font-semibold text-ink">{{ item.patente }}</dd>
            </div>

            <div class="rounded-[8px] border border-slate-200 p-4">
              <dt class="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <i class="ri-shield-check-line text-base text-moneyfy-600" aria-hidden="true"></i>
                Compañía
              </dt>
              <dd class="mt-2 font-semibold text-ink">{{ item.compania || 'No disponible' }}</dd>
            </div>

            <div class="rounded-[8px] border border-slate-200 p-4">
              <dt class="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <i class="ri-calendar-line text-base text-moneyfy-600" aria-hidden="true"></i>
                Fecha
              </dt>
              <dd class="mt-2 font-semibold text-ink">{{ formatDate(item.fecha) }}</dd>
            </div>
          </dl>

          <div class="rounded-[8px] border border-slate-200 p-4">
            <p class="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <i class="ri-file-shield-2-line text-base text-moneyfy-600" aria-hidden="true"></i>
              Plan contratado
            </p>
            <p class="mt-2 font-semibold text-ink">{{ item.nombrePlan || 'No disponible' }}</p>
          </div>

          <div class="flex justify-end border-t border-slate-100 pt-5">
            <button class="btn-dark" type="button" @click="$emit('close')">
              <i class="ri-check-line text-lg text-moneyfy-500" aria-hidden="true"></i>
              Cerrar
            </button>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
