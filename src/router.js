import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import { useAuthStore } from './stores/auth'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0, behavior: 'smooth' }),
  routes: [
    { path: '/', component: Home },
    { path: '/login', component: () => import('./views/Login.vue'), meta: { guestOnly: true } },
    { path: '/signup', component: () => import('./views/Login.vue'), meta: { guestOnly: true, signup: true } },
    { path: '/dashboard', component: () => import('./views/Dashboard.vue'), meta: { requiresAuth: true } },
    { path: '/analysis', component: () => import('./views/Analysis.vue'), meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.initialize()
  if (to.meta.requiresAuth && !auth.isAuthenticated) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.guestOnly && auth.isAuthenticated) return '/dashboard'
})

export default router
