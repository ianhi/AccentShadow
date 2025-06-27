<template>
  <div class="alignment-test-container">
    <h1>🎯 Smart Audio Alignment Test</h1>
    <p class="description">
      Test the new simplified VAD-based audio alignment system. 
      Audio is automatically processed with VAD, normalized to 200ms padding, and aligned by length.
    </p>
    
    <div class="vad-status">
      <p><strong>VAD Status:</strong> <span :class="vadStatusClass">{{ vadStatus }}</span></p>
      <p><strong>Padding:</strong> {{ paddingMs }}ms</p>
    </div>

    <!-- Settings -->
    <div class="settings-section">
      <h2>⚙️ Settings</h2>
      <div class="setting-group">
        <label for="padding-input">Silence Padding (ms):</label>
        <input 
          id="padding-input"
          type="number" 
          v-model="paddingMs" 
          min="50" 
          max="1000" 
          step="50"
          @change="onPaddingChange"
        />
      </div>
    </div>
    
    <!-- Audio Processing Section -->
    <div class="audio-section">
      <div class="audio-panel">
        <h2>🎯 Target Audio</h2>
        <div class="audio-info">
          <p><strong>File:</strong> {{ targetFile }}</p>
          <p><strong>Status:</strong> 
            <span :class="targetStatusClass">{{ targetStatus }}</span>
          </p>
          <div class="vad-info" v-if="targetProcessed.vadBoundaries">
            <p><strong>Speech:</strong> {{ formatTime(targetProcessed.vadBoundaries.startTime) }} - {{ formatTime(targetProcessed.vadBoundaries.endTime) }}</p>
            <p><strong>Duration:</strong> {{ formatDuration(targetProcessed.vadBoundaries.endTime - targetProcessed.vadBoundaries.startTime) }}</p>
          </div>
        </div>
        <div class="audio-controls">
          <button @click="loadTargetAudio" class="btn-primary" :disabled="isProcessing">
            {{ targetProcessed.processed ? '🔄 Reload' : '📁 Load' }} Target Audio
          </button>
          <button 
            @click="normalizeTargetAudio" 
            class="btn-secondary" 
            :disabled="!targetProcessed.processed || isProcessing"
          >
            🎚️ Normalize Padding
          </button>
        </div>
        <div ref="targetWaveformContainer" class="waveform-container"></div>
        <div ref="targetSpectrogramContainer" class="spectrogram-container"></div>
      </div>
      
      <div class="audio-panel">
        <h2>🎤 User Recording</h2>
        <div class="audio-info">
          <p><strong>File:</strong> {{ userFile }}</p>
          <p><strong>Status:</strong> 
            <span :class="userStatusClass">{{ userStatus }}</span>
          </p>
          <div class="vad-info" v-if="userProcessed.vadBoundaries">
            <p><strong>Speech:</strong> {{ formatTime(userProcessed.vadBoundaries.startTime) }} - {{ formatTime(userProcessed.vadBoundaries.endTime) }}</p>
            <p><strong>Duration:</strong> {{ formatDuration(userProcessed.vadBoundaries.endTime - userProcessed.vadBoundaries.startTime) }}</p>
          </div>
        </div>
        <div class="audio-controls">
          <button @click="loadUserAudio" class="btn-primary" :disabled="isProcessing">
            {{ userProcessed.processed ? '🔄 Reload' : '📁 Load' }} User Audio
          </button>
          <button 
            @click="normalizeUserAudio" 
            class="btn-secondary" 
            :disabled="!userProcessed.processed || isProcessing"
          >
            🎚️ Normalize Padding
          </button>
        </div>
        <div ref="userWaveformContainer" class="waveform-container"></div>
        <div ref="userSpectrogramContainer" class="spectrogram-container"></div>
      </div>
    </div>

    <!-- Alignment Controls -->
    <div class="alignment-section">
      <h2>🔄 Audio Alignment</h2>
      <div class="alignment-controls">
        <button 
          @click="alignBothAudios" 
          class="btn-align" 
          :disabled="!canAlign || isProcessing"
        >
          ⚡ Align Both Audios
        </button>
        <button 
          @click="resetToOriginal" 
          class="btn-reset" 
          :disabled="isProcessing"
        >
          🔄 Reset to Original
        </button>
      </div>
      
      <div class="alignment-info" v-if="alignmentResult">
        <h3>📊 Alignment Results</h3>
        <div class="result-details">
          <p><strong>Method:</strong> {{ alignmentResult.method }}</p>
          <p><strong>Final Duration:</strong> {{ formatDuration(alignmentResult.finalDuration) }}</p>
          <p><strong>Padding Added:</strong> {{ formatDuration(alignmentResult.paddingAdded) }}</p>
          <p><strong>Processing Time:</strong> {{ processingTime }}ms</p>
        </div>
      </div>
    </div>

    <!-- Playback Controls -->
    <div class="playback-section">
      <h2>🎵 Playback Controls</h2>
      <div class="playback-controls">
        <button @click="playTarget" class="btn-play" :disabled="!hasTargetAudio">
          ▶️ Play Target
        </button>
        <button @click="playUser" class="btn-play" :disabled="!hasUserAudio">
          ▶️ Play User
        </button>
        <button @click="playBoth" class="btn-play" :disabled="!hasTargetAudio || !hasUserAudio">
          🔄 Play Both
        </button>
        <button @click="stopAll" class="btn-stop">
          ⏹️ Stop All
        </button>
      </div>
    </div>

    <!-- Debug Information -->
    <div class="debug-section" v-if="showDebug">
      <h2>🔧 Debug Information</h2>
      <div class="debug-info">
        <h3>Target Audio Debug</h3>
        <pre>{{ JSON.stringify(targetProcessed, null, 2) }}</pre>
        
        <h3>User Audio Debug</h3>
        <pre>{{ JSON.stringify(userProcessed, null, 2) }}</pre>
        
        <h3>Alignment Debug</h3>
        <pre>{{ JSON.stringify(alignmentResult, null, 2) }}</pre>
      </div>
    </div>
    
    <div class="debug-toggle">
      <button @click="showDebug = !showDebug" class="btn-debug">
        {{ showDebug ? '🙈 Hide' : '🔍 Show' }} Debug Info
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWaveform } from '@/composables/useWaveform'
import { useSmartAudioAlignment } from '@/composables/useSmartAudioAlignment'

