import { ref, type Ref } from 'vue'
import { useAppStateInject, type AppState } from './useAppState'
import { audioManager as globalAudioManager } from './useAudioManager'

// Types
interface AudioPlayer {
  play?: () => Promise<void> | void;
  stop?: () => void;
  pause?: () => void;
  setPlaybackRate?: (rate: number) => void;
  playbackRate?: number;
  currentTime?: number;
  wavesurfer?: any;
  playerInfo?: () => any;
  audioElement?: HTMLAudioElement;
}

interface AudioManager {
  activePlayback: string | null;
  emergencyStop: (reason: string, newPlaybackType?: string | null) => void;
  stopAll: () => void;
}

interface LocalAppState {
  targetAudioPlayerRef: Ref<AudioPlayer | null>;
  userAudioPlayerRef: Ref<AudioPlayer | null>;
  globalPlaybackSpeed: Ref<number>;
  updatePlaybackSpeed: (newSpeed: number) => void;
}

/**
 * Consolidated playback controls composable
 * Handles all audio playback functionality directly within the app state context
 */
export function usePlaybackControls(providedAppState: AppState | null = null) {
  // Use provided app state if available, otherwise try to inject, otherwise create local state
  let appState: AppState | LocalAppState
  
  if (providedAppState) {
    appState = providedAppState
  } else {
    try {
      appState = useAppStateInject()
    } catch (error) {
      // If no app state is available, create local refs
      console.warn('usePlaybackControls: No app state available, using local state')
      appState = {
        targetAudioPlayerRef: ref<AudioPlayer | null>(null),
        userAudioPlayerRef: ref<AudioPlayer | null>(null),
        globalPlaybackSpeed: ref<number>(1),
        updatePlaybackSpeed: (newSpeed: number) => {
          (appState as LocalAppState).globalPlaybackSpeed.value = newSpeed
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
  const getAudioPlayer = (playerRef: Ref<AudioPlayer | null>): AudioPlayer | null => {
    if (!playerRef?.value) {
      return null
    }
    
    // Check if it's an AudioPlayer component (has play method)
    if (typeof playerRef.value.play === 'function') {
      return playerRef.value
    }
    
    // If it's a mock/test audio element (for testing)
    if (playerRef.value.audioElement) {
      return playerRef.value
    }
    
    // Check if it has audio element methods directly
    if (playerRef.value.play && playerRef.value.pause) {
      return playerRef.value
    }
    
    return null
  }

  // Audio manager for handling concurrent playback
  const audioManager: AudioManager = {
    activePlayback: null,
    
    emergencyStop(reason: string, newPlaybackType: string | null = null): void {
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
    
    stopAll(): void {
      const targetPlayer = getAudioPlayer(targetAudioPlayerRef)
      const userPlayer = getAudioPlayer(userAudioPlayerRef)
      
      if (targetPlayer) {
        try {
          // For AudioPlayer components, use stop method
          if (typeof targetPlayer.stop === 'function') {
            targetPlayer.stop()
          } else {
            // For raw audio elements (testing)
            if (targetPlayer.pause) targetPlayer.pause()
            if (targetPlayer.currentTime !== undefined) targetPlayer.currentTime = 0
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
            if (userPlayer.pause) userPlayer.pause()
            if (userPlayer.currentTime !== undefined) userPlayer.currentTime = 0
          }
        } catch (error) {
          console.error('Error stopping user audio:', error)
        }
      }
      
      this.activePlayback = null
    }
  }

  // Update playback speed for both players
  const updatePlaybackSpeedValue = (newSpeed: number): void => {
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
        if (targetPlayer.playbackRate !== undefined) {
          targetPlayer.playbackRate = newSpeed
        }
      }
    }
    if (userPlayer) {
      // For AudioPlayer components, use setPlaybackRate method
      if (typeof userPlayer.setPlaybackRate === 'function') {
        userPlayer.setPlaybackRate(newSpeed)
      } else {
        // For raw audio elements (testing)
        if (userPlayer.playbackRate !== undefined) {
          userPlayer.playbackRate = newSpeed
        }
      }
    }
  }

  // Individual playback controls
  const playTarget = async (): Promise<void> => {
    audioManager.emergencyStop('Playing target audio', 'target')
    
    const targetPlayer = getAudioPlayer(targetAudioPlayerRef)
    
    if (targetPlayer) {
      try {
        // Set playback rate first
        if (typeof targetPlayer.setPlaybackRate === 'function') {
          targetPlayer.setPlaybackRate(globalPlaybackSpeed.value)
        } else {
          if (targetPlayer.playbackRate !== undefined) {
            targetPlayer.playbackRate = globalPlaybackSpeed.value
          }
        }
        
        await targetPlayer.play?.()
        audioManager.activePlayback = 'target'
      } catch (error) {
        console.error('❌ Error playing target audio:', error)
      }
    }
  }

  const playUser = async (): Promise<void> => {
    audioManager.emergencyStop('Playing user audio', 'user')
    
    const userPlayer = getAudioPlayer(userAudioPlayerRef)
    
    if (userPlayer) {
      try {
        // Set playback rate first
        if (typeof userPlayer.setPlaybackRate === 'function') {
          userPlayer.setPlaybackRate(globalPlaybackSpeed.value)
        } else {
          if (userPlayer.playbackRate !== undefined) {
            userPlayer.playbackRate = globalPlaybackSpeed.value
          }
        }
        
        await userPlayer.play?.()
        audioManager.activePlayback = 'user'
      } catch (error) {
        console.error('❌ Error playing user audio:', error)
      }
    }
  }

  const playOverlapping = async (): Promise<void> => {
    console.log('🎵 playOverlapping called')
    const targetPlayer = getAudioPlayer(targetAudioPlayerRef)
    const userPlayer = getAudioPlayer(userAudioPlayerRef)
    
    console.log('🎵 Player availability:', { targetPlayer: !!targetPlayer, userPlayer: !!userPlayer })
    
    if (targetPlayer && userPlayer) {
      try {
        // Set playback rate for both
        if (typeof targetPlayer.setPlaybackRate === 'function') {
          targetPlayer.setPlaybackRate(globalPlaybackSpeed.value)
        } else {
          if (targetPlayer.playbackRate !== undefined) {
            targetPlayer.playbackRate = globalPlaybackSpeed.value
          }
        }
        
        if (typeof userPlayer.setPlaybackRate === 'function') {
          userPlayer.setPlaybackRate(globalPlaybackSpeed.value)
        } else {
          if (userPlayer.playbackRate !== undefined) {
            userPlayer.playbackRate = globalPlaybackSpeed.value
          }
        }
        
        // Stop any existing playback in our local manager
        if (audioManager.activePlayback) {
          audioManager.stopAll()
        }
        
        // Use the global manager's playOverlapping method by getting playerInfo
        const targetPlayerInfo = targetPlayer.playerInfo?.()
        const userPlayerInfo = userPlayer.playerInfo?.()
        
        console.log('🎵 Player info availability:', { targetPlayerInfo: !!targetPlayerInfo, userPlayerInfo: !!userPlayerInfo })
        
        if (targetPlayerInfo && userPlayerInfo) {
          console.log('🎵 Using global audio manager for overlapping playback')
          await globalAudioManager.playOverlapping([targetPlayerInfo, userPlayerInfo])
        } else {
          // Fallback: manually coordinate by directly calling WaveSurfer instances
          console.log('🎵 Falling back to direct WaveSurfer control')
          const targetWavesurfer = targetPlayer.wavesurfer
          const userWavesurfer = userPlayer.wavesurfer
          
          console.log('🎵 WaveSurfer availability:', { targetWavesurfer: !!targetWavesurfer, userWavesurfer: !!userWavesurfer })
          
          if (targetWavesurfer && userWavesurfer) {
            // Stop any existing playback on the wavesurfer instances
            if (targetWavesurfer.isPlaying()) targetWavesurfer.pause()
            if (userWavesurfer.isPlaying()) userWavesurfer.pause()
            
            // Play both simultaneously
            console.log('🎵 Starting overlapping playback with WaveSurfer fallback')
            await Promise.all([
              targetWavesurfer.play(),
              userWavesurfer.play()
            ])
            console.log('🎵 Overlapping playback started successfully')
          }
        }
        
        audioManager.activePlayback = 'overlapping'
      } catch (error) {
        console.error('❌ Error playing overlapping audio:', error)
      }
    } else if (targetPlayer) {
      console.log('🎵 Only target player available, playing target only')
      await playTarget()
    } else if (userPlayer) {
      console.log('🎵 Only user player available, playing user only')
      await playUser()
    } else {
      console.warn('🎵 No players available for overlapping playback')
    }
  }

  const playSequential = async (sequentialDelay: number = 0): Promise<void> => {
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
          if (targetPlayer.playbackRate !== undefined) {
            targetPlayer.playbackRate = globalPlaybackSpeed.value
          }
        }
        
        if (typeof userPlayer.setPlaybackRate === 'function') {
          userPlayer.setPlaybackRate(globalPlaybackSpeed.value)
        } else {
          if (userPlayer.playbackRate !== undefined) {
            userPlayer.playbackRate = globalPlaybackSpeed.value
          }
        }
        
        // Play target first
        await targetPlayer.play?.()
        
        // Listen for the target audio to finish, then play user audio
        const targetWavesurfer = targetPlayer.wavesurfer
        if (targetWavesurfer) {
          // Set up one-time finish listener for event-driven sequential playback
          const handleTargetFinish = async (): Promise<void> => {
            // Remove the listener to prevent memory leaks
            targetWavesurfer.un('finish', handleTargetFinish)
            
            // Apply sequential delay if specified
            if (sequentialDelay > 0) {
              setTimeout(async () => {
                await userPlayer.play?.()
              }, sequentialDelay)
            } else {
              await userPlayer.play?.()
            }
          }
          
          targetWavesurfer.once('finish', handleTargetFinish)
        } else {
          // Fallback: use a reasonable default duration adjusted for playback rate
          const fallbackDuration = 2000 / globalPlaybackSpeed.value
          setTimeout(async () => {
            await userPlayer.play?.()
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

  const stopAll = (): void => {
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