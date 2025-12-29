<template>
  <div :class="[{ dark: isDark }, 'app-root']">
    <nav class="nav">
      <div class="nav-left">
        <router-link to="/">Home</router-link>
        <router-link to="/entry">Entry</router-link>
        <router-link to="/exit">Exit</router-link>
        <router-link to="/records">Records</router-link>
      </div>
      <div class="nav-right">
        <div class="theme-switch">
          <input id="theme-checkbox" type="checkbox" v-model="isDark" @change="toggleTheme" />
          <label for="theme-checkbox" class="switch-label">
            <span class="sun">☀️</span>
            <span class="toggle-knob" aria-hidden></span>
            <span class="moon">🌙</span>
          </label>
        </div>
        <button v-if="isLogged" class="logout-btn" @click="logout">Logout</button>
      </div>
    </nav>

    <main class="main">
      <router-view />
    </main>
    <!-- Footer removed -->
  </div>
</template>

<script>
import axios from 'axios'

export default {
  data() {
    return { isDark: false, isLogged: false, username: '' }
  },
  created() {
    const saved = localStorage.getItem('theme')
    this.isDark = saved === 'dark' || (saved === null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
    this.isLogged = !!localStorage.getItem('token')
    this.username = localStorage.getItem('username') || ''
    // listen for auth changes (other tabs or login/logout)
    window.addEventListener('storage', this.onAuthChange)
    window.addEventListener('auth-changed', this.onAuthChange)
  },
  unmounted() {
    window.removeEventListener('storage', this.onAuthChange)
    window.removeEventListener('auth-changed', this.onAuthChange)
  },
  methods: {
    onAuthChange: function() {
      this.isLogged = !!localStorage.getItem('token')
      this.username = localStorage.getItem('username') || ''
      // also react to theme changes from other tabs
      const saved = localStorage.getItem('theme')
      this.isDark = saved === 'dark'
    },
    toggleTheme() {
      // v-model already updated `isDark` on click; persist current value
      localStorage.setItem('theme', this.isDark ? 'dark' : 'light')
      window.dispatchEvent(new Event('theme-changed'))
    },
    async logout() {
      // clear auth
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('username')
      try { delete axios.defaults.headers.common['Authorization'] } catch(e) { /* ignore */ }
      this.isLogged = false
      this.username = ''
      // notify others
      window.dispatchEvent(new Event('auth-changed'))
      this.$router.push({ name: 'Home' })
    }
  }
}
</script>

<style>
:root{
  --bg: #f7f9fc;
  --nav-bg: #ffffff;
  --text: #111827;
  --muted: #6b7280;
  --accent: #1d4ed8;
  --card-bg: #ffffff;
  --free: #16a085; /* free slot */
  --occupied: #dc2626; /* occupied slot */
  --btn-bg: #1d4ed8;
  --btn-text: #ffffff;
  --overlay: rgba(0,0,0,0.5);
}
.dark{
  --bg: #0b1020;
  --nav-bg: #0f1724;
  --text: #e6eef8;
  --muted: #9aa9bf;
  --accent: #60a5fa;
  --card-bg: #0f1724;
  --free: #0ea5a3;
  --occupied: #fb7185;
  --btn-bg: #60a5fa;
  --btn-text: #0b1020;
  --overlay: rgba(2,6,23,0.6);
}

.app-root { display:flex; flex-direction:column; min-height:100vh; background:var(--bg); color:var(--text); font-family: sans-serif }
.nav { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:12px 18px; background:var(--nav-bg); box-shadow:0 1px 0 rgba(0,0,0,0.04); z-index:5 }
.nav a { color:var(--text); text-decoration:none; font-weight:600; margin-right:12px }
.nav a.router-link-active { color:var(--accent) }
.nav-left { display:flex; align-items:center }
.nav-right { display:flex; align-items:center }
.theme-switch { display:flex; align-items:center; margin-right:10px }
.theme-switch input { display:none }
.switch-label { display:inline-flex; align-items:center; gap:8px; cursor:pointer; user-select:none }
.switch-label .sun, .switch-label .moon { font-size:14px; opacity:0.9 }
.switch-label .toggle-knob { width:42px; height:22px; background:linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02)); border-radius:20px; position:relative; display:inline-block; transition:background 0.2s }
.switch-label .toggle-knob::after { content:''; position:absolute; top:3px; left:3px; width:16px; height:16px; background:#fff; border-radius:50%; box-shadow:0 1px 2px rgba(0,0,0,0.12); transition:left 0.18s }
.theme-switch input:checked + .switch-label .toggle-knob { background: linear-gradient(90deg,var(--accent),#7dd3fc) }
.theme-switch input:checked + .switch-label .toggle-knob::after { left:23px }

.logout-btn { background:transparent; border:1px solid var(--accent); color:var(--accent); padding:6px 12px; border-radius:8px; cursor:pointer; transition:all 0.18s }
.logout-btn:hover { background:var(--accent); color:var(--btn-text); transform:translateY(-2px); box-shadow:0 6px 18px rgba(29,78,216,0.12) }
 .main { padding:20px; flex:1 }
</style>

