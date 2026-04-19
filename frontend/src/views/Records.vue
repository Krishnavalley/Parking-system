<template>
  <div class="page">
    <h2>Parking Records</h2>
    <p>All entry/exit transactions.</p>

    <RecordsFilter class="edge-to-edge" @apply="applyFilter" @reset="resetFilter" />

    <div v-if="loading" class="muted">Loading records...</div>
    <div v-if="error" class="error">{{ error }}</div>

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

    <div v-if="pagination.totalPages > 1" class="pagination">
      <button :disabled="pagination.page <= 1" @click="goPage(pagination.page - 1)">Prev</button>
      <span>Page {{ pagination.page }} / {{ pagination.totalPages }}</span>
      <button :disabled="pagination.page >= pagination.totalPages" @click="goPage(pagination.page + 1)">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import RecordsFilter from '../components/RecordsFilter.vue'

const route = useRoute()

const transactions = ref([])
const recentId = ref(null)
const filters = reactive({ vehicle: '', status: 'all', from: '', to: '' })
const loading = ref(false)
const error = ref('')
const pagination = reactive({ page: 1, limit: 50, total: 0, totalPages: 1 })

const filteredTransactions = computed(() => {
  return transactions.value.filter(tx => {
    if (filters.vehicle) {
      const needle = filters.vehicle.toLowerCase()
      if (!tx.vehicle || !tx.vehicle.toLowerCase().includes(needle)) return false
    }
    if (filters.status && filters.status !== 'all') {
      if ((tx.status || '').toLowerCase() !== filters.status.toLowerCase()) return false
    }
    if (filters.from) {
      const from = new Date(filters.from)
      const entry = tx.entryTime ? new Date(tx.entryTime) : null
      if (!entry || entry < from) return false
    }
    if (filters.to) {
      const to = new Date(filters.to)
      to.setHours(23, 59, 59, 999)
      const entry = tx.entryTime ? new Date(tx.entryTime) : null
      if (!entry || entry > to) return false
    }
    return true
  })
})

async function load(page = 1) {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get('/transactions', { params: { page, limit: pagination.limit } })
    transactions.value = res.data.transactions
    Object.assign(pagination, res.data.pagination)
  } catch (err) {
    error.value = err?.response?.data?.error || 'Failed to load records'
  } finally {
    loading.value = false
  }
}

function goPage(p) {
  load(p)
}

function applyFilter(f) {
  Object.assign(filters, f)
}

function resetFilter() {
  Object.assign(filters, { vehicle: '', status: 'all', from: '', to: '' })
}

function formatDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString()
}

onMounted(async () => {
  recentId.value = route.query.recent || null
  await load()
  if (recentId.value) {
    nextTick(() => {
      const el = document.querySelector(`tr[data-id='${CSS.escape(recentId.value)}']`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('highlight')
        setTimeout(() => el.classList.remove('highlight'), 5000)
      }
    })
  }
})
</script>

<style scoped>
.records { width:100%; border-collapse:collapse; background: var(--card-bg); border-radius:8px; overflow:hidden }
.records th, .records td { border-bottom:1px solid rgba(0,0,0,0.06); padding:10px; text-align:left }
.records th { background: linear-gradient(90deg, rgba(0,0,0,0.02), rgba(0,0,0,0)), var(--nav-bg) }
.highlight { background: linear-gradient(90deg, rgba(99,102,241,0.08), rgba(99,102,241,0.02)); transition: background 0.3s }
.error { color:var(--occupied); margin-top:6px; font-size:13px }
.pagination { display:flex; align-items:center; gap:12px; margin-top:16px; justify-content:center }
.pagination button { padding:6px 12px; border-radius:6px; border:1px solid rgba(0,0,0,0.08); background:var(--card-bg); cursor:pointer }
.pagination button:disabled { opacity:0.4; cursor:default }
</style>
