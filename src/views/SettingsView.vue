<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  Check,
  Lock,
  Message,
  Moon,
  Sunny,
  SwitchButton,
  User,
} from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore, type ThemeMode } from '@/stores/ui'
import type { UserUpdateInput } from '@/types'
import { initials } from '@/utils/format'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const formRef = ref<FormInstance>()
const form = reactive<UserUpdateInput>({
  name: '',
  school: '',
  major: '',
  graduationYear: 2027,
  targetRole: '',
  location: '',
  bio: '',
  weeklyGoal: 8,
})
const saving = ref(false)
const passwordOpen = ref(false)
const passwordSaving = ref(false)
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请填写你的名字', trigger: 'blur' }],
  targetRole: [{ required: true, message: '请填写目标岗位', trigger: 'blur' }],
  weeklyGoal: [{ required: true, message: '请设置每周投递目标', trigger: 'change' }],
}

const years = [2025, 2026, 2027, 2028, 2029, 2030]
const weeklyOptions = [5, 8, 10, 12]

function syncForm(): void {
  if (!auth.user) return
  Object.assign(form, {
    name: auth.user.name,
    school: auth.user.school,
    major: auth.user.major,
    graduationYear: auth.user.graduationYear,
    targetRole: auth.user.targetRole,
    location: auth.user.location,
    bio: auth.user.bio,
    weeklyGoal: auth.user.weeklyGoal,
  })
}

