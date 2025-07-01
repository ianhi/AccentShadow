<template>
  <div class="audio-visualization-panel" :class="{ 'mobile-layout': shouldUseMobileLayout }">
    <!-- Target Audio Controls Section - Show on mobile too -->
    <div class="target-controls-section" :class="{ 'mobile-controls': shouldUseMobileLayout }">
      <h3>📁 Load Target Audio</h3>
      <TargetAudioControls 
        :currentAudioSource="currentAudioSource"
        @browse-file="$emit('browse-file')"
        @load-url="$emit('load-url')"
      />
    </div>
    
    <div class="visualization-container" :class="{ 'mobile-stacked': shouldUseMobileLayout }">
      <!-- Target Audio Column -->
      <AudioColumn
        title="Target Audio"
        :audioUrl="targetAudioUrl"
        audioType="target"
        :audioKey="targetAudioKey"
        :debugInfo="targetDebugInfo"
        :autoPlayOnReady="appSettings.autoPlayTargetOnUpload"
        :suppressAutoPlay="isAligning || hasTargetAutoPlayed"
        @audio-player-ref="handleTargetAudioPlayerRef"
        @auto-played="handleTargetAutoPlayed"
        :class="{ 'mobile-audio-column': shouldUseMobileLayout }"
        :showTitleOnMobile="true"
      >
        <template #placeholder>
          {{ currentRecording ? 'Select a recording from the set' : 'Please upload a target audio file or load from URL.' }}
        </template>
      </AudioColumn>
      
      <!-- User Recording Column -->
      <AudioColumn
        title="User Recording"
        :audioUrl="userAudioUrl"
        audioType="user"
        :audioKey="userAudioKey"
        :debugInfo="userDebugInfo"
        :isRecording="isRecording"
        :placeholderClass="{ 'recording-placeholder': isRecording }"
        @audio-player-ref="handleUserAudioPlayerRef"
        :class="{ 'mobile-audio-column': shouldUseMobileLayout }"
        :showTitleOnMobile="false"
      >
        <template #placeholder>
          <span v-if="isRecording" class="recording-indicator-text">
            🔴 Recording in progress...
          </span>
          <span v-else>Record your audio.</span>
        </template>
      </AudioColumn>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue'
import AudioColumn from './AudioColumn.vue'
import TargetAudioControls from './TargetAudioControls.vue'
import { useSmartAudioAlignment } from '../composables/useSmartAudioAlignment'
import { useTimeSync } from '../composables/useTimeSync.ts'
import { audioManager } from '../composables/useAudioManager.ts'
import { useViewport } from '../composables/useViewport'

const props = defineProps({
  currentRecording: {
    type: Object,
    default: null
  },
  isRecording: {
    type: Boolean,
    default: false
  },
  vadSettings: {
    type: Object,
    default: () => ({
      padding: 0.2,
      threshold: 0.25,
      minSpeechDuration: 50,
      maxSilenceDuration: 500,
      maxTrimStart: 3.0,
      maxTrimEnd: 2.0
    })
  },
  appSettings: {
    type: Object,
    default: () => ({
      autoPlayTargetOnUpload: true
    })
  }
})

const emit = defineEmits([
  'browse-file',
  'load-url', 
  'show-vad-settings',
  'target-audio-ref',
  'user-audio-ref',
  'audio-processed',
  'trigger-auto-play'
])

// Mobile layout detection
const { shouldUseMobileLayout } = useViewport()

// Audio state
const targetAudioUrl = ref(null)
const targetAudioBlob = ref(null)
const userAudioUrl = ref(null)  
const userAudioBlob = ref(null)
const currentAudioSource = ref('')

// Store original target audio to prevent progressive trimming
const originalTargetAudioBlob = ref(null)

// Debug info for audio processing
const targetDebugInfo = ref(null)
const userDebugInfo = ref(null)

// Cache for target audio VAD processing to avoid reprocessing on each recording
const targetAudioProcessed = ref(null)

// Control state
const autoPlayBoth = ref(true)
const autoAlignEnabled = ref(true)
const sequentialDelay = ref(0)
const isAligning = ref(false) // Track alignment operations to suppress auto-play
const hasTargetAutoPlayed = ref(false) // Track if target has auto-played for current upload

// Audio player refs
const targetAudioPlayerRef = ref(null)
const userAudioPlayerRef = ref(null)

// Composables
const { 
  isProcessing,
  vadReady,
  processAudio,
  normalizeAudioSilence,
  alignTwoAudios
} = useSmartAudioAlignment()

// URL cleanup management - avoid arbitrary delays
const pendingCleanups = new Set()

