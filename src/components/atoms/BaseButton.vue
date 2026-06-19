<script setup>
defineProps({
  type: {
    type: String,
    default: 'button',
  },
  variant: {
    type: String,
    default: 'primary',
  },
  loading: Boolean,
  disabled: Boolean,
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      variant === 'primary' && 'btn-primary',
      variant === 'dark' && 'btn-dark',
      variant === 'ghost' && 'btn-ghost',
    ]"
  >
    <i v-if="loading" class="ri-loader-4-line animate-spin text-lg" aria-hidden="true"></i>
    <slot v-else name="icon"></slot>
    <slot />
  </button>
</template>
