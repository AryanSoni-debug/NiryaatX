<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useShipmentStore } from '../stores/shipment'
import { apiRequest } from '../services/api'

const router = useRouter()
const store = useShipmentStore()
const busy = ref(false)
const resultReady = ref(false)
const contractStatus = ref('')
const forexForecast = ref(null)
const forexForecastLoading = ref(false)
const forexForecastError = ref('')
const shipment = computed(() => store.shipment)
const pair = computed(() => `${shipment.value?.currency || 'USD'} / INR`)
const delivery = computed(() => shipment.value?.deliveryDate ? new Date(`${shipment.value.deliveryDate}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not specified')

function formatForecastDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
async function runAnalysis() {
  busy.value = true
  await new Promise((resolve) => setTimeout(resolve, 650))
  busy.value = false
  resultReady.value = true
}
async function loadForexForecast() {
  if (forexForecastLoading.value) return
  forexForecastLoading.value = true
  forexForecastError.value = ''
  forexForecast.value = null
  try {
    forexForecast.value = await apiRequest('/forex/forecast')
  } catch (error) {
    forexForecastError.value = error.message
  } finally {
    forexForecastLoading.value = false
  }
}
async function createContract() {
  contractStatus.value = ''
  try {
    const data = {
      reference: `NX-DEMO-${new Date().toISOString().slice(0, 10)}`,
      exporter: 'Demo exporter',
      importer: 'Demo importer',
      currencyPair: pair.value,
      amount: Number(shipment.value?.value || 0),
      agreedForwardRate: null,
      maturityDate: delivery.value,
      createdAt: new Date().toISOString(),
    }
    const bytes = new TextEncoder().encode(JSON.stringify(data, Object.keys(data).sort()))
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem('niryaatx-contract', JSON.stringify({ data, hash }))
    contractStatus.value = `Demo record created · SHA-256 ${hash.slice(0, 18)}…`
  } catch (error) {
    contractStatus.value = `Could not create contract fingerprint: ${error.message}`
  }
}
async function verifyContract() {
  contractStatus.value = ''
  try {
    const record = JSON.parse(sessionStorage.getItem('niryaatx-contract') || 'null')
    if (!record) throw new Error('Create a contract record first.')
    const bytes = new TextEncoder().encode(JSON.stringify(record.data, Object.keys(record.data).sort()))
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    contractStatus.value = hash === record.hash ? 'Integrity verified for this browser-stored record. Signer identity is not verified.' : 'Verification failed: the stored contract data does not match its fingerprint.'
  } catch (error) {
    contractStatus.value = error.message
  }
}
</script>

<template>
  <main class="analysis-page">
    <header class="analysis-topbar"><RouterLink to="/dashboard" class="brand"><img class="brand-mark" src="/niryaatx-logo.png" alt="" /><span>NIRYAAT<span class="brand-x">X</span></span></RouterLink><span class="demo-pill"><i></i> MODEL API + DEMO DATA</span><RouterLink to="/dashboard" class="back-link">Workspace ↗</RouterLink></header>
    <section class="analysis-heading"><p class="eyebrow eyebrow-dark">SHIPMENT / RISK INTELLIGENCE</p><h1>A clearer picture<br />of <em>this voyage.</em></h1><p>One connected view, with source and uncertainty made explicit.</p></section>
    <div v-if="shipment" class="analysis-body">
      <section class="shipment-summary"><div><span class="panel-kicker">ROUTE / DEMO</span><h2>{{ shipment.originPort }} <span>→</span> {{ shipment.destinationPort }}</h2><p>{{ shipment.cargoType }} · {{ shipment.quantity }} units · Delivery target {{ delivery }}</p></div><div class="shipment-value"><span>SHIPMENT VALUE</span><strong>{{ shipment.currency }} {{ Number(shipment.value).toLocaleString() }}</strong></div></section>
      <div class="analysis-actions"><button class="button button-primary" :disabled="busy" @click="runAnalysis">{{ busy ? 'Bringing signals together…' : resultReady ? 'Refresh demonstration view' : 'Run demonstration analysis' }} <span>↗</span></button><span class="form-note">Route, weather, and port data are unavailable · USD/INR model forecast available on demand</span></div>
      <section class="result-grid">
        <article class="result-panel"><span class="panel-kicker">01 / CURRENCY EXPOSURE</span><h3>USD / INR model forecast</h3><p v-if="forexForecast">Model API reports ₹{{ Number(forexForecast.current_price).toFixed(2) }} per USD now. Its lowest predicted rate is ₹{{ Number(forexForecast.lowest_predicted_rate).toFixed(2) }} on {{ formatForecastDate(forexForecast.lowest_predicted_date) }}. This pair is independent of the shipment currency ({{ shipment.currency }}).</p><p v-else-if="forexForecastError" class="forex-error" role="alert">{{ forexForecastError }}</p><p v-else>The configured model returns USD/INR predictions; forecast values are uncertain and are not financial advice.</p><button class="button button-outline-dark forex-load-button" :disabled="forexForecastLoading" @click="loadForexForecast">{{ forexForecastLoading ? 'Loading model…' : forexForecast ? 'Refresh USD/INR forecast' : 'Get USD/INR forecast' }}</button><div class="result-foot">Forecast status <strong>{{ forexForecast ? 'Model API response' : forexForecastError ? 'Unavailable' : 'Not requested' }}</strong></div></article>
        <article class="result-panel"><span class="panel-kicker">02 / ROUTE INTELLIGENCE</span><h3>{{ shipment.originPort }} to {{ shipment.destinationPort }}</h3><p>Route costs and transit estimates require a connected logistics data source. No recommendation is generated without route evidence.</p><div class="result-foot">Comparison status <strong>Awaiting provider</strong></div></article>
        <article class="result-panel"><span class="panel-kicker">03 / WEATHER & PORT</span><h3>No live signals</h3><p>Weather and port congestion feeds are not connected. No conditions, delays, or alerts are inferred from port names.</p><div class="result-foot">Data status <strong>Unavailable</strong></div></article>
        <article class="result-panel"><span class="panel-kicker">04 / FINANCIAL VIEW</span><h3>Exposure to consider</h3><p>{{ shipment.currency }} {{ Number(shipment.value).toLocaleString() }} shipment value · Delivery target {{ delivery }}. Profitability scenarios require market rates and logistics costs.</p><div class="result-foot">Scenario status <strong>Not calculated</strong></div></article>
      </section>
      <div v-if="resultReady" class="analysis-note" role="status"><span>✓</span> Demonstration analysis complete. Route, weather, and port provider data is not connected. Currency forecasts are requested separately from the configured model API.</div>
      <section class="contract-panel"><div><span class="panel-kicker">SECURE FORWARD CONTRACTS / PROTOTYPE</span><h2>A verifiable record of every agreement.</h2><p>Generate a local demo fingerprint from canonical contract data. Hash integrity is not a digital signature and does not establish identity or authenticity.</p></div><div class="contract-actions"><button class="button button-dark" @click="createContract">Create demo record</button><button class="button button-outline-dark" @click="verifyContract">Verify integrity</button><p v-if="contractStatus" class="contract-feedback" role="status">{{ contractStatus }}</p></div></section>
    </div>
    <section v-else class="no-shipment"><h2>No shipment is attached to this session.</h2><p>Return to the landing page and enter shipment details. They will be preserved when you sign in.</p><RouterLink class="button button-primary" to="/#analyse">Add shipment ↗</RouterLink></section>
    <footer class="dash-footer"><span>NIRYAATX · NAVIGATE TRADE. CONTROL RISK.</span><span>Prototype · Demonstration data only</span></footer>
  </main>
</template>
