<template>
  <!-- This is a logical component with no visual representation -->
</template>

<script setup>
const emit = defineEmits(['audio-loaded', 'loading-error'])

const loadAudioFromUrl = async (url) => {
  if (!url || typeof url !== 'string') {
    emit('loading-error', { message: 'Invalid URL provided' })
    return
  }

  const trimmedUrl = url.trim()
  if (!trimmedUrl) {
    emit('loading-error', { message: 'Empty URL provided' })
    return
  }
  
  try {
    // Validate URL format
    new URL(trimmedUrl)
    
    // Fetch the audio file
    const response = await fetch(trimmedUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    // Convert to blob
    const blob = await response.blob()
    
    // Validate it's an audio file
    if (!blob.type.startsWith('audio/')) {
      throw new Error('URL does not point to an audio file')
    }
    
    // Emit successful load
    emit('audio-loaded', {
      blob,
      source: { url: trimmedUrl, name: trimmedUrl }
    })
    
  } catch (error) {
    console.error('Error loading audio from URL:', error)
    emit('loading-error', {
      message: `Failed to load audio from URL: ${error.message}`,
      error
    })
  }
}

// Expose the loading function
defineExpose({
  loadAudioFromUrl
})
</script>

<style scoped>
/* No styles needed - this is a utility component */
</style>