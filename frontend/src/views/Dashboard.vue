<template>
  <div class="page">
    <h2>Dashboard</h2>
    <p class="subtitle">Today's parking overview — auto-refreshes every 30 seconds.</p>

    <div v-if="insightsLoading" class="muted">Loading insights...</div>
    <div v-else-if="insightsError" class="error">{{ insightsError }}</div>

    <div v-else class="insights-grid">
      <div class="insight-card accent">
        <div class="label">Occupancy</div>
        <div class="value">{{ insights.occupancyPercent }}%</div>
        <div class="detail">{{ insights.occupiedSlots }} / {{ insights.totalSlots }} slots</div>
        <div class="bar-bg"><div class="bar-fill" :style="{ width: insights.occupancyPercent + '%' }"></div></div>
      </div>

      <div class="insight-card">
        <div class="label">Entries Today</div>
        <div class="value">{{ insights.todayEntries }}</div>
      </div>

      <div class="insight-card">
        <div class="label">Exits Today</div>
        <div class="value">{{ insights.todayExits }}</div>
      </div>

      <div class="insight-card">
        <div class="label">Revenue Today</div>
        <div class="value">₹{{ insights.todayRevenue }}</div>
      </div>

      <div class="insight-card">
        <div class="label">Avg Duration</div>
        <div class="value">{{ formatDuration(insights.avgDurationMinutes) }}</div>
      </div>

      <div class="insight-card">
        <div class="label">Peak Hour</div>
        <div class="value">{{ formatPeakHour(insights.peakHour) }}</div>
      </div>
    </div>

    <!-- Records section -->
    <h3 class="section-title">Parking Records</h3>
    <RecordsFilter class="edge-to-edge" @apply="applyFilter" @reset="resetFilter" />

    <div v-if="recordsLoading" class="muted">Loading records...</div>
    <div v-if="recordsError" class="error">{{ recordsError }}</div>

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
        <tr v-for="tx in filteredTransactions" :key="tx._id">
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
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import api from '../services/api'
import RecordsFilter from '../components/RecordsFilter.vue'

// --- Insights ---
const insights = ref({})
const insightsLoading = ref(true)
const insightsError = ref('')
let timer = null

async function loadInsights() {
  try {
    const res = await api.get('/insights')
    insights.value = res.data
    insightsError.value = ''
  } catch (err) {
    insightsError.value = err?.response?.data?.error || 'Failed to load insights'
  } finally {
    insightsLoading.value = false
  }
}

// --- Records ---
const transactions = ref([])
const filters = reactive({ vehicle: '', status: 'all', from: '', to: '' })
const recordsLoading = ref(false)
const recordsError = ref('')
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

async function loadRecords(page = 1) {
  recordsLoading.value = true
  recordsError.value = ''
  try {
    const res = await api.get('/transactions', { params: { page, limit: pagination.limit } })
    transactions.value = res.data.transactions
    Object.assign(pagination, res.data.pagination)
  } catch (err) {
    recordsError.value = err?.response?.data?.error || 'Failed to load records'
  } finally {
    recordsLoading.value = false
  }
}

function goPage(p) { loadRecords(p) }
function applyFilter(f) { Object.assign(filters, f) }
function resetFilter() { Object.assign(filters, { vehicle: '', status: 'all', from: '', to: '' }) }

// --- Formatters ---
function formatDuration(mins) {
  if (!mins) return '—'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatPeakHour(hour) {
  if (hour === null || hour === undefined) return '—'
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12} ${suffix}`
}

function formatDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString()
}

onMounted(() => {
  loadInsights()
  loadRecords()
  timer = setInterval(loadInsights, 30_000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.subtitle { color: var(--muted); margin-bottom: 16px }
.section-title { margin-top: 32px; margin-bottom: 12px }

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.insight-card {
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.insight-card.accent {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, var(--primary, #4f46e5) 0%, var(--primary-dark, #3730a3) 100%);
  color: #fff;
  border: none;
}

.insight-card .label {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
  margin-bottom: 4px;
}

.insight-card .value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
}

.insight-card .detail {
  font-size: 14px;
  opacity: 0.85;
  margin-top: 4px;
}

.bar-bg {
  margin-top: 12px;
  height: 8px;
  background: rgba(255,255,255,0.25);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: #fff;
  border-radius: 4px;
  transition: width 0.6s ease;
}

.records { width:100%; border-collapse:collapse; background: var(--card-bg); border-radius:8px; overflow:hidden }
.records th, .records td { border-bottom:1px solid rgba(0,0,0,0.06); padding:10px; text-align:left }
.records th { background: linear-gradient(90deg, rgba(0,0,0,0.02), rgba(0,0,0,0)), var(--nav-bg) }
.error { color:var(--occupied); margin-top:6px; font-size:13px }
.pagination { display:flex; align-items:center; gap:12px; margin-top:16px; justify-content:center }
.pagination button { padding:6px 12px; border-radius:6px; border:1px solid rgba(0,0,0,0.08); background:var(--card-bg); cursor:pointer }
.pagination button:disabled { opacity:0.4; cursor:default }
</style>
