<script setup>
defineProps({
  icon: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
  eyebrow: {
    type: String,
    required: true,
  },
  tone: {
    type: String,
    default: 'green',
  },
})
</script>

<template>
  <article class="admin-card p-5">
    <div class="flex items-center justify-between">
      <span
        :class="[
          'rounded-full p-3',
          tone === 'amber'
            ? 'bg-amber-50 text-amber-600'
            : 'bg-moneyfy-50 text-moneyfy-700',
        ]"
      >
        <i :class="[icon, 'text-xl']"></i>
      </span>
      <span class="text-xs font-semibold uppercase text-slate-400">{{ eyebrow }}</span>
    </div>
    <p class="mt-5 text-xs text-slate-500">{{ label }}</p>
    <p class="mt-1 text-3xl font-bold">{{ value }}</p>
  </article>
</template>
