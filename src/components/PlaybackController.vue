<template>
  <!-- This is a logical component with no visual representation -->
</template>

<script setup>
import { audioManager } from '../composables/useAudioManager.ts'

const props = defineProps({
  targetAudioPlayerRef: {
    type: Object,
    default: null
  },
  userAudioPlayerRef: {
    type: Object,
    default: null
  },
  sequentialDelay: {
    type: Number,
    default: 0
  },
  globalPlaybackSpeed: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['playback-speed-updated'])

const playTarget = () => {
  if (props.targetAudioPlayerRef) {
    audioManager.emergencyStop('Playing target audio')
    props.targetAudioPlayerRef.play()
  }
}

const playUser = () => {
  if (props.userAudioPlayerRef) {
    audioManager.emergencyStop('Playing user audio')
    props.userAudioPlayerRef.play()
  }
}

const playOverlapping = async () => {
  audioManager.emergencyStop('Playing overlapping audio')
  
  const targetPlayer = props.targetAudioPlayerRef
  const userPlayer = props.userAudioPlayerRef
  
  if (targetPlayer && userPlayer) {
    try {
      // Play both simultaneously
      await Promise.all([
        targetPlayer.play(),
        userPlayer.play()
      ])
    } catch (error) {
      console.error('Error playing overlapping audio:', error)
    }
  } else if (targetPlayer) {
    targetPlayer.play()
  } else if (userPlayer) {
    userPlayer.play()
  }
}

const playSequential = async () => {
  audioManager.emergencyStop('Playing sequential audio')
  
  const targetPlayer = props.targetAudioPlayerRef
  const userPlayer = props.userAudioPlayerRef
  const delay = props.sequentialDelay || 0
  
  if (targetPlayer) {
    targetPlayer.play()
    
    if (userPlayer && delay > 0) {
      setTimeout(() => {
        userPlayer.play()
      }, delay)
    } else if (userPlayer) {
      // Play immediately after target finishes
      targetPlayer.wavesurfer?.on('finish', () => {
        userPlayer.play()
      })
    }
  } else if (userPlayer) {
    userPlayer.play()
  }
}

const stopAll = () => {
  audioManager.emergencyStop('Manual stop all')
}

const updatePlaybackSpeed = (newSpeed) => {
  // Update both players if they exist
  if (props.targetAudioPlayerRef) {
    props.targetAudioPlayerRef.setPlaybackRate(newSpeed)
  }
  if (props.userAudioPlayerRef) {
    props.userAudioPlayerRef.setPlaybackRate(newSpeed)
  }
  
  emit('playback-speed-updated', newSpeed)
}

// Expose all playback functions
defineExpose({
  playTarget,
  playUser,
  playOverlapping,
  playSequential,
  stopAll,
  updatePlaybackSpeed
})
</script>

<style scoped>
/* No styles needed - this is a utility component */
</style>