async function saveProfile(): Promise<void> {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    await auth.updateProfile({ ...form })
    ElMessage.success('个人资料已保存')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function chooseTheme(theme: ThemeMode): void {
  ui.setTheme(theme)
}

async function changePassword(): Promise<void> {
  if (!passwordForm.currentPassword) {
    ElMessage.warning('请输入当前密码')
    return
  }
  if (passwordForm.newPassword.length < 6) {
    ElMessage.warning('新密码至少需要 6 位')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  passwordSaving.value = true
  try {
    await auth.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    ElMessage.success('密码已更新')
    passwordOpen.value = false
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '修改失败')
  } finally {
    passwordSaving.value = false
  }
}

async function logout(): Promise<void> {
  auth.logout()
  ElMessage.success('已安全退出')
  await router.push('/login')
}

onMounted(syncForm)
</script>

<template>
  <div class="page settings-page">
    <PageHeader
      eyebrow="PREFERENCES"
      title="个人设置"
      description="让 OfferPilot 更了解你的求职方向，也让每周的目标更贴合你的节奏。"
    >
      <template #actions>
        <button class="btn btn--primary" type="button" :disabled="saving" @click="saveProfile">
          <Check :size="15" />
          <span>{{ saving ? '保存中…' : '保存资料' }}</span>
        </button>
      </template>
    </PageHeader>

    <div class="settings-grid">
      <section class="card profile-card">
        <div class="profile-banner">
          <div class="profile-banner__pattern" aria-hidden="true" />
          <div class="profile-avatar">{{ initials(auth.user?.name || '同学') }}</div>
          <div class="profile-identity">
            <h2>{{ auth.user?.name || '同学' }}</h2>
            <p>{{ auth.user?.school || '学校待补充' }} · {{ auth.user?.major || '专业待补充' }} · {{ auth.user?.graduationYear || '—' }} 届</p>
            <div class="profile-badges">
              <span class="tag tag--brand">{{ auth.user?.targetRole || '目标岗位待补充' }}</span>
              <span class="tag">{{ auth.user?.location || '地点待补充' }}</span>
            </div>
          </div>
          <div class="profile-email">
            <Message :size="13" />
            {{ auth.user?.email }}
          </div>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="profile-form">
          <div class="form-section-title">基本资料</div>
          <div class="form-row">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" placeholder="你的名字" maxlength="20" />
            </el-form-item>
            <el-form-item label="学校">
              <el-input v-model="form.school" placeholder="学校名称" maxlength="40" />
            </el-form-item>
          </div>
          <div class="form-row">
            <el-form-item label="专业">
              <el-input v-model="form.major" placeholder="专业名称" maxlength="40" />
            </el-form-item>
            <el-form-item label="毕业年份">
              <el-select v-model="form.graduationYear" style="width: 100%">
                <el-option v-for="year in years" :key="year" :label="`${year} 届`" :value="year" />
              </el-select>
            </el-form-item>
          </div>

          <div class="form-section-title form-section-title--spaced">求职目标</div>
          <div class="form-row">
            <el-form-item label="目标岗位" prop="targetRole">
              <el-input v-model="form.targetRole" placeholder="例如：前端开发实习生" maxlength="40" />
            </el-form-item>
            <el-form-item label="期望城市">
              <el-input v-model="form.location" placeholder="武汉 / 上海" maxlength="40" />
            </el-form-item>
          </div>
          <el-form-item label="个人简介">
            <el-input
              v-model="form.bio"
              type="textarea"
              :rows="3"
              maxlength="200"
              show-word-limit
              placeholder="用一两句话介绍你的方向与优势…"
            />
          </el-form-item>

          <div class="goal-block">
            <div class="goal-block__head">
              <div>
                <div class="goal-block__title">每周投递目标</div>
                <div class="goal-block__desc">一个够得着的小目标，比宏大的计划更有用。</div>
              </div>
              <div class="goal-block__value">
                <strong class="num">{{ form.weeklyGoal }}</strong>
                <span>次 / 周</span>
              </div>
            </div>
            <div class="goal-options">
              <button
                v-for="option in weeklyOptions"
                :key="option"
                type="button"
                :class="{ 'is-active': form.weeklyGoal === option }"
                @click="form.weeklyGoal = option"
              >
                {{ option }} 次
              </button>
              <el-input-number v-model="form.weeklyGoal" :min="1" :max="30" controls-position="right" />
            </div>
          </div>

          <div class="profile-form__foot">
            <span>资料只会用于生成你的求职看板</span>
            <button type="button" class="btn btn--primary" :disabled="saving" @click="saveProfile">
              {{ saving ? '保存中…' : '保存修改' }}
            </button>
          </div>
        </el-form>
      </section>

      <aside class="settings-side">
        <section class="card side-card">
          <div class="side-card__head">
            <div class="card-head__title">外观</div>
            <Sunny v-if="ui.theme === 'light'" :size="15" />
            <Moon v-else :size="15" />
          </div>
          <p class="side-card__desc">选择你更舒服的阅读方式。</p>
          <div class="theme-options">
            <button
              v-for="option in [
                { key: 'light' as const, label: '浅色' },
                { key: 'dark' as const, label: '深色' },
              ]"
              :key="option.key"
              type="button"
              class="theme-option"
              :class="{ 'is-active': ui.theme === option.key }"
              @click="chooseTheme(option.key)"
            >
              <span class="theme-preview" :class="`theme-preview--${option.key}`">
                <i class="theme-preview__sidebar" />
                <span class="theme-preview__main"><i /><i /><i /></span>
              </span>
              <span class="theme-option__label">
                {{ option.label }}
                <Check v-if="ui.theme === option.key" :size="11" />
              </span>
            </button>
          </div>
        </section>

        <section class="card side-card">
          <div class="side-card__head">
            <div class="card-head__title">账户安全</div>
            <Lock :size="15" />
          </div>
          <p class="side-card__desc">定期更新密码，保护你的求职数据。</p>
          <button type="button" class="side-action" @click="passwordOpen = true">
            <Lock :size="14" />
            修改登录密码
          </button>
          <button type="button" class="side-action side-action--danger" @click="logout">
            <SwitchButton :size="14" />
            退出当前账号
          </button>
          <div class="side-account">
            <User :size="12" />
            {{ auth.user?.email }}
          </div>
        </section>
      </aside>
    </div>

    <el-dialog
      v-model="passwordOpen"
      title="修改登录密码"
      width="min(420px, calc(100vw - 32px))"
      :close-on-click-modal="false"
      append-to-body
    >
      <div class="password-form">
        <label class="password-field">
          <span>当前密码</span>
          <el-input v-model="passwordForm.currentPassword" type="password" show-password placeholder="输入当前密码" />
        </label>
        <label class="password-field">
          <span>新密码</span>
          <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="至少 6 位" />
        </label>
        <label class="password-field">
          <span>确认新密码</span>
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="再次输入新密码" />
        </label>
      </div>
      <template #footer>
        <button type="button" class="btn" @click="passwordOpen = false">取消</button>
        <button type="button" class="btn btn--primary" :disabled="passwordSaving" @click="changePassword">
          {{ passwordSaving ? '保存中…' : '确认修改' }}
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(300px, 0.65fr);
  gap: 14px;
  align-items: start;
}

.profile-card {
  overflow: hidden;
}

.profile-banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 24px 26px;
  overflow: hidden;
  color: #f2f7f2;
  background:
    radial-gradient(380px 200px at 80% -20%, rgba(217, 239, 111, 0.16), transparent 65%),
    linear-gradient(140deg, #154b3c, #0d332a 70%, #0a2a22);
}

