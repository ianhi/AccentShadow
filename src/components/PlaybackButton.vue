<template>
  <button 
    @click="$emit('click')"
    :disabled="disabled"
    :class="[
      'playback-btn',
      variant,
      { 'processing': processing }
    ]"
  >
    <span class="btn-icon">{{ icon }}</span>
    <span class="btn-label">{{ label }}</span>
  </button>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'target', 'user', 'overlapping', 'sequential', 'stop', 'primary'].includes(value)
  },
  processing: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])
</script>

<style scoped>
.playback-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 12px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
  min-height: 80px;
  min-width: 120px;
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.playback-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

.playback-btn:disabled {
  background-color: rgba(148, 163, 184, 0.5);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  transform: none;
  backdrop-filter: blur(5px);
}

.playback-btn.processing {
  background-color: rgba(59, 130, 246, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.btn-icon {
  font-size: 24px;
}

.btn-label {
  font-size: 13px;
  font-weight: 600;
}

/* Variant styles */
.playback-btn.target {
  background-color: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.3);
}

.playback-btn.target:hover:not(:disabled) {
  background-color: rgba(16, 185, 129, 0.3);
}

.playback-btn.user {
  background-color: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.3);
}

.playback-btn.user:hover:not(:disabled) {
  background-color: rgba(59, 130, 246, 0.3);
}

.playback-btn.overlapping {
  background-color: rgba(168, 85, 247, 0.2);
  border-color: rgba(168, 85, 247, 0.3);
}

.playback-btn.overlapping:hover:not(:disabled) {
  background-color: rgba(168, 85, 247, 0.3);
}

.playback-btn.sequential {
  background-color: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.3);
}

.playback-btn.sequential:hover:not(:disabled) {
  background-color: rgba(245, 158, 11, 0.3);
}

.playback-btn.stop {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
}

.playback-btn.stop:hover:not(:disabled) {
  background-color: rgba(239, 68, 68, 0.3);
}

.playback-btn.primary {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.playback-btn.primary:hover:not(:disabled) {
  background-color: #2563eb;
}

/* Mobile styles */
@media (max-width: 768px) {
  .playback-btn {
    min-width: 100px;
    min-height: 60px;
    font-size: 12px;
    padding: 12px 8px;
    gap: 6px;
  }
  
  .btn-icon {
    font-size: 18px;
  }

  .btn-label {
    font-size: 11px;
  }
}

/* Compact mobile variant */
.playback-btn.compact {
  min-height: 50px;
  min-width: 80px;
  padding: 8px 6px;
  gap: 4px;
  font-size: 11px;
}

.playback-btn.compact .btn-icon {
  font-size: 16px;
}

.playback-btn.compact .btn-label {
  font-size: 10px;
}
</style>