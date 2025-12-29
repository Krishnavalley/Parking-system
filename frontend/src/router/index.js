import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Entry from '../views/Entry.vue'
import Exit from '../views/Exit.vue'
import Records from '../views/Records.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/entry', name: 'Entry', component: Entry },
  { path: '/exit', name: 'Exit', component: Exit }
  ,{ path: '/records', name: 'Records', component: Records }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')
  console.log('[router DEBUG] navigating to:', to.name, 'from:', from.name, 'token?', !!token, 'role:', role)
  // TEMPORARY: allow navigation freely while debugging client routing issues
  // Keep logs to observe auth state; revert this change after debugging
  return next()
})

export default router