const scheduleUrlCleanup = (url) => {
  if (!url || !url.startsWith('blob:')) return
  
  // Add to pending cleanup list
  pendingCleanups.add(url)
  console.log('📋 Scheduled URL cleanup:', url)
  
  // Clean up after a short safety delay (much shorter than 3 seconds)
  setTimeout(() => {
    if (pendingCleanups.has(url)) {
      URL.revokeObjectURL(url)
      pendingCleanups.delete(url)
      console.log('🗑️ Cleaned up blob URL:', url)
    }
  }, 500) // Short delay to ensure audio is loaded elsewhere
}

const immediateUrlCleanup = (url) => {
  if (!url || !url.startsWith('blob:')) return
  
  URL.revokeObjectURL(url)
  pendingCleanups.delete(url)
  console.log('🗑️ Immediate cleanup of blob URL:', url)
}
const { syncEnabled } = useTimeSync()

// Computed properties for audio keys (force re-render when audio changes)
const targetAudioKey = computed(() => targetAudioUrl.value ? `target-${Date.now()}` : null)
const userAudioKey = computed(() => userAudioUrl.value ? `user-${Date.now()}` : null)

// Handle AudioPlayer refs
const handleTargetAudioPlayerRef = (ref) => {
  targetAudioPlayerRef.value = ref
  emit('target-audio-ref', ref)
}

const handleTargetAutoPlayed = () => {
  hasTargetAutoPlayed.value = true
  console.log('🎯 Target audio auto-played - flag set to prevent further auto-play')
}

const handleUserAudioPlayerRef = (ref) => {
  userAudioPlayerRef.value = ref
  emit('user-audio-ref', ref)
}

// Fast duration calculation using AudioContext (no DOM loading needed)
const getAudioDurationFast = async (audioBlob) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const arrayBuffer = await audioBlob.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    audioContext.close()
    return audioBuffer.duration
  } catch (error) {
    console.warn('⚠️ Fast duration calculation failed, using fallback:', error)
    return 0
  }
}

// Helper function to get audio duration with better error handling
const getAudioDuration = async (audioBlob) => {
  return new Promise((resolve, reject) => {
    console.log('🔍 [DURATION DEBUG] Starting duration detection for blob:', {
      size: audioBlob.size,
      type: audioBlob.type,
      timestamp: Date.now()
    })
    
    const audio = new Audio()
    const url = URL.createObjectURL(audioBlob)
    let resolved = false
    let eventsFired = []
    
    const cleanup = () => {
      if (!resolved) {
        resolved = true
        URL.revokeObjectURL(url)
      }
    }
    
    const handleDuration = (duration, eventSource) => {
      console.log(`🔍 [DURATION DEBUG] Duration event from ${eventSource}:`, {
        duration,
        isFinite: isFinite(duration),
        isPositive: duration > 0,
        audioCurrentTime: audio.currentTime,
        audioReadyState: audio.readyState,
        resolved
      })
      
      if (!resolved && isFinite(duration) && duration > 0) {
        console.log('✅ [DURATION DEBUG] Valid duration detected, resolving:', duration)
        cleanup()
        resolve(duration)
      }
    }
    
    audio.addEventListener('loadstart', () => {
      eventsFired.push('loadstart')
      console.log('🔍 [DURATION DEBUG] loadstart event fired')
    })
    
    audio.addEventListener('loadedmetadata', () => {
      eventsFired.push('loadedmetadata')
      console.log('🔍 [DURATION DEBUG] loadedmetadata event fired, duration:', audio.duration)
      handleDuration(audio.duration, 'loadedmetadata')
    })
    
    // Fallback for when loadedmetadata gives invalid duration
    audio.addEventListener('canplay', () => {
      eventsFired.push('canplay')
      console.log('🔍 [DURATION DEBUG] canplay event fired, duration:', audio.duration)
      handleDuration(audio.duration, 'canplay')
    })
    
    // Additional fallback for stubborn audio files
    audio.addEventListener('loadeddata', () => {
      eventsFired.push('loadeddata')
      console.log('🔍 [DURATION DEBUG] loadeddata event fired, duration:', audio.duration)
      handleDuration(audio.duration, 'loadeddata')
    })
    
    audio.addEventListener('canplaythrough', () => {
      eventsFired.push('canplaythrough')
      console.log('🔍 [DURATION DEBUG] canplaythrough event fired, duration:', audio.duration)
      handleDuration(audio.duration, 'canplaythrough')
    })
    
    audio.addEventListener('progress', () => {
      console.log('🔍 [DURATION DEBUG] progress event fired, buffered:', audio.buffered.length)
    })
    
    audio.addEventListener('error', (error) => {
      eventsFired.push('error')
      console.error('❌ [DURATION DEBUG] Error event fired:', {
        error: error.target?.error,
        code: error.target?.error?.code,
        message: error.target?.error?.message,
        networkState: audio.networkState,
        readyState: audio.readyState
      })
      
      if (!resolved) {
        cleanup()
        reject(error)
      }
    })
    
    audio.addEventListener('stalled', () => {
      eventsFired.push('stalled')
      console.warn('⚠️ [DURATION DEBUG] stalled event fired')
    })
    
    audio.addEventListener('suspend', () => {
      eventsFired.push('suspend')
      console.log('🔍 [DURATION DEBUG] suspend event fired')
    })
    
    // Timeout fallback - if we can't get duration in 3 seconds, give up (reduced from 5s)
    setTimeout(() => {
      if (!resolved) {
        console.warn('⚠️ [DURATION DEBUG] Timeout reached, events fired:', eventsFired)
        console.warn('⚠️ [DURATION DEBUG] Final audio state:', {
          duration: audio.duration,
          readyState: audio.readyState,
          networkState: audio.networkState,
          src: audio.src.substring(0, 50) + '...'
        })
        cleanup()
        resolve(0)
      }
    }, 3000) // Reduced timeout
    
    console.log('🔍 [DURATION DEBUG] Setting audio src:', url.substring(0, 50) + '...')
    audio.src = url
  })
}

