<template>
  <!-- This is a logical component with no visual representation -->
</template>

<script setup>
const props = defineProps({
  audioVisualizationPanel: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'auto-play-toggled',
  'auto-align-toggled', 
  'manual-align-triggered',
  'sequential-delay-updated'
])

// Audio processing control handlers
const toggleAutoPlay = (event) => {
  if (props.audioVisualizationPanel) {
    const newValue = event.target.checked
    props.audioVisualizationPanel.autoPlayBoth = newValue
    emit('auto-play-toggled', newValue)
    console.log('🔄 Auto-play toggled:', newValue)
  }
}

const toggleAutoAlign = (event) => {
  if (props.audioVisualizationPanel) {
    const newValue = event.target.checked
    props.audioVisualizationPanel.autoAlignEnabled = newValue
    emit('auto-align-toggled', newValue)
    console.log('✂️ Auto-align toggled:', newValue)
  }
}

const manualAlign = () => {
  if (props.audioVisualizationPanel) {
    props.audioVisualizationPanel.manualAlign()
    emit('manual-align-triggered')
    console.log('🔧 Manual alignment triggered')
  }
}

const updateSequentialDelay = (event) => {
  if (props.audioVisualizationPanel) {
    const newValue = parseInt(event.target.value)
    props.audioVisualizationPanel.sequentialDelay = newValue
    emit('sequential-delay-updated', newValue)
    console.log('📋 Sequential delay updated:', newValue + 'ms')
  }
}

// Expose all processing handlers
defineExpose({
  toggleAutoPlay,
  toggleAutoAlign,
  manualAlign,
  updateSequentialDelay
})
</script>

<style scoped>
/* No styles needed - this is a utility component */
</style>