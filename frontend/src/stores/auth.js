import { defineStore } from 'pinia'
import api from '../services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    role: localStorage.getItem('role') || null,
    username: localStorage.getItem('username') || null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.role === 'admin',
  },
  actions: {
    async login(username, password) {
      const res = await api.post('/auth/login', { username, password })
      this.setAuth(res.data.token, res.data.role, username)
      return res.data
    },
    setAuth(token, role, username) {
      this.token = token
      this.role = role
      this.username = username
      localStorage.setItem('token', token)
      localStorage.setItem('role', role)
      localStorage.setItem('username', username)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    },
    async logout() {
      try { await api.post('/auth/logout') } catch { /* ignore */ }
      this.token = null
      this.role = null
      this.username = null
      localStorage.removeItem('token')
      localStorage.removeItem('role')
      localStorage.removeItem('username')
      delete api.defaults.headers.common['Authorization']
    },
    initialize() {
      if (this.token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
      }
    },
  },
})
