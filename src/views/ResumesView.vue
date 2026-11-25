<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Close,
  Delete,
  Document,
  Download,
  Edit,
  MoreFilled,
  Plus,
  Refresh,
  Star,
  View,
} from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import UploadResumeDialog from '@/components/resumes/UploadResumeDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useResumeStore } from '@/stores/resumes'
import type { Resume } from '@/types'
import { formatDate, fromNow } from '@/utils/date'
import { formatFileSize } from '@/utils/format'

const auth = useAuthStore()
const resumes = useResumeStore()

const loading = ref(true)
const error = ref('')
const uploadOpen = ref(false)
const editOpen = ref(false)
const editing = ref<Resume | null>(null)
const editName = ref('')
const editRole = ref('')
const saving = ref(false)

const defaultResume = computed(() => resumes.defaultResume)
const latestUpdated = computed(() => {
  if (!resumes.items.length) return null
  return resumes.items.reduce((latest, resume) =>
    new Date(resume.updatedAt).getTime() > new Date(latest.updatedAt).getTime() ? resume : latest,
  )
})

function skillsFor(resume: Resume): string[] {
  if (resume.targetRole.includes('前端')) return ['React', 'Vue', 'TypeScript']
  if (resume.targetRole.includes('产品')) return ['用户研究', '需求分析', '数据洞察']
  if (resume.targetRole.includes('运营')) return ['内容策划', '活动运营', '数据分析']
  if (resume.targetRole.includes('Java') || resume.targetRole.includes('后端')) return ['Java', 'Spring Boot', 'MySQL']
  return ['沟通协作', '快速学习', '项目落地']
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    await resumes.fetchAll(true)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '简历库加载失败'
  } finally {
    loading.value = false
  }
}

async function setDefault(resume: Resume): Promise<void> {
  if (resume.isDefault) return
  try {
    await resumes.setDefault(resume.id)
    ElMessage.success(`「${resume.name}」已设为默认简历`)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '设置失败')
  }
}

function preview(resume: Resume): void {
  if (resume.fileUrl) {
    window.open(resume.fileUrl, '_blank', 'noopener,noreferrer')
    return
  }
  ElMessage.info('这份简历还没有可预览的文件地址')
}

function download(resume: Resume): void {
  if (!resume.fileUrl) {
    preview(resume)
    return
  }
  const link = document.createElement('a')
  link.href = resume.fileUrl
  link.download = resume.fileName
  link.target = '_blank'
  link.click()
}

function openEdit(resume: Resume): void {
  editing.value = resume
  editName.value = resume.name
  editRole.value = resume.targetRole
  editOpen.value = true
}

async function saveEdit(): Promise<void> {
  if (!editing.value) return
  if (!editName.value.trim()) {
    ElMessage.warning('版本名称不能为空')
    return
  }
  saving.value = true
  try {
    await resumes.update(editing.value.id, {
      name: editName.value.trim(),
      targetRole: editRole.value.trim() || '通用岗位',
    })
    ElMessage.success('简历信息已更新')
    editOpen.value = false
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(resume: Resume): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `删除「${resume.name}」后，已引用它的投递记录不会受到影响，但将无法再选择这个版本。`,
      '删除简历版本',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    await resumes.remove(resume.id)
    ElMessage.success('简历版本已删除')
  } catch (err) {
    if (err === 'cancel' || err === 'close') return
    ElMessage.error(err instanceof Error ? err.message : '删除失败')
  }
}

function handleCommand(command: string, resume: Resume): void {
  if (command === 'default') void setDefault(resume)
  else if (command === 'edit') openEdit(resume)
  else if (command === 'download') download(resume)
  else if (command === 'delete') void handleDelete(resume)
}

onMounted(load)
</script>

