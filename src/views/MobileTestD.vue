<template>
  <div class="mobile-practice-d">
    <!-- Smart Header that adapts to current mode -->
    <header class="smart-header" :class="{ 'recording-mode': isRecording }">
      <div class="header-content">
        <button class="header-btn" @click="goBack">
          <span v-if="currentMode === 'setup'">←</span>
          <span v-else-if="canGoBack">←</span>
          <span v-else>⋮</span>
        </button>
        
        <div class="header-info">
          <div class="session-title">{{ sessionTitle }}</div>
          <div class="session-subtitle">{{ sessionSubtitle }}</div>
        </div>
        
        <button class="header-btn" @click="toggleSettings">
          <span v-if="currentMode === 'recording'">{{ recordingTime }}</span>
          <span v-else-if="showProgress">{{ currentIndex + 1 }}/{{ totalItems }}</span>
          <span v-else>⚙️</span>
        </button>
      </div>
      
      <!-- Dynamic progress indicator -->
      <div class="progress-container" v-if="showProgress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
      </div>
    </header>

    <!-- Main Content Area with Mode-Based Layout -->
    <main class="main-content" :class="`mode-${currentMode}`">
      
      <!-- Setup Mode: Audio Loading & Configuration -->
      <div v-if="currentMode === 'setup'" class="mode-content">
        <div class="setup-welcome">
          <h1>🎯 Choose Your Target</h1>
          <p>Select the pronunciation you want to practice</p>
        </div>

        <div class="audio-sources">
          <div class="source-option" @click="uploadAudio">
            <div class="source-icon">📁</div>
            <div class="source-text">
              <h3>Upload Audio</h3>
              <p>From your device</p>
            </div>
            <div class="source-arrow">→</div>
          </div>

          <div class="source-option" @click="loadFromUrl">
            <div class="source-icon">🌐</div>
            <div class="source-text">
              <h3>Load from URL</h3>
              <p>Remote audio file</p>
            </div>
            <div class="source-arrow">→</div>
          </div>

          <div class="source-option" @click="useRecordingSet">
            <div class="source-icon">📚</div>
            <div class="source-text">
              <h3>Recording Set</h3>
              <p>Practice series</p>
            </div>
            <div class="source-arrow">→</div>
          </div>
        </div>

        <div v-if="hasRecentFiles" class="recent-section">
          <h3>Recent Files</h3>
          <div class="recent-list">
            <div 
              v-for="file in recentFiles" 
              :key="file.id"
              class="recent-item"
              @click="loadRecentFile(file)"
            >
              <span class="recent-icon">🎵</span>
              <div class="recent-info">
                <span class="recent-name">{{ file.name }}</span>
                <span class="recent-time">{{ file.duration }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Practice Mode: The main practice interface -->
      <div v-else-if="currentMode === 'practice'" class="mode-content">
        
        <!-- Target Audio Section -->
        <section class="audio-section target-section">
          <div class="section-title">
            <span class="section-icon">🎯</span>
            <h2>Target: {{ currentAudioName }}</h2>
            <button class="section-action" @click="toggleTargetExpanded">
              {{ targetExpanded ? '🔽' : '🔼' }}
            </button>
          </div>

          <!-- Always visible: Quick play controls -->
          <div class="quick-controls">
            <button class="quick-play-btn" @click="playTarget" :disabled="!targetAudio">
              {{ isTargetPlaying ? '⏸️' : '▶️' }}
            </button>
            <div class="audio-info">
              <span class="audio-name">{{ currentAudioName }}</span>
              <span class="audio-duration">{{ formatDuration(targetDurationSeconds) }}</span>
            </div>
            <div class="speed-selector">
              <select v-model="playbackSpeed" @change="updateSpeed">
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1.0">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
              </select>
            </div>
          </div>

          <!-- Expandable: Detailed visualization -->
          <div v-show="targetExpanded" class="expanded-content">
            <div class="viz-controls">
              <button 
                class="viz-btn" 
                :class="{ active: targetVizMode === 'waveform' }"
                @click="setTargetViz('waveform')"
              >
                📊 Waveform
              </button>
              <button 
                class="viz-btn" 
                :class="{ active: targetVizMode === 'spectrogram' }"
                @click="setTargetViz('spectrogram')"
              >
                🌈 Spectrogram
              </button>
            </div>
            <div class="visualization-area">
              <div 
                v-show="targetVizMode === 'waveform'" 
                class="waveform-container"
                :class="{ mobile: isMobileDevice }"
                @touchstart="handleTouchStart"
                @touchmove="handleTouchMove"
                @touchend="handleTouchEnd"
              >
                <div ref="targetVizRef" class="waveform"></div>
              </div>
              <div 
                v-show="targetVizMode === 'spectrogram'" 
                class="spectrogram-container"
                :class="{ mobile: isMobileDevice }"
              >
                <div ref="targetSpectrogramRef" class="spectrogram"></div>
              </div>
              <div v-if="!targetReady" class="viz-placeholder">
                {{ targetVizMode === 'waveform' ? '🎵 Loading waveform...' : '🌈 Loading spectrogram...' }}
              </div>
            </div>
          </div>
        </section>

        <!-- Recording Section -->
        <section class="recording-section">
          <div class="recording-interface">
            <div class="recording-status">
              <div class="status-ring" :class="recordingState">
                <button 
                  class="record-button" 
                  @click="toggleRecording"
                  :disabled="isProcessing"
                >
                  <span class="record-icon">{{ recordingIcon }}</span>
                </button>
              </div>
              <div class="status-text">
                <span class="primary-status">{{ recordingStatusPrimary }}</span>
                <span class="secondary-status">{{ recordingStatusSecondary }}</span>
              </div>
            </div>

            <!-- Live visualization during recording -->
            <div v-if="isRecording" class="live-visualization">
              <div class="live-waveform">
                <div class="live-bars">
                  <div 
                    v-for="i in 12" 
                    :key="i" 
                    class="live-bar" 
                    :style="{ height: liveAudioLevels[i-1] + 'px' }"
                  ></div>
                </div>
              </div>
              <p class="recording-hint">Speak clearly into your microphone</p>
            </div>

            <!-- Quick settings -->
            <div class="recording-settings">
              <label class="setting-toggle" :class="{ disabled: !vadReady }">
                <input type="checkbox" v-model="vadEnabled" :disabled="!vadReady" />
                <span class="toggle-text">
                  ✂️ Smart trim
                  <span v-if="!vadReady" class="setting-status">⚠️ Unavailable</span>
                  <span v-else-if="vadEnabled" class="setting-status">✅ Active</span>
                </span>
              </label>
              <label class="setting-toggle">
                <input type="checkbox" v-model="autoPlayEnabled" />
                <span class="toggle-text">🔄 Auto-play</span>
              </label>
            </div>
          </div>
        </section>

        <!-- User Audio Section (appears after recording) -->
        <section v-if="hasUserRecording" class="audio-section user-section">
          <div class="section-title">
            <span class="section-icon">🎙️</span>
            <h2>Your Recording</h2>
            <div class="quality-badge" :class="recordingQuality">
              {{ qualityText }}
            </div>
          </div>

          <div class="quick-controls">
            <button class="quick-play-btn" @click="playUser">
              {{ isUserPlaying ? '⏸️' : '▶️' }}
            </button>
            <div class="audio-info">
              <span class="audio-name">Your voice</span>
              <span class="audio-duration">{{ formatDuration(userDurationSeconds) }}</span>
            </div>
            <div class="recording-actions">
              <button class="action-btn retry" @click="retryRecording">🔄</button>
              <button class="action-btn enhance" @click="enhanceRecording">✨</button>
            </div>
          </div>
          
          <!-- User waveform visualization -->
          <div class="user-visualization">
            <div class="waveform-container">
              <div ref="userVizRef" class="waveform user-waveform"></div>
            </div>
            <div class="spectrogram-container" style="display: none;">
              <div ref="userSpectrogramRef" class="spectrogram user-spectrogram"></div>
            </div>
          </div>

          <!-- Comparison tools -->
          <div class="comparison-tools">
            <button class="comparison-btn" @click="playBoth">
              🔄 Play Both
            </button>
            <button class="comparison-btn" @click="showAnalysis">
              📊 Analyze
            </button>
            <button class="comparison-btn" @click="syncPlayback">
              ⚡ Sync
            </button>
          </div>
        </section>
      </div>

      <!-- Analysis Mode: Detailed comparison and feedback -->
      <div v-else-if="currentMode === 'analysis'" class="mode-content">
        <div class="analysis-header">
          <h1>📊 Analysis Results</h1>
          <p>How does your pronunciation compare?</p>
        </div>

        <!-- Overall Score -->
        <div class="score-card">
          <div class="score-circle" :class="overallGrade">
            <span class="score-number">{{ overallScore }}</span>
            <span class="score-percent">%</span>
          </div>
          <div class="score-details">
            <h3>{{ gradeText }}</h3>
            <p>{{ feedbackText }}</p>
          </div>
        </div>

        <!-- Detailed Metrics -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">🎯</div>
            <div class="metric-info">
              <span class="metric-label">Accuracy</span>
              <span class="metric-value">{{ accuracyScore }}%</span>
              <div class="metric-bar">
                <div class="metric-fill accuracy" :style="{ width: accuracyScore + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">🎼</div>
            <div class="metric-info">
              <span class="metric-label">Rhythm</span>
              <span class="metric-value">{{ rhythmScore }}%</span>
              <div class="metric-bar">
                <div class="metric-fill rhythm" :style="{ width: rhythmScore + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">📢</div>
            <div class="metric-info">
              <span class="metric-label">Clarity</span>
              <span class="metric-value">{{ clarityScore }}%</span>
              <div class="metric-bar">
                <div class="metric-fill clarity" :style="{ width: clarityScore + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Visual Comparison -->
        <div class="visual-comparison">
          <div class="comparison-tabs">
            <button 
              class="comp-tab" 
              :class="{ active: comparisonMode === 'overlay' }"
              @click="setComparisonMode('overlay')"
            >
              📊 Overlay
            </button>
            <button 
              class="comp-tab" 
              :class="{ active: comparisonMode === 'difference' }"
              @click="setComparisonMode('difference')"
            >
              🔍 Difference
            </button>
          </div>
          <div class="comparison-display" ref="comparisonDisplayRef">
            <div class="comparison-placeholder">
              📊 {{ comparisonMode }} comparison
            </div>
          </div>
        </div>

        <!-- Improvement Suggestions -->
        <div class="suggestions-card">
          <h3>💡 Suggestions for Improvement</h3>
          <ul class="suggestions-list">
            <li v-for="suggestion in suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Results Mode: Session summary and next steps -->
      <div v-else-if="currentMode === 'results'" class="mode-content">
        <div class="results-header">
          <h1>🎉 Practice Complete</h1>
          <p>Great work on your pronunciation practice!</p>
        </div>

        <div class="session-summary">
          <div class="summary-stat">
            <span class="stat-number">{{ attemptsCount }}</span>
            <span class="stat-label">Attempts</span>
          </div>
          <div class="summary-stat">
            <span class="stat-number">{{ Math.floor(sessionDuration / 60) }}m</span>
            <span class="stat-label">Practice Time</span>
          </div>
          <div class="summary-stat">
            <span class="stat-number">{{ overallScore }}%</span>
            <span class="stat-label">Best Score</span>
          </div>
        </div>

        <div class="next-actions">
          <button class="action-primary" @click="saveAndNext">
            💾 Save & Continue
          </button>
          <button class="action-secondary" @click="practiceAgain">
            🔄 Practice Again
          </button>
          <button class="action-secondary" @click="shareResults">
            📤 Share Progress
          </button>
        </div>
      </div>
    </main>

    <!-- Smart Footer Navigation -->
    <footer class="smart-footer" v-if="currentMode !== 'setup'">
      <div class="footer-actions">
        <button 
          v-if="currentMode === 'practice' && !hasUserRecording" 
          class="footer-btn secondary"
          @click="goToSetup"
        >
          ← Change Audio
        </button>
        
        <button 
          v-if="currentMode === 'practice' && hasUserRecording" 
          class="footer-btn primary"
          @click="goToAnalysis"
        >
          📊 View Analysis
        </button>
        
        <button 
          v-if="currentMode === 'analysis'" 
          class="footer-btn secondary"
          @click="goToPractice"
        >
          ← Back to Practice
        </button>
        
        <button 
          v-if="currentMode === 'analysis'" 
          class="footer-btn primary"
          @click="goToResults"
        >
          ✅ Complete Session
        </button>
        
        <button 
          v-if="currentMode === 'results'" 
          class="footer-btn primary"
          @click="startNewSession"
        >
          🎯 Start New Practice
        </button>
      </div>
    </footer>

    <!-- Bottom Safe Area -->
    <div class="bottom-safe-area"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useWaveform } from '../composables/useWaveform'
