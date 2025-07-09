<template>
  <div v-if="isOpen" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>VAD Settings</h2>
        <button @click="closeModal" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- VAD Presets Section -->
        <div class="presets-section">
          <h3>🎯 VAD Presets</h3>
          <p class="presets-description">Choose a preset optimized for different audio types:</p>
          <div class="preset-buttons">
            <button @click="applyPreset('conservative')" class="preset-btn conservative">
              <span class="preset-icon">🛡️</span>
              <span class="preset-name">Conservative</span>
              <span class="preset-desc">Noisy environments</span>
            </button>
            <button @click="applyPreset('lenient')" class="preset-btn lenient">
              <span class="preset-icon">🎤</span>
              <span class="preset-name">Balanced</span>
              <span class="preset-desc">General use</span>
            </button>
            <button @click="applyPreset('very-sensitive')" class="preset-btn very-sensitive">
              <span class="preset-icon">🔍</span>
              <span class="preset-name">Very Sensitive</span>
              <span class="preset-desc">Clean environments</span>
            </button>
          </div>
        </div>
        
        <!-- Individual Settings Section -->
        <div class="individual-settings">
          <h3>⚙️ Manual Settings</h3>
          <p class="settings-description">Fine-tune individual VAD parameters:</p>
        </div>
        
        <div class="setting-group">
          <label>
            Padding (seconds):
            <input type="number" v-model.number="localSettings.padding" step="0.01" min="0" max="0.5" />
            <span class="hint">Padding around detected speech</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Threshold:
            <input type="number" v-model.number="localSettings.threshold" step="0.01" min="0" max="1" />
            <span class="hint">VAD sensitivity (lower = more sensitive)</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Min Speech Duration (ms):
            <input type="number" v-model.number="localSettings.minSpeechDuration" step="10" min="10" max="500" />
            <span class="hint">Minimum speech segment length</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Max Silence Duration (ms):
            <input type="number" v-model.number="localSettings.maxSilenceDuration" step="10" min="10" max="1000" />
            <span class="hint">Maximum gap between speech segments</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Max Trim Start (s):
            <input type="number" v-model.number="localSettings.maxTrimStart" step="0.1" min="0" max="5" />
            <span class="hint">Maximum silence to trim from start</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Max Trim End (s):
            <input type="number" v-model.number="localSettings.maxTrimEnd" step="0.1" min="0" max="5" />
            <span class="hint">Maximum silence to trim from end</span>
          </label>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="resetToDefaults" class="reset-btn">Reset to Defaults</button>
        <button @click="saveSettings" class="save-btn">Save Settings</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  settings: Object
})

const emit = defineEmits(['close', 'save'])

const localSettings = ref({
  padding: 0.2,
  threshold: 0.25,
  minSpeechDuration: 50,
  maxSilenceDuration: 500,
  maxTrimStart: 3.0,
  maxTrimEnd: 2.0
})

// Watch for settings prop changes
watch(() => props.settings, (newSettings) => {
  if (newSettings) {
    localSettings.value = { ...newSettings }
  }
}, { immediate: true })

const closeModal = () => {
  emit('close')
}

const saveSettings = () => {
  emit('save', { ...localSettings.value })
  closeModal()
}

const resetToDefaults = () => {
  localSettings.value = {
    padding: 0.2,
    threshold: 0.25,
    minSpeechDuration: 50,
    maxSilenceDuration: 500,
    maxTrimStart: 3.0,
    maxTrimEnd: 2.0
  }
}

const applyPreset = (presetName) => {
  const presets = {
    conservative: {
      padding: 0.1,
      threshold: 0.5,
      minSpeechDuration: 50,
      maxSilenceDuration: 300,
      maxTrimStart: 3.0,
      maxTrimEnd: 2.0
    },
    lenient: {
      padding: 0.1,
      threshold: 0.4,  // Better balance for detecting silence
      minSpeechDuration: 30,
      maxSilenceDuration: 500,
      maxTrimStart: 3.0,
      maxTrimEnd: 2.0
    },
    'very-sensitive': {
      padding: 0.1,
      threshold: 0.3,  // More sensitive for better trimming
      minSpeechDuration: 20,
      maxSilenceDuration: 800,
      maxTrimStart: 3.0,
      maxTrimEnd: 2.0
    }
  }
  
  if (presets[presetName]) {
    localSettings.value = { ...presets[presetName] }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  color: #1f2937;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 20px;
}

.setting-group {
  margin-bottom: 20px;
}

.setting-group label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-weight: 600;
  color: #374151;
}

.setting-group input {
  padding: 10px 12px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  background: white;
  color: #1f2937;
}

.setting-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.hint {
  font-size: 12px;
  color: #6b7280;
  font-weight: 400;
  font-style: italic;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  gap: 12px;
}

.reset-btn, .save-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn {
  background: #f59e0b;
  color: white;
}

.reset-btn:hover {
  background: #d97706;
}

.save-btn {
  background: #10b981;
  color: white;
}

.save-btn:hover {
  background: #059669;
}

/* VAD Presets Styles */
.presets-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.presets-section h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.presets-description {
  margin: 0 0 16px 0;
  color: #6b7280;
  font-size: 14px;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  border: 2px solid #d1d5db;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
  min-height: 100px;
  justify-content: center;
}

.preset-btn:hover {
  border-color: #3b82f6;
  background: #f8faff;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.preset-btn.conservative:hover {
  border-color: #059669;
  background: #f0fdf4;
}

.preset-btn.lenient:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.preset-btn.very-sensitive:hover {
  border-color: #f59e0b;
  background: #fffbeb;
}

.preset-icon {
  font-size: 24px;
  margin-bottom: 8px;
  display: block;
}

.preset-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
  margin-bottom: 4px;
  display: block;
}

.preset-desc {
  font-size: 12px;
  color: #6b7280;
  display: block;
}

.individual-settings {
  margin-bottom: 20px;
}

.individual-settings h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.settings-description {
  margin: 0 0 16px 0;
  color: #6b7280;
  font-size: 14px;
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-content {
    max-height: 90vh;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 15px;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .reset-btn, .save-btn {
    width: 100%;
  }
}
</style>