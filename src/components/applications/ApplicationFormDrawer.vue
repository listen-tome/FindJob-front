<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Close, Document } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import StatusPill from '@/components/common/StatusPill.vue'
import { useApplicationStore } from '@/stores/applications'
import { useResumeStore } from '@/stores/resumes'
import { CHANNEL_META, PRIORITY_META, STATUS_META, STATUS_ORDER } from '@/constants/meta'
import type {
  Application,
  ApplicationChannel,
  ApplicationInput,
  ApplicationPriority,
  ApplicationStatus,
} from '@/types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    application?: Application | null
    presetStatus?: ApplicationStatus
  }>(),
  { application: null, presetStatus: 'WISHLIST' },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [application: Application]
}>()

const applications = useApplicationStore()
const resumes = useResumeStore()

const formRef = ref<FormInstance>()
const saving = ref(false)
const editing = computed(() => Boolean(props.application))

const commonTags = [
  'React',
  'Vue',
  'TypeScript',
  'Java',
  'Spring Boot',
  '数据分析',
  '产品',
  '大厂',
  '远程',
]

function defaults(): ApplicationInput {
  return {
    company: '',
    position: '',
    location: '',
    salary: '',
    channel: 'BOSS',
    status: props.presetStatus,
    priority: 'MEDIUM',
    appliedAt: props.presetStatus === 'WISHLIST' ? null : dayjs().format('YYYY-MM-DD'),
    nextActionAt: null,
    tags: [],
    notes: '',
    resumeId: resumes.defaultResume?.id ?? null,
  }
}

const form = reactive<ApplicationInput>(defaults())

const rules: FormRules = {
  company: [{ required: true, message: '请填写公司名称', trigger: 'blur' }],
  position: [{ required: true, message: '请填写岗位名称', trigger: 'blur' }],
  channel: [{ required: true, message: '请选择投递渠道', trigger: 'change' }],
  status: [{ required: true, message: '请选择当前状态', trigger: 'change' }],
}

const drawerTitle = computed(() => (editing.value ? '编辑投递记录' : '记录一份新投递'))
const drawerEyebrow = computed(() => (editing.value ? 'UPDATE APPLICATION' : 'NEW APPLICATION'))

function resetForm(): void {
  const source = props.application
  const next: ApplicationInput = source
    ? {
        company: source.company,
        position: source.position,
        location: source.location,
        salary: source.salary,
        channel: source.channel,
        status: source.status,
        priority: source.priority,
        appliedAt: source.appliedAt,
        nextActionAt: source.nextActionAt,
        tags: [...source.tags],
        notes: source.notes,
        resumeId: source.resumeId,
      }
    : defaults()
  Object.assign(form, next)
  formRef.value?.clearValidate()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
      void resumes.fetchAll()
    }
  },
  { immediate: true },
)

watch(
  () => form.status,
  (status) => {
    if (status !== 'WISHLIST' && !form.appliedAt) {
      form.appliedAt = dayjs().format('YYYY-MM-DD')
    }
  },
)

function close(): void {
  emit('update:modelValue', false)
}

