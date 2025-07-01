<template>
  <div class="recording-actions">
    <button 
      v-if="currentRecording && hasUserAudio" 
      @click="$emit('mark-completed')" 
      :disabled="currentRecording.userRecording?.isCompleted"
      class="complete-btn"
    >
      {{ currentRecording.userRecording?.isCompleted ? '✅ Completed' : '✓ Mark Complete' }}
    </button>
  </div>
</template>

<script setup>
import { useAppStateInject } from '../composables/useAppState'

// Get shared state from app state
const { hasTargetAudio, hasUserAudio } = useAppStateInject()

defineProps({
  currentRecording: {
    type: Object,
    default: null
  }
})

defineEmits(['mark-completed'])
</script>

<style scoped>
.recording-actions {
  display: flex;
  gap: 12px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.complete-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.complete-btn {
  background: rgba(59, 130, 246, 0.9);
  color: white;
}

.complete-btn:hover:not(:disabled) {
  background: rgba(37, 99, 235, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.complete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .recording-actions {
    flex-direction: column;
  }
  
  .complete-btn {
    width: 100%;
  }
}
</style>