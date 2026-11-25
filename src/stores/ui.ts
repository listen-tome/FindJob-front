import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'offerpilot.theme'

function initialTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#111815' : '#f4f2ec')
}

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(false)
  const commandOpen = ref(false)
  const theme = ref<ThemeMode>(initialTheme())

  applyTheme(theme.value)

  function setTheme(value: ThemeMode): void {
    theme.value = value
    localStorage.setItem(THEME_KEY, value)
    applyTheme(value)
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
  }

  function closeSidebar(): void {
    sidebarOpen.value = false
  }

  function openCommand(): void {
    commandOpen.value = true
  }

  function closeCommand(): void {
    commandOpen.value = false
  }

  return {
    sidebarOpen,
    commandOpen,
    theme,
    setTheme,
    toggleTheme,
    toggleSidebar,
    closeSidebar,
    openCommand,
    closeCommand,
  }
})