async function submit(): Promise<void> {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const payload: ApplicationInput = {
      ...form,
      tags: [...form.tags],
      appliedAt: form.appliedAt || null,
      nextActionAt: form.nextActionAt || null,
      resumeId: form.resumeId || null,
    }
    const saved = props.application
      ? await applications.update(props.application.id, payload)
      : await applications.create(payload)
    ElMessage.success(editing.value ? '投递记录已更新' : '新投递已加入看板')
    emit('saved', saved)
    close()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    size="min(530px, 100vw)"
    :with-header="false"
    append-to-body
    class="application-drawer"
    @update:model-value="emit('update:modelValue', $event)"
    @close="close"
  >
    <div class="drawer">
      <header class="drawer__head">
        <div>
          <div class="drawer__eyebrow">{{ drawerEyebrow }}</div>
          <div class="drawer__title-row">
            <h2>{{ drawerTitle }}</h2>
            <StatusPill v-if="application" :status="application.status" />
          </div>
          <p>把关键信息记下来，下一次跟进就不会忘。</p>
        </div>
        <button class="drawer__close" type="button" aria-label="关闭" @click="close">
          <Close :size="18" />
        </button>
      </header>

      <div class="drawer__body">
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
          <div class="form-section">
            <div class="form-section__title">基本信息</div>
            <div class="form-row">
              <el-form-item label="公司" prop="company">
                <el-input v-model="form.company" placeholder="例如：字节跳动" maxlength="40" />
              </el-form-item>
              <el-form-item label="岗位" prop="position">
                <el-input v-model="form.position" placeholder="例如：前端开发实习生" maxlength="60" />
              </el-form-item>
            </div>
            <div class="form-row">
              <el-form-item label="工作地点">
                <el-input v-model="form.location" placeholder="上海 · 徐汇" maxlength="40" />
              </el-form-item>
              <el-form-item label="薪资 / 日薪">
                <el-input v-model="form.salary" placeholder="250–350/天" maxlength="30" />
              </el-form-item>
            </div>
            <el-form-item label="投递渠道" prop="channel">
              <el-select v-model="form.channel" placeholder="选择渠道" style="width: 100%">
                <el-option
                  v-for="(meta, key) in CHANNEL_META"
                  :key="key"
                  :label="meta.label"
                  :value="key as ApplicationChannel"
                />
              </el-select>
            </el-form-item>
          </div>

          <div class="form-section">
            <div class="form-section__title">流程与优先级</div>
            <div class="form-row">
              <el-form-item label="当前状态" prop="status">
                <el-select v-model="form.status" style="width: 100%">
                  <el-option
                    v-for="status in STATUS_ORDER"
                    :key="status"
                    :label="STATUS_META[status].label"
                    :value="status"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="优先级">
                <el-select v-model="form.priority" style="width: 100%">
                  <el-option
                    v-for="(meta, key) in PRIORITY_META"
                    :key="key"
                    :label="meta.label"
                    :value="key as ApplicationPriority"
                  />
                </el-select>
              </el-form-item>
            </div>
            <div class="form-row">
              <el-form-item label="投递日期">
                <el-date-picker
                  v-model="form.appliedAt"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="选择日期"
                  :clearable="true"
                />
              </el-form-item>
              <el-form-item label="下次跟进">
                <el-date-picker
                  v-model="form.nextActionAt"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="设置提醒日期"
                  :clearable="true"
                />
              </el-form-item>
            </div>
            <el-form-item label="使用简历">
              <el-select v-model="form.resumeId" placeholder="选择简历版本" clearable style="width: 100%">
                <el-option
                  v-for="resume in resumes.items"
                  :key="resume.id"
                  :label="`${resume.name}${resume.isDefault ? '（默认）' : ''}`"
                  :value="resume.id"
                />
                <template #empty>
                  <div class="resume-empty">简历库还是空的，可稍后到「简历库」上传。</div>
                </template>
              </el-select>
            </el-form-item>
          </div>

          <div class="form-section">
            <div class="form-section__title">标签与备注</div>
            <el-form-item label="标签">
              <el-select
                v-model="form.tags"
                multiple
                filterable
                allow-create
                default-first-option
                placeholder="选择或输入标签"
                style="width: 100%"
              >
                <el-option v-for="tag in commonTags" :key="tag" :label="tag" :value="tag" />
              </el-select>
            </el-form-item>
            <el-form-item label="备注">
              <el-input
                v-model="form.notes"
                type="textarea"
                :rows="4"
                maxlength="500"
                show-word-limit
                placeholder="记录面试反馈、跟进计划或任何值得记住的信息…"
              />
            </el-form-item>
          </div>
        </el-form>
      </div>

      <footer class="drawer__foot">
        <div class="drawer__tip">
          <Document :size="13" />
          记录会自动保存到你的求职档案
        </div>
        <div class="drawer__actions">
          <button class="btn" type="button" @click="close">取消</button>
          <button class="btn btn--primary" type="button" :disabled="saving" @click="submit">
            <span v-if="saving" class="mini-spinner" />
            {{ editing ? '保存修改' : '加入看板' }}
          </button>
        </div>
      </footer>
    </div>
  </el-drawer>
</template>

<style scoped>
.drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface);
}

.drawer__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 26px 26px 20px;
  border-bottom: 1px solid var(--line);
}

.drawer__eyebrow {
  margin-bottom: 7px;
  font-size: 8.5px;
  font-weight: 750;
  letter-spacing: 0.17em;
  color: var(--brand);
}

.drawer__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drawer__title-row h2 {
  font-family: var(--font-display);
  font-size: 23px;
  font-weight: 650;
  letter-spacing: -0.04em;
  color: var(--ink);
}

.drawer__head p {
  margin-top: 6px;
  font-size: 10.5px;
  color: var(--muted);
}

.drawer__close {
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

.drawer__close:hover {
  color: var(--ink);
  background: var(--surface-muted);
}

.drawer__body {
  flex: 1;
  padding: 22px 26px 8px;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 5px;
}

.form-section + .form-section {
  padding-top: 21px;
  margin-top: 7px;
  border-top: 1px solid var(--line);
}

.form-section__title {
  margin-bottom: 15px;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.13em;
  color: var(--faint);
  text-transform: uppercase;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-row :deep(.el-form-item) {
  min-width: 0;
}

.resume-empty {
  padding: 18px 14px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--faint);
  text-align: center;
}

.drawer__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 26px 22px;
  background: var(--surface);
  border-top: 1px solid var(--line);
}

.drawer__tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  line-height: 1.4;
  color: var(--faint);
}

.drawer__actions {
  display: flex;
  gap: 8px;
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

@media (max-width: 560px) {
  .drawer__head,
  .drawer__body {
    padding-right: 18px;
    padding-left: 18px;
  }

  .drawer__foot {
    align-items: stretch;
    flex-direction: column;
    padding: 14px 18px 18px;
  }

  .drawer__actions .btn {
    flex: 1;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .drawer__tip {
    display: none;
  }
}
</style>
