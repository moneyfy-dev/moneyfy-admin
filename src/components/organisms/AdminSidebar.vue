<script setup>
import darkLogo from '@/assets/images/footer_logo.png'

defineProps({
  open: Boolean,
})

defineEmits(['close'])

const navigation = [
  { name: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
  { name: 'commissions', label: 'Comisiones', icon: 'ri-exchange-dollar-line' },
  { name: 'users', label: 'Usuarios', icon: 'ri-user-settings-line' },
]
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-30 bg-black/45 lg:hidden"
    aria-hidden="true"
    @click="$emit('close')"
  ></div>

  <aside
    :class="[
      'fixed inset-y-0 left-0 z-40 w-60 border-r border-white/10 bg-ink px-5 py-6 text-white transition-transform lg:translate-x-0',
      open ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <div class="flex items-center justify-between">
      <img :src="darkLogo" alt="Moneyfy" class="h-9 w-auto" />
      <button
        type="button"
        class="flex size-10 items-center justify-center lg:hidden"
        aria-label="Cerrar navegación"
        @click="$emit('close')"
      >
        <i class="ri-close-line text-xl"></i>
      </button>
    </div>

    <nav class="mt-10 space-y-2" aria-label="Navegación principal">
      <RouterLink
        v-for="item in navigation"
        :key="item.name"
        :to="{ name: item.name }"
        class="flex w-full items-center gap-3 rounded-[8px] px-4 py-3 text-xs font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
        active-class="!bg-moneyfy-600 !text-white"
        @click="$emit('close')"
      >
        <i :class="[item.icon, 'text-lg']"></i>
        {{ item.label }}
      </RouterLink>
    </nav>

  </aside>
</template>
