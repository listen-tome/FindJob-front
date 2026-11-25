<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, Document, Plus, UploadFilled } from '@element-plus/icons-vue'
import { useResumeStore } from '@/stores/resumes'
import type { Resume } from '@/types'
import { formatFileSize } from '@/utils/format'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [resume: Resume]
}>()

const resumes = useResumeStore()
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const name = ref('')
const targetRole = ref('前端开发实习生')
const dragging = ref(false)
const saving = ref(false)
const error = ref('')

const fileSizeLabel = computed(() =>
  selectedFile.value ? formatFileSize(selectedFile.value.size) : '',
)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    selectedFile.value = null
    name.value = ''
    targetRole.value = '前端开发实习生'
    error.value = ''
    dragging.value = false
  },
)

function pickFile(): void {
  fileInput.value?.click()
}

function validateAndSet(file: File): void {
  error.value = ''
  const allowed = ['.pdf', '.doc', '.docx']
  const lower = file.name.toLowerCase()
  if (!allowed.some((ext) => lower.endsWith(ext))) {
    error.value = '目前支持 PDF、DOC、DOCX 格式的简历'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    error.value = '文件不能超过 10MB'
    return
  }
  selectedFile.value = file
  if (!name.value) {
    name.value = file.name.replace(/\.[^.]+$/, '')
  }
}

function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) validateAndSet(file)
  target.value = ''
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) validateAndSet(file)
}

function removeFile(): void {
  selectedFile.value = null
  error.value = ''
}

function close(): void {
  emit('update:modelValue', false)
}

async function submit(): Promise<void> {
  if (!selectedFile.value) {
    error.value = '请先选择一份简历文件'
    return
  }
  if (!name.value.trim()) {
    error.value = '请给这个版本起一个名字'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const resume = await resumes.upload({
      file: selectedFile.value,
      name: name.value.trim(),
      targetRole: targetRole.value.trim() || '通用岗位',
    })
    ElMessage.success('简历版本已上传')
    emit('saved', resume)
    close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '上传失败，请稍后重试'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    width="min(520px, calc(100vw - 32px))"
    :show-close="false"
    :close-on-click-modal="false"
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="upload-dialog">
      <header class="upload-dialog__head">
        <div>
          <div class="upload-dialog__eyebrow">NEW RESUME VERSION</div>
          <h2>上传一份简历</h2>
          <p>为不同的岗位准备不同版本，投递时更有针对性。</p>
        </div>
        <button type="button" class="upload-dialog__close" aria-label="关闭" @click="close">
          <Close :size="18" />
        </button>
      </header>

      <div class="upload-dialog__body">
        <input
          ref="fileInput"
          type="file"
          accept=".pdf,.doc,.docx"
          class="file-input"
          @change="onFileChange"
        />

        <div
          v-if="!selectedFile"
          class="dropzone"
          :class="{ 'is-dragging': dragging }"
          role="button"
          tabindex="0"
          @click="pickFile"
          @keydown.enter="pickFile"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <span class="dropzone__icon"><UploadFilled :size="24" /></span>
          <strong>拖拽简历到这里，或点击选择文件</strong>
          <span>支持 PDF / DOC / DOCX，最大 10MB</span>
        </div>

        <div v-else class="file-card">
          <span class="file-card__icon"><Document :size="20" /></span>
          <div class="file-card__copy">
            <strong>{{ selectedFile.name }}</strong>
            <span>{{ fileSizeLabel }} · 已准备好上传</span>
          </div>
          <button type="button" class="file-card__remove" @click="removeFile">更换</button>
        </div>

        <div class="upload-form">
          <label class="field">
            <span>版本名称</span>
            <input v-model="name" type="text" placeholder="例如：字节跳动 · 前端定向版" maxlength="40" />
          </label>
          <label class="field">
            <span>目标岗位</span>
            <input v-model="targetRole" type="text" placeholder="例如：前端开发实习生" maxlength="40" />
          </label>
        </div>

        <p v-if="error" class="upload-error">{{ error }}</p>
        <div class="upload-tip">
          <Plus :size="12" />
          建议文件名包含「姓名 + 岗位 + 版本」，方便 HR 快速识别
        </div>
      </div>

      <footer class="upload-dialog__foot">
        <button type="button" class="btn" @click="close">取消</button>
        <button type="button" class="btn btn--primary" :disabled="saving" @click="submit">
          <span v-if="saving" class="mini-spinner" />
          {{ saving ? '上传中…' : '上传简历' }}
        </button>
      </footer>
    </div>
  </el-dialog>
</template>

<style scoped>
.upload-dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 26px 18px;
  border-bottom: 1px solid var(--line);
}

.upload-dialog__eyebrow {
  margin-bottom: 6px;
  font-size: 8.5px;
  font-weight: 750;
  letter-spacing: 0.15em;
  color: var(--brand);
}

.upload-dialog__head h2 {
  font-family: var(--font-display);
  font-size: 23px;
  font-weight: 650;
  letter-spacing: -0.04em;
  color: var(--ink);
}

.upload-dialog__head p {
  margin-top: 5px;
  font-size: 10.5px;
  color: var(--muted);
}

.upload-dialog__close {
  display: grid;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  color: var(--muted);
  cursor: pointer;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 9px;
  place-items: center;
}

.upload-dialog__body {
  padding: 20px 26px 8px;
}

.file-input {
  display: none;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--brand-soft) 45%, transparent), transparent),
    var(--surface-soft);
  border: 1px dashed var(--line-strong);
  border-radius: 14px;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;
}

