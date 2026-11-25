const COMPANY_PALETTE = [
  ['#1d3b35', '#2f6b5a'],
  ['#4a3728', '#8a6548'],
  ['#283a5e', '#5173b3'],
  ['#5b2f36', '#a55762'],
  ['#3b3357', '#7465a8'],
  ['#2f4031', '#66866a'],
  ['#4d3a22', '#a47b3e'],
]

const KNOWN_COMPANIES: Record<string, [string, string]> = {
  字节跳动: ['#1f2a44', '#4a5d8a'],
  小红书: ['#b52f3a', '#ef5a63'],
  腾讯: ['#1f4f99', '#4585e8'],
  美团: ['#8a6a12', '#d8ac29'],
  蚂蚁集团: ['#17559b', '#3f8fdc'],
  米哈游: ['#1c6f8a', '#53b4d0'],
  网易: ['#8f2b26', '#ce544b'],
  蔚来: ['#173f72', '#3c7bc4'],
  快手: ['#9a4a17', '#e77a30'],
  得物: ['#0f5449', '#27a38e'],
  哔哩哔哩: ['#9b3c58', '#e27693'],
  阿里云: ['#8a4315', '#dd7b2a'],
  SHEIN: ['#242424', '#5c5c5c'],
  理想汽车: ['#1f5a43', '#4c9a78'],
  拼多多: ['#8e2323', '#d94b4b'],
  携程: ['#1c4c9c', '#3d7bdd'],
  百度: ['#28338f', '#5264d9'],
  京东: ['#8f1f1a', '#d9443c'],
  华为: ['#8f1f28', '#cf4d57'],
  滴滴: ['#7a4812', '#d18b2f'],
  字节: ['#1f2a44', '#4a5d8a'],
}

export interface CompanyTone {
  from: string
  to: string
  onDark: boolean
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000
  }
  return hash
}

export function companyTone(name: string): CompanyTone {
  const known = KNOWN_COMPANIES[name]
  const [from, to] = known ?? COMPANY_PALETTE[hashString(name) % COMPANY_PALETTE.length]
  return { from, to, onDark: true }
}

export function companyMark(name: string): string {
  const clean = name.trim()
  if (!clean) return '·'
  if (/^[A-Za-z]/.test(clean)) {
    return clean.slice(0, 2).toUpperCase()
  }
  return clean.slice(0, 2)
}

export function initials(name: string): string {
  const clean = name.trim()
  if (!clean) return 'OP'
  if (/^[A-Za-z]/.test(clean)) {
    const parts = clean.split(/\s+/)
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : clean.slice(0, 2).toUpperCase()
  }
  return clean.slice(-2)
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
