<template>
  <div class="alignment-test-container">
    <h1>🎯 Smart Audio Alignment Test</h1>
    <p class="description">
      Test the VAD-based audio alignment system with raw audio comparison. 
      The center column shows raw unprocessed audio for debugging VAD trimming issues.
    </p>
    
    <div class="vad-status">
      <p><strong>VAD Status:</strong> <span :class="vadStatusClass">{{ vadStatus }}</span></p>
      <p><strong>Padding:</strong> {{ vadSettings.padding * 1000 }}ms</p>
    </div>

    <!-- VAD Settings -->
    <div class="settings-section">
      <h2>⚙️ VAD Settings</h2>
      
      <!-- All Settings in Compact Grid -->
      <div class="settings-grid compact-grid">
        <div class="setting-group">
          <label for="padding-input">Padding (ms)</label>
          <input 
            id="padding-input"
            type="number" 
            :value="vadSettings.padding * 1000"
            min="50" 
            max="1000" 
            step="50"
            @input="updatePadding"
            aria-describedby="padding-help"
          />
          <small id="padding-help" class="help-text">Silence padding around speech</small>
        </div>
        <div class="setting-group">
          <label for="threshold-input">VAD Threshold</label>
          <input 
            id="threshold-input"
            type="number" 
            v-model.number="vadSettings.threshold"
            min="0.1" 
            max="0.9" 
            step="0.05"
            @input="onSettingsChange"
            aria-describedby="threshold-help"
          />
          <small id="threshold-help" class="help-text">Speech detection sensitivity</small>
        </div>
        <div class="setting-group">
          <label for="min-speech-input">Min Speech (ms)</label>
          <input 
            id="min-speech-input"
            type="number" 
            v-model.number="vadSettings.minSpeechDuration"
            min="10" 
            max="200" 
            step="10"
            @input="onSettingsChange"
            aria-describedby="min-speech-help"
          />
          <small id="min-speech-help" class="help-text">Minimum speech duration</small>
        </div>
        <div class="setting-group">
          <label for="max-silence-input">Max Silence (ms)</label>
          <input 
            id="max-silence-input"
            type="number" 
            v-model.number="vadSettings.maxSilenceDuration"
            min="100" 
            max="2000" 
            step="100"
            @input="onSettingsChange"
            aria-describedby="max-silence-help"
          />
          <small id="max-silence-help" class="help-text">Maximum silence gap</small>
        </div>
        <div class="setting-group">
          <label for="max-trim-start-input">Max Trim Start (s)</label>
          <input 
            id="max-trim-start-input"
            type="number" 
            v-model.number="vadSettings.maxTrimStart"
            min="0.5" 
            max="10" 
            step="0.5"
            @input="onSettingsChange"
            aria-describedby="trim-start-help"
          />
          <small id="trim-start-help" class="help-text">Maximum trim from start</small>
        </div>
        <div class="setting-group">
          <label for="max-trim-end-input">Max Trim End (s)</label>
          <input 
            id="max-trim-end-input"
            type="number" 
            v-model.number="vadSettings.maxTrimEnd"
            min="0.5" 
            max="10" 
            step="0.5"
            @input="onSettingsChange"
            aria-describedby="trim-end-help"
          />
          <small id="trim-end-help" class="help-text">Maximum trim from end</small>
        </div>
      </div>
      
      <!-- Advanced Settings - Collapsible -->
      <details class="advanced-settings">
        <summary class="advanced-toggle">🔬 Advanced VAD Model Settings</summary>
        <div class="settings-grid compact-grid">
          <div class="setting-group">
            <label for="pos-speech-threshold-input">Pos Speech Threshold</label>
            <input 
              id="pos-speech-threshold-input"
              type="number" 
              v-model.number="vadSettings.positiveSpeechThreshold"
              min="0.1" 
              max="0.9" 
              step="0.05"
              @input="onSettingsChange"
              aria-describedby="pos-threshold-help"
            />
            <small id="pos-threshold-help" class="help-text">Positive speech detection</small>
          </div>
          <div class="setting-group">
            <label for="neg-speech-threshold-input">Neg Speech Threshold</label>
            <input 
              id="neg-speech-threshold-input"
              type="number" 
              v-model.number="vadSettings.negativeSpeechThreshold"
              min="0.1" 
              max="0.9" 
              step="0.05"
              @input="onSettingsChange"
              aria-describedby="neg-threshold-help"
            />
            <small id="neg-threshold-help" class="help-text">Negative speech detection</small>
          </div>
          <div class="setting-group">
            <label for="min-speech-frames-input">Min Speech Frames</label>
            <input 
              id="min-speech-frames-input"
              type="number" 
              v-model.number="vadSettings.minSpeechFrames"
              min="1" 
              max="20" 
              step="1"
              @input="onSettingsChange"
              aria-describedby="min-frames-help"
            />
            <small id="min-frames-help" class="help-text">Minimum frames for speech</small>
          </div>
          <div class="setting-group">
            <label for="redemption-frames-input">Redemption Frames</label>
            <input 
              id="redemption-frames-input"
              type="number" 
              v-model.number="vadSettings.redemptionFrames"
              min="8" 
              max="64" 
              step="8"
              @input="onSettingsChange"
              aria-describedby="redemption-help"
            />
            <small id="redemption-help" class="help-text">Recovery from silence</small>
          </div>
          <div class="setting-group">
            <label for="frame-samples-input">Frame Samples</label>
            <input 
              id="frame-samples-input"
              type="number" 
              v-model.number="vadSettings.frameSamples"
              min="256" 
              max="2048" 
              step="256"
              @input="onSettingsChange"
              aria-describedby="frame-samples-help"
            />
            <small id="frame-samples-help" class="help-text">VAD model frame size</small>
          </div>
          <div class="setting-group">
            <label for="pre-speech-pad-input">Pre-Speech Frames</label>
            <input 
              id="pre-speech-pad-input"
              type="number" 
              v-model.number="vadSettings.preSpeechPadFrames"
              min="1" 
              max="16" 
              step="1"
              @input="onSettingsChange"
              aria-describedby="pre-pad-help"
            />
            <small id="pre-pad-help" class="help-text">Padding before speech</small>
          </div>
          <div class="setting-group">
            <label for="pos-speech-pad-input">Post-Speech Frames</label>
            <input 
              id="pos-speech-pad-input"
              type="number" 
              v-model.number="vadSettings.positiveSpeechPadFrames"
              min="1" 
              max="16" 
              step="1"
              @input="onSettingsChange"
              aria-describedby="post-pad-help"
            />
            <small id="post-pad-help" class="help-text">Padding after speech</small>
          </div>
        </div>
      </details>
      
      <div class="vad-presets">
        <h3>🎛️ VAD Presets</h3>
        <div class="preset-buttons">
          <button @click="applyPreset('conservative')" class="btn-preset">
            Conservative (0.5 threshold)
          </button>
          <button @click="applyPreset('default')" class="btn-preset">
            Default (0.3 threshold)
          </button>
          <button @click="applyPreset('sensitive')" class="btn-preset">
            Sensitive (0.2 threshold)
          </button>
          <button @click="applyPreset('very-sensitive')" class="btn-preset">
            Very Sensitive (0.1 threshold)
          </button>
        </div>
      </div>
    </div>
    
    <!-- Audio File Selection -->
    <div class="file-section">
      <h2>📁 Test Files</h2>
      <div class="file-controls">
        <button @click="loadTestFile('/path.mp3')" class="btn-file">
          Load path.mp3
        </button>
        <button @click="loadTestFile('/test_said_three_words.wav')" class="btn-file">
          Load test_said_three_words.wav
        </button>
        <button @click="browseFile" class="btn-file">
          📁 Browse Files
        </button>
        <input 
          ref="fileInput" 
          type="file" 
          accept="audio/*" 
          style="display: none" 
          @change="handleFileUpload"
        />
      </div>
      <p v-if="currentFile" class="current-file">
        <strong>Current File:</strong> {{ currentFile }}
      </p>
    </div>
    
    <!-- Audio Visualization with Raw Comparison -->
    <AudioVisualizationPanel
      ref="audioVisualizationRef"
      :vadSettings="vadSettings"
      :appSettings="{ autoPlayTargetOnUpload: false }"
      :showVadSegments="true"
      :showRawAudio="true"
      @target-audio-ref="handleTargetAudioRef"
      @user-audio-ref="handleUserAudioRef"
      @vad-segments="handleVadSegments"
    />

    <!-- Central Playback Controls -->
    <div class="playback-section">
      <h2>🎵 Audio Playback</h2>
      <div class="playback-controls">
        <button 
          @click="playTarget" 
          :disabled="!hasTargetAudio"
          class="btn-play"
          :aria-label="'Play target audio'"
        >
          🎯 Play Target
        </button>
        <button 
          @click="playRawTarget" 
          :disabled="!hasRawTargetAudio"
          class="btn-play"
          :aria-label="'Play raw target audio'"
        >
          📊 Play Raw Target
        </button>
        <button 
          @click="playUserRecording" 
          :disabled="!hasUserRecording"
          class="btn-play"
          :aria-label="'Play user recording'"
        >
          🎤 Play Recording
        </button>
        <button 
          @click="stopAllPlayback" 
          class="btn-stop"
          aria-label="Stop all audio playback"
        >
          ⏹ Stop All
        </button>
      </div>
    </div>

    <!-- Test Recording Controls -->
    <div class="recording-section">
      <h2>🎤 Test Recording</h2>
      <div class="recording-controls">
        <button 
          @click="toggleRecording" 
          :class="{ 'recording': isRecording }" 
          class="btn-record" 
          :disabled="isProcessing"
        >
          {{ isRecording ? '⏹ Stop Recording' : '🎤 Record Test Audio' }}
        </button>
        <p class="recording-info">
          Record audio to test how VAD processing affects your speech
        </p>
      </div>
    </div>

    <!-- Alignment Controls -->
    <div class="alignment-section">
      <h2>🔄 Manual Alignment Test</h2>
      <div class="alignment-controls">
        <button 
          @click="manualAlign" 
          class="btn-align" 
          :disabled="!canAlign || isProcessing"
        >
          ⚡ Test Manual Alignment
        </button>
        <button 
          @click="reprocessAudio" 
          class="btn-secondary" 
          :disabled="!hasTargetAudio || isProcessing"
        >
          🔄 Reprocess with Current Settings
        </button>
      </div>
    </div>

    <!-- Debug Information -->
    <div class="debug-section" v-if="showDebug">
      <h2>🔧 Debug Information</h2>
      <div class="debug-info">
        <h3>Current VAD Settings</h3>
        <pre>{{ JSON.stringify(vadSettings, null, 2) }}</pre>
        
        <h3>Audio Player References</h3>
        <p><strong>Target Player Ready:</strong> {{ targetPlayerRef?.isReady || false }}</p>
        <p><strong>User Player Ready:</strong> {{ userPlayerRef?.isReady || false }}</p>
        
        <h3>VAD Segments</h3>
        <div v-if="vadSegments.length > 0" class="vad-segments-display">
          <p><strong>Detected Segments:</strong> {{ vadSegments.length }}</p>
          <div v-for="(segment, index) in vadSegments" :key="index" class="vad-segment-item">
            <strong>Segment {{ index + 1 }}:</strong> 
            {{ (segment.startTime * 1000).toFixed(0) }}ms - {{ (segment.endTime * 1000).toFixed(0) }}ms 
            ({{ ((segment.endTime - segment.startTime) * 1000).toFixed(0) }}ms duration)
          </div>
        </div>
        <div v-else class="vad-segments-empty">
          <p><strong>VAD Segments:</strong> None detected</p>
        </div>
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
import { ref, computed, onMounted } from 'vue'
import AudioVisualizationPanel from '@/components/AudioVisualizationPanel.vue'
import { useSmartAudioAlignment } from '@/composables/useSmartAudioAlignment'
import { useAudioRecorder } from '@/composables/useAudioRecorder'
import { useAppState } from '@/composables/useAppState'

