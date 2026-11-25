<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  Calendar,
  CircleCheck,
  Lock,
  Message,
  User,
} from '@element-plus/icons-vue'
import BrandMark from '@/components/common/BrandMark.vue'
import CompanyAvatar from '@/components/common/CompanyAvatar.vue'
import StatusPill from '@/components/common/StatusPill.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const formRef = ref<FormInstance>()
const submitting = ref(false)

const loginForm = reactive({
  email: '',
  password: '',
  remember: true,
})

const registerForm = reactive({
  name: '',
  email: '',
  password: '',
})

const loginRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

const registerRules: FormRules = {
  name: [{ required: true, message: '怎么称呼你？', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

const heading = computed(() =>
  mode.value === 'login'
    ? { eyebrow: 'WELCOME BACK', title: '欢迎回来，继续出发。', desc: '登录你的求职驾驶舱，看看今天离 Offer 又近了多少。' }
    : { eyebrow: 'START HERE', title: '创建你的求职驾驶舱。', desc: '把投递、面试和复盘放在一处，让每一步都有迹可循。' },
)

function switchMode(next: 'login' | 'register'): void {
  mode.value = next
  nextTick(() => formRef.value?.clearValidate())
}

async function submit(): Promise<void> {
  if (!formRef.value) return
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
  } catch {
    return
  }

  submitting.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(loginForm)
      ElMessage.success(`欢迎回来，${auth.user?.name || '同学'}`)
    } else {
      await auth.register(registerForm)
      ElMessage.success('账号创建成功，开始记录第一份投递吧')
    }
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/dashboard'
    await router.push(redirect)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败，请稍后再试')
  } finally {
    submitting.value = false
  }
}

function showForgotHint(): void {
  ElMessage.info('当前版本暂不支持自助找回密码，请联系管理员重置。')
}
</script>