import { useAudioRecorder } from '../composables/useAudioRecorder'
import { useVADProcessor } from '../composables/useVADProcessor'

// Core state
const currentMode = ref('practice') // Start in practice mode since audio is preloaded
const targetAudio = ref(null)
const hasUserRecording = ref(false)
const currentAudioName = ref('patth.wav')
const targetDuration = ref('0:00')
const userDuration = ref('0:00')
const targetAudioUrl = ref('/patth.wav')
const userAudioUrl = ref('')

// UI state
const targetExpanded = ref(false)
const targetVizMode = ref('waveform')
const playbackSpeed = ref('1.0')
const comparisonMode = ref('overlay')

// Recording state using composable
const { isRecording: isRecordingComposable, recordingTime: recordingTimeComposable, startRecording, stopRecording } = useAudioRecorder()
const isRecording = ref(false)
const isProcessing = ref(false)
const recordingTime = ref('00:00')
const recordingQuality = ref('good')
const vadEnabled = ref(true)
const autoPlayEnabled = ref(true)

// VAD Processing
const { isProcessing: vadProcessing, vadReady, initVAD, trimAudioWithVAD } = useVADProcessor()

// Audio refs
const targetVizRef = ref(null)
const targetSpectrogramRef = ref(null)
const userVizRef = ref(null)
const userSpectrogramRef = ref(null)
const comparisonDisplayRef = ref(null)

