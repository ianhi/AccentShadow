<template>
  <div class="mobile-practice-a">
    <!-- Mobile Header -->
    <header class="mobile-header">
      <button class="back-btn" @click="goBack">
        <span class="icon">←</span>
      </button>
      <div class="header-title">
        <h1>Pronunciation Practice</h1>
        <span class="progress">3 / 25</span>
      </div>
      <button class="settings-btn" @click="showSettings">
        <span class="icon">⚙️</span>
      </button>
    </header>

    <!-- Compact Audio Loading -->
    <section class="compact-loading-section">
      <div class="loading-bar">
        <span class="current-file">{{ currentAudioName || 'No audio selected' }}</span>
        <div class="loading-actions">
          <button class="action-btn file-btn" @click="selectFile">📁</button>
          <button class="action-btn url-btn" @click="showUrlInput">🌐</button>
        </div>
      </div>
    </section>

    <!-- Target Audio Section -->
    <section class="audio-section target-section">
      <div class="section-header">
        <h2>Target Audio</h2>
      </div>

      <!-- Target Waveform (no label, compact) -->
      <div class="visualization-wrapper" :style="{ width: syncEnabled ? targetWidthPercent : '100%' }">
        <div class="waveform-container target-wave" ref="targetWaveformRef">
          <div v-if="!targetReady" class="placeholder-wave">🎵 Loading target waveform...</div>
        </div>
      </div>

      <!-- Target Spectrogram (always visible, no label) -->
      <div class="visualization-wrapper" :style="{ width: syncEnabled ? targetWidthPercent : '100%' }">
        <div class="spectrogram-container target-spectrogram" ref="targetSpectrogramRef">
          <div v-if="!targetReady" class="placeholder-spectrogram">🌈 Loading target spectrogram...</div>
        </div>
      </div>
    </section>


    <!-- User Audio Section -->
    <section class="audio-section user-section">

      <!-- User Waveform (no label, compact) -->
      <div class="visualization-wrapper" :style="{ width: syncEnabled ? userWidthPercent : '100%' }">
        <div class="waveform-container user-wave" ref="userWaveformRef">
          <div v-if="!userReady" class="placeholder-wave">🎵 Loading user waveform...</div>
        </div>
      </div>

      <!-- User Spectrogram (always visible, no label) -->
      <div class="visualization-wrapper" :style="{ width: syncEnabled ? userWidthPercent : '100%' }">
        <div class="spectrogram-container user-spectrogram" ref="userSpectrogramRef">
          <div v-if="!userReady" class="placeholder-spectrogram">🌈 Loading user spectrogram...</div>
        </div>
      </div>
      
      <!-- Alignment Status Indicator -->
      <div v-if="vadTrimInfo?.aligned" class="alignment-indicator">
        <span class="alignment-icon">🎯↔️🎤</span>
        <span class="alignment-text">Audio aligned (+{{ vadTrimInfo.paddingAdded?.toFixed(2) }}s silence)</span>
      </div>
      
      <!-- Unified Control Bar -->
      <div class="unified-control-bar">
        <!-- Main Playback Controls -->
        <button class="control-btn play-target" @click="playTarget" :disabled="!targetReady">
          <span class="btn-icon">▶️</span>
          <span class="btn-label">Target</span>
        </button>
        
        <button class="control-btn play-user" @click="playUser" :disabled="!userReady">
          <span class="btn-icon">▶️</span>
          <span class="btn-label">User</span>
        </button>
        
        <button class="control-btn play-both" @click="playBoth" :disabled="!targetReady || !userReady">
          <span class="btn-icon">▶️</span>
          <span class="btn-label">Both</span>
        </button>
        
        <!-- Speed Controls -->
        <button class="control-btn speed-cycle" @click="cycleSpeed">
          <span class="btn-icon">⚡</span>
          <span class="btn-label">{{ currentSpeed }}x</span>
        </button>
        
        <!-- VAD Toggle -->
        <button class="control-btn vad-toggle" @click="vadEnabled = !vadEnabled" :class="{ 'vad-enabled': vadEnabled, 'vad-processing': isVadProcessing }" :disabled="isVadProcessing">
          <span class="btn-icon">{{ isVadProcessing ? '⏳' : '✂️' }}</span>
          <span class="btn-label">{{ isVadProcessing ? 'VAD...' : 'VAD' }}</span>
        </button>
        
        <!-- Manual Alignment -->
        <button v-if="hasUserRecording && targetReady" class="control-btn align-btn" @click="manuallyAlignAudio" :disabled="isVadProcessing || !vadEnabled">
          <span class="btn-icon">🎯</span>
          <span class="btn-label">Align</span>
        </button>
        
        <!-- Record Again -->
        <button class="control-btn record-again" @click="resetUserRecording" :disabled="isProcessing">
          <span class="btn-icon">🎤</span>
          <span class="btn-label">{{ isProcessing ? 'Processing...' : 'Record Again' }}</span>
        </button>
      </div>
    </section>

    <!-- Recording Status (when recording) -->
    <section v-if="isRecording" class="recording-status-section">
      <div class="recording-indicator">
        <span class="status-text">{{ recordingStatus }}</span>
        <span class="recording-timer">{{ recordingTime }}</span>
      </div>
    </section>

    <!-- Comparison Controls -->
    <section v-if="hasUserRecording" class="comparison-section">
      <div class="comparison-header">
        <h2>Compare & Analyze</h2>
      </div>
      <div class="comparison-controls">
        <button class="comparison-btn" @click="playBoth">
          🔄 Play Both
        </button>
        <button class="comparison-btn" @click="toggleOverlay">
          📊 {{ overlayMode ? 'Split View' : 'Overlay' }}
        </button>
        <button class="comparison-btn" @click="syncPlayback">
          ⚡ Sync Play
        </button>
      </div>
    </section>

    <!-- Action Panel -->
    <section class="action-panel">
      <div class="action-buttons">
        <button class="action-primary save-btn" @click="saveRecording" :disabled="!hasUserRecording">
          💾 Save Recording
        </button>
        <button class="action-primary complete-btn" @click="markComplete" :disabled="!hasUserRecording">
          ✅ Mark Complete
        </button>
      </div>
      <div class="navigation-buttons">
        <button class="nav-btn prev-btn" @click="previousRecording">
          ← Previous
        </button>
        <button class="nav-btn next-btn" @click="nextRecording">
          Next →
        </button>
      </div>
    </section>

    <!-- Bottom Safe Area -->
    <div class="bottom-safe-area"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useWaveform } from '../composables/useWaveform'