// Test files
const targetFile = ref('/path.mp3')
const userFile = ref('/patth.wav')

// DOM refs
const targetWaveformContainer = ref(null)
const userWaveformContainer = ref(null)
const targetSpectrogramContainer = ref(null)
const userSpectrogramContainer = ref(null)

// Waveform composables
let targetWaveformComposable = null
let userWaveformComposable = null

// Audio context
let audioContext = null

// Smart alignment composable
const { 
  isProcessing,
  defaultPaddingMs,
  vadReady,
  initVAD,
  processAudio,
  normalizeAudioSilence,
  alignTwoAudios
} = useSmartAudioAlignment()

// Reactive state
const paddingMs = ref(200)
const showDebug = ref(false)
const processingTime = ref(0)

// Audio processing results
const targetProcessed = ref({
  audioBlob: null,
  vadBoundaries: null,
  processed: false
})

const userProcessed = ref({
  audioBlob: null,
  vadBoundaries: null,
  processed: false
})

const alignmentResult = ref(null)

// Current audio URLs for waveform display
const currentTargetUrl = ref(null)
const currentUserUrl = ref(null)

// Computed properties
const vadStatus = computed(() => {
  if (!vadReady.value) return 'Initializing...'
  return vadReady.value ? 'Ready ✅' : 'Unavailable ⚠️'
})

const vadStatusClass = computed(() => {
  if (!vadReady.value) return 'status-loading'
  return vadReady.value ? 'status-ready' : 'status-warning'
})

const targetStatus = computed(() => {
  if (!targetProcessed.value.audioBlob) return 'Not loaded'
  if (!targetProcessed.value.processed) return 'VAD failed ⚠️'
  return 'Processed ✅'
})

const targetStatusClass = computed(() => {
  if (!targetProcessed.value.audioBlob) return 'status-none'
  if (!targetProcessed.value.processed) return 'status-warning'
  return 'status-ready'
})

const userStatus = computed(() => {
  if (!userProcessed.value.audioBlob) return 'Not loaded'
  if (!userProcessed.value.processed) return 'VAD failed ⚠️'
  return 'Processed ✅'
})