.profile-banner__pattern {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: radial-gradient(circle at 20% 50%, #000, transparent 80%);
}

.profile-avatar {
  position: relative;
  z-index: 1;
  display: grid;
  flex-shrink: 0;
  width: 62px;
  height: 62px;
  font-size: 19px;
  font-weight: 750;
  letter-spacing: -0.04em;
  color: #1c3327;
  background: linear-gradient(145deg, #edf6c9, #c9df7b);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  place-items: center;
}

.profile-identity {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.profile-identity h2 {
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.04em;
}

.profile-identity p {
  margin-top: 3px;
  font-size: 9.5px;
  color: rgba(231, 241, 233, 0.57);
}

.profile-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 9px;
}

.profile-badges .tag {
  height: 22px;
  font-size: 8px;
  color: rgba(240, 247, 240, 0.72);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
}

.profile-badges .tag--brand {
  color: #d9ef6f;
  background: rgba(217, 239, 111, 0.1);
  border-color: transparent;
}

.profile-email {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 8.5px;
  color: rgba(233, 242, 234, 0.45);
}

.profile-form {
  padding: 22px 26px 20px;
}

.form-section-title {
  margin-bottom: 14px;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.13em;
  color: var(--faint);
  text-transform: uppercase;
}

.form-section-title--spaced {
  padding-top: 20px;
  margin-top: 3px;
  border-top: 1px solid var(--line);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-row :deep(.el-form-item) {
  min-width: 0;
}

.goal-block {
  padding: 16px;
  margin-top: 3px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 13px;
}

.goal-block__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.goal-block__title {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
}

.goal-block__desc {
  margin-top: 3px;
  font-size: 8.5px;
  color: var(--muted);
}

.goal-block__value {
  display: flex;
  flex-shrink: 0;
  align-items: baseline;
  gap: 3px;
}

.goal-block__value strong {
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.04em;
  color: var(--brand);
}

.goal-block__value span {
  font-size: 8px;
  color: var(--muted);
}

.goal-options {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 13px;
}

.goal-options > button {
  height: 29px;
  padding: 0 10px;
  font-size: 8.5px;
  font-weight: 600;
  color: var(--muted);
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 7px;
}

.goal-options > button.is-active {
  color: var(--brand);
  background: var(--brand-soft);
  border-color: color-mix(in srgb, var(--brand) 24%, transparent);
}

.goal-options :deep(.el-input-number) {
  width: 100px;
  margin-left: auto;
}

.goal-options :deep(.el-input__wrapper) {
  min-height: 29px;
  padding: 0 8px;
  background: var(--surface);
}

.profile-form__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 18px;
  margin-top: 20px;
  border-top: 1px solid var(--line);
}

.profile-form__foot > span {
  font-size: 8px;
  color: var(--faint);
}

.settings-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.side-card {
  padding: 20px;
}

.side-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--muted);
}

.side-card__head :deep(.card-head__title) {
  font-size: 13px;
}

.side-card__desc {
  margin-top: 5px;
  font-size: 8.5px;
  line-height: 1.6;
  color: var(--faint);
}

.theme-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 13px;
}

.theme-option {
  padding: 7px;
  text-align: left;
  cursor: pointer;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 10px;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.theme-option.is-active {
  border-color: color-mix(in srgb, var(--brand) 42%, var(--line));
  box-shadow: 0 0 0 2px var(--brand-soft);
}

.theme-preview {
  display: flex;
  width: 100%;
  height: 54px;
  overflow: hidden;
  background: #f3f1e9;
  border: 1px solid #e4e0d4;
  border-radius: 6px;
}

.theme-preview__sidebar {
  width: 18%;
  background: #174638;
}

.theme-preview__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  padding: 7px 6px;
}

.theme-preview__main i {
  display: block;
  height: 4px;
  background: #dedacf;
  border-radius: 3px;
}

.theme-preview__main i:nth-child(2) {
  width: 70%;
}

.theme-preview__main i:nth-child(3) {
  width: 84%;
}

.theme-preview--dark {
  background: #131c18;
  border-color: #2a3831;
}

.theme-preview--dark .theme-preview__sidebar {
  background: #0b241c;
}

.theme-preview--dark .theme-preview__main i {
  background: #33433b;
}

.theme-option__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 2px 0;
  font-size: 9px;
  font-weight: 600;
  color: var(--muted);
}

.theme-option.is-active .theme-option__label {
  color: var(--brand);
}

.side-action {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 37px;
  padding: 0 10px;
  margin-top: 8px;
  font-size: 9.5px;
  font-weight: 600;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
  background: var(--surface-soft);
  border: 1px solid transparent;
  border-radius: 8px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    border-color 0.18s ease;
}

.side-action:first-of-type {
  margin-top: 14px;
}

.side-action:hover {
  color: var(--brand);
  background: var(--brand-soft);
  border-color: var(--brand-tint);
}

.side-action--danger {
  color: var(--danger);
}

.side-action--danger:hover {
  color: var(--danger);
  background: var(--danger-soft);
  border-color: color-mix(in srgb, var(--danger) 22%, transparent);
}

.side-account {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-top: 10px;
  margin-top: 10px;
  font-size: 8px;
  color: var(--faint);
  border-top: 1px solid var(--line);
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.password-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.password-field > span {
  font-size: 10px;
  font-weight: 650;
  color: var(--ink-soft);
}

:deep(.el-dialog__footer) {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1100px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .settings-side {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 760px) {
  .profile-banner {
    flex-wrap: wrap;
    padding: 20px;
  }

  .profile-email {
    width: 100%;
    margin-top: 2px;
  }

  .profile-form {
    padding: 18px 18px 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .settings-side {
    grid-template-columns: 1fr;
  }

  .profile-form__foot {
    align-items: stretch;
    flex-direction: column;
  }

  .profile-form__foot .btn {
    width: 100%;
  }

  .goal-options {
    flex-wrap: wrap;
  }

  .goal-options :deep(.el-input-number) {
    width: 100%;
    margin-top: 4px;
    margin-left: 0;
  }
}
</style>
