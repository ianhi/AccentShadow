<template>
  <div class="vad-test-page">
    <div class="test-header">
      <h1>VAD Trimming Debug Test</h1>
      <p>Step-by-step analysis of VAD trimming process</p>
    </div>

    <!-- Step 1: Audio Source -->
    <div class="test-section">
      <h2>Step 1: Select Audio Source</h2>
      
      <div class="audio-source-options">
        <button @click="loadDefaultAudio" :disabled="loading" class="default-audio-btn">
          {{ loading ? '🔄 Loading...' : '🎵 Load Default (patth.wav)' }}
        </button>
        
        <div class="upload-section">
          <label for="file-upload" class="file-upload-label">
            📁 Upload Audio File
          </label>
          <input id="file-upload" type="file" @change="handleFileUpload" accept="audio/*" />
        </div>
        
        <div class="record-section">
          <button @click="toggleRecording" :disabled="!canRecord" class="record-btn" :class="{ recording: isRecording }">
            {{ isRecording ? '🛑 Stop Recording' : '🎤 Record Audio' }}
          </button>
          <p v-if="!canRecord" class="record-error">Microphone not available</p>
        </div>
      </div>
      
      <div v-if="originalBlob" class="audio-info">
        <p>✅ Audio loaded: {{ audioFileName }} ({{ Math.round(originalBlob.size / 1024) }}KB)</p>
        <audio :src="originalUrl" controls class="audio-preview"></audio>
      </div>
    </div>

    <!-- Step 2: VAD Analysis -->
    <div class="test-section" v-if="originalBlob">
      <h2>Step 2: VAD Analysis</h2>
      
      <!-- VAD Settings -->
      <div class="vad-settings">
        <h3>VAD Settings</h3>
        
        <div class="setting-group">
          <label>
            Padding (seconds):
            <input type="number" v-model.number="vadSettings.padding" step="0.01" min="0" max="0.5" />
            <span class="hint">Padding around detected speech</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Threshold:
            <input type="number" v-model.number="vadSettings.threshold" step="0.01" min="0" max="1" />
            <span class="hint">VAD sensitivity (lower = more sensitive)</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Min Speech Duration (ms):
            <input type="number" v-model.number="vadSettings.minSpeechDuration" step="10" min="10" max="500" />
            <span class="hint">Minimum speech segment length</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Max Silence Duration (ms):
            <input type="number" v-model.number="vadSettings.maxSilenceDuration" step="10" min="10" max="1000" />
            <span class="hint">Maximum gap between speech segments</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Max Trim Start (s):
            <input type="number" v-model.number="vadSettings.maxTrimStart" step="0.1" min="0" max="5" />
            <span class="hint">Maximum silence to trim from start</span>
          </label>
        </div>
        
        <div class="setting-group">
          <label>
            Max Trim End (s):
            <input type="number" v-model.number="vadSettings.maxTrimEnd" step="0.1" min="0" max="5" />
            <span class="hint">Maximum silence to trim from end</span>
          </label>
        </div>
        
        <button @click="resetVADSettings" class="reset-btn">🔄 Reset to Defaults</button>
      </div>
      
      <button @click="runVADAnalysis" :disabled="analyzing" class="analyze-btn">
        {{ analyzing ? '🔄 Analyzing...' : '🤖 Run VAD Analysis' }}
      </button>
      
      <div v-if="vadResults" class="vad-results">
        <h3>VAD Results:</h3>
        <div class="results-summary">
          <p><strong>Segments detected:</strong> {{ vadResults.speechSegments || 0 }}</p>
          <p><strong>Speech envelope:</strong> {{ vadResults.startTime?.toFixed(3) }}s - {{ vadResults.endTime?.toFixed(3) }}s</p>
          <p><strong>Silence trimmed:</strong> Start: {{ vadResults.silenceStart?.toFixed(3) }}s, End: {{ vadResults.silenceEnd?.toFixed(3) }}s</p>
        </div>
        <details>
          <summary>Full VAD Data</summary>
          <pre>{{ JSON.stringify(vadResults, null, 2) }}</pre>
        </details>
      </div>
    </div>

    <!-- Step 3: Audio Trimming -->
    <div class="test-section" v-if="vadResults">
      <h2>Step 3: Audio Trimming</h2>
      <button @click="performTrimming" :disabled="trimming">
        {{ trimming ? '✂️ Trimming...' : '✂️ Trim Audio' }}
      </button>
      
      <div v-if="trimmedBlob" class="trim-results">
        <h3>Trimming Results:</h3>
        <p>Original size: {{ Math.round(originalBlob.size / 1024) }}KB</p>
        <p>Trimmed size: {{ Math.round(trimmedBlob.size / 1024) }}KB</p>
        <p>Size difference: {{ Math.round((originalBlob.size - trimmedBlob.size) / 1024) }}KB</p>
      </div>
    </div>

    <!-- Step 4: Side-by-Side Comparison -->
    <div class="test-section" v-if="trimmedBlob">
      <h2>Step 4: Visual Comparison</h2>
      
      <div class="comparison-container">
        <div class="audio-comparison">
          <div class="original-audio">
            <h3>Original Audio</h3>
            <div class="waveform-container" ref="originalWaveformContainer"></div>
            <div class="spectrogram-container" ref="originalSpectrogramContainer"></div>
            <button @click="playOriginal">▶️ Play Original</button>
          </div>
          
          <div class="trimmed-audio">
            <h3>Trimmed Audio</h3>
            <div class="waveform-container" ref="trimmedWaveformContainer"></div>
            <div class="spectrogram-container" ref="trimmedSpectrogramContainer"></div>
            <button @click="playTrimmed">▶️ Play Trimmed</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 5: Blob Analysis -->
    <div class="test-section" v-if="trimmedBlob">
      <h2>Step 5: Blob Analysis</h2>
      <div class="blob-analysis">
        <h3>Blob URLs:</h3>
        <p>Original: <code>{{ originalUrl?.slice(0, 50) }}...</code></p>
        <p>Trimmed: <code>{{ trimmedUrl?.slice(0, 50) }}...</code></p>
        <p>URLs different: {{ originalUrl !== trimmedUrl ? '✅ Yes' : '❌ No (Problem!)' }}</p>
        
        <h3>Audio Duration Test:</h3>
        <button @click="testAudioDurations">🕒 Test Durations</button>
        <div v-if="durationTest">
          <p>Original duration: {{ durationTest.original?.toFixed(3) }}s</p>
          <p>Trimmed duration: {{ durationTest.trimmed?.toFixed(3) }}s</p>
          <p>Duration difference: {{ (durationTest.original - durationTest.trimmed)?.toFixed(3) }}s</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import WaveSurfer from 'wavesurfer.js'
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.esm.js'
import { useVADProcessor } from '@/composables/useVADProcessor'

