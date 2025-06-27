<template>
  <div class="audio-recorder">
    <div class="recorder-controls">
      <button @click="toggleRecording" :class="{ 'recording': isRecording }">
        {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
      </button>
      <div class="recording-status" :class="{ 'visible': isRecording }">
        <span class="recording-indicator"></span>
        <span class="recording-time">{{ formatTime(recordingTime) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import { useAudioRecorder } from '../composables/useAudioRecorder';

const emit = defineEmits(['recorded', 'recording-started', 'recording-stopped']);

const { isRecording, recordingTime, startRecording, stopRecording } = useAudioRecorder();

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
    console.log('🎤 Starting recording...');
    await startRecording(null); // No waveform container - we'll handle visualization in AudioPlayer
    emit('recording-started');
    timer = setInterval(() => {
      recordingTime.value++;
    }, 1000);
    console.log('🎤 Recording started');
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

.audio-recorder button {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background-color: #10B981;
  color: white;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.audio-recorder button:hover {
  background-color: #059669;
}

.audio-recorder button.recording {
  background-color: #EF4444;
}

.audio-recorder button.recording:hover {
  background-color: #DC2626;
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
  color: #1f2937;
  font-size: 14px;
  white-space: nowrap;
}

</style>