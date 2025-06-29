<template>
  <div class="playback-buttons">
    <button @click="$emit('play-target')" :disabled="!hasTargetAudio" class="playback-btn target-btn">
      <span class="btn-icon">🎯</span>
      <span>Play Target</span>
    </button>
    <button @click="$emit('play-user')" :disabled="!hasUserAudio" class="playback-btn user-btn">
      <span class="btn-icon">🎤</span>
      <span>Play Recording</span>
    </button>
    <button @click="$emit('play-overlapping')" :disabled="!hasTargetAudio || !hasUserAudio" class="playback-btn overlapping-btn">
      <span class="btn-icon">🔄</span>
      <span>Play Overlapping</span>
    </button>
    <button @click="$emit('play-sequential')" :disabled="!hasTargetAudio || !hasUserAudio" class="playback-btn sequential-btn">
      <span class="btn-icon">📋</span>
      <span>Play Sequential</span>
    </button>
    <button @click="$emit('stop-all')" class="playback-btn stop-btn">
      <span class="btn-icon">⏹</span>
      <span>Stop All</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  hasTargetAudio: {
    type: Boolean,
    default: false
  },
  hasUserAudio: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'play-target',
  'play-user', 
  'play-overlapping',
  'play-sequential',
  'stop-all'
])
</script>

<style scoped>
.playback-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

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

.btn-icon {
  font-size: 24px;
}

/* Variant styles */
.playback-btn.target-btn {
  background-color: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.3);
}

.playback-btn.target-btn:hover:not(:disabled) {
  background-color: rgba(16, 185, 129, 0.3);
}

.playback-btn.user-btn {
  background-color: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.3);
}

.playback-btn.user-btn:hover:not(:disabled) {
  background-color: rgba(59, 130, 246, 0.3);
}

.playback-btn.overlapping-btn {
  background-color: rgba(168, 85, 247, 0.2);
  border-color: rgba(168, 85, 247, 0.3);
}

.playback-btn.overlapping-btn:hover:not(:disabled) {
  background-color: rgba(168, 85, 247, 0.3);
}

.playback-btn.sequential-btn {
  background-color: rgba(245, 158, 11, 0.2);
  border-color: rgba(245, 158, 11, 0.3);
}

.playback-btn.sequential-btn:hover:not(:disabled) {
  background-color: rgba(245, 158, 11, 0.3);
}

.playback-btn.stop-btn {
  background-color: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.3);
}

.playback-btn.stop-btn:hover:not(:disabled) {
  background-color: rgba(239, 68, 68, 0.3);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .playback-buttons {
    gap: 8px;
  }
  
  .playback-btn {
    min-width: 100px;
    min-height: 60px;
    padding: 12px 8px;
    font-size: 12px;
  }
  
  .btn-icon {
    font-size: 18px;
  }
}
</style>