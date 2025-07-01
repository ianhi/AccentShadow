<template>
  <div class="audio-recorder" :class="{ 'compact': shouldUseMobileLayout }">
    <div class="recorder-controls">
      <button @click="toggleRecording" :class="{ 'recording': isRecording, 'compact': shouldUseMobileLayout }" class="record-btn">
        <span class="btn-icon">{{ isRecording ? '⏹' : '🎤' }}</span>
        <span v-if="!shouldUseMobileLayout && !isRecording">Start Recording</span>
        <span v-if="!shouldUseMobileLayout && isRecording" class="recording-time-on-button">
          <span class="recording-indicator"></span>
          {{ formatTime(recordingTime) }}
        </span>
      </button>
    </div>
    
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import { useMicrophoneDevices } from '../composables/useMicrophoneDevices.ts';
import { useViewport } from '../composables/useViewport';
import { useErrorModal } from '../composables/useErrorModal';

const emit = defineEmits(['recorded', 'recording-started', 'recording-stopped']);

const { isRecording, recordingTime, startRecording, stopRecording } = useAudioRecorder();
const { getMediaStream, getSelectedDevice, hasPermission, requestMicrophonePermission } = useMicrophoneDevices();
const { shouldUseMobileLayout } = useViewport();
const { showRecordingError, showPermissionError } = useErrorModal();

let timer = null;

// Props for microphone device management
const props = defineProps({
  selectedDeviceId: {
    type: String,
    default: null
  }
});

const toggleRecording = async () => {
  console.log('🎤 AudioRecorder toggleRecording called, isRecording:', isRecording.value);
  
  if (isRecording.value) {
    console.log('🎤 Stopping recording...');
    const audioBlob = await stopRecording();
    emit('recorded', audioBlob);
    emit('recording-stopped');
    clearInterval(timer);
    console.log('🎤 Recording stopped, blob size:', audioBlob?.size);
  } else {
    console.log('🎤 Starting recording with device:', props.selectedDeviceId);
    
    try {
      // Check if we have permission first
      if (!hasPermission.value) {
        console.log('🎤 No microphone permission, requesting...');
        const granted = await requestMicrophonePermission();
        
        if (!granted) {
          showPermissionError();
          return;
        }
      }
      
      // Get media stream with selected device
      const stream = await getMediaStream(props.selectedDeviceId);
      await startRecording(null, stream); // Pass the stream to the recorder
      emit('recording-started');
      timer = setInterval(() => {
        recordingTime.value++;
      }, 1000);
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('🎤 Failed to start recording:', error);
      const selectedDevice = getSelectedDevice();
      const deviceName = selectedDevice?.label || `Device ID: ${props.selectedDeviceId || 'default'}`;
      
      if (error.name === 'NotAllowedError') {
        showPermissionError();
      } else {
        showRecordingError(deviceName, error);
      }
    }
  }
};

onUnmounted(() => {
  clearInterval(timer);
});

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};
</script>

<style scoped>
.audio-recorder {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recorder-controls {
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 12px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
  min-height: 80px;
  min-width: 130px;
  white-space: nowrap;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background-color: rgba(16, 185, 129, 0.9);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.record-btn:hover:not(.recording) {
  background-color: rgba(5, 150, 105, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.record-btn.recording {
  background-color: rgba(239, 68, 68, 0.9);
  backdrop-filter: blur(10px);
}

.record-btn.recording:hover {
  background-color: rgba(220, 38, 38, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.record-btn .btn-icon {
  font-size: 20px;
}

.recording-time-on-button {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.recording-indicator {
  width: 8px;
  height: 8px;
  background-color: #ffffff;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.7; }
}

/* Compact mode styles */
.audio-recorder.compact {
  width: auto;
}

.audio-recorder.compact .recorder-controls {
  flex-direction: row;
  align-items: center;
  width: auto;
}

.record-btn.compact {
  min-width: 44px;
  min-height: 44px;
  padding: 8px;
  font-size: 11px;
  flex-direction: column;
  gap: 2px;
  border-radius: 8px;
  flex-shrink: 0;
}

.record-btn.compact .btn-icon {
  font-size: 16px;
}


/* Microphone selector styles moved to MicrophoneSelector component */

</style>