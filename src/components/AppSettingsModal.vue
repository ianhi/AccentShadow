<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>App Settings</h2>
        <button @click="closeModal" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- Playback Settings Section -->
        <div class="settings-section">
          <h3>🎵 Playback Settings</h3>
          <p class="settings-description">Configure automatic playback behaviors:</p>
          
          <div class="setting-group">
            <label class="toggle-label">
              <input 
                type="checkbox" 
                v-model="localSettings.autoPlayTargetOnUpload"
                class="toggle-input"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-text">
                <strong>Auto-play target audio on upload</strong>
                <span class="setting-description">Automatically plays target audio once when uploaded</span>
              </span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="saveSettings" class="save-btn">Save Settings</button>
        <button @click="closeModal" class="cancel-btn">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])

// Local settings for the modal
const localSettings = ref({ ...props.settings })

// Watch for changes to props.settings to update local state
watch(() => props.settings, (newSettings) => {
  localSettings.value = { ...newSettings }
}, { deep: true })

const closeModal = () => {
  emit('close')
}

const saveSettings = () => {
  emit('save', localSettings.value)
  closeModal()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  color: #ffffff;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  color: #60a5fa;
  font-size: 1.5em;
}

.close-btn {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section h3 {
  color: #60a5fa;
  margin: 0 0 8px 0;
  font-size: 1.2em;
}

.settings-description {
  color: #d1d5db;
  margin: 0 0 20px 0;
  font-size: 0.9em;
}

.setting-group {
  margin-bottom: 20px;
}

.toggle-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.toggle-input {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 48px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  transition: background-color 0.2s;
  flex-shrink: 0;
  margin-top: 2px;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-slider {
  background: #60a5fa;
}

.toggle-input:checked + .toggle-slider::before {
  transform: translateX(24px);
}

.toggle-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toggle-text strong {
  color: #ffffff;
  font-size: 0.95em;
}

.setting-description {
  color: #9ca3af;
  font-size: 0.85em;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.save-btn, .cancel-btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.save-btn {
  background: #60a5fa;
  color: #ffffff;
}

.save-btn:hover {
  background: #3b82f6;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>