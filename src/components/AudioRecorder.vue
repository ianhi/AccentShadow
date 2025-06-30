<template>
  <div class="audio-recorder" :class="{ 'compact': shouldUseMobileLayout }">
    <div class="recorder-controls">
      <button @click="toggleRecording" :class="{ 'recording': isRecording, 'compact': shouldUseMobileLayout }" class="record-btn">
        <span class="btn-icon">{{ isRecording ? '⏹' : '🎤' }}</span>
        <span v-if="!shouldUseMobileLayout">{{ isRecording ? 'Stop Recording' : 'Start Recording' }}</span>
      </button>
      <div class="recording-status" :class="{ 'visible': isRecording, 'compact': shouldUseMobileLayout }">
        <span class="recording-indicator"></span>
        <span class="recording-time">{{ formatTime(recordingTime) }}</span>
      </div>
    </div>
    
    <!-- Microphone Selection - Hidden on mobile -->
    <MicrophoneSelector 
      v-if="!shouldUseMobileLayout"
      :availableDevices="availableDevices"
      :selectedDeviceId="selectedDeviceId"
      :disabled="isRecording"
      @device-change="onDeviceChange"
    />
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import { useMicrophoneDevices } from '../composables/useMicrophoneDevices.ts';
import MicrophoneSelector from './MicrophoneSelector.vue';
import { useViewport } from '../composables/useViewport';

const emit = defineEmits(['recorded', 'recording-started', 'recording-stopped']);

const { isRecording, recordingTime, startRecording, stopRecording } = useAudioRecorder();
const { availableDevices, selectedDeviceId, setSelectedDevice, getMediaStream } = useMicrophoneDevices();
const { shouldUseMobileLayout } = useViewport();

let timer = null;

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
    console.log('🎤 Starting recording with device:', selectedDeviceId.value);
    try {
      // Get media stream with selected device
      const stream = await getMediaStream(selectedDeviceId.value);
      await startRecording(null, stream); // Pass the stream to the recorder
      emit('recording-started');
      timer = setInterval(() => {
        recordingTime.value++;
      }, 1000);
      console.log('🎤 Recording started');
    } catch (error) {
      console.error('🎤 Failed to start recording:', error);
      alert('Failed to start recording with selected microphone. Please try a different microphone.');
    }
  }
};

const onDeviceChange = (newDeviceId) => {
  console.log('🎤 Microphone device changed to:', newDeviceId);
  setSelectedDevice(newDeviceId);
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
  gap: 15px;
  flex-wrap: wrap;
}

.recording-status {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  visibility: hidden;
  height: 0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.recording-status.visible {
  opacity: 1;
  visibility: visible;
  height: 24px;
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
  min-width: 120px;
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

.recording-indicator {
  width: 15px;
  height: 15px;
  background-color: #EF4444;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.7; }
}

.recording-time {
  font-weight: 600;
  color: white;
  font-size: 14px;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* Compact mode styles */
.audio-recorder.compact {
  width: auto;
}

.audio-recorder.compact .recorder-controls {
  flex-direction: row;
  gap: 6px;
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

.recording-status.compact {
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
}

.recording-status.compact.visible {
  opacity: 1;
}

.recording-status.compact .recording-indicator {
  width: 6px;
  height: 6px;
}

/* Microphone selector styles moved to MicrophoneSelector component */

</style>