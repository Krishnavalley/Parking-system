<template>
  <div class="home-page">
    <div class="hero">
      <div class="hero-content">
        <h1>Smart Parking System</h1>
        <p>Manage your parking efficiently — admin controls and reports.</p>
      </div>
    </div>

    <div v-if="!auth.isLoggedIn" class="login-card">
      <h2>Login</h2>
      <input v-model="username" placeholder="Username" @keyup.enter="onLogin" />
      <input v-model="password" type="password" placeholder="Password" @keyup.enter="onLogin" />
      <div v-if="error" class="error">{{ error }}</div>
      <div class="actions">
        <button @click="onLogin" :disabled="loading">{{ loading ? 'Logging in...' : 'Login' }}</button>
      </div>
      <div class="hint">Use <strong>admin</strong> / <strong>admin123</strong> to demo</div>
    </div>

    <div v-else class="home-controls">
      <div class="welcome">Welcome, <strong>{{ auth.username }}</strong> <span class="role-badge">{{ auth.role }}</span></div>

      <!-- USER SECTION — visible to all -->
      <div class="section">
        <h3 class="section-title">My Account</h3>
        <div class="cards-row">
          <div class="card home-card">
            <div class="card-header"><h4>Profile</h4></div>
            <div class="card-body">
              <div class="profile-row"><span class="label-text">Username</span><strong>{{ auth.username }}</strong></div>
              <div class="profile-row"><span class="label-text">Role</span><strong>{{ auth.role }}</strong></div>
            </div>
          </div>

          <div class="card home-card">
            <div class="card-header"><h4>Change Password</h4></div>
            <div class="card-body">
              <div class="row">
                <label>Current Password</label>
                <input v-model="pwd.current" type="password" placeholder="Current password" />
              </div>
              <div class="row">
                <label>New Password</label>
                <input v-model="pwd.next" type="password" placeholder="Min 6 characters" />
              </div>
              <div class="row">
                <label>Confirm</label>
                <input v-model="pwd.confirm" type="password" placeholder="Confirm new password" />
              </div>
            </div>
            <div v-if="pwdError" class="error msg">{{ pwdError }}</div>
            <div v-if="pwdSuccess" class="success msg">{{ pwdSuccess }}</div>
            <div class="card-footer">
              <button class="primary" @click="changePassword" :disabled="changingPwd">
                {{ changingPwd ? 'Changing...' : 'Update Password' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ADMIN SECTION — visible to admin only -->
      <template v-if="auth.isAdmin">

        <div class="section">
          <h3 class="section-title">User Management</h3>
          <div class="cards-row">
            <div class="card home-card">
              <div class="card-header"><h4>Create User</h4></div>
              <div class="card-body">
                <div class="row">
                  <label>Username</label>
                  <input v-model="newUser.username" placeholder="username" />
                </div>
                <div class="row">
                  <label>Password</label>
                  <input v-model="newUser.password" placeholder="Min 6 characters" type="password" />
                </div>
                <div class="row">
                  <label>Role</label>
                  <select v-model="newUser.role">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div v-if="registerError" class="error msg">{{ registerError }}</div>
              <div v-if="registerSuccess" class="success msg">{{ registerSuccess }}</div>
              <div class="card-footer">
                <button class="primary" @click="createUser" :disabled="registering">
                  {{ registering ? 'Creating...' : 'Create User' }}
                </button>
              </div>
            </div>

            <div class="card home-card wide">
              <div class="card-header"><h4>All Users</h4></div>
              <div class="card-body">
                <table class="users-table" v-if="userList.length">
                  <thead><tr><th>Username</th><th>Role</th><th>Actions</th></tr></thead>
                  <tbody>
                    <tr v-for="u in userList" :key="u._id">
                      <td>{{ u.username }}</td>
                      <td><span class="role-badge small">{{ u.role }}</span></td>
                      <td class="actions-cell">
                        <button class="btn-sm" @click="startResetPwd(u)">Reset Pwd</button>
                        <button class="btn-sm danger" @click="deleteUser(u)" :disabled="u.username === auth.username">Delete</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="muted">No users found</div>
              </div>
              <div v-if="userMgmtMsg" class="success msg">{{ userMgmtMsg }}</div>
              <div v-if="userMgmtError" class="error msg">{{ userMgmtError }}</div>
              <div v-if="resetTarget" class="card-body reset-inline">
                <p class="muted" style="margin:0 0 8px">New password for <strong>{{ resetTarget.username }}</strong></p>
                <div class="row">
                  <input v-model="resetPwd" type="password" placeholder="New password (min 6 chars)" />
                </div>
                <div class="card-footer" style="gap:8px">
                  <button class="primary" @click="confirmResetPwd" :disabled="resettingPwd">{{ resettingPwd ? 'Resetting...' : 'Reset' }}</button>
                  <button class="btn-cancel" @click="resetTarget = null">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">User Activity Log</h3>
          <div class="cards-row">
            <div class="card home-card wide">
              <div class="card-body">
                <table class="users-table" v-if="activityLogs.length">
                  <thead><tr><th>User</th><th>Action</th><th>Time</th></tr></thead>
                  <tbody>
                    <tr v-for="log in activityLogs" :key="log._id">
                      <td>{{ log.username }}</td>
                      <td>
                        <span :class="['action-badge', log.action]">{{ log.action }}</span>
                      </td>
                      <td>{{ formatTime(log.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="muted">No activity recorded yet</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">Parking Configuration</h3>
          <div class="cards-row">
            <div class="card home-card">
              <div class="card-header"><h4>Parking Slots</h4></div>
              <div class="card-body">
                <div class="stat-row">
                  <div class="stat"><span class="stat-val">{{ slotInfo.total }}</span><span class="stat-lbl">Total</span></div>
                  <div class="stat"><span class="stat-val occupied">{{ slotInfo.occupied }}</span><span class="stat-lbl">Occupied</span></div>
                  <div class="stat"><span class="stat-val free">{{ slotInfo.free }}</span><span class="stat-lbl">Free</span></div>
                </div>
                <div class="row">
                  <label>Set total slot count</label>
                  <input v-model.number="desiredSlots" type="number" min="1" max="1000" placeholder="e.g. 100" />
                </div>
              </div>
              <div v-if="slotError" class="error msg">{{ slotError }}</div>
              <div v-if="slotSuccess" class="success msg">{{ slotSuccess }}</div>
              <div class="card-footer">
                <button class="primary" @click="adjustSlots" :disabled="adjustingSlots">
                  {{ adjustingSlots ? 'Updating...' : 'Update Slots' }}
                </button>
              </div>
            </div>

            <div class="card home-card">
              <div class="card-header"><h4>Parking Rate</h4></div>
              <div class="card-body">
                <div class="profile-row"><span class="label-text">Current rate</span><strong>₹{{ currentRate }}/hr</strong></div>
                <div class="row">
                  <label>New rate (₹ per hour)</label>
                  <input v-model.number="newRate" type="number" min="1" max="10000" placeholder="e.g. 30" />
                </div>
              </div>
              <div v-if="rateError" class="error msg">{{ rateError }}</div>
              <div v-if="rateSuccess" class="success msg">{{ rateSuccess }}</div>
              <div class="card-footer">
                <button class="primary" @click="updateRate" :disabled="updatingRate">
                  {{ updatingRate ? 'Saving...' : 'Update Rate' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <h3 class="section-title">System Info</h3>
          <div class="cards-row">
            <div class="card home-card">
              <div class="card-body">
                <div class="profile-row"><span class="label-text">Total Users</span><strong>{{ sysInfo.totalUsers }}</strong></div>
                <div class="profile-row"><span class="label-text">Total Slots</span><strong>{{ sysInfo.totalSlots }}</strong></div>
                <div class="profile-row"><span class="label-text">Occupied</span><strong>{{ sysInfo.occupiedSlots }}</strong></div>
                <div class="profile-row"><span class="label-text">Transactions</span><strong>{{ sysInfo.totalTransactions }}</strong></div>
              </div>
            </div>
            <div class="card home-card">
              <div class="card-body">
                <div class="profile-row"><span class="label-text">DB Status</span><strong>{{ sysInfo.dbStatus }}</strong></div>
                <div class="profile-row"><span class="label-text">Uptime</span><strong>{{ sysInfo.serverUptime }}</strong></div>
                <div class="profile-row"><span class="label-text">Node</span><strong>{{ sysInfo.nodeVersion }}</strong></div>
                <div class="profile-row"><span class="label-text">Platform</span><strong>{{ sysInfo.platform }}</strong></div>
              </div>
            </div>
          </div>
        </div>

      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const newUser = reactive({ username: '', password: '', role: 'user' })
const registering = ref(false)
const registerError = ref('')
const registerSuccess = ref('')

// --- Change password ---
const pwd = reactive({ current: '', next: '', confirm: '' })
const changingPwd = ref(false)
const pwdError = ref('')
const pwdSuccess = ref('')

async function changePassword() {
  pwdError.value = ''
  pwdSuccess.value = ''
  if (!pwd.current || !pwd.next) { pwdError.value = 'Fill in all fields'; return }
  if (pwd.next !== pwd.confirm) { pwdError.value = 'New passwords do not match'; return }
  if (pwd.next.length < 6) { pwdError.value = 'New password must be at least 6 characters'; return }
  changingPwd.value = true
  try {
    await api.post('/auth/change-password', { currentPassword: pwd.current, newPassword: pwd.next })
    pwdSuccess.value = 'Password changed successfully'
    Object.assign(pwd, { current: '', next: '', confirm: '' })
  } catch (err) {
    pwdError.value = err?.response?.data?.error || 'Failed to change password'
  } finally {
    changingPwd.value = false
  }
}

// --- Slot management (admin) ---
const slotInfo = reactive({ total: 0, occupied: 0, free: 0 })
const desiredSlots = ref('')
const adjustingSlots = ref(false)
const slotError = ref('')
const slotSuccess = ref('')

async function loadSlotInfo() {
  try {
    const res = await api.get('/slots')
    const all = res.data
    slotInfo.total = all.length
    slotInfo.occupied = all.filter(s => s.status === 'OCCUPIED').length
    slotInfo.free = all.filter(s => s.status === 'FREE').length
    desiredSlots.value = all.length
  } catch { /* ignore */ }
}

async function adjustSlots() {
  slotError.value = ''
  slotSuccess.value = ''
  const num = parseInt(desiredSlots.value, 10)
  if (!num || num < 1) { slotError.value = 'Enter a valid number (1+)'; return }
  adjustingSlots.value = true
  try {
    const res = await api.post('/slots/adjust', { totalSlots: num })
    slotSuccess.value = res.data.message
    await loadSlotInfo()
  } catch (err) {
    slotError.value = err?.response?.data?.error || 'Failed to adjust slots'
  } finally {
    adjustingSlots.value = false
  }
}

async function onLogin() {
  const u = username.value.trim()
  const p = password.value
  if (!u || !p) { error.value = 'Enter credentials'; return }
  loading.value = true
  error.value = ''
  try {
    const data = await auth.login(u, p)
    if (data.role === 'admin') router.push({ name: 'Dashboard' })
    else router.push({ name: 'Entry' })
  } catch (err) {
    error.value = err?.response?.data?.error || 'Login failed'
  } finally {
    loading.value = false
  }
}

async function createUser() {
  if (!newUser.username || !newUser.password) { registerError.value = 'Provide username and password'; return }
  registering.value = true
  registerError.value = ''
  registerSuccess.value = ''
  try {
    const res = await api.post('/auth/register', newUser)
    registerSuccess.value = `Created user "${res.data.username}"`
    Object.assign(newUser, { username: '', password: '', role: 'user' })
    await loadUsers()
  } catch (err) {
    registerError.value = err?.response?.data?.error || 'Create failed'
  } finally {
    registering.value = false
  }
}

// --- User management (admin) ---
const userList = ref([])
const userMgmtMsg = ref('')
const userMgmtError = ref('')
const resetTarget = ref(null)
const resetPwd = ref('')
const resettingPwd = ref(false)

async function loadUsers() {
  try {
    const res = await api.get('/auth/users')
    userList.value = res.data
  } catch { /* ignore */ }
}

async function deleteUser(u) {
  if (!confirm(`Delete user "${u.username}"?`)) return
  userMgmtMsg.value = ''
  userMgmtError.value = ''
  try {
    const res = await api.delete(`/auth/users/${u._id}`)
    userMgmtMsg.value = res.data.message
    await loadUsers()
  } catch (err) {
    userMgmtError.value = err?.response?.data?.error || 'Delete failed'
  }
}

function startResetPwd(u) {
  resetTarget.value = u
  resetPwd.value = ''
  userMgmtMsg.value = ''
  userMgmtError.value = ''
}

async function confirmResetPwd() {
  if (!resetPwd.value || resetPwd.value.length < 6) { userMgmtError.value = 'Password must be at least 6 characters'; return }
  resettingPwd.value = true
  try {
    const res = await api.post(`/auth/users/${resetTarget.value._id}/reset-password`, { newPassword: resetPwd.value })
    userMgmtMsg.value = res.data.message
    resetTarget.value = null
    resetPwd.value = ''
  } catch (err) {
    userMgmtError.value = err?.response?.data?.error || 'Reset failed'
  } finally {
    resettingPwd.value = false
  }
}

// --- Parking rate (admin) ---
const currentRate = ref(0)
const newRate = ref('')
const updatingRate = ref(false)
const rateError = ref('')
const rateSuccess = ref('')

async function loadRate() {
  try {
    const res = await api.get('/settings/rate')
    currentRate.value = res.data.ratePerHour
    newRate.value = res.data.ratePerHour
  } catch { /* ignore */ }
}

async function updateRate() {
  rateError.value = ''
  rateSuccess.value = ''
  const r = parseFloat(newRate.value)
  if (!r || r < 1) { rateError.value = 'Enter a valid rate (1+)'; return }
  updatingRate.value = true
  try {
    const res = await api.post('/settings/rate', { ratePerHour: r })
    rateSuccess.value = res.data.message
    currentRate.value = res.data.ratePerHour
  } catch (err) {
    rateError.value = err?.response?.data?.error || 'Failed to update rate'
  } finally {
    updatingRate.value = false
  }
}

// --- System info (admin) ---
const sysInfo = reactive({ totalUsers: 0, totalSlots: 0, occupiedSlots: 0, totalTransactions: 0, dbStatus: '—', serverUptime: '—', nodeVersion: '—', platform: '—' })

async function loadSysInfo() {
  try {
    const res = await api.get('/settings/info')
    Object.assign(sysInfo, res.data)
  } catch { /* ignore */ }
}

// --- Activity log (admin) ---
const activityLogs = ref([])

async function loadActivityLogs() {
  try {
    const res = await api.get('/activity')
    activityLogs.value = res.data
  } catch { /* ignore */ }
}

function formatTime(iso) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${date}, ${time}`
}

onMounted(() => {
  if (auth.isLoggedIn && auth.isAdmin) {
    loadSlotInfo()
    loadUsers()
    loadRate()
    loadSysInfo()
    loadActivityLogs()
  }
})
</script>

<style scoped>
.home-page { min-height:100vh; display:flex; flex-direction:column; align-items:center; gap:28px; background:var(--bg); color:var(--text); padding:24px }
.hero { width:100%; display:flex; justify-content:center }
.hero-content { max-width:900px; text-align:center }
.hero-content h1 { font-size:36px; margin:0 0 8px; letter-spacing:0.6px }
.hero-content p { margin:0; opacity:0.85 }

.login-card { width:360px; background:var(--card-bg); box-shadow:0 12px 30px rgba(2,6,23,0.12); padding:22px; border-radius:12px; text-align:center }
.login-card h2 { margin:0 0 12px }
.login-card input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid rgba(0,0,0,0.06); margin-bottom:10px; box-sizing:border-box }
.login-card .actions { display:flex; justify-content:center }
.login-card button { padding:8px 16px; border-radius:8px; border:none; background:var(--btn-bg); color:var(--btn-text); cursor:pointer }
.login-card .hint { margin-top:10px; font-size:12px; opacity:0.8 }
.error { color:#dc2626; margin-top:6px; font-size:13px }

@media (max-width:600px) {
  .home-page { padding:18px }
  .hero-content h1 { font-size:28px }
  .login-card { width:92% }
}
</style>

<style scoped>
.home-controls { display:flex; flex-direction:column; align-items:stretch; gap:24px; width:100%; max-width:900px }
.welcome { font-size:18px; display:flex; align-items:center; gap:8px }
.role-badge { display:inline-block; font-size:11px; padding:2px 8px; border-radius:10px; background:var(--accent); color:#fff; font-weight:600; text-transform:uppercase }
.role-badge.small { font-size:10px; padding:1px 6px }

.section { display:flex; flex-direction:column; gap:12px }
.section-title { margin:0; font-size:16px; letter-spacing:0.4px; border-bottom:2px solid var(--accent); padding-bottom:4px; color:var(--accent) }
.cards-row { display:flex; flex-wrap:wrap; gap:16px }
.card.home-card { flex:1; min-width:280px; max-width:420px; background:var(--card-bg); padding:16px; border-radius:10px; box-shadow:0 8px 20px rgba(2,6,23,0.12) }
.card.home-card.wide { min-width:100%; max-width:100% }
.profile-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(0,0,0,0.04); font-size:14px }
.label-text { color:var(--muted) }
.msg { padding:0 16px; font-size:13px; margin-top:6px }
.success { color:#16a34a }
.muted { color:var(--muted); font-size:13px }

.stat-row { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:10px; text-align:center }
.stat { display:flex; flex-direction:column }
.stat-val { font-size:22px; font-weight:700 }
.stat-val.occupied { color:#f59e0b }
.stat-val.free { color:#16a34a }
.stat-lbl { font-size:11px; color:var(--muted); text-transform:uppercase }

.users-table { width:100%; border-collapse:collapse; font-size:14px }
.users-table th, .users-table td { padding:8px; text-align:left; border-bottom:1px solid rgba(0,0,0,0.05) }
.users-table th { font-size:12px; color:var(--muted); text-transform:uppercase }
.actions-cell { display:flex; gap:6px }
.btn-sm { font-size:12px; padding:4px 8px; border-radius:6px; border:1px solid rgba(0,0,0,0.08); background:var(--card-bg); cursor:pointer }
.btn-sm:hover { background:var(--accent); color:#fff; border-color:var(--accent) }
.btn-sm.danger { color:#dc2626; border-color:rgba(220,38,38,0.2) }
.btn-sm.danger:hover { background:#dc2626; color:#fff }
.btn-sm:disabled { opacity:0.3; cursor:default }
.btn-cancel { background:transparent; border:1px solid rgba(0,0,0,0.08); padding:6px 12px; border-radius:8px; cursor:pointer }
.reset-inline { border-top:1px solid rgba(0,0,0,0.06); margin-top:8px; padding-top:12px }

.action-badge { display:inline-block; font-size:11px; padding:2px 8px; border-radius:10px; font-weight:600; text-transform:uppercase }
.action-badge.login { background:#dcfce7; color:#16a34a }
.action-badge.logout { background:#fee2e2; color:#dc2626 }

.card-header h4 { margin:0 0 6px; font-size:15px }
.card-body .row { display:flex; flex-direction:column; align-items:stretch; gap:8px; margin-bottom:10px }
.card-body .row label { color:var(--muted); font-size:13px; margin-bottom:4px }
.card-body .row input, .card-body .row select { width:100%; padding:8px 10px; border-radius:8px; border:1px solid rgba(0,0,0,0.06); box-sizing:border-box }
.card-footer { display:flex; justify-content:center }
.card-footer .primary { background:var(--btn-bg); color:var(--btn-text); border:none; padding:8px 12px; border-radius:8px; cursor:pointer }

@media (max-width:600px) {
  .card.home-card { min-width:100% }
  .actions-cell { flex-direction:column }
}
</style>
