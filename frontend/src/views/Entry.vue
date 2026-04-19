<template>
  <div class="page">
    <h2>Vehicle Entry</h2>
    <p>Enter vehicle number manually or use the camera to auto-read the plate.</p>

    <div class="entry-layout">
      <!-- Camera section — always visible -->
      <div class="camera-section">
        <h4>Scan License Plate</h4>
        <CameraOCR @recognized="setVehicle" />
      </div>

      <!-- Booking section -->
      <div class="booking-section">
        <div class="slot-card">
          <div v-if="nextFreeSlot" class="slot-badge free">Next free slot: <strong>#{{ nextFreeSlot.number }}</strong> <span class="slot-count">({{ freeSlots.length }} of {{ slots.length }} free)</span></div>
          <div v-else class="slot-badge full">No free slots available</div>

          <div class="input-group">
            <label>Vehicle Number</label>
            <input v-model="vehicleInput" placeholder="e.g. KA01AB1234" @keyup.enter="bookNextSlot" />
          </div>

          <button class="book-btn" @click="bookNextSlot" :disabled="!nextFreeSlot || booking">
            {{ booking ? 'Booking...' : 'Book Slot' }}
          </button>

          <div v-if="error" class="error">{{ error }}</div>
        </div>

        <div v-if="lastBooked" class="ticket">
          <h4>Booking Confirmed</h4>
          <div class="ticket-row"><span>Slot</span><strong>{{ lastBooked.slot.number }}</strong></div>
          <div class="ticket-row"><span>Vehicle</span><strong>{{ lastBooked.slot.vehicle }}</strong></div>
          <div class="ticket-row"><span>Entry</span><strong>{{ formatDate(lastBooked.slot.entryTime) }}</strong></div>
          <div class="ticket-row"><span>Ticket ID</span><strong class="ticket-id">{{ lastBooked.transactionId }}</strong></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import CameraOCR from '../components/CameraOCR.vue'
import { cleanPlate } from '../services/plateCleanup'

const router = useRouter()
const auth = useAuthStore()

const slots = ref([])
const vehicleInput = ref('')
const lastBooked = ref(null)
const booking = ref(false)
const error = ref('')

const freeSlots = computed(() => slots.value.filter(s => s.status === 'FREE'))
const nextFreeSlot = computed(() => {
  const sorted = freeSlots.value.slice().sort((a, b) => a.number - b.number)
  return sorted.length ? sorted[0] : null
})

function load() {
  api.get('/slots').then(res => (slots.value = res.data)).catch(() => {})
}

async function bookNextSlot() {
  const slot = nextFreeSlot.value
  if (!slot) return
  if (!auth.isLoggedIn) { router.push({ name: 'Home' }); return }
  const v = cleanPlate(vehicleInput.value.trim())
  if (!v) { error.value = 'Enter vehicle number'; return }
  vehicleInput.value = v
  booking.value = true
  error.value = ''
  try {
    const res = await api.post(`/slots/book/${slot._id}`, { vehicle: v })
    vehicleInput.value = ''
    load()
    if (res.data?.slot) {
      lastBooked.value = { slot: res.data.slot, transactionId: res.data.transactionId }
    }
  } catch (err) {
    error.value = err?.response?.data?.error || 'Booking failed — slot may have been taken'
  } finally {
    booking.value = false
  }
}

function setVehicle(text) {
  vehicleInput.value = String(text || '').trim()
}

function formatDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString()
}

onMounted(load)
</script>

<style scoped>
.entry-layout { display:flex; gap:24px; flex-wrap:wrap; align-items:flex-start }

.camera-section { flex:1; min-width:320px; background:var(--card-bg); padding:16px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.06) }
.camera-section h4 { margin:0 0 10px; font-size:15px }

.booking-section { flex:1; min-width:280px; display:flex; flex-direction:column; gap:16px }

.slot-card { padding:18px; border-radius:12px; background:var(--card-bg); box-shadow:0 6px 18px rgba(0,0,0,0.06) }
.slot-badge { padding:6px 12px; border-radius:8px; font-size:14px; margin-bottom:12px; display:inline-block }
.slot-badge.free { background:rgba(22,160,133,0.1); color:var(--free) }
.slot-count { font-size:12px; opacity:0.7; font-weight:normal }
.slot-badge.full { background:rgba(220,38,38,0.1); color:var(--occupied) }

.input-group { display:flex; flex-direction:column; gap:4px; margin-bottom:12px }
.input-group label { font-size:13px; color:var(--muted); font-weight:600 }
.input-group input { padding:10px 12px; border-radius:8px; border:1px solid rgba(0,0,0,0.08); width:100%; box-sizing:border-box; font-size:15px }

.book-btn { width:100%; padding:10px; background:var(--btn-bg); color:var(--btn-text); border-radius:8px; border:none; font-weight:600; cursor:pointer; font-size:15px }
.book-btn:disabled { opacity:0.5; cursor:default }

.error { color:var(--occupied); margin-top:8px; font-size:13px }

.ticket { background:var(--card-bg); padding:16px; border-radius:12px; box-shadow:0 6px 18px rgba(0,0,0,0.06); border-left:4px solid var(--free) }
.ticket h4 { margin:0 0 10px; color:var(--free) }
.ticket-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid rgba(0,0,0,0.04); font-size:14px }
.ticket-row span { color:var(--muted) }
.ticket-id { font-size:11px; word-break:break-all }

@media (max-width:700px) {
  .entry-layout { flex-direction:column }
  .camera-section, .booking-section { min-width:100% }
}
</style>