import { useTimeSync } from '../composables/useTimeSync'
import { useVADProcessor } from '../composables/useVADProcessor'
import { useAudioProcessing } from '../composables/useAudioProcessing'

// Reactive state
const currentAudioName = ref('patth.wav')
const targetAudio = ref(null)
const targetAudioUrl = ref(null)
const hasUserRecording = ref(false)
const isRecording = ref(false)
const isProcessing = ref(false)
const recordingTime = ref('00:00')
const userDuration = ref('0:02')
const vadEnabled = ref(true)
const autoPlayEnabled = ref(true)
const overlayMode = ref(false)
const isVadProcessing = ref(false)     // Track VAD processing state
const originalUserRecording = ref(null) // Store original recording before VAD trimming
const trimmedUserRecording = ref(null)  // Store VAD-trimmed recording
const vadTrimInfo = ref(null)           // Store VAD trimming information
const originalTargetAudio = ref(null)   // Store original target audio before VAD trimming
const trimmedTargetAudio = ref(null)    // Store VAD-trimmed target audio
const targetVadTrimInfo = ref(null)     // Store target VAD trimming information
const speedOptions = [0.5, 0.75, 1.0]
const currentSpeedIndex = ref(2) // Start with 1x (index 2)
const currentSpeed = computed(() => speedOptions[currentSpeedIndex.value])

// Waveform refs
const targetWaveformRef = ref(null)
const targetSpectrogramRef = ref(null)
const userWaveformRef = ref(null)
const userSpectrogramRef = ref(null)

// Time synchronization for proportional scaling
const { 
  syncEnabled, 
  targetWidthPercent, 
  userWidthPercent, 
  setTargetDuration, 
  setUserDuration 
} = useTimeSync()

// Voice Activity Detection for audio trimming
const { 
  trimAudioWithVAD, 
  detectSpeechBoundariesVAD, 
  vadReady, 
  initVAD 
} = useVADProcessor()

const { 
  autoAlignRecordings 
} = useAudioProcessing()

// Function to add silence padding to audio blob
const addSilencePadding = async (audioBlob, paddingSeconds, atStart = true) => {
  console.log(`🔇 Adding ${paddingSeconds.toFixed(3)}s of silence ${atStart ? 'at start' : 'at end'}`)
  
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    
    // Decode the original audio
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    
    // Calculate new buffer length
    const sampleRate = audioBuffer.sampleRate
    const paddingSamples = Math.floor(paddingSeconds * sampleRate)
    const newLength = audioBuffer.length + paddingSamples
    
    // Create new buffer with padding
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      newLength,
      sampleRate
    )
    
    // Copy original audio data with padding
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel)
      const newData = newBuffer.getChannelData(channel)
      
      if (atStart) {
        // Add silence at start, then original audio
        newData.set(originalData, paddingSamples)
      } else {
        // Add original audio, then silence at end
        newData.set(originalData, 0)
      }
    }
    
    // Convert back to blob
    const length = newBuffer.length
    const numberOfChannels = newBuffer.numberOfChannels
    const arrayBuffer2 = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(arrayBuffer2)
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * 2, true)
    
    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, newBuffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample * 0x7FFF, true)
        offset += 2
      }
    }
    
    const paddedBlob = new Blob([arrayBuffer2], { type: 'audio/wav' })
    console.log(`🔇 Successfully added ${paddingSeconds.toFixed(3)}s padding`)
    
    await audioContext.close()
    return paddedBlob
    
  } catch (error) {
    console.error('🔇 Error adding silence padding:', error)
    return audioBlob // Return original if padding fails
  }
}

