<template>
  <div class="main-header">
    <h1>{{ title }}</h1>
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

.main-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(45deg, #00d2ff, #3a7bd5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  margin: 0;
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
  
  .desktop-only {
    display: none;
  }
}
</style>