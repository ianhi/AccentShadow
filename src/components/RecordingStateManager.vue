<template>
  <!-- This is a logical component with no visual representation -->
</template>

<script setup>
import { ref } from 'vue'
import { audioManager } from '../composables/useAudioManager.ts'

const emit = defineEmits([
  'recording-started',
  'recording-stopped',
  'recording-completed',
  'state-changed'
])

const isRecordingActive = ref(false)

const handleRecordingStarted = () => {
  console.log('🎤 RecordingStateManager: Recording started')
  isRecordingActive.value = true
  
  // Stop all audio when recording starts
  audioManager.emergencyStop('Recording started')
  
  emit('recording-started')
  emit('state-changed', { isRecording: true })
}

const handleRecordingStopped = () => {
  console.log('🎤 RecordingStateManager: Recording stopped')
  isRecordingActive.value = false
  
  emit('recording-stopped')
  emit('state-changed', { isRecording: false })
}

const handleRecordedAudio = async (blob) => {
  // Validate audio blob
  if (!blob || blob.size === 0) {
    console.warn('🎤 RecordingStateManager: Empty or invalid audio blob received, skipping processing')
    return
  }
  
  emit('recording-completed', blob)
  console.log('🎤 RecordingStateManager: Audio recording completed and emitted')
}

// Expose state and handlers
defineExpose({
  isRecordingActive,
  handleRecordingStarted,
  handleRecordingStopped,
  handleRecordedAudio
})
</script>

<style scoped>
/* No styles needed - this is a utility component */
</style>