// Function to align audio based on VAD trimming information
const alignAudioWithVADInfo = async (userBlob, userVadInfo, targetVadInfo) => {
  console.log('🎯↔️🎤 Aligning user audio with target audio based on VAD info')
  
  if (!userVadInfo || !targetVadInfo) {
    console.log('🎯↔️🎤 No VAD info available for alignment, using original audio')
    return userBlob
  }
  
  const targetTrimmedStart = targetVadInfo.trimmedStart || 0
  const userTrimmedStart = userVadInfo.trimmedStart || 0
  const targetNewDuration = targetVadInfo.newDuration || 0
  const userNewDuration = userVadInfo.newDuration || 0
  
  console.log('🎯↔️🎤 VAD analysis for alignment:', {
    target: {
      originalDuration: targetVadInfo.originalDuration?.toFixed(3) + 's',
      trimmedStart: targetTrimmedStart.toFixed(3) + 's',
      newDuration: targetNewDuration.toFixed(3) + 's'
    },
    user: {
      originalDuration: userVadInfo.originalDuration?.toFixed(3) + 's',
      trimmedStart: userTrimmedStart.toFixed(3) + 's',
      newDuration: userNewDuration.toFixed(3) + 's'
    }
  })
  
  // Calculate the speech onset offset - how much silence was before speech started
  const targetSpeechOnset = targetTrimmedStart
  const userSpeechOnset = userTrimmedStart
  
  // Always align user audio to match target speech onset timing
  let paddingNeeded = 0
  let alignmentType = 'none'
  
  if (targetSpeechOnset > userSpeechOnset) {
    // Target had more initial silence - pad user to match
    paddingNeeded = targetSpeechOnset - userSpeechOnset
    alignmentType = 'pad_user_start'
    console.log(`🎯↔️🎤 Target speech starts ${paddingNeeded.toFixed(3)}s later - padding user audio`)
  } else if (userSpeechOnset > targetSpeechOnset) {
    // User had more initial silence - but we still want to align speech onsets
    // So we'll pad the user to align with target's total timing structure
    const targetTotalWithOriginalSilence = targetVadInfo.originalDuration
    const targetSpeechDuration = targetNewDuration
    const targetOriginalSilenceStart = targetTotalWithOriginalSilence - targetSpeechDuration - (targetVadInfo.trimmedEnd || 0)
    
    // Align user to target's original silence structure
    paddingNeeded = Math.max(0, targetOriginalSilenceStart - userSpeechOnset)
    alignmentType = 'align_to_target_structure'
    console.log(`🎯↔️🎤 Aligning to target's original timing structure - padding ${paddingNeeded.toFixed(3)}s`)
  }
  
  if (paddingNeeded > 0.05) { // Only pad if meaningful difference (>50ms)
    console.log(`🎯↔️🎤 Applying ${alignmentType}: adding ${paddingNeeded.toFixed(3)}s padding`)
    
    const alignedUserBlob = await addSilencePadding(userBlob, paddingNeeded, true)
    
    // Update user VAD info to reflect the padding
    const newUserVadInfo = {
      ...userVadInfo,
      newDuration: userVadInfo.newDuration + paddingNeeded,
      trimmedStart: paddingNeeded > 0 ? targetSpeechOnset : userVadInfo.trimmedStart,
      aligned: true,
      paddingAdded: paddingNeeded,
      alignmentType: alignmentType
    }
    
    console.log('🎯↔️🎤 User audio aligned successfully:', {
      originalDuration: userVadInfo.newDuration.toFixed(3) + 's',
      alignedDuration: newUserVadInfo.newDuration.toFixed(3) + 's',
      paddingAdded: paddingNeeded.toFixed(3) + 's',
      alignmentType: alignmentType
    })
    
    // Update the stored VAD info
    vadTrimInfo.value = newUserVadInfo
    
    return alignedUserBlob
  } else {
    console.log('🎯↔️🎤 Speech onsets are already well aligned, no padding needed')
    return userBlob
  }
}

// Target waveform composable
const {
  wavesurfer: wavesurferTarget,
  isReady: targetReady,
  isPlaying: isTargetPlaying,
  duration: targetDurationSeconds,
  initWaveform: initTargetWaveform,
  loadAudio: loadTargetAudio,
  play: playTargetAudio,
  stop: stopTargetAudio,
  setPlaybackRate: setTargetPlaybackRate
} = useWaveform(targetWaveformRef, targetSpectrogramRef, 'target', 'target')

// User waveform composable
const {
  wavesurfer: wavesurferUser,
  isReady: userReady,
  isPlaying: isUserPlaying,
  duration: userDurationSeconds,
  initWaveform: initUserWaveform,
  loadAudio: loadUserAudio,
  play: playUserAudio,
  stop: stopUserAudio,
  setPlaybackRate: setUserPlaybackRate
} = useWaveform(userWaveformRef, userSpectrogramRef, 'user', 'user')

