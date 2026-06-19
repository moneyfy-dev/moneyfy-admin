<script setup>
import { computed } from 'vue'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
)

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: 'Últimos 12 meses' },
  data: { type: Array, required: true },
  valueKey: { type: String, required: true },
  formatter: { type: Function, required: true },
})

const chartData = computed(() => ({
  labels: props.data.map((item) => item.label ?? item.month ?? ''),
  datasets: [
    {
      label: props.title,
      data: props.data.map((item) => item[props.valueKey]),
      borderColor: '#00c70f',
      backgroundColor: 'rgba(0, 199, 15, 0.14)',
      borderWidth: 3,
      fill: true,
      pointBackgroundColor: '#111111',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.35,
    },
  ],
}))

const chartOptions = computed(() => ({
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
      callbacks: {
        label: (context) => props.formatter(context.parsed.y),
      },
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
        callback: (value) => props.formatter(value),
      },
    },
  },
}))
</script>

<template>
  <article class="admin-card p-5">
    <h3 class="font-bold">{{ title }}</h3>
    <p class="text-xs text-slate-500">{{ subtitle }}</p>
    <div class="mt-5 h-64">
      <Line :data="chartData" :options="chartOptions" :aria-label="title" />
    </div>
  </article>
</template>