// Initialize app state for AudioVisualizationPanel
const {
  globalPlaybackSpeed,
  isRecordingActive,
  appSettings,
  vadSettings: appVadSettings,
  targetAudioPlayerRef,
  userAudioPlayerRef,
  audioVisualizationPanel,
  hasTargetAudio: appHasTargetAudio,
  hasUserAudio,
  getTargetBlob,
  getUserBlob,
  updateVadSettings,
  updateAppSettings,
  updatePlaybackSpeed,
  setRecordingActive,
  setTargetAudioPlayerRef,
  setUserAudioPlayerRef,
  setAudioVisualizationPanel
} = useAppState()

// Smart alignment composable
const { 
  isProcessing,
  vadReady,
  initVAD
} = useSmartAudioAlignment()

// Recording functionality
const { isRecording, startRecording, stopRecording } = useAudioRecorder()

// Component refs
const audioVisualizationRef = ref(null)
const fileInput = ref(null)

// Audio player refs (from AudioVisualizationPanel)
const targetPlayerRef = ref(null)
const userPlayerRef = ref(null)

// Reactive state
const showDebug = ref(false)
const currentFile = ref(null)
const vadSegments = ref([])

// VAD Settings - comprehensive settings that get passed to AudioVisualizationPanel
const vadSettings = ref({
  // Basic VAD settings
  padding: 0.2,           // 200ms default
  threshold: 0.25,        // Default threshold (simplified)
  minSpeechDuration: 50,  // 50ms minimum speech
  maxSilenceDuration: 500, // 500ms max silence
  maxTrimStart: 3.0,      // Max trim from start
  maxTrimEnd: 2.0,        // Max trim from end
  
  // Advanced VAD settings (from useVADProcessor)
  positiveSpeechThreshold: 0.3,  // From VAD model
  negativeSpeechThreshold: 0.2,  // From VAD model
  minSpeechFrames: 3,           // Minimum frames for speech detection
  redemptionFrames: 32,         // Frames to recover from silence
  frameSamples: 512,           // Frame size for VAD model
  preSpeechPadFrames: 4,       // Padding before speech
  positiveSpeechPadFrames: 4   // Padding after speech
})