// Unified function to set and process target audio from any source
const setTargetAudio = async (audioBlob, source = {}) => {
  if (!audioBlob) {
    console.warn('🎯 setTargetAudio: No audio blob provided')
    // Clear everything
    const oldTargetUrl = targetAudioUrl.value
    targetDebugInfo.value = null
    targetAudioProcessed.value = null
    originalTargetAudioBlob.value = null // Clear original as well
    targetAudioUrl.value = null
    targetAudioBlob.value = null
    hasTargetAutoPlayed.value = false // Reset auto-play flag when target is cleared
    
    // Cleanup old blob URL - will be handled by URL manager
    if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
      scheduleUrlCleanup(oldTargetUrl)
    }
    return
  }

  try {
    const sourceType = source.source || 'manual'
    
    // Store old URL for cleanup
    const oldTargetUrl = targetAudioUrl.value
    
    // Store the original target audio blob to prevent progressive trimming
    originalTargetAudioBlob.value = audioBlob
    console.log('💾 Stored original target audio blob for future alignments')
    
    // Reset auto-play flag for new target audio (but not during alignment)
    if (!isAligning.value) {
      hasTargetAutoPlayed.value = false
      console.log('🎯 New target audio - reset auto-play flag')
    }
    
    // Process target audio with VAD using exact aggressive settings from tuner
    const targetProcessed = await processAudio(audioBlob, {
      positiveSpeechThreshold: 0.3,  // Exact tuner setting
      negativeSpeechThreshold: 0.2,  // Exact tuner setting
      minSpeechFrames: 3,            // Exact tuner setting
      redemptionFrames: 32,          // Exact tuner setting
      padding: 0.05                  // Exact tuner setting (50ms padding)
    })
    
    if (targetProcessed.processed && targetProcessed.vadBoundaries) {
      // Normalize target audio to have consistent padding
      const normalizedBlob = await normalizeAudioSilence(
        targetProcessed.audioBlob,
        targetProcessed.vadBoundaries,
        props.vadSettings.padding * 1000 // Convert to milliseconds
      )
      
      // Update state with processed audio
      targetAudioBlob.value = normalizedBlob
      targetAudioUrl.value = URL.createObjectURL(normalizedBlob)
      
      // Cache the processed target audio for future recordings
      targetAudioProcessed.value = {
        ...targetProcessed,
        audioBlob: normalizedBlob
      }
      
      // Update debug info using VAD-provided duration data
      const vadRawEnd = targetProcessed.vadBoundaries.endTime || 0
      const vadFinalEnd = targetProcessed.vadBoundaries.endTime || 0 // Already normalized by VAD
      targetDebugInfo.value = {
        rawDuration: vadRawEnd.toFixed(3),
        finalDuration: vadFinalEnd.toFixed(3),
        trimmedAmount: '0.000' // Already optimally trimmed by VAD
      }
      
      if (sourceType === 'folder') {
        console.log('✅ FOLDER AUDIO PROCESSING: Successfully completed VAD processing', {
          rawDuration: vadRawEnd.toFixed(3) + 's',
          finalDuration: vadFinalEnd.toFixed(3) + 's',
          trimmedAmount: '0.000s (VAD optimized)',
          fileName: source.fileName
        })
      }
    } else {
      console.log('📏 Target VAD processing failed - using original audio')
      
      // Use original audio when VAD processing fails
      targetAudioBlob.value = audioBlob
      targetAudioUrl.value = URL.createObjectURL(audioBlob)
      
      // Clear cache since processing failed
      targetAudioProcessed.value = null
      
      // Keep basic debug info (fallback when VAD fails)
      const fallbackDuration = await getAudioDurationFast(audioBlob)
      targetDebugInfo.value = {
        rawDuration: fallbackDuration.toFixed(3),
        finalDuration: fallbackDuration.toFixed(3),
        trimmedAmount: '0.000'
      }
    }
    
    // Cleanup old blob URL
    if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
      scheduleUrlCleanup(oldTargetUrl)
    }
    
    // Update current audio source display
    if (source.name) {
      currentAudioSource.value = source.name
    } else if (source.fileName) {
      currentAudioSource.value = source.fileName
    } else if (source.url) {
      currentAudioSource.value = source.url
    }
    
    emit('audio-processed', { type: 'target', blob: targetAudioBlob.value, url: targetAudioUrl.value })
    
  } catch (error) {
    console.error('Error processing target audio:', error)
    
    // Fallback to original audio on error
    const oldTargetUrl = targetAudioUrl.value
    targetAudioBlob.value = audioBlob
    targetAudioUrl.value = URL.createObjectURL(audioBlob)
    targetAudioProcessed.value = null
    
    try {
      const rawDuration = await getAudioDurationFast(audioBlob)
      targetDebugInfo.value = {
        rawDuration: rawDuration.toFixed(3),
        finalDuration: rawDuration.toFixed(3),
        trimmedAmount: '0.000'
      }
    } catch (durationError) {
      targetDebugInfo.value = null
    }
    
    // Cleanup old blob URL
    if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
      scheduleUrlCleanup(oldTargetUrl)
    }
  }
}