<template>
  <div class="login">
    <section class="login-visual">
      <div class="visual-grid" aria-hidden="true" />
      <div class="visual-glow" aria-hidden="true" />

      <header class="visual-brand">
        <BrandMark :size="38" />
        <div class="visual-brand__copy">
          <strong>OfferPilot</strong>
          <span>求职驾驶舱</span>
        </div>
        <span class="visual-brand__pill">BETA</span>
      </header>

      <div class="visual-main">
        <div class="visual-eyebrow">YOUR NEXT MOVE, MADE CLEAR</div>
        <h1>
          把每一次投递，<br />
          变成<span>有把握的</span><br />
          下一步。
        </h1>
        <p class="visual-desc">
          一个为大学生求职者设计的轻量工作台。管理投递进度、安排面试节奏、复盘渠道效果，把焦虑变成一张清晰的行动地图。
        </p>

        <div class="stage" aria-hidden="true">
          <div class="stage__shadow" />
          <div class="stage-card">
            <div class="stage-card__head">
              <span>本周投递</span>
              <strong class="num">6 <small>/ 8</small></strong>
            </div>
            <div class="stage-card__bar">
              <span />
            </div>
            <div class="stage-list">
              <div class="stage-row">
                <CompanyAvatar name="字节跳动" :size="30" :radius="9" />
                <div class="stage-row__copy">
                  <strong>字节跳动</strong>
                  <small>前端开发实习生</small>
                </div>
                <StatusPill status="INTERVIEW" compact />
              </div>
              <div class="stage-row">
                <CompanyAvatar name="小红书" :size="30" :radius="9" />
                <div class="stage-row__copy">
                  <strong>小红书</strong>
                  <small>前端开发实习生</small>
                </div>
                <StatusPill status="SCREENING" compact />
              </div>
              <div class="stage-row">
                <CompanyAvatar name="蚂蚁集团" :size="30" :radius="9" />
                <div class="stage-row__copy">
                  <strong>蚂蚁集团</strong>
                  <small>Java 开发实习生</small>
                </div>
                <StatusPill status="OFFER" compact />
              </div>
            </div>
          </div>

          <div class="float-card float-card--offer">
            <span class="float-card__icon float-card__icon--lime">
              <CircleCheck :size="16" />
            </span>
            <div>
              <strong>Offer 已收获</strong>
              <small>蚂蚁集团 · 杭州</small>
            </div>
          </div>

          <div class="float-card float-card--next">
            <span class="float-card__icon">
              <Calendar :size="16" />
            </span>
            <div>
              <strong>明天 14:00</strong>
              <small>字节跳动 · 业务一面</small>
            </div>
          </div>
        </div>
      </div>

      <footer class="visual-foot">
        <div class="visual-stat">
          <strong>01</strong>
          <span>集中管理<br />所有投递</span>
        </div>
        <div class="visual-stat">
          <strong>02</strong>
          <span>提前准备<br />每场面试</span>
        </div>
        <div class="visual-stat">
          <strong>03</strong>
          <span>用数据<br />复盘节奏</span>
        </div>
        <p class="visual-quote">“不追着机会跑，让机会看见你的准备。”</p>
      </footer>
    </section>

    <section class="login-panel">
      <div class="panel-inner">
        <div class="mobile-brand">
          <BrandMark :size="32" />
          <strong>OfferPilot</strong>
        </div>

        <div class="panel-head">
          <div class="panel-eyebrow">{{ heading.eyebrow }}</div>
          <h2>{{ heading.title }}</h2>
          <p>{{ heading.desc }}</p>
        </div>

        <div class="auth-switch" role="tablist" aria-label="登录或注册">
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'login'"
            :class="{ 'is-active': mode === 'login' }"
            @click="switchMode('login')"
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'register'"
            :class="{ 'is-active': mode === 'register' }"
            @click="switchMode('register')"
          >
            注册
          </button>
        </div>

        <el-form
          v-if="mode === 'login'"
          ref="formRef"
          :model="loginForm"
          :rules="loginRules"
          label-position="top"
          class="auth-form"
          @submit.prevent="submit"
        >
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="loginForm.email" size="large" placeholder="you@example.com" autocomplete="email">
              <template #prefix><Message :size="15" /></template>
            </el-input>
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              size="large"
              show-password
              placeholder="至少 6 位"
              autocomplete="current-password"
              @keyup.enter="submit"
            >
              <template #prefix><Lock :size="15" /></template>
            </el-input>
          </el-form-item>

          <div class="auth-meta">
            <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
            <button type="button" class="text-link" @click="showForgotHint">
              忘记密码？
            </button>
          </div>

          <button class="auth-submit" type="submit" :disabled="submitting">
            <span v-if="submitting" class="auth-spinner" />
            <template v-else>
              进入工作台
              <ArrowRight :size="16" />
            </template>
          </button>
        </el-form>

        <el-form
          v-else
          ref="formRef"
          :model="registerForm"
          :rules="registerRules"
          label-position="top"
          class="auth-form"
          @submit.prevent="submit"
        >
          <el-form-item label="称呼" prop="name">
            <el-input v-model="registerForm.name" size="large" placeholder="你的名字" autocomplete="name">
              <template #prefix><User :size="15" /></template>
            </el-input>
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="registerForm.email" size="large" placeholder="you@example.com" autocomplete="email">
              <template #prefix><Message :size="15" /></template>
            </el-input>
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              size="large"
              show-password
              placeholder="设置至少 6 位密码"
              autocomplete="new-password"
              @keyup.enter="submit"
            >
              <template #prefix><Lock :size="15" /></template>
            </el-input>
          </el-form-item>

          <button class="auth-submit" type="submit" :disabled="submitting">
            <span v-if="submitting" class="auth-spinner" />
            <template v-else>
              创建账号
              <ArrowRight :size="16" />
            </template>
          </button>
        </el-form>

        <p class="panel-foot">
          登录即表示你同意 OfferPilot 的服务条款与隐私政策
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  grid-template-columns: minmax(520px, 1.08fr) minmax(440px, 0.92fr);
  min-height: 100vh;
  background: var(--bg);
}

.login-visual {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 32px);
  padding: 38px 44px 30px;
  margin: 16px 0 16px 16px;
  overflow: hidden;
  color: #f3f6ef;
  background:
    radial-gradient(700px 500px at 75% 10%, rgba(217, 239, 111, 0.13), transparent 62%),
    radial-gradient(600px 500px at 5% 95%, rgba(74, 140, 117, 0.28), transparent 60%),
    linear-gradient(150deg, #174b3d 0%, #0e352b 48%, #09271f 100%);
  border-radius: 30px;
  box-shadow: 0 30px 80px rgba(9, 39, 31, 0.25);
}

