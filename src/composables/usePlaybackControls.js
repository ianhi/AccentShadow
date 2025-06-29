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

  // Helper function to get audio player component ref
  const getAudioPlayer = (playerRef) => {
    if (!playerRef?.value) {
      return null
    }
    
    // Check if it's an AudioPlayer component (has play method)
    if (typeof playerRef.value.play === 'function') {
      return playerRef.value
    }
    
    // If it's a mock/test audio element (for testing)
    if (playerRef.value.audioElement || (playerRef.value.play && playerRef.value.pause)) {
      return playerRef.value.audioElement || playerRef.value
    }
    
    return null
  }

  // Audio manager for handling concurrent playback
  const audioManager = {
    activePlayback: null,
    
    emergencyStop(reason, newPlaybackType = null) {
      // For overlapping and sequential playback, we want both players available
      // so only stop if we're changing to a single-player mode or stopping entirely
      if (this.activePlayback && this.activePlayback !== newPlaybackType) {
        // Don't stop all for overlapping/sequential - let them manage their own timing
        if (newPlaybackType !== 'overlapping' && newPlaybackType !== 'sequential') {
          this.stopAll()
        } else {
          // For overlapping/sequential, just update the state but let the functions handle stopping
          this.activePlayback = null
        }
      }
    },
    
    stopAll() {
      const targetPlayer = getAudioPlayer(targetAudioPlayerRef)
      const userPlayer = getAudioPlayer(userAudioPlayerRef)
      
      if (targetPlayer) {
        try {
          // For AudioPlayer components, use stop method
          if (typeof targetPlayer.stop === 'function') {
            targetPlayer.stop()
          } else {
            // For raw audio elements (testing)
            targetPlayer.pause()
            targetPlayer.currentTime = 0
          }
        } catch (error) {
          console.error('Error stopping target audio:', error)
        }
      }
      
      if (userPlayer) {
        try {
          // For AudioPlayer components, use stop method
          if (typeof userPlayer.stop === 'function') {
            userPlayer.stop()
          } else {
            // For raw audio elements (testing)
            userPlayer.pause()
            userPlayer.currentTime = 0
          }
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
    const targetPlayer = getAudioPlayer(targetAudioPlayerRef)
    const userPlayer = getAudioPlayer(userAudioPlayerRef)
    
    if (targetPlayer) {
      // For AudioPlayer components, use setPlaybackRate method
      if (typeof targetPlayer.setPlaybackRate === 'function') {
        targetPlayer.setPlaybackRate(newSpeed)
      } else {
        // For raw audio elements (testing)
        targetPlayer.playbackRate = newSpeed
      }
    }
    if (userPlayer) {
      // For AudioPlayer components, use setPlaybackRate method
      if (typeof userPlayer.setPlaybackRate === 'function') {
        userPlayer.setPlaybackRate(newSpeed)
      } else {
        // For raw audio elements (testing)
        userPlayer.playbackRate = newSpeed
      }
    }
  }

  // Individual playback controls
  const playTarget = async () => {
    audioManager.emergencyStop('Playing target audio', 'target')
    
    const targetPlayer = getAudioPlayer(targetAudioPlayerRef)
    
    if (targetPlayer) {
      try {
        // Set playback rate first
        if (typeof targetPlayer.setPlaybackRate === 'function') {
          targetPlayer.setPlaybackRate(globalPlaybackSpeed.value)
        } else {
          targetPlayer.playbackRate = globalPlaybackSpeed.value
        }
        
        await targetPlayer.play()
        audioManager.activePlayback = 'target'
      } catch (error) {
        console.error('❌ Error playing target audio:', error)
      }
    }
  }

  const playUser = async () => {
    audioManager.emergencyStop('Playing user audio', 'user')
    
    const userPlayer = getAudioPlayer(userAudioPlayerRef)
    
    if (userPlayer) {
      try {
        // Set playback rate first
        if (typeof userPlayer.setPlaybackRate === 'function') {
          userPlayer.setPlaybackRate(globalPlaybackSpeed.value)
        } else {
          userPlayer.playbackRate = globalPlaybackSpeed.value
        }
        
        await userPlayer.play()
        audioManager.activePlayback = 'user'
      } catch (error) {
        console.error('❌ Error playing user audio:', error)
      }
    }
  }

  const playOverlapping = async () => {
    const targetPlayer = getAudioPlayer(targetAudioPlayerRef)
    const userPlayer = getAudioPlayer(userAudioPlayerRef)
    
    if (targetPlayer && userPlayer) {
      try {
        // Set playback rate for both
        if (typeof targetPlayer.setPlaybackRate === 'function') {
          targetPlayer.setPlaybackRate(globalPlaybackSpeed.value)
        } else {
          targetPlayer.playbackRate = globalPlaybackSpeed.value
        }
        
        if (typeof userPlayer.setPlaybackRate === 'function') {
          userPlayer.setPlaybackRate(globalPlaybackSpeed.value)
        } else {
          userPlayer.playbackRate = globalPlaybackSpeed.value
        }
        
        // Stop any existing playback in our local manager
        if (audioManager.activePlayback) {
          audioManager.stopAll()
        }
        
        // Import the global audioManager for proper overlapping support
        const { audioManager: globalAudioManager } = await import('./useAudioManager')
        
        // Use the global manager's playOverlapping method by getting playerInfo
        const targetPlayerInfo = targetPlayer.playerInfo?.()
        const userPlayerInfo = userPlayer.playerInfo?.()
        
        if (targetPlayerInfo && userPlayerInfo) {
          await globalAudioManager.playOverlapping([targetPlayerInfo, userPlayerInfo])
        } else {
          // Fallback: manually coordinate by directly calling WaveSurfer instances
          const targetWavesurfer = targetPlayer.wavesurfer
          const userWavesurfer = userPlayer.wavesurfer
          
          if (targetWavesurfer && userWavesurfer) {
            // Stop any existing playback on the wavesurfer instances
            if (targetWavesurfer.isPlaying()) targetWavesurfer.pause()
            if (userWavesurfer.isPlaying()) userWavesurfer.pause()
            
            // Play both simultaneously
            await Promise.all([
              targetWavesurfer.play(),
              userWavesurfer.play()
            ])
          }
        }
        
        audioManager.activePlayback = 'overlapping'
      } catch (error) {
        console.error('❌ Error playing overlapping audio:', error)
      }
    } else if (targetPlayer) {
      await playTarget()
    } else if (userPlayer) {
      await playUser()
    }
  }

  const playSequential = async (sequentialDelay = 0) => {
    // Stop any existing playback first
    if (audioManager.activePlayback) {
      audioManager.stopAll()
    }
    
    const targetPlayer = getAudioPlayer(targetAudioPlayerRef)
    const userPlayer = getAudioPlayer(userAudioPlayerRef)
    
    if (targetPlayer && userPlayer) {
      try {
        // Set playback rate for both
        if (typeof targetPlayer.setPlaybackRate === 'function') {
          targetPlayer.setPlaybackRate(globalPlaybackSpeed.value)
        } else {
          targetPlayer.playbackRate = globalPlaybackSpeed.value
        }
        
        if (typeof userPlayer.setPlaybackRate === 'function') {
          userPlayer.setPlaybackRate(globalPlaybackSpeed.value)
        } else {
          userPlayer.playbackRate = globalPlaybackSpeed.value
        }
        
        // Play target first
        await targetPlayer.play()
        
        // Get the actual duration from the target player and wait for it to finish
        const targetWavesurfer = targetPlayer.wavesurfer
        if (targetWavesurfer) {
          const baseDuration = targetWavesurfer.getDuration() * 1000 // Convert to ms
          // Account for playback rate - if playing at 2x speed, it takes half the time
          const adjustedDuration = baseDuration / globalPlaybackSpeed.value
          const totalWaitTime = adjustedDuration + sequentialDelay
          
          setTimeout(async () => {
            await userPlayer.play()
          }, totalWaitTime)
        } else {
          // Fallback: use a reasonable default duration adjusted for playback rate
          const fallbackDuration = 2000 / globalPlaybackSpeed.value
          setTimeout(async () => {
            await userPlayer.play()
          }, fallbackDuration + sequentialDelay)
        }
        
        audioManager.activePlayback = 'sequential'
      } catch (error) {
        console.error('❌ Error playing sequential audio:', error)
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