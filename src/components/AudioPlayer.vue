<template>
  <div class="audio-player">
    <!-- Debug info display -->
    <!-- <div class="debug-info" v-if="debugInfo"> -->
    <!--   <div class="debug-row"> -->
    <!--     <span class="debug-label">{{ props.audioType.toUpperCase() }}:</span> -->
    <!--     <span class="debug-value">Raw: {{ debugInfo.rawDuration }}s</span> -->
    <!--     <span class="debug-value">Final: {{ debugInfo.finalDuration }}s</span> -->
    <!--     <span class="debug-value" v-if="debugInfo.trimmedAmount">Trimmed: {{ debugInfo.trimmedAmount }}s</span> -->
    <!--   </div> -->
    <!-- </div> -->
    
    <div class="visualization-container" :style="{ width: visualizationWidth }">
      <!-- Background wrapper for consistent dark styling -->
      <div class="visualization-wrapper" :class="{ 'updating': isUpdating }">
        <!-- Loading overlay during audio updates -->
        <div v-if="isUpdating" class="loading-overlay">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <span>Processing audio...</span>
          </div>
        </div>
        
        <!-- Waveform positioned above spectrogram (vertical stack) -->
        <div ref="waveformContainer" class="waveform-container" :class="{ 'recording-active': props.isRecording }">
          <div v-if="props.isRecording && !props.audioUrl" class="recording-overlay">
            🔴 Recording...
          </div>
        </div>
        <!-- Spectrogram positioned below waveform -->
        <div ref="spectrogramContainer" class="spectrogram-container"></div>
      </div>
    </div>
    <!-- Individual controls removed - now using unified control panel -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useWaveform } from '../composables/useWaveform';
import { audioManager } from '../composables/useAudioManager';
import { useTimeSync } from '../composables/useTimeSync';

const props = defineProps({
  audioUrl: String,
  audioType: {
    type: String,
    default: 'user', // 'target', 'user', or 'raw-target'
  },
  isRecording: {
    type: Boolean,
    default: false,
  },
  debugInfo: {
    type: Object,
    default: null,
  },
  autoPlayOnReady: {
    type: Boolean,
    default: false,
  },
  suppressAutoPlay: {
    type: Boolean,
    default: false,
  },
  vadSegments: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['auto-played'])

const waveformContainer = ref(null);
const spectrogramContainer = ref(null);
const { 
  syncEnabled, 
  targetWidthPercent, 
  userWidthPercent, 
  setTargetDuration, 
  setUserDuration 
} = useTimeSync();

// Track if auto-play has been triggered for current audio
const hasAutoPlayed = ref(false)

// Auto-play callback for when audio is truly ready to play
const handleReadyToPlay = () => {
  if (props.autoPlayOnReady && props.audioType === 'target' && !hasAutoPlayed.value && !props.suppressAutoPlay) {
    hasAutoPlayed.value = true // Prevent multiple auto-plays for same audio
    
    // Add delay to ensure complete WaveSurfer readiness, especially for processed audio
    console.log('🎵 Delaying auto-play to ensure complete audio readiness...')
    setTimeout(() => {
      console.log('🎵 Starting delayed auto-play')
      const playResult = play()
      if (playResult instanceof Promise) {
        playResult
          .then(() => {
            console.log('🎵 Delayed auto-play successful')
            emit('auto-played')
          })
          .catch(error => console.warn('🎵 Auto-play failed:', error))
      } else {
        if (playResult) {
          console.log('🎵 Delayed auto-play successful (sync)')
          emit('auto-played')
        }
      }
    }, 150) // 150ms delay for complete audio decoding
  }
}

const vadSegmentsRef = ref(props.vadSegments || []);
const { wavesurfer, isReady, isPlaying, currentTime, duration, volume, playbackRate, playerId, playerInfo, initWaveform, playPause, play, stop, setVolume, setPlaybackRate, loadAudio, destroyWaveform, addVadSegments, clearVadSegments } = useWaveform(waveformContainer, spectrogramContainer, `${props.audioType}_player`, props.audioType, handleReadyToPlay, vadSegmentsRef);

// Watch for VAD segments changes from props
watch(() => props.vadSegments, (newSegments) => {
  vadSegmentsRef.value = newSegments || [];
  console.log(`🎯 [${props.audioType.toUpperCase()}]: VAD segments prop updated:`, newSegments);
}, { deep: true });

// Smooth transition state
const isUpdating = ref(false);

// Use consistent 100% width - no more duration-based scaling with smart alignment
const visualizationWidth = computed(() => {
  return '100%'; // Always use full width since we have proper VAD trimming/padding
});

// Watch for duration changes and update time sync
watch(duration, (newDuration) => {
  if (newDuration > 0) {
    if (props.audioType === 'target') {
      setTargetDuration(newDuration);
    } else if (props.audioType === 'user') {
      setUserDuration(newDuration);
    }
    // raw-target doesn't need time sync
  }
});


// Reactive pattern to handle audio URL changes with proper container readiness
watch(() => props.audioUrl, async (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl) {
    // Reset auto-play flag for new audio, but NOT during alignment operations
    if (!props.suppressAutoPlay) {
      hasAutoPlayed.value = false;
    }
    
    // Light visual indicator during update
    isUpdating.value = true;
    
    // Wait for next tick to ensure DOM is ready
    await nextTick();
    
    // Load audio if containers are ready, otherwise the container watcher will handle it
    if (waveformContainer.value && spectrogramContainer.value) {
      loadAudio(newUrl);
      isUpdating.value = false;
    } else {
      console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: Waiting for containers to be ready...`);
      // Keep isUpdating true - it will be cleared by the container watcher
    }
  } else if (!newUrl) {
    hasAutoPlayed.value = false; // Always reset flag when audio is removed
    destroyWaveform();
    isUpdating.value = false;
    // Reset duration when audio is removed
    if (props.audioType === 'target') {
      setTargetDuration(0);
    } else if (props.audioType === 'user') {
      setUserDuration(0);
    }
    // raw-target doesn't need time sync reset
  }
}, { immediate: true });

// Reactive pattern to watch for container readiness and load pending audio
watch([waveformContainer, spectrogramContainer], async ([waveformEl, spectrogramEl]) => {
  if (waveformEl && spectrogramEl && props.audioUrl && isUpdating.value) {
    console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: Containers now ready, loading audio reactively`);
    await nextTick();
    loadAudio(props.audioUrl);
    isUpdating.value = false;
  }
}, { immediate: false });