// Process user recorded audio
const processUserAudio = async (blob) => {
  console.log('🎧 [DEBUG] processUserAudio started', {
    blobSize: blob?.size,
    hasTargetAudio: !!targetAudioBlob.value,
    targetCached: !!targetAudioProcessed.value,
    autoAlignEnabled: autoAlignEnabled.value,
    timestamp: Date.now()
  })
  
  if (!blob || blob.size === 0) {
    console.warn('🎤 AudioVisualizationPanel: Empty or invalid audio blob received, skipping processing')
    return
  }
  
  // IMPORTANT: Don't set user audio immediately - wait for alignment to complete
  // This prevents the intermediate display of raw audio before aligned version
  console.log('🎧 [DEBUG] SOLUTION: Deferring user audio display until after alignment')
  
  // Skip duration detection for user recordings to avoid webm compatibility delays
  // The VAD processing below will give us accurate duration information
  console.log('🎧 [DEBUG] Skipping duration detection for user recording (will get from VAD)')
  const rawUserDuration = 0 // Will be calculated from VAD
  
  // Store blob temporarily for processing, but don't set URL for display yet
  let tempUserBlob = blob
  let tempUserUrl = null
  
  // Smart VAD-based audio processing with normalized padding
  if (autoAlignEnabled.value) {
    try {
      console.log('🎧 [DEBUG] Auto-align enabled, starting VAD processing...')
      console.log('🎧 Starting smart VAD-based audio processing...')
      
      // Process the recorded audio with VAD to get speech boundaries
      // Use more lenient settings for user recordings (microphone audio)
      console.log('🎧 [DEBUG] Calling processAudio for user recording...')
      const userProcessed = await processAudio(tempUserBlob, {
        threshold: 0.3,           // More sensitive for user recordings
        minSpeechDuration: 30,    // Shorter minimum speech duration
        maxSilenceDuration: 500,  // Allow longer silence gaps
        padding: 0.1
      })
      console.log('🎧 [DEBUG] User processAudio completed:', {
        processed: userProcessed.processed,
        hasBoundaries: !!userProcessed.vadBoundaries,
        audioBlob: !!userProcessed.audioBlob
      })
      
      if (userProcessed.processed && userProcessed.vadBoundaries) {
        console.log('🎯 User audio VAD analysis complete:', {
          speechStart: userProcessed.vadBoundaries.originalSpeechStart?.toFixed(3) + 's',
          speechEnd: userProcessed.vadBoundaries.originalSpeechEnd?.toFixed(3) + 's',
          paddedStart: userProcessed.vadBoundaries.startTime?.toFixed(3) + 's',
          paddedEnd: userProcessed.vadBoundaries.endTime?.toFixed(3) + 's'
        })
        
        // If we have both target and user audio, align them together for matching lengths
        if (targetAudioBlob.value) {
          console.log('🎧 [DEBUG] Target audio exists, entering alignment phase...')
          console.log('🔄 Both target and user audio available - performing smart alignment...')
          isAligning.value = true // Suppress auto-play during alignment
          
          try {
            console.log('🎧 [DEBUG] Alignment try block started')
            // Use cached target audio processing when available for better performance
            let targetProcessed
            if (targetAudioProcessed.value) {
              console.log('🎧 [DEBUG] Using cached target processing')
              console.log('🎯 Using cached target audio processing (optimized - no reprocessing)')
              // Use cached VAD boundaries but original audio blob to recalculate padding correctly
              targetProcessed = {
                ...targetAudioProcessed.value,
                audioBlob: originalTargetAudioBlob.value,  // CRITICAL: Use original blob to prevent padding accumulation
                alreadyNormalized: false  // Allow re-normalization to calculate correct padding for current user recording
              }
              console.log('🎧 [DEBUG] FIXED: Using original target blob to prevent padding accumulation')
              console.log('🎧 [DEBUG] Target audio normalization will recalculate padding for current user recording')
            } else {
              console.log('🎧 [DEBUG] No cached target processing, processing original target...')
              console.log('🎯 No cached target processing - processing original target audio for alignment')
              const audioToProcess = originalTargetAudioBlob.value || targetAudioBlob.value
              targetProcessed = await processAudio(audioToProcess)
              // Cache the processed target for future recordings
              if (targetProcessed.processed) {
                targetAudioProcessed.value = targetProcessed
                console.log('🎯 Cached target audio processing for future use')
              } else {
                console.warn('🎯 Target audio VAD processing failed during alignment')
              }
            }
            
            if (targetProcessed.processed && userProcessed.processed) {
              console.log('🎧 [DEBUG] Starting alignTwoAudios call...')
              // Align both audios using smart alignment
              const alignmentResult = await alignTwoAudios(
                targetProcessed,
                userProcessed,
                props.vadSettings.padding * 1000 // Convert to milliseconds
              )
              console.log('🎧 [DEBUG] alignTwoAudios completed')
              
              console.log('✅ Smart two-audio alignment complete:', {
                method: alignmentResult.alignmentInfo.method,
                finalDuration: alignmentResult.alignmentInfo.finalDuration?.toFixed(3) + 's',
                paddingAdded: alignmentResult.alignmentInfo.paddingAdded?.toFixed(3) + 's'
              })
              
              // Store old URLs for cleanup after new audio is loaded
              const oldUserUrl = userAudioUrl.value
              const oldTargetUrl = targetAudioUrl.value
              console.log('🎧 [DEBUG] Stored old URLs for cleanup')
              
              // Always update target audio with aligned result
              console.log('🎧 [DEBUG] Updating target audio with aligned result...')
              targetAudioBlob.value = alignmentResult.audio1Aligned
              targetAudioUrl.value = URL.createObjectURL(alignmentResult.audio1Aligned)
              console.log('🎧 [DEBUG] Target audio updated')
              
              // Always update user audio with aligned result
              console.log('🎧 [DEBUG] Setting user audio for FIRST TIME with aligned result...')
              userAudioBlob.value = alignmentResult.audio2Aligned
              userAudioUrl.value = URL.createObjectURL(alignmentResult.audio2Aligned)
              console.log('🎧 [DEBUG] User audio set for first time with aligned version (no intermediate display)')
              
              // Update debug info using VAD-provided duration data (no separate calculation needed)
              console.log('🎧 [DEBUG] Using VAD-provided duration data for debug info...')
              const userVadEnd = userProcessed.vadBoundaries?.endTime || 0
              const userVadStart = userProcessed.vadBoundaries?.originalSpeechStart || 0
              const userSpeechDuration = userProcessed.vadBoundaries?.originalSpeechEnd - userVadStart || 0
              userDebugInfo.value = {
                rawDuration: userVadEnd.toFixed(3),
                finalDuration: userVadEnd.toFixed(3),
                trimmedAmount: '0.000' // Already optimally trimmed by VAD
              }
              console.log('🎧 [DEBUG] Updated user debug info using VAD data')
              
              // Update target debug info using cached VAD data
              console.log('🎧 [DEBUG] Using cached target VAD data for debug info...')
              if (targetDebugInfo.value && targetProcessed?.vadBoundaries) {
                const targetVadEnd = targetProcessed.vadBoundaries.endTime || 0
                targetDebugInfo.value.finalDuration = targetVadEnd.toFixed(3)
                targetDebugInfo.value.trimmedAmount = '0.000' // Already optimally trimmed by VAD
              }
              console.log('🎧 [DEBUG] Updated target debug info using VAD data')
              
              // Clean up old URLs
              if (oldUserUrl && oldUserUrl.startsWith('blob:')) {
                scheduleUrlCleanup(oldUserUrl)
              }
              if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
                scheduleUrlCleanup(oldTargetUrl)
              }
              console.log('🎧 [DEBUG] Scheduled URL cleanup')
              
              console.log('✅ Smart alignment and audio update complete')
              
              // Emit both audios after successful alignment
              console.log('🎧 [DEBUG] Emitting target audio-processed event...')
              emit('audio-processed', { type: 'target', blob: targetAudioBlob.value, url: targetAudioUrl.value })
              console.log('🎧 [DEBUG] Emitting user audio-processed event...')
              emit('audio-processed', { type: 'user', blob: userAudioBlob.value, url: userAudioUrl.value })
              console.log('🎧 [DEBUG] Both audio-processed events emitted')
              
              // Auto-play both audios after alignment if enabled
              if (autoPlayBoth.value) {
                console.log('🎧 [DEBUG] Auto-play both is enabled after alignment, preparing simultaneous playback...')
                
                // Set up reactive auto-play trigger after alignment
                console.log('🎧 [DEBUG] Auto-play both enabled after alignment, setting up reactive trigger...')
                setupAutoPlayAfterAlignment()
              } else {
                console.log('🎧 [DEBUG] Auto-play both is disabled')
              }
              
            } else {
              console.warn('⚠️ Cannot align audios - one or both processing failed')
              console.log('🎧 [DEBUG] Fallback: setting user audio with raw blob since alignment failed')
              // Fallback: set user audio with raw blob since alignment failed
              userAudioBlob.value = tempUserBlob
              userAudioUrl.value = URL.createObjectURL(tempUserBlob)
              emit('audio-processed', { type: 'user', blob: userAudioBlob.value, url: userAudioUrl.value })
            }
          } catch (alignError) {
            console.error('❌ Smart alignment failed:', alignError)
            console.log('🎧 [DEBUG] Fallback: setting user audio with raw blob since alignment failed (catch block)')
            // Fallback: set user audio with raw blob since alignment failed
            userAudioBlob.value = tempUserBlob
            userAudioUrl.value = URL.createObjectURL(tempUserBlob)
            emit('audio-processed', { type: 'user', blob: userAudioBlob.value, url: userAudioUrl.value })
          } finally {
            console.log('🎧 [DEBUG] Alignment phase completed, re-enabling auto-play')
            isAligning.value = false // Re-enable auto-play after alignment
          }
        } else {
          console.log('🎧 [DEBUG] No target audio - processing user audio individually')
          // Process user audio individually without alignment
          console.log('🎧 [DEBUG] Normalizing user audio silence...')
          const normalizedBlob = await normalizeAudioSilence(
            userProcessed.audioBlob,
            userProcessed.vadBoundaries,
            props.vadSettings.padding * 1000
          )
          console.log('🎧 [DEBUG] User audio silence normalized')
          
          // Store old URL for cleanup
          const oldUserUrl = userAudioUrl.value
          
          console.log('🎧 [DEBUG] Setting user audio for FIRST TIME with normalized version...')
          userAudioBlob.value = normalizedBlob
          userAudioUrl.value = URL.createObjectURL(normalizedBlob)
          console.log('🎧 [DEBUG] User audio set for first time with normalized version (no intermediate display)')
          
          // Update debug info
          console.log('🎧 [DEBUG] Getting final normalized user audio duration...')
          const finalUserDuration = await getAudioDurationFast(normalizedBlob)
          userDebugInfo.value = {
            rawDuration: rawUserDuration.toFixed(3),
            finalDuration: finalUserDuration.toFixed(3),
            trimmedAmount: (rawUserDuration - finalUserDuration).toFixed(3)
          }
          console.log('🎧 [DEBUG] Updated user debug info for normalized audio')
          
          // Clean up old URL
          if (oldUserUrl && oldUserUrl.startsWith('blob:')) {
            scheduleUrlCleanup(oldUserUrl)
          }
          console.log('🎧 [DEBUG] Scheduled old URL cleanup for normalized audio')
        }
      } else {
        console.log('🎧 [DEBUG] User audio VAD processing failed - setting original blob')
        // VAD failed, set original audio
        userAudioBlob.value = tempUserBlob
        userAudioUrl.value = URL.createObjectURL(tempUserBlob)
        
        // Set basic debug info
        userDebugInfo.value = {
          rawDuration: rawUserDuration.toFixed(3),
          finalDuration: rawUserDuration.toFixed(3),
          trimmedAmount: '0.000'
        }
      }
    } catch (error) {
      console.error('❌ User audio processing failed:', error)
      console.log('🎧 [DEBUG] Processing error occurred - setting original blob')
      // Processing failed, set original audio
      userAudioBlob.value = tempUserBlob
      userAudioUrl.value = URL.createObjectURL(tempUserBlob)
      
      // Set basic debug info
      userDebugInfo.value = {
        rawDuration: rawUserDuration.toFixed(3),
        finalDuration: rawUserDuration.toFixed(3),
        trimmedAmount: '0.000'
      }
    }
  } else {
    console.log('🎧 [DEBUG] Auto-align disabled - setting original blob')
    // Auto-align disabled, set original audio
    userAudioBlob.value = tempUserBlob
    userAudioUrl.value = URL.createObjectURL(tempUserBlob)
    
    // Set basic debug info
    userDebugInfo.value = {
      rawDuration: rawUserDuration.toFixed(3),
      finalDuration: rawUserDuration.toFixed(3),
      trimmedAmount: '0.000'
    }
  }
  
  // Only emit user audio if we don't have target audio (no alignment needed)
  // If we have target audio, alignment will happen and we'll emit after that
  const shouldEmitNow = !targetAudioBlob.value
  console.log('🎧 [DEBUG] Determining if should emit now:', { shouldEmitNow, hasTarget: !!targetAudioBlob.value })
  if (shouldEmitNow) {
    console.log('🎧 [DEBUG] No target audio - emitting user audio immediately')
    emit('audio-processed', { type: 'user', blob: userAudioBlob.value, url: userAudioUrl.value })
  } else {
    console.log('🎧 [DEBUG] Target audio exists - deferring user audio emit until after alignment')
  }
  
  // Auto-play both audios after recording if enabled (only if no alignment needed)
  if (autoPlayBoth.value && shouldEmitNow) {
    console.log('🎧 [DEBUG] Auto-play both is enabled, preparing simultaneous playback...')
    
    // Set up reactive auto-play trigger for no-alignment path
    console.log('🎧 [DEBUG] Auto-play both enabled (no alignment), setting up reactive trigger...')
    setupAutoPlayAfterAlignment()
  } else {
    console.log('🎧 [DEBUG] Auto-play conditions not met:', { autoPlayBoth: autoPlayBoth.value, shouldEmitNow })
  }
  
  console.log('🎧 [DEBUG] processUserAudio function completed')
}