.dropzone:hover,
.dropzone.is-dragging {
  background: var(--brand-soft);
  border-color: var(--brand);
  transform: translateY(-1px);
}

.dropzone__icon {
  display: grid;
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  color: var(--brand);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--shadow-sm);
  place-items: center;
}

.dropzone strong {
  font-size: 11.5px;
  font-weight: 650;
  color: var(--ink);
}

.dropzone > span:last-child {
  margin-top: 4px;
  font-size: 9px;
  color: var(--faint);
}

.file-card {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px;
  background: var(--brand-soft);
  border: 1px solid color-mix(in srgb, var(--brand) 14%, transparent);
  border-radius: 12px;
}

.file-card__icon {
  display: grid;
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  color: var(--brand);
  background: var(--surface);
  border-radius: 9px;
  place-items: center;
}

.file-card__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.file-card__copy strong {
  overflow: hidden;
  font-size: 10.5px;
  font-weight: 650;
  color: var(--ink);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-card__copy span {
  margin-top: 2px;
  font-size: 8.5px;
  color: var(--muted);
}

.file-card__remove {
  padding: 0;
  font-size: 9px;
  font-weight: 600;
  color: var(--brand);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.upload-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field > span {
  font-size: 10px;
  font-weight: 650;
  color: var(--ink-soft);
}

.field input {
  height: 39px;
  padding: 0 11px;
  font-size: 11px;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 9px;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.field input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-soft);
}

.upload-error {
  padding: 8px 10px;
  margin-top: 10px;
  font-size: 9.5px;
  color: var(--danger);
  background: var(--danger-soft);
  border-radius: 7px;
}

.upload-tip {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 12px;
  font-size: 8.5px;
  line-height: 1.5;
  color: var(--faint);
}

.upload-dialog__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 15px 26px 22px;
  border-top: 1px solid var(--line);
}

.mini-spinner {
  width: 13px;
  height: 13px;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 520px) {
  .upload-dialog__head,
  .upload-dialog__body {
    padding-right: 18px;
    padding-left: 18px;
  }

  .upload-dialog__foot {
    padding: 13px 18px 18px;
  }

  .upload-form {
    grid-template-columns: 1fr;
  }
}
</style>
