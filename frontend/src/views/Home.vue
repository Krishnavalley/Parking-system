<template>
  <div class="home-page">
    <div class="hero">
      <div class="hero-content">
        <h1>Smart Parking System</h1>
        <p>Manage your parking efficiently — admin controls and reports.</p>
      </div>
    </div>

    <div v-if="!isLogged" class="login-card">
      <h2>Login</h2>
      <input v-model="username" placeholder="Username" />
      <input v-model="password" type="password" placeholder="Password" />
      <div class="actions">
        <button @click="onLogin">Login</button>
      </div>
      <div class="hint">Use <strong>admin</strong> / <strong>admin123</strong> to demo</div>
    </div>

    <div v-else class="home-controls">
      <div class="welcome">Welcome, <strong>{{ currentUser }}</strong></div>
      <div v-if="isAdmin" class="admin-panel">
        <div class="card register-card">
          <div class="card-header">
            <h3>Create new user</h3>
          </div>
          <div class="card-body">
            <div class="row">
              <label>Username</label>
              <input v-model="newUser.username" placeholder="username" />
            </div>
            <div class="row">
              <label>Password</label>
              <input v-model="newUser.password" placeholder="password" type="password" />
            </div>
            <div class="row">
              <label>Role</label>
              <select v-model="newUser.role">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div class="card-footer">
            <button class="primary" @click="createUser">Create new user</button>
          </div>
        </div>
      </div>
      <div v-else class="user-links">
        <button @click="$router.push({ name: 'Entry' })">Go to Entry</button>
        <button @click="$router.push({ name: 'Exit' })">Go to Exit</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  data() {
    return { username: '', password: '', newUser: { username: '', password: '', role: 'user' } }
  },
  computed: {
    isLogged() { return !!localStorage.getItem('token') },
    isAdmin() { return localStorage.getItem('role') === 'admin' },
    currentUser() { return localStorage.getItem('username') || '' }
  },
  methods: {
    async onLogin() {
      const u = (this.username || '').trim()
      const p = this.password || ''
      if (!u || !p) return alert('Enter credentials')
      try {
        const res = await fetch('http://localhost:5000/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p })
        })
        const data = await res.json()
        if (!res.ok) return alert(data?.error || 'Login failed')
        const token = data.token
        const role = data.role
        localStorage.setItem('token', token)
        localStorage.setItem('role', role)
        localStorage.setItem('username', u)
        // set axios default for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        // notify other parts of the app
        window.dispatchEvent(new Event('auth-changed'))
        // navigate
        if (role === 'admin') this.$router.push({ name: 'Records' })
        else this.$router.push({ name: 'Entry' })
      } catch (err) {
        console.error(err)
        alert('Login failed')
      }
    },
    async createUser() {
      if (!this.newUser.username || !this.newUser.password) return alert('Provide username and password')
      try {
        const res = await axios.post('http://localhost:5000/auth/register', this.newUser)
        alert(`Created user ${res.data.username}`)
        this.newUser = { username: '', password: '', role: 'user' }
      } catch (err) {
        console.error(err)
        alert(err?.response?.data?.error || 'Create failed')
      }
    }
  }
}
</script>

<style scoped>
.home-page { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:28px; background:var(--bg); color:var(--text); padding:24px }
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

@media (max-width:600px) {
  .home-page { padding:18px }
  .hero-content h1 { font-size:28px }
  .login-card { width:92% }
}
</style>

<style scoped>
.home-controls { display:flex; flex-direction:column; align-items:center; gap:18px }
.welcome { align-self:flex-start; font-size:18px }
.card.register-card { width:420px; max-width:92%; background:var(--card-bg); padding:16px; border-radius:10px; box-shadow:0 8px 20px rgba(2,6,23,0.12); }
.card-header h3 { margin:0 0 6px }
.card-header .muted { margin:0 0 10px; color:var(--muted); font-size:13px }
.card-body .row { display:flex; flex-direction:column; align-items:stretch; gap:8px; margin-bottom:10px }
.card-body .row label { color:var(--muted); font-size:13px; margin-bottom:4px }
.card-body .row input, .card-body .row select { width:100%; padding:8px 10px; border-radius:8px; border:1px solid rgba(0,0,0,0.06); box-sizing:border-box }
.card-footer { display:flex; justify-content:center }
.card-footer .primary { background:var(--btn-bg); color:var(--btn-text); border:none; padding:8px 12px; border-radius:8px; cursor:pointer }

@media (min-width:900px) {
  .card.register-card { width:420px }
}

@media (max-width:600px) {
  .card.register-card { padding:12px }
}
</style>
