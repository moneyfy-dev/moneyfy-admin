<script setup>
defineProps({
  icon: {
    type: String,
    default: 'ri-inbox-2-line',
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
    <span class="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
      <i :class="[icon, 'text-2xl']"></i>
    </span>
    <h3 class="mt-4 font-bold text-ink">{{ title }}</h3>
    <p class="mt-2 max-w-md text-xs leading-6 text-slate-500">{{ message }}</p>
    <slot />
  </div>
</template>
