<template>
  <div class="audio-load-buttons">
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
</template>

<script setup>
defineEmits([
  'browse-file',
  'load-url',
  'load-demo'
])
</script>

<style scoped>
.audio-load-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: white;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.file-btn:hover {
  border-color: #60a5fa;
  background: rgba(96, 165, 250, 0.2);
}

.url-btn:hover {
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.2);
}

.demo-btn:hover {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.2);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .audio-load-buttons {
    justify-content: center;
  }
  
  .action-btn {
    font-size: 13px;
    padding: 8px 12px;
  }
}
</style>