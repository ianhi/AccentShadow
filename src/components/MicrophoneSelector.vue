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
        <span class="permission-icon">{{ isPermanentlyDenied ? '🔒' : '❌' }}</span>
        <span class="permission-text">{{ permissionDeniedMessage }}</span>
        
        <!-- Show browser-specific instructions for permanent denial -->
        <div v-if="isPermanentlyDenied" class="permission-instructions">
          <p>To enable microphone access:</p>
          <ol>
            <li v-if="isChrome">Click the lock icon in the address bar</li>
            <li v-else-if="isFirefox">Click the permissions icon in the address bar</li>
            <li v-else-if="isSafari">Go to Safari → Settings → Websites → Microphone</li>
            <li v-else>Check your browser's site settings</li>
            <li>Find "Microphone" and set to "Allow"</li>
            <li>Refresh this page</li>
          </ol>
        </div>
        
        <!-- Try again button only for temporary denials -->
        <button 
          v-if="!isPermanentlyDenied" 
          @click="requestPermission" 
          class="permission-btn retry-btn" 
          :disabled="isLoading"
        >
          {{ isLoading ? 'Requesting...' : 'Try Again' }}
        </button>
        
        <!-- Refresh button for permanent denials -->
        <button 
          v-else 
          @click="refreshPage" 
          class="permission-btn refresh-btn"
        >
          Refresh Page
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
import { computed } from 'vue'
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
const { hasPermission, permissionRequested, isLoading, error, requestMicrophonePermission } = useMicrophoneDevices()

// Detect browser type
const isChrome = computed(() => /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor))
const isFirefox = computed(() => /Firefox/.test(navigator.userAgent))
const isSafari = computed(() => /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent))

// Check if permission is permanently denied
const isPermanentlyDenied = computed(() => {
  return error.value === 'PERMISSION_DENIED_PERMANENT'
})

// Get appropriate permission denied message
const permissionDeniedMessage = computed(() => {
  if (error.value === 'PERMISSION_DENIED_PERMANENT') {
    return 'Microphone access blocked by browser'
  } else if (error.value === 'NO_MICROPHONE_FOUND') {
    return 'No microphone found'
  } else if (error.value === 'PERMISSION_DENIED_TEMPORARY') {
    return 'Microphone access denied'
  } else {
    return 'Microphone access denied'
  }
})

const handleDeviceChange = (event) => {
  emit('device-change', event.target.value)
}

const requestPermission = async () => {
  console.log('🎤 User clicked permission request button')
  await requestMicrophonePermission()
}

const refreshPage = () => {
  window.location.reload()
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

.refresh-btn {
  background: #10b981;
}

.refresh-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}

.permission-instructions {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 12px;
  margin: 8px 0;
  text-align: left;
  max-width: 300px;
}

.permission-instructions p {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.permission-instructions ol {
  margin: 0;
  padding-left: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  line-height: 1.6;
}

.permission-instructions li {
  margin-bottom: 4px;
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
    max-width: 100%;
    gap: 6px;
  }
  
  .mic-dropdown {
    min-width: auto;
    max-width: 200px;
    flex: 1;
  }
}

/* Show only emoji on very small screens to save space */
@media (max-width: 480px) {
  .mic-label {
    font-size: 0;
  }
  
  .mic-label::before {
    content: "🎙️";
    font-size: 16px;
  }
  
  .mic-dropdown {
    max-width: 100%;
  }
}
</style>