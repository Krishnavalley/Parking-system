<template>
  <div class="page">
    <h2>Parking Records</h2>
    <p>All entry/exit transactions.</p>

    <RecordsFilter class="edge-to-edge" @apply="applyFilter" @reset="resetFilter" />

    <table class="records">
      <thead>
        <tr>
          <th>Ticket</th>
          <th>Slot</th>
          <th>Vehicle</th>
          <th>Entry Time</th>
          <th>Exit Time</th>
          <th>Duration (min)</th>
          <th>Fee</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tx in filteredTransactions" :key="tx._id" :data-id="tx._id">
          <td>{{ tx._id }}</td>
          <td>{{ tx.slot?.number || '-' }}</td>
          <td>{{ tx.vehicle }}</td>
          <td>{{ formatDate(tx.entryTime) }}</td>
          <td>{{ formatDate(tx.exitTime) }}</td>
          <td>{{ tx.durationMinutes || '-' }}</td>
          <td v-if="tx.fee">₹{{ tx.fee }}</td>
          <td v-else>-</td>
          <td>{{ tx.status }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import axios from 'axios'
import RecordsFilter from '../components/RecordsFilter.vue'

export default {
  components: { RecordsFilter },
  data() {
    return { transactions: [], recentId: null, filters: { vehicle: '', status: 'all', from: '', to: '' } }
  },
  computed: {
    isAdmin() { return localStorage.getItem('role') === 'admin' },
    filteredTransactions() {
      return this.transactions.filter(tx => {
        // vehicle filter
        if (this.filters.vehicle) {
          const needle = this.filters.vehicle.toLowerCase()
          if (!tx.vehicle || !tx.vehicle.toLowerCase().includes(needle)) return false
        }
        // status filter
        if (this.filters.status && this.filters.status !== 'all') {
          if ((tx.status || '').toLowerCase() !== this.filters.status.toLowerCase()) return false
        }
        // date range filter (entryTime)
        if (this.filters.from) {
          const from = new Date(this.filters.from)
          const entry = tx.entryTime ? new Date(tx.entryTime) : null
          if (!entry || entry < from) return false
        }
        if (this.filters.to) {
          const to = new Date(this.filters.to)
          // include entire day
          to.setHours(23,59,59,999)
          const entry = tx.entryTime ? new Date(tx.entryTime) : null
          if (!entry || entry > to) return false
        }
        return true
      })
    }
  },
  methods: {
    load() {
      axios.get('http://localhost:5000/transactions').then(res => (this.transactions = res.data)).catch(err => console.error(err))
    },
    applyFilter(f) {
      this.filters = { ...f }
    },
    resetFilter() {
      this.filters = { vehicle: '', status: 'all', from: '', to: '' }
    },
    formatDate(dt) { if (!dt) return '-'; return new Date(dt).toLocaleString() }
  },
  async mounted() {
    this.recentId = this.$route.query.recent || null
    await this.load()
    // if recentId present, scroll to and highlight it
    if (this.recentId) {
      this.$nextTick(() => {
        const el = document.querySelector(`tr[key="${this.recentId}"]`) || document.querySelector(`tr[data-id='${this.recentId}']`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('highlight')
          setTimeout(() => el.classList.remove('highlight'), 5000)
        }
      })
    }
  }
}
</script>

<style scoped>
.records { width:100%; border-collapse:collapse; background: var(--card-bg); border-radius:8px; overflow:hidden }
.records th, .records td { border-bottom:1px solid rgba(0,0,0,0.06); padding:10px; text-align:left }
.records th { background: linear-gradient(90deg, rgba(0,0,0,0.02), rgba(0,0,0,0)), var(--nav-bg) }
.highlight { background: linear-gradient(90deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02)); transition: background 0.3s }
</style>