// Reactive auto-play setup using Vue watchers instead of manual polling
const setupAutoPlayAfterAlignment = () => {
  console.log('🎵 Setting up reactive auto-play trigger')
  
  // Use nextTick to ensure current synchronous operations complete
  nextTick(() => {
    // Check immediately if both players are already ready
    const targetReady = targetAudioPlayerRef.value?.isReady
    const userReady = userAudioPlayerRef.value?.isReady
    
    console.log('🎵 Initial readiness check:', { targetReady, userReady })
    
    if (targetReady && userReady) {
      console.log('🎵 Both players already ready, triggering immediate auto-play')
      // Small delay to ensure complete component initialization
      setTimeout(() => {
        console.log('🎵 Triggering delayed auto-play (immediate path)')
        emit('trigger-auto-play')
      }, 150)
      return
    }
    
    // If not ready immediately, set up reactive watchers
    console.log('🎵 Players not immediately ready, setting up reactive watchers')
    
    // Create a watcher that triggers when both players become ready
    const stopWatcher = watch(
      () => [
        targetAudioPlayerRef.value?.isReady,
        userAudioPlayerRef.value?.isReady
      ],
      ([targetReady, userReady]) => {
        console.log('🎵 Watcher detected readiness change:', { targetReady, userReady })
        
        if (targetReady && userReady) {
          console.log('🎵 Both players now ready via watcher, triggering auto-play')
          
          // Clean up the watcher since we only need it to trigger once
          stopWatcher()
          
          // Small delay to ensure complete readiness
          setTimeout(() => {
            console.log('🎵 Triggering delayed auto-play (watcher path)')
            emit('trigger-auto-play')
          }, 150)
        }
      },
      { immediate: false } // Don't trigger immediately since we already checked above
    )
    
    // Safety timeout to clean up watcher if players never become ready
    setTimeout(() => {
      console.warn('🎵 Auto-play watcher timeout - cleaning up')
      stopWatcher()
    }, 5000)
  })
}

