<template>
  <div v-if="isOpen" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>🌐 Load Audio from URL</h3>
      <input 
        type="url" 
        v-model="localUrl" 
        placeholder="Enter audio URL (e.g., https://example.com/audio.mp3)"
        class="url-input-modal"
        @keyup.enter="handleLoad"
        ref="urlInputRef"
      />
      <div class="modal-actions">
        <button @click="$emit('close')" class="cancel-btn">Cancel</button>
        <button @click="handleLoad" :disabled="!localUrl.trim()" class="load-btn">
          Load Audio
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  url: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'load-url'])

const localUrl = ref('')
const urlInputRef = ref(null)

// Sync with parent's url prop
watch(() => props.url, (newUrl) => {
  localUrl.value = newUrl
}, { immediate: true })

// Auto-focus when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      urlInputRef.value?.focus()
    })
  }
})

const handleLoad = () => {
  const url = localUrl.value.trim()
  if (url) {
    emit('load-url', url)
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: rgba(255, 255, 255, 0.15);
  padding: 24px;
  border-radius: 16px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  min-width: 400px;
  max-width: 90vw;
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: white;
  font-size: 20px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.url-input-modal {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
  backdrop-filter: blur(10px);
  margin-bottom: 16px;
}

.url-input-modal::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.url-input-modal:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn,
.load-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cancel-btn {
  background: rgba(107, 114, 128, 0.9);
  color: white;
}

.cancel-btn:hover {
  background: rgba(75, 85, 99, 0.9);
  transform: translateY(-1px);
}

.load-btn {
  background: rgba(59, 130, 246, 0.9);
  color: white;
}

.load-btn:hover:not(:disabled) {
  background: rgba(37, 99, 235, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.load-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-content {
    min-width: 300px;
    padding: 20px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .cancel-btn,
  .load-btn {
    width: 100%;
  }
}
</style>