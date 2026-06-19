<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseInput from '@/components/atoms/BaseInput.vue'
import { useAuthStore } from '../store/auth.store'
import darkLogo from '@/assets/images/footer_logo.png'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = reactive({
  email: 'alejandro.osses.r@gmail.com',
  password: '',
})

const showPassword = ref(false)

async function submit() {
  authStore.clearFeedback()

  try {
    await authStore.signIn(form)
    await router.replace(String(route.query.redirect || '/dashboard'))
  } catch {
    // The store exposes the normalized message.
  }
}

function recoverPassword() {
  authStore.recoverPassword(form.email)
}
</script>

<template>
  <main class="min-h-screen bg-ink text-white">
    <div class="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section class="relative flex items-center overflow-hidden px-6 py-10 sm:px-10 lg:px-16">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,199,15,0.22),transparent_32%),radial-gradient(circle_at_80%_75%,rgba(255,255,255,0.08),transparent_28%)]"></div>
        <div class="relative max-w-xl">
          <img :src="darkLogo" alt="Moneyfy" class="mb-16 h-10 w-auto" />
          <p class="mb-4 text-xs font-semibold uppercase text-moneyfy-500">
            Administrador de comisiones
          </p>
          <h1 class="text-4xl font-bold leading-tight sm:text-5xl">
            Control operativo para pagos diferidos.
          </h1>
          <p class="mt-5 max-w-lg text-base leading-7 text-white/70">
            Visualiza comisiones, revisa estados de pago y administra los archivos de
            actualizacion de la operacion.
          </p>
          <div class="mt-10 grid gap-3 sm:grid-cols-3">
            <div
              v-for="item in [
                ['ri-shield-check-line', 'Acceso interno'],
                ['ri-file-excel-2-line', 'CSV compatible'],
                ['ri-bar-chart-box-line', 'Indicadores anuales'],
              ]"
              :key="item[1]"
              class="rounded-[8px] border border-white/10 bg-white/5 p-4"
            >
              <i :class="[item[0], 'text-2xl text-moneyfy-500']"></i>
              <p class="mt-3 text-xs text-white/70">{{ item[1] }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="flex items-center justify-center bg-paper px-6 py-10 text-ink">
        <div class="admin-card w-full max-w-md p-8">
          <div class="mb-7">
            <p class="text-xs font-semibold text-moneyfy-700">Moneyfy Admin</p>
            <h2 class="mt-2 text-2xl font-bold">Iniciar sesion</h2>
            <p class="mt-2 text-xs text-slate-500">Acceso inicial habilitado para Alejandro.</p>
          </div>

          <form class="space-y-4" @submit.prevent="submit">
            <BaseInput
              v-model="form.email"
              label="Correo"
              type="email"
              autocomplete="email"
            />
            <BaseInput
              v-model="form.password"
              label="Contrasena"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Ingresa tu contrasena"
              :trailing-icon="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'"
              :trailing-label="showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'"
              @trailing-click="showPassword = !showPassword"
            />
            <p
              v-if="authStore.error"
              class="rounded-[8px] bg-red-50 px-3 py-2 text-xs text-red-700"
              role="alert"
            >
              {{ authStore.error }}
            </p>
            <BaseButton
              class="w-full"
              type="submit"
              :loading="authStore.loading"
              :disabled="!form.email || !form.password"
            >
              <template #icon><i class="ri-login-circle-line text-lg"></i></template>
              Entrar al administrador
            </BaseButton>
          </form>

          <div class="mt-5 rounded-[8px] border border-slate-200 bg-slate-50 p-4">
            <button
              class="flex w-full items-center justify-between text-left text-xs font-semibold text-slate-700"
              type="button"
              @click="recoverPassword"
            >
              <span>Olvide o necesito recordar mi contrasena</span>
              <i class="ri-key-2-line text-lg text-moneyfy-600"></i>
            </button>
            <p
              v-if="authStore.recoveryMessage"
              class="mt-3 text-xs leading-6 text-slate-600"
              role="status"
            >
              {{ authStore.recoveryMessage }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
