<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  tone: {
    type: String,
    default: 'light',
  },
  disabled: Boolean,
})

defineEmits(['click'])

const cardClass = computed(() => {
  if (props.tone === 'dark') {
    return 'border-ink bg-ink text-white focus:ring-slate-300 hover:-translate-y-0.5 hover:shadow-soft'
  }

  if (props.tone === 'green') {
    return 'border-moneyfy-600 bg-moneyfy-600 text-white focus:ring-moneyfy-200 hover:-translate-y-0.5 hover:bg-moneyfy-700 hover:shadow-soft'
  }

  return 'border-moneyfy-600 bg-white text-ink focus:ring-moneyfy-100 hover:-translate-y-0.5 hover:shadow-soft'
})

const iconClass = computed(() => {
  if (props.tone === 'dark') {
    return 'bg-moneyfy-700/25 text-moneyfy-500'
  }

  if (props.tone === 'green') {
    return 'bg-white/15 text-white'
  }

  return 'bg-moneyfy-50 text-moneyfy-600'
})

const descriptionClass = computed(() => {
  if (props.tone === 'light') {
    return 'text-slate-500'
  }

  return 'text-white/78'
})
</script>

<template>
  <button
    class="group flex min-h-[196px] w-full flex-col rounded-[18px] border p-6 text-left transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
    :class="cardClass"
    :disabled="disabled"
    type="button"
    @click="$emit('click')"
  >
    <span
      class="mb-8 flex size-[58px] items-center justify-center rounded-[12px] text-[28px] transition"
      :class="iconClass"
      aria-hidden="true"
    >
      <i :class="icon"></i>
    </span>

    <div class="space-y-1">
      <p class="text-[15px] font-bold leading-5">{{ title }}</p>
      <p class="text-[13px] leading-5" :class="descriptionClass">
        {{ description }}
      </p>
    </div>
  </button>
</template>
