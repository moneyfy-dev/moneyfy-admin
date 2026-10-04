<script setup>
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import EmptyState from '@/components/molecules/EmptyState.vue'
import MetricCard from '@/components/molecules/MetricCard.vue'
import BarMetricChart from '../components/BarMetricChart.vue'
import LineMetricChart from '../components/LineMetricChart.vue'
import { useDashboardStore } from '../store/dashboard.store'
import { formatCurrency } from '@/features/commissions/utils/commission-formatters'
import CommissionLedgerDialog from '../components/CommissionLedgerDialog.vue'
import { dashboardMetrics, periodParams, periodLabel } from '../api/dashboard-contract'

const dashboardStore = useDashboardStore()
const dateFrom = ref(dashboardStore.period.dateFrom || '')
const dateTo = ref(dashboardStore.period.dateTo || '')
const periodError = ref('')
const selection = ref(null)
async function applyPeriod(allHistory = false) {
  try {
    periodError.value = ''
    if (allHistory) { dateFrom.value = ''; dateTo.value = '' }
    const period = periodParams({ dateFrom: dateFrom.value, dateTo: dateTo.value })
    selection.value = null
    await dashboardStore.fetchSummary(period)
  } catch (error) { periodError.value = error.message }
}
function openDetail(metric) { selection.value = { ...metric, period: { ...dashboardStore.period } } }

const compactCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value)

const metrics = computed(() => {
  if (!dashboardStore.summary) return []

  return dashboardMetrics(dashboardStore.summary).map(metric => ({ ...metric, value: metric.status ? formatCurrency(metric.amount) : String(metric.amount) }))
})

onMounted(() => {
  if (!dashboardStore.summary) {
    dashboardStore.fetchSummary()
  }
})
</script>

<template>
  <div class="space-y-6 p-5 lg:p-8">
    <section class="admin-card p-5" aria-label="Período de comisiones">
      <h2 class="font-bold">Período de comisiones</h2>
      <p class="mt-1 text-sm text-slate-600">{{ periodLabel(dashboardStore.period) }} · según fecha de creación de la transacción. Usuarios activos refleja el estado actual.</p>
      <form class="mt-4 flex flex-wrap items-end gap-4" @submit.prevent="applyPeriod()">
        <label class="flex flex-col gap-2 text-sm">Desde<input v-model="dateFrom" type="date" :max="dateTo || undefined" class="rounded-lg border border-slate-300 px-3 py-2" /></label>
        <label class="flex flex-col gap-2 text-sm">Hasta<input v-model="dateTo" type="date" :min="dateFrom || undefined" class="rounded-lg border border-slate-300 px-3 py-2" /></label>
        <BaseButton type="submit" :disabled="dashboardStore.loading">Aplicar período</BaseButton>
        <BaseButton variant="ghost" :disabled="dashboardStore.loading" @click="applyPeriod(true)">Todo el historial</BaseButton>
        <BaseButton variant="ghost" :disabled="dashboardStore.loading" @click="dashboardStore.fetchSummary()">Actualizar resumen</BaseButton>
      </form>
      <p v-if="periodError" role="alert" class="mt-4 text-sm text-rose-700">{{ periodError }}</p>
    </section>
    <div v-if="dashboardStore.loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-5" role="status" aria-label="Cargando dashboard">
      <div v-for="index in 5" :key="index" class="admin-card h-40 animate-pulse bg-slate-100"></div>
    </div>

    <EmptyState
      v-else-if="dashboardStore.error"
      icon="ri-error-warning-line"
      title="Dashboard no disponible"
      :message="dashboardStore.error"
      class="admin-card"
    >
      <BaseButton class="mt-5" @click="applyPeriod()">Reintentar</BaseButton>
    </EmptyState>

    <template v-else-if="dashboardStore.summary">
      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard v-for="metric in metrics" :key="metric.label" v-bind="metric"><BaseButton v-if="metric.status" variant="ghost" :aria-label="`Ver detalle de ${metric.label.toLowerCase()}`" @click="openDetail(metric)">Ver detalle</BaseButton></MetricCard>
      </section>
      <section class="admin-card flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 class="font-bold">Conciliación de saldos pendientes</h2><p class="mt-1 text-sm text-slate-600">Consulta diferencias del historial completo entre perfiles y comisiones pendientes. No modifica saldos.</p></div><BaseButton variant="ghost" @click="selection = { reconciliation: true }">Ver conciliación</BaseButton></section>

      <p class="text-sm text-slate-600">El período seleccionado aplica a los importes de las tarjetas y sus detalles. Los gráficos muestran siempre los últimos 7 días.</p>
      <section class="grid gap-4 xl:grid-cols-3">
        <LineMetricChart
          title="Comisiones generadas"
          subtitle="Últimos 7 días"
          :data="dashboardStore.summary.weeklyMetrics"
          value-key="commissions"
          :formatter="compactCurrency"
        />
        <LineMetricChart
          title="Seguros vendidos"
          subtitle="Últimos 7 días"
          :data="dashboardStore.summary.weeklyMetrics"
          value-key="sales"
          :formatter="(value) => String(Math.round(value))"
        />
        <BarMetricChart
          title="Usuarios con actividad"
          subtitle="Últimos 7 días"
          :data="dashboardStore.summary.weeklyMetrics"
          value-key="users"
        />
      </section>
    </template>
    <CommissionLedgerDialog :selection="selection" @close="selection = null" />
  </div>
</template>
