<template>
  <div class="audio-processing-controls">
    <div class="options-group">
      <label class="auto-play-toggle">
        <input type="checkbox" :checked="autoPlayBoth" @change="$emit('toggle-auto-play', $event)" />
        🔄 Auto-play both after recording
      </label>
      <div class="alignment-controls">
        <label class="trim-silence-toggle">
          <input type="checkbox" :checked="autoAlignEnabled" @change="$emit('toggle-auto-align', $event)" />
          {{ vadReady ? '✂️ Trim Silence (VAD)' : '✂️ Trim Silence' }}
        </label>
        <button 
          @click="$emit('manual-align')" 
          :disabled="!hasTargetAudio || !hasUserAudio || isProcessing" 
          class="align-btn" 
          :class="{ 'processing': isProcessing }"
        >
          {{ isProcessing ? '🔄 Trimming...' : '✂️ Trim Now' }}
        </button>
      </div>
      <div class="sequential-delay-control">
        <label class="delay-label">📋 Sequential delay:</label>
        <input 
          type="range" 
          min="0" 
          max="2000" 
          step="100" 
          :value="sequentialDelay" 
          @input="$emit('update-sequential-delay', $event)"
          class="delay-slider"
        />
        <span class="delay-display">{{ sequentialDelay }}ms</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAppStateInject } from '../composables/useAppState'

// Get shared state from app state
const { hasTargetAudio, hasUserAudio } = useAppStateInject()

// Keep other props that are specific to AudioVisualizationPanel state
defineProps({
  autoPlayBoth: {
    type: Boolean,
    default: true
  },
  autoAlignEnabled: {
    type: Boolean,
    default: true
  },
  vadReady: {
    type: Boolean,
    default: false
  },
  isProcessing: {
    type: Boolean,
    default: false
  },
  sequentialDelay: {
    type: Number,
    default: 0
  }
})

defineEmits([
  'toggle-auto-play',
  'toggle-auto-align',
  'manual-align',
  'update-sequential-delay'
])
</script>

<style scoped>
.audio-processing-controls {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: 20px 0;
}

.options-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auto-play-toggle,
.trim-silence-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
}

.auto-play-toggle input,
.trim-silence-toggle input {
  margin: 0;
}

.alignment-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.align-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.align-btn:hover:not(:disabled) {
  background: rgba(37, 99, 235, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.align-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.align-btn.processing {
  background: rgba(245, 158, 11, 0.9);
  cursor: not-allowed;
}

.sequential-delay-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.delay-label {
  color: white;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.delay-slider {
  flex: 1;
  min-width: 120px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  appearance: none;
}

.delay-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.delay-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.delay-display {
  color: white;
  font-size: 14px;
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .audio-processing-controls {
    padding: 16px;
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