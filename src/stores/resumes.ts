import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Resume, ResumeInput } from '@/types'
import { resumesApi } from '@/api'

export const useResumeStore = defineStore('resumes', () => {
  const items = ref<Resume[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  const defaultResume = computed(() => items.value.find((resume) => resume.isDefault) ?? items.value[0] ?? null)

  async function fetchAll(force = false): Promise<void> {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const response = await resumesApi.list()
      items.value = response.items
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function upload(input: ResumeInput): Promise<Resume> {
    const created = await resumesApi.upload(input)
    items.value.unshift(created)
    if (created.isDefault) {
      items.value = items.value.map((resume) =>
        resume.id === created.id ? resume : { ...resume, isDefault: false },
      )
    }
    return created
  }

  async function update(id: string, input: { name: string; targetRole: string }): Promise<Resume> {
    const updated = await resumesApi.update(id, input)
    const index = items.value.findIndex((resume) => resume.id === id)
    if (index >= 0) items.value[index] = updated
    return updated
  }

  async function setDefault(id: string): Promise<void> {
    await resumesApi.setDefault(id)
    items.value = items.value.map((resume) => ({
      ...resume,
      isDefault: resume.id === id,
    }))
  }

  async function remove(id: string): Promise<void> {
    await resumesApi.remove(id)
    const wasDefault = items.value.find((resume) => resume.id === id)?.isDefault
    items.value = items.value.filter((resume) => resume.id !== id)
    if (wasDefault && items.value.length) {
      items.value[0].isDefault = true
    }
  }

  return {
    items,
    loading,
    loaded,
    defaultResume,
    fetchAll,
    upload,
    update,
    setDefault,
    remove,
  }
})