.visual-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(circle at 50% 40%, #000, transparent 78%);
}

.visual-glow {
  position: absolute;
  top: 18%;
  right: -18%;
  width: 600px;
  height: 600px;
  pointer-events: none;
  background: radial-gradient(circle, rgba(217, 239, 111, 0.11), transparent 65%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 50%;
}

.visual-brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 11px;
}

.visual-brand__copy {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.visual-brand__copy strong {
  font-size: 17px;
  font-weight: 720;
  letter-spacing: -0.035em;
}

.visual-brand__copy span {
  margin-top: 3px;
  font-size: 9px;
  letter-spacing: 0.16em;
  color: rgba(231, 241, 233, 0.5);
}

.visual-brand__pill {
  padding: 4px 7px;
  margin-left: 3px;
  font-size: 8px;
  font-weight: 750;
  letter-spacing: 0.12em;
  color: #cfe3a2;
  background: rgba(217, 239, 111, 0.08);
  border: 1px solid rgba(217, 239, 111, 0.16);
  border-radius: 5px;
}

.visual-main {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  max-width: 660px;
  padding: 36px 0 22px;
}

.visual-eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 20px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: rgba(232, 242, 233, 0.45);
}

.visual-eyebrow::before {
  width: 22px;
  height: 1px;
  content: '';
  background: var(--accent);
}

.visual-main h1 {
  font-family: var(--font-display);
  font-size: clamp(44px, 4.5vw, 64px);
  font-weight: 570;
  line-height: 1.05;
  letter-spacing: -0.06em;
  color: #f4f7f1;
}

.visual-main h1 span {
  position: relative;
  color: var(--accent);
}

.visual-main h1 span::after {
  position: absolute;
  right: 0;
  bottom: 3px;
  left: 2px;
  height: 5px;
  content: '';
  background: rgba(217, 239, 111, 0.18);
  border-radius: 4px;
}

.visual-desc {
  max-width: 470px;
  margin-top: 23px;
  font-size: 13.5px;
  line-height: 1.8;
  color: rgba(231, 241, 233, 0.6);
}

.stage {
  position: relative;
  width: min(100%, 440px);
  margin-top: 42px;
  margin-left: 26px;
}

.stage__shadow {
  position: absolute;
  inset: 20px -16px -16px 20px;
  background: rgba(217, 239, 111, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  transform: rotate(3.2deg);
}

.stage-card {
  position: relative;
  z-index: 2;
  padding: 17px 18px 10px;
  background: rgba(248, 251, 244, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 17px;
  box-shadow: 0 26px 60px rgba(3, 19, 13, 0.28);
  transform: rotate(-1.1deg);
}

.stage-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 650;
  color: #66756d;
}

.stage-card__head strong {
  font-size: 17px;
  color: #18382c;
}

.stage-card__head small {
  font-size: 10px;
  font-weight: 550;
  color: #93a199;
}

.stage-card__bar {
  height: 4px;
  margin: 9px 0 9px;
  overflow: hidden;
  background: #e4e9df;
  border-radius: 99px;
}

.stage-card__bar span {
  display: block;
  width: 75%;
  height: 100%;
  background: linear-gradient(90deg, #1d6a53, #97b84a);
  border-radius: inherit;
}

.stage-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 0;
  border-top: 1px solid rgba(25, 58, 45, 0.07);
}

.stage-row__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.stage-row__copy strong {
  font-size: 10.5px;
  font-weight: 700;
  color: #19392c;
}

.stage-row__copy small {
  margin-top: 1px;
  font-size: 9px;
  color: #83938a;
}

.float-card {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  color: #18382c;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  box-shadow: 0 18px 40px rgba(4, 26, 18, 0.24);
  backdrop-filter: blur(8px);
}

.float-card--offer {
  top: -18px;
  right: -38px;
  transform: rotate(2.4deg);
}

.float-card--next {
  right: -18px;
  bottom: -28px;
  transform: rotate(-2deg);
}

.float-card__icon {
  display: grid;
  width: 30px;
  height: 30px;
  color: #1a5a46;
  background: #e6f0e9;
  border-radius: 8px;
  place-items: center;
}

.float-card__icon--lime {
  color: #425315;
  background: #edf5c8;
}

.float-card div {
  display: flex;
  flex-direction: column;
}

.float-card strong {
  font-size: 9.5px;
  font-weight: 700;
}

.float-card small {
  margin-top: 2px;
  font-size: 8.5px;
  color: #7b8b81;
}

.visual-foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  gap: 28px;
  padding-top: 22px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}

