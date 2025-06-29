<template>
  <!-- Hidden File Input -->
  <input 
    type="file" 
    accept="audio/*" 
    @change="handleFileSelection" 
    ref="hiddenFileInput"
    style="display: none;"
  />
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['file-selected'])

const hiddenFileInput = ref(null)

const triggerFileInput = () => {
  hiddenFileInput.value?.click()
}

const handleFileSelection = async (event) => {
  const file = event.target.files[0]
  if (file) {
    emit('file-selected', {
      file,
      source: { name: file.name, fileName: file.name }
    })
    
    // Reset the input so the same file can be selected again if needed
    event.target.value = ''
  }
}

// Expose the trigger function for parent components
defineExpose({
  triggerFileInput
})
</script>

<style scoped>
/* No visible styles needed - this is a utility component */
</style>