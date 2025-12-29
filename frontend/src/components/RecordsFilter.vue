<template>
  <div class="filter-card">
    <div class="row top">
      <div class="group">
        <label>Vehicle</label>
        <input v-model="form.vehicle" placeholder="Search vehicle (plate)" />
      </div>

      <div class="group">
        <label>Status</label>
        <select v-model="form.status">
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>

    <div class="row">
      <div class="group">
        <label>From</label>
        <input type="date" v-model="form.from" />
      </div>
      <div class="group">
        <label>To</label>
        <input type="date" v-model="form.to" />
      </div>
    </div>

    <div class="actions">
      <button class="btn" @click="onApply">Apply</button>
      <button class="btn link" @click="onReset">Reset</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RecordsFilter',
  data() {
    return {
      form: { vehicle: '', status: 'all', from: '', to: '' }
    }
  },
  methods: {
    onApply() {
      this.$emit('apply', { ...this.form })
    },
    onReset() {
      this.form = { vehicle: '', status: 'all', from: '', to: '' }
      this.$emit('reset')
    }
  }
}
</script>

<style scoped>
.filter-card { width:100%; max-width:100%; background:var(--card-bg); padding:14px; border-radius:12px; box-shadow:0 10px 30px rgba(2,6,23,0.06); display:flex; flex-direction:column; gap:12px; margin:0 0 18px 0; border:1px solid rgba(0,0,0,0.04) }
/* stretch edge-to-edge by negating page padding (App.vue .main uses 20px) */
.filter-card.edge-to-edge { width: calc(100% + 40px); margin-left: -20px; margin-right: -20px; border-radius:0; }
.filter-card .row { display:flex; gap:12px }
.filter-card .row.top { align-items:flex-end }
.filter-card .group { flex:1; display:flex; flex-direction:column }
.filter-card label { font-size:13px; color:var(--muted); margin-bottom:8px; font-weight:600 }
.filter-card input, .filter-card select { padding:10px 12px; border-radius:10px; border:1px solid transparent; background:rgba(0,0,0,0.02); color:var(--text); box-shadow:inset 0 1px 0 rgba(255,255,255,0.02) }
.filter-card input::placeholder { color: rgba(0,0,0,0.35) }
.filter-card input:focus, .filter-card select:focus { outline:none; border-color:var(--accent); box-shadow:0 6px 18px rgba(29,78,216,0.06) }
.actions { display:flex; gap:8px; justify-content:flex-end }
.btn { padding:9px 14px; border-radius:10px; border:none; background:var(--btn-bg); color:var(--btn-text); cursor:pointer; font-weight:600 }
.btn:hover { transform:translateY(-2px); box-shadow:0 10px 26px rgba(29,78,216,0.12) }
.btn.link { background:transparent; color:var(--muted); border:1px solid rgba(0,0,0,0.04); padding:8px 12px }

/* subtle compact look for dark mode */
.dark .filter-card input, .dark .filter-card select { background: rgba(255,255,255,0.02) }
.dark .filter-card { border-color: rgba(255,255,255,0.03) }

@media (max-width:700px) {
  .filter-card .row { flex-direction:column }
  .actions { justify-content:center }
}
</style>
