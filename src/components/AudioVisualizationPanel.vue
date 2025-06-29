<template>
  <div class="audio-visualization-panel">
    <!-- Target Audio Controls Section -->
    <div class="target-controls-section">
      <h3>📁 Load Target Audio</h3>
      <TargetAudioControls 
        :currentAudioSource="currentAudioSource"
        @browse-file="$emit('browse-file')"
        @load-url="$emit('load-url')"
      />
    </div>
    
    <div class="visualization-container">
      <!-- Target Audio Column -->
      <AudioColumn
        title="Target Audio"
        :audioUrl="targetAudioUrl"
        audioType="target"
        :audioKey="targetAudioKey"
        :debugInfo="targetDebugInfo"
        @audio-player-ref="handleTargetAudioPlayerRef"
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
import { ref, watch, computed } from 'vue'
import AudioColumn from './AudioColumn.vue'
import TargetAudioControls from './TargetAudioControls.vue'
import { useSmartAudioAlignment } from '../composables/useSmartAudioAlignment'
import { useTimeSync } from '../composables/useTimeSync.ts'
import { audioManager } from '../composables/useAudioManager.ts'

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
const { syncEnabled } = useTimeSync()

// Computed properties for audio keys (force re-render when audio changes)
const targetAudioKey = computed(() => targetAudioUrl.value ? `target-${Date.now()}` : null)
const userAudioKey = computed(() => userAudioUrl.value ? `user-${Date.now()}` : null)

// Handle AudioPlayer refs
const handleTargetAudioPlayerRef = (ref) => {
  targetAudioPlayerRef.value = ref
  emit('target-audio-ref', ref)
}

const handleUserAudioPlayerRef = (ref) => {
  userAudioPlayerRef.value = ref
  emit('user-audio-ref', ref)
}

// Helper function to get audio duration
const getAudioDuration = async (audioBlob) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const url = URL.createObjectURL(audioBlob)
    
    const cleanup = () => {
      URL.revokeObjectURL(url)
    }
    
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration
      cleanup()
      
      // Check for invalid duration values
      if (!isFinite(duration) || duration <= 0) {
        console.warn('⚠️ Invalid audio duration detected:', duration)
        resolve(0)
      } else {
        resolve(duration)
      }
    })
    
    audio.addEventListener('error', (error) => {
      cleanup()
      console.error('❌ Error loading audio for duration:', error)
      reject(error)
    })
    
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
    
    // Cleanup old blob URL
    if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
      setTimeout(() => {
        URL.revokeObjectURL(oldTargetUrl)
      }, 3000)
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
    
    // Get raw duration for debugging
    const rawDuration = await getAudioDuration(audioBlob)
    
    // Initial debug info
    targetDebugInfo.value = {
      rawDuration: rawDuration.toFixed(3),
      finalDuration: rawDuration.toFixed(3),
      trimmedAmount: '0.000'
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
      
      // Update debug info with normalized duration
      const finalDuration = await getAudioDuration(normalizedBlob)
      targetDebugInfo.value = {
        rawDuration: rawDuration.toFixed(3),
        finalDuration: finalDuration.toFixed(3),
        trimmedAmount: (rawDuration - finalDuration).toFixed(3)
      }
      
      if (sourceType === 'folder') {
        console.log('✅ FOLDER AUDIO PROCESSING: Successfully completed VAD processing', {
          rawDuration: rawDuration.toFixed(3) + 's',
          finalDuration: finalDuration.toFixed(3) + 's',
          trimmedAmount: (rawDuration - finalDuration).toFixed(3) + 's',
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
      
      // Keep basic debug info
      targetDebugInfo.value = {
        rawDuration: rawDuration.toFixed(3),
        finalDuration: rawDuration.toFixed(3),
        trimmedAmount: '0.000'
      }
    }
    
    // Cleanup old blob URL after delay to ensure audio player has loaded
    setTimeout(() => {
      if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldTargetUrl)
      }
    }, 3000)
    
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
      const rawDuration = await getAudioDuration(audioBlob)
      targetDebugInfo.value = {
        rawDuration: rawDuration.toFixed(3),
        finalDuration: rawDuration.toFixed(3),
        trimmedAmount: '0.000'
      }
    } catch (durationError) {
      targetDebugInfo.value = null
    }
    
    // Cleanup old blob URL
    setTimeout(() => {
      if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldTargetUrl)
      }
    }, 3000)
  }
}

