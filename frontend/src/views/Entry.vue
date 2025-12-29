<template>
  <div class="page">
    <h2>Vehicle Entry</h2>
    <p>Enter vehicle number manually or use the camera to auto-read the plate.</p>

    <div class="slots">
      <div class="slot-card free single">
        <div v-if="nextFreeSlot">Next free slot: {{ nextFreeSlot.number }}</div>
        <div v-else class="muted">No free slots available</div>

        <input v-model="vehicleInput" placeholder="Vehicle no (type or use camera)" />
        <CameraOCR v-if="nextFreeSlot" @recognized="setVehicle" />

        <div style="margin-top:8px">
          <button @click="bookNextSlot" :disabled="!nextFreeSlot">Book Slot</button>
        </div>

        <div v-if="lastBooked" class="ticket">
          <h4>Ticket</h4>
          <div>Slot: {{ lastBooked.slot.number }}</div>
          <div>Vehicle: {{ lastBooked.slot.vehicle }}</div>
          <div>Entry: {{ formatDate(lastBooked.slot.entryTime) }}</div>
          <div>Ticket ID: {{ lastBooked.transactionId }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import CameraOCR from '../components/CameraOCR.vue'

export default {
  components: { CameraOCR },
  data() {
    return {
      slots: [],
      vehicleInput: '',
      lastBooked: null
    }
  },
  computed: {
    freeSlots() {
      return this.slots.filter(s => s.status === 'FREE')
    },
    nextFreeSlot() {
      const frees = this.freeSlots.slice().sort((a,b) => a.number - b.number)
      return frees.length ? frees[0] : null
    }
  },
  methods: {
    load() {
      axios.get('http://localhost:5000/slots').then(res => (this.slots = res.data))
    },
    async bookNextSlot() {
      const slot = this.nextFreeSlot
      if (!slot) return alert('No free slots')
      const token = localStorage.getItem('token')
      if (!token) { alert('Please login first'); this.$router.push({ name: 'Home' }); return }
      const v = (this.vehicleInput || '').trim()
      if (!v) return alert('Enter vehicle number')
      try {
        const res = await axios.post(`http://localhost:5000/slots/book/${slot._id}`, { vehicle: v })
        this.vehicleInput = ''
        this.load()
        if (res.data && res.data.slot) {
          this.lastBooked = { slot: res.data.slot, transactionId: res.data.transactionId }
        }
      } catch (err) { console.error(err); alert('Booking failed — it may have been taken') }
    },
    setVehicle(text) {
      this.vehicleInput = String(text || '').trim()
    },
    formatDate(dt) {
      if (!dt) return ''
      const d = new Date(dt)
      return d.toLocaleString()
    }
  },
  mounted() {
    this.load()
  }
}
</script>

<style scoped>
.slots { display:flex; gap:12px; flex-wrap:wrap }
.slot-card { padding:10px; border-radius:8px; background:var(--card-bg); color:var(--text); box-shadow:0 6px 18px rgba(0,0,0,0.06) }
.slot-card.single { max-width:420px }
input { margin-top:6px; padding:6px; border-radius:6px; border:1px solid rgba(0,0,0,0.08); width:100% }
button { margin-left:6px; padding:6px 10px; background:var(--btn-bg); color:var(--btn-text); border-radius:6px; border:none }
.ticket { margin-top:8px; background:rgba(0,0,0,0.03); padding:8px; border-radius:6px }
</style>
