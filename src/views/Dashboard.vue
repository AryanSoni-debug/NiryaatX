<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { init, use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useAuthStore } from '../stores/auth'
import { useShipmentStore } from '../stores/shipment'
import { useRouter } from 'vue-router'
import { getAuthErrorMessage } from '../services/firebase'
import { apiRequest } from '../services/api'

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const auth = useAuthStore()
const shipmentStore = useShipmentStore()
const router = useRouter()
const activeTab = ref('Overview')
const chartEl = ref(null)
const signOutError = ref('')
const forexForecast = ref(null)
const forexForecastLoading = ref(false)
const forexForecastError = ref('')
let chart
const tabs = ['Overview', 'New analysis', 'Forecast', 'Routes', 'Port & weather', 'Contracts', 'Shipments', 'Settings']
const userLabel = computed(() => auth.user?.role || 'Trade')
const isImporter = computed(() => userLabel.value === 'Importer')
const days = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15']
const historic = [83.12, 83.26, 83.04, 83.31, 83.19, 83.44, 83.37, 83.52, 83.29, 83.48, null, null, null, null, null]
const projected = [null, null, null, null, null, null, null, null, null, 83.48, 83.51, 83.42, 83.58, 83.62, 83.55]
const displayTitle = computed(() => activeTab.value === 'Overview' ? 'Your trade at a glance' : activeTab.value)

function drawChart() {
  if (!chartEl.value) {
    chart?.dispose()
    chart = undefined
    return
  }
  chart?.dispose()
  chart = init(chartEl.value)
  if (activeTab.value === 'Forecast') {
    if (!forexForecast.value) return
    const forecast = forexForecast.value.forecast
    chart.setOption({
      animationDuration: 650,
      grid: { left: 48, right: 20, top: 22, bottom: 54 },
      tooltip: { trigger: 'axis', backgroundColor: '#0b2942', borderColor: '#24445b', textStyle: { color: '#f1f5f7' }, valueFormatter: (value) => value == null ? '—' : `₹${Number(value).toFixed(2)} per USD` },
      xAxis: { type: 'category', data: forecast.map((point) => point.date), boundaryGap: false, axisLine: { lineStyle: { color: '#d9e0e2' } }, axisLabel: { color: '#667984', fontFamily: 'DM Mono', fontSize: 10, rotate: 35 } },
      yAxis: { type: 'value', scale: true, axisLabel: { color: '#667984', fontFamily: 'DM Mono', fontSize: 10 }, splitLine: { lineStyle: { color: '#e9edef' } } },
      series: [{ name: 'Model prediction', type: 'line', data: forecast.map((point) => point.predicted_price), smooth: true, showSymbol: true, lineStyle: { color: '#c29954', width: 2.4 }, areaStyle: { color: 'rgba(194,153,84,0.08)' } }],
    })
    return
  }
  chart.setOption({
    animationDuration: 650,
    grid: { left: 48, right: 20, top: 22, bottom: 34 },
    tooltip: { trigger: 'axis', backgroundColor: '#0b2942', borderColor: '#24445b', textStyle: { color: '#f1f5f7' }, valueFormatter: (value) => value == null ? '—' : `${Number(value).toFixed(2)} (illustrative)` },
    xAxis: { type: 'category', data: days, boundaryGap: false, axisLine: { lineStyle: { color: '#d9e0e2' } }, axisLabel: { color: '#667984', fontFamily: 'DM Mono', fontSize: 10 } },
    yAxis: { type: 'value', scale: true, axisLabel: { color: '#667984', fontFamily: 'DM Mono', fontSize: 10 }, splitLine: { lineStyle: { color: '#e9edef' } } },
    series: [
      { name: 'Illustrative history', type: 'line', data: historic, smooth: true, showSymbol: false, lineStyle: { color: '#0b5264', width: 2.4 }, areaStyle: { color: 'rgba(11,82,100,0.06)' } },
      { name: 'Illustrative scenario', type: 'line', data: projected, smooth: true, showSymbol: false, lineStyle: { color: '#c29954', width: 2, type: 'dashed' } },
    ],
  })
}
function resizeChart() { chart?.resize() }
function goAnalysis() { router.push(shipmentStore.hasShipment ? '/analysis' : '/#analyse') }
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
function formatForecastDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
async function signOut() {
  signOutError.value = ''
  try {
    await auth.signOut()
    await router.push('/')
  } catch (error) {
    signOutError.value = getAuthErrorMessage(error)
  }
}
onMounted(() => { drawChart(); window.addEventListener('resize', resizeChart) })
watch(activeTab, (tab) => {
  if (tab === 'Forecast') loadForexForecast()
  nextTick(drawChart)
})
watch(forexForecast, () => nextTick(drawChart))
onBeforeUnmount(() => { window.removeEventListener('resize', resizeChart); chart?.dispose() })
</script>