// Mobile-optimized waveform configuration
const createMobileWaveformConfig = (isMobile = false) => ({
  responsive: true,
  interact: true,
  normalize: true,
  fillParent: true,
  backend: 'WebAudio',
  height: isMobile ? 70 : 60,
  barWidth: isMobile ? 3 : 2,
  barRadius: isMobile ? 4 : 3,
  cursorWidth: isMobile ? 3 : 2,
  progressColor: 'rgba(59, 130, 246, 0.9)',
  waveColor: 'rgba(96, 165, 250, 0.8)',
  // Mobile-specific optimizations
  hideScrollbar: isMobile,
  scrollParent: !isMobile
})

// Detect if we're on mobile
const isMobileDevice = computed(() => {
  return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})

// Playback state using waveform composables
const {
  wavesurfer: targetWavesurfer,
  isReady: targetReady,
  isPlaying: isTargetPlaying,
  duration: targetDurationSeconds,
  initWaveform: initTargetWaveform,
  loadAudio: loadTargetAudio,
  play: playTargetAudio,
  stop: stopTargetAudio,
  setPlaybackRate: setTargetPlaybackRate
} = useWaveform(targetVizRef, targetSpectrogramRef, 'target', 'target')

const {
  wavesurfer: userWavesurfer,
  isReady: userReady,
  isPlaying: isUserPlaying,
  duration: userDurationSeconds,
  initWaveform: initUserWaveform,
  loadAudio: loadUserAudio,
  play: playUserAudio,
  stop: stopUserAudio
} = useWaveform(userVizRef, userSpectrogramRef, 'user', 'user')

