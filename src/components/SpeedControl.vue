<template>
  <div class="speed-control-section">
    <div class="speed-control">
      <span class="speed-label" :class="{ 'disabled': !enabled }">⚡ Playback Speed:</span>
      <input 
        type="range" 
        min="0.25" 
        max="2" 
        step="0.25" 
        :value="speed" 
        :disabled="!enabled"
        @input="handleSpeedChange"
        class="speed-slider"
      />
      <span class="speed-display" :class="{ 'disabled': !enabled }">{{ speed }}x</span>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  speed: {
    type: Number,
    default: 1.0
  },
  enabled: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['speed-change'])

const handleSpeedChange = (event) => {
  // Only emit if the control is enabled
  if (props.enabled) {
    const newSpeed = parseFloat(event.target.value)
    emit('speed-change', newSpeed)
  }
}
</script>

<style scoped>
.speed-control-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.speed-label {
  font-size: 14px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.speed-slider {
  flex: 1;
  min-width: 150px;
  max-width: 300px;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s;
}

.speed-slider::-webkit-slider-thumb:hover {
  background: #2563eb;
  transform: scale(1.1);
}

.speed-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.2s;
}

.speed-slider::-moz-range-thumb:hover {
  background: #2563eb;
  transform: scale(1.1);
}

.speed-display {
  font-size: 14px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  min-width: 40px;
  text-align: center;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .speed-control {
    flex-direction: column;
    gap: 8px;
  }
  
  .speed-slider {
    max-width: 250px;
  }
  
  .speed-label,
  .speed-display {
    font-size: 13px;
  }
}

/* Disabled state styles */
.speed-label.disabled,
.speed-display.disabled {
  opacity: 0.5;
  color: rgba(255, 255, 255, 0.5);
}

.speed-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.1);
}

.speed-slider:disabled::-webkit-slider-thumb {
  background: rgba(59, 130, 246, 0.5);
  cursor: not-allowed;
}

.speed-slider:disabled::-moz-range-thumb {
  background: rgba(59, 130, 246, 0.5);
  cursor: not-allowed;
}
</style>