// Process user recorded audio
const processUserAudio = async (blob) => {
  if (!blob || blob.size === 0) {
    console.warn('🎤 AudioVisualizationPanel: Empty or invalid audio blob received, skipping processing')
    return
  }
  
  userAudioBlob.value = blob
  userAudioUrl.value = URL.createObjectURL(blob)
  
  // Store raw duration for debugging
  const rawUserDuration = await getAudioDuration(blob)
  userDebugInfo.value = {
    rawDuration: rawUserDuration.toFixed(3),
    finalDuration: rawUserDuration.toFixed(3),
    trimmedAmount: '0.000'
  }
  
  // Smart VAD-based audio processing with normalized padding
  if (autoAlignEnabled.value) {
    try {
      console.log('🎧 Starting smart VAD-based audio processing...')
      
      // Process the recorded audio with VAD to get speech boundaries
      // Use more lenient settings for user recordings (microphone audio)
      const userProcessed = await processAudio(blob, {
        threshold: 0.3,           // More sensitive for user recordings
        minSpeechDuration: 30,    // Shorter minimum speech duration
        maxSilenceDuration: 500,  // Allow longer silence gaps
        padding: 0.1
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
          console.log('🔄 Both target and user audio available - performing smart alignment...')
          
          try {
            // Always use original target audio to prevent progressive trimming
            let targetProcessed
            if (targetAudioProcessed.value && originalTargetAudioBlob.value) {
              console.log('🎯 Using cached VAD boundaries but processing original target audio for alignment')
              // Use cached VAD boundaries but process the original audio blob
              targetProcessed = {
                ...targetAudioProcessed.value,
                audioBlob: originalTargetAudioBlob.value, // ALWAYS use original blob
                alreadyNormalized: false // Force fresh processing for alignment
              }
              console.log('🎯 Original target audio will be processed fresh to prevent cumulative trimming')
            } else {
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
              // Align both audios using smart alignment
              const alignmentResult = await alignTwoAudios(
                targetProcessed,
                userProcessed,
                props.vadSettings.padding * 1000 // Convert to milliseconds
              )
              
              console.log('✅ Smart two-audio alignment complete:', {
                method: alignmentResult.alignmentInfo.method,
                finalDuration: alignmentResult.alignmentInfo.finalDuration?.toFixed(3) + 's',
                paddingAdded: alignmentResult.alignmentInfo.paddingAdded?.toFixed(3) + 's'
              })
              
              // Store old URLs for cleanup after new audio is loaded
              const oldUserUrl = userAudioUrl.value
              const oldTargetUrl = targetAudioUrl.value
              
              // Always update target audio with aligned result
              console.log('🎯 Updating target audio with aligned result')
              targetAudioBlob.value = alignmentResult.audio1Aligned
              targetAudioUrl.value = URL.createObjectURL(alignmentResult.audio1Aligned)
              
              // Always update user audio with aligned result
              userAudioBlob.value = alignmentResult.audio2Aligned
              userAudioUrl.value = URL.createObjectURL(alignmentResult.audio2Aligned)
              
              // Update debug info for user audio
              const finalUserDuration = await getAudioDuration(alignmentResult.audio2Aligned)
              const trimmedUser = rawUserDuration - finalUserDuration
              userDebugInfo.value = {
                rawDuration: rawUserDuration.toFixed(3),
                finalDuration: finalUserDuration.toFixed(3),
                trimmedAmount: isFinite(trimmedUser) ? trimmedUser.toFixed(3) : '0.000'
              }
              
              // Also update target debug info since it may have changed
              const finalTargetDuration = await getAudioDuration(alignmentResult.audio1Aligned)
              if (targetDebugInfo.value) {
                const targetRawDuration = parseFloat(targetDebugInfo.value.rawDuration)
                const trimmedTarget = targetRawDuration - finalTargetDuration
                targetDebugInfo.value.finalDuration = finalTargetDuration.toFixed(3)
                targetDebugInfo.value.trimmedAmount = isFinite(trimmedTarget) ? trimmedTarget.toFixed(3) : '0.000'
              }
              
              // Clean up old URLs after delay
              setTimeout(() => {
                if (oldUserUrl && oldUserUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(oldUserUrl)
                }
                if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(oldTargetUrl)
                }
              }, 3000)
              
              console.log('✅ Smart alignment and audio update complete')
            } else {
              console.warn('⚠️ Cannot align audios - one or both processing failed')
            }
          } catch (alignError) {
            console.error('❌ Smart alignment failed:', alignError)
          }
        } else {
          console.log('🎯 No target audio - processing user audio individually')
          // Process user audio individually without alignment
          const normalizedBlob = await normalizeAudioSilence(
            userProcessed.audioBlob,
            userProcessed.vadBoundaries,
            props.vadSettings.padding * 1000
          )
          
          // Store old URL for cleanup
          const oldUserUrl = userAudioUrl.value
          
          userAudioBlob.value = normalizedBlob
          userAudioUrl.value = URL.createObjectURL(normalizedBlob)
          
          // Update debug info
          const finalUserDuration = await getAudioDuration(normalizedBlob)
          userDebugInfo.value = {
            rawDuration: rawUserDuration.toFixed(3),
            finalDuration: finalUserDuration.toFixed(3),
            trimmedAmount: (rawUserDuration - finalUserDuration).toFixed(3)
          }
          
          // Clean up old URL
          setTimeout(() => {
            if (oldUserUrl && oldUserUrl.startsWith('blob:')) {
              URL.revokeObjectURL(oldUserUrl)
            }
          }, 3000)
        }
      } else {
        console.log('📏 User audio VAD processing failed - using original')
      }
    } catch (error) {
      console.error('❌ User audio processing failed:', error)
    }
  }
  
  emit('audio-processed', { type: 'user', blob: userAudioBlob.value, url: userAudioUrl.value })
  
  // Auto-play both audios after recording if enabled
  if (autoPlayBoth.value) {
    console.log('🎵 Auto-play both is enabled, preparing simultaneous playback...')
    
    // Wait a bit for audio players to be ready, then trigger playback
    setTimeout(() => {
      const targetReady = targetAudioPlayerRef.value?.isReady
      const userReady = userAudioPlayerRef.value?.isReady
      
      if (targetReady && userReady) {
        console.log('🎵 Both players ready, triggering overlapping playback')
        // Emit event to parent to trigger playback
        emit('trigger-auto-play')
      } else {
        console.log('🎵 Players not ready yet, skipping auto-play', { targetReady, userReady })
      }
    }, 1500) // Give players time to load
  }
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
      const finalUserDuration = await getAudioDuration(alignmentResult.audio2Aligned)
      const finalTargetDuration = await getAudioDuration(alignmentResult.audio1Aligned)
      
      if (userDebugInfo.value) {
        userDebugInfo.value.finalDuration = finalUserDuration.toFixed(3)
      }
      if (targetDebugInfo.value) {
        targetDebugInfo.value.finalDuration = finalTargetDuration.toFixed(3)
      }
      
      // Clean up old URLs
      setTimeout(() => {
        if (oldUserUrl && oldUserUrl.startsWith('blob:')) {
          URL.revokeObjectURL(oldUserUrl)
        }
        if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
          URL.revokeObjectURL(oldTargetUrl)
        }
      }, 3000)
      
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

/* Mobile responsive */
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
</style>