// Computed properties
const vadStatus = computed(() => {
  if (!vadReady.value) return 'Initializing...'
  return vadReady.value ? 'Ready ✅' : 'Unavailable ⚠️'
})

const vadStatusClass = computed(() => {
  if (!vadReady.value) return 'status-loading'
  return vadReady.value ? 'status-ready' : 'status-warning'
})

const canAlign = computed(() => {
  return targetPlayerRef.value?.isReady && userPlayerRef.value?.isReady
})

const hasTargetAudio = computed(() => {
  return audioVisualizationRef.value?.getTargetUrl() != null
})

const hasRawTargetAudio = computed(() => {
  return audioVisualizationRef.value?.getRawTargetUrl() != null
})

const hasUserRecording = computed(() => {
  return audioVisualizationRef.value?.getUserUrl() != null
})

// Settings handlers
const updatePadding = (event) => {
  const newPadding = parseFloat(event.target.value) / 1000 // Convert ms to seconds
  vadSettings.value.padding = newPadding
  console.log('🎚️ Padding changed to:', event.target.value + 'ms')
  
  // Auto-reprocess with new padding
  if (audioVisualizationRef.value && hasTargetAudio.value) {
    console.log('🔄 Auto-reprocessing with new padding...')
    reprocessAudio()
  }
}