<template>
  <div class="page resumes-page">
    <PageHeader
      eyebrow="RESUME LIBRARY"
      title="简历库"
      description="为不同岗位准备不同版本。让每一次投递，都用最合适的那一页去敲门。"
    >
      <template #actions>
        <button class="btn btn--primary" type="button" @click="uploadOpen = true">
          <Plus :size="15" />
          <span>上传简历</span>
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="resume-skeleton">
      <div v-for="index in 3" :key="index" class="skeleton skeleton--resume" />
    </div>

    <div v-else-if="error" class="card error-card">
      <div class="error-card__icon"><Refresh :size="20" /></div>
      <h3>简历库暂时没有加载出来</h3>
      <p>{{ error }}</p>
      <button class="btn btn--primary btn--sm" type="button" @click="load">重新加载</button>
    </div>

    <template v-else>
      <div class="resume-overview">
        <div class="overview-item">
          <span class="overview-item__label">简历版本</span>
          <strong class="num">{{ resumes.items.length }}<small> 份</small></strong>
          <span class="overview-item__hint">针对不同岗位分别维护</span>
        </div>
        <div class="overview-item">
          <span class="overview-item__label">默认版本</span>
          <strong class="overview-item__name">{{ defaultResume?.name || '尚未设置' }}</strong>
          <span class="overview-item__hint">{{ defaultResume ? `更新于 ${fromNow(defaultResume.updatedAt)}` : '上传后会出现在这里' }}</span>
        </div>
        <div class="overview-item">
          <span class="overview-item__label">最近更新</span>
          <strong class="overview-item__name">{{ latestUpdated ? formatDate(latestUpdated.updatedAt, 'M月D日') : '—' }}</strong>
          <span class="overview-item__hint">{{ latestUpdated ? `版本 v${latestUpdated.version}` : '还没有简历' }}</span>
        </div>
        <div class="overview-note">
          <span class="overview-note__mark" />
          针对岗位定制简历，能让 HR 更快看到你的匹配点
        </div>
      </div>

      <div class="resume-grid">
        <article
          v-for="resume in resumes.items"
          :key="resume.id"
          class="resume-card"
          :class="{ 'is-default': resume.isDefault }"
        >
          <div class="resume-preview">
            <span v-if="resume.isDefault" class="default-badge">
              <Star :size="10" /> 默认
            </span>
            <div class="paper">
              <div class="paper__head">
                <span class="paper__logo">OP</span>
                <span class="paper__label">RESUME / {{ String(resume.version).padStart(2, '0') }}</span>
              </div>
              <div class="paper__name">{{ auth.user?.name || '你的名字' }}</div>
              <div class="paper__role">{{ resume.targetRole }}</div>
              <div class="paper__divider" />
              <div class="paper__lines">
                <span style="width: 92%" />
                <span style="width: 78%" />
                <span style="width: 86%" />
              </div>
              <div class="paper__tags">
                <span v-for="skill in skillsFor(resume)" :key="skill">{{ skill }}</span>
              </div>
              <div class="paper__foot">{{ resume.fileName }}</div>
            </div>
          </div>

          <div class="resume-card__body">
            <div class="resume-title">
              <div>
                <h3>{{ resume.name }}</h3>
                <p>{{ resume.fileName }}</p>
              </div>
              <el-dropdown trigger="click" @command="(command: string) => handleCommand(command, resume)">
                <button type="button" class="resume-menu" aria-label="简历操作">
                  <MoreFilled :size="15" />
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="!resume.isDefault" command="default">
                      <Star :size="13" style="margin-right: 7px" /> 设为默认
                    </el-dropdown-item>
                    <el-dropdown-item command="edit">
                      <Edit :size="13" style="margin-right: 7px" /> 编辑信息
                    </el-dropdown-item>
                    <el-dropdown-item command="download">
                      <Download :size="13" style="margin-right: 7px" /> 下载文件
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <Delete :size="13" style="margin-right: 7px" /> 删除版本
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <div class="resume-meta">
              <span class="resume-meta__version">v{{ resume.version }}</span>
              <span>{{ formatFileSize(resume.fileSize) }}</span>
              <span>{{ formatDate(resume.updatedAt, 'YYYY/MM/DD') }}</span>
            </div>

            <div class="resume-actions">
              <button type="button" class="resume-action" @click="preview(resume)">
                <View :size="13" />
                预览
              </button>
              <button
                type="button"
                class="resume-action"
                :class="{ 'is-default': resume.isDefault }"
                :disabled="resume.isDefault"
                @click="setDefault(resume)"
              >
                <Star :size="13" />
                {{ resume.isDefault ? '当前默认' : '设为默认' }}
              </button>
            </div>
          </div>
        </article>

        <button type="button" class="upload-tile" @click="uploadOpen = true">
          <span class="upload-tile__icon"><Plus :size="20" /></span>
          <strong>添加一份新简历</strong>
          <span>为新的目标岗位，准备一个更贴合的版本</span>
          <small>PDF · DOC · DOCX</small>
        </button>
      </div>

      <section class="resume-tips">
        <div class="resume-tips__head">
          <div>
            <div class="card-head__title">投递前，再检查一遍</div>
            <div class="card-head__desc">三个小动作，让简历更容易被看见</div>
          </div>
          <Document :size="18" />
        </div>
        <div class="tips-grid">
          <article class="tip-item">
            <span class="tip-item__num">01</span>
            <div>
              <h4>一岗一版</h4>
              <p>把岗位 JD 里的关键词，换成你真实做过的项目表达，而不是简单堆砌术语。</p>
            </div>
          </article>
          <article class="tip-item">
            <span class="tip-item__num">02</span>
            <div>
              <h4>结果优先</h4>
              <p>项目描述先写结果和影响，再写实现过程。能量化的地方，尽量给出数字。</p>
            </div>
          </article>
          <article class="tip-item">
            <span class="tip-item__num">03</span>
            <div>
              <h4>文件命名</h4>
              <p>使用「姓名 + 岗位 + 版本」的命名方式，HR 下载后也能快速对应到岗位。</p>
            </div>
          </article>
        </div>
      </section>
    </template>

    <UploadResumeDialog v-model="uploadOpen" @saved="load" />

    <el-dialog
      v-model="editOpen"
      width="min(440px, calc(100vw - 32px))"
      :show-close="false"
      :close-on-click-modal="false"
      append-to-body
    >
      <div class="edit-dialog">
        <header class="edit-dialog__head">
          <div>
            <div class="edit-dialog__eyebrow">EDIT VERSION</div>
            <h2>编辑简历信息</h2>
          </div>
          <button type="button" class="edit-dialog__close" aria-label="关闭" @click="editOpen = false">
            <Close :size="16" />
          </button>
        </header>
        <div class="edit-dialog__body">
          <label class="edit-field">
            <span>版本名称</span>
            <input v-model="editName" type="text" maxlength="40" placeholder="例如：前端 · 通用版" />
          </label>
          <label class="edit-field">
            <span>目标岗位</span>
            <input v-model="editRole" type="text" maxlength="40" placeholder="例如：前端开发实习生" />
          </label>
        </div>
        <footer class="edit-dialog__foot">
          <button type="button" class="btn" @click="editOpen = false">取消</button>
          <button type="button" class="btn btn--primary" :disabled="saving" @click="saveEdit">
            {{ saving ? '保存中…' : '保存修改' }}
          </button>
        </footer>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.resume-overview {
  display: grid;
  grid-template-columns: 0.8fr 1.3fr 1fr 1.7fr;
  gap: 1px;
  margin-bottom: 14px;
  overflow: hidden;
  background: var(--line);
  border: 1px solid var(--line);
  border-radius: 16px;
}

