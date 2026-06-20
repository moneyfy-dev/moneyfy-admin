<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true,
  },
})

const badgeClass = computed(() => {
  if (props.status === 'Pagado') return 'bg-moneyfy-50 text-moneyfy-700'
  if (props.status === 'Pendiente de pago') return 'bg-amber-50 text-amber-700'
  if (props.status === 'Pendiente de aprobación') return 'bg-blue-50 text-blue-700'
  if (props.status === 'Conflictivo') return 'bg-orange-50 text-orange-700'
  if (props.status === 'Rechazado') return 'bg-red-50 text-red-700'
  if (props.status === 'Caducado') return 'bg-slate-200 text-slate-700'
  return 'bg-slate-100 text-slate-600'
})
</script>

<template>
  <span :class="['inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold', badgeClass]">
    {{ status }}
  </span>
</template>