// Reactive state
const originalBlob = ref(null)
const originalUrl = ref(null)
const trimmedBlob = ref(null)
const trimmedUrl = ref(null)
const vadResults = ref(null)
const analyzing = ref(false)
const trimming = ref(false)
const durationTest = ref(null)
const loading = ref(false)
const audioFileName = ref('')

// Recording state
const isRecording = ref(false)
const canRecord = ref(false)
const mediaRecorder = ref(null)
const recordedChunks = ref([])

// VAD settings
const vadSettings = ref({
  padding: 0.15,
  threshold: 0.5,
  minSpeechDuration: 50,
  maxSilenceDuration: 300,
  maxTrimStart: 3.0,
  maxTrimEnd: 2.0
})

// WaveSurfer instances
const originalWaveSurfer = ref(null)
const trimmedWaveSurfer = ref(null)

// Container refs
const originalWaveformContainer = ref(null)
const originalSpectrogramContainer = ref(null)
const trimmedWaveformContainer = ref(null)
const trimmedSpectrogramContainer = ref(null)

// VAD processor
const { detectSpeechBoundariesVAD, trimAudioWithVAD, vadReady } = useVADProcessor()

// Reset state for new audio
const resetAudioState = () => {
  vadResults.value = null
  
  // Cleanup old trimmed URLs only
  if (trimmedBlob.value && trimmedUrl.value && trimmedUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(trimmedUrl.value)
  }
  
  trimmedBlob.value = null
  trimmedUrl.value = null
  durationTest.value = null
}