const userStatusClass = computed(() => {
  if (!userProcessed.value.audioBlob) return 'status-none'
  if (!userProcessed.value.processed) return 'status-warning'
  return 'status-ready'
})

const canAlign = computed(() => {
  return targetProcessed.value.processed && userProcessed.value.processed
})

const hasTargetAudio = computed(() => !!currentTargetUrl.value)
const hasUserAudio = computed(() => !!currentUserUrl.value)

// Utility functions
const formatTime = (seconds) => {
  if (typeof seconds !== 'number') return 'N/A'
  return seconds.toFixed(3) + 's'
}

const formatDuration = (seconds) => {
  if (typeof seconds !== 'number') return 'N/A'
  return seconds.toFixed(3) + 's'
}

const createBlobUrl = (blob) => {
  return URL.createObjectURL(blob)
}

// Settings
const onPaddingChange = () => {
  defaultPaddingMs.value = paddingMs.value
  console.log('🎚️ Padding changed to:', paddingMs.value + 'ms')
}

// Initialize waveform composables early to avoid lifecycle issues
const initTargetWaveform = () => {
  if (targetWaveformComposable) targetWaveformComposable.destroyWaveform()
  targetWaveformComposable = useWaveform(
    targetWaveformContainer, 
    targetSpectrogramContainer,
    'target-audio',
    'target'
  )
  targetWaveformComposable.initWaveform()
}

const initUserWaveform = () => {
  if (userWaveformComposable) userWaveformComposable.destroyWaveform()
  userWaveformComposable = useWaveform(
    userWaveformContainer, 
    userSpectrogramContainer,
    'user-audio',
    'user'
  )
  userWaveformComposable.initWaveform()
}

// Audio loading functions
const loadTargetAudio = async () => {
  console.log('📁 Loading target audio...')
  
  try {
    // Load raw audio file
    const response = await fetch(targetFile.value)
    const arrayBuffer = await response.arrayBuffer()
    
    // Create blob with proper MIME type
    const mimeType = targetFile.value.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'
    const audioBlob = new Blob([arrayBuffer], { type: mimeType })
    
    // Process with VAD
    const result = await processAudio(audioBlob)
    targetProcessed.value = result
    
    // Initialize waveform if needed
    if (!targetWaveformComposable) {
      initTargetWaveform()
    }
    
    if (currentTargetUrl.value) URL.revokeObjectURL(currentTargetUrl.value)
    currentTargetUrl.value = createBlobUrl(audioBlob)
    await targetWaveformComposable.loadAudio(currentTargetUrl.value)
    
    console.log('✅ Target audio loaded and processed')
    
  } catch (error) {
    console.error('❌ Error loading target audio:', error)
    alert('Failed to load target audio: ' + error.message)
  }
}

const loadUserAudio = async () => {
  console.log('📁 Loading user audio...')
  
  try {
    // Load raw audio file
    const response = await fetch(userFile.value)
    const arrayBuffer = await response.arrayBuffer()
    
    // Create blob with proper MIME type  
    const mimeType = userFile.value.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'
    const audioBlob = new Blob([arrayBuffer], { type: mimeType })
    
    // Process with VAD
    const result = await processAudio(audioBlob)
    userProcessed.value = result
    
    // Initialize waveform if needed
    if (!userWaveformComposable) {
      initUserWaveform()
    }
    
    if (currentUserUrl.value) URL.revokeObjectURL(currentUserUrl.value)
    currentUserUrl.value = createBlobUrl(audioBlob)
    await userWaveformComposable.loadAudio(currentUserUrl.value)
    
    console.log('✅ User audio loaded and processed')
    
  } catch (error) {
    console.error('❌ Error loading user audio:', error)
    alert('Failed to load user audio: ' + error.message)
  }
}

