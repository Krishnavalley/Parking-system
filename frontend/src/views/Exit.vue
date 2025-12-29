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
      <button @click="clearSearch">Clear</button>
    </div>

    <div class="slots">
      <div v-for="slot in filteredOccupied" :key="slot._id" class="slot-card occupied">
        <div>Slot {{ slot.number }}</div>
        <div>Vehicle: {{ slot.vehicle }}</div>
        <button @click="onPrepareExit(slot)">Exit</button>
        <div v-if="freedInfo[slot._id]" class="receipt">
          <div>Duration: {{ freedInfo[slot._id].durationMinutes }} minutes</div>
          <div>Fee: ₹{{ freedInfo[slot._id].fee }}</div>
        </div>
      </div>
    </div>

    <ConfirmModal
      :visible="modalVisible"
      title="Confirm Exit"
      :message="modalMessage"
      primaryLabel="Proceed"
      secondaryLabel="Cancel"
      @confirm="onConfirmExit"
      @cancel="modalVisible = false"
    />
  </div>
</template>

<script>
import axios from 'axios'
import ConfirmModal from '../components/ConfirmModal.vue'

export default {
  components: { ConfirmModal },
  data() {
    return { slots: [], freedInfo: {}, lastReceipt: null, modalVisible: false, modalMessage: '', pendingExitId: null, search: '' }
  },
  computed: {
    occupiedSlots() { return this.slots.filter(s => s.status === 'OCCUPIED') },
    filteredOccupied() {
      const q = (this.search || '').trim().toLowerCase()
      if (!q) return this.occupiedSlots
      return this.occupiedSlots.filter(s => (s.vehicle || '').toLowerCase().includes(q))
    }
  },
  methods: {
    load() { axios.get('http://localhost:5000/slots').then(res=> this.slots = res.data) },
    async onPrepareExit(slot) {
      const token = localStorage.getItem('token')
      if (!token) { alert('Please login first'); this.$router.push({ name: 'Home' }); return }
      try {
        const est = await axios.get(`http://localhost:5000/slots/estimate/${slot._id}`)
        const minutes = est.data.durationMinutes || 0
        const fee = est.data.fee || 0
        this.modalMessage = `Estimated duration: <strong>${minutes}</strong> minutes<br/>Fee: <strong>₹${fee}</strong>`
        this.pendingExitId = slot._id
        this.modalVisible = true
      } catch (err) {
        console.error(err)
        const msg = err?.response?.data?.error || err.message || 'Estimate failed'
        alert(`Estimate failed: ${msg}`)
      }
    },

    async onConfirmExit() {
      const id = this.pendingExitId
      if (!id) return
      this.modalVisible = false
      try {
        const res = await axios.post(`http://localhost:5000/slots/free/${id}`)
        if (res.data) {
          this.freedInfo[id] = { fee: res.data.fee, durationMinutes: res.data.durationMinutes }
          this.lastReceipt = { slotId: id, fee: res.data.fee, durationMinutes: res.data.durationMinutes }
          // if backend returned the transaction, navigate to Records and pass recent id
          const tx = res.data.transaction
          if (tx && tx._id) {
            this.$router.push({ name: 'Records', query: { recent: tx._id } })
          }
        }
        this.pendingExitId = null
        this.load()
      } catch (err) {
        console.error(err)
        const msg = err?.response?.data?.error || err.message || 'Exit failed'
        alert(`Exit failed: ${msg}`)
      }
    },
    clearSearch() { this.search = '' }
  },
  mounted() { this.load() }
}
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

@media (max-width: 600px) {
  .search-row { flex-direction:column; align-items:stretch }
  .search-row input { width:100% }
  .slots { justify-content:center }
  .slot-card { width:100%; max-width:420px }
}
</style>