// Computed duration display
const targetDuration = computed(() => {
  if (targetDurationSeconds.value) {
    const mins = Math.floor(targetDurationSeconds.value / 60)
    const secs = Math.floor(targetDurationSeconds.value % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return '0:00'
})

// Watch for duration changes and update time sync for proportional scaling
watch(targetDurationSeconds, (newDuration) => {
  if (newDuration > 0) {
    console.log('📏 Target duration from waveform:', newDuration + 's')
    setTargetDuration(newDuration)
  }
})

watch(userDurationSeconds, (newDuration) => {
  if (newDuration > 0) {
    console.log('📏 User duration from waveform:', newDuration + 's')
    setUserDuration(newDuration)
  }
})

// Watch time sync values to debug spectrogram scaling
watch([targetWidthPercent, userWidthPercent], ([newTargetWidth, newUserWidth], [oldTargetWidth, oldUserWidth]) => {
  const alignmentInfo = vadTrimInfo.value?.aligned 
    ? `✅ Aligned (${vadTrimInfo.value.paddingAdded?.toFixed(3)}s padding added)`
    : vadTrimInfo.value 
      ? '❌ Not aligned' 
      : 'No VAD info'
  
  console.log('📐 Spectrogram scaling updated:', {
    targetWidth: { from: oldTargetWidth, to: newTargetWidth },
    userWidth: { from: oldUserWidth, to: newUserWidth },
    vadEnabled: vadEnabled.value,
    targetVadInfo: targetVadTrimInfo.value ? `${targetVadTrimInfo.value.originalDuration?.toFixed(2)}s → ${targetVadTrimInfo.value.newDuration?.toFixed(2)}s (trimmed ${targetVadTrimInfo.value.trimmedStart?.toFixed(2)}s from start)` : 'none',
    userVadInfo: vadTrimInfo.value ? `${vadTrimInfo.value.originalDuration?.toFixed(2)}s → ${vadTrimInfo.value.newDuration?.toFixed(2)}s (trimmed ${vadTrimInfo.value.trimmedStart?.toFixed(2)}s from start)` : 'none',
    alignment: alignmentInfo
  })
})

// Watch VAD enabled state and reprocess audio when toggled
watch(vadEnabled, async (newVadEnabled, oldVadEnabled) => {
  console.log('🔄 VAD toggle changed:', { from: oldVadEnabled, to: newVadEnabled })
  
  if (newVadEnabled !== oldVadEnabled) {
    console.log('🔄 Reprocessing audio with new VAD setting...')
    isVadProcessing.value = true
    
    try {
      // Reprocess target audio if available
      if (originalTargetAudio.value || trimmedTargetAudio.value) {
        console.log('🎯 Reprocessing target audio...')
        await loadTargetAudioWithVAD('/patth.wav')
      }
      
      // Reprocess user audio if available
      if (originalUserRecording.value) {
        console.log('🎤 Reprocessing user recording...')
        const processedBlob = await processUserRecordingWithVAD(originalUserRecording.value)
        const processedUrl = URL.createObjectURL(processedBlob)
        loadUserAudio(processedUrl)
      }
      
      console.log('🔄 Audio reprocessing completed')
    } finally {
      isVadProcessing.value = false
    }
  }
})

// UI state
const collapsedSections = ref({
  loading: false
})

const expandedSpectrograms = ref({
  target: false,
  user: false
})

// Computed
const recordingStatus = computed(() => {
  if (isProcessing.value) return 'Processing...'
  if (isRecording.value) return 'Recording...'
  if (hasUserRecording.value) return 'Recording complete'
  return 'Ready to record'
})

// Methods
const goBack = () => {
  console.log('Go back')
}

const showSettings = () => {
  console.log('Show settings')
}

const toggleSection = (section) => {
  collapsedSections.value[section] = !collapsedSections.value[section]
}

const selectFile = () => {
  console.log('Select file')
}

const showUrlInput = () => {
  console.log('Show URL input')
}

// Function to load target audio with VAD processing
const loadTargetAudioWithVAD = async (audioUrl) => {
  console.log('🎯 Loading target audio with VAD processing:', audioUrl)
  
  isVadProcessing.value = true
  
  try {
    // Fetch the audio file
    const response = await fetch(audioUrl)
    const audioBlob = await response.blob()
    
    console.log('🎯 Target audio fetched, applying VAD processing...')
    
    // Process with VAD trimming
    const processedBlob = await processTargetAudioWithVAD(audioBlob)
    
    // Create blob URL for the processed audio
    const processedUrl = URL.createObjectURL(processedBlob)
    
    // Load the processed audio into the target waveform
    loadTargetAudio(processedUrl)
    
    console.log('🎯 Target audio loaded with VAD processing')
    
    // Show VAD trim info if available
    if (targetVadTrimInfo.value) {
      console.log('🎯 Target VAD Trim Results:', targetVadTrimInfo.value)
    }
    
  } catch (error) {
    console.error('🎯 Error loading target audio with VAD:', error)
    console.log('🎯 Falling back to direct audio loading')
    // Fallback to direct loading
    loadTargetAudio(audioUrl)
  } finally {
    isVadProcessing.value = false
  }
}

const initializeTargetWaveform = async () => {
  await nextTick()

  if (targetWaveformRef.value && targetSpectrogramRef.value) {
    console.log('Initializing target waveform...')
    initTargetWaveform()

    // Wait for initialization then load and process audio with VAD
    setTimeout(async () => {
      await loadTargetAudioWithVAD('/patth.wav')
    }, 100)
  } else {
    console.warn('Target waveform containers not ready, retrying...')
    // Retry after a delay for better HMR stability
    setTimeout(async () => {
      await nextTick()
      if (targetWaveformRef.value && targetSpectrogramRef.value) {
        console.log('Retry successful - initializing target waveform...')
        initTargetWaveform()
        setTimeout(async () => {
          await loadTargetAudioWithVAD('/patth.wav')
        }, 100)
      } else {
        console.error('Refs still not available after retry')
      }
    }, 100)
  }
}

const initializeUserWaveform = async () => {
  await nextTick()

  if (userWaveformRef.value && userSpectrogramRef.value) {
    console.log('Initializing user waveform...')
    initUserWaveform()

    // Wait for initialization then load audio
    setTimeout(() => {
      loadUserAudio('/path.mp3')
      // Set hasUserRecording to true since we're loading a fake user audio
      hasUserRecording.value = true
    }, 100)
  } else {
    console.warn('User waveform containers not ready, retrying...')
    // Retry after a delay for better HMR stability
    setTimeout(async () => {
      await nextTick()
      if (userWaveformRef.value && userSpectrogramRef.value) {
        console.log('Retry successful - initializing user waveform...')
        initUserWaveform()
        setTimeout(() => {
          loadUserAudio('/path.mp3')
          // Set hasUserRecording to true since we're loading a fake user audio
          hasUserRecording.value = true
        }, 100)
      } else {
        console.error('User refs still not available after retry')
      }
    }, 100)
  }
}

const playTarget = () => {
  if (targetReady.value) {
    if (isTargetPlaying.value) {
      stopTargetAudio()
    } else {
      playTargetAudio()
    }
  }
}

const playUser = () => {
  if (userReady.value) {
    if (isUserPlaying.value) {
      stopUserAudio()
    } else {
      playUserAudio()
    }
  } else {
    console.log('User audio not ready yet')
  }
}

// Function to process target audio with VAD trimming
const processTargetAudioWithVAD = async (audioBlob) => {
  console.log('🎯 Processing target audio with VAD trimming...')
  
  if (!vadEnabled.value) {
    console.log('🎯 VAD disabled, using original target audio')
    trimmedTargetAudio.value = audioBlob
    return audioBlob
  }
  
  try {
    // Store original target audio
    originalTargetAudio.value = audioBlob
    
    // Apply VAD trimming with exact same settings as desktop
    const vadOptions = {
      padding: 0.2,                    // 200ms padding around speech (desktop default)
      threshold: 0.25,                 // VAD sensitivity (desktop default)
      minSpeechDuration: 50,           // 50ms minimum speech segment
      maxSilenceDuration: 500,         // 500ms maximum gap between speech segments  
      maxTrimStart: 3.0,               // Max 3 seconds of silence to trim from start
      maxTrimEnd: 2.0,                 // Max 2 seconds of silence to trim from end
    }
    
    console.log('🎯 Applying VAD trimming to target audio with options:', vadOptions)
    const trimResult = await trimAudioWithVAD(audioBlob, vadOptions)
    
    if (trimResult && trimResult.blob) {
      console.log('🎯 Target audio VAD trimming successful:', {
        originalDuration: trimResult.originalDuration?.toFixed(2) + 's',
        newDuration: trimResult.newDuration?.toFixed(2) + 's',
        trimmedStart: trimResult.trimmedStart?.toFixed(2) + 's',
        trimmedEnd: trimResult.trimmedEnd?.toFixed(2) + 's'
      })
      
      // Store trimmed target audio and info
      trimmedTargetAudio.value = trimResult.blob
      targetVadTrimInfo.value = {
        originalDuration: trimResult.originalDuration,
        newDuration: trimResult.newDuration,
        trimmedStart: trimResult.trimmedStart,
        trimmedEnd: trimResult.trimmedEnd,
        boundaries: trimResult.boundaries
      }
      
      // Explicitly update time sync with trimmed duration for accurate scaling
      if (trimResult.newDuration > 0) {
        console.log('🎯 Updating time sync with VAD-trimmed target duration:', trimResult.newDuration)
        setTargetDuration(trimResult.newDuration)
      }
      
      return trimResult.blob
    } else {
      console.warn('🎯 Target audio VAD trimming failed, using original audio')
      trimmedTargetAudio.value = audioBlob
      return audioBlob
    }
  } catch (error) {
    console.error('🎯 Error during target audio VAD processing:', error)
    console.log('🎯 Falling back to original target audio')
    trimmedTargetAudio.value = audioBlob
    return audioBlob
  }
}

// Function to process user recording with VAD trimming
const processUserRecordingWithVAD = async (audioBlob) => {
  console.log('🎤 Processing user recording with VAD trimming...')
  
  if (!vadEnabled.value) {
    console.log('🎤 VAD disabled, using original recording')
    trimmedUserRecording.value = audioBlob
    return audioBlob
  }
  
  try {
    // Store original recording
    originalUserRecording.value = audioBlob
    
    // Apply VAD trimming with exact same settings as desktop
    const vadOptions = {
      padding: 0.2,                    // 200ms padding around speech (desktop default)
      threshold: 0.25,                 // VAD sensitivity (desktop default)
      minSpeechDuration: 50,           // 50ms minimum speech segment
      maxSilenceDuration: 500,         // 500ms maximum gap between speech segments  
      maxTrimStart: 3.0,               // Max 3 seconds of silence to trim from start
      maxTrimEnd: 2.0,                 // Max 2 seconds of silence to trim from end
    }
    
    console.log('🎤 Applying VAD trimming with options:', vadOptions)
    const trimResult = await trimAudioWithVAD(audioBlob, vadOptions)
    
    if (trimResult && trimResult.blob) {
      console.log('🎤 VAD trimming successful:', {
        originalDuration: trimResult.originalDuration?.toFixed(2) + 's',
        newDuration: trimResult.newDuration?.toFixed(2) + 's',
        trimmedStart: trimResult.trimmedStart?.toFixed(2) + 's',
        trimmedEnd: trimResult.trimmedEnd?.toFixed(2) + 's'
      })
      
      // Store trimmed recording and info
      trimmedUserRecording.value = trimResult.blob
      vadTrimInfo.value = {
        originalDuration: trimResult.originalDuration,
        newDuration: trimResult.newDuration,
        trimmedStart: trimResult.trimmedStart,
        trimmedEnd: trimResult.trimmedEnd,
        boundaries: trimResult.boundaries
      }
      
      // Apply intelligent alignment with target audio
      let finalBlob = trimResult.blob
      if (targetVadTrimInfo.value) {
        console.log('🎤 Applying intelligent alignment with target audio...')
        finalBlob = await alignAudioWithVADInfo(trimResult.blob, vadTrimInfo.value, targetVadTrimInfo.value)
      } else {
        console.log('🎤 No target VAD info available, skipping alignment')
      }
      
      // Update time sync with final duration (may include alignment padding)
      const finalDuration = vadTrimInfo.value.newDuration
      if (finalDuration > 0) {
        console.log('🎤 Updating time sync with final aligned user duration:', finalDuration)
        setUserDuration(finalDuration)
      }
      
      return finalBlob
    } else {
      console.warn('🎤 VAD trimming failed, using original recording')
      trimmedUserRecording.value = audioBlob
      return audioBlob
    }
  } catch (error) {
    console.error('🎤 Error during VAD processing:', error)
    console.log('🎤 Falling back to original recording')
    trimmedUserRecording.value = audioBlob
    return audioBlob
  }
}

const toggleRecording = async () => {
  if (isRecording.value) {
    // Stop recording
    isRecording.value = false
    isProcessing.value = true

    console.log('🎤 Recording stopped, starting VAD processing...')
    
    try {
      // For demo purposes, we'll simulate processing with the existing path.mp3 file
      // In a real implementation, this would be the actual recorded audio blob
      
      // Simulate VAD processing delay
      setTimeout(async () => {
        try {
          // Load the demo user audio file to simulate VAD processing
          const response = await fetch('/path.mp3')
          const audioBlob = await response.blob()
          
          console.log('🎤 Simulating VAD trimming on demo audio...')
          
          // Process with VAD trimming (this will work with the real VAD system)
          const processedBlob = await processUserRecordingWithVAD(audioBlob)
          
          // Create blob URL for the processed audio
          const processedUrl = URL.createObjectURL(processedBlob)
          
          // Load the processed audio into the user waveform
          if (processedUrl) {
            console.log('🎤 Loading VAD-processed audio into user waveform')
            loadUserAudio(processedUrl)
          }
          
          isProcessing.value = false
          hasUserRecording.value = true
          
          console.log('🎤 Recording processing completed with VAD trimming')
          
          // Show VAD trim info if available
          if (vadTrimInfo.value) {
            console.log('🎤 VAD Trim Results:', vadTrimInfo.value)
          }
          
        } catch (error) {
          console.error('🎤 Error during recording processing:', error)
          isProcessing.value = false
          hasUserRecording.value = true
        }
      }, 1500) // Simulate processing time
      
    } catch (error) {
      console.error('🎤 Error stopping recording:', error)
      isProcessing.value = false
    }
  } else {
    // Start recording
    isRecording.value = true
    recordingTime.value = '00:00'

    console.log('🎤 Starting recording...')

    // Simulate recording timer
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

const cycleSpeed = () => {
  // Cycle to next speed option
  currentSpeedIndex.value = (currentSpeedIndex.value + 1) % speedOptions.length
  const newSpeed = currentSpeed.value
  
  console.log('Cycle speed to:', newSpeed)
  
  // Apply speed to both target and user audio
  if (targetReady.value) {
    setTargetPlaybackRate(newSpeed)
    console.log('Applied speed', newSpeed, 'to target audio')
  }
  
  if (userReady.value) {
    setUserPlaybackRate(newSpeed)
    console.log('Applied speed', newSpeed, 'to user audio')
  }
}

const adjustSpeed = (speedValue) => {
  let rate = 1.0
  if (speedValue === -0.25) rate = 0.5
  else if (speedValue === 0) rate = 1.0
  else if (speedValue === 0.25) rate = 1.5

  console.log('Adjust speed to:', rate)
  if (targetReady.value) {
    setTargetPlaybackRate(rate)
  }
}

const toggleSpectrogram = (type) => {
  expandedSpectrograms.value[type] = !expandedSpectrograms.value[type]
}

const retryRecording = () => {
  hasUserRecording.value = false
  console.log('Retry recording')
}

const enhanceRecording = () => {
  console.log('Enhance recording')
}

const playBoth = async () => {
  console.log('Play both audios sequentially (target first, then user)')
  
  // Stop any currently playing audio first
  if (isTargetPlaying.value) {
    stopTargetAudio()
  }
  if (isUserPlaying.value) {
    stopUserAudio()
  }
  
  if (targetReady.value && userReady.value) {
    console.log('Both audios ready - starting sequential playback')
    
    try {
      // Play target audio first
      console.log('Playing target audio...')
      playTargetAudio()
      
      // Wait for target audio to finish
      await new Promise((resolve) => {
        const checkFinished = () => {
          if (!isTargetPlaying.value) {
            console.log('Target audio finished, now playing user audio...')
            resolve()
          } else {
            setTimeout(checkFinished, 100)
          }
        }
        
        // Start checking after a brief delay
        setTimeout(checkFinished, 200)
      })
      
      // Now play user audio
      playUserAudio()
      console.log('Sequential playback initiated successfully')
      
    } catch (error) {
      console.error('Error during sequential playback:', error)
    }
  } else if (targetReady.value) {
    console.log('Only target audio is ready, playing target only')
    playTargetAudio()
  } else if (userReady.value) {
    console.log('Only user audio is ready, playing user only')
    playUserAudio()
  } else {
    console.log('No audio is ready to play')
  }
}

const toggleOverlay = () => {
  overlayMode.value = !overlayMode.value
}

const syncPlayback = () => {
  console.log('Sync playback')
}

const saveRecording = () => {
  console.log('Save recording')
}

const markComplete = () => {
  console.log('Mark complete')
}

const previousRecording = () => {
  console.log('Previous recording')
}

const nextRecording = () => {
  console.log('Next recording')
}

// Reset user recording and reload demo audio
const resetUserRecording = async () => {
  console.log('🔄 Reset user recording triggered')
  
  isProcessing.value = true
  hasUserRecording.value = false
  
  try {
    // Clear existing user audio
    vadTrimInfo.value = null
    originalUserRecording.value = null
    trimmedUserRecording.value = null
    
    // Reset user duration in time sync
    setUserDuration(0)
    
    // Small delay for UI update
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Reload the demo user audio file
    const response = await fetch('/path.mp3')
    const audioBlob = await response.blob()
    
    console.log('🔄 Processing demo audio with VAD...')
    
    // Store original for reprocessing
    originalUserRecording.value = audioBlob
    
    // Process with VAD trimming and alignment
    const processedBlob = await processUserRecordingWithVAD(audioBlob)
    
    // Create blob URL for the processed audio
    const processedUrl = URL.createObjectURL(processedBlob)
    
    // Load the processed audio into the user waveform
    loadUserAudio(processedUrl)
    
    isProcessing.value = false
    hasUserRecording.value = true
    
    console.log('🔄 User recording reset completed')
    
  } catch (error) {
    console.error('🔄 Error resetting user recording:', error)
    isProcessing.value = false
    hasUserRecording.value = false
  }
}

// Manual alignment function
const manuallyAlignAudio = async () => {
  console.log('🎯 Manual alignment triggered')
  
  if (!originalUserRecording.value) {
    console.warn('🎯 Cannot align: no user recording available')
    return
  }
  
  if (!targetVadTrimInfo.value) {
    console.warn('🎯 Cannot align: target audio VAD info not available')
    return
  }
  
  isVadProcessing.value = true
  
  try {
    console.log('🎯 Forcing re-alignment of user audio...')
    
    // Clear existing alignment info to force recalculation
    if (vadTrimInfo.value) {
      vadTrimInfo.value.aligned = false
      vadTrimInfo.value.paddingAdded = 0
    }
    
    // Reprocess user recording with VAD and alignment
    const reprocessedBlob = await processUserRecordingWithVAD(originalUserRecording.value)
    
    // Create new blob URL
    const processedUrl = URL.createObjectURL(reprocessedBlob)
    
    // Load the reprocessed and aligned audio
    loadUserAudio(processedUrl)
    
    console.log('🎯 Manual alignment completed')
    
    // Show alignment info if available
    if (vadTrimInfo.value?.aligned) {
      console.log('🎯 Alignment applied:', {
        paddingAdded: vadTrimInfo.value.paddingAdded?.toFixed(3) + 's',
        alignmentType: vadTrimInfo.value.alignmentType,
        finalDuration: vadTrimInfo.value.newDuration?.toFixed(3) + 's'
      })
    }
  } catch (error) {
    console.error('🎯 Error during manual alignment:', error)
  } finally {
    isVadProcessing.value = false
  }
}

onMounted(async () => {
  console.log('Mobile Test A mounted')

  // Initialize VAD for audio trimming
  console.log('Initializing VAD processor...')
  try {
    await initVAD()
    console.log('VAD processor initialized successfully')
  } catch (error) {
    console.warn('VAD initialization failed, will use energy-based fallback:', error)
  }

  // Initialize waveforms after component is mounted
  await initializeTargetWaveform()
  await initializeUserWaveform()
})
</script>

<style scoped>
.mobile-practice-a {
  min-height: 100vh;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Mobile Header */
.mobile-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.back-btn,
.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: #f3f4f6;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover,
.settings-btn:hover {
  background: #e5e7eb;
}

.header-title {
  flex: 1;
  text-align: center;
  margin: 0 12px;
}

.header-title h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.2;
}

.header-title .progress {
  font-size: 14px;
  color: #6b7280;
  margin-top: 2px;
}

/* Section Styling */
section {
  margin: 0;
  background: #ffffff;
  border-bottom: 8px solid #f3f4f6;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.section-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.section-content {
  padding: 16px;
}

/* Compact Audio Loading */
.compact-loading-section {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 0;
  margin: 0;
}

.loading-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.current-file {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-actions {
  display: flex;
  gap: 6px;
  margin-left: 12px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.file-btn:hover {
  color: #3b82f6;
}

.url-btn:hover {
  color: #10b981;
}

/* Audio Section */
.audio-section {
  margin-bottom: 0;
}

.target-section .section-header {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.user-section .section-header {
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
}

/* Unified Control Bar */
.unified-control-bar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  margin: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  gap: 6px;
  flex-wrap: wrap;
  row-gap: 8px;
}


.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 52px;
  font-size: 10px;
  flex-shrink: 0;
}

/* Primary controls (play buttons) get priority */
.play-target,
.play-user,
.play-both,
.speed-cycle,
.record-again {
  order: 1;
}

/* Secondary controls (VAD, Align) can wrap to second row */
.vad-toggle,
.align-btn {
  order: 2;
}

/* Add visual separation between rows */
.vad-toggle {
  margin-left: auto; /* Push secondary controls to the right */
}

/* Ensure proper spacing on mobile */
@media (max-width: 400px) {
  .unified-control-bar {
    justify-content: center;
  }
  
  .vad-toggle {
    margin-left: 0;
  }
  
  .control-btn {
    min-width: 48px;
    padding: 6px 6px;
  }
}

.control-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
  transform: translateY(-1px);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.play-target {
  border-color: #3b82f6;
  color: #3b82f6;
}

.play-target:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #2563eb;
}

.play-user {
  border-color: #10b981;
  color: #10b981;
}

.play-user:hover:not(:disabled) {
  background: #ecfdf5;
  border-color: #059669;
}

.play-both {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.play-both:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #7c3aed;
}

.record-again {
  border-color: #ef4444;
  color: #ef4444;
}

.record-again:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #dc2626;
}

.btn-icon {
  font-size: 14px;
  margin-bottom: 2px;
}

.btn-label {
  font-size: 9px;
  font-weight: 500;
  text-align: center;
  line-height: 1;
}

.speed-cycle {
  border-color: #f59e0b;
  color: #f59e0b;
}

.speed-cycle:hover:not(:disabled) {
  background: #fef3c7;
  border-color: #d97706;
}

.vad-toggle {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.vad-toggle:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #7c3aed;
}

.vad-toggle.vad-enabled {
  background: #8b5cf6;
  color: white;
  border-color: #7c3aed;
}

.vad-toggle.vad-enabled:hover:not(:disabled) {
  background: #7c3aed;
  border-color: #6d28d9;
}

.vad-toggle.vad-processing {
  background: #f59e0b;
  color: white;
  border-color: #d97706;
  animation: vadProcessing 1.5s infinite;
}

.align-btn {
  border-color: #06b6d4;
  color: #06b6d4;
}

.align-btn:hover:not(:disabled) {
  background: #ecfeff;
  border-color: #0891b2;
}

@keyframes vadProcessing {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Alignment Status Indicator */
.alignment-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  margin: 8px 16px;
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
  animation: alignmentGlow 2s ease-in-out;
}

.alignment-icon {
  font-size: 14px;
}

.alignment-text {
  font-size: 11px;
  letter-spacing: 0.3px;
}

@keyframes alignmentGlow {
  0% { 
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
  }
  50% { 
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    transform: translateY(-1px);
  }
  100% { 
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
    transform: translateY(0);
  }
}

/* Recording Status Section */
.recording-status-section {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin: 0 16px;
}

.recording-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.recording-indicator .status-text {
  font-size: 14px;
  color: #dc2626;
  font-weight: 600;
}

.recording-indicator .recording-timer {
  font-size: 16px;
  color: #ef4444;
  font-weight: 700;
  font-family: monospace;
}

.audio-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.speed-controls {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.play-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.play-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.duration {
  font-size: 14px;
  font-weight: 500;
}

/* Waveform & Spectrogram */
.waveform-container,
.spectrogram-container {
  border-bottom: 1px solid #e5e7eb;
}

.waveform-header,
.spectrogram-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.waveform-header h3,
.spectrogram-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0;
  letter-spacing: 0.5px;
}

.waveform-controls {
  display: flex;
  gap: 4px;
}

.speed-btn {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
}

.speed-btn:hover {
  background: #f3f4f6;
}

.expand-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
}

/* Working visualization structure from AudioPlayer */
.visualization-wrapper {
  background-color: #1a1a1a;
  width: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
}

.waveform-container {
  width: 100%;
  height: 40px;
  /* Compressed height for mobile */
  background-color: rgba(0, 0, 0, 0.2);
  /* Semi-transparent background */
  border: 1px solid #60a5fa;
  /* Reduced border width */
  flex-shrink: 0;
  /* Don't shrink */
  box-sizing: border-box;
  /* Include border in height calculation */
  position: relative;
  /* For absolute positioning of placeholders */
}

/* Ensure WaveSurfer elements are properly styled */
.waveform-container>* {
  width: 100%;
}

/* Style placeholders */
.placeholder-wave,
.placeholder-spectrogram {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 14px;
  color: #6b7280;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

.spectrogram-container {
  width: 100%;
  height: 120px;
  /* Compressed height for mobile */
  flex-shrink: 0;
  /* Don't shrink */
  position: relative;
  /* For absolute positioning of placeholders */
}

/* Style placeholders */
.placeholder-wave,
.placeholder-spectrogram {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 14px;
  color: #6b7280;
}

/* Recording Section */
.recording-section {
  padding: 24px 16px;
  text-align: center;
}

.recording-status {
  margin-bottom: 16px;
}

.status-text {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
  display: block;
}

.recording-timer {
  font-size: 14px;
  color: #ef4444;
  font-weight: 600;
  margin-top: 4px;
  display: block;
}

.record-button {
  width: 120px;
  height: 120px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
  margin: 0 auto 24px;
}

.record-button.recording {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  animation: pulse 2s infinite;
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
}

.record-button.processing {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
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

.quick-settings {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.setting-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}

.setting-toggle input {
  margin: 0;
}

/* User Audio Section Actions */
.recording-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f3f4f6;
}

/* Comparison Section */
.comparison-section {
  padding: 16px;
}

.comparison-header h2 {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
}

.comparison-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.comparison-btn {
  flex: 1;
  min-width: 100px;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.comparison-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

/* Action Panel */
.action-panel {
  padding: 20px 16px;
  background: white;
  border-top: 1px solid #e5e7eb;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.action-primary {
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

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.complete-btn {
  background: linear-gradient(135deg, #10b981 0%, #047857 100%);
  color: white;
}

.complete-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.action-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.navigation-buttons {
  display: flex;
  gap: 12px;
}

.nav-btn {
  flex: 1;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

/* Bottom Safe Area */
.bottom-safe-area {
  height: env(safe-area-inset-bottom);
  background: white;
}

/* Responsive adjustments */
@media (max-width: 375px) {
  .loading-controls {
    flex-direction: column;
  }

  .quick-settings {
    flex-direction: column;
    align-items: center;
  }

  .comparison-controls {
    flex-direction: column;
  }

  .action-buttons {
    flex-direction: column;
  }
}

@media (min-width: 768px) {
  .mobile-practice-a {
    max-width: 480px;
    margin: 0 auto;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  }
}
</style>
