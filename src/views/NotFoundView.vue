<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, Compass } from '@element-plus/icons-vue'
import BrandMark from '@/components/common/BrandMark.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const homePath = computed(() => (auth.isAuthenticated ? '/dashboard' : '/login'))
</script>

<template>
  <div class="not-found">
    <div class="not-found__grid" aria-hidden="true" />
    <header class="not-found__brand">
      <BrandMark :size="34" />
      <strong>OfferPilot</strong>
    </header>

    <main class="not-found__main">
      <div class="not-found__code">404</div>
      <div class="not-found__icon"><Compass :size="22" /></div>
      <h1>这条路线还没开通。</h1>
      <p>你访问的页面不存在，或已经被移动到别处。回到工作台，继续处理今天的投递吧。</p>
      <RouterLink :to="homePath" class="btn btn--primary">
        <ArrowLeft :size="15" />
        返回工作台
      </RouterLink>
    </main>

    <footer class="not-found__foot">OfferPilot · 求职驾驶舱</footer>
  </div>
</template>

<style scoped>
.not-found {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  min-height: 100vh;
  padding: 30px 24px;
  overflow: hidden;
  background:
    radial-gradient(700px 500px at 50% 10%, rgba(217, 239, 111, 0.16), transparent 62%),
    var(--bg);
}

.not-found__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 54px 54px;
  opacity: 0.4;
  mask-image: radial-gradient(circle at 50% 40%, #000, transparent 72%);
}

.not-found__brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 9px;
}

.not-found__brand strong {
  font-size: 15px;
  font-weight: 720;
  letter-spacing: -0.04em;
}

.not-found__main {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 460px;
  text-align: center;
}

.not-found__code {
  font-family: var(--font-display);
  font-size: clamp(80px, 16vw, 150px);
  font-weight: 640;
  line-height: 0.85;
  letter-spacing: -0.08em;
  color: transparent;
  background: linear-gradient(160deg, var(--brand) 20%, var(--brand-tint) 80%);
  -webkit-background-clip: text;
  background-clip: text;
  opacity: 0.75;
}

.not-found__icon {
  display: grid;
  width: 48px;
  height: 48px;
  margin: 20px 0 14px;
  color: var(--brand);
  background: var(--brand-soft);
  border: 1px solid var(--line);
  border-radius: 14px;
  place-items: center;
}

.not-found h1 {
  font-size: 26px;
  font-weight: 650;
  letter-spacing: -0.05em;
  color: var(--ink);
}

.not-found p {
  max-width: 360px;
  margin: 9px 0 22px;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--muted);
}

.not-found__foot {
  position: relative;
  z-index: 1;
  font-size: 8.5px;
  letter-spacing: 0.1em;
  color: var(--faint);
}
</style>
