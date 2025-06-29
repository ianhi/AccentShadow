import { ref, reactive, readonly } from 'vue';

interface PlayerInfo {
  id: string;
  type: string;
  wavesurfer: any;
  isReady?: boolean;
}

// Global audio manager state
const currentlyPlaying = ref<PlayerInfo | null>(null);
const currentlyPlayingMultiple = ref<PlayerInfo[]>([]);
const playQueue = ref<PlayerInfo[]>([]);
const isSequentialPlaybackActive = ref(false);
const isOverlappingPlaybackActive = ref(false);

export function useAudioManager() {
  // Register an audio player with the manager
  const registerPlayer = (id: string, type: string, wavesurferInstance: any): PlayerInfo => {
    return {
      id,
      type,
      wavesurfer: wavesurferInstance
    };
  };

  // Stop all currently playing audio
  const stopAll = () => {
    // Stop single player
    if (currentlyPlaying.value) {
      try {
        if (currentlyPlaying.value.wavesurfer && currentlyPlaying.value.wavesurfer.isPlaying()) {
          currentlyPlaying.value.wavesurfer.pause();
        }
      } catch (error) {
        console.warn('🎼 Error stopping audio:', error);
      }
      currentlyPlaying.value = null;
    }
    
    // Stop multiple players (overlapping mode)
    if (currentlyPlayingMultiple.value.length > 0) {
      currentlyPlayingMultiple.value.forEach(player => {
        try {
          if (player.wavesurfer && player.wavesurfer.isPlaying()) {
            player.wavesurfer.pause();
          }
        } catch (error) {
          console.warn('🎼 Error stopping overlapping audio:', error);
        }
      });
      currentlyPlayingMultiple.value = [];
    }
    
    // Clear any pending sequential/overlapping playback
    isSequentialPlaybackActive.value = false;
    isOverlappingPlaybackActive.value = false;
    playQueue.value = [];
  };

  // Start playing a specific audio with exclusive control
  const play = (playerInfo: PlayerInfo, onFinish: (() => void) | null = null): boolean => {
    // If we're in overlapping mode, don't stop other players
    if (!isOverlappingPlaybackActive.value) {
      // Stop any currently playing audio first (normal exclusive mode)
      if (currentlyPlaying.value && currentlyPlaying.value.id !== playerInfo.id) {
        stopAll();
      }
    }

    if (!playerInfo.wavesurfer) {
      console.error(`🎼 No WaveSurfer instance for ${playerInfo.id}`);
      return false;
    }

    try {
      // In overlapping mode, add to the multiple players array
      if (isOverlappingPlaybackActive.value) {
        if (!currentlyPlayingMultiple.value.find(p => p.id === playerInfo.id)) {
          currentlyPlayingMultiple.value.push(playerInfo);
        }
      } else {
        currentlyPlaying.value = playerInfo;
      }
      
      // Set up finish handler
      const handleFinish = () => {
        if (isOverlappingPlaybackActive.value) {
          // Remove from multiple players array
          const index = currentlyPlayingMultiple.value.findIndex(p => p.id === playerInfo.id);
          if (index !== -1) {
            currentlyPlayingMultiple.value.splice(index, 1);
          }
          // If this was the last player, exit overlapping mode
          if (currentlyPlayingMultiple.value.length === 0) {
            isOverlappingPlaybackActive.value = false;
          }
        } else {
          if (currentlyPlaying.value && currentlyPlaying.value.id === playerInfo.id) {
            currentlyPlaying.value = null;
          }
        }
        if (onFinish) {
          onFinish();
        }
      };

      // Remove any existing finish listeners to avoid duplicates
      playerInfo.wavesurfer.un('finish');
      playerInfo.wavesurfer.on('finish', handleFinish);
      
      // Remove any existing pause listeners that might interfere
      playerInfo.wavesurfer.un('pause');
      playerInfo.wavesurfer.on('pause', () => {
        if (isOverlappingPlaybackActive.value) {
          // Remove from multiple players array
          const index = currentlyPlayingMultiple.value.findIndex(p => p.id === playerInfo.id);
          if (index !== -1) {
            currentlyPlayingMultiple.value.splice(index, 1);
          }
        } else {
          if (currentlyPlaying.value && currentlyPlaying.value.id === playerInfo.id) {
            currentlyPlaying.value = null;
          }
        }
      });

      playerInfo.wavesurfer.play();
      return true;
    } catch (error) {
      console.error(`🎼 Error playing ${playerInfo.id}:`, error);
      if (isOverlappingPlaybackActive.value) {
        const index = currentlyPlayingMultiple.value.findIndex(p => p.id === playerInfo.id);
        if (index !== -1) {
          currentlyPlayingMultiple.value.splice(index, 1);
        }
      } else {
        currentlyPlaying.value = null;
      }
      return false;
    }
  };

  // Sequential playback with proper coordination
  const playSequential = async (players: PlayerInfo[], delays: number[] = []): Promise<void> => {
    // Stop any current playback
    stopAll();
    isSequentialPlaybackActive.value = true;

    for (let i = 0; i < players.length; i++) {
      // Check if sequential playback was cancelled
      if (!isSequentialPlaybackActive.value) {
        return;
      }

      const player = players[i];
      const delay = delays[i] || 0;
      
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Check again after delay
      if (!isSequentialPlaybackActive.value) {
        return;
      }

      if (!player.wavesurfer || (!player.isReady && !player.wavesurfer.isReady)) {
        console.warn(`🎼 Player ${player.id} not ready, skipping`);
        continue;
      }

      // Play and wait for completion
      await new Promise<void>((resolve) => {
        const success = play(player, () => resolve());
        if (!success) {
          resolve();
        }
      });
    }

    isSequentialPlaybackActive.value = false;
  };

  // Get current playback state
  const getCurrentlyPlaying = (): PlayerInfo | null => currentlyPlaying.value;
  const isPlaying = (): boolean => !!currentlyPlaying.value;
  const isSequentialActive = (): boolean => isSequentialPlaybackActive.value;

  // Overlapping playback - play multiple players simultaneously
  const playOverlapping = async (players: PlayerInfo[]): Promise<void> => {
    // Stop any current playback first
    stopAll();
    
    // Enter overlapping mode
    isOverlappingPlaybackActive.value = true;
    
    // Start all players simultaneously
    const playPromises = players.map(player => {
      if (!player.wavesurfer) {
        console.error(`🎼 No WaveSurfer instance for ${player.id}`);
        return Promise.resolve(false);
      }
      
      return new Promise<boolean>((resolve) => {
        const success = play(player, () => resolve(true));
        if (!success) {
          resolve(false);
        }
      });
    });
    
    try {
      await Promise.all(playPromises);
    } catch (error) {
      console.error('🎼 Error in overlapping playback:', error);
      stopAll();
    }
  };

  // Emergency stop for recordings or other interruptions
  const emergencyStop = (reason: string = 'Emergency stop'): void => {
    stopAll();
  };

  return {
    registerPlayer,
    play,
    stopAll,
    playSequential,
    playOverlapping,
    emergencyStop,
    getCurrentlyPlaying,
    isPlaying,
    isSequentialActive,
    // Reactive state for components to watch
    currentlyPlaying: readonly(currentlyPlaying),
    currentlyPlayingMultiple: readonly(currentlyPlayingMultiple),
    isSequentialPlaybackActive: readonly(isSequentialPlaybackActive),
    isOverlappingPlaybackActive: readonly(isOverlappingPlaybackActive)
  };
}

// Create a singleton instance for global use
export const audioManager = useAudioManager();