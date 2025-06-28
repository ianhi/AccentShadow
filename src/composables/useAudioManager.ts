import { ref, reactive, readonly } from 'vue';

interface PlayerInfo {
  id: string;
  type: string;
  wavesurfer: any;
  isReady?: boolean;
}

// Global audio manager state
const currentlyPlaying = ref<PlayerInfo | null>(null);
const playQueue = ref<PlayerInfo[]>([]);
const isSequentialPlaybackActive = ref(false);

export function useAudioManager() {
  // Register an audio player with the manager
  const registerPlayer = (id: string, type: string, wavesurferInstance: any): PlayerInfo => {
    console.log(`🎼 Registering audio player: ${id} (${type})`);
    return {
      id,
      type,
      wavesurfer: wavesurferInstance
    };
  };

  // Stop all currently playing audio
  const stopAll = () => {
    console.log('🎼 Stopping all audio playback');
    
    if (currentlyPlaying.value) {
      try {
        if (currentlyPlaying.value.wavesurfer && currentlyPlaying.value.wavesurfer.isPlaying()) {
          currentlyPlaying.value.wavesurfer.pause();
          console.log(`🎼 Stopped ${currentlyPlaying.value.id} (${currentlyPlaying.value.type})`);
        }
      } catch (error) {
        console.warn('🎼 Error stopping audio:', error);
      }
      currentlyPlaying.value = null;
    }
    
    // Clear any pending sequential playback
    isSequentialPlaybackActive.value = false;
    playQueue.value = [];
  };

  // Start playing a specific audio with exclusive control
  const play = (playerInfo: PlayerInfo, onFinish: (() => void) | null = null): boolean => {
    console.log(`🎼 Request to play: ${playerInfo.id} (${playerInfo.type})`);
    
    // Stop any currently playing audio first
    if (currentlyPlaying.value && currentlyPlaying.value.id !== playerInfo.id) {
      console.log(`🎼 Stopping current audio: ${currentlyPlaying.value.id} to play ${playerInfo.id}`);
      stopAll();
    }

    if (!playerInfo.wavesurfer) {
      console.error(`🎼 No WaveSurfer instance for ${playerInfo.id}`);
      return false;
    }

    try {
      currentlyPlaying.value = playerInfo;
      
      // Set up finish handler
      const handleFinish = () => {
        console.log(`🎼 Audio finished: ${playerInfo.id} (${playerInfo.type})`);
        if (currentlyPlaying.value && currentlyPlaying.value.id === playerInfo.id) {
          currentlyPlaying.value = null;
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
        if (currentlyPlaying.value && currentlyPlaying.value.id === playerInfo.id) {
          console.log(`🎼 Audio paused: ${playerInfo.id}`);
          currentlyPlaying.value = null;
        }
      });

      console.log(`🎼 Starting playback: ${playerInfo.id} (${playerInfo.type})`);
      playerInfo.wavesurfer.play();
      return true;
    } catch (error) {
      console.error(`🎼 Error playing ${playerInfo.id}:`, error);
      currentlyPlaying.value = null;
      return false;
    }
  };

  // Sequential playback with proper coordination
  const playSequential = async (players: PlayerInfo[], delays: number[] = []): Promise<void> => {
    console.log('🎼 Starting sequential playback with', players.length, 'players');
    
    // Stop any current playback
    stopAll();
    isSequentialPlaybackActive.value = true;

    for (let i = 0; i < players.length; i++) {
      // Check if sequential playback was cancelled
      if (!isSequentialPlaybackActive.value) {
        console.log('🎼 Sequential playback cancelled');
        return;
      }

      const player = players[i];
      const delay = delays[i] || 0;

      console.log(`🎼 Sequential step ${i + 1}: Playing ${player.id} (${player.type})`);
      
      if (delay > 0) {
        console.log(`🎼 Waiting ${delay}ms before playing ${player.id}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Check again after delay
      if (!isSequentialPlaybackActive.value) {
        console.log('🎼 Sequential playback cancelled after delay');
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
          console.warn(`🎼 Failed to play ${player.id}, continuing sequence`);
          resolve();
        }
      });
    }

    isSequentialPlaybackActive.value = false;
    console.log('🎼 Sequential playback completed');
  };

  // Get current playback state
  const getCurrentlyPlaying = (): PlayerInfo | null => currentlyPlaying.value;
  const isPlaying = (): boolean => !!currentlyPlaying.value;
  const isSequentialActive = (): boolean => isSequentialPlaybackActive.value;

  // Emergency stop for recordings or other interruptions
  const emergencyStop = (reason: string = 'Emergency stop'): void => {
    console.log(`🎼 ${reason} - stopping all audio`);
    stopAll();
  };

  return {
    registerPlayer,
    play,
    stopAll,
    playSequential,
    emergencyStop,
    getCurrentlyPlaying,
    isPlaying,
    isSequentialActive,
    // Reactive state for components to watch
    currentlyPlaying: readonly(currentlyPlaying),
    isSequentialPlaybackActive: readonly(isSequentialPlaybackActive)
  };
}

// Create a singleton instance for global use
export const audioManager = useAudioManager();