<template>
  <div class="mobile-practice-c">
    <!-- Tab Navigation -->
    <nav class="tab-navigation">
      <div class="nav-header">
        <button class="back-btn" @click="goBack">←</button>
        <div class="session-info">
          <span class="session-title">Japanese Basics</span>
          <span class="session-progress">3/25</span>
        </div>
        <button class="menu-btn" @click="showMenu">⋮</button>
      </div>
      
      <div class="tab-bar">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn" 
          :class="{ 
            active: activeTab === tab.id, 
            completed: tab.completed,
            disabled: tab.disabled 
          }"
          @click="setActiveTab(tab.id)"
          :disabled="tab.disabled"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <span v-if="tab.completed" class="tab-check">✓</span>
        </button>
      </div>
    </nav>

    <!-- Tab Content -->
    <main class="tab-content">
      <!-- Load Tab -->
      <div v-show="activeTab === 'load'" class="tab-panel load-panel">
        <div class="panel-header">
          <h1>Load Target Audio</h1>
          <p>Choose your target pronunciation to practice</p>
        </div>

        <div class="load-options">
          <!-- File Upload -->
          <div class="load-option">
            <div class="option-icon">📁</div>
            <div class="option-content">
              <h3>Upload File</h3>
              <p>Choose an audio file from your device</p>
              <button class="option-btn" @click="uploadFile">
                Browse Files
              </button>
            </div>
          </div>

          <!-- URL Load -->
          <div class="load-option">
            <div class="option-icon">🌐</div>
            <div class="option-content">
              <h3>Load from URL</h3>
              <p>Enter a direct link to an audio file</p>
              <div class="url-input-group">
                <input 
                  type="url" 
                  v-model="audioUrl" 
                  placeholder="https://example.com/audio.mp3"
                  class="url-input"
                />
                <button class="url-btn" @click="loadFromUrl" :disabled="!audioUrl.trim()">
                  Load
                </button>
              </div>
            </div>
          </div>

          <!-- Recent Files -->
          <div v-if="recentFiles.length" class="recent-files">
            <h3>Recent Files</h3>
            <div class="recent-list">
              <div 
                v-for="file in recentFiles" 
                :key="file.id"
                class="recent-item"
                @click="loadRecentFile(file)"
              >
                <span class="file-icon">🎵</span>
                <div class="file-info">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-duration">{{ file.duration }}</span>
                </div>
                <span class="file-arrow">→</span>
              </div>
            </div>
          </div>

          <!-- Current Audio Info -->
          <div v-if="targetAudio" class="current-audio-info">
            <div class="audio-preview">
              <div class="audio-icon">🎵</div>
              <div class="audio-details">
                <h4>{{ currentAudioName }}</h4>
                <p>Duration: {{ targetDuration }}</p>
              </div>
              <button class="preview-btn" @click="previewAudio">
                {{ isPreviewing ? '⏸️' : '▶️' }}
              </button>
            </div>
            <button class="continue-btn" @click="continueToListen">
              Continue to Listen →
            </button>
          </div>
        </div>
      </div>

      <!-- Listen Tab -->
      <div v-show="activeTab === 'listen'" class="tab-panel listen-panel">
        <div class="panel-header">
          <h1>Listen & Analyze</h1>
          <p>Study the target pronunciation carefully</p>
        </div>

        <div v-if="targetAudio" class="listen-content">
          <!-- Audio Player -->
          <div class="audio-player-card">
            <div class="player-header">
              <h3>{{ currentAudioName }}</h3>
              <div class="player-info">
                <span class="duration">{{ targetDuration }}</span>
                <span class="quality">High Quality</span>
              </div>
            </div>

            <!-- Large Play Button -->
            <div class="main-player">
              <button class="play-button" @click="toggleTargetPlayback">
                <span class="play-icon">{{ isTargetPlaying ? '⏸️' : '▶️' }}</span>
              </button>
              <div class="play-controls">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  v-model="targetProgress" 
                  class="progress-slider"
                />
                <div class="time-display">
                  {{ targetCurrentTime }} / {{ targetDuration }}
                </div>
              </div>
            </div>

            <!-- Speed Controls -->
            <div class="speed-section">
              <label>Playback Speed</label>
              <div class="speed-buttons">
                <button 
                  v-for="speed in speedOptions" 
                  :key="speed"
                  class="speed-btn" 
                  :class="{ active: currentSpeed === speed }"
                  @click="setPlaybackSpeed(speed)"
                >
                  {{ speed }}x
                </button>
              </div>
            </div>

            <!-- Loop Controls -->
            <div class="loop-section">
              <label class="loop-toggle">
                <input type="checkbox" v-model="loopEnabled" />
                <span>🔄 Loop playback</span>
              </label>
            </div>
          </div>

          <!-- Visualization -->
          <div class="visualization-card">
            <div class="viz-header">
              <h3>Audio Visualization</h3>
              <div class="viz-controls">
                <button 
                  class="viz-type-btn" 
                  :class="{ active: vizType === 'waveform' }"
                  @click="setVizType('waveform')"
                >
                  📊 Wave
                </button>
                <button 
                  class="viz-type-btn" 
                  :class="{ active: vizType === 'spectrogram' }"
                  @click="setVizType('spectrogram')"
                >
                  🌈 Spectrum
                </button>
              </div>
            </div>
            <div class="viz-display" ref="targetVizRef">
              <div class="viz-placeholder">
                {{ vizType === 'waveform' ? '🎵 Target waveform' : '🌈 Target spectrogram' }}
              </div>
            </div>
          </div>

          <!-- Analysis Tools -->
          <div class="analysis-card">
            <h3>Analysis Tools</h3>
            <div class="analysis-buttons">
              <button class="analysis-btn" @click="showPhonetics">
                🔤 Phonetics
              </button>
              <button class="analysis-btn" @click="showStressPattern">
                📈 Stress Pattern
              </button>
              <button class="analysis-btn" @click="showBreakdown">
                🎯 Breakdown
              </button>
            </div>
          </div>

          <button class="tab-continue-btn" @click="continueToRecord">
            Ready to Record →
          </button>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">🎵</div>
          <h3>No audio loaded</h3>
          <p>Load an audio file first to continue</p>
          <button class="load-audio-btn" @click="setActiveTab('load')">
            ← Load Audio
          </button>
        </div>
      </div>

      <!-- Record Tab -->
      <div v-show="activeTab === 'record'" class="tab-panel record-panel">
        <div class="panel-header">
          <h1>Record Your Voice</h1>
          <p>Try to match the target pronunciation</p>
        </div>

        <div class="record-content">
          <!-- Recording Interface -->
          <div class="recording-interface">
            <!-- Status Display -->
            <div class="recording-status">
              <div class="status-indicator" :class="recordingState">
                <span class="status-dot"></span>
                <span class="status-text">{{ recordingStatusText }}</span>
              </div>
              <div v-if="isRecording" class="recording-timer">
                {{ recordingTime }}
              </div>
            </div>

            <!-- Main Record Button -->
            <div class="record-button-area">
              <button 
                class="main-record-btn" 
                :class="recordingState"
                @click="toggleRecording"
                :disabled="isProcessing"
              >
                <div class="record-btn-content">
                  <span class="record-icon">{{ recordingIcon }}</span>
                  <span class="record-label">{{ recordingButtonText }}</span>
                </div>
              </button>
            </div>

            <!-- Live Feedback -->
            <div v-if="isRecording" class="live-feedback">
              <div class="live-waveform">
                <div class="live-bars">
                  <div 
                    v-for="i in 15" 
                    :key="i" 
                    class="live-bar" 
                    :style="{ height: liveAudioLevels[i] + 'px' }"
                  ></div>
                </div>
              </div>
              <p>Speak clearly into your microphone</p>
            </div>

            <!-- Quick Settings -->
            <div class="quick-recording-settings">
              <div class="setting-row">
                <label class="setting-item">
                  <input type="checkbox" v-model="vadEnabled" />
                  <span class="setting-text">
                    <span class="setting-icon">✂️</span>
                    Auto-trim silence
                  </span>
                </label>
                <label class="setting-item">
                  <input type="checkbox" v-model="autoPlayEnabled" />
                  <span class="setting-text">
                    <span class="setting-icon">🔄</span>
                    Auto-play result
                  </span>
                </label>
              </div>
            </div>
          </div>

          <!-- Instructions -->
          <div class="recording-instructions">
            <h3>Recording Tips</h3>
            <ul>
              <li>🎤 Hold your device 6-8 inches from your mouth</li>
              <li>🔇 Find a quiet environment</li>
              <li>📢 Speak clearly and at normal volume</li>
              <li>⏱️ Try to match the timing of the target</li>
            </ul>
          </div>

          <!-- Navigation -->
          <div class="record-navigation">
            <button class="nav-secondary" @click="goBackToListen">
              ← Listen Again
            </button>
            <button 
              class="nav-primary" 
              @click="continueToCompare"
              :disabled="!hasUserRecording"
            >
              {{ hasUserRecording ? 'Compare →' : 'Record First' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Compare Tab -->
      <div v-show="activeTab === 'compare'" class="tab-panel compare-panel">
        <div class="panel-header">
          <h1>Compare & Improve</h1>
          <p>Analyze your pronunciation against the target</p>
        </div>

        <div v-if="hasUserRecording" class="compare-content">
          <!-- Comparison Player -->
          <div class="comparison-player">
            <div class="player-row target-row">
              <div class="player-label">
                <span class="label-icon">🎯</span>
                <span class="label-text">Target</span>
              </div>
              <button class="mini-play-btn" @click="playTarget">
                {{ isTargetPlaying ? '⏸️' : '▶️' }}
              </button>
              <div class="mini-progress">
                <div class="progress-bar target-progress" :style="{ width: targetProgress + '%' }"></div>
              </div>
              <span class="duration-text">{{ targetDuration }}</span>
            </div>

            <div class="player-row user-row">
              <div class="player-label">
                <span class="label-icon">🎙️</span>
                <span class="label-text">Your Voice</span>
              </div>
              <button class="mini-play-btn" @click="playUser">
                {{ isUserPlaying ? '⏸️' : '▶️' }}
              </button>
              <div class="mini-progress">
                <div class="progress-bar user-progress" :style="{ width: userProgress + '%' }"></div>
              </div>
              <span class="duration-text">{{ userDuration }}</span>
            </div>

            <div class="sync-controls">
              <button class="sync-btn" @click="playBoth">
                🔄 Play Both
              </button>
              <button class="sync-btn" @click="syncPlayback">
                ⚡ Sync Play
              </button>
            </div>
          </div>

          <!-- Quality Assessment -->
          <div class="quality-assessment">
            <h3>Quality Assessment</h3>
            <div class="quality-metrics">
              <div class="metric-item">
                <div class="metric-icon">🎯</div>
                <div class="metric-info">
                  <span class="metric-label">Accuracy</span>
                  <div class="metric-bar">
                    <div class="metric-fill accuracy" :style="{ width: accuracyScore + '%' }"></div>
                  </div>
                  <span class="metric-value">{{ accuracyScore }}%</span>
                </div>
              </div>
              <div class="metric-item">
                <div class="metric-icon">🎼</div>
                <div class="metric-info">
                  <span class="metric-label">Rhythm</span>
                  <div class="metric-bar">
                    <div class="metric-fill rhythm" :style="{ width: rhythmScore + '%' }"></div>
                  </div>
                  <span class="metric-value">{{ rhythmScore }}%</span>
                </div>
              </div>
              <div class="metric-item">
                <div class="metric-icon">📢</div>
                <div class="metric-info">
                  <span class="metric-label">Clarity</span>
                  <div class="metric-bar">
                    <div class="metric-fill clarity" :style="{ width: clarityScore + '%' }"></div>
                  </div>
                  <span class="metric-value">{{ clarityScore }}%</span>
                </div>
              </div>
            </div>
            <div class="overall-score">
              <span class="score-label">Overall Score</span>
              <span class="score-value" :class="overallGrade">{{ overallScore }}%</span>
              <span class="score-grade">{{ overallGrade.toUpperCase() }}</span>
            </div>
          </div>

          <!-- Visual Comparison -->
          <div class="visual-comparison">
            <div class="comparison-tabs">
              <button 
                class="comp-tab" 
                :class="{ active: comparisonView === 'overlay' }"
                @click="setComparisonView('overlay')"
              >
                📊 Overlay
              </button>
              <button 
                class="comp-tab" 
                :class="{ active: comparisonView === 'side-by-side' }"
                @click="setComparisonView('side-by-side')"
              >
                📱 Side by Side
              </button>
              <button 
                class="comp-tab" 
                :class="{ active: comparisonView === 'difference' }"
                @click="setComparisonView('difference')"
              >
                🔍 Difference
              </button>
            </div>
            <div class="comparison-display" ref="comparisonDisplayRef">
              <div class="comparison-placeholder">
                📊 {{ comparisonView }} view will appear here
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="compare-actions">
            <button class="action-secondary" @click="retryRecording">
              🔄 Record Again
            </button>
            <button class="action-secondary" @click="enhanceRecording">
              ✨ Enhance Audio
            </button>
          </div>

          <!-- Final Actions -->
          <div class="final-actions">
            <button class="final-btn save-btn" @click="saveRecording">
              💾 Save Recording
            </button>
            <button class="final-btn complete-btn" @click="markCompleteAndNext">
              ✅ Complete & Next
            </button>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon">🎙️</div>
          <h3>No recording yet</h3>
          <p>Record your voice first to see the comparison</p>
          <button class="record-first-btn" @click="setActiveTab('record')">
            ← Go Record
          </button>
        </div>
      </div>
    </main>

    <!-- Bottom Safe Area -->
    <div class="bottom-safe-area"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// Tab management
const activeTab = ref('load')
const tabs = computed(() => [
  { 
    id: 'load', 
    label: 'Load', 
    icon: '📁', 
    completed: !!targetAudio.value, 
    disabled: false 
  },
  { 
    id: 'listen', 
    label: 'Listen', 
    icon: '👂', 
    completed: hasListened.value, 
    disabled: !targetAudio.value 
  },
  { 
    id: 'record', 
    label: 'Record', 
    icon: '🎤', 
    completed: hasUserRecording.value, 
    disabled: !targetAudio.value 
  },
  { 
    id: 'compare', 
    label: 'Compare', 
    icon: '📊', 
    completed: false, 
    disabled: !hasUserRecording.value 
  }
])

// Audio state
const targetAudio = ref(null)
const targetAudioUrl = ref(null)
const currentAudioName = ref('patth.wav')
const targetDuration = ref('0:00')
const userDuration = ref('0:00')
const hasUserRecording = ref(false)
const hasListened = ref(false)
const audioUrl = ref('')

// Playback state
const isTargetPlaying = ref(false)
const isUserPlaying = ref(false)
const isPreviewing = ref(false)
const targetProgress = ref(0)
const userProgress = ref(0)
const targetCurrentTime = ref('0:00')
const userCurrentTime = ref('0:00')
const currentSpeed = ref(1.0)
const loopEnabled = ref(false)

// Recording state
const isRecording = ref(false)
const isProcessing = ref(false)
const recordingTime = ref('00:00')
const vadEnabled = ref(true)
const autoPlayEnabled = ref(true)

// Visualization state
const vizType = ref('waveform')
const comparisonView = ref('overlay')

// Live audio feedback
const liveAudioLevels = ref(Array(15).fill(0).map(() => Math.random() * 30 + 10))

// Quality scores
const accuracyScore = ref(85)
const rhythmScore = ref(78)
const clarityScore = ref(92)

// Sample recent files
const recentFiles = ref([
  { id: 1, name: 'こんにちは.mp3', duration: '0:03' },
  { id: 2, name: 'ありがとう.wav', duration: '0:04' },
  { id: 3, name: 'sayonara.mp3', duration: '0:05' }
])

// Speed options
const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

// Computed properties
const recordingState = computed(() => {
  if (isProcessing.value) return 'processing'
  if (isRecording.value) return 'recording'
  return 'idle'
})

const recordingStatusText = computed(() => {
  if (isProcessing.value) return 'Processing your recording...'
  if (isRecording.value) return 'Recording in progress'
  if (hasUserRecording.value) return 'Recording complete'
  return 'Ready to record'
})

const recordingIcon = computed(() => {
  if (isProcessing.value) return '⏳'
  if (isRecording.value) return '⏹️'
  return '🎤'
})

const recordingButtonText = computed(() => {
  if (isProcessing.value) return 'Processing...'
  if (isRecording.value) return 'Stop Recording'
  return 'Start Recording'
})

const overallScore = computed(() => {
  return Math.round((accuracyScore.value + rhythmScore.value + clarityScore.value) / 3)
})

const overallGrade = computed(() => {
  const score = overallScore.value
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'good'
  if (score >= 70) return 'fair'
  return 'poor'
})

// Methods
const setActiveTab = (tabId) => {
  const tab = tabs.value.find(t => t.id === tabId)
  if (!tab.disabled) {
    activeTab.value = tabId
  }
}

const goBack = () => console.log('Go back')
const showMenu = () => console.log('Show menu')

// Audio loading
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

// Load tab methods
const uploadFile = () => {
  console.log('Upload file')
  // Simulate file upload
  setTimeout(() => {
    loadTargetAudio()
  }, 1000)
}

const loadFromUrl = () => {
  if (audioUrl.value.trim()) {
    console.log('Load from URL:', audioUrl.value)
    // Simulate URL loading
    setTimeout(() => {
      loadTargetAudio()
      audioUrl.value = ''
    }, 1500)
  }
}

const loadRecentFile = (file) => {
  console.log('Load recent file:', file)
  // For demo, always load patth.wav
  loadTargetAudio()
}

const previewAudio = () => {
  if (!targetAudio.value) return
  
  if (isPreviewing.value) {
    targetAudio.value.pause()
    isPreviewing.value = false
  } else {
    targetAudio.value.play()
    isPreviewing.value = true
    
    targetAudio.value.addEventListener('ended', () => {
      isPreviewing.value = false
    }, { once: true })
  }
}

const continueToListen = () => {
  setActiveTab('listen')
}

// Listen tab methods
const toggleTargetPlayback = () => {
  if (!targetAudio.value) return
  
  if (isTargetPlaying.value) {
    targetAudio.value.pause()
    isTargetPlaying.value = false
  } else {
    targetAudio.value.play()
    isTargetPlaying.value = true
    hasListened.value = true
    
    targetAudio.value.addEventListener('ended', () => {
      isTargetPlaying.value = false
    }, { once: true })
  }
}

const setPlaybackSpeed = (speed) => {
  currentSpeed.value = speed
}

const setVizType = (type) => {
  vizType.value = type
}

const showPhonetics = () => console.log('Show phonetics')
const showStressPattern = () => console.log('Show stress pattern')
const showBreakdown = () => console.log('Show breakdown')

const continueToRecord = () => {
  setActiveTab('record')
}

// Record tab methods
const toggleRecording = () => {
  if (isRecording.value) {
    isRecording.value = false
    isProcessing.value = true
    
    // Simulate processing
    setTimeout(() => {
      isProcessing.value = false
      hasUserRecording.value = true
      userDuration.value = '0:03'
    }, 2000)
  } else {
    isRecording.value = true
    recordingTime.value = '00:00'
    
    // Simulate recording timer and live audio levels
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
      
      // Update live audio levels
      liveAudioLevels.value = liveAudioLevels.value.map(() => Math.random() * 40 + 5)
    }, 1000)
  }
}