// Session state
const currentIndex = ref(2)
const totalItems = ref(25)
const attemptsCount = ref(3)
const sessionDuration = ref(245) // seconds

// Live audio levels for recording visualization
const liveAudioLevels = ref(Array(12).fill(0).map(() => Math.random() * 30 + 10))

// Sample recent files
const recentFiles = ref([
  { id: 1, name: 'こんにちは.mp3', duration: '0:03' },
  { id: 2, name: 'ありがとう.wav', duration: '0:04' }
])

// Analysis scores
const accuracyScore = ref(87)
const rhythmScore = ref(82)
const clarityScore = ref(91)

// Computed properties
const sessionTitle = computed(() => {
  switch (currentMode.value) {
    case 'setup': return 'AccentShadow'
    case 'practice': return 'Japanese Basics'
    case 'analysis': return 'Analysis'
    case 'results': return 'Session Complete'
    default: return 'AccentShadow'
  }
})

const sessionSubtitle = computed(() => {
  switch (currentMode.value) {
    case 'setup': return 'Pronunciation Practice'
    case 'practice': return `Recording ${currentIndex.value} of ${totalItems.value}`
    case 'analysis': return currentAudioName.value
    case 'results': return 'Great work!'
    default: return ''
  }
})

const showProgress = computed(() => {
  return currentMode.value === 'practice'
})

const progressPercentage = computed(() => {
  return (currentIndex.value / totalItems.value) * 100
})

const canGoBack = computed(() => {
  return currentMode.value !== 'setup'
})

const recordingState = computed(() => {
  if (isProcessing.value) return 'processing'
  if (isRecording.value) return 'recording'
  return 'idle'
})

const recordingIcon = computed(() => {
  if (isProcessing.value) return '⏳'
  if (isRecording.value) return '⏹️'
  return '🎤'
})

const recordingStatusPrimary = computed(() => {
  if (vadProcessing.value) return 'Enhancing...'
  if (isProcessing.value) return 'Processing...'
  if (isRecording.value) return 'Recording'
  if (hasUserRecording.value) return 'Complete'
  return 'Ready to record'
})

const recordingStatusSecondary = computed(() => {
  if (isRecording.value) return recordingTime.value
  if (hasUserRecording.value) return 'Tap to analyze'
  return 'Tap the button to start'
})

const hasRecentFiles = computed(() => recentFiles.value.length > 0)

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

const gradeText = computed(() => {
  const grades = {
    excellent: 'Excellent!',
    good: 'Good Job!',
    fair: 'Keep Practicing',
    poor: 'Needs Work'
  }
  return grades[overallGrade.value]
})

const feedbackText = computed(() => {
  const feedback = {
    excellent: 'Your pronunciation is very close to native level.',
    good: 'You\'re doing well! A few minor adjustments will help.',
    fair: 'Good progress! Focus on the specific areas below.',
    poor: 'Keep practicing! Small improvements each time add up.'
  }
  return feedback[overallGrade.value]
})

const qualityText = computed(() => {
  const texts = {
    excellent: '🌟 Excellent',
    good: '✅ Good',
    fair: '⚠️ Fair',
    poor: '❌ Poor'
  }
  return texts[recordingQuality.value] || '✅ Good'
})

const suggestions = computed(() => {
  const allSuggestions = [
    '🎯 Try to match the rhythm of the target audio more closely',
    '📢 Speak a bit more clearly - enunciate each syllable',
    '⏱️ Take your time - don\'t rush through the pronunciation',
    '🔄 Practice the word slowly first, then speed up gradually',
    '👂 Listen to the target audio several times before recording'
  ]
  return allSuggestions.slice(0, 3)
})

// Methods
const goBack = () => {
  if (currentMode.value === 'practice') {
    currentMode.value = 'setup'
  } else if (currentMode.value === 'analysis') {
    currentMode.value = 'practice'
  } else if (currentMode.value === 'results') {
    currentMode.value = 'analysis'
  }
}

const toggleSettings = () => {
  console.log('Toggle settings')
}

// Setup mode methods
const uploadAudio = () => {
  console.log('Upload audio')
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'audio/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      console.log('📁 File selected:', file.name)
      
      // Create blob URL
      targetAudioUrl.value = URL.createObjectURL(file)
      targetAudio.value = true
      currentAudioName.value = file.name
      currentMode.value = 'practice'
      
      // Initialize waveform after mode change
      await nextTick()
      if (targetVizRef.value && targetSpectrogramRef.value) {
        initTargetWaveform()
        await nextTick()
        loadTargetAudio(targetAudioUrl.value)
      }
    }
  }
  input.click()
}