.overview-item {
  display: flex;
  flex-direction: column;
  padding: 16px 18px;
  background: var(--surface);
}

.overview-item__label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.09em;
  color: var(--faint);
  text-transform: uppercase;
}

.overview-item strong {
  margin-top: 7px;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 650;
  line-height: 1.1;
  letter-spacing: -0.04em;
  color: var(--ink);
}

.overview-item strong small {
  font-size: 10px;
  font-weight: 500;
  color: var(--muted);
}

.overview-item__name {
  overflow: hidden;
  font-family: var(--font-sans) !important;
  font-size: 11.5px !important;
  font-weight: 650 !important;
  letter-spacing: -0.02em !important;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-item__hint {
  margin-top: 4px;
  font-size: 8.5px;
  color: var(--faint);
}

.overview-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 18px;
  font-size: 9.5px;
  line-height: 1.55;
  color: var(--muted);
  background:
    radial-gradient(220px 120px at 100% 0%, rgba(217, 239, 111, 0.14), transparent 70%),
    var(--surface-soft);
}

.overview-note__mark {
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  background: var(--brand);
  border-radius: 50%;
}

.resume-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.resume-card {
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.resume-card:hover {
  border-color: var(--line-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-3px);
}

.resume-card.is-default {
  border-color: color-mix(in srgb, var(--brand) 26%, var(--line));
}

.resume-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 232px;
  padding: 20px 24px;
  overflow: hidden;
  background:
    radial-gradient(240px 160px at 80% 0%, rgba(217, 239, 111, 0.2), transparent 70%),
    linear-gradient(145deg, #ebe7dc, #f6f3eb);
}

html.dark .resume-preview {
  background:
    radial-gradient(240px 160px at 80% 0%, rgba(217, 239, 111, 0.08), transparent 70%),
    linear-gradient(145deg, #1b2721, #22312a);
}

.resume-preview::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background-image: radial-gradient(rgba(21, 92, 73, 0.11) 0.6px, transparent 0.6px);
  background-size: 9px 9px;
  opacity: 0.4;
}

.default-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 22px;
  padding: 0 8px;
  font-size: 8px;
  font-weight: 700;
  color: #25330f;
  background: var(--accent);
  border-radius: 5px;
  box-shadow: 0 4px 10px rgba(97, 113, 34, 0.18);
}

