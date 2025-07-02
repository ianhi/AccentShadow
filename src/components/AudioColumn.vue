<template>
  <div class="audio-column">
    <div class="column-header">
      <h3 v-show="!(showTitleOnMobile === false && shouldUseMobileLayout)">{{ title }}</h3>
      <!-- Slot for type-specific controls (e.g., TargetAudioControls) -->
      <slot name="controls"></slot>
    </div>
    
    <AudioPlayer 
      v-if="audioUrl" 
      :ref="setAudioPlayerRef" 
      :audioUrl="audioUrl" 
      :audioType="audioType"
      :isRecording="isRecording"
      :debugInfo="debugInfo"
      :autoPlayOnReady="autoPlayOnReady"
      :suppressAutoPlay="suppressAutoPlay"
      :vadSegments="vadSegments"
      :audioBlob="audioBlob"
      :key="audioKey"
      @auto-played="$emit('auto-played')"
    />
    
    <div v-else class="placeholder" :class="placeholderClass">
      <!-- Slot for custom placeholder content -->
      <slot name="placeholder">
        {{ defaultPlaceholder }}
      </slot>
    </div>
  </div>
</template>

<script setup>
import AudioPlayer from './AudioPlayer.vue'
import { useMobileLayout } from '@/composables/useMobileLayout'

const { shouldUseMobileLayout } = useMobileLayout()

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  audioUrl: {
    type: String,
    default: null
  },
  audioType: {
    type: String,
    required: true,
    validator: (value) => ['target', 'user', 'raw-target'].includes(value)
  },
  audioKey: {
    type: String,
    default: null
  },
  debugInfo: {
    type: Object,
    default: null
  },
  isRecording: {
    type: Boolean,
    default: false
  },
  placeholderClass: {
    type: [String, Object, Array],
    default: ''
  },
  defaultPlaceholder: {
    type: String,
    default: 'No audio available'
  },
  autoPlayOnReady: {
    type: Boolean,
    default: false
  },
  suppressAutoPlay: {
    type: Boolean,
    default: false
  },
  showTitleOnMobile: {
    type: Boolean,
    default: true
  },
  vadSegments: {
    type: Array,
    default: () => []
  },
  audioBlob: {
    type: Object, // Blob type
    default: null
  }
})

const emit = defineEmits(['audio-player-ref', 'auto-played'])

// Handle AudioPlayer ref via callback
const setAudioPlayerRef = (ref) => {
  if (ref) {
    emit('audio-player-ref', ref)
  }
}
</script>

<style scoped>
.audio-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 400px;
  height: 100%; /* Use full height of grid container */
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.column-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-header h3 {
  margin: 0;
  color: white;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 200px;
  border: 2px dashed rgba(255, 255, 255, 0.4);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  padding: 20px;
  transition: all 0.3s ease;
  backdrop-filter: blur(5px);
}

.placeholder.recording-placeholder {
  border-color: rgba(239, 68, 68, 0.6);
  background: rgba(239, 68, 68, 0.15);
  color: rgba(255, 100, 100, 0.9);
  animation: pulse-border 2s infinite;
}

@keyframes pulse-border {
  0%, 100% {
    border-color: rgba(239, 68, 68, 0.6);
    background: rgba(239, 68, 68, 0.15);
  }
  50% {
    border-color: rgba(239, 68, 68, 0.9);
    background: rgba(239, 68, 68, 0.25);
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .audio-column {
    padding: 8px;
    min-height: 280px;
    gap: 8px;
  }
  
  .column-header h3 {
    font-size: 16px;
  }
  
  .placeholder {
    min-height: 150px;
    font-size: 14px;
    padding: 12px;
  }
}
</style>