<template>
  <!-- This is a logical component with no visual representation -->
</template>

<script setup>
import { useRecordingSets } from '../composables/useRecordingSets'
const { markRecordingCompleted } = useRecordingSets()

const emit = defineEmits([
  'recording-completed',
  'operation-error'
])


const markCurrentCompleted = (currentRecording) => {
  if (currentRecording && !currentRecording.userRecording?.isCompleted) {
    markRecordingCompleted()
    emit('recording-completed', currentRecording)
    console.log('✅ Marked current recording as completed via button')
  }
}

// Expose recording management functions
defineExpose({
  markCurrentCompleted
})
</script>

<style scoped>
/* No styles needed - this is a utility component */
</style>