// Legacy function - now redirects to reactive approach
const setupAutoPlayWatchers = () => {
  console.log('🎵 Legacy setupAutoPlayWatchers called - redirecting to reactive approach')
  setupAutoPlayAfterAlignment()
}

// Manual alignment function
const manualAlign = async () => {
  if (!targetAudioBlob.value || !userAudioBlob.value) {
    console.warn('⚠️ Cannot align - missing target or user audio')
    return
  }
  
  try {
    console.log('🔧 Manual alignment triggered')
    
    // Always use original target audio for manual alignment
    let targetProcessed = targetAudioProcessed.value
    if (!targetProcessed) {
      const audioToProcess = originalTargetAudioBlob.value || targetAudioBlob.value
      targetProcessed = await processAudio(audioToProcess)
      if (targetProcessed.processed) {
        targetAudioProcessed.value = targetProcessed
      }
    } else {
      // For manual alignment, use original audio to prevent progressive trimming
      targetProcessed = {
        ...targetProcessed,
        audioBlob: originalTargetAudioBlob.value || targetAudioBlob.value,
        alreadyNormalized: false // Force fresh alignment calculation
      }
      console.log('🔧 Manual alignment using original target audio to prevent cumulative trimming')
    }
    
    const userProcessed = await processAudio(userAudioBlob.value, {
      threshold: 0.3,
      minSpeechDuration: 30,
      maxSilenceDuration: 500,
      padding: 0.1
    })
    
    if (targetProcessed?.processed && userProcessed.processed) {
      const alignmentResult = await alignTwoAudios(
        targetProcessed,
        userProcessed,
        props.vadSettings.padding * 1000
      )
      
      // Store old URLs for cleanup
      const oldUserUrl = userAudioUrl.value
      const oldTargetUrl = targetAudioUrl.value
      
      // Update both audios with aligned results
      targetAudioBlob.value = alignmentResult.audio1Aligned
      targetAudioUrl.value = URL.createObjectURL(alignmentResult.audio1Aligned)
      
      userAudioBlob.value = alignmentResult.audio2Aligned
      userAudioUrl.value = URL.createObjectURL(alignmentResult.audio2Aligned)
      
      // Update debug info
      const finalUserDuration = await getAudioDurationFast(alignmentResult.audio2Aligned)
      const finalTargetDuration = await getAudioDurationFast(alignmentResult.audio1Aligned)
      
      if (userDebugInfo.value) {
        userDebugInfo.value.finalDuration = finalUserDuration.toFixed(3)
      }
      if (targetDebugInfo.value) {
        targetDebugInfo.value.finalDuration = finalTargetDuration.toFixed(3)
      }
      
      // Clean up old URLs
      if (oldUserUrl && oldUserUrl.startsWith('blob:')) {
        scheduleUrlCleanup(oldUserUrl)
      }
      if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
        scheduleUrlCleanup(oldTargetUrl)
      }
      
      console.log('✅ Manual alignment complete')
    } else {
      console.warn('⚠️ Manual alignment failed - audio processing unsuccessful')
    }
  } catch (error) {
    console.error('❌ Manual alignment error:', error)
  }
}