const goBackToListen = () => {
  setActiveTab('listen')
}

const continueToCompare = () => {
  setActiveTab('compare')
}

// Compare tab methods
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

const playBoth = () => console.log('Play both')
const syncPlayback = () => console.log('Sync playback')

const setComparisonView = (view) => {
  comparisonView.value = view
}

const retryRecording = () => {
  hasUserRecording.value = false
  setActiveTab('record')
}

const enhanceRecording = () => console.log('Enhance recording')
const saveRecording = () => console.log('Save recording')

const markCompleteAndNext = () => {
  console.log('Mark complete and next')
  // Reset for next recording
  if (targetAudio.value) {
    targetAudio.value.pause()
  }
  targetAudio.value = null
  hasUserRecording.value = false
  hasListened.value = false
  setActiveTab('load')
  // Load next audio (for demo, reload same audio)
  setTimeout(() => {
    loadTargetAudio()
  }, 500)
}

onMounted(async () => {
  console.log('Mobile Test C mounted')
  await loadTargetAudio()
  // Start on listen tab since audio is preloaded
  setActiveTab('listen')
})
</script>

<style scoped>
.mobile-practice-c {
  min-height: 100vh;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Tab Navigation */
.tab-navigation {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
}

.back-btn, .menu-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover, .menu-btn:hover {
  background: #e5e7eb;
}

.session-info {
  flex: 1;
  text-align: center;
  margin: 0 16px;
}

.session-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.2;
}