const loadFromUrl = () => {
  console.log('Load from URL')
}

const useRecordingSet = () => {
  console.log('Use recording set')
}

const loadPresetAudio = async () => {
  try {
    targetAudioUrl.value = '/patth.wav'
    targetAudio.value = new Audio('/patth.wav')
    targetAudio.value.addEventListener('loadedmetadata', () => {
      const duration = Math.floor(targetAudio.value.duration)
      const mins = Math.floor(duration / 60)
      const secs = duration % 60
      targetDuration.value = `${mins}:${secs.toString().padStart(2, '0')}`
    })
    currentAudioName.value = 'patth.wav'
    console.log('Target audio preloaded: patth.wav')
    
    // Initialize waveform after audio is ready
    await nextTick()
    if (targetVizRef.value && targetSpectrogramRef.value) {
      initTargetWaveform()
      await nextTick()
      loadTargetAudio(targetAudioUrl.value)
    }
  } catch (error) {
    console.error('Failed to preload target audio:', error)
  }
}

const loadRecentFile = async (file) => {
  // For demo, always load patth.wav
  await loadPresetAudio()
  currentMode.value = 'practice'
}

// Practice mode methods
const toggleTargetExpanded = () => {
  targetExpanded.value = !targetExpanded.value
}

const setTargetViz = (mode) => {
  targetVizMode.value = mode
}

const playTarget = () => {
  if (targetWavesurfer.value && targetReady.value) {
    if (isTargetPlaying.value) {
      stopTargetAudio()
    } else {
      playTargetAudio()
    }
  }
}

const playUser = () => {
  if (userWavesurfer.value && userReady.value) {
    if (isUserPlaying.value) {
      stopUserAudio()
    } else {
      playUserAudio()
    }
  }
}

const updateSpeed = () => {
  console.log('Update speed to:', playbackSpeed.value)
  const rate = parseFloat(playbackSpeed.value)
  if (targetWavesurfer.value && targetReady.value) {
    setTargetPlaybackRate(rate)
  }
}

