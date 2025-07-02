import { ref, reactive, readonly } from 'vue';
import { audioLevelAnalysis, type AudioLevelInfo, type VolumeNormalizationResult } from './useAudioLevelAnalysis';

interface PlayerInfo {
  id: string;
  type: string;
  wavesurfer: any;
  isReady?: boolean;
  audioBlob?: Blob; // Add audio blob for volume analysis
  originalVolume?: number; // Store original volume before normalization
  normalizedVolume?: number; // Store normalized volume
  audioLevelInfo?: AudioLevelInfo; // Cache audio analysis results
}

// Volume normalization configuration
interface VolumeNormalizationConfig {
  enabled: boolean;
  targetLUFS: number;
  maxGain: number;
  balanceMode: 'target' | 'user' | 'average';
  smoothTransitions: boolean;
}

// Global audio manager state
const currentlyPlaying = ref<PlayerInfo | null>(null);
const currentlyPlayingMultiple = ref<PlayerInfo[]>([]);
const playQueue = ref<PlayerInfo[]>([]);
const isSequentialPlaybackActive = ref(false);
const isOverlappingPlaybackActive = ref(false);

// Volume normalization state
const volumeNormalizationConfig = ref<VolumeNormalizationConfig>({
  enabled: true,
  targetLUFS: -18, // Good for speech content
  maxGain: 4, // Maximum 4x gain (12 dB)
  balanceMode: 'average',
  smoothTransitions: true
});