// Load default audio file
const loadDefaultAudio = async () => {
  loading.value = true
  console.log('🎵 Loading default audio: patth.wav')
  
  try {
    // Clean up old original URL if it exists
    if (originalUrl.value && originalUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(originalUrl.value)
    }
    
    const response = await fetch('/patth.wav')
    if (!response.ok) {
      throw new Error(`Failed to load patth.wav: ${response.status}`)
    }
    
    const blob = await response.blob()
    resetAudioState()
    
    originalBlob.value = blob
    originalUrl.value = URL.createObjectURL(blob)
    audioFileName.value = 'patth.wav (default)'
    
    console.log('✅ Default audio loaded:', blob.size, 'bytes')
  } catch (error) {
    console.error('❌ Failed to load default audio:', error)
    console.warn('Default audio not available, please upload or record audio instead')
  } finally {
    loading.value = false
  }
}

// File upload handler
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    // Clean up old original URL if it exists
    if (originalUrl.value && originalUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(originalUrl.value)
    }
    
    resetAudioState()
    
    originalBlob.value = file
    originalUrl.value = URL.createObjectURL(file)
    audioFileName.value = file.name
    
    console.log('📁 File uploaded:', file.name, file.size, 'bytes')
  }
}

// Initialize recording capability
const initializeRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    canRecord.value = true
    console.log('🎤 Microphone access granted')
    // Stop the stream immediately, we'll request it again when recording
    stream.getTracks().forEach(track => track.stop())
  } catch (error) {
    console.error('❌ Microphone access denied:', error)
    canRecord.value = false
  }
}

// Toggle recording
const toggleRecording = async () => {
  if (isRecording.value) {
    // Stop recording
    if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
      mediaRecorder.value.stop()
    }
  } else {
    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordedChunks.value = []
      
      mediaRecorder.value = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.value.push(event.data)
        }
      }
      
      mediaRecorder.value.onstop = () => {
        const blob = new Blob(recordedChunks.value, { type: 'audio/webm' })
        
        // Clean up old original URL if it exists
        if (originalUrl.value && originalUrl.value.startsWith('blob:')) {
          URL.revokeObjectURL(originalUrl.value)
        }
        
        resetAudioState()
        
        originalBlob.value = blob
        originalUrl.value = URL.createObjectURL(blob)
        audioFileName.value = `Recording_${new Date().toLocaleTimeString()}.webm`
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        isRecording.value = false
        
        console.log('🎤 Recording complete:', blob.size, 'bytes')
      }
      
      mediaRecorder.value.start()
      isRecording.value = true
      console.log('🎤 Recording started...')
    } catch (error) {
      console.error('❌ Failed to start recording:', error)
      alert('Failed to start recording. Please check microphone permissions.')
    }
  }
}

// Reset VAD settings to defaults
const resetVADSettings = () => {
  vadSettings.value = {
    padding: 0.15,
    threshold: 0.5,
    minSpeechDuration: 50,
    maxSilenceDuration: 300,
    maxTrimStart: 3.0,
    maxTrimEnd: 2.0
  }
}

// VAD Analysis
const runVADAnalysis = async () => {
  if (!originalBlob.value) return
  
  analyzing.value = true
  console.log('🤖 Starting VAD analysis with settings:', vadSettings.value)
  
  try {
    const results = await detectSpeechBoundariesVAD(originalBlob.value, {
      padding: vadSettings.value.padding,
      threshold: vadSettings.value.threshold,
      minSpeechDuration: vadSettings.value.minSpeechDuration,
      maxSilenceDuration: vadSettings.value.maxSilenceDuration
    })
    vadResults.value = results
    console.log('✅ VAD analysis complete:', results)
  } catch (error) {
    console.error('❌ VAD analysis failed:', error)
  } finally {
    analyzing.value = false
  }
}

// Audio Trimming
const performTrimming = async () => {
  if (!originalBlob.value || !vadResults.value) return
  
  trimming.value = true
  console.log('✂️ Starting audio trimming...')
  
  try {
    const result = await trimAudioWithVAD(originalBlob.value, {
      padding: vadSettings.value.padding,
      maxTrimStart: vadSettings.value.maxTrimStart,
      maxTrimEnd: vadSettings.value.maxTrimEnd
    })
    if (result.blob && result.blob !== originalBlob.value) {
      trimmedBlob.value = result.blob
      trimmedUrl.value = URL.createObjectURL(result.blob)
      console.log('✅ Trimming complete:', result)
      
      // Wait for Vue to render the comparison containers
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Load both audio files into WaveSurfer
      try {
        await loadAudioComparison()
      } catch (comparisonError) {
        console.error('❌ Failed to load audio comparison:', comparisonError)
        // Continue without failing the entire trimming process
      }
    } else {
      console.warn('⚠️ No trimming performed or same blob returned')
    }
  } catch (error) {
    console.error('❌ Trimming failed:', error)
  } finally {
    trimming.value = false
  }
}

