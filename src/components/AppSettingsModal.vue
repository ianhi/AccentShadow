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

        <!-- Audio Effects Section -->
        <div class="settings-section">
          <h3>🎚️ Audio Effects</h3>
          <p class="settings-description">Enhance audio quality with professional processing effects:</p>
          
          <!-- Effect Targets -->
          <div class="setting-group">
            <h4 class="subsection-title">Apply Effects To</h4>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="localEffectsConfig.targets.applyToTarget"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">Target Audio</span>
              </label>
              
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="localEffectsConfig.targets.applyToUser"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">User Recording</span>
              </label>
            </div>
          </div>

          <!-- Recording Constraints -->
          <div class="setting-group" v-if="capabilities?.mediaConstraints">
            <h4 class="subsection-title">Recording Quality</h4>
            <p class="setting-description">Real-time processing during recording (browser dependent):</p>
            
            <div class="checkbox-group">
              <label class="checkbox-label" v-if="capabilities.mediaConstraints.noiseSuppression">
                <input 
                  type="checkbox" 
                  v-model="localEffectsConfig.recordingConstraints.noiseSuppression"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">
                  Noise Suppression
                  <span class="feature-note">Reduces background noise</span>
                </span>
              </label>
              
              <label class="checkbox-label" v-if="capabilities.mediaConstraints.echoCancellation">
                <input 
                  type="checkbox" 
                  v-model="localEffectsConfig.recordingConstraints.echoCancellation"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">
                  Echo Cancellation
                  <span class="feature-note">Prevents feedback loops</span>
                </span>
              </label>
              
              <label class="checkbox-label" v-if="capabilities.mediaConstraints.autoGainControl">
                <input 
                  type="checkbox" 
                  v-model="localEffectsConfig.recordingConstraints.autoGainControl"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">
                  Auto Gain Control
                  <span class="feature-note">Automatic volume adjustment</span>
                </span>
              </label>
            </div>
            
            <div v-if="isSafari" class="browser-note">
              <span class="warning-icon">⚠️</span>
              Some recording features may not be available in Safari
            </div>
          </div>

          <!-- Dynamic Compression -->
          <div class="setting-group" v-if="capabilities?.webAudio.dynamicsCompressor">
            <h4 class="subsection-title">
              <label class="toggle-label-inline">
                <input 
                  type="checkbox" 
                  v-model="localEffectsConfig.postProcessing.compression.enabled"
                  class="toggle-input"
                />
                <span class="toggle-slider-small"></span>
                Dynamic Compression
              </label>
            </h4>
            <p class="setting-description">Smooth out volume differences for consistent listening:</p>
            
            <div class="effect-controls" :class="{ 'disabled-effect': !localEffectsConfig.postProcessing.compression.enabled }">
              <div class="slider-group">
                <label class="slider-label">
                  Threshold: {{ localEffectsConfig.postProcessing.compression.threshold }}dB
                  <input 
                    type="range" 
                    v-model="localEffectsConfig.postProcessing.compression.threshold"
                    min="-50" 
                    max="-10" 
                    step="1"
                    class="slider"
                    :disabled="!localEffectsConfig.postProcessing.compression.enabled"
                  />
                </label>
              </div>
              
              <div class="slider-group">
                <label class="slider-label">
                  Ratio: {{ localEffectsConfig.postProcessing.compression.ratio }}:1
                  <input 
                    type="range" 
                    v-model="localEffectsConfig.postProcessing.compression.ratio"
                    min="1" 
                    max="20" 
                    step="1"
                    class="slider"
                    :disabled="!localEffectsConfig.postProcessing.compression.enabled"
                  />
                </label>
              </div>
              
              <div class="slider-group">
                <label class="slider-label">
                  Attack: {{ (localEffectsConfig.postProcessing.compression.attack * 1000).toFixed(0) }}ms
                  <input 
                    type="range" 
                    v-model="localEffectsConfig.postProcessing.compression.attack"
                    min="0" 
                    max="0.1" 
                    step="0.001"
                    class="slider"
                    :disabled="!localEffectsConfig.postProcessing.compression.enabled"
                  />
                </label>
              </div>
              
              <div class="slider-group">
                <label class="slider-label">
                  Release: {{ (localEffectsConfig.postProcessing.compression.release * 1000).toFixed(0) }}ms
                  <input 
                    type="range" 
                    v-model="localEffectsConfig.postProcessing.compression.release"
                    min="0" 
                    max="1" 
                    step="0.01"
                    class="slider"
                    :disabled="!localEffectsConfig.postProcessing.compression.enabled"
                  />
                </label>
              </div>
            </div>
          </div>

          <!-- Gain Control -->
          <div class="setting-group" v-if="capabilities?.webAudio.gainNode">
            <h4 class="subsection-title">
              <label class="toggle-label-inline">
                <input 
                  type="checkbox" 
                  v-model="localEffectsConfig.postProcessing.gain.enabled"
                  class="toggle-input"
                />
                <span class="toggle-slider-small"></span>
                Volume Boost
              </label>
            </h4>
            <p class="setting-description">Adjust overall volume level:</p>
            
            <div class="effect-controls" :class="{ 'disabled-effect': !localEffectsConfig.postProcessing.gain.enabled }">
              <div class="slider-group">
                <label class="slider-label">
                  Gain: {{ (localEffectsConfig.postProcessing.gain.gain * 100).toFixed(0) }}%
                  <input 
                    type="range" 
                    v-model="localEffectsConfig.postProcessing.gain.gain"
                    min="0.1" 
                    max="2.0" 
                    step="0.1"
                    class="slider"
                    :disabled="!localEffectsConfig.postProcessing.gain.enabled"
                    @input="onGainSliderChange"
                  />
                </label>
                <p v-if="!localEffectsConfig.postProcessing.gain.enabled" class="disabled-note">
                  Enable "Volume Boost" above to use this control
                </p>
              </div>
            </div>
          </div>

          <!-- Equalizer -->
          <div class="setting-group" v-if="capabilities?.webAudio.biquadFilter">
            <h4 class="subsection-title">
              <label class="toggle-label-inline">
                <input 
                  type="checkbox" 
                  v-model="localEffectsConfig.postProcessing.eq.enabled"
                  class="toggle-input"
                />
                <span class="toggle-slider-small"></span>
                Equalizer
              </label>
            </h4>
            <p class="setting-description">Adjust frequency response for better clarity:</p>
            
            <div class="effect-controls" :class="{ 'disabled-effect': !localEffectsConfig.postProcessing.eq.enabled }">
              <div class="eq-controls">
                <div class="slider-group">
                  <label class="slider-label">
                    Bass: {{ localEffectsConfig.postProcessing.eq.lowGain > 0 ? '+' : '' }}{{ localEffectsConfig.postProcessing.eq.lowGain }}dB
                    <input 
                      type="range" 
                      v-model="localEffectsConfig.postProcessing.eq.lowGain"
                      min="-20" 
                      max="20" 
                      step="1"
                      class="slider"
                      :disabled="!localEffectsConfig.postProcessing.eq.enabled"
                    />
                  </label>
                </div>
                
                <div class="slider-group">
                  <label class="slider-label">
                    Mid: {{ localEffectsConfig.postProcessing.eq.midGain > 0 ? '+' : '' }}{{ localEffectsConfig.postProcessing.eq.midGain }}dB
                    <input 
                      type="range" 
                      v-model="localEffectsConfig.postProcessing.eq.midGain"
                      min="-20" 
                      max="20" 
                      step="1"
                      class="slider"
                      :disabled="!localEffectsConfig.postProcessing.eq.enabled"
                    />
                  </label>
                </div>
                
                <div class="slider-group">
                  <label class="slider-label">
                    Treble: {{ localEffectsConfig.postProcessing.eq.highGain > 0 ? '+' : '' }}{{ localEffectsConfig.postProcessing.eq.highGain }}dB
                    <input 
                      type="range" 
                      v-model="localEffectsConfig.postProcessing.eq.highGain"
                      min="-20" 
                      max="20" 
                      step="1"
                      class="slider"
                      :disabled="!localEffectsConfig.postProcessing.eq.enabled"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Reset Effects -->
          <div class="setting-group">
            <button @click="resetEffectsToDefaults" class="reset-btn">
              🔄 Reset to Defaults
            </button>
          </div>
        </div>

        <!-- VAD Settings Section -->
        <div class="settings-section">
          <h3>🎛️ Audio Processing (VAD)</h3>
          <p class="settings-description">Configure Voice Activity Detection settings for automatic silence trimming:</p>
          
          <div class="setting-group">
            <button @click="openVadSettings" class="vad-settings-btn">
              ⚙️ Configure VAD Settings
            </button>
            <p class="setting-description">Adjust threshold, padding, and other VAD parameters for better audio trimming</p>
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
import { ref, watch, computed, onMounted } from 'vue'
import { useAudioEffects } from '../composables/useAudioEffects'

