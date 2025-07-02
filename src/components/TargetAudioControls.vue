<template>
  <div class="target-controls">
    <div class="control-row">
      <div class="audio-display">
        <span v-if="!currentAudioSource" class="placeholder-text">
          No audio selected
        </span>
        <span v-else class="current-source">
          {{ currentAudioSource }}
        </span>
      </div>
      <button @click="$emit('browse-file')" class="action-btn file-btn">
        📁 Browse File
      </button>
      <button @click="$emit('load-url')" class="action-btn url-btn">
        🌐 Load URL
      </button>
      <button @click="$emit('load-demo')" class="action-btn demo-btn">
        🎵 Load Demo
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentAudioSource: {
    type: String,
    default: null
  }
})

defineEmits([
  'browse-file',
  'load-url',
  'load-demo'
])
</script>

<style scoped>
.target-controls {
  margin-top: 8px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.audio-display {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background-color: #f9fafb;
  font-size: 14px;
  color: #374151;
  min-height: 20px;
  display: flex;
  align-items: center;
}

.placeholder-text {
  color: #9ca3af;
  font-style: italic;
}

.current-source {
  color: #374151;
  font-weight: 500;
  word-break: break-all;
}

.action-btn {
  padding: 8px 12px;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  background-color: white;
  color: #3b82f6;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: 500;
}

.action-btn:hover {
  background-color: #3b82f6;
  color: white;
}

.file-btn {
  border-color: #059669;
  color: #059669;
}

.file-btn:hover {
  background-color: #059669;
  color: white;
}

.url-btn {
  border-color: #7c3aed;
  color: #7c3aed;
}

.url-btn:hover {
  background-color: #7c3aed;
  color: white;
}

.demo-btn {
  border-color: #f59e0b;
  color: #f59e0b;
}

.demo-btn:hover {
  background-color: #f59e0b;
  color: white;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .target-controls {
    margin-top: 4px;
  }
  
  .control-row {
    gap: 6px;
  }
  
  .audio-display {
    min-width: auto;
    padding: 6px 8px;
    font-size: 12px;
    min-height: 16px;
  }
  
  .action-btn {
    order: 2;
    padding: 6px 10px;
    font-size: 11px;
  }
}
</style>