const isAnalyzingAudio = ref(false);
const normalizationCache = new Map<string, VolumeNormalizationResult>();

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
  const stopAll = async () => {
    // Collect all players that need volume restoration
    const playersToRestore: PlayerInfo[] = [];
    
    // Stop single player
    if (currentlyPlaying.value) {
      try {
        if (currentlyPlaying.value.wavesurfer && currentlyPlaying.value.wavesurfer.isPlaying()) {
          currentlyPlaying.value.wavesurfer.pause();
        }
        if (currentlyPlaying.value.originalVolume !== undefined) {
          playersToRestore.push(currentlyPlaying.value);
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
          if (player.originalVolume !== undefined) {
            playersToRestore.push(player);
          }
        } catch (error) {
          console.warn('🎼 Error stopping overlapping audio:', error);
        }
      });
      currentlyPlayingMultiple.value = [];
    }
    
    // Restore original volumes if any were normalized
    if (playersToRestore.length > 0) {
      try {
        await restoreOriginalVolumes(playersToRestore);
      } catch (error) {
        console.warn('🎚️ Error restoring original volumes:', error);
      }
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

      console.log(`🎼 Calling wavesurfer.play() for ${playerInfo.id}`);
      playerInfo.wavesurfer.play();
      console.log(`🎼 Successfully started playback for ${playerInfo.id}`);
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

  // Volume normalization methods
  
  /**
   * Update volume normalization configuration
   */
  const updateVolumeNormalizationConfig = (config: Partial<VolumeNormalizationConfig>): void => {
    volumeNormalizationConfig.value = { ...volumeNormalizationConfig.value, ...config };
    console.log('🎚️ Volume normalization config updated:', volumeNormalizationConfig.value);
  };

  /**
   * Get cache key for normalization result
   */
  const getNormalizationCacheKey = (targetPlayer: PlayerInfo, userPlayer: PlayerInfo): string => {
    return `${targetPlayer.id}_${userPlayer.id}_${volumeNormalizationConfig.value.balanceMode}`;
  };

  /**
   * Apply volume normalization to WaveSurfer instances
   */
  const applyVolumeNormalization = async (targetPlayer: PlayerInfo, userPlayer: PlayerInfo): Promise<void> => {
    if (!volumeNormalizationConfig.value.enabled) {
      console.log('🎚️ Volume normalization disabled, using original volumes');
      return;
    }

    if (!targetPlayer.audioBlob || !userPlayer.audioBlob) {
      console.warn('🎚️ Missing audio blobs for volume normalization, skipping', {
        targetHasBlob: !!targetPlayer.audioBlob,
        userHasBlob: !!userPlayer.audioBlob,
        targetBlobSize: targetPlayer.audioBlob?.size || 'N/A',
        userBlobSize: userPlayer.audioBlob?.size || 'N/A'
      });
      return;
    }

    const cacheKey = getNormalizationCacheKey(targetPlayer, userPlayer);
    
    try {
      isAnalyzingAudio.value = true;
      
      // Check cache first
      let normalizationResult = normalizationCache.get(cacheKey);
      
      if (!normalizationResult) {
        console.log('🎚️ Analyzing audio levels for volume normalization...');
        
        // Analyze audio levels if not cached
        if (!targetPlayer.audioLevelInfo) {
          targetPlayer.audioLevelInfo = await audioLevelAnalysis.analyzeAudioLevel(targetPlayer.audioBlob);
        }
        
        if (!userPlayer.audioLevelInfo) {
          userPlayer.audioLevelInfo = await audioLevelAnalysis.analyzeAudioLevel(userPlayer.audioBlob);
        }

        // Calculate normalization gains
        normalizationResult = audioLevelAnalysis.calculateNormalizationGains(
          targetPlayer.audioLevelInfo,
          userPlayer.audioLevelInfo,
          {
            targetLUFS: volumeNormalizationConfig.value.targetLUFS,
            maxGain: volumeNormalizationConfig.value.maxGain,
            balanceMode: volumeNormalizationConfig.value.balanceMode
          }
        );

        // Cache the result
        normalizationCache.set(cacheKey, normalizationResult);
      }

      // Store original volumes if not already stored
      if (targetPlayer.originalVolume === undefined) {
        targetPlayer.originalVolume = targetPlayer.wavesurfer.getVolume() || 0.5;
      }
      if (userPlayer.originalVolume === undefined) {
        userPlayer.originalVolume = userPlayer.wavesurfer.getVolume() || 0.5;
      }

      // Calculate final volumes (original volume * normalization gain)
      const targetFinalVolume = Math.min((targetPlayer.originalVolume || 0.5) * normalizationResult.targetGain, 1.0);
      const userFinalVolume = Math.min((userPlayer.originalVolume || 0.5) * normalizationResult.userGain, 1.0);

      targetPlayer.normalizedVolume = targetFinalVolume;
      userPlayer.normalizedVolume = userFinalVolume;

      // Apply volumes with smooth transitions if enabled
      if (volumeNormalizationConfig.value.smoothTransitions) {
        // Smooth volume transition using Web Audio API
        await Promise.all([
          smoothVolumeTransition(targetPlayer, targetFinalVolume),
          smoothVolumeTransition(userPlayer, userFinalVolume)
        ]);
      } else {
        // Immediate volume change
        targetPlayer.wavesurfer.setVolume(targetFinalVolume);
        userPlayer.wavesurfer.setVolume(userFinalVolume);
      }

      console.log('🎚️ Volume normalization applied:', {
        target: {
          original: (targetPlayer.originalVolume || 0.5).toFixed(2),
          normalized: targetFinalVolume.toFixed(2),
          gain: normalizationResult.targetGain.toFixed(2) + 'x'
        },
        user: {
          original: (userPlayer.originalVolume || 0.5).toFixed(2),
          normalized: userFinalVolume.toFixed(2),
          gain: normalizationResult.userGain.toFixed(2) + 'x'
        }
      });

    } catch (error) {
      console.error('❌ Volume normalization failed:', error);
      // Fallback to original volumes
      if (targetPlayer.originalVolume !== undefined) {
        targetPlayer.wavesurfer.setVolume(targetPlayer.originalVolume);
      }
      if (userPlayer.originalVolume !== undefined) {
        userPlayer.wavesurfer.setVolume(userPlayer.originalVolume);
      }
    } finally {
      isAnalyzingAudio.value = false;
    }
  };

  /**
   * Smooth volume transition using requestAnimationFrame
   */
  const smoothVolumeTransition = async (player: PlayerInfo, targetVolume: number, duration: number = 200): Promise<void> => {
    if (!player.wavesurfer) return;
    
    const currentVolume = player.wavesurfer.getVolume() || 0.5;
    const volumeDiff = targetVolume - currentVolume;
    const startTime = performance.now();

    return new Promise<void>((resolve) => {
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use easeOut curve for smooth transition
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const newVolume = currentVolume + (volumeDiff * easeOut);
        
        player.wavesurfer.setVolume(newVolume);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  };

  /**
   * Restore original volumes (used when exiting overlapping mode)
   */
  const restoreOriginalVolumes = async (players: PlayerInfo[]): Promise<void> => {
    if (!volumeNormalizationConfig.value.smoothTransitions) {
      // Immediate restore
      players.forEach(player => {
        if (player.originalVolume !== undefined && player.wavesurfer) {
          player.wavesurfer.setVolume(player.originalVolume);
        }
      });
      return;
    }

    // Smooth restore
    const restorePromises = players.map(player => {
      if (player.originalVolume !== undefined && player.wavesurfer) {
        return smoothVolumeTransition(player, player.originalVolume);
      }
      return Promise.resolve();
    });

    await Promise.all(restorePromises);
    console.log('🎚️ Original volumes restored');
  };

  // Get current playback state
  const getCurrentlyPlaying = (): PlayerInfo | null => currentlyPlaying.value;
  const isPlaying = (): boolean => !!currentlyPlaying.value;
  const isSequentialActive = (): boolean => isSequentialPlaybackActive.value;

  // Overlapping playback - play multiple players simultaneously with volume normalization
  const playOverlapping = async (players: PlayerInfo[]): Promise<void> => {
    console.log('🎼 playOverlapping called with players:', players.map(p => ({ id: p.id, type: p.type, hasWavesurfer: !!p.wavesurfer })));
    
    // Stop any current playback first
    stopAll();
    
    // Enter overlapping mode
    isOverlappingPlaybackActive.value = true;
    console.log('🎼 Overlapping mode activated');
    
    try {
      // Apply volume normalization if enabled and we have target and user players
      const targetPlayer = players.find(p => p.type === 'target');
      const userPlayer = players.find(p => p.type === 'user');
      
      if (volumeNormalizationConfig.value.enabled && targetPlayer && userPlayer) {
        console.log('🎚️ Applying volume normalization for overlapping playback...');
        await applyVolumeNormalization(targetPlayer, userPlayer);
      }

      // Start all players simultaneously
      const playPromises = players.map(player => {
        if (!player.wavesurfer) {
          console.error(`🎼 No WaveSurfer instance for ${player.id}`);
          return Promise.resolve(false);
        }
        
        console.log(`🎼 Starting player ${player.id} (${player.type})`);
        return new Promise<boolean>((resolve) => {
          const success = play(player, () => {
            console.log(`🎼 Player ${player.id} finished`);
            resolve(true);
          });
          if (!success) {
            console.warn(`🎼 Failed to start player ${player.id}`);
            resolve(false);
          }
        });
      });
      
      console.log('🎼 Waiting for all players to start...');
      await Promise.all(playPromises);
      console.log('🎼 All players started successfully');
      
    } catch (error) {
      console.error('🎼 Error in overlapping playback:', error);
      stopAll();
    }
  };

  // Emergency stop for recordings or other interruptions
  const emergencyStop = (reason: string = 'Emergency stop'): void => {
    stopAll(); // Note: stopAll is now async, but emergency stop should be immediate
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
    
    // Volume normalization methods
    updateVolumeNormalizationConfig,
    applyVolumeNormalization,
    restoreOriginalVolumes,
    
    // Reactive state for components to watch
    currentlyPlaying: readonly(currentlyPlaying),
    currentlyPlayingMultiple: readonly(currentlyPlayingMultiple),
    isSequentialPlaybackActive: readonly(isSequentialPlaybackActive),
    isOverlappingPlaybackActive: readonly(isOverlappingPlaybackActive),
    
    // Volume normalization state
    volumeNormalizationConfig: readonly(volumeNormalizationConfig),
    isAnalyzingAudio: readonly(isAnalyzingAudio)
  };
}

// Create a singleton instance for global use
export const audioManager = useAudioManager();