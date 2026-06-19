<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    default: 'Administrador',
  },
})

defineEmits(['open-menu', 'logout'])
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-slate-200 bg-paper/95 px-5 py-4 lg:px-8">
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <button
          type="button"
          class="btn-ghost !size-10 !px-0 lg:hidden"
          aria-label="Abrir navegación"
          @click="$emit('open-menu')"
        >
          <i class="ri-menu-line text-lg"></i>
        </button>
        <div class="min-w-0">
          <p class="text-xs font-semibold text-moneyfy-700">Panel de administración</p>
          <h1 class="truncate text-2xl font-bold text-ink">{{ title }}</h1>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="hidden text-xs font-semibold text-slate-600 sm:block">{{ userName }}</span>
        <button
          type="button"
          class="btn-ghost !size-10 !px-0"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          @click="$emit('logout')"
        >
          <i class="ri-logout-box-r-line text-lg"></i>
        </button>
      </div>
    </div>
  </header>
</template>
