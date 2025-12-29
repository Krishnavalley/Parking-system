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
  try { delete api.defaults.headers.common['Authorization'] } catch(e) {}
}

export function getToken() { return localStorage.getItem('token') }
