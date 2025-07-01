<template>
  <div class="microphone-selection" v-if="availableDevices.length > 1">
    <div class="mic-dropdown-container">
      <label class="mic-label">🎙️ Microphone:</label>
      <select 
        :value="selectedDeviceId" 
        @change="handleDeviceChange"
        class="mic-dropdown"
        :disabled="disabled"
      >
        <option 
          v-for="device in availableDevices" 
          :key="device.deviceId" 
          :value="device.deviceId"
        >
          {{ device.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
defineProps({
  availableDevices: {
    type: Array,
    default: () => []
  },
  selectedDeviceId: {
    type: String,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['device-change'])

const handleDeviceChange = (event) => {
  emit('device-change', event.target.value)
}
</script>

<style scoped>
.microphone-selection {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.mic-dropdown-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  max-width: 350px; /* Limit maximum width */
}

.mic-label {
  font-size: 12px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  flex-shrink: 0; /* Prevent label from shrinking */
}

.mic-dropdown {
  background-color: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  padding: 4px 8px;
  font-size: 12px;
  min-width: 120px; /* Reduced from 180px */
  max-width: 200px; /* Add maximum width */
  backdrop-filter: blur(5px);
  cursor: pointer;
  flex: 1;
}

.mic-dropdown:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.mic-dropdown:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: rgba(255, 255, 255, 0.1);
}

.mic-dropdown option {
  background-color: #374151;
  color: white;
  padding: 4px;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .mic-dropdown-container {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    max-width: 100%;
  }
  
  .mic-dropdown {
    min-width: auto;
    max-width: 100%;
  }
  
  .mic-label {
    text-align: center;
  }
}
</style>