const toggleRecording = async () => {
  if (isRecording.value) {
    // Stop recording
    isRecording.value = false
    isProcessing.value = true
    
    try {
      const audioBlob = await stopRecording()
      console.log('🎤 Recording completed, blob size:', audioBlob?.size)
      
      if (audioBlob) {
        let processedBlob = audioBlob
        
        // Apply VAD trimming if enabled
        if (vadEnabled.value && vadReady.value) {
          console.log('✂️ Applying VAD trimming to recording...')
          const trimResult = await trimAudioWithVAD(audioBlob, {
            padding: 0.1, // 100ms padding
            maxTrimStart: 2.0, // Max 2s trim from start
            maxTrimEnd: 1.5 // Max 1.5s trim from end
          })
          
          if (trimResult.blob && trimResult.blob !== audioBlob) {
            processedBlob = trimResult.blob
            console.log('✅ VAD trimming applied:', {
              original: audioBlob.size,
              trimmed: processedBlob.size,
              savedBytes: audioBlob.size - processedBlob.size,
              startTrimmed: trimResult.trimmedStart?.toFixed(3) + 's',
              endTrimmed: trimResult.trimmedEnd?.toFixed(3) + 's'
            })
          } else {
            console.log('ℹ️ VAD trimming: No significant trimming needed')
          }
        }
        
        // Create blob URL for user recording
        userAudioUrl.value = URL.createObjectURL(processedBlob)
        
        // Initialize user waveform after recording
        await nextTick()
        if (userVizRef.value && userSpectrogramRef.value) {
          initUserWaveform()
          await nextTick()
          loadUserAudio(userAudioUrl.value)
        }
        
        hasUserRecording.value = true
        recordingQuality.value = ['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)]
        
        // Auto-play if enabled
        if (autoPlayEnabled.value) {
          setTimeout(() => {
            if (userReady.value) {
              playUserAudio()
            }
          }, 500)
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error)
    } finally {
      isProcessing.value = false
    }
  } else {
    // Start recording
    try {
      await startRecording(null) // No waveform container during recording
      isRecording.value = true
      recordingTime.value = '00:00'
      
      // Update live audio levels and timer
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
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }
}

const retryRecording = () => {
  hasUserRecording.value = false
  attemptsCount.value++
}

const enhanceRecording = () => {
  console.log('Enhance recording')
}

const playBoth = async () => {
  console.log('Play both audios')
  
  // Stop any currently playing audio
  if (isTargetPlaying.value) stopTargetAudio()
  if (isUserPlaying.value) stopUserAudio()
  
  // Play target audio first, then user audio with a small delay
  if (targetReady.value && userReady.value) {
    playTargetAudio()
    
    // Wait a bit then play user audio
    setTimeout(() => {
      if (userReady.value) {
        playUserAudio()
      }
    }, 300)
  }
}

const showAnalysis = () => {
  currentMode.value = 'analysis'
}

const syncPlayback = () => {
  console.log('Sync playback')
}

// Analysis mode methods
const setComparisonMode = (mode) => {
  comparisonMode.value = mode
}

// Navigation methods
const goToSetup = () => {
  currentMode.value = 'setup'
}

const goToPractice = () => {
  currentMode.value = 'practice'
}

const goToAnalysis = () => {
  currentMode.value = 'analysis'
}

const goToResults = () => {
  currentMode.value = 'results'
}

const startNewSession = () => {
  // Reset state
  hasUserRecording.value = false
  targetAudio.value = false
  currentIndex.value++
  if (currentIndex.value > totalItems.value) {
    currentIndex.value = 1
  }
  currentMode.value = 'setup'
}

const saveAndNext = () => {
  console.log('Save and next')
  startNewSession()
}

const practiceAgain = () => {
  hasUserRecording.value = false
  currentMode.value = 'practice'
}

const shareResults = () => {
  console.log('Share results')
}

// Touch handling for mobile devices
let touchStartX = 0
let touchStartTime = 0

const handleTouchStart = (e) => {
  if (!isMobileDevice.value) return
  touchStartX = e.touches[0].clientX
  touchStartTime = Date.now()
}

const handleTouchMove = (e) => {
  if (!isMobileDevice.value) return
  e.preventDefault() // Prevent scrolling
}

const handleTouchEnd = (e) => {
  if (!isMobileDevice.value) return
  
  const touchEndX = e.changedTouches[0].clientX
  const touchDuration = Date.now() - touchStartTime
  const touchDistance = Math.abs(touchEndX - touchStartX)
  
  // Detect swipe gestures
  if (touchDuration < 300 && touchDistance > 50) {
    if (touchEndX > touchStartX) {
      // Swipe right - previous action or rewind
      console.log('Swipe right detected')
      if (targetWavesurfer.value && targetReady.value) {
        const currentTime = targetWavesurfer.value.getCurrentTime()
        const newTime = Math.max(0, currentTime - 5) // Rewind 5 seconds
        targetWavesurfer.value.seekTo(newTime / targetDurationSeconds.value)
      }
    } else {
      // Swipe left - next action or fast forward
      console.log('Swipe left detected')
      if (targetWavesurfer.value && targetReady.value) {
        const currentTime = targetWavesurfer.value.getCurrentTime()
        const newTime = Math.min(targetDurationSeconds.value, currentTime + 5) // Forward 5 seconds
        targetWavesurfer.value.seekTo(newTime / targetDurationSeconds.value)
      }
    }
  } else if (touchDuration < 200 && touchDistance < 10) {
    // Tap to play/pause
    playTarget()
  }
}

// Keyboard shortcuts for desktop
const handleKeydown = (e) => {
  if (currentMode.value !== 'practice') return
  
  switch (e.key) {
    case ' ':
      e.preventDefault()
      playTarget()
      break
    case 'r':
      if (!isRecording.value && !isProcessing.value) {
        toggleRecording()
      }
      break
    case 'ArrowLeft':
      if (targetWavesurfer.value && targetReady.value) {
        const currentTime = targetWavesurfer.value.getCurrentTime()
        const newTime = Math.max(0, currentTime - 5)
        targetWavesurfer.value.seekTo(newTime / targetDurationSeconds.value)
      }
      break
    case 'ArrowRight':
      if (targetWavesurfer.value && targetReady.value) {
        const currentTime = targetWavesurfer.value.getCurrentTime()
        const newTime = Math.min(targetDurationSeconds.value, currentTime + 5)
        targetWavesurfer.value.seekTo(newTime / targetDurationSeconds.value)
      }
      break
  }
}

// Helper functions
const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Lifecycle
onMounted(async () => {
  console.log('Mobile Test D mounted - Adaptive Mobile Interface')
  
  // Initialize VAD for smart trimming
  try {
    await initVAD()
    console.log('📱 VAD initialized for mobile interface, ready:', vadReady.value)
  } catch (error) {
    console.warn('📱 VAD initialization failed, smart trimming disabled:', error)
  }
  
  // Preload the audio file
  await loadPresetAudio()
  
  // Add keyboard listeners for desktop
  if (!isMobileDevice.value) {
    document.addEventListener('keydown', handleKeydown)
  }
  
  // Prevent zoom on double tap for better mobile experience
  if (isMobileDevice.value) {
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }, { passive: false })
    
    let lastTouchEnd = 0
    document.addEventListener('touchend', (e) => {
      const now = (new Date()).getTime()
      if (now - lastTouchEnd <= 300) {
        e.preventDefault()
      }
      lastTouchEnd = now
    }, { passive: false })
  }
})

onUnmounted(() => {
  // Clean up event listeners
  if (!isMobileDevice.value) {
    document.removeEventListener('keydown', handleKeydown)
  }
  
  // Clean up blob URLs
  if (targetAudioUrl.value && targetAudioUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(targetAudioUrl.value)
  }
  if (userAudioUrl.value && userAudioUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(userAudioUrl.value)
  }
})
</script>

<style scoped>
.mobile-practice-d {
  min-height: 100vh;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
}

/* Smart Header */
.smart-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.smart-header.recording-mode {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  min-height: 60px;
}

.header-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.recording-mode .header-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.header-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.recording-mode .header-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.header-info {
  flex: 1;
  text-align: center;
  margin: 0 16px;
}

.session-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
  margin-bottom: 2px;
}

