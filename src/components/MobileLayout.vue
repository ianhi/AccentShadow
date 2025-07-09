<template>
  <div class="mobile-layout">
    <!-- Mobile Header -->
    <header class="mobile-header">
      <div class="header-content">
        <button @click="toggleSidebar" class="menu-btn">
          <span class="menu-icon">☰</span>
        </button>
        <h1 class="app-title">EchoLingo</h1>
        <button @click="toggleStats" class="stats-btn">
          <span class="stats-icon">📊</span>
        </button>
      </div>
    </header>

    <!-- Collapsible Session Stats -->
    <Transition name="slide-down">
      <div v-if="showStats" class="mobile-stats-container">
        <SessionStats />
      </div>
    </Transition>

    <!-- Main Content Area -->
    <main class="mobile-main">
      <slot name="content"></slot>
    </main>

    <!-- Mobile Sidebar Overlay -->
    <Transition name="slide-left">
      <div v-if="showSidebar" class="mobile-sidebar-overlay" @click="closeSidebar">
        <div class="mobile-sidebar" @click.stop>
          <div class="sidebar-header">
            <h2>Recording Sets</h2>
            <button @click="closeSidebar" class="close-btn">×</button>
          </div>
          <div class="sidebar-content">
            <slot name="sidebar"></slot>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Bottom Navigation/Quick Actions -->
    <nav class="mobile-bottom-nav">
      <slot name="bottom-nav"></slot>
    </nav>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import SessionStats from './SessionStats.vue';

// Mobile UI state
const showSidebar = ref(false);
const showStats = ref(false);

// Mobile navigation methods
const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value;
};

const closeSidebar = () => {
  showSidebar.value = false;
};

const toggleStats = () => {
  showStats.value = !showStats.value;
};

// Expose methods for parent components
defineExpose({
  toggleSidebar,
  closeSidebar,
  toggleStats
});
</script>

<style scoped>
.mobile-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: #f8fafc;
  width: 100%;
  box-sizing: border-box;
}

/* Mobile Header */
.mobile-header {
  background-color: #8b5cf6;
  color: white;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 100;
  position: relative;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  /* Account for mobile safe areas */
  padding-top: max(12px, env(safe-area-inset-top));
}

.menu-btn, .stats-btn {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  min-width: 44px; /* Touch target minimum */
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-btn:hover, .stats-btn:hover {
  background-color: rgba(255,255,255,0.1);
}

.app-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  flex: 1;
  text-align: center;
}

/* Collapsible Stats */
.mobile-stats-container {
  background-color: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 16px;
}

/* Main Content */
.mobile-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* Mobile Sidebar */
.mobile-sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  z-index: 200;
  display: flex;
}

.mobile-sidebar {
  background-color: white;
  width: 280px;
  max-width: 80vw;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 12px rgba(0,0,0,0.15);
  overflow-x: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  min-width: 32px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background-color: #f1f5f9;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* Bottom Navigation */
.mobile-bottom-nav {
  background-color: white;
  border-top: 1px solid #e2e8f0;
  padding: 8px 16px;
  /* Account for mobile safe areas */
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}

/* Animations */
.slide-down-enter-active, .slide-down-leave-active {
  transition: all 0.3s ease;
  max-height: 200px;
}

.slide-down-enter-from, .slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

.slide-left-enter-active, .slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from, .slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .mobile-main {
    padding: 12px;
  }
  
  .mobile-sidebar {
    width: 260px;
    max-width: 85vw;
  }
}

@media (max-width: 480px) {
  .app-title {
    font-size: 16px;
  }
  
  .mobile-main {
    padding: 8px;
  }
  
  .mobile-sidebar {
    width: 240px;
    max-width: 90vw;
  }
  
  .header-content {
    padding: 8px 12px;
  }
}

@media (max-width: 360px) {
  .mobile-main {
    padding: 6px;
  }
  
  .mobile-sidebar {
    width: 220px;
    max-width: 95vw;
  }
  
  .header-content {
    padding: 6px 10px;
  }
}

/* Landscape mode adjustments */
@media (orientation: landscape) and (max-height: 500px) {
  .header-content {
    padding: 8px 16px;
  }
  
  .mobile-main {
    padding: 8px 16px;
  }
}
</style>