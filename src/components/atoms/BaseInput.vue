<script setup>
defineOptions({ inheritAttrs: false })

defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  error: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-2 block text-xs font-semibold text-slate-700">
      {{ label }}
    </span>
    <span class="relative block">
      <i
        v-if="icon"
        :class="[icon, 'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400']"
        aria-hidden="true"
      ></i>
      <input
        v-bind="$attrs"
        :value="modelValue"
        :class="['field', icon && 'pl-10', error && '!border-red-500 !ring-red-100']"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </span>
    <span v-if="error" class="mt-1 block text-xs font-medium text-red-700">{{ error }}</span>
  </label>
</template>