<template>
  <main class="dashboard-shell">
    <aside class="dashboard-sidebar"><RouterLink to="/" class="brand"><img class="brand-mark" src="/niryaatx-logo.png" alt="" /><span>NIRYAAT<span class="brand-x">X</span></span></RouterLink><p class="sidebar-caption">TRADE INTELLIGENCE</p><nav><button v-for="(tab, index) in tabs" :key="tab" :class="{ selected: activeTab === tab }" @click="tab === 'New analysis' ? goAnalysis() : activeTab = tab"><span class="sidebar-icon">{{ `0${index + 1}` }}</span>{{ tab }}</button></nav><p v-if="signOutError" class="dash-auth-error" role="alert">{{ signOutError }}</p><div class="sidebar-bottom"><div class="user-avatar">{{ userLabel.charAt(0) }}</div><div><strong>{{ userLabel }}</strong><span>{{ auth.user?.email }}</span></div><button aria-label="Sign out" class="signout" @click="signOut">↗</button></div></aside>
    <section class="dashboard-content"><header class="dash-topline"><div><span class="eyebrow eyebrow-dark">NIRYAATX / {{ userLabel.toUpperCase() }} WORKSPACE</span><h1>{{ displayTitle }}</h1></div><div class="dash-top-actions"><span class="demo-pill"><i></i> {{ activeTab === 'Forecast' ? 'HYBRID MODEL' : 'DEMONSTRATION DATA' }}</span><button class="button button-primary" @click="goAnalysis">New analysis <span>↗</span></button></div></header>
      <template v-if="activeTab === 'Overview'">
        <div class="metric-row"><article class="metric"><span>ACTIVE SHIPMENTS</span><strong>{{ shipmentStore.hasShipment ? '01' : '—' }}</strong><small>{{ shipmentStore.hasShipment ? 'Session shipment' : 'No shipment analysed' }}</small></article><article class="metric"><span>OVERALL RISK</span><strong class="metric-accent">Not rated</strong><small>Awaiting shipment analysis</small></article><article class="metric"><span>{{ isImporter ? 'EXPECTED PAYMENT' : 'EXPECTED RECEIPT' }}</span><strong>{{ shipmentStore.hasShipment ? shipmentStore.shipment.currency : '—' }}</strong><small>{{ isImporter ? 'Landed-cost view' : 'Export-margin view' }} · no live rates</small></article><article class="metric"><span>DELIVERY SIGNAL</span><strong>Not available</strong><small>Connect a carrier feed</small></article></div>
        <div class="dashboard-panels"><article class="panel chart-panel"><div class="panel-heading"><div><span class="panel-kicker">CURRENCY CONTEXT / DEMO</span><h2>15-day illustrative scenario</h2></div><span class="panel-tag">NOT A FORECAST</span></div><div ref="chartEl" class="chart-canvas" role="img" aria-label="Illustrative currency scenario chart, not a forecast"></div><div class="chart-legend"><span><i class="legend-history"></i>Illustrative history</span><span><i class="legend-scenario"></i>Illustrative scenario</span><span>Market data not connected</span></div></article><article class="panel margin-panel"><span class="panel-kicker">YOUR NEXT STEP</span><h2>{{ shipmentStore.hasShipment ? 'Continue your voyage.' : 'Bring a shipment into view.' }}</h2><p>{{ shipmentStore.hasShipment ? `${shipmentStore.shipment.originPort} → ${shipmentStore.shipment.destinationPort}` : 'Create a shipment analysis to explore the connected risk view.' }}</p><button class="button button-dark" @click="goAnalysis">{{ shipmentStore.hasShipment ? 'View analysis' : 'Start an analysis' }} <span>↗</span></button></article></div>
        <article class="panel recent-panel"><div class="panel-heading"><div><span class="panel-kicker">WORKSPACE</span><h2>Recent activity</h2></div><span class="panel-tag">THIS SESSION</span></div><div v-if="shipmentStore.hasShipment" class="shipment-row"><span class="shipment-code mono">NX / {{ shipmentStore.shipment.currency }}</span><strong>{{ shipmentStore.shipment.originPort }} <span>→</span> {{ shipmentStore.shipment.destinationPort }}</strong><span>{{ shipmentStore.shipment.cargoType }}</span><span class="status-draft">Ready to analyse</span><button @click="router.push('/analysis')">Open ↗</button></div><p v-else class="empty-state">Your analyses will appear here after you add a shipment. No activity has been fabricated.</p></article>
      </template>
      <template v-else-if="activeTab === 'Forecast'">
        <div class="forex-summary">
          <article class="panel forex-recommendation">
            <div class="panel-heading"><div><span class="panel-kicker">USD / INR · MODEL OUTPUT</span><h2>Lowest predicted rate</h2></div><span class="panel-tag">FORECAST WINDOW</span></div>
            <p v-if="forexForecastLoading" class="forex-message" role="status">Loading model predictions…</p>
            <p v-else-if="forexForecastError" class="forex-message forex-error" role="alert">{{ forexForecastError }}</p>
            <template v-else-if="forexForecast">
              <p class="forex-rate">₹{{ Number(forexForecast.lowest_predicted_rate).toFixed(2) }} <span>per USD</span></p>
              <p class="forex-date">Predicted for <strong>{{ formatForecastDate(forexForecast.lowest_predicted_date) }}</strong></p>
              <p class="forex-disclaimer">{{ forexForecast.explanation }}</p>
            </template>
            <p v-else class="forex-message">No prediction loaded. Connect the model API to generate a forecast.</p>
            <button class="button button-dark" :disabled="forexForecastLoading" @click="loadForexForecast">{{ forexForecastLoading ? 'Generating…' : forexForecast ? 'Refresh forecast' : 'Generate forecast' }} <span>↗</span></button>
          </article>
          <article class="panel chart-panel forex-chart-panel">
            <div class="panel-heading"><div><span class="panel-kicker">PREDICTED EXCHANGE RATE</span><h2>USD / INR forecast path</h2></div></div>
            <div v-if="forexForecast" ref="chartEl" class="chart-canvas" role="img" aria-label="USD to INR model prediction chart"></div>
            <div v-else class="chart-empty" role="status">{{ forexForecastLoading ? 'Waiting for model output…' : 'The forecast chart will appear when predictions are available.' }}</div>
          </article>
        </div>
        <article v-if="forexForecast" class="panel recent-panel forex-predictions">
          <div class="panel-heading"><div><span class="panel-kicker">DATED MODEL OUTPUT</span><h2>Predicted rates</h2></div><span class="panel-tag">₹ / USD</span></div>
          <ol>
            <li v-for="point in forexForecast.forecast" :key="point.date" :class="{ 'is-lowest': point.date === forexForecast.lowest_predicted_date }">
              <span>{{ formatForecastDate(point.date) }}</span><strong>₹{{ Number(point.predicted_price).toFixed(2) }}</strong><span v-if="point.date === forexForecast.lowest_predicted_date">Lowest in window</span>
            </li>
          </ol>
        </article>
      </template>
      <template v-else-if="activeTab === 'Routes'"><article class="panel standalone-panel"><span class="panel-kicker">ROUTE COMPARISON</span><h2>Route options follow your shipment.</h2><p>Add or open a shipment analysis to view available comparisons. Route costs and duration will only appear when supported by connected data.</p><button class="button button-dark" @click="goAnalysis">Open shipment analysis ↗</button></article></template>
      <template v-else-if="activeTab === 'Port & weather'"><article class="panel standalone-panel"><span class="panel-kicker">PORT & WEATHER INTELLIGENCE</span><h2>Signal availability, made clear.</h2><p>Live port congestion and route weather feeds are not connected. No live alerts or conditions are shown in this demonstration.</p></article></template>
      <template v-else-if="activeTab === 'Contracts'"><article class="panel standalone-panel"><span class="panel-kicker">CONTRACT RECORDS</span><h2>Verifiable by design.</h2><p>Create a demonstration contract record from an analysis. SHA-256 confirms data integrity only; it does not prove signature identity or agreement authenticity.</p><button class="button button-dark" @click="router.push('/analysis')">Open contract workspace ↗</button></article></template>
      <template v-else-if="activeTab === 'Shipments'"><article class="panel standalone-panel"><span class="panel-kicker">SHIPMENTS / SESSION</span><h2>{{ shipmentStore.hasShipment ? `${shipmentStore.shipment.originPort} → ${shipmentStore.shipment.destinationPort}` : 'No shipment in this session.' }}</h2><p>{{ shipmentStore.hasShipment ? `${shipmentStore.shipment.cargoType} · ${shipmentStore.shipment.quantity} units · ${shipmentStore.shipment.currency} ${Number(shipmentStore.shipment.value).toLocaleString()}` : 'Add a shipment to see its details here.' }}</p><button class="button button-dark" @click="goAnalysis">Open shipment ↗</button></article></template>
      <template v-else><article class="panel standalone-panel"><span class="panel-kicker">PREFERENCES</span><h2>Your workspace, your perspective.</h2><p>Role: {{ userLabel }}. Demo profile settings are stored only for this browser session.</p></article></template>
      <footer class="dash-footer"><span>NIRYAATX · NAVIGATE TRADE. CONTROL RISK.</span><span>DEMO ENVIRONMENT · NOT FINANCIAL ADVICE</span></footer>
    </section>
  </main>
</template>