// Watch for recording changes to load target audio
watch(() => props.currentRecording, async (newRecording, oldRecording) => {
  // Only process if switching to a new recording that has audio
  if (newRecording && newRecording !== oldRecording && newRecording.audioBlob) {
    try {
      await setTargetAudio(newRecording.audioBlob, {
        name: newRecording.name,
        fileName: newRecording.metadata?.fileName,
        source: 'folder'
      })
      console.log('✅ FOLDER PROCESSING: Successfully processed folder recording')
    } catch (error) {
      console.error('❌ FOLDER PROCESSING: Failed to process folder recording:', error)
    }
  } else if (!newRecording) {
    console.log('🗑️ FOLDER PROCESSING: Clearing target audio (no recording selected)')
    await setTargetAudio(null)
  }
})

// Expose methods and state
defineExpose({
  setTargetAudio,
  processUserAudio,
  manualAlign,
  getTargetBlob: () => targetAudioBlob.value,
  getUserBlob: () => userAudioBlob.value,
  getOriginalTargetBlob: () => originalTargetAudioBlob.value,
  getTargetUrl: () => targetAudioUrl.value,
  getUserUrl: () => userAudioUrl.value,
  getTargetPlayerRef: () => targetAudioPlayerRef.value,
  getUserPlayerRef: () => userAudioPlayerRef.value,
  autoPlayBoth,
  sequentialDelay
})
</script>

