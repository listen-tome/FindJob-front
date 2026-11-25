import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import dayjs from 'dayjs'
import type { Interview, InterviewInput, InterviewStatus } from '@/types'
import { interviewsApi } from '@/api'

export const useInterviewStore = defineStore('interviews', () => {
  const items = ref<Interview[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  const upcoming = computed(() =>
    items.value
      .filter((interview) => interview.status === 'UPCOMING' && dayjs(interview.scheduledAt).isAfter(dayjs()))
      .sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf()),
  )

  const nextInterview = computed(() => upcoming.value[0] ?? null)

  const todayInterviews = computed(() =>
    items.value
      .filter((interview) => dayjs(interview.scheduledAt).isSame(dayjs(), 'day'))
      .sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf()),
  )

  function interviewsOn(date: string): Interview[] {
    return items.value
      .filter((interview) => dayjs(interview.scheduledAt).isSame(dayjs(date), 'day'))
      .sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf())
  }

  function replaceItem(updated: Interview): void {
    const index = items.value.findIndex((interview) => interview.id === updated.id)
    if (index >= 0) items.value[index] = updated
  }

  async function fetchAll(force = false): Promise<void> {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const response = await interviewsApi.list({})
      items.value = response.items
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function create(input: InterviewInput): Promise<Interview> {
    const created = await interviewsApi.create(input)
    items.value.push(created)
    items.value.sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf())
    return created
  }

  async function update(id: string, input: InterviewInput): Promise<Interview> {
    const updated = await interviewsApi.update(id, input)
    replaceItem(updated)
    return updated
  }

  async function updateStatus(id: string, status: InterviewStatus): Promise<Interview> {
    const updated = await interviewsApi.updateStatus(id, status)
    replaceItem(updated)
    return updated
  }

  async function remove(id: string): Promise<void> {
    await interviewsApi.remove(id)
    items.value = items.value.filter((interview) => interview.id !== id)
  }

  return {
    items,
    loading,
    loaded,
    upcoming,
    nextInterview,
    todayInterviews,
    interviewsOn,
    fetchAll,
    create,
    update,
    updateStatus,
    remove,
  }
})
