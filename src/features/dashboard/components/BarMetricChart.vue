<script setup>
import { computed } from 'vue'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import { Bar } from 'vue-chartjs'

ChartJS.register(BarElement, CategoryScale, Legend, LinearScale, Title, Tooltip)

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: 'Últimos 12 meses' },
  data: { type: Array, required: true },
  valueKey: { type: String, required: true },
})

const chartData = computed(() => ({
  labels: props.data.map((item) => item.label ?? item.month ?? ''),
  datasets: [
    {
      label: props.title,
      data: props.data.map((item) => item[props.valueKey]),
      backgroundColor: '#00c70f',
      hoverBackgroundColor: '#00a90d',
      borderRadius: 4,
      borderSkipped: false,
      maxBarThickness: 28,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index',
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111111',
      padding: 12,
      displayColors: false,
    },
  },
  scales: {
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: {
        color: '#64748b',
        font: { family: 'Poppins', size: 10 },
        maxRotation: 0,
      },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: '#edf2ef' },
      ticks: {
        color: '#64748b',
        font: { family: 'Poppins', size: 10 },
        precision: 0,
      },
    },
  },
}
</script>

<template>
  <article class="admin-card p-5">
    <h3 class="font-bold">{{ title }}</h3>
    <p class="text-xs text-slate-500">{{ subtitle }}</p>
    <div class="mt-5 h-64">
      <Bar :data="chartData" :options="chartOptions" :aria-label="title" />
    </div>
  </article>
</template>
