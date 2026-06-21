import { createRouter, createWebHistory } from 'vue-router'
import { pinia } from '@/app/providers/pinia'
import { useAuthStore } from '@/features/auth/store/auth.store'
import LoginPage from '@/features/auth/pages/LoginPage.vue'
import RecoverPasswordPage from '@/features/auth/pages/RecoverPasswordPage.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import DashboardPage from '@/features/dashboard/pages/DashboardPage.vue'
import CommissionsPage from '@/features/commissions/pages/CommissionsPage.vue'
import UsersPage from '@/features/users/pages/UsersPage.vue'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    meta: { public: true },
  },
  {
    path: '/recuperar-contrasena',
    name: 'recover-password',
    component: RecoverPasswordPage,
    meta: { public: true },
  },
  {
    path: '/',
    component: AdminLayout,
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      { path: 'dashboard', name: 'dashboard', component: DashboardPage },
      { path: 'comisiones', name: 'commissions', component: CommissionsPage },
      { path: 'usuarios', name: 'users', component: UsersPage },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia)

  if (!authStore.initialized) {
    await authStore.initialize()
  }

  if (!to.meta.public && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.public && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  return true
})