// Audio processing functions
const normalizeTargetAudio = async () => {
  if (!targetProcessed.value.processed) return
  
  console.log('🎚️ Normalizing target audio...')
  const startTime = performance.now()
  
  try {
    const normalizedBlob = await normalizeAudioSilence(
      targetProcessed.value.audioBlob,
      targetProcessed.value.vadBoundaries,
      paddingMs.value
    )
    
    // Update waveform visualization
    if (currentTargetUrl.value) URL.revokeObjectURL(currentTargetUrl.value)
    currentTargetUrl.value = createBlobUrl(normalizedBlob)
    
    if (targetWaveformComposable) {
      await targetWaveformComposable.loadAudio(currentTargetUrl.value)
    }
    
    processingTime.value = Math.round(performance.now() - startTime)
    console.log('✅ Target audio normalized')
    
  } catch (error) {
    console.error('❌ Error normalizing target audio:', error)
    alert('Failed to normalize target audio: ' + error.message)
  }
}

const normalizeUserAudio = async () => {
  if (!userProcessed.value.processed) return
  
  console.log('🎚️ Normalizing user audio...')
  const startTime = performance.now()
  
  try {
    const normalizedBlob = await normalizeAudioSilence(
      userProcessed.value.audioBlob,
      userProcessed.value.vadBoundaries,
      paddingMs.value
    )
    
    // Update waveform visualization
    if (currentUserUrl.value) URL.revokeObjectURL(currentUserUrl.value)
    currentUserUrl.value = createBlobUrl(normalizedBlob)
    
    if (userWaveformComposable) {
      await userWaveformComposable.loadAudio(currentUserUrl.value)
    }
    
    processingTime.value = Math.round(performance.now() - startTime)
    console.log('✅ User audio normalized')
    
  } catch (error) {
    console.error('❌ Error normalizing user audio:', error)
    alert('Failed to normalize user audio: ' + error.message)
  }
}

const alignBothAudios = async () => {
  if (!canAlign.value) return
  
  console.log('⚡ Aligning both audios...')
  const startTime = performance.now()
  
  try {
    const result = await alignTwoAudios(
      targetProcessed.value,
      userProcessed.value,
      paddingMs.value
    )
    
    // Store old URLs to revoke after loading
    const oldTargetUrl = currentTargetUrl.value
    const oldUserUrl = currentUserUrl.value
    
    // Create new URLs
    currentTargetUrl.value = createBlobUrl(result.audio1Aligned)
    currentUserUrl.value = createBlobUrl(result.audio2Aligned)
    
    // Load new audio
    if (targetWaveformComposable) {
      await targetWaveformComposable.loadAudio(currentTargetUrl.value)
    }
    if (userWaveformComposable) {
      await userWaveformComposable.loadAudio(currentUserUrl.value)
    }
    
    // Revoke old URLs after loading is complete
    if (oldTargetUrl) URL.revokeObjectURL(oldTargetUrl)
    if (oldUserUrl) URL.revokeObjectURL(oldUserUrl)
    
    alignmentResult.value = result.alignmentInfo
    processingTime.value = Math.round(performance.now() - startTime)
    
    console.log('✅ Both audios aligned successfully')
    
  } catch (error) {
    console.error('❌ Error aligning audios:', error)
    alert('Failed to align audios: ' + error.message)
  }
}

const resetToOriginal = async () => {
  console.log('🔄 Resetting to original audios...')
  
  alignmentResult.value = null
  
  // Reload original audios
  if (targetProcessed.value.audioBlob) {
    if (currentTargetUrl.value) URL.revokeObjectURL(currentTargetUrl.value)
    currentTargetUrl.value = createBlobUrl(targetProcessed.value.audioBlob)
    if (targetWaveformComposable) {
      await targetWaveformComposable.loadAudio(currentTargetUrl.value)
    }
  }
  
  if (userProcessed.value.audioBlob) {
    if (currentUserUrl.value) URL.revokeObjectURL(currentUserUrl.value)
    currentUserUrl.value = createBlobUrl(userProcessed.value.audioBlob)
    if (userWaveformComposable) {
      await userWaveformComposable.loadAudio(currentUserUrl.value)
    }
  }
  
  console.log('✅ Reset to original audios')
}

// Playback functions
const playTarget = () => {
  if (targetWaveformComposable && hasTargetAudio.value) {
    targetWaveformComposable.play()
  }
}

const playUser = () => {
  if (userWaveformComposable && hasUserAudio.value) {
    userWaveformComposable.play()
  }
}

const playBoth = async () => {
  if (hasTargetAudio.value && hasUserAudio.value) {
    // Stop any current playback
    stopAll()
    
    // Start both simultaneously
    setTimeout(() => {
      if (targetWaveformComposable) targetWaveformComposable.play()
      if (userWaveformComposable) userWaveformComposable.play()
    }, 100)
  }
}