.paper {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 230px;
  height: 192px;
  padding: 15px 16px 11px;
  overflow: hidden;
  color: #1c2d26;
  background: #fffdf7;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 5px;
  box-shadow: 0 16px 32px rgba(42, 48, 35, 0.16);
  transform: rotate(-1.2deg);
  transition: transform 0.3s ease;
}

.resume-card:hover .paper {
  transform: rotate(0deg) translateY(-2px);
}

.paper::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  content: '';
  background: #155c49;
}

.paper__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.paper__logo {
  display: grid;
  width: 19px;
  height: 19px;
  font-size: 7px;
  font-weight: 800;
  color: #e9f1cf;
  background: #155c49;
  border-radius: 4px;
  place-items: center;
}

.paper__label {
  font-size: 5.5px;
  font-weight: 650;
  letter-spacing: 0.14em;
  color: #84958b;
}

.paper__name {
  margin-top: 17px;
  font-size: 17px;
  font-weight: 750;
  letter-spacing: -0.05em;
}

.paper__role {
  margin-top: 2px;
  font-size: 7.5px;
  font-weight: 600;
  color: #3a7a64;
}

.paper__divider {
  width: 100%;
  height: 1px;
  margin: 10px 0;
  background: #e8e9e1;
}

.paper__lines {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.paper__lines span {
  height: 3px;
  background: #e3e6de;
  border-radius: 99px;
}

.paper__lines span:nth-child(2) {
  background: #edf0e8;
}

.paper__tags {
  display: flex;
  gap: 4px;
  margin-top: 11px;
}

.paper__tags span {
  padding: 2px 5px;
  font-size: 5.5px;
  font-weight: 600;
  color: #4d6b5e;
  background: #f1f4ec;
  border-radius: 3px;
}

.paper__foot {
  position: absolute;
  right: 16px;
  bottom: 10px;
  left: 20px;
  overflow: hidden;
  font-size: 5px;
  color: #a4ada5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-card__body {
  padding: 14px 16px 13px;
}

.resume-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 9px;
}

.resume-title h3 {
  overflow: hidden;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-title p {
  overflow: hidden;
  margin-top: 3px;
  font-size: 8.5px;
  color: var(--faint);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resume-menu {
  display: grid;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  color: var(--faint);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  place-items: center;
}

.resume-menu:hover {
  color: var(--ink);
  background: var(--surface-soft);
}

.resume-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 8px;
  color: var(--faint);
}

.resume-meta__version {
  padding: 2px 5px;
  font-weight: 650;
  color: var(--brand);
  background: var(--brand-soft);
  border-radius: 4px;
}

.resume-actions {
  display: flex;
  gap: 7px;
  padding-top: 11px;
  margin-top: 11px;
  border-top: 1px solid var(--line);
}

.resume-action {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 29px;
  font-size: 8.5px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  background: var(--surface-soft);
  border: 1px solid transparent;
  border-radius: 7px;
  transition:
    color 0.18s ease,
    background 0.18s ease;
}

.resume-action:hover:not(:disabled) {
  color: var(--brand);
  background: var(--brand-soft);
}

.resume-action.is-default,
.resume-action:disabled {
  color: var(--brand);
  cursor: default;
  background: transparent;
}

.upload-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 318px;
  padding: 22px;
  text-align: center;
  cursor: pointer;
  background: transparent;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-lg);
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;
}

