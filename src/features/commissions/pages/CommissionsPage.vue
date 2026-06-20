<script setup>
import { onMounted, ref } from 'vue'
import BaseButton from '@/components/atoms/BaseButton.vue'
import EmptyState from '@/components/molecules/EmptyState.vue'
import CommissionImportReviewModal from '../components/CommissionImportReviewModal.vue'
import CommissionPaymentReviewModal from '../components/CommissionPaymentReviewModal.vue'
import CommissionActionCard from '../components/CommissionActionCard.vue'
import CommissionFilters from '../components/CommissionFilters.vue'
import CommissionTable from '../components/CommissionTable.vue'
import MoneyfyerSummaryTable from '../components/MoneyfyerSummaryTable.vue'
import { useCommissionsStore } from '../store/commissions.store'
import {
  exportCommissionsExcel,
  parseCommissionStatusExcel,
} from '../utils/commissions-excel'
import { exportPaymentPayrollExcel, parsePaymentPayrollExcel } from '../utils/payments-excel'

const commissionsStore = useCommissionsStore()
const fileInput = ref(null)
const paymentFileInput = ref(null)
const fileError = ref('')

onMounted(() => {
  if (commissionsStore.items.length === 0) {
    commissionsStore.fetchCommissions()
  }
})

function openPaymentReview() {
  fileError.value = ''
  commissionsStore.clearPaymentSummary()
  paymentFileInput.value?.click()
}

async function exportRows() {
  fileError.value = ''
  commissionsStore.clearAlerts()

  try {
    await exportCommissionsExcel(commissionsStore.filteredItems)
  } catch (error) {
    fileError.value = error.message || 'No fue posible generar el archivo Excel.'
  }
}

async function exportPaymentPayroll() {
  fileError.value = ''
  commissionsStore.clearPaymentSummary()

  try {
    const preview = await commissionsStore.generatePaymentPreview()
    if (!preview.hasApprovedRows) {
      throw new Error('No hay comisiones aprobadas visibles para exportar.')
    }

    await exportPaymentPayrollExcel(preview)
  } catch (error) {
    fileError.value = error.message || 'No fue posible generar la nomina de pagos.'
  }
}

async function importFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  fileError.value = ''
  commissionsStore.clearImportSummary()

  try {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw new Error('Selecciona un archivo Excel .xlsx.')
    }

    const result = await parseCommissionStatusExcel(file)
    commissionsStore.prepareStatusImport(result)
  } catch (error) {
    fileError.value = error.message || 'No fue posible procesar el archivo.'
  } finally {
    event.target.value = ''
  }
}

async function importPaymentFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  fileError.value = ''
  commissionsStore.clearPaymentSummary()

  try {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw new Error('Selecciona un archivo Excel .xlsx.')
    }

    const result = await parsePaymentPayrollExcel(file)
    commissionsStore.preparePaymentsFromExcel(result)
  } catch (error) {
    fileError.value = error.message || 'No fue posible procesar la nomina del banco.'
  } finally {
    event.target.value = ''
  }
}
</script>