const props = defineProps({
  isOpen: Boolean,
  settings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'save', 'open-vad-settings', 'save-effects'])

// Initialize audio effects composable
const { 
  effectsConfig, 
  capabilities: detectedCapabilities, 
  resetToDefaults: resetEffectsDefaults,
  detectCapabilities 
} = useAudioEffects()

// Local settings for the modal
const localSettings = ref({ ...props.settings })
const localEffectsConfig = ref({ ...effectsConfig.value })

// Browser capabilities (detected on mount)
const capabilities = ref(null)

// Browser detection
const isSafari = computed(() => {
  return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
})

// Watch for changes to props.settings to update local state
watch(() => props.settings, (newSettings) => {
  localSettings.value = { ...newSettings }
}, { deep: true })

// Watch for changes to effectsConfig to update local state
watch(() => effectsConfig.value, (newConfig) => {
  localEffectsConfig.value = { ...newConfig }
}, { deep: true })

// Detect capabilities on mount
onMounted(() => {
  // Use existing capabilities if available, otherwise detect
  capabilities.value = detectedCapabilities.value || detectCapabilities()
  console.log('🎚️ Audio effects capabilities detected:', capabilities.value)
})

const closeModal = () => {
  emit('close')
}

const saveSettings = () => {
  // Save both regular settings and effects configuration
  emit('save', localSettings.value)
  emit('save-effects', localEffectsConfig.value)
  closeModal()
}