.upload-tile:hover {
  background: var(--brand-soft);
  border-color: var(--brand);
  transform: translateY(-2px);
}

.upload-tile__icon {
  display: grid;
  width: 46px;
  height: 46px;
  margin-bottom: 12px;
  color: var(--brand);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  place-items: center;
}

.upload-tile strong {
  font-size: 11px;
  font-weight: 650;
  color: var(--ink);
}

.upload-tile > span:not(.upload-tile__icon) {
  max-width: 210px;
  margin-top: 5px;
  font-size: 8.5px;
  line-height: 1.55;
  color: var(--faint);
}

.upload-tile small {
  margin-top: 12px;
  font-size: 7px;
  font-weight: 650;
  letter-spacing: 0.1em;
  color: var(--faint);
}

.resume-tips {
  padding: 20px 22px 18px;
  margin-top: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xs);
}

.resume-tips__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.resume-tips__head > svg {
  color: var(--brand);
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
}

.tip-item {
  display: flex;
  gap: 11px;
  padding: 16px 20px 0;
  border-left: 1px solid var(--line);
}

.tip-item:first-child {
  padding-left: 0;
  border-left: 0;
}

.tip-item__num {
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 700;
  color: var(--brand);
}

.tip-item h4 {
  font-size: 10px;
  font-weight: 700;
  color: var(--ink);
}

.tip-item p {
  margin-top: 4px;
  font-size: 8.5px;
  line-height: 1.65;
  color: var(--muted);
}

.error-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 54px 24px;
  text-align: center;
}

.error-card__icon {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 14px;
  color: var(--coral);
  background: var(--coral-soft);
  border-radius: 14px;
  place-items: center;
}

.error-card h3 {
  font-size: 15px;
}

.error-card p {
  margin: 6px 0 18px;
  font-size: 11px;
  color: var(--muted);
}

.edit-dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 22px 24px 16px;
  border-bottom: 1px solid var(--line);
}

.edit-dialog__eyebrow {
  margin-bottom: 5px;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.15em;
  color: var(--brand);
}

.edit-dialog__head h2 {
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.04em;
}

.edit-dialog__close {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  font-size: 9px;
  color: var(--muted);
  cursor: pointer;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 6px;
}

.edit-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 13px;
  padding: 18px 24px 6px;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-field > span {
  font-size: 10px;
  font-weight: 650;
  color: var(--ink-soft);
}

.edit-field input {
  height: 39px;
  padding: 0 11px;
  font-size: 11px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 9px;
  outline: none;
}

.edit-field input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}

.edit-dialog__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 15px 24px 21px;
}

.skeleton--resume {
  height: 318px;
  border-radius: var(--radius-lg);
}

.resume-skeleton {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

@media (max-width: 1180px) {
  .resume-grid,
  .resume-skeleton {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .resume-overview {
    grid-template-columns: 1fr 1.3fr 1fr;
  }

  .overview-note {
    grid-column: span 3;
  }
}

@media (max-width: 900px) {
  .tips-grid {
    grid-template-columns: 1fr;
  }

  .tip-item {
    padding: 13px 0;
    border-top: 1px solid var(--line);
    border-left: 0;
  }

  .tip-item:first-child {
    border-top: 0;
  }
}

@media (max-width: 680px) {
  .resume-grid,
  .resume-skeleton {
    grid-template-columns: 1fr;
  }

  .resume-overview {
    grid-template-columns: 1fr 1fr;
  }

  .overview-note {
    grid-column: span 2;
  }

  .overview-item:first-child {
    display: none;
  }

  .upload-tile {
    min-height: 180px;
  }
}
</style>
