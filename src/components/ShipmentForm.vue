<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useShipmentStore } from '../stores/shipment'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const shipmentStore = useShipmentStore()
const authStore = useAuthStore()
const loading = ref(false)
const error = ref('')
const defaults = () => ({
  cargoType: '',
  originPort: '',
  destinationPort: '',
  quantity: '',
  value: '',
  currency: 'USD',
  deliveryDate: '',
  preference: 'Balanced',
})
const form = reactive(defaults())

function clearForm() {
  Object.assign(form, defaults())
  error.value = ''
}

async function submit() {
  error.value = ''
  if (!form.cargoType || !form.originPort.trim() || !form.destinationPort.trim() ||
      !form.quantity || Number(form.quantity) <= 0 || !form.value || Number(form.value) <= 0 ||
      !form.currency || !form.deliveryDate || form.originPort.trim().toLowerCase() === form.destinationPort.trim().toLowerCase()) {
    error.value = 'Complete each field with valid shipment details. Origin and destination must differ.'
    return
  }
  loading.value = true
  shipmentStore.saveShipment({ ...form, quantity: Number(form.quantity), value: Number(form.value) })
  await new Promise((resolve) => setTimeout(resolve, 350))
  loading.value = false
  if (!authStore.isAuthenticated) router.push({ path: '/login', query: { redirect: '/analysis' } })
  else router.push('/analysis')
}
</script>

<template>
  <form class="shipment-form" @submit.prevent="submit">
    <div class="form-grid">
      <label>Cargo type
        <select v-model="form.cargoType" required>
          <option value="" disabled>Select cargo</option>
          <option>Textiles</option><option>Machinery</option><option>Food &amp; agriculture</option><option>Electronics</option><option>Other</option>
        </select>
      </label>
      <label>Shipment quantity
        <input v-model="form.quantity" type="number" min="1" placeholder="e.g. 240" required />
      </label>
      <label>Origin port
        <input v-model="form.originPort" maxlength="80" placeholder="e.g. Nhava Sheva" required />
      </label>
      <label>Destination port
        <input v-model="form.destinationPort" maxlength="80" placeholder="e.g. Rotterdam" required />
      </label>
      <label>Shipment value
        <div class="input-combo"><select v-model="form.currency" aria-label="Currency"><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option><option>JPY</option></select>        <input v-model="form.value" type="number" min="1" step="0.01" aria-label="Shipment value amount" placeholder="Amount" required /></div>
      </label>
      <label>Required delivery
        <input v-model="form.deliveryDate" type="date" :min="new Date().toISOString().slice(0, 10)" required />
      </label>
      <label class="full-field">Route priority
        <select v-model="form.preference"><option>Balanced</option><option>Lowest estimated cost</option><option>Shortest estimated time</option></select>
      </label>
    </div>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="form-actions">
      <button class="button button-primary" type="submit" :disabled="loading">{{ loading ? 'Preparing voyage…' : 'Run shipment analysis' }} <span aria-hidden="true">↗</span></button>
      <button class="button button-text" type="button" @click="clearForm">Clear form</button>
      <span class="form-note">Demo mode · no live data used</span>
    </div>
  </form>
</template>
