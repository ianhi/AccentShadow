<template>
  <div class="audio-recorder">
    <div class="recorder-controls">
      <button @click="toggleRecording" :class="{ 'recording': isRecording }" class="record-btn">
        <span class="btn-icon">{{ isRecording ? '⏹' : '🎤' }}</span>
        <span>{{ isRecording ? 'Stop Recording' : 'Start Recording' }}</span>
      </button>
      <div class="recording-status" :class="{ 'visible': isRecording }">
        <span class="recording-indicator"></span>
        <span class="recording-time">{{ formatTime(recordingTime) }}</span>
      </div>
    </div>
    
    <!-- Microphone Selection -->
    <div class="microphone-selection" v-if="availableDevices.length > 1 && !isRecording">
      <div class="mic-dropdown-container">
        <label class="mic-label">🎙️ Microphone:</label>
        <select 
          v-model="selectedDeviceId" 
          @change="onDeviceChange"
          class="mic-dropdown"
          :disabled="isRecording"
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
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import { useAudioRecorder } from '../composables/useAudioRecorder';
import { useMicrophoneDevices } from '../composables/useMicrophoneDevices';

const emit = defineEmits(['recorded', 'recording-started', 'recording-stopped']);

const { isRecording, recordingTime, startRecording, stopRecording } = useAudioRecorder();
const { availableDevices, selectedDeviceId, setSelectedDevice, getMediaStream } = useMicrophoneDevices();

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

const onDeviceChange = () => {
  console.log('🎤 Microphone device changed to:', selectedDeviceId.value);
  setSelectedDevice(selectedDeviceId.value);
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
}

.mic-label {
  font-size: 12px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
}

.mic-dropdown {
  background-color: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: white;
  padding: 4px 8px;
  font-size: 12px;
  min-width: 180px;
  backdrop-filter: blur(5px);
  cursor: pointer;
}

.mic-dropdown:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
}

.mic-dropdown option {
  background-color: #374151;
  color: white;
  padding: 4px;
}

</style>