const onSettingsChange = () => {
  console.log('🎛️ VAD settings changed:', vadSettings.value)
  // Auto-reprocess if we have audio loaded
  if (audioVisualizationRef.value && hasTargetAudio.value) {
    console.log('🔄 Auto-reprocessing with new VAD settings...')
    reprocessAudio()
  }
}

// VAD Presets
const applyPreset = (presetName) => {
  const presets = {
    conservative: {
      padding: 0.2,
      threshold: 0.5,
      minSpeechDuration: 50,
      maxSilenceDuration: 300,
      maxTrimStart: 2.0,
      maxTrimEnd: 1.5
    },
    default: {
      padding: 0.2,
      threshold: 0.3,
      minSpeechDuration: 50,
      maxSilenceDuration: 500,
      maxTrimStart: 3.0,
      maxTrimEnd: 2.0
    },
    sensitive: {
      padding: 0.15,
      threshold: 0.2,
      minSpeechDuration: 30,
      maxSilenceDuration: 800,
      maxTrimStart: 3.0,
      maxTrimEnd: 2.0
    },
    'very-sensitive': {
      padding: 0.1,
      threshold: 0.1,
      minSpeechDuration: 20,
      maxSilenceDuration: 1000,
      maxTrimStart: 4.0,
      maxTrimEnd: 3.0
    }
  }
  
  vadSettings.value = { ...presets[presetName] }
  console.log(`🎛️ Applied ${presetName} preset:`, vadSettings.value)
  
  // Auto-reprocess with new preset
  if (audioVisualizationRef.value && hasTargetAudio.value) {
    console.log('🔄 Auto-reprocessing with preset settings...')
    reprocessAudio()
  }
}

