<template>
  <div class="main-header">
    <div class="title-section">
      <h1>{{ title }}</h1>
      <p class="subtitle">
        <a href="https://github.com/ianhi/AccentShadow" target="_blank" rel="noopener noreferrer" class="github-link">OPEN SOURCE</a> - ALWAYS FREE
      </p>
    </div>
    <button @click="openSettings" class="settings-btn desktop-only" title="Settings">
      ⚙️ Settings
    </button>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: 'AccentShadow'
  }
})

const emit = defineEmits(['open-settings'])

const openSettings = () => {
  emit('open-settings')
}
</script>

<style scoped>
.main-header {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 24px;
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

.settings-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 1.2em;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  color: #ffffff;
}

.settings-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.05);
}

/* Hide settings button on mobile - use bottom nav instead */
@media (max-width: 768px) {
  .main-header h1 {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 0.7rem;
    letter-spacing: 1.2px;
  }
  
  .desktop-only {
    display: none;
  }
}
</style>