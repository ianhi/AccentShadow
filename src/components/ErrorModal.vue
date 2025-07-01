<template>
  <div v-if="isVisible" class="error-modal-overlay" @click="handleOverlayClick">
    <div class="error-modal-content" @click.stop>
      <div class="error-modal-header">
        <h3>⚠️ Error</h3>
        <button @click="close" class="error-close-btn">&times;</button>
      </div>
      
      <div class="error-modal-body">
        <div class="error-title">{{ title }}</div>
        <div class="error-message">{{ message }}</div>
        
        <div v-if="details" class="error-details">
          <details>
            <summary>Technical Details</summary>
            <pre class="error-details-content">{{ details }}</pre>
          </details>
        </div>
      </div>
      
      <div class="error-modal-actions">
        <button @click="close" class="error-ok-btn">OK</button>
        <button v-if="showReload" @click="reloadPage" class="error-reload-btn">Reload Page</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

interface Props {
  isVisible: boolean
  title: string
  message: string
  details?: string
  showReload?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  details: '',
  showReload: false
})

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}

const handleOverlayClick = () => {
  close()
}

const reloadPage = () => {
  window.location.reload()
}
</script>

<style scoped>
.error-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000; /* Higher than other modals */
  padding: 1rem;
}

.error-modal-content {
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.2);
  color: #ffffff;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.error-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
}

.error-modal-header h3 {
  margin: 0;
  color: #f87171;
  font-size: 1.3em;
  font-weight: 600;
}

.error-close-btn {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.error-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.error-modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.error-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #fca5a5;
  margin-bottom: 12px;
}

.error-message {
  color: #e5e7eb;
  line-height: 1.6;
  margin-bottom: 16px;
  white-space: pre-line;
}

.error-details {
  margin-top: 16px;
}

.error-details summary {
  color: #9ca3af;
  cursor: pointer;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 8px;
}

.error-details summary:hover {
  color: #e5e7eb;
}

.error-details-content {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 6px;
  font-size: 0.85em;
  color: #d1d5db;
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.error-modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(239, 68, 68, 0.2);
}

.error-ok-btn,
.error-reload-btn {
  flex: 1;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.95em;
  transition: all 0.2s;
  min-height: 44px;
}

.error-ok-btn {
  background: rgba(239, 68, 68, 0.8);
  color: #ffffff;
}

.error-ok-btn:hover {
  background: rgba(239, 68, 68, 1);
  transform: translateY(-1px);
}

.error-reload-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #e5e7eb;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.error-reload-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .error-modal-overlay {
    padding: 0.5rem;
  }

  .error-modal-content {
    max-height: 90vh;
  }

  .error-modal-actions {
    flex-direction: column;
  }

  .error-ok-btn,
  .error-reload-btn {
    width: 100%;
  }
}
</style>