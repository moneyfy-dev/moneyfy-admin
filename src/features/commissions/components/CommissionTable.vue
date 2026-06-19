<script setup>
import { ref } from 'vue'
import StatusBadge from '@/components/atoms/StatusBadge.vue'
import EmptyState from '@/components/molecules/EmptyState.vue'
import CommissionDetailModal from './CommissionDetailModal.vue'
import { COMMISSION_TABLE_COLUMNS } from '../constants'
import { formatDate } from '../utils/commission-formatters'

defineProps({
  items: { type: Array, required: true },
  sortKey: { type: String, required: true },
  sortDirection: { type: String, required: true },
})

defineEmits(['sort'])

const selectedItem = ref(null)
</script>

<template>
  <EmptyState
    v-if="items.length === 0"
    icon="ri-filter-off-line"
    title="No hay resultados"
    message="Ajusta los filtros o el rango de fechas para encontrar comisiones."
  />

  <div v-else class="overflow-x-auto">
    <table class="w-full min-w-[860px] table-fixed text-left text-[12px] leading-4">
      <colgroup>
        <col class="w-[17%]" />
        <col class="w-[20%]" />
        <col class="w-[13%]" />
        <col class="w-[15%]" />
        <col class="w-[20%]" />
        <col class="w-[15%]" />
      </colgroup>
      <thead class="bg-slate-50 text-[12px] uppercase text-slate-500">
        <tr>
          <th
            v-for="column in COMMISSION_TABLE_COLUMNS"
            :key="column[0]"
            class="whitespace-nowrap px-3 py-2.5"
          >
            <button
              class="inline-flex items-center gap-1 font-bold"
              type="button"
              @click="$emit('sort', column[0])"
            >
              {{ column[1] }}
              <i
                :class="[
                  sortKey === column[0]
                    ? sortDirection === 'asc'
                      ? 'ri-sort-asc'
                      : 'ri-sort-desc'
                    : 'ri-arrow-up-down-line',
                  'text-slate-400',
                ]"
              ></i>
            </button>
          </th>
          <th class="w-32 px-3 py-2.5 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="item in items" :key="item.idCotizacion" class="bg-white hover:bg-moneyfy-50/45">
          <td class="truncate px-3 py-2.5 font-semibold text-ink">
            {{ item.idCotizacion }}
          </td>
          <td class="truncate px-3 py-2.5 font-semibold text-ink">{{ item.nombre }}</td>
          <td class="truncate px-3 py-2.5">{{ item.compania || 'No disponible' }}</td>
          <td class="whitespace-nowrap px-3 py-2.5">{{ formatDate(item.fecha) }}</td>
          <td class="whitespace-nowrap px-3 py-2.5"><StatusBadge :status="item.estado" /></td>
          <td class="px-3 py-2.5 text-right">
            <button
              class="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 px-3 text-[12px] font-semibold text-slate-700 transition hover:border-moneyfy-600 hover:text-moneyfy-700"
              type="button"
              :aria-label="`Ver detalle de ${item.idCotizacion}`"
              @click="selectedItem = item"
            >
              <i class="ri-eye-line text-base text-moneyfy-600" aria-hidden="true"></i>
              Ver detalle
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <CommissionDetailModal
    v-if="selectedItem"
    :item="selectedItem"
    @close="selectedItem = null"
  />
</template>