<style scoped>
.audio-visualization-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.target-controls-section {
  background: rgba(255, 255, 255, 0.1);
  padding: 16px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.target-controls-section h3 {
  margin: 0 0 12px 0;
  color: white;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.visualization-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  min-height: 350px;
}

.recording-indicator-text {
  color: rgba(255, 100, 100, 0.9);
  font-weight: 600;
}

/* Mobile layout styles */
.mobile-layout {
  gap: 12px;
}

.mobile-controls {
  padding: 12px;
  margin-bottom: 8px;
}

.mobile-controls h3 {
  font-size: 14px;
  margin-bottom: 8px;
}

.mobile-stacked {
  grid-template-columns: 1fr !important;
  gap: 16px;
  min-height: auto;
}

.mobile-audio-column {
  min-height: auto;
}

/* Mobile responsive breakpoint */
@media (max-width: 768px) {
  .visualization-container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .target-controls-section,
  .bottom-controls {
    padding: 12px;
  }
  
  .alignment-controls,
  .sequential-delay-control {
    flex-direction: column;
    align-items: stretch;
  }
  
  .delay-slider {
    min-width: 100%;
  }
}

/* Portrait orientation optimization */
@media (max-width: 768px) and (orientation: portrait) {
  .mobile-layout {
    gap: 8px;
  }
  
  .mobile-controls {
    padding: 8px 12px;
  }
  
  .mobile-stacked {
    gap: 8px;
  }
  
  .mobile-audio-column {
    min-height: 180px;
  }
}
</style>