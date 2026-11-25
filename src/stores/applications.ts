import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import type { Application, ApplicationInput, ApplicationStatus } from '@/types'
import { applicationsApi } from '@/api'
import { STATUS_ORDER } from '@/constants/meta'

export const useApplicationStore = defineStore('applications', () => {
  const items = ref<Application[]>([])
  const total = ref(0)
  const loading = ref(false)
  const loaded = ref(false)

  const statusCounts = computed<Record<ApplicationStatus, number>>(() => {
    const counts = {
      WISHLIST: 0,
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      OFFER: 0,
      REJECTED: 0,
    }
    items.value.forEach((app) => {
      counts[app.status] += 1
    })
    return counts
  })

  const weeklyApplied = computed(() => {
    const monday = dayjs().subtract((dayjs().day() + 6) % 7, 'day').startOf('day')
    return items.value.filter(
      (app) => app.appliedAt && app.status !== 'WISHLIST' && !dayjs(app.appliedAt).isBefore(monday),
    ).length
  })

  const upcomingActions = computed(() =>
    items.value
      .filter((app) => app.nextActionAt && app.status !== 'REJECTED' && app.status !== 'OFFER')
      .sort((a, b) => dayjs(a.nextActionAt).valueOf() - dayjs(b.nextActionAt).valueOf()),
  )

  function byId(id: string): Application | undefined {
    return items.value.find((app) => app.id === id)
  }

  function replaceItem(updated: Application): void {
    const index = items.value.findIndex((app) => app.id === updated.id)
    if (index >= 0) items.value[index] = updated
  }

  async function fetchAll(force = false): Promise<void> {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const response = await applicationsApi.list({
        page: 1,
        size: 100,
        sort: 'updatedAt,desc',
      })
      items.value = response.items
      total.value = response.total
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function create(input: ApplicationInput): Promise<Application> {
    const created = await applicationsApi.create(input)
    items.value.unshift(created)
    total.value += 1
    return created
  }

  async function update(id: string, input: ApplicationInput): Promise<Application> {
    const updated = await applicationsApi.update(id, input)
    replaceItem(updated)
    return updated
  }

  async function updateStatus(id: string, status: ApplicationStatus): Promise<Application> {
    const index = items.value.findIndex((app) => app.id === id)
    if (index < 0) throw new Error('投递记录不存在')
    const previous = items.value[index]
    if (previous.status === status) return previous

    items.value[index] = {
      ...previous,
      status,
      appliedAt:
        status !== 'WISHLIST' && !previous.appliedAt ? dayjs().format('YYYY-MM-DD') : previous.appliedAt,
      updatedAt: new Date().toISOString(),
    }
    try {
      const updated = await applicationsApi.updateStatus(id, status)
      replaceItem(updated)
      return updated
    } catch (error) {
      replaceItem(previous)
      throw error
    }
  }

  async function remove(id: string): Promise<void> {
    await applicationsApi.remove(id)
    items.value = items.value.filter((app) => app.id !== id)
    total.value = Math.max(0, total.value - 1)
  }

  return {
    items,
    total,
    loading,
    loaded,
    statusCounts,
    weeklyApplied,
    upcomingActions,
    statusOrder: STATUS_ORDER,
    byId,
    fetchAll,
    create,
    update,
    updateStatus,
    remove,
  }
})
