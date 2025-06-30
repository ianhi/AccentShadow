<template>
  <nav class="mobile-bottom-nav" v-if="shouldUseMobileLayout">
    <div class="nav-container">
      <button 
        class="nav-button"
        :class="{ active: activeTab === 'sets' }"
        @click="$emit('tab-clicked', 'sets')"
      >
        <span class="nav-icon">📚</span>
        <span class="nav-label">Sets</span>
      </button>
      
      <button 
        class="nav-button"
        :class="{ active: activeTab === 'saved' }"
        @click="$emit('tab-clicked', 'saved')"
      >
        <span class="nav-icon">💾</span>
        <span class="nav-label">Saved</span>
      </button>
      
      <button 
        class="nav-button"
        :class="{ active: activeTab === 'settings' }"
        @click="$emit('tab-clicked', 'settings')"
      >
        <span class="nav-icon">⚙️</span>
        <span class="nav-label">Settings</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useViewport } from '../composables/useViewport'

interface Props {
  activeTab?: string | null
}

defineProps<Props>()

defineEmits<{
  'tab-clicked': [tabName: string]
}>()

const { shouldUseMobileLayout } = useViewport()
</script>

<style scoped>
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  z-index: 100;
}

.nav-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
  max-width: 400px;
  margin: 0 auto;
}

.nav-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  min-width: 60px;
  min-height: 44px; /* Touch target minimum */
}

.nav-button:hover,
.nav-button.active {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.nav-button.active {
  background: rgba(59, 130, 246, 0.3);
  color: #60a5fa;
}

.nav-icon {
  font-size: 18px;
  margin-bottom: 2px;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Ensure content doesn't overlap with bottom nav */
:global(.practice-view .main-content) {
  padding-bottom: 80px;
}

@media (max-width: 480px) {
  .nav-button {
    min-width: 50px;
    padding: 6px 8px;
  }
  
  .nav-icon {
    font-size: 16px;
  }
  
  .nav-label {
    font-size: 10px;
  }
}
</style>