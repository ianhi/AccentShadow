<template>
  <div class="mobile-practice-b">
    <!-- Floating Header -->
    <header class="floating-header">
      <div class="header-content">
        <button class="nav-icon" @click="goBack">←</button>
        <div class="header-info">
          <span class="set-name">Japanese Basics</span>
          <span class="progress-text">Recording 3 of 25</span>
        </div>
        <button class="nav-icon" @click="showMenu">⋮</button>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
      </div>
    </header>

    <!-- Content Cards -->
    <main class="content-main">
      <!-- Target Audio Card -->
      <div class="audio-card target-card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon">🎯</span>
            <h2>Target Audio</h2>
          </div>
          <div class="card-actions">
            <button class="icon-btn" @click="loadAudio">📁</button>
            <button class="icon-btn" @click="showUrlModal">🌐</button>
          </div>
        </div>

        <div v-if="targetAudio" class="card-content">
          <!-- Audio Info -->
          <div class="audio-info">
            <span class="audio-name">{{ currentAudioName }}</span>
            <span class="audio-duration">{{ targetDuration }}</span>
          </div>

          <!-- Waveform Visualization -->
          <div class="visualization-area">
            <div class="viz-tabs">
              <button 
                class="viz-tab" 
                :class="{ active: activeViz === 'waveform' }"
                @click="setActiveViz('waveform')"
              >
                📊 Waveform
              </button>
              <button 
                class="viz-tab" 
                :class="{ active: activeViz === 'spectrogram' }"
                @click="setActiveViz('spectrogram')"
              >
                🌈 Spectrogram
              </button>
            </div>
            <div class="viz-display" ref="targetVizRef">
              <div class="viz-placeholder">
                {{ activeViz === 'waveform' ? '🎵 Target waveform' : '🌈 Target spectrogram' }}
              </div>
            </div>
          </div>

          <!-- Playback Controls -->
          <div class="playback-controls">
            <button class="control-btn play-btn" @click="playTarget">
              {{ isTargetPlaying ? '⏸️' : '▶️' }}
            </button>
            <div class="playback-slider">
              <input type="range" min="0" max="100" v-model="targetProgress" />
              <div class="time-display">{{ targetCurrentTime }} / {{ targetDuration }}</div>
            </div>
            <div class="speed-controls">
              <button class="speed-btn" @click="setSpeed(0.5)">0.5x</button>
              <button class="speed-btn" @click="setSpeed(1.0)">1x</button>
              <button class="speed-btn" @click="setSpeed(1.5)">1.5x</button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">🎵</div>
          <p>Load target audio to begin</p>
          <button class="load-btn" @click="loadAudio">
            📁 Browse Files
          </button>
        </div>
      </div>

      <!-- Recording Card -->
      <div class="recording-card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon">🎤</span>
            <h2>Recording</h2>
          </div>
          <div class="recording-status">
            <span class="status-indicator" :class="recordingState"></span>
            <span class="status-text">{{ recordingStatusText }}</span>
          </div>
        </div>

        <div class="recording-content">
          <!-- Recording Button -->
          <div class="record-area">
            <button 
              class="record-btn" 
              :class="recordingState"
              @click="toggleRecording"
              :disabled="isProcessing"
            >
              <div class="record-btn-inner">
                <span class="record-icon">{{ recordingIcon }}</span>
                <span class="record-text">{{ recordingButtonText }}</span>
                <span v-if="isRecording" class="record-timer">{{ recordingTime }}</span>
              </div>
            </button>
          </div>

          <!-- Real-time Visualization -->
          <div v-if="isRecording" class="live-viz">
            <div class="live-waveform" ref="liveWaveformRef">
              <div class="live-bars">
                <div class="bar" v-for="i in 20" :key="i" :style="{ height: Math.random() * 40 + 10 + 'px' }"></div>
              </div>
            </div>
          </div>

          <!-- Quick Settings -->
          <div class="quick-settings">
            <label class="setting-item">
              <input type="checkbox" v-model="vadEnabled" />
              <span class="setting-label">
                <span class="setting-icon">✂️</span>
                Smart Trim
              </span>
            </label>
            <label class="setting-item">
              <input type="checkbox" v-model="autoPlayEnabled" />
              <span class="setting-label">
                <span class="setting-icon">🔄</span>
                Auto-play
              </span>
            </label>
          </div>
        </div>
      </div>

      <!-- User Audio Card (appears after recording) -->
      <div v-if="hasUserRecording" class="audio-card user-card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon">🎙️</span>
            <h2>Your Recording</h2>
          </div>
          <div class="card-actions">
            <button class="icon-btn" @click="retryRecording" title="Record again">🔄</button>
            <button class="icon-btn" @click="enhanceRecording" title="Enhance audio">✨</button>
          </div>
        </div>

        <div class="card-content">
          <!-- Recording Quality Indicator -->
          <div class="quality-indicator">
            <div class="quality-badge" :class="recordingQuality">
              <span class="quality-icon">{{ qualityIcon }}</span>
              <span class="quality-text">{{ qualityText }}</span>
            </div>
            <span class="recording-duration">{{ userDuration }}</span>
          </div>

          <!-- User Visualization -->
          <div class="visualization-area">
            <div class="viz-tabs">
              <button 
                class="viz-tab" 
                :class="{ active: userActiveViz === 'waveform' }"
                @click="setUserActiveViz('waveform')"
              >
                📊 Waveform
              </button>
              <button 
                class="viz-tab" 
                :class="{ active: userActiveViz === 'spectrogram' }"
                @click="setUserActiveViz('spectrogram')"
              >
                🌈 Spectrogram
              </button>
            </div>
            <div class="viz-display" ref="userVizRef">
              <div class="viz-placeholder">
                {{ userActiveViz === 'waveform' ? '🎵 Your waveform' : '🌈 Your spectrogram' }}
              </div>
            </div>
          </div>

          <!-- User Playback Controls -->
          <div class="playback-controls">
            <button class="control-btn play-btn" @click="playUser">
              {{ isUserPlaying ? '⏸️' : '▶️' }}
            </button>
            <div class="playback-slider">
              <input type="range" min="0" max="100" v-model="userProgress" />
              <div class="time-display">{{ userCurrentTime }} / {{ userDuration }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison Card -->
      <div v-if="hasUserRecording" class="comparison-card">
        <div class="card-header">
          <div class="card-title">
            <span class="card-icon">📊</span>
            <h2>Compare & Analyze</h2>
          </div>
          <button class="expand-btn" @click="toggleComparisonExpanded">
            {{ comparisonExpanded ? '🔽' : '🔼' }}
          </button>
        </div>

        <div v-show="comparisonExpanded" class="card-content">
          <!-- Comparison Mode Selector -->
          <div class="comparison-modes">
            <button 
              class="mode-btn" 
              :class="{ active: comparisonMode === 'side-by-side' }"
              @click="setComparisonMode('side-by-side')"
            >
              📱 Side by Side
            </button>
            <button 
              class="mode-btn" 
              :class="{ active: comparisonMode === 'overlay' }"
              @click="setComparisonMode('overlay')"
            >
              📊 Overlay
            </button>
            <button 
              class="mode-btn" 
              :class="{ active: comparisonMode === 'difference' }"
              @click="setComparisonMode('difference')"
            >
              🔍 Difference
            </button>
          </div>

          <!-- Comparison Visualization -->
          <div class="comparison-viz" ref="comparisonVizRef">
            <div class="comparison-placeholder">
              📊 {{ comparisonMode }} comparison view
            </div>
          </div>

          <!-- Comparison Controls -->
          <div class="comparison-controls">
            <button class="comparison-action" @click="playBoth">
              🔄 Play Both
            </button>
            <button class="comparison-action" @click="syncPlayback">
              ⚡ Sync Play
            </button>
            <button class="comparison-action" @click="analyzeAlignment">
              🎯 Analyze
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Floating Action Bar -->
    <div class="floating-actions">
      <div class="action-group">
        <button 
          class="fab secondary" 
          @click="previousRecording"
          :disabled="isFirstRecording"
        >
          ←
        </button>
        <button 
          class="fab primary" 
          @click="saveAndNext"
          :disabled="!hasUserRecording"
        >
          {{ hasUserRecording ? '💾 Save & Next' : '⏳ Record First' }}
        </button>
        <button 
          class="fab secondary" 
          @click="nextRecording"
          :disabled="isLastRecording"
        >
          →
        </button>
      </div>
    </div>

    <!-- Bottom Safe Area -->
    <div class="bottom-safe-area"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Audio state
const targetAudio = ref(null)
const targetAudioUrl = ref(null)
const currentAudioName = ref('patth.wav')
const targetDuration = ref('0:00')
const userDuration = ref('0:02')
const hasUserRecording = ref(false)

// Recording state
const isRecording = ref(false)
const isProcessing = ref(false)
const recordingTime = ref('00:00')
const recordingQuality = ref('good') // 'excellent', 'good', 'fair', 'poor'

// Playback state
const isTargetPlaying = ref(false)
const isUserPlaying = ref(false)
const targetProgress = ref(0)
const userProgress = ref(0)
const targetCurrentTime = ref('0:00')
const userCurrentTime = ref('0:00')

// UI state
const activeViz = ref('waveform')
const userActiveViz = ref('waveform')
const comparisonMode = ref('side-by-side')
const comparisonExpanded = ref(false)
const vadEnabled = ref(true)
const autoPlayEnabled = ref(true)

// Navigation state
const currentRecording = ref(3)
const totalRecordings = ref(25)
const isFirstRecording = computed(() => currentRecording.value === 1)
const isLastRecording = computed(() => currentRecording.value === totalRecordings.value)

// Computed properties
const progressPercentage = computed(() => (currentRecording.value / totalRecordings.value) * 100)

const recordingState = computed(() => {
  if (isProcessing.value) return 'processing'
  if (isRecording.value) return 'recording'
  return 'idle'
})

const recordingStatusText = computed(() => {
  if (isProcessing.value) return 'Processing...'
  if (isRecording.value) return 'Recording...'
  if (hasUserRecording.value) return 'Complete'
  return 'Ready'
})

const recordingIcon = computed(() => {
  if (isProcessing.value) return '⏳'
  if (isRecording.value) return '⏹️'
  return '🎤'
})

const recordingButtonText = computed(() => {
  if (isProcessing.value) return 'Processing'
  if (isRecording.value) return 'Stop'
  return 'Record'
})

const qualityIcon = computed(() => {
  const icons = {
    excellent: '🌟',
    good: '✅',
    fair: '⚠️',
    poor: '❌'
  }
  return icons[recordingQuality.value] || '✅'
})

const qualityText = computed(() => {
  const texts = {
    excellent: 'Excellent',
    good: 'Good Quality',
    fair: 'Fair Quality',
    poor: 'Poor Quality'
  }
  return texts[recordingQuality.value] || 'Good Quality'
})

// Methods
const goBack = () => console.log('Go back')
const showMenu = () => console.log('Show menu')
const loadAudio = () => console.log('Load audio')
const showUrlModal = () => console.log('Show URL modal')

const setActiveViz = (viz) => {
  activeViz.value = viz
}

const setUserActiveViz = (viz) => {
  userActiveViz.value = viz
}

const loadTargetAudio = async () => {
  try {
    const audio = new Audio('/patth.wav')
    audio.addEventListener('loadedmetadata', () => {
      const duration = Math.floor(audio.duration)
      const mins = Math.floor(duration / 60)
      const secs = duration % 60
      targetDuration.value = `${mins}:${secs.toString().padStart(2, '0')}`
    })
    targetAudio.value = audio
    targetAudioUrl.value = '/patth.wav'
    console.log('Target audio loaded: patth.wav')
  } catch (error) {
    console.error('Failed to load target audio:', error)
  }
}

const playTarget = () => {
  if (!targetAudio.value) return
  
  if (isTargetPlaying.value) {
    targetAudio.value.pause()
    isTargetPlaying.value = false
  } else {
    targetAudio.value.play()
    isTargetPlaying.value = true
    
    targetAudio.value.addEventListener('ended', () => {
      isTargetPlaying.value = false
    }, { once: true })
  }
}

const playUser = () => {
  isUserPlaying.value = !isUserPlaying.value
}

const setSpeed = (speed) => {
  console.log('Set speed:', speed)
}

const toggleRecording = () => {
  if (isRecording.value) {
    isRecording.value = false
    isProcessing.value = true
    
    setTimeout(() => {
      isProcessing.value = false
      hasUserRecording.value = true
      recordingQuality.value = ['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)]
    }, 2000)
  } else {
    isRecording.value = true
    recordingTime.value = '00:00'
    
    let seconds = 0
    const timer = setInterval(() => {
      if (!isRecording.value) {
        clearInterval(timer)
        return
      }
      seconds++
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      recordingTime.value = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }, 1000)
  }
}

const retryRecording = () => {
  hasUserRecording.value = false
}

const enhanceRecording = () => {
  console.log('Enhance recording')
}

const setComparisonMode = (mode) => {
  comparisonMode.value = mode
}

const toggleComparisonExpanded = () => {
  comparisonExpanded.value = !comparisonExpanded.value
}

const playBoth = () => console.log('Play both')
const syncPlayback = () => console.log('Sync playback')
const analyzeAlignment = () => console.log('Analyze alignment')

const previousRecording = () => {
  if (!isFirstRecording.value) {
    currentRecording.value--
  }
}

const nextRecording = () => {
  if (!isLastRecording.value) {
    currentRecording.value++
  }
}

const saveAndNext = () => {
  console.log('Save and next')
  nextRecording()
}

onMounted(async () => {
  console.log('Mobile Test B mounted')
  await loadTargetAudio()
})
</script>

<style scoped>
.mobile-practice-b {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-top: 80px;
}

/* Floating Header */
.floating-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
}

.nav-icon {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-icon:hover {
  background: rgba(0, 0, 0, 0.1);
}

.header-info {
  flex: 1;
  text-align: center;
  margin: 0 16px;
}

.set-name {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.2;
}

.progress-text {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.progress-bar {
  height: 3px;
  background: rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}

/* Content Main */
.content-main {
  padding: 16px;
  padding-bottom: 100px;
}

/* Card Base Styles */
.audio-card, .recording-card, .comparison-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  margin-bottom: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-icon {
  font-size: 24px;
}

.card-title h2 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.card-content {
  padding: 20px;
}

/* Target Card Specific */
.target-card .card-header {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.target-card .icon-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.target-card .icon-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* User Card Specific */
.user-card .card-header {
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
}

.user-card .icon-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.user-card .icon-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Audio Info */
.audio-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  margin-bottom: 16px;
}

.audio-name {
  font-weight: 500;
  color: #374151;
}

.audio-duration {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* Visualization Area */
.visualization-area {
  margin-bottom: 16px;
}

.viz-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 12px;
}

.viz-tab {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.viz-tab.active {
  background: white;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.viz-display {
  height: 120px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
}

/* Playback Controls */
.playback-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.control-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.control-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.playback-slider {
  flex: 1;
}

.playback-slider input {
  width: 100%;
  margin-bottom: 8px;
}

.time-display {
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}

.speed-controls {
  display: flex;
  gap: 4px;
}

.speed-btn {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.speed-btn:hover {
  background: #f3f4f6;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.load-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 16px;
}

.load-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Recording Card */
.recording-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #9ca3af;
}

.status-indicator.recording {
  background: #ef4444;
  animation: pulse 2s infinite;
}

.status-indicator.processing {
  background: #f59e0b;
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.recording-content {
  padding: 20px;
}

.record-area {
  text-align: center;
  margin-bottom: 24px;
}

.record-btn {
  width: 120px;
  height: 120px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
}

.record-btn.recording {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  animation: pulse 2s infinite;
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);
}

.record-btn.processing {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 8px 32px rgba(245, 158, 11, 0.3);
}

.record-btn-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.record-icon {
  font-size: 32px;
  margin-bottom: 4px;
}

.record-text {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.record-timer {
  font-size: 10px;
  margin-top: 4px;
  opacity: 0.8;
}

/* Live Visualization */
.live-viz {
  margin-bottom: 24px;
}

.live-waveform {
  height: 60px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.live-bars {
  display: flex;
  align-items: end;
  gap: 2px;
  height: 40px;
}

.bar {
  width: 3px;
  background: linear-gradient(to top, #3b82f6, #8b5cf6);
  border-radius: 2px;
  animation: bounce 0.5s infinite alternate;
}

.bar:nth-child(even) {
  animation-delay: 0.1s;
}

.bar:nth-child(3n) {
  animation-delay: 0.2s;
}

@keyframes bounce {
  from { opacity: 0.3; }
  to { opacity: 1; }
}

/* Quick Settings */
.quick-settings {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.setting-item:hover {
  background: rgba(0, 0, 0, 0.02);
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.setting-icon {
  font-size: 16px;
}

/* Quality Indicator */
.quality-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.quality-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.quality-badge.excellent {
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
}

.quality-badge.good {
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
}

.quality-badge.fair {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.quality-badge.poor {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.quality-icon {
  font-size: 16px;
}

.recording-duration {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

/* Comparison Card */
.expand-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.expand-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.comparison-modes {
  display: flex;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
}

.mode-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn.active {
  background: white;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.comparison-viz {
  height: 100px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 16px;
}

.comparison-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.comparison-action {
  flex: 1;
  min-width: 100px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: white;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.comparison-action:hover {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.2);
}

/* Floating Actions */
.floating-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.action-group {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 400px;
  margin: 0 auto;
}

.fab {
  border: none;
  border-radius: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fab.secondary {
  width: 48px;
  height: 48px;
  background: rgba(0, 0, 0, 0.05);
  color: #374151;
  font-size: 18px;
}

.fab.secondary:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
}

.fab.primary {
  flex: 1;
  height: 48px;
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
  font-size: 14px;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

.fab.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.fab:disabled {
  background: #9ca3af !important;
  color: #6b7280 !important;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

/* Bottom Safe Area */
.bottom-safe-area {
  height: env(safe-area-inset-bottom);
}

/* Responsive */
@media (max-width: 375px) {
  .quick-settings {
    flex-direction: column;
    align-items: center;
  }
  
  .comparison-controls {
    flex-direction: column;
  }
  
  .speed-controls {
    flex-direction: column;
    gap: 2px;
  }
}

@media (min-width: 768px) {
  .mobile-practice-b {
    max-width: 480px;
    margin: 0 auto;
  }
}
</style>