// Audio player ref handlers
const handleTargetAudioRef = (ref) => {
  targetPlayerRef.value = ref
  console.log('🎯 Target audio player ref received')
}

const handleUserAudioRef = (ref) => {
  userPlayerRef.value = ref
  console.log('🎤 User audio player ref received')
}

// VAD segments handler
const handleVadSegments = (segments) => {
  vadSegments.value = segments
  console.log('🎯 VAD segments received for visualization:', segments)
}

// File handling
const loadTestFile = async (filePath) => {
  try {
    currentFile.value = filePath
    const response = await fetch(filePath)
    const arrayBuffer = await response.arrayBuffer()
    
    // Create blob with proper MIME type
    const mimeType = filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav'
    const audioBlob = new Blob([arrayBuffer], { type: mimeType })
    
    // Use AudioVisualizationPanel to set target audio
    if (audioVisualizationRef.value) {
      await audioVisualizationRef.value.setTargetAudio(audioBlob, {
        fileName: filePath.split('/').pop(),
        source: 'test'
      })
      console.log('✅ Test file loaded:', filePath)
    }
  } catch (error) {
    console.error('❌ Error loading test file:', error)
    alert('Failed to load test file: ' + error.message)
  }
}

const browseFile = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  try {
    currentFile.value = file.name
    console.log('📁 Test page file upload started:', file.name)
    
    // Use AudioVisualizationPanel to set target audio
    if (audioVisualizationRef.value) {
      await audioVisualizationRef.value.setTargetAudio(file, {
        fileName: file.name,
        source: 'upload'
      })
      console.log('✅ Test page file uploaded successfully:', file.name)
    } else {
      console.error('❌ AudioVisualizationPanel ref not available')
    }
  } catch (error) {
    console.error('❌ Error processing uploaded file:', error)
    alert('Failed to process uploaded file: ' + error.message)
  }
  
  // Clear the file input so the same file can be selected again if needed
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Recording functions
const toggleRecording = async () => {
  if (isRecording.value) {
    console.log('🎤 Stopping recording...')
    const audioBlob = await stopRecording()
    
    if (audioBlob && audioVisualizationRef.value) {
      console.log('🎤 Recording complete, processing...')
      await audioVisualizationRef.value.processUserAudio(audioBlob)
    }
  } else {
    console.log('🎤 Starting recording...')
    try {
      await startRecording()
      console.log('✅ Recording started')
    } catch (error) {
      console.error('❌ Failed to start recording:', error)
      alert('Failed to start recording: ' + error.message)
    }
  }
}