// Load audio into comparison WaveSurfers
const loadAudioComparison = async () => {
  console.log('🎵 Loading audio comparison...')
  
  // Wait for DOM to update with new containers
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Check if containers exist with retry logic
  let retryCount = 0
  const maxRetries = 3
  
  while (retryCount < maxRetries) {
    if (originalWaveformContainer.value && originalSpectrogramContainer.value && 
        trimmedWaveformContainer.value && trimmedSpectrogramContainer.value) {
      break
    }
    
    console.log(`🔄 Waiting for containers (attempt ${retryCount + 1}/${maxRetries})`)
    await new Promise(resolve => setTimeout(resolve, 200))
    retryCount++
  }
  
  if (!originalWaveformContainer.value || !originalSpectrogramContainer.value || 
      !trimmedWaveformContainer.value || !trimmedSpectrogramContainer.value) {
    console.error('❌ Audio containers not found in DOM after retries')
    console.log('Container availability:', {
      originalWaveform: !!originalWaveformContainer.value,
      originalSpectrogram: !!originalSpectrogramContainer.value,
      trimmedWaveform: !!trimmedWaveformContainer.value,
      trimmedSpectrogram: !!trimmedSpectrogramContainer.value
    })
    return
  }
  
  // Destroy existing instances
  if (originalWaveSurfer.value) {
    originalWaveSurfer.value.destroy()
    originalWaveSurfer.value = null
  }
  if (trimmedWaveSurfer.value) {
    trimmedWaveSurfer.value.destroy()
    trimmedWaveSurfer.value = null
  }
  
  try {
    // Create original WaveSurfer
    console.log('🎵 Creating original WaveSurfer...')
    originalWaveSurfer.value = WaveSurfer.create({
      container: originalWaveformContainer.value,
      height: 60,
      waveColor: 'rgb(59, 130, 246)',
      progressColor: 'rgb(147, 51, 234)',
      responsive: true,
    })
    
    originalWaveSurfer.value.registerPlugin(
      Spectrogram.create({
        container: originalSpectrogramContainer.value,
        labels: true,
        height: 150,
        fftSamples: 512,
      })
    )
    
    // Create trimmed WaveSurfer
    console.log('🎵 Creating trimmed WaveSurfer...')
    trimmedWaveSurfer.value = WaveSurfer.create({
      container: trimmedWaveformContainer.value,
      height: 60,
      waveColor: 'rgb(34, 197, 94)',
      progressColor: 'rgb(22, 163, 74)',
      responsive: true,
    })
    
    trimmedWaveSurfer.value.registerPlugin(
      Spectrogram.create({
        container: trimmedSpectrogramContainer.value,
        labels: true,
        height: 150,
        fftSamples: 512,
      })
    )
    
    // Load audio
    console.log('🎵 Loading original audio:', originalUrl.value)
    await originalWaveSurfer.value.load(originalUrl.value)
    
    console.log('🎵 Loading trimmed audio:', trimmedUrl.value)
    await trimmedWaveSurfer.value.load(trimmedUrl.value)
    
    console.log('✅ Both audio files loaded')
  } catch (error) {
    console.error('❌ Failed to create WaveSurfer instances:', error)
    throw error
  }
}

// Test audio durations
const testAudioDurations = async () => {
  if (!originalUrl.value || !trimmedUrl.value) return
  
  const getAudioDuration = async (url) => {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.onloadedmetadata = () => resolve(audio.duration)
      audio.src = url
    })
  }
  
  const originalDuration = await getAudioDuration(originalUrl.value)
  const trimmedDuration = await getAudioDuration(trimmedUrl.value)
  
  durationTest.value = {
    original: originalDuration,
    trimmed: trimmedDuration
  }
  
  console.log('🕒 Duration test:', durationTest.value)
}

// Playback controls
const playOriginal = () => {
  if (originalWaveSurfer.value) {
    originalWaveSurfer.value.playPause()
  }
}

const playTrimmed = () => {
  if (trimmedWaveSurfer.value) {
    trimmedWaveSurfer.value.playPause()
  }
}

