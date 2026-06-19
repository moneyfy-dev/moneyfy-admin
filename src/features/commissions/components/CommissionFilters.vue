<script setup>
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseInput from '@/components/atoms/BaseInput.vue'
import { STATUS_FILTERS } from '../constants'

defineProps({
  status: { type: String, required: true },
  search: { type: String, required: true },
  dateFrom: { type: String, required: true },
  dateTo: { type: String, required: true },
})

defineEmits([
  'update:status',
  'update:search',
  'update:dateFrom',
  'update:dateTo',
  'reset-date-range',
])
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2 rounded-[8px] border border-slate-200 bg-slate-50 p-2">
      <button
        :class="[
          'rounded-full px-4 py-2 text-xs font-semibold',
          status === 'all' ? 'bg-ink text-white' : 'text-slate-600',
        ]"
        type="button"
        @click="$emit('update:status', 'all')"
      >
        Todas
      </button>
      <button
        v-for="item in STATUS_FILTERS"
        :key="item"
        :class="[
          'rounded-full px-4 py-2 text-xs font-semibold',
          status === item ? 'bg-moneyfy-600 text-white' : 'text-slate-600',
        ]"
        type="button"
        @click="$emit('update:status', item)"
      >
        {{ item }}
      </button>
    </div>

    <div class="grid gap-3 xl:grid-cols-[1fr_auto]">
      <BaseInput
        :model-value="search"
        icon="ri-search-line"
        placeholder="Buscar nombre, patente, cotización, compañía o plan"
        aria-label="Buscar comisiones"
        @update:model-value="$emit('update:search', $event)"
      />

      <div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto] xl:w-[520px]">
        <BaseInput
          :model-value="dateFrom"
          type="date"
          aria-label="Fecha desde"
          @update:model-value="$emit('update:dateFrom', $event)"
        />
        <BaseInput
          :model-value="dateTo"
          type="date"
          aria-label="Fecha hasta"
          @update:model-value="$emit('update:dateTo', $event)"
        />
        <BaseButton variant="ghost" class="whitespace-nowrap" @click="$emit('reset-date-range')">
          <template #icon><i class="ri-calendar-check-line text-lg text-moneyfy-600"></i></template>
          2 meses
        </BaseButton>
      </div>
    </div>
  </div>
</template>