onMounted(async () => {
  await nextTick();
});

onBeforeUnmount(() => {
  destroyWaveform();
});

const handleSpeedChange = (event) => {
  const newRate = parseFloat(event.target.value);
  setPlaybackRate(newRate);
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

// Expose methods for parent component
const debugPlayPause = () => {
  return playPause();
};

const debugPlay = () => {
  return play();
};

const debugStop = () => {
  return stop();
};

// Stop audio when starting a new recording
watch(() => props.isRecording, (newRecording, oldRecording) => {
  if (newRecording && !oldRecording) {
    audioManager.emergencyStop('Recording started');
  }
});

// Reset auto-play flag only when audio is completely removed
watch(() => props.audioUrl, (newUrl) => {
  if (!newUrl) {
    // Audio removed completely, reset for next upload
    hasAutoPlayed.value = false;
  }
});

defineExpose({
  playPause: debugPlayPause,
  play: debugPlay,
  stop: debugStop,
  setPlaybackRate, // Expose playback rate control
  wavesurfer, // Expose wavesurfer instance for direct control
  playerId,
  playerInfo,
  isReady,
  isPlaying
});
</script>

<style scoped>
.audio-player {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.visualization-container {
  padding: 0;
  position: relative;
  min-width: 20%;
  align-self: flex-start;
  border-radius: 8px;
  overflow: hidden;
}

.visualization-wrapper {
  background-color: #1a1a1a;
  width: 100%;
  height: 360px; /* Desktop: 60px waveform + 300px spectrogram */
  display: flex;
  flex-direction: column; /* Stack vertically */
  border-radius: 8px;
  overflow: hidden;
  transition: opacity 0.2s ease-in-out;
  position: relative; /* Required for absolute positioning of loading overlay */
}

/* Mobile responsive heights */
@media (max-width: 768px) {
  .visualization-wrapper {
    height: 160px; /* Mobile: 40px waveform + 120px spectrogram */
  }
}

.visualization-wrapper.updating {
  opacity: 1; /* Keep full opacity, loading overlay will handle visual feedback */
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 26, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: 8px;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #60a5fa;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.waveform-container {
  width: 100%;
  height: 60px; /* Fixed height for waveform */
  background-color: rgba(0, 0, 0, 0.2); /* Semi-transparent background */
  border: 1px solid #60a5fa; /* Reduced border width */
  flex-shrink: 0; /* Don't shrink */
  box-sizing: border-box; /* Include border in height calculation */
  display: flex;
  align-items: center; /* Center waveform vertically */
}

/* Mobile waveform container height */
@media (max-width: 768px) {
  .waveform-container {
    height: 40px;
  }
}

/* Ensure WaveSurfer elements are properly styled */
.waveform-container > * {
  width: 100%;
}

.waveform-container.recording-active {
  border: 2px solid #ef4444;
}

.recording-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #ef4444;
  font-weight: 600;
  font-size: 14px;
  animation: pulse 1.5s infinite;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 8px 16px;
  border-radius: 4px;
}

.spectrogram-container {
  width: 100%;
  height: 300px; /* Fixed height for spectrogram */
  flex-shrink: 0; /* Don't shrink */
}

/* Mobile spectrogram container height */
@media (max-width: 768px) {
  .spectrogram-container {
    height: 120px;
  }
}

/* Individual audio player controls removed - using unified control panel */

.debug-info {
  background: rgba(0, 0, 0, 0.8);
  color: #ffffff;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 11px;
  font-family: 'Courier New', monospace;
}

.debug-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.debug-label {
  font-weight: bold;
  color: #60a5fa;
  min-width: 60px;
}

.debug-value {
  color: #10b981;
}
</style>
