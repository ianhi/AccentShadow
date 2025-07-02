<template>
  <div class="audio-load-buttons">
    <button @click="$emit('browse-file')" class="action-btn file-btn">
      📄 Browse File
    </button>
    <button @click="$emit('upload-folder')" class="action-btn folder-btn">
      📁 Upload Folder
    </button>
    <button @click="$emit('load-url')" class="action-btn url-btn">
      🌐 Load URL
    </button>
    <button @click="$emit('load-demo')" class="action-btn demo-btn">
      🎵 Load Demo
    </button>
    <button @click="$emit('open-sets')" class="action-btn sets-btn">
      📚 Recording Sets
    </button>
  </div>
</template>

<script setup>
defineEmits([
  'browse-file',
  'upload-folder',
  'load-url',
  'load-demo',
  'open-sets'
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

.folder-btn:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.2);
}

.sets-btn:hover {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.2);
}

/* Medium screens - reduce button size and spacing */
@media (max-width: 1024px) and (min-width: 769px) {
  .audio-load-buttons {
    gap: 8px;
    justify-content: center;
  }
  
  .action-btn {
    font-size: 12px;
    padding: 6px 12px;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .audio-load-buttons {
    justify-content: center;
    gap: 6px;
  }
  
  .action-btn {
    font-size: 16px;
    padding: 8px;
    min-width: 40px;
    width: 40px;
    height: 40px;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }
  
  /* Hide text, show only emoji on mobile */
  .action-btn::before {
    content: attr(data-icon);
  }
  
  .file-btn::before {
    content: "📄";
  }
  
  .folder-btn::before {
    content: "📁";
  }
  
  .url-btn::before {
    content: "🌐";
  }
  
  .demo-btn::before {
    content: "🎵";
  }
  
  .sets-btn::before {
    content: "📚";
  }
  
  /* Hide the original content */
  .action-btn {
    font-size: 0;
  }
  
  .action-btn::before {
    font-size: 16px;
  }
}
</style>