.session-progress {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.tab-bar {
  display: flex;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.tab-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tab-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tab-btn.active {
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.tab-btn.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
}

.tab-icon {
  font-size: 20px;
}

.tab-label {
  font-size: 12px;
  font-weight: 500;
  color: #374151;
}

.tab-btn.active .tab-label {
  color: #3b82f6;
}

.tab-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 16px;
  height: 16px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tab Content */
.tab-content {
  min-height: calc(100vh - 140px);
}

.tab-panel {
  padding: 0;
}

.panel-header {
  padding: 24px 20px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.panel-header h1 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.panel-header p {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

/* Load Panel */
.load-options {
  padding: 20px;
}

.load-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.option-icon {
  font-size: 32px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 16px;
}

.option-content {
  flex: 1;
}

.option-content h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.option-content p {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px 0;
}

.option-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover {
  background: #2563eb;
}

.url-input-group {
  display: flex;
  gap: 8px;
}

.url-input {
  flex: 1;
  padding: 10px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background: #f9fafb;
}

.url-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: white;
}

.url-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.url-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.recent-files {
  margin-top: 24px;
}

.recent-files h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e5e7eb;
}

.recent-item:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.file-icon {
  font-size: 20px;
}

.file-info {
  flex: 1;
}

.file-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.file-duration {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.file-arrow {
  font-size: 16px;
  color: #9ca3af;
}

.current-audio-info {
  margin-top: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  border-radius: 16px;
  color: white;
}

.audio-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.audio-icon {
  font-size: 32px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
}

.audio-details {
  flex: 1;
}

.audio-details h4 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.audio-details p {
  font-size: 14px;
  opacity: 0.9;
  margin: 0;
}

.preview-btn {
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.continue-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: white;
  color: #047857;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.continue-btn:hover {
  background: #f0fdf4;
}

/* Listen Panel */
.listen-content {
  padding: 20px;
}

.audio-player-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.player-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.player-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.duration, .quality {
  font-size: 14px;
  color: #6b7280;
}

.quality {
  padding: 4px 8px;
  background: #dcfce7;
  color: #166534;
  border-radius: 6px;
  font-weight: 500;
}

.main-player {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.play-button {
  width: 80px;
  height: 80px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  font-size: 32px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}

.play-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(59, 130, 246, 0.4);
}

.play-controls {
  flex: 1;
}

.progress-slider {
  width: 100%;
  margin-bottom: 8px;
}

.time-display {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
}

.speed-section {
  margin-bottom: 16px;
}

.speed-section label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.speed-buttons {
  display: flex;
  gap: 8px;
}

.speed-btn {
  padding: 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.speed-btn.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.speed-btn:hover:not(.active) {
  border-color: #d1d5db;
  background: #f9fafb;
}

.loop-section {
  margin-bottom: 16px;
}

.loop-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}

.visualization-card, .analysis-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.viz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.viz-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.viz-controls {
  display: flex;
  gap: 8px;
}

.viz-type-btn {
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.viz-type-btn.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.viz-display {
  height: 120px;
  background: #f9fafb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
  border: 1px solid #e5e7eb;
}

.analysis-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.analysis-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.analysis-btn {
  padding: 10px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: white;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.analysis-btn:hover {
  border-color: #d1d5db;
  background: #f9fafb;
}

.tab-continue-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 20px;
}

.tab-continue-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

/* Record Panel */
.record-content {
  padding: 20px;
}

.recording-interface {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
  text-align: center;
}

.recording-status {
  margin-bottom: 24px;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #9ca3af;
}

.status-indicator.recording .status-dot {
  background: #ef4444;
  animation: pulse 2s infinite;
}

.status-indicator.processing .status-dot {
  background: #f59e0b;
  animation: spin 1s linear infinite;
}

.status-text {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
}

.recording-timer {
  font-size: 24px;
  font-weight: 700;
  color: #ef4444;
  font-family: 'SF Mono', monospace;
}

.main-record-btn {
  width: 140px;
  height: 140px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
  margin-bottom: 24px;
}

.main-record-btn.recording {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  animation: pulse 2s infinite;
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);
}

.main-record-btn.processing {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 8px 32px rgba(245, 158, 11, 0.3);
}

.main-record-btn:hover {
  transform: translateY(-2px);
}

.record-btn-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.record-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.record-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.live-feedback {
  margin-bottom: 24px;
}

.live-waveform {
  height: 80px;
  background: #f9fafb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
}

.live-bars {
  display: flex;
  align-items: end;
  gap: 3px;
  height: 50px;
}

.live-bar {
  width: 4px;
  background: linear-gradient(to top, #3b82f6, #8b5cf6);
  border-radius: 2px;
  transition: height 0.1s ease;
}

.quick-recording-settings {
  margin-top: 24px;
}

.setting-row {
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
}

.setting-text {
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

.recording-instructions {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.recording-instructions h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.recording-instructions ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.recording-instructions li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  margin-bottom: 8px;
}

.record-navigation {
  display: flex;
  gap: 12px;
}

.nav-secondary, .nav-primary {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-secondary {
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.nav-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.nav-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.nav-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.nav-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Compare Panel */
.compare-content {
  padding: 20px;
}

.comparison-player {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.player-label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 100px;
}

.label-icon {
  font-size: 18px;
}

.label-text {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.mini-play-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: #3b82f6;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.mini-play-btn:hover {
  background: #2563eb;
}

.mini-progress {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  transition: width 0.2s ease;
}

.target-progress {
  background: #3b82f6;
}

.user-progress {
  background: #10b981;
}

.duration-text {
  font-size: 12px;
  color: #6b7280;
  min-width: 40px;
  text-align: right;
}

.sync-controls {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.sync-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.sync-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.quality-assessment {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.quality-assessment h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.quality-metrics {
  margin-bottom: 20px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.metric-icon {
  font-size: 20px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border-radius: 10px;
}

.metric-info {
  flex: 1;
}

.metric-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 4px;
}

.metric-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.metric-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.metric-fill.accuracy {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.metric-fill.rhythm {
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
}

.metric-fill.clarity {
  background: linear-gradient(90deg, #10b981, #047857);
}

.metric-value {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.overall-score {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.score-label {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.score-value {
  font-size: 24px;
  font-weight: 700;
}

.score-value.excellent {
  color: #059669;
}

.score-value.good {
  color: #2563eb;
}

.score-value.fair {
  color: #d97706;
}

.score-value.poor {
  color: #dc2626;
}

.score-grade {
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
  background: white;
  color: #374151;
}

.visual-comparison {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.comparison-tabs {
  display: flex;
  background: #f9fafb;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
}

.comp-tab {
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

.comp-tab.active {
  background: white;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.comparison-display {
  height: 120px;
  background: #f9fafb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
  border: 1px solid #e5e7eb;
}

.compare-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.action-secondary {
  flex: 1;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: white;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.action-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.final-actions {
  display: flex;
  gap: 12px;
}

.final-btn {
  flex: 1;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.save-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.complete-btn {
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
}

.complete-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

/* Empty States */
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 16px;
  margin: 0 0 24px 0;
}

.load-audio-btn, .record-first-btn {
  padding: 14px 24px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.load-audio-btn:hover, .record-first-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

/* Bottom Safe Area */
.bottom-safe-area {
  height: env(safe-area-inset-bottom);
}

/* Responsive */
@media (max-width: 375px) {
  .tab-label {
    font-size: 11px;
  }
  
  .speed-buttons {
    flex-wrap: wrap;
  }
  
  .setting-row {
    flex-direction: column;
    align-items: center;
  }
  
  .record-navigation, .compare-actions, .final-actions {
    flex-direction: column;
  }
}

@media (min-width: 768px) {
  .mobile-practice-c {
    max-width: 480px;
    margin: 0 auto;
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.1);
  }
}
</style>