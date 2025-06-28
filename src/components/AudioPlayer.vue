<template>
  <div class="audio-player">
    <!-- Debug info display -->
    <div class="debug-info" v-if="debugInfo">
      <div class="debug-row">
        <span class="debug-label">{{ props.audioType.toUpperCase() }}:</span>
        <span class="debug-value">Raw: {{ debugInfo.rawDuration }}s</span>
        <span class="debug-value">Final: {{ debugInfo.finalDuration }}s</span>
        <span class="debug-value" v-if="debugInfo.trimmedAmount">Trimmed: {{ debugInfo.trimmedAmount }}s</span>
      </div>
    </div>
    
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
    default: 'user', // 'target' or 'user'
  },
  isRecording: {
    type: Boolean,
    default: false,
  },
  debugInfo: {
    type: Object,
    default: null,
  },
});

const waveformContainer = ref(null);
const spectrogramContainer = ref(null);
const { 
  syncEnabled, 
  targetWidthPercent, 
  userWidthPercent, 
  setTargetDuration, 
  setUserDuration 
} = useTimeSync();

const { wavesurfer, isReady, isPlaying, currentTime, duration, volume, playbackRate, playerId, playerInfo, initWaveform, playPause, play, stop, setVolume, setPlaybackRate, loadAudio, destroyWaveform } = useWaveform(waveformContainer, spectrogramContainer, `${props.audioType}_player`, props.audioType);

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
    } else {
      setUserDuration(newDuration);
    }
  }
});


watch(() => props.audioUrl, async (newUrl, oldUrl) => {
  console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: audioUrl watcher triggered`);
  console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: oldUrl = ${oldUrl ? oldUrl.slice(0, 50) + '...' : 'null'}`);
  console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: newUrl = ${newUrl ? newUrl.slice(0, 50) + '...' : 'null'}`);
  console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: URL changed = ${newUrl !== oldUrl}`);
  console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: URL type = ${newUrl ? (newUrl.startsWith('blob:') ? 'blob' : 'other') : 'none'}`);
  
  if (newUrl && newUrl !== oldUrl) {
    console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: Loading new audio URL`);
    
    // Light visual indicator during update
    isUpdating.value = true;
    
    // Wait for next tick to ensure DOM is ready
    await nextTick();
    
    // Check if containers are available
    if (!waveformContainer.value || !spectrogramContainer.value) {
      console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: Containers not ready, waiting...`);
      // Wait a bit more and try again
      setTimeout(async () => {
        await nextTick();
        if (waveformContainer.value && spectrogramContainer.value) {
          console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: Containers ready after timeout, loading audio`);
          loadAudio(newUrl);
          // End update indicator
          setTimeout(() => { isUpdating.value = false; }, 200);
        } else {
          console.error(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: Containers still not available after timeout`);
          isUpdating.value = false;
        }
      }, 100);
    } else {
      console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: Containers ready, loading audio immediately`);
      loadAudio(newUrl);
      // End update indicator after WaveSurfer processes
      setTimeout(() => { isUpdating.value = false; }, 200);
    }
  } else if (!newUrl) {
    console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: No URL provided, destroying waveform`);
    destroyWaveform();
    // Reset duration when audio is removed
    if (props.audioType === 'target') {
      setTargetDuration(0);
    } else {
      setUserDuration(0);
    }
  } else {
    console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: URL unchanged, no action needed`);
  }
}, { immediate: true });

onMounted(async () => {
  console.log('🎵 AudioPlayer mounted');
  await nextTick();
  console.log('🎵 Containers after mount:', {
    waveform: !!waveformContainer.value,
    spectrogram: !!spectrogramContainer.value
  });
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

// Expose methods for parent component with debugging
const debugPlayPause = () => {
  console.log('🎵 AudioPlayer playPause called, isReady:', isReady.value, 'isPlaying:', isPlaying.value);
  return playPause();
};

const debugPlay = () => {
  console.log('🎵 AudioPlayer play called, isReady:', isReady.value);
  return play();
};

const debugStop = () => {
  console.log('🎵 AudioPlayer stop called');
  return stop();
};

// Stop audio when starting a new recording
watch(() => props.isRecording, (newRecording, oldRecording) => {
  if (newRecording && !oldRecording) {
    console.log(`🎵 Recording started for ${props.audioType}, stopping audio`);
    audioManager.emergencyStop('Recording started');
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
  height: 260px; /* Total height for waveform + spectrogram */
  display: flex;
  flex-direction: column; /* Stack vertically */
  border-radius: 8px;
  overflow: hidden;
  transition: opacity 0.2s ease-in-out;
  position: relative; /* Required for absolute positioning of loading overlay */
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
  height: 200px; /* Fixed height for spectrogram */
  flex-shrink: 0; /* Don't shrink */
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