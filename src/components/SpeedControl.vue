<template>
  <div class="speed-control-section" :class="{ 'compact': compact }">
    <div class="speed-control">
      <label 
        :for="sliderId" 
        class="speed-label" 
        :class="{ 'disabled': !enabled }" 
        v-if="!compact"
      >
        ⚡ Playback Speed:
      </label>
      <label 
        :for="sliderId" 
        class="speed-label compact-label" 
        :class="{ 'disabled': !enabled }" 
        v-if="compact"
      >
        ⚡
      </label>
      <input 
        :id="sliderId"
        type="range" 
        min="0.25" 
        max="2" 
        step="0.25" 
        :value="speed" 
        :disabled="!enabled"
        @input="handleSpeedChange"
        class="speed-slider"
        :aria-label="compact ? 'Playback speed control' : undefined"
        :aria-describedby="speedDisplayId"
      />
      <span 
        :id="speedDisplayId" 
        class="speed-display" 
        :class="{ 'disabled': !enabled }"
        aria-live="polite"
      >
        {{ speed }}x
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  speed: {
    type: Number,
    default: 1.0
  },
  enabled: {
    type: Boolean,
    default: true
  },
  compact: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['speed-change'])

// Generate unique IDs for accessibility
const sliderId = computed(() => `speed-slider-${Math.random().toString(36).substr(2, 9)}`)
const speedDisplayId = computed(() => `speed-display-${Math.random().toString(36).substr(2, 9)}`)

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

/* Compact mode styles */
.speed-control-section.compact {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.speed-control-section.compact .speed-control {
  gap: 6px;
  flex-wrap: nowrap;
}

.speed-control-section.compact .speed-label.compact-label {
  font-size: 16px;
  min-width: auto;
}

.speed-control-section.compact .speed-slider {
  min-width: 80px;
  max-width: 120px;
  flex: none;
}

.speed-control-section.compact .speed-display {
  font-size: 12px;
  min-width: 30px;
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