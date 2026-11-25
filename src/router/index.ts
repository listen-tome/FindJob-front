import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: '登录', public: true },
    },
    {
      path: '/',
      component: () => import('@/components/layout/AppShell.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: '工作台', subtitle: '把今天该做的事，看得清清楚楚' },
        },
        {
          path: 'applications',
          name: 'applications',
          component: () => import('@/views/ApplicationsView.vue'),
          meta: { title: '投递管理', subtitle: '从收藏到 Offer，每一步都有记录' },
        },
        {
          path: 'interviews',
          name: 'interviews',
          component: () => import('@/views/InterviewsView.vue'),
          meta: { title: '面试日程', subtitle: '提前准备，从容赴约' },
        },
        {
          path: 'resumes',
          name: 'resumes',
          component: () => import('@/views/ResumesView.vue'),
          meta: { title: '简历库', subtitle: '为不同岗位，准备最合适的版本' },
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('@/views/AnalyticsView.vue'),
          meta: { title: '数据分析', subtitle: '用数据复盘每一次投递' },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: '个人设置', subtitle: '管理资料、目标与偏好' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '页面不存在', public: true },
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const isPublic = Boolean(to.meta.public)
  if (!isPublic && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' }
  }
  document.title = `${String(to.meta.title || '求职领航')} · OfferPilot`
  return true
})

export default router
