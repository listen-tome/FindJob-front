<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Close, VideoCamera } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { useApplicationStore } from '@/stores/applications'
import { useInterviewStore } from '@/stores/interviews'
import { INTERVIEW_TYPE_META } from '@/constants/meta'
import type { Interview, InterviewInput, InterviewStatus, InterviewType } from '@/types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    interview?: Interview | null
    presetDate?: string
  }>(),
  { interview: null, presetDate: '' },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [interview: Interview]
}>()

const applications = useApplicationStore()
const interviews = useInterviewStore()

const formRef = ref<FormInstance>()
const saving = ref(false)
const editing = computed(() => Boolean(props.interview))

function defaultTime(): string {
  const date = props.presetDate ? dayjs(props.presetDate) : dayjs().add(1, 'day')
  return `${date.format('YYYY-MM-DD')}T10:00:00`
}

function defaults(): InterviewInput {
  return {
    applicationId: null,
    company: '',
    position: '',
    round: '业务一面',
    type: 'VIDEO',
    scheduledAt: defaultTime(),
    durationMinutes: 45,
    location: '',
    link: '',
    interviewer: '',
    status: 'UPCOMING',
    notes: '',
  }
}

const formData = ref<InterviewInput>(defaults())

const rules: FormRules = {
  company: [{ required: true, message: '请选择关联投递或填写公司', trigger: 'blur' }],
  round: [{ required: true, message: '请填写面试轮次', trigger: 'blur' }],
  scheduledAt: [{ required: true, message: '请选择面试时间', trigger: 'change' }],
}

const appOptions = computed(() =>
  applications.items.filter((app) => app.status !== 'REJECTED'),
)

const statusOptions: Array<{ value: InterviewStatus; label: string }> = [
  { value: 'UPCOMING', label: '待参加' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
]

function resetForm(): void {
  const source = props.interview
  Object.assign(
    formData.value,
    source
      ? {
          applicationId: source.applicationId,
          company: source.company,
          position: source.position,
          round: source.round,
          type: source.type,
          scheduledAt: dayjs(source.scheduledAt).format('YYYY-MM-DDTHH:mm:ss'),
          durationMinutes: source.durationMinutes,
          location: source.location,
          link: source.link,
          interviewer: source.interviewer,
          status: source.status,
          notes: source.notes,
        }
      : defaults(),
  )
  formRef.value?.clearValidate()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
      void applications.fetchAll()
    }
  },
  { immediate: true },
)

