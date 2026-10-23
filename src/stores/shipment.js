import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const saved = (() => {
  try {
    return JSON.parse(sessionStorage.getItem('niryaatx-shipment') || 'null')
  } catch {
    return null
  }
})()

export const useShipmentStore = defineStore('shipment', () => {
  const shipment = ref(saved)
  const hasShipment = computed(() => Boolean(shipment.value))
  watch(shipment, (value) => {
    if (value) sessionStorage.setItem('niryaatx-shipment', JSON.stringify(value))
    else sessionStorage.removeItem('niryaatx-shipment')
  }, { deep: true })

  function saveShipment(data) {
    shipment.value = { ...data, createdAt: new Date().toISOString() }
  }

  return { shipment, hasShipment, saveShipment }
})
