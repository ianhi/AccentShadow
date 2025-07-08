<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed, onMounted } from 'vue'
import { usePreloader } from './composables/usePreloader'
import { useDemoData } from './composables/useDemoData'
import { useErrorModal } from './composables/useErrorModal'
import DemoDataPrompt from './components/DemoDataPrompt.vue'
import ErrorModal from './components/ErrorModal.vue'

const route = useRoute()
const { preloadAll, preloadStatus } = usePreloader()
const { initializeFirstVisitDetection, resetDemoState } = useDemoData()
const { isVisible, title, message, details, showReload, hideError } = useErrorModal()

// Development mode detection
const isDevelopment = computed(() => import.meta.env.DEV)

// Reset demo state for development
const handleResetDemo = () => {
  console.log('🔄 Manually resetting demo state for development')
  resetDemoState()
}

// Show navigation only on main app routes, hide on mobile demos
const showNavigation = computed(() => {
  return !route.path.startsWith('/mobile')
})

// Comprehensive background initialization - start immediately on app load
onMounted(async () => {
  console.log('🚀 Starting comprehensive background preloading...')

  // Initialize demo data detection
  initializeFirstVisitDetection()

  // Start preloading without blocking UI rendering
  preloadAll().then(() => {
    console.log('🎉 Background preloading completed:', {
      vad: preloadStatus.value.vad,
      audioContext: preloadStatus.value.audioContext,
      wavesurfer: preloadStatus.value.wavesurfer,
      ready: preloadStatus.value.complete
    })
  }).catch((error) => {
    console.log('⚠️ Some background preloading failed (fallbacks will handle):', error)
  })
})
</script>

<template>
  <div>
    <!-- Navigation for main app views -->
    <div v-if="showNavigation" class="view-switcher">
      <router-link to="/" class="nav-btn" :class="{ active: route.path === '/' }">
        Main App
      </router-link>
      <router-link 
        v-if="isDevelopment"
        to="/alignment-test" 
        class="nav-btn" 
        :class="{ active: route.path === '/alignment-test' }"
      >
        Alignment Test
      </router-link>
      <!-- Development button to reset demo state -->
      <button 
        v-if="isDevelopment" 
        @click="handleResetDemo" 
        class="nav-btn dev-btn"
        title="Reset demo state (dev only)"
      >
        🎯 Demo
      </button>
    </div>

    <!-- Back button for mobile views -->
    <div v-if="!showNavigation && route.path !== '/mobile-demo'" class="mobile-back">
      <router-link to="/mobile-demo" class="back-btn">
        ← Back to Mobile Demo
      </router-link>
    </div>

    <!-- Demo data prompt for first-time users -->
    <DemoDataPrompt />

    <!-- Global error modal for production debugging -->
    <ErrorModal 
      :isVisible="isVisible"
      :title="title"
      :message="message"
      :details="details"
      :showReload="showReload"
      @close="hideError"
    />

    <!-- Router view for all pages -->
    <router-view />
  </div>
</template>

<style scoped>
.view-switcher {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.nav-btn {
  padding: 8px 16px;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  background-color: white;
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.nav-btn:hover {
  background-color: #3b82f6;
  color: white;
}

.nav-btn.active {
  background-color: #3b82f6;
  color: white;
}

.dev-btn {
  border-color: #f59e0b !important;
  color: #f59e0b !important;
  cursor: pointer;
}

.dev-btn:hover {
  background-color: #f59e0b !important;
  color: white !important;
}

.mobile-demo-btn {
  border-color: #10b981;
  color: #10b981;
}

.mobile-demo-btn:hover,
.mobile-demo-btn.active {
  background-color: #10b981;
  color: white;
}

.mobile-back {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 1000;
}

.back-btn {
  padding: 8px 16px;
  border: 2px solid #6b7280;
  border-radius: 6px;
  background-color: white;
  color: #6b7280;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.back-btn:hover {
  background-color: #6b7280;
  color: white;
}

/* Hide navigation on small screens for mobile demos */
@media (max-width: 768px) {
  .view-switcher {
    display: none;
  }

  .mobile-back {
    position: static;
    padding: 10px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
  }
  
  .back-btn {
    border: none;
    background: #f3f4f6;
    color: #374151;
  }
}
</style>
