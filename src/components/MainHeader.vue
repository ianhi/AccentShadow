<template>
  <div class="main-header">
    <div class="title-section">
      <h1>{{ title }}</h1>
      <p class="subtitle">
        <a href="https://github.com/ianhi/AccentShadow" target="_blank" rel="noopener noreferrer" class="github-link">OPEN SOURCE</a> - ALWAYS FREE
      </p>
    </div>
    <div class="header-actions">
      <button @click="openGuide" class="guide-btn" title="How Audio Processing Works">
        📖 Guide
      </button>
      <button @click="openSettings" class="settings-btn" title="Settings">
        ⚙️ Settings
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'AccentShadow'
  }
})

const emit = defineEmits(['open-settings', 'open-guide'])

const openSettings = () => {
  emit('open-settings')
}

const openGuide = () => {
  emit('open-guide')
}
</script>

<style scoped>
.main-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 16px;
}

.title-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.main-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(45deg, #00d2ff, #3a7bd5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  margin: 0;
}

.subtitle {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  margin: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.github-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  border-bottom: 1px solid transparent;
}

.github-link:hover {
  color: #00d2ff;
  border-bottom-color: #00d2ff;
  text-shadow: 0 0 8px rgba(0, 210, 255, 0.3);
}

.header-actions {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 8px;
  align-items: center;
}

.guide-btn,
.settings-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  color: #ffffff;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

.guide-btn:hover,
.settings-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.guide-btn {
  font-size: 1rem;
  font-weight: 500;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .main-header {
    margin-bottom: 8px;
  }
  
  .main-header h1 {
    font-size: 1.8rem;
  }
  
  .subtitle {
    font-size: 0.7rem;
    letter-spacing: 1.2px;
  }
  
  .header-actions {
    gap: 6px;
  }
  
  .guide-btn,
  .settings-btn {
    font-size: 0;
    padding: 10px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .guide-btn::before {
    content: "📖";
    font-size: 18px;
  }
  
  .settings-btn::before {
    content: "⚙️";
    font-size: 18px;
  }
}
</style>