// Cleanup
onMounted(async () => {
  console.log('🧪 VAD Trimming Debug Test mounted')
  console.log('🤖 VAD ready:', vadReady.value)
  
  // Initialize recording capability
  await initializeRecording()
})
</script>

<style scoped>
.vad-test-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  color: #1f2937;
  background: #ffffff;
}

.test-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  color: #1f2937;
}

.test-header h1 {
  color: #1f2937;
  font-weight: bold;
  margin-bottom: 10px;
}

.test-header p {
  color: #4b5563;
  font-size: 16px;
}

.test-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #1f2937;
}

.test-section h2 {
  margin-top: 0;
  color: #1f2937;
  font-weight: bold;
  border-bottom: 2px solid #3b82f6;
  padding-bottom: 10px;
}

.test-section p {
  color: #374151;
  font-weight: 500;
}

.test-section h3 {
  color: #1f2937;
  font-weight: bold;
  margin-top: 15px;
  margin-bottom: 10px;
}

.vad-results,
.trim-results,
.blob-analysis {
  margin-top: 15px;
  padding: 15px;
  background: #f9fafb;
  border-radius: 6px;
  color: #1f2937;
}

.vad-results pre {
  background: #1f2937;
  color: #f9fafb;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}

.comparison-container {
  margin-top: 20px;
}

.audio-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.original-audio,
.trimmed-audio {
  padding: 15px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  background: white;
}

.original-audio {
  border-color: #3b82f6;
}

.original-audio h3 {
  color: #3b82f6;
  font-weight: bold;
}

.trimmed-audio {
  border-color: #22c55e;
}

.trimmed-audio h3 {
  color: #22c55e;
  font-weight: bold;
}

.waveform-container {
  height: 60px;
  margin: 10px 0;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.spectrogram-container {
  height: 150px;
  margin: 10px 0;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  margin: 5px;
  font-weight: 500;
}

button:hover {
  background: #2563eb;
}

button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.blob-analysis code {
  background: #e5e7eb;
  color: #1f2937;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 12px;
  font-weight: 500;
}

/* Input styling */
input[type="file"] {
  color: #1f2937;
  background: white;
  border: 2px solid #d1d5db;
  padding: 8px;
  border-radius: 6px;
  font-weight: 500;
}

/* Ensure all text is visible */
* {
  color: inherit;
}

/* Audio source options */
.audio-source-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.default-audio-btn {
  background: #10b981;
  font-size: 16px;
  padding: 12px 20px;
}

.default-audio-btn:hover {
  background: #059669;
}

.upload-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.file-upload-label {
  background: #6366f1;
  color: white;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.file-upload-label:hover {
  background: #4f46e5;
}

#file-upload {
  display: none;
}

.record-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.record-btn {
  background: #dc2626;
  font-size: 16px;
  padding: 12px 20px;
}

.record-btn:hover {
  background: #b91c1c;
}

.record-btn.recording {
  background: #ef4444;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.record-error {
  color: #dc2626;
  font-size: 14px;
  margin: 0;
}

.audio-info {
  margin-top: 20px;
  padding: 15px;
  background: #f0f9ff;
  border: 2px solid #0ea5e9;
  border-radius: 8px;
}

.audio-info p {
  margin: 0 0 10px 0;
  color: #0c4a6e;
  font-weight: 600;
}

.audio-preview {
  width: 100%;
  max-width: 400px;
}

/* VAD Settings */
.vad-settings {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.vad-settings h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #1e293b;
  border-bottom: 2px solid #3b82f6;
  padding-bottom: 8px;
}

.setting-group {
  margin-bottom: 15px;
}

.setting-group label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-weight: 600;
  color: #374151;
}

.setting-group input {
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
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

.reset-btn {
  background: #f59e0b;
  margin-top: 10px;
}

.reset-btn:hover {
  background: #d97706;
}

.analyze-btn {
  background: #10b981;
  font-size: 16px;
  padding: 12px 24px;
  margin-bottom: 20px;
}

.analyze-btn:hover {
  background: #059669;
}

.results-summary {
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
}

.results-summary p {
  margin: 5px 0;
  color: #0c4a6e;
}

details {
  margin-top: 10px;
}

summary {
  cursor: pointer;
  font-weight: 600;
  color: #374151;
  padding: 5px 0;
}

summary:hover {
  color: #1f2937;
}
</style>