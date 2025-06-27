<template>
  <div class="audio-player">
    <div class="visualization-container" :style="{ width: visualizationWidth }">
      <!-- Background wrapper for consistent dark styling -->
      <div class="visualization-wrapper">
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
    <div class="controls">
      <button @click="playPause" :disabled="!isReady" class="play-btn">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <div class="volume-control">
        <span>🔊</span>
        <input type="range" min="0" max="1" step="0.01" v-model="volume" @input="setVolume" :disabled="!isReady" />
      </div>
      <div class="speed-control">
        <span>⚡</span>
        <input type="range" min="0.25" max="2" step="0.25" :value="playbackRate" @input="handleSpeedChange" :disabled="!isReady" />
        <span class="speed-display">{{ playbackRate }}x</span>
      </div>
      <span class="time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
    </div>
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

// Get the appropriate width for this audio type
const visualizationWidth = computed(() => {
  if (!syncEnabled.value) return '100%';
  return props.audioType === 'target' ? targetWidthPercent.value : userWidthPercent.value;
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

// Debug width changes
watch(visualizationWidth, (newWidth, oldWidth) => {
  console.log(`🕒 ${props.audioType} visualization width changed:`, {
    from: oldWidth,
    to: newWidth,
    syncEnabled: syncEnabled.value,
    audioUrl: props.audioUrl ? 'present' : 'null'
  });
  
  // Log container dimensions when width changes
  if (waveformContainer.value) {
    console.log(`🕒 ${props.audioType} container dimensions after width change:`, {
      width: waveformContainer.value.offsetWidth,
      height: waveformContainer.value.offsetHeight,
      clientWidth: waveformContainer.value.clientWidth,
      scrollWidth: waveformContainer.value.scrollWidth
    });
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
        } else {
          console.error(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: Containers still not available after timeout`);
        }
      }, 100);
    } else {
      console.log(`🎵 AUDIOPLAYER [${props.audioType.toUpperCase()}]: Containers ready, loading audio immediately`);
      loadAudio(newUrl);
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

.controls {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border-top: 1px solid #e0e0e0;
}

.play-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #3B82F6;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.play-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.play-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.volume-control span {
  font-size: 14px;
}

.volume-control input[type="range"] {
  flex: 1;
  max-width: 120px;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.speed-control span {
  font-size: 14px;
}

.speed-control input[type="range"] {
  flex: 1;
  max-width: 120px;
}

.speed-display {
  font-family: monospace;
  font-size: 12px;
  color: #6b7280;
  min-width: 35px;
  text-align: center;
}

.time-display {
  font-family: monospace;
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}
</style>