const stopAll = () => {
  if (targetWaveformComposable) targetWaveformComposable.stop()
  if (userWaveformComposable) userWaveformComposable.stop()
}

// Lifecycle
onMounted(async () => {
  audioContext = new (window.AudioContext || window.webkitAudioContext)()
  
  // Initialize VAD
  console.log('🎙️ Initializing Smart Audio Alignment...')
  await initVAD()
  
  // Auto-load test files
  await loadTargetAudio()
  await loadUserAudio()
})

onUnmounted(() => {
  if (targetWaveformComposable) targetWaveformComposable.destroyWaveform()
  if (userWaveformComposable) userWaveformComposable.destroyWaveform()
  if (audioContext) audioContext.close()
  if (currentTargetUrl.value) URL.revokeObjectURL(currentTargetUrl.value)
  if (currentUserUrl.value) URL.revokeObjectURL(currentUserUrl.value)
})
</script>

<style scoped>
.alignment-test-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 10px;
}

.description {
  text-align: center;
  color: #7f8c8d;
  margin-bottom: 30px;
  line-height: 1.6;
}

.vad-status {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.vad-status p {
  margin: 5px 0;
}

.status-ready { color: #27ae60; font-weight: bold; }
.status-warning { color: #f39c12; font-weight: bold; }
.status-loading { color: #3498db; font-weight: bold; }
.status-none { color: #95a5a6; }

.settings-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.settings-section h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-group label {
  font-weight: 500;
  min-width: 150px;
}

.setting-group input {
  padding: 5px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100px;
}

.audio-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

.audio-panel {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.audio-panel h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

.audio-info p {
  margin: 8px 0;
  font-size: 14px;
}

.vad-info {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 10px;
  margin-top: 10px;
}

.vad-info p {
  margin: 4px 0;
  font-size: 12px;
  color: #6c757d;
}

.audio-controls {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

.waveform-container {
  height: 60px;
  background: #f8f9fa;
  border-radius: 6px;
  margin: 10px 0;
}

.spectrogram-container {
  height: 200px;
  background: #f8f9fa;
  border-radius: 6px;
  margin: 10px 0;
}

.alignment-section {
  background: #e8f5e8;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
}

.alignment-section h2 {
  margin-top: 0;
  color: #2c3e50;
}

.alignment-controls {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.alignment-info {
  background: white;
  border-radius: 8px;
  padding: 15px;
  margin-top: 15px;
}

.alignment-info h3 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
}

.result-details p {
  margin: 5px 0;
  font-size: 14px;
}

.playback-section {
  background: #f0f8ff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
}

.playback-section h2 {
  margin-top: 0;
  color: #2c3e50;
}

.playback-controls {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.debug-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.debug-section h2, .debug-section h3 {
  color: #2c3e50;
}

.debug-info pre {
  background: #2c3e50;
  color: #ecf0f1;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.4;
}

.debug-toggle {
  text-align: center;
}

/* Button Styles */
.btn-primary {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: #7f8c8d;
  transform: translateY(-1px);
}

.btn-secondary:disabled {
  background: #ecf0f1;
  color: #bdc3c7;
  cursor: not-allowed;
  transform: none;
}

.btn-align {
  background: #27ae60;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-align:hover:not(:disabled) {
  background: #229954;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
}

.btn-align:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-reset {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-reset:hover:not(:disabled) {
  background: #c0392b;
  transform: translateY(-1px);
}

.btn-play {
  background: #9b59b6;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-play:hover:not(:disabled) {
  background: #8e44ad;
  transform: translateY(-1px);
}

.btn-play:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
}

.btn-stop {
  background: #e67e22;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-stop:hover {
  background: #d35400;
  transform: translateY(-1px);
}

.btn-debug {
  background: #34495e;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-debug:hover {
  background: #2c3e50;
}

/* Responsive */
@media (max-width: 768px) {
  .audio-section {
    grid-template-columns: 1fr;
  }
  
  .alignment-controls,
  .playback-controls {
    flex-direction: column;
  }
  
  .audio-controls {
    flex-direction: column;
  }
  
  .setting-group {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>