// Manual alignment using AudioVisualizationPanel
const manualAlign = async () => {
  if (audioVisualizationRef.value) {
    try {
      await audioVisualizationRef.value.manualAlign()
      console.log('✅ Manual alignment complete')
    } catch (error) {
      console.error('❌ Manual alignment failed:', error)
      alert('Manual alignment failed: ' + error.message)
    }
  }
}

// Reprocess with current VAD settings
const reprocessAudio = async () => {
  if (!audioVisualizationRef.value) return
  
  try {
    // Get the original target blob and reprocess with current settings
    const originalBlob = audioVisualizationRef.value.getOriginalTargetBlob()
    if (originalBlob) {
      console.log('🔄 Reprocessing with VAD settings:', vadSettings.value)
      await audioVisualizationRef.value.setTargetAudio(originalBlob, {
        fileName: currentFile.value || 'reprocessed',
        source: 'reprocess'
      })
      console.log('✅ Audio reprocessed with current VAD settings')
    } else {
      console.warn('⚠️ No original blob available for reprocessing')
    }
  } catch (error) {
    console.error('❌ Error reprocessing audio:', error)
    alert('Failed to reprocess audio: ' + error.message)
  }
}

// Playback functions
const playTarget = () => {
  if (targetPlayerRef.value?.play) {
    console.log('🎯 Playing target audio')
    targetPlayerRef.value.play()
  }
}

const playRawTarget = () => {
  // We need to get the raw target player ref from AudioVisualizationPanel
  const rawTargetPlayer = audioVisualizationRef.value?.getRawTargetPlayerRef()
  if (rawTargetPlayer?.play) {
    console.log('📊 Playing raw target audio')
    rawTargetPlayer.play()
  }
}

const playUserRecording = () => {
  if (userPlayerRef.value?.play) {
    console.log('🎤 Playing user recording')
    userPlayerRef.value.play()
  }
}

const stopAllPlayback = () => {
  console.log('⏹ Stopping all audio playback')
  
  if (targetPlayerRef.value?.stop) {
    targetPlayerRef.value.stop()
  }
  
  if (userPlayerRef.value?.stop) {
    userPlayerRef.value.stop()
  }
  
  const rawTargetPlayer = audioVisualizationRef.value?.getRawTargetPlayerRef()
  if (rawTargetPlayer?.stop) {
    rawTargetPlayer.stop()
  }
}

// Lifecycle
onMounted(async () => {
  // Initialize VAD
  console.log('🎙️ Initializing Smart Audio Alignment Test...')
  await initVAD()
  
  // Auto-load test file
  await loadTestFile('/path.mp3')
})

</script>

<style scoped>
.alignment-test-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 15px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 8px;
  font-size: 1.8rem;
}

.description {
  text-align: center;
  color: #2c3e50; /* Improved contrast - was #7f8c8d */
  margin-bottom: 20px;
  line-height: 1.4;
  font-size: 0.95rem;
}

.vad-status {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 15px;
}

.vad-status p {
  margin: 5px 0;
}

