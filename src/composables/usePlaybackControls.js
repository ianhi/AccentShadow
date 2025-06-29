import { ref } from 'vue'
import { useAppStateInject } from './useAppState'

/**
 * Consolidated playback controls composable
 * Handles all audio playback functionality directly within the app state context
 */
export function usePlaybackControls(providedAppState = null) {
  // Use provided app state if available, otherwise try to inject, otherwise create local state
  let appState
  
  if (providedAppState) {
    appState = providedAppState
  } else {
    try {
      appState = useAppStateInject()
    } catch (error) {
      // If no app state is available, create local refs
      console.warn('usePlaybackControls: No app state available, using local state')
      appState = {
        targetAudioPlayerRef: ref(null),
        userAudioPlayerRef: ref(null),
        globalPlaybackSpeed: ref(1),
        updatePlaybackSpeed: (newSpeed) => {
          appState.globalPlaybackSpeed.value = newSpeed
        }
      }
    }
  }
  
  const { 
    targetAudioPlayerRef, 
    userAudioPlayerRef, 
    globalPlaybackSpeed, 
    updatePlaybackSpeed 
  } = appState

  // Audio manager for handling concurrent playback
  const audioManager = {
    activePlayback: null,
    
    emergencyStop(reason) {
      if (this.activePlayback) {
        console.log(`🛑 Emergency stop: ${reason}`)
        this.stopAll()
      }
    },
    
    stopAll() {
      if (targetAudioPlayerRef.value) {
        try {
          targetAudioPlayerRef.value.pause()
          targetAudioPlayerRef.value.currentTime = 0
        } catch (error) {
          console.error('Error stopping target audio:', error)
        }
      }
      
      if (userAudioPlayerRef.value) {
        try {
          userAudioPlayerRef.value.pause()
          userAudioPlayerRef.value.currentTime = 0
        } catch (error) {
          console.error('Error stopping user audio:', error)
        }
      }
      
      this.activePlayback = null
    }
  }

  // Update playback speed for both players
  const updatePlaybackSpeedValue = (newSpeed) => {
    updatePlaybackSpeed(newSpeed)
    
    // Apply speed to both audio players
    if (targetAudioPlayerRef.value) {
      targetAudioPlayerRef.value.playbackRate = newSpeed
    }
    if (userAudioPlayerRef.value) {
      userAudioPlayerRef.value.playbackRate = newSpeed
    }
  }

  // Individual playback controls
  const playTarget = async () => {
    audioManager.emergencyStop('Playing target audio')
    
    const player = targetAudioPlayerRef.value
    if (player) {
      try {
        player.playbackRate = globalPlaybackSpeed.value
        await player.play()
        audioManager.activePlayback = 'target'
      } catch (error) {
        console.error('Error playing target audio:', error)
      }
    }
  }

  const playUser = async () => {
    audioManager.emergencyStop('Playing user audio')
    
    const player = userAudioPlayerRef.value
    if (player) {
      try {
        player.playbackRate = globalPlaybackSpeed.value
        await player.play()
        audioManager.activePlayback = 'user'
      } catch (error) {
        console.error('Error playing user audio:', error)
      }
    }
  }

  const playOverlapping = async () => {
    audioManager.emergencyStop('Playing overlapping audio')
    
    const targetPlayer = targetAudioPlayerRef.value
    const userPlayer = userAudioPlayerRef.value
    
    if (targetPlayer && userPlayer) {
      try {
        // Set playback rate for both
        targetPlayer.playbackRate = globalPlaybackSpeed.value
        userPlayer.playbackRate = globalPlaybackSpeed.value
        
        // Play both simultaneously
        await Promise.all([
          targetPlayer.play(),
          userPlayer.play()
        ])
        audioManager.activePlayback = 'overlapping'
      } catch (error) {
        console.error('Error playing overlapping audio:', error)
      }
    } else if (targetPlayer) {
      await playTarget()
    } else if (userPlayer) {
      await playUser()
    }
  }

  const playSequential = async (sequentialDelay = 0) => {
    audioManager.emergencyStop('Playing sequential audio')
    
    const targetPlayer = targetAudioPlayerRef.value
    const userPlayer = userAudioPlayerRef.value
    
    if (targetPlayer && userPlayer) {
      try {
        // Set playback rate for both
        targetPlayer.playbackRate = globalPlaybackSpeed.value
        userPlayer.playbackRate = globalPlaybackSpeed.value
        
        // Play target first
        await targetPlayer.play()
        
        // Wait for target to finish, then add delay
        await new Promise(resolve => {
          const onTargetEnd = () => {
            targetPlayer.removeEventListener('ended', onTargetEnd)
            setTimeout(resolve, sequentialDelay)
          }
          targetPlayer.addEventListener('ended', onTargetEnd)
        })
        
        // Play user audio
        await userPlayer.play()
        audioManager.activePlayback = 'sequential'
      } catch (error) {
        console.error('Error playing sequential audio:', error)
      }
    } else if (targetPlayer) {
      await playTarget()
    } else if (userPlayer) {
      await playUser()
    }
  }

  const stopAll = () => {
    audioManager.stopAll()
  }

  return {
    // Playback controls
    playTarget,
    playUser,
    playOverlapping,
    playSequential,
    stopAll,
    
    // Speed control
    updatePlaybackSpeed: updatePlaybackSpeedValue,
    
    // Audio manager for external access
    audioManager
  }
}