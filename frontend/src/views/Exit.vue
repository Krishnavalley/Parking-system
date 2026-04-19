<template>
  <div class="page">
    <h2>Vehicle Exit</h2>
    <p>Shows occupied slots so you can free them.</p>

    <div v-if="lastReceipt" class="last-receipt">
      <h3>Last Receipt</h3>
      <div>Slot ID: {{ lastReceipt.slotId }}</div>
      <div>Duration: {{ lastReceipt.durationMinutes }} minutes</div>
      <div>Fee: ₹{{ lastReceipt.fee }}</div>
    </div>

    <div class="search-row">
      <input v-model="search" placeholder="Search by vehicle number" />
      <button @click="search = ''">Clear</button>
    </div>

    <div v-if="loading" class="muted">Loading slots...</div>

    <div class="slots">
      <div v-for="slot in filteredOccupied" :key="slot._id" class="slot-card occupied">
        <div>Slot {{ slot.number }}</div>
        <div>Vehicle: {{ slot.vehicle }}</div>
        <button @click="onPrepareExit(slot)" :disabled="estimating">Exit</button>
        <div v-if="freedInfo[slot._id]" class="receipt">
          <div>Duration: {{ freedInfo[slot._id].durationMinutes }} minutes</div>
          <div>Fee: ₹{{ freedInfo[slot._id].fee }}</div>
        </div>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <ConfirmModal
      :visible="modalVisible"
      title="Confirm Exit"
      primaryLabel="Proceed"
      secondaryLabel="Cancel"
      @confirm="onConfirmExit"
      @cancel="modalVisible = false"
    >
      <p>Estimated duration: <strong>{{ estimatedMinutes }}</strong> minutes</p>
      <p>Fee: <strong>₹{{ estimatedFee }}</strong></p>
    </ConfirmModal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import ConfirmModal from '../components/ConfirmModal.vue'

const router = useRouter()
const auth = useAuthStore()

const slots = ref([])
const freedInfo = reactive({})
const lastReceipt = ref(null)
const modalVisible = ref(false)
const pendingExitId = ref(null)
const search = ref('')
const loading = ref(false)
const estimating = ref(false)
const error = ref('')
const estimatedMinutes = ref(0)
const estimatedFee = ref(0)

const occupiedSlots = computed(() => slots.value.filter(s => s.status === 'OCCUPIED'))
const filteredOccupied = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return occupiedSlots.value
  return occupiedSlots.value.filter(s => (s.vehicle || '').toLowerCase().includes(q))
})

function load() {
  loading.value = true
  api.get('/slots').then(res => (slots.value = res.data)).catch(() => {}).finally(() => (loading.value = false))
}

async function onPrepareExit(slot) {
  if (!auth.isLoggedIn) { router.push({ name: 'Home' }); return }
  estimating.value = true
  error.value = ''
  try {
    const est = await api.get(`/slots/estimate/${slot._id}`)
    estimatedMinutes.value = est.data.durationMinutes || 0
    estimatedFee.value = est.data.fee || 0
    pendingExitId.value = slot._id
    modalVisible.value = true
  } catch (err) {
    error.value = err?.response?.data?.error || err.message || 'Estimate failed'
  } finally {
    estimating.value = false
  }
}

async function onConfirmExit() {
  const id = pendingExitId.value
  if (!id) return
  modalVisible.value = false
  error.value = ''
  try {
    const res = await api.post(`/slots/free/${id}`)
    if (res.data) {
      freedInfo[id] = { fee: res.data.fee, durationMinutes: res.data.durationMinutes }
      lastReceipt.value = { slotId: id, fee: res.data.fee, durationMinutes: res.data.durationMinutes }
      const tx = res.data.transaction
      if (tx?._id) {
        router.push({ name: 'Records', query: { recent: tx._id } })
      }
    }
    pendingExitId.value = null
    load()
  } catch (err) {
    error.value = err?.response?.data?.error || err.message || 'Exit failed'
  }
}

onMounted(load)
</script>

<style scoped>
.search-row { display:flex; gap:8px; align-items:center; margin-bottom:18px }
.search-row input { padding:8px 10px; border-radius:6px; border:1px solid rgba(0,0,0,0.08); min-width:220px; max-width:420px }
.search-row button { padding:6px 10px; border-radius:6px }

.slots { display:flex; gap:16px; flex-wrap:wrap; margin-top:6px }
.slot-card { padding:12px; width:230px; min-height:110px; box-sizing:border-box; border-radius:10px; background:var(--card-bg); color:var(--text); box-shadow:0 6px 18px rgba(0,0,0,0.06) }
.slot-card.occupied { background: linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0)), var(--occupied) }
button { margin-top:8px; padding:6px 10px; background:var(--btn-bg); color:var(--btn-text); border:none; border-radius:6px }
.last-receipt { margin-bottom:12px; padding:10px; background:var(--card-bg); border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,0.04) }
.receipt { margin-top:8px; background:rgba(0,0,0,0.03); padding:8px; border-radius:6px }
.error { color:var(--occupied); margin-top:6px; font-size:13px }

@media (max-width: 600px) {
  .search-row { flex-direction:column; align-items:stretch }
  .search-row input { width:100% }
  .slots { justify-content:center }
  .slot-card { width:100%; max-width:420px }
}
</style>
