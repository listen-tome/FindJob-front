import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    subtitle?: string
    requiresAuth?: boolean
    public?: boolean
  }
}

export {}