<template>
  <div class="space-y-6 p-5 lg:p-8">
    <section class="admin-card overflow-hidden">
      <div class="border-b border-slate-200 p-5">
        <div class="flex flex-col gap-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 class="text-lg font-bold">Tabla de comisiones</h2>
              <p class="mt-1 text-xs text-slate-500">
                Filtra, ordena y exporta exactamente los registros visibles.
              </p>
            </div>

          </div>

          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CommissionActionCard
              title="Exportar Excel"
              description="Descarga las cotizaciones visibles con sus estados actuales."
              icon="ri-download-2-line"
              tone="light"
              :disabled="commissionsStore.filteredItems.length === 0"
              @click="exportRows"
            />
            <CommissionActionCard
              title="Cargar estados"
              description="Importa el Excel de respuesta para aprobar, rechazar o caducar."
              icon="ri-upload-2-line"
              tone="dark"
              @click="fileInput?.click()"
            />
            <CommissionActionCard
              title="Exportar Nomina"
              description="Genera el consolidado por moneyfyer listo para enviar al banco."
              icon="ri-file-excel-2-line"
              tone="light"
              :disabled="!commissionsStore.paymentPreparation.hasApprovedRows"
              @click="exportPaymentPayroll"
            />
            <CommissionActionCard
              title="Procesar pagos"
              description="Envía la nómina validada al backend para cerrar el pago."
              icon="ri-bank-card-line"
              tone="green"
              @click="openPaymentReview"
            />
            <input
              ref="fileInput"
              class="hidden"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              @change="importFile"
            />
            <input
              ref="paymentFileInput"
              class="hidden"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              @change="importPaymentFile"
            />
          </div>

          <CommissionFilters
            :status="commissionsStore.filters.status"
            :search="commissionsStore.filters.search"
            :date-from="commissionsStore.filters.dateRange.from"
            :date-to="commissionsStore.filters.dateRange.to"
            @update:status="commissionsStore.filters.status = $event"
            @update:search="commissionsStore.filters.search = $event"
            @update:date-from="commissionsStore.filters.dateRange.from = $event"
            @update:date-to="commissionsStore.filters.dateRange.to = $event"
            @reset-date-range="commissionsStore.resetDateRange"
          />

          <p
            v-if="commissionsStore.paymentPreparation.hasApprovedRows && !commissionsStore.paymentPreparation.accountDataAvailable"
            class="rounded-[8px] bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
            role="status"
          >
            Hay {{ commissionsStore.paymentPreparation.missingAccountCount }} usuarios con comisiones aprobadas sin cuenta bancaria completa en los datos actuales. Puedes exportar la nomina, pero el procesamiento automatico de pagos seguira bloqueado hasta que backend exponga la cuenta seleccionada o ese dato se resuelva en el flujo server-side.
          </p>

          <p
            v-if="commissionsStore.importSummary"
            class="rounded-[8px] bg-moneyfy-50 px-3 py-2 text-xs font-medium text-moneyfy-700"
            role="status"
          >
            <template v-if="commissionsStore.importSummary.submitted">
              {{ commissionsStore.importSummary.updated }} actualizadas,
              {{ commissionsStore.importSummary.rejected }} rechazadas de
              {{ commissionsStore.importSummary.total }} filas procesadas.
            </template>
            <template v-else>
              {{ commissionsStore.importSummary.prepared }} actualizaciones validadas y preparadas,
              {{ commissionsStore.importSummary.rejected }} rechazadas. No se enviaron al backend
              porque el interruptor de escrituras administrativas sigue deshabilitado en este ambiente.
            </template>
          </p>
          <p
            v-if="commissionsStore.paymentSummary"
            class="rounded-[8px] bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800"
            role="status"
          >
            <template v-if="commissionsStore.paymentSummary.submitted">
              {{ commissionsStore.paymentSummary.paid }} comisiones marcadas como pagadas,
              {{ commissionsStore.paymentSummary.conflicts }} filas marcadas como conflictivas,
              {{ commissionsStore.paymentSummary.failed }} grupos rechazados por el backend y
              {{ commissionsStore.paymentSummary.rejected }} filas invalidadas antes del envio.
            </template>
            <template v-else>
              No se enviaron pagos al backend porque el interruptor de escrituras administrativas sigue deshabilitado en este ambiente.
            </template>
          </p>
          <p
            v-if="fileError"
            class="rounded-[8px] bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
            role="alert"
          >
            {{ fileError }}
          </p>
        </div>
      </div>

      <div v-if="commissionsStore.loading" class="space-y-3 p-5">
        <div v-for="index in 6" :key="index" class="h-12 animate-pulse rounded-[8px] bg-slate-100"></div>
      </div>

      <EmptyState
        v-else-if="commissionsStore.error"
        icon="ri-error-warning-line"
        title="Comisiones no disponibles"
        :message="commissionsStore.error"
      >
        <BaseButton class="mt-5" @click="commissionsStore.fetchCommissions()">Reintentar</BaseButton>
      </EmptyState>

      <CommissionTable
        v-else
        :items="commissionsStore.filteredItems"
        :sort-key="commissionsStore.sorting.key"
        :sort-direction="commissionsStore.sorting.direction"
        @sort="commissionsStore.setSort"
      />
    </section>

    <section class="admin-card overflow-hidden">
      <div class="border-b border-slate-200 p-5">
        <h2 class="text-lg font-bold">Moneyfyers consolidados</h2>
        <p class="mt-1 text-xs text-slate-500">
          Consolidado por usuario beneficiario para revisar cuánto gana cada moneyfyer y preparar la nómina bancaria.
        </p>
      </div>

      <div class="p-5">
        <MoneyfyerSummaryTable :items="commissionsStore.moneyfyerRows" />
      </div>
    </section>

    <CommissionImportReviewModal
      v-if="commissionsStore.pendingImport"
      :preview="commissionsStore.pendingImport"
      :loading="commissionsStore.loading"
      @close="commissionsStore.clearPendingImport()"
      @confirm="commissionsStore.submitPendingImport()"
    />

    <CommissionPaymentReviewModal
      v-if="commissionsStore.pendingPayment"
      :preview="commissionsStore.pendingPayment"
      :loading="commissionsStore.loading"
      @close="commissionsStore.clearPendingPayment()"
      @confirm="commissionsStore.submitPendingPayment()"
    />
  </div>
</template>