.visual-stat {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.visual-stat strong {
  font-size: 9px;
  font-weight: 700;
  color: var(--accent);
}

.visual-stat span {
  font-size: 9.5px;
  line-height: 1.6;
  color: rgba(231, 241, 233, 0.42);
}

.visual-quote {
  margin-left: auto;
  font-size: 9.5px;
  color: rgba(231, 241, 233, 0.32);
  text-align: right;
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 44px 36px;
}

.panel-inner {
  width: min(100%, 390px);
}

.mobile-brand {
  display: none;
  align-items: center;
  gap: 9px;
  margin-bottom: 35px;
}

.mobile-brand strong {
  font-size: 17px;
  letter-spacing: -0.04em;
}

.panel-eyebrow {
  margin-bottom: 10px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--brand);
}

.panel-head h2 {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 620;
  line-height: 1.2;
  letter-spacing: -0.05em;
  color: var(--ink);
}

.panel-head p {
  max-width: 350px;
  margin-top: 10px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--muted);
}

.auth-switch {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  margin: 27px 0 24px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: 11px;
}

.auth-switch button {
  height: 31px;
  padding: 0 22px;
  font-size: 11.5px;
  font-weight: 650;
  color: var(--muted);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 8px;
  transition:
    color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.auth-switch button.is-active {
  color: var(--ink);
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.auth-form :deep(.el-form-item) {
  margin-bottom: 17px;
}

.auth-form :deep(.el-input__wrapper) {
  min-height: 45px;
  padding: 1px 13px;
  background: var(--surface);
  border-radius: 11px;
}

.auth-form :deep(.el-input__prefix) {
  margin-right: 5px;
  color: var(--faint);
}

.auth-form :deep(.el-form-item__label) {
  padding-left: 2px;
  font-size: 11.5px;
}

.auth-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -3px 0 20px;
}

.auth-meta :deep(.el-checkbox__label) {
  font-size: 11px;
  color: var(--muted);
}

.text-link {
  padding: 0;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--brand);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.auth-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 46px;
  font-size: 12.5px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  background: var(--brand);
  border: 0;
  border-radius: 11px;
  box-shadow: 0 10px 26px rgba(21, 92, 73, 0.22);
  transition:
    background 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.auth-submit:hover:not(:disabled) {
  background: var(--brand-deep);
  box-shadow: 0 14px 32px rgba(21, 92, 73, 0.28);
  transform: translateY(-1px);
}

.auth-submit:disabled {
  cursor: wait;
  opacity: 0.75;
}

html.dark .auth-submit {
  color: #0b2119;
}

.auth-spinner {
  width: 15px;
  height: 15px;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.panel-foot {
  margin-top: 32px;
  font-size: 8.5px;
  color: var(--faint);
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1120px) {
  .login {
    grid-template-columns: minmax(430px, 0.95fr) minmax(410px, 1.05fr);
  }

  .login-visual {
    padding: 30px 32px 24px;
  }

  .visual-main h1 {
    font-size: 45px;
  }

  .stage {
    margin-left: 0;
  }

  .float-card--offer {
    right: -12px;
  }

  .float-card--next {
    right: -4px;
  }

  .visual-quote {
    display: none;
  }
}

@media (max-width: 900px) {
  .login {
    display: block;
  }

  .login-visual {
    display: none;
  }

  .login-panel {
    min-height: 100vh;
    padding: 38px 24px;
  }

  .mobile-brand {
    display: flex;
  }

  .panel-head h2 {
    font-size: 28px;
  }
}

@media (max-width: 480px) {
  .login-panel {
    align-items: flex-start;
    padding: 26px 20px 40px;
  }

  .panel-inner {
    margin-top: 4vh;
  }

  .panel-head h2 {
    font-size: 25px;
  }

  .auth-switch {
    width: 100%;
  }

  .auth-switch button {
    flex: 1;
  }
}
</style>