.status-ready { color: #1e7e34; font-weight: bold; } /* Darker green for better contrast */
.status-warning { color: #d39e00; font-weight: bold; } /* Darker yellow for better contrast */
.status-loading { color: #0066cc; font-weight: bold; } /* Darker blue for better contrast */
.status-none { color: #495057; } /* Much darker gray for better contrast */

.settings-section {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
}

.settings-section h2 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #2c3e50;
  font-size: 1.3rem;
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
  color: #212529; /* Ensure good contrast */
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
  color: #495057; /* Improved contrast - was #6c757d */
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
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 15px;
}

.alignment-section h2 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
  font-size: 1.2rem;
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
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 15px;
}

.playback-section h2 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
  font-size: 1.2rem;
}

.playback-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.debug-section {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
}

.debug-section h2, .debug-section h3 {
  color: #2c3e50;
  margin-top: 0;
}

.debug-section h3 {
  font-size: 1.1rem;
  margin-bottom: 8px;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 4px;
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
  background: #6c757d; /* Better contrast for disabled state */
  color: #ffffff;
  cursor: not-allowed;
  transform: none;
  opacity: 0.65;
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
  background: #6c757d; /* Better contrast */
  color: #ffffff;
  cursor: not-allowed;
  transform: none;
  opacity: 0.65;
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
  background: #6c757d; /* Better contrast */
  color: #ffffff;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.65;
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
  background: #6c757d; /* Better contrast */
  color: #ffffff;
  cursor: not-allowed;
  transform: none;
  opacity: 0.65;
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

.btn-record {
  background: #27ae60;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-record:hover:not(:disabled) {
  background: #229954;
  transform: translateY(-1px);
}

.btn-record.recording {
  background: #e74c3c;
  animation: pulse 1.5s infinite;
}

.btn-record.recording:hover {
  background: #c0392b;
}

.btn-record:disabled {
  background: #6c757d; /* Better contrast */
  color: #ffffff;
  cursor: not-allowed;
  transform: none;
  opacity: 0.65;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
  100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
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

/* New Settings Grid Layout */
.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 15px;
}

.compact-grid {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.settings-grid .setting-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.help-text {
  color: #6c757d;
  font-size: 11px;
  line-height: 1.2;
  margin-top: 2px;
  font-style: italic;
}

.settings-grid .setting-group label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 13px;
}

.settings-grid .setting-group input {
  padding: 5px 8px;
  border: 2px solid #e9ecef;
  border-radius: 4px;
  font-size: 13px;
  transition: border-color 0.2s ease;
}

.settings-grid .setting-group input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

/* Advanced Settings Collapsible */
.advanced-settings {
  margin-top: 15px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  overflow: hidden;
}

.advanced-toggle {
  background: #f8f9fa;
  padding: 10px 15px;
  margin: 0;
  cursor: pointer;
  font-weight: 600;
  color: #495057;
  border-bottom: 1px solid #dee2e6;
  user-select: none;
  transition: background-color 0.2s ease;
}

.advanced-toggle:hover {
  background: #e9ecef;
}

.advanced-settings[open] .advanced-toggle {
  background: #e3f2fd;
  color: #1565c0;
}

.advanced-settings .settings-grid {
  padding: 15px;
  margin-bottom: 0;
}

/* VAD Presets */
.vad-presets {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e9ecef;
}

.vad-presets h3 {
  margin-bottom: 10px;
  color: #2c3e50;
  font-size: 1.1rem;
}

.preset-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-preset {
  background: #8e44ad;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-preset:hover {
  background: #7d3c98;
  transform: translateY(-1px);
}

/* File Section */
.file-section {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 15px;
}

.file-section h2 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #2c3e50;
  font-size: 1.2rem;
}

.file-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.btn-file {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-file:hover {
  background: #138496;
  transform: translateY(-1px);
}

.current-file {
  color: #495057;
  font-size: 14px;
  margin: 0;
}

/* Recording Section */
.recording-section {
  background: #fff3cd;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid #ffeaa7;
}

.recording-section h2 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #856404;
  font-size: 1.2rem;
}

.recording-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.recording-info {
  color: #856404;
  font-size: 14px;
  margin: 0;
  font-style: italic;
}

/* VAD Segments Display */
.vad-segments-display {
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 12px;
  margin: 10px 0;
}

.vad-segment-item {
  background: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 4px;
  padding: 8px 12px;
  margin: 6px 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  color: #1565c0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.vad-segment-item strong {
  color: #0d47a1;
  margin-right: 8px;
}

.vad-segments-empty {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 12px;
  margin: 10px 0;
  color: #6c757d;
  text-align: center;
  font-style: italic;
}
</style>