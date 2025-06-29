<template>
  <!-- This is a logical component with no visual representation -->
</template>

<script setup>
import { useIndexedDB } from '../composables/useIndexedDB.ts'
import { useRecordingSets } from '../composables/useRecordingSets'

const { addRecording, deleteRecording } = useIndexedDB()
const { markRecordingCompleted } = useRecordingSets()

const emit = defineEmits([
  'recording-saved',
  'recording-deleted', 
  'recording-loaded',
  'recording-completed',
  'operation-error'
])

const saveRecording = async (targetBlob, userBlob) => {
  if (!targetBlob || !userBlob) {
    emit('operation-error', { 
      message: 'Cannot save recording: missing target or user audio',
      operation: 'save'
    })
    return
  }
  
  try {
    await addRecording(targetBlob, userBlob)
    emit('recording-saved', { targetBlob, userBlob })
    console.log('Recording saved successfully')
  } catch (error) {
    console.error('Error saving recording:', error)
    emit('operation-error', {
      message: 'Failed to save recording',
      error,
      operation: 'save'
    })
  }
}

const loadSavedRecording = (recording) => {
  // Load saved recording logic would go here
  console.log('Loading saved recording:', recording)
  emit('recording-loaded', recording)
}

const deleteSavedRecording = async (id) => {
  try {
    await deleteRecording(id)
    emit('recording-deleted', { id })
    console.log('Recording deleted:', id)
  } catch (error) {
    console.error('Error deleting recording:', error)
    emit('operation-error', {
      message: 'Failed to delete recording',
      error,
      operation: 'delete'
    })
  }
}

const markCurrentCompleted = (currentRecording) => {
  if (currentRecording && !currentRecording.userRecording?.isCompleted) {
    markRecordingCompleted()
    emit('recording-completed', currentRecording)
    console.log('✅ Marked current recording as completed via button')
  }
}

// Expose all recording management functions
defineExpose({
  saveRecording,
  loadSavedRecording,
  deleteSavedRecording,
  markCurrentCompleted
})
</script>

<style scoped>
/* No styles needed - this is a utility component */
</style>