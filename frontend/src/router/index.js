import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Entry from '../views/Entry.vue'
import Exit from '../views/Exit.vue'
import Dashboard from '../views/Dashboard.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/entry', name: 'Entry', component: Entry, meta: { requiresAuth: true } },
  { path: '/exit', name: 'Exit', component: Exit, meta: { requiresAuth: true } },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true, role: 'admin' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (to.meta.requiresAuth && !token) {
    return next({ name: 'Home' })
  }
  if (to.meta.role && to.meta.role !== role && role !== 'admin') {
    return next({ name: 'Home' })
  }
  return next()
})

export default router
