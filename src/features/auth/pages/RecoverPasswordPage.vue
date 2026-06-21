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
  email: String(route.query.email || ''),
  code: '',
  password: '',
  repeatedPassword: '',
})

const showPassword = ref(false)
const showRepeatedPassword = ref(false)
const codeRequested = ref(false)
const activeAction = ref('')

async function requestCode() {
  authStore.clearFeedback()
  activeAction.value = 'request'

  try {
    await authStore.recoverPassword(form.email)
    codeRequested.value = true
  } catch {
    // The store exposes the normalized message.
  } finally {
    activeAction.value = ''
  }
}

async function resendCode() {
  authStore.clearFeedback()
  activeAction.value = 'resend'

  try {
    await authStore.resendCode(form.email)
    codeRequested.value = true
  } catch {
    // The store exposes the normalized message.
  } finally {
    activeAction.value = ''
  }
}

async function submitReset() {
  authStore.clearFeedback()
  activeAction.value = 'confirm'

  try {
    await authStore.confirmPasswordReset(form)
    await router.replace('/dashboard')
  } catch {
    // The store exposes the normalized message.
  } finally {
    activeAction.value = ''
  }
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
            Recuperacion admin
          </p>
          <h1 class="text-4xl font-bold leading-tight sm:text-5xl">
            Restablece o activa tu acceso administrativo.
          </h1>
          <p class="mt-5 max-w-lg text-base leading-7 text-white/70">
            Solicita un codigo de verificacion, confirma tu identidad y define una nueva
            contrasena para volver al panel.
          </p>
          <div class="mt-10 grid gap-3 sm:grid-cols-3">
            <div
              v-for="item in [
                ['ri-mail-send-line', 'Codigo por correo'],
                ['ri-shield-keyhole-line', 'Activacion segura'],
                ['ri-refresh-line', 'Reenvio disponible'],
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
            <h2 class="mt-2 text-2xl font-bold">Recuperar contrasena</h2>
            <p class="mt-2 text-xs text-slate-500">
              Usa el mismo correo administrativo con el que inicias sesion.
            </p>
          </div>

          <form class="space-y-4" @submit.prevent="submitReset">
            <BaseInput
              v-model="form.email"
              label="Correo administrativo"
              type="email"
              autocomplete="email"
              placeholder="admin@moneyfy.cl"
            />

            <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
              <BaseButton
                class="w-full"
                type="button"
                variant="ghost"
                :loading="authStore.loading && activeAction === 'request'"
                :disabled="!form.email"
                @click="requestCode"
              >
                <template #icon><i class="ri-mail-send-line text-lg"></i></template>
                Enviar codigo
              </BaseButton>
              <BaseButton
                class="w-full"
                type="button"
                variant="ghost"
                :loading="authStore.loading && activeAction === 'resend'"
                :disabled="!form.email"
                @click="resendCode"
              >
                <template #icon><i class="ri-refresh-line text-lg"></i></template>
                Reenviar
              </BaseButton>
            </div>

            <BaseInput
              v-model="form.code"
              label="Codigo recibido"
              autocomplete="one-time-code"
              placeholder="Ingresa el codigo del correo"
            />
            <BaseInput
              v-model="form.password"
              label="Nueva contrasena"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Crea una contrasena nueva"
              :trailing-icon="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'"
              :trailing-label="showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'"
              @trailing-click="showPassword = !showPassword"
            />
            <BaseInput
              v-model="form.repeatedPassword"
              label="Repite la contrasena"
              :type="showRepeatedPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Repite la contrasena nueva"
              :trailing-icon="showRepeatedPassword ? 'ri-eye-off-line' : 'ri-eye-line'"
              :trailing-label="showRepeatedPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'"
              @trailing-click="showRepeatedPassword = !showRepeatedPassword"
            />

            <div
              v-if="authStore.error"
              class="rounded-[8px] bg-red-50 px-3 py-2 text-xs text-red-700"
              role="alert"
            >
              {{ authStore.error }}
            </div>
            <p
              v-if="authStore.recoveryMessage"
              class="rounded-[8px] bg-sky-50 px-3 py-2 text-xs text-sky-800"
              role="status"
            >
              {{ authStore.recoveryMessage }}
            </p>
            <p
              v-if="authStore.resetMessage"
              class="rounded-[8px] bg-moneyfy-50 px-3 py-2 text-xs text-moneyfy-700"
              role="status"
            >
              {{ authStore.resetMessage }}
            </p>

            <BaseButton
              class="w-full"
              type="submit"
              :loading="authStore.loading && activeAction === 'confirm'"
              :disabled="!form.email || !form.code || !form.password || !form.repeatedPassword"
            >
              <template #icon><i class="ri-shield-keyhole-line text-lg"></i></template>
              Confirmar nueva contrasena
            </BaseButton>
          </form>

          <div class="mt-5 rounded-[8px] border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            <p class="leading-6">
              Si el backend activa la cuenta durante este flujo, al confirmar quedaras autenticado
              automaticamente en el admin.
            </p>
            <RouterLink
              class="mt-3 inline-flex items-center gap-2 font-semibold text-moneyfy-700 transition hover:text-moneyfy-800"
              to="/login"
            >
              <i class="ri-arrow-left-line text-base"></i>
              Volver al login
            </RouterLink>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
