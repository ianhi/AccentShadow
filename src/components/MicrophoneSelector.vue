<template>
  <div class="microphone-selection">
    <!-- Permission required state -->
    <div v-if="!hasPermission && !permissionRequested" class="permission-prompt">
      <div class="permission-content">
        <span class="permission-icon">🎙️</span>
        <span class="permission-text">Microphone access required for recording</span>
        <button @click="requestPermission" class="permission-btn" :disabled="isLoading">
          {{ isLoading ? 'Requesting...' : 'Allow Microphone' }}
        </button>
      </div>
    </div>
    
    <!-- Permission denied state -->
    <div v-else-if="!hasPermission && permissionRequested" class="permission-denied">
      <div class="permission-content">
        <span class="permission-icon">❌</span>
        <span class="permission-text">Microphone access denied</span>
        <button @click="requestPermission" class="permission-btn retry-btn" :disabled="isLoading">
          {{ isLoading ? 'Requesting...' : 'Try Again' }}
        </button>
      </div>
    </div>
    
    <!-- Permission granted - show device selector -->
    <div v-else-if="hasPermission" class="mic-dropdown-container">
      <label class="mic-label">🎙️ Microphone:</label>
      <select 
        :value="selectedDeviceId" 
        @change="handleDeviceChange"
        class="mic-dropdown"
        :disabled="disabled || availableDevices.length === 0"
      >
        <option v-if="availableDevices.length === 0" value="">
          No microphones found
        </option>
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
import { useMicrophoneDevices } from '../composables/useMicrophoneDevices'

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

// Get permission state and functions
const { hasPermission, permissionRequested, isLoading, requestMicrophonePermission } = useMicrophoneDevices()

const handleDeviceChange = (event) => {
  emit('device-change', event.target.value)
}

const requestPermission = async () => {
  console.log('🎤 User clicked permission request button')
  await requestMicrophonePermission()
}
</script>

<style scoped>
.microphone-selection {
}

/* Permission states */
.permission-prompt,
.permission-denied {
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}

.permission-prompt {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.permission-denied {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.permission-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.permission-icon {
  font-size: 24px;
}

.permission-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.permission-btn {
  background: #60a5fa;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 32px;
}

.permission-btn:hover:not(:disabled) {
  background: #3b82f6;
  transform: translateY(-1px);
}

.permission-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.retry-btn {
  background: #ef4444;
}

.retry-btn:hover:not(:disabled) {
  background: #dc2626;
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