const openVadSettings = () => {
  emit('open-vad-settings')
}

const resetEffectsToDefaults = () => {
  // Reset to default configuration
  resetEffectsDefaults()
  localEffectsConfig.value = { ...effectsConfig.value }
  console.log('🔄 Effects configuration reset to defaults')
}

const onGainSliderChange = () => {
  // Auto-enable gain when user interacts with slider
  if (!localEffectsConfig.value.postProcessing.gain.enabled) {
    localEffectsConfig.value.postProcessing.gain.enabled = true
    console.log('🎚️ Auto-enabled gain effect when user moved slider')
  }
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

.vad-settings-btn {
  padding: 12px 20px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  backdrop-filter: blur(10px);
  margin-bottom: 8px;
  width: 100%;
  font-size: 14px;
}

.vad-settings-btn:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(96, 165, 250, 0.4);
  transform: translateY(-1px);
}

/* Audio Effects Styles */
.subsection-title {
  color: #e5e7eb;
  font-size: 1em;
  font-weight: 600;
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  display: none;
}

.checkbox-custom {
  position: relative;
  width: 18px;
  height: 18px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-top: 2px;
}

.checkbox-custom::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 6px;
  height: 10px;
  border: solid #ffffff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  opacity: 0;
  transition: opacity 0.2s;
}

.checkbox-input:checked + .checkbox-custom {
  background: #60a5fa;
  border-color: #60a5fa;
}

.checkbox-input:checked + .checkbox-custom::after {
  opacity: 1;
}

.checkbox-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #ffffff;
  font-size: 0.9em;
}

.feature-note {
  color: #9ca3af;
  font-size: 0.8em;
  font-style: italic;
}

.browser-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 6px;
  margin-top: 12px;
  font-size: 0.85em;
  color: #fbbf24;
}

.warning-icon {
  font-size: 1.1em;
}

.toggle-label-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  color: #ffffff;
  font-weight: 600;
}

.toggle-slider-small {
  position: relative;
  width: 36px;
  height: 18px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 9px;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.toggle-slider-small::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: #ffffff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.toggle-input:checked + .toggle-slider-small {
  background: #60a5fa;
}

.toggle-input:checked + .toggle-slider-small::before {
  transform: translateX(18px);
}

.effect-controls {
  margin-top: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.slider-group {
  margin-bottom: 16px;
}

.slider-group:last-child {
  margin-bottom: 0;
}

.slider-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #e5e7eb;
  font-size: 0.9em;
  font-weight: 500;
}

.slider {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: #60a5fa;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  background: #3b82f6;
  transform: scale(1.1);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #60a5fa;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.slider::-moz-range-thumb:hover {
  background: #3b82f6;
  transform: scale(1.1);
}

.eq-controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

@media (max-width: 600px) {
  .eq-controls {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

.reset-btn {
  padding: 10px 16px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  backdrop-filter: blur(10px);
  font-size: 14px;
}

.reset-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(248, 113, 113, 0.4);
  transform: translateY(-1px);
}

.disabled-effect {
  opacity: 0.5;
}

.disabled-note {
  color: #9ca3af;
  font-size: 0.8em;
  font-style: italic;
  margin-top: 4px;
  margin-bottom: 0;
}
</style>