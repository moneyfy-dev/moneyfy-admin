<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminHeader from '@/components/organisms/AdminHeader.vue'
import AdminSidebar from '@/components/organisms/AdminSidebar.vue'
import { useAuthStore } from '@/features/auth/store/auth.store'

const sidebarOpen = ref(false)
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const titles = {
  dashboard: 'Dashboard',
  commissions: 'Comisiones',
  users: 'Usuarios',
}

const pageTitle = computed(() => titles[route.name] || 'Moneyfy Admin')

async function logout() {
  await authStore.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <main class="min-h-screen bg-paper">
    <AdminSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <section class="min-h-screen lg:pl-60">
      <AdminHeader
        :title="pageTitle"
        :user-name="authStore.user?.name"
        @open-menu="sidebarOpen = true"
        @logout="logout"
      />
      <RouterView />
    </section>
  </main>
</template>