watch(
  () => formData.value.applicationId,
  (id) => {
    if (!id) return
    const application = applications.byId(id)
    if (application) {
      formData.value.company = application.company
      formData.value.position = application.position
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
  if (!formData.value.scheduledAt) {
    ElMessage.warning('请选择面试时间')
    return
  }
  saving.value = true
  try {
    const payload: InterviewInput = {
      ...formData.value,
      scheduledAt: dayjs(formData.value.scheduledAt).format('YYYY-MM-DDTHH:mm:ss'),
    }
    const saved = props.interview
      ? await interviews.update(props.interview.id, payload)
      : await interviews.create(payload)
    ElMessage.success(editing.value ? '面试安排已更新' : '面试已加入日程')
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
  <el-dialog
    :model-value="modelValue"
    width="min(560px, calc(100vw - 32px))"
    :show-close="false"
    :close-on-click-modal="false"
    append-to-body
    class="interview-dialog"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="dialog">
      <header class="dialog__head">
        <div>
          <div class="dialog__eyebrow">{{ editing ? 'RESCHEDULE' : 'NEW INTERVIEW' }}</div>
          <h2>{{ editing ? '编辑面试安排' : '安排一场面试' }}</h2>
          <p>把时间、形式与准备重点记下来。</p>
        </div>
        <button type="button" class="dialog__close" aria-label="关闭" @click="close">
          <Close :size="18" />
        </button>
      </header>

      <div class="dialog__body">
        <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" @submit.prevent="submit">
          <el-form-item label="关联投递">
            <el-select v-model="formData.applicationId" clearable filterable placeholder="选择一条投递（可选）" style="width: 100%">
              <el-option
                v-for="app in appOptions"
                :key="app.id"
                :label="`${app.company} · ${app.position}`"
                :value="app.id"
              />
              <template #empty>
                <div class="select-empty">还没有投递记录，可以先手动填写公司。</div>
              </template>
            </el-select>
          </el-form-item>

          <div class="form-row">
            <el-form-item label="公司" prop="company">
              <el-input v-model="formData.company" placeholder="公司名称" maxlength="40" />
            </el-form-item>
            <el-form-item label="岗位">
              <el-input v-model="formData.position" placeholder="岗位名称" maxlength="60" />
            </el-form-item>
          </div>

          <div class="form-row">
            <el-form-item label="面试轮次" prop="round">
              <el-input v-model="formData.round" placeholder="业务一面 / HR 面" maxlength="30" />
            </el-form-item>
            <el-form-item label="面试形式">
              <el-select v-model="formData.type" style="width: 100%">
                <el-option
                  v-for="(meta, key) in INTERVIEW_TYPE_META"
                  :key="key"
                  :label="meta.label"
                  :value="key as InterviewType"
                />
              </el-select>
            </el-form-item>
          </div>

          <div class="form-row">
            <el-form-item label="面试时间" prop="scheduledAt">
              <el-date-picker
                v-model="formData.scheduledAt"
                type="datetime"
                value-format="YYYY-MM-DDTHH:mm:ss"
                format="YYYY年M月D日 HH:mm"
                placeholder="选择日期与时间"
                :clearable="false"
              />
            </el-form-item>
            <el-form-item label="预计时长（分钟）">
              <el-input-number v-model="formData.durationMinutes" :min="15" :max="240" :step="15" controls-position="right" />
            </el-form-item>
          </div>

          <div class="form-row">
            <el-form-item label="地点 / 会议平台">
              <el-input v-model="formData.location" placeholder="飞书会议 / 现场" maxlength="60" />
            </el-form-item>
            <el-form-item label="面试官">
              <el-input v-model="formData.interviewer" placeholder="可选" maxlength="30" />
            </el-form-item>
          </div>

          <el-form-item label="会议链接">
            <el-input
              :model-value="formData.link"
              placeholder="https://…（可选）"
              @update:model-value="(value: string) => (formData.link = value)"
            >
              <template #prefix><VideoCamera :size="14" /></template>
            </el-input>
          </el-form-item>

          <el-form-item v-if="editing" label="当前状态">
            <el-select
              :model-value="formData.status"
              style="width: 100%"
              @update:model-value="(value: InterviewStatus) => (formData.status = value)"
            >
              <el-option
                v-for="option in statusOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="准备备注">
            <el-input
              :model-value="formData.notes"
              type="textarea"
              :rows="3"
              maxlength="500"
              show-word-limit
              placeholder="面试重点、要问的问题、需要复习的知识点…"
              @update:model-value="(value: string) => (formData.notes = value)"
            />
          </el-form-item>
        </el-form>
      </div>

      <footer class="dialog__foot">
        <span class="dialog__tip">面试前 15 分钟会收到站内提醒</span>
        <div class="dialog__actions">
          <button type="button" class="btn" @click="close">取消</button>
          <button type="button" class="btn btn--primary" :disabled="saving" @click="submit">
            <span v-if="saving" class="mini-spinner" />
            {{ editing ? '保存修改' : '加入日程' }}
          </button>
        </div>
      </footer>
    </div>
  </el-dialog>
</template>

<style scoped>
.dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 26px 18px;
  border-bottom: 1px solid var(--line);
}

.dialog__eyebrow {
  margin-bottom: 6px;
  font-size: 8.5px;
  font-weight: 750;
  letter-spacing: 0.16em;
  color: var(--brand);
}

.dialog__head h2 {
  font-family: var(--font-display);
  font-size: 23px;
  font-weight: 650;
  letter-spacing: -0.04em;
  color: var(--ink);
}

.dialog__head p {
  margin-top: 5px;
  font-size: 10.5px;
  color: var(--muted);
}

.dialog__close {
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

.dialog__body {
  max-height: 62vh;
  padding: 20px 26px 4px;
  overflow-y: auto;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-row :deep(.el-form-item) {
  min-width: 0;
}

.select-empty {
  padding: 18px 12px;
  font-size: 11px;
  color: var(--faint);
  text-align: center;
}

.dialog__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 15px 26px 22px;
  border-top: 1px solid var(--line);
}

.dialog__tip {
  font-size: 9px;
  color: var(--faint);
}

.dialog__actions {
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
  .dialog__head,
  .dialog__body {
    padding-right: 18px;
    padding-left: 18px;
  }

  .dialog__foot {
    align-items: stretch;
    flex-direction: column;
    padding: 13px 18px 18px;
  }

  .dialog__tip {
    display: none;
  }

  .dialog__actions .btn {
    flex: 1;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
