// Auth helpers are now centralized in stores/auth.js (Pinia).
// This module is kept for backward compatibility but delegates to the store.
import api from './api'

export function setAuth(token, role, username) {
  if (token) {
    localStorage.setItem('token', token)
    if (role) localStorage.setItem('role', role)
    if (username) localStorage.setItem('username', username)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('username')
  delete api.defaults.headers.common['Authorization']
}

export function getToken() { return localStorage.getItem('token') }
