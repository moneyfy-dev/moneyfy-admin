<script setup>
import { computed, onMounted } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import EmptyState from '@/components/molecules/EmptyState.vue'
import MetricCard from '@/components/molecules/MetricCard.vue'
import BarMetricChart from '../components/BarMetricChart.vue'
import LineMetricChart from '../components/LineMetricChart.vue'
import { useDashboardStore } from '../store/dashboard.store'
import { formatCurrency } from '@/features/commissions/utils/commission-formatters'

const dashboardStore = useDashboardStore()

const compactCurrency = (value) =>
  new Intl.NumberFormat('es-CL', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value)

const metrics = computed(() => {
  if (!dashboardStore.summary) return []

  return [
    {
      icon: 'ri-user-star-line',
      label: 'Usuarios activos',
      value: String(dashboardStore.summary.activeUsers),
      eyebrow: 'Activo',
    },
    {
      icon: 'ri-checkbox-circle-line',
      label: 'Comisiones pagadas',
      value: formatCurrency(dashboardStore.summary.paidCommissions),
      eyebrow: 'Pagado',
    },
    {
      icon: 'ri-time-line',
      label: 'Comisiones por pagar',
      value: formatCurrency(dashboardStore.summary.pendingCommissions),
      eyebrow: 'Pendiente',
      tone: 'amber',
    },
  ]
})

onMounted(() => {
  if (!dashboardStore.summary) {
    dashboardStore.fetchSummary()
  }
})
</script>

<template>
  <div class="space-y-6 p-5 lg:p-8">
    <div v-if="dashboardStore.loading" class="grid gap-4 md:grid-cols-3">
      <div v-for="index in 3" :key="index" class="admin-card h-40 animate-pulse bg-slate-100"></div>
    </div>

    <EmptyState
      v-else-if="dashboardStore.error"
      icon="ri-error-warning-line"
      title="Dashboard no disponible"
      :message="dashboardStore.error"
      class="admin-card"
    >
      <BaseButton class="mt-5" @click="dashboardStore.fetchSummary()">Reintentar</BaseButton>
    </EmptyState>

    <template v-else-if="dashboardStore.summary">
      <section class="grid gap-4 md:grid-cols-3">
        <MetricCard v-for="metric in metrics" :key="metric.label" v-bind="metric" />
      </section>

      <section class="grid gap-4 xl:grid-cols-3">
        <LineMetricChart
          title="Comisiones generadas"
          subtitle="Ultimos 7 dias"
          :data="dashboardStore.summary.weeklyMetrics"
          value-key="commissions"
          :formatter="compactCurrency"
        />
        <LineMetricChart
          title="Seguros vendidos"
          subtitle="Ultimos 7 dias"
          :data="dashboardStore.summary.weeklyMetrics"
          value-key="sales"
          :formatter="(value) => String(Math.round(value))"
        />
        <BarMetricChart
          title="Usuarios con actividad"
          subtitle="Ultimos 7 dias"
          :data="dashboardStore.summary.weeklyMetrics"
          value-key="users"
        />
      </section>
    </template>
  </div>
</template>