.recording-mode .session-title {
  color: white;
}

.session-subtitle {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.recording-mode .session-subtitle {
  color: rgba(255, 255, 255, 0.9);
}

.progress-container {
  height: 3px;
  background: #f3f4f6;
}

.progress-bar {
  height: 100%;
  background: #e5e7eb;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
}

/* Main Content */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 100px; /* Space for footer */
}

.mode-content {
  padding: 20px;
  max-width: 500px;
  margin: 0 auto;
}

/* Setup Mode */
.setup-welcome {
  text-align: center;
  margin-bottom: 32px;
}

.setup-welcome h1 {
  font-size: 28px;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.setup-welcome p {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.audio-sources {
  margin-bottom: 32px;
}

.source-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.source-option:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.source-icon {
  width: 60px;
  height: 60px;
  background: #f3f4f6;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.source-text {
  flex: 1;
}

.source-text h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.source-text p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.source-arrow {
  font-size: 18px;
  color: #9ca3af;
}

.recent-section {
  margin-top: 32px;
}

.recent-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
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

.recent-icon {
  font-size: 20px;
}

.recent-info {
  flex: 1;
}

.recent-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.recent-time {
  font-size: 12px;
  color: #6b7280;
}

/* Practice Mode */
.audio-section {
  background: white;
  border-radius: 16px;
  margin-bottom: 20px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.target-section .section-title {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.user-section .section-title {
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
}

.section-icon {
  font-size: 20px;
  margin-right: 8px;
}

.section-title h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  flex: 1;
}

.section-action {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.quality-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.quality-badge.excellent {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.quality-badge.good {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.quick-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
}

.quick-play-btn {
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

.user-section .quick-play-btn {
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.quick-play-btn:hover {
  transform: translateY(-1px);
}

.audio-info {
  flex: 1;
  min-width: 0;
}

.audio-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-duration {
  font-size: 12px;
  color: #6b7280;
}

.speed-selector select {
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 12px;
  color: #374151;
}

.recording-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.05);
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.expanded-content {
  padding: 0 20px 20px;
}

.viz-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.viz-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.viz-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.visualization-area, .viz-placeholder {
  height: 120px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
}

/* Recording Section */
.recording-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;
  text-align: center;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.recording-interface {
  max-width: 320px;
  margin: 0 auto;
}

.recording-status {
  margin-bottom: 24px;
}

.status-ring {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.status-ring.recording {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  animation: pulse 2s infinite;
  box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);
}

.status-ring.processing {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 8px 32px rgba(245, 158, 11, 0.3);
}

.record-button {
  width: 100px;
  height: 100px;
  border: none;
  border-radius: 50%;
  background: white;
  color: #374151;
  font-size: 40px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.status-ring.recording .record-button {
  color: #ef4444;
}

.status-ring.processing .record-button {
  color: #f59e0b;
}

.status-text {
  margin-bottom: 16px;
}

.primary-status {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.secondary-status {
  display: block;
  font-size: 14px;
  color: #6b7280;
}

.live-visualization {
  margin-bottom: 24px;
}

.live-waveform {
  height: 80px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.live-bars {
  display: flex;
  align-items: end;
  gap: 3px;
  height: 50px;
}

.live-bar {
  width: 4px;
  background: linear-gradient(to top, #ef4444, #f97316);
  border-radius: 2px;
  transition: height 0.1s ease;
  animation: bounce 0.8s infinite alternate;
}

.live-bar:nth-child(even) {
  animation-delay: 0.1s;
}

.live-bar:nth-child(3n) {
  animation-delay: 0.2s;
}

@keyframes bounce {
  from { opacity: 0.4; }
  to { opacity: 1; }
}

.recording-hint {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.recording-settings {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.setting-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-text {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.comparison-tools {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}

.comparison-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.comparison-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

/* Analysis Mode */
.analysis-header {
  text-align: center;
  margin-bottom: 32px;
}

.analysis-header h1 {
  font-size: 28px;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.analysis-header p {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.score-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  border: 4px solid #e5e7eb;
}

.score-circle.excellent {
  border-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
}

.score-circle.good {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
}

.score-circle.fair {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
}

.score-circle.poor {
  border-color: #ef4444;
  background: linear-gradient(135deg, #fef2f2, #fecaca);
}

.score-number {
  font-size: 24px;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
}

.score-percent {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}

.score-details {
  flex: 1;
}

.score-details h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.score-details p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.metrics-grid {
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.metric-icon {
  width: 48px;
  height: 48px;
  background: #f3f4f6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
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

.metric-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.metric-bar {
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
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

.visual-comparison {
  background: white;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.comparison-tabs {
  display: flex;
  background: #f9fafb;
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 16px;
}

.comp-tab {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.comparison-display, .comparison-placeholder {
  height: 120px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
}

.suggestions-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.suggestions-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.suggestions-list {
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.suggestions-list li {
  padding: 8px 0;
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
  border-bottom: 1px solid #f3f4f6;
}

.suggestions-list li:last-child {
  border-bottom: none;
}

/* Results Mode */
.results-header {
  text-align: center;
  margin-bottom: 32px;
}

.results-header h1 {
  font-size: 28px;
  font-weight: 800;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.results-header p {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.session-summary {
  display: flex;
  justify-content: space-around;
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.summary-stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.next-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-primary, .action-secondary {
  padding: 16px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.action-primary {
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
}

.action-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.action-secondary {
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.action-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

/* Smart Footer */
.smart-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e5e7eb;
  padding: 16px 20px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

.footer-actions {
  display: flex;
  gap: 12px;
  max-width: 500px;
  margin: 0 auto;
}

.footer-btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.footer-btn.primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.footer-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.footer-btn.secondary {
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.footer-btn.secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

/* Bottom Safe Area */
.bottom-safe-area {
  height: env(safe-area-inset-bottom);
}

/* Responsive */
@media (max-width: 375px) {
  .header-content {
    padding: 10px 16px;
  }
  
  .mode-content {
    padding: 16px;
  }
  
  .source-option {
    padding: 16px;
  }
  
  .score-card {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
  
  .session-summary {
    flex-direction: column;
    gap: 20px;
  }
  
  .footer-actions {
    flex-direction: column;
  }
}

@media (min-width: 768px) {
  .mobile-practice-d {
    max-width: 480px;
    margin: 0 auto;
    box-shadow: 0 0 24px rgba(0, 0, 0, 0.1);
  }
}

/* Animations */
@keyframes pulse {
  0%, 100% { 
    transform: scale(1); 
    opacity: 1; 
  }
  50% { 
    transform: scale(1.05); 
    opacity: 0.8; 
  }
}

.mode-content {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { 
    opacity: 0; 
    transform: translateY(10px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

/* Waveform and Spectrogram Containers */
.waveform-container, .spectrogram-container {
  width: 100%;
  min-height: 60px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  position: relative;
}

.waveform, .spectrogram {
  width: 100%;
  height: 100%;
  min-height: 60px;
}

.spectrogram-container {
  min-height: 120px;
}

.spectrogram {
  min-height: 120px;
}

/* Mobile-optimized waveform styling */
.waveform-container.mobile {
  min-height: 80px;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

.waveform-container.mobile:active {
  background: #f1f5f9;
}

/* Enhanced touch feedback */
.quick-play-btn:active,
.record-button:active,
.action-btn:active {
  transform: scale(0.95);
  background: rgba(59, 130, 246, 0.8);
}

/* Better mobile button sizing */
@media (max-width: 768px) {
  .quick-play-btn {
    min-width: 48px;
    min-height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }
  
  .record-button {
    min-width: 80px;
    min-height: 80px;
    border-radius: 50%;
    font-size: 24px;
  }
  
  .action-btn {
    min-width: 44px;
    min-height: 44px;
    border-radius: 50%;
    font-size: 16px;
  }
}

.user-waveform {
  border: 2px solid #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.user-spectrogram {
  border: 2px solid #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.viz-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}

.user-visualization {
  margin-top: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

/* Touch-optimized controls for mobile */
@media (max-width: 768px) {
  .waveform-container, .spectrogram-container {
    min-height: 70px;
    border-radius: 12px;
  }
  
  .spectrogram-container {
    min-height: 100px;
  }
  
  .viz-placeholder {
    height: 70px;
    font-size: 13px;
  }
  
  /* Larger touch targets for mobile */
  .quick-play-btn {
    min-width: 44px;
    min-height: 44px;
  }
  
  .viz-btn {
    min-height: 40px;
    padding: 8px 16px;
  }
}

/* Enhanced visualization loading states */
.waveform-container:empty::after,
.spectrogram-container:empty::after {
  content: "Loading...";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #64748b;
  font-size: 12px;
  opacity: 0.7;
}

.waveform-container.loading,
.spectrogram-container.loading {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: loading-shimmer 1.5s infinite;
}

@keyframes loading-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* VAD and Settings Styling */
.setting-toggle.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.setting-status {
  font-size: 10px;
  margin-left: 4px;
  opacity: 0.8;
}

.setting-toggle.disabled .setting-status {
  color: #ef4444;
}

/* Enhanced processing states */
.recording-status.vad-processing {
  background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
}

.recording-status.vad-processing .status-ring {
  border-color: #8b5cf6;
  animation: vad-pulse 2s infinite;
}

@keyframes vad-pulse {
  0%, 100% { 
    transform: scale(1); 
    opacity: 1; 
  }
  50% { 
    transform: scale(1.05); 
    opacity: 0.8; 
  }
}

/* Mobile VAD feedback */
.vad-enhancement-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(139, 92, 246, 0.9);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  backdrop-filter: blur(10px);
  z-index: 100;
}

.vad-enhancement-indicator.show {
  animation: vad-indicator-show 3s ease-in-out;
}

@keyframes vad-indicator-show {
  0% { 
    opacity: 0; 
    transform: translate(-50%, -50%) scale(0.8); 
  }
  20%, 80% { 
    opacity: 1; 
    transform: translate(-50%, -50%) scale(1); 
  }
  100% { 
    opacity: 0; 
    transform: translate(-50%, -50%) scale(0.8); 
  }
}
</style>