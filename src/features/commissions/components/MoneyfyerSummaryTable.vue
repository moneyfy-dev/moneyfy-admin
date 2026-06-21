<script setup>
import EmptyState from '@/components/molecules/EmptyState.vue'
import { formatCurrency } from '../utils/commission-formatters'

defineProps({
  items: { type: Array, required: true },
})

function accountLabel(item) {
  if (!item.selectedAccount) {
    return 'Sin cuenta expuesta'
  }

  const bank = item.selectedAccount.bank || 'Banco no disponible'
  const accountNumber = item.selectedAccount.accountNumber || 'Sin número'
  return `${bank} · ${accountNumber}`
}

function statusClass(statusLabel) {
  if (statusLabel === 'Listo para nómina') {
    return 'bg-moneyfy-50 text-moneyfy-700'
  }

  if (statusLabel === 'Pagado') {
    return 'bg-sky-50 text-sky-700'
  }

  if (statusLabel === 'Pendiente de aprobación') {
    return 'bg-amber-50 text-amber-800'
  }

  if (statusLabel === 'Conflictivo') {
    return 'bg-orange-50 text-orange-700'
  }

  if (statusLabel === 'Falta cuenta bancaria') {
    return 'bg-amber-50 text-amber-800'
  }

  if (statusLabel === 'Sin comisiones aprobadas') {
    return 'bg-slate-100 text-slate-600'
  }

  return 'bg-rose-50 text-rose-700'
}
</script>

<template>
  <EmptyState
    v-if="items.length === 0"
    icon="ri-user-shared-line"
    title="No hay registros disponibles"
    message="No hay información para mostrar en este momento."
  />

  <div v-else class="overflow-x-auto">
    <table class="w-full min-w-[1120px] table-fixed text-left text-[12px] leading-4">
      <colgroup>
        <col class="w-[18%]" />
        <col class="w-[18%]" />
        <col class="w-[20%]" />
        <col class="w-[10%]" />
        <col class="w-[11%]" />
        <col class="w-[11%]" />
        <col class="w-[12%]" />
      </colgroup>
      <thead class="bg-slate-50 text-[12px] uppercase text-slate-500">
        <tr>
          <th class="px-3 py-2.5 font-bold">Moneyfyer</th>
          <th class="px-3 py-2.5 font-bold">Contacto</th>
          <th class="px-3 py-2.5 font-bold">Cuenta bancaria</th>
          <th class="px-3 py-2.5 font-bold">Cotizaciones</th>
          <th class="px-3 py-2.5 font-bold">Pend. pago</th>
          <th class="px-3 py-2.5 font-bold">Pagado</th>
          <th class="px-3 py-2.5 font-bold">Total generado</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="item in items" :key="item.userId" class="bg-white hover:bg-moneyfy-50/45">
          <td class="px-3 py-3 align-top">
            <p class="truncate font-semibold text-ink">{{ item.nombre }}</p>
            <p class="mt-1 text-[11px] text-slate-500">{{ item.userId }}</p>
          </td>
          <td class="px-3 py-3 align-top">
            <p class="truncate text-slate-700">{{ item.email || 'No disponible' }}</p>
            <span
              class="mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
              :class="statusClass(item.statusLabel)"
            >
              {{ item.statusLabel }}
            </span>
          </td>
          <td class="px-3 py-3 align-top">
            <p class="truncate text-slate-700">{{ accountLabel(item) }}</p>
            <p class="mt-1 text-[11px] text-slate-500">
              {{ item.selectedAccount?.holderName || 'Titular no disponible' }}
            </p>
          </td>
          <td class="px-3 py-3 align-top font-semibold text-ink">{{ item.quoteCount }}</td>
          <td class="px-3 py-3 align-top font-semibold text-amber-700">
            {{ formatCurrency(item.pendingPaymentAmount) }}
          </td>
          <td class="px-3 py-3 align-top font-semibold text-sky-700">
            {{ formatCurrency(item.paidAmount) }}
          </td>
          <td class="px-3 py-3 align-top font-semibold text-moneyfy-700">
            {{ formatCurrency(item.totalGeneratedAmount) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
