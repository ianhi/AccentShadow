
import { ref, shallowRef, onUnmounted, nextTick, watch, type Ref } from 'vue';
import WaveSurfer from 'wavesurfer.js';
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.esm.js';
import { audioManager } from './useAudioManager';
import { usePreloader } from './usePreloader';

interface PlayerInfo {
  id: string;
  type: string;
  wavesurfer: WaveSurfer;
  isReady?: boolean;
}

export function useWaveform(
  containerRef: Ref<HTMLElement | null>,
  spectrogramContainerRef: Ref<HTMLElement | null>,
  audioId: string | null = null,
  audioType: string = 'unknown',
  onReadyToPlay?: () => void,
  vadSegments: Ref<Array<{ startTime: number, endTime: number, type: string }>> = ref([])
) {
  const wavesurfer = shallowRef<WaveSurfer | null>(null);
  const isReady = ref(false);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const volume = ref(0.5);
  const playbackRate = ref(1.0);
  const playerId = audioId || `player_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  let playerInfo: PlayerInfo | null = null;
  let currentAudioBlob: Blob | null = null; // Store the current audio blob for volume analysis

  // Get preloader for optimized initialization
  const { getAudioContext, preloadStatus } = usePreloader();

  // Detect if we're on mobile device
  const isMobileDevice = () => {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const initWaveform = () => {
    // Destroy existing instance if it exists
    if (wavesurfer.value) {
      destroyWaveform();
    }

    if (containerRef.value && spectrogramContainerRef.value) {
      // Check if containers have proper dimensions
      if (containerRef.value.offsetWidth === 0 || containerRef.value.offsetHeight === 0) {
        // Use ResizeObserver instead of arbitrary timing
        const observer = new ResizeObserver(() => {
          if (containerRef.value && containerRef.value.offsetWidth > 0) {
            observer.disconnect();
            initWaveform();
          }
        });
        observer.observe(containerRef.value);
        return;
      }

      // Check preload status for optimization opportunities
      const preloadReady = preloadStatus.value.complete;
      if (preloadReady) {
        console.log(`🚀 [${audioType.toUpperCase()}] Using preloaded components for faster initialization`);
      } else {
        console.log(`⏳ [${audioType.toUpperCase()}] Preload not complete, using standard initialization`);
      }

      // Get device-specific heights
      const isMobile = isMobileDevice();
      const waveformHeight = isMobile ? 40 : 60;
      const spectrogramHeight = isMobile ? 180 : 300;

      const instance = WaveSurfer.create({
        container: containerRef.value,
        waveColor: 'rgba(96, 165, 250, 0.8)', // Original semi-transparent blue
        progressColor: 'rgba(59, 130, 246, 0.9)', // Original slightly more opaque progress
        cursorColor: '#ff0000', // Red cursor/progress bar
        cursorWidth: 2, // 2px width for the progress cursor
        height: waveformHeight,
        normalize: true,
        // barWidth: 2,
        // barRadius: 3, // Original setting
        interact: true, // Original setting
        fillParent: true, // Original setting
        // Remove backend specification to avoid media element issues
        mediaControls: false
      });

      wavesurfer.value = instance;

      // Regions plugin disabled for WaveSurfer 7.x compatibility

      // Create spectrogram plugin
      try {
        const spectrogramPlugin = Spectrogram.create({
          container: spectrogramContainerRef.value,
          labels: true,
          splitChannels: false,
          height: spectrogramHeight,
          fftSamples: 512,
          windowFunc: 'hann'
        });

        wavesurfer.value.registerPlugin(spectrogramPlugin);
      } catch (error) {
        console.error(`🎵 Error creating spectrogram:`, error);
      }

      // Add loading event handler
      wavesurfer.value?.on('loading', (progress: number) => {
        // Could emit loading progress here if needed
      });

      wavesurfer.value?.on('ready', () => {
        if (!wavesurfer.value) return;

        const audioDuration = wavesurfer.value.getDuration();

        // DEBUG: Check WaveSurfer's perception of audio timing
        console.log(`🎼 WaveSurfer ready [${audioType.toUpperCase()}]:`, {
          duration: audioDuration.toFixed(3) + 's',
          sampleRate: (wavesurfer.value as any).options?.sampleRate || 'default',
          audioContextSampleRate: getAudioContext().sampleRate + 'Hz',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Firefox/Other'
        });

        // Register with audio manager (will be updated with blob when available)
        playerInfo = audioManager.registerPlayer(playerId, audioType, wavesurfer.value);
        
        // Add current blob if available
        if (currentAudioBlob) {
          (playerInfo as any).audioBlob = currentAudioBlob;
        }

        isReady.value = true;
        duration.value = audioDuration;
        wavesurfer.value.setVolume(volume.value);

        // Force manual resize and render for WaveSurfer v7+
        if (wavesurfer.value && (wavesurfer.value as any).renderer) {
          try {
            const container = containerRef.value;
            if (container) {
              const width = container.offsetWidth;
              const height = container.offsetHeight;

              // Try gentle redraw methods
              if ((wavesurfer.value as any).redraw) {
                (wavesurfer.value as any).redraw();
              }
              if ((wavesurfer.value as any).renderer.setSize) {
                (wavesurfer.value as any).renderer.setSize(width, height);
              }
            }
          } catch (e) {
            // Silent handling of render errors
          }
        }

        // If we have a ready-to-play callback, call it now that everything is set up
        if (onReadyToPlay) {
          onReadyToPlay();
        }

        // Add initial VAD segments if available
        if (vadSegments.value.length > 0) {
          addVadSegments(vadSegments.value);
        }
      });

      // Decode event listener
      wavesurfer.value?.on('decode', () => {
        // Audio decoded and ready for use
      });

      wavesurfer.value?.on('error', (error: any) => {
        // Filter out expected errors during audio loading transitions
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          console.log('🎵 Load cancelled (expected):', error?.message || error);
          return;
        }
        // Filter out spectrogram data race conditions  
        if (error?.message?.includes('Cannot read properties of undefined') &&
          error?.stack?.includes('spectrogram')) {
          console.log('🎵 Spectrogram data race condition (expected during load)');
          return;
        }
        console.error('🎵 WaveSurfer error:', error?.message || error);
        isReady.value = false;
        isPlaying.value = false;
      });

      wavesurfer.value?.on('play', () => {
        isPlaying.value = true;
      });

      wavesurfer.value?.on('pause', () => {
        isPlaying.value = false;
      });

      wavesurfer.value?.on('timeupdate', () => {
        if (wavesurfer.value) {
          currentTime.value = wavesurfer.value.getCurrentTime();
        }
      });

      wavesurfer.value?.on('finish', () => {
        isPlaying.value = false;
        currentTime.value = 0;
      });
    } else {
    }
  };

  const loadAudio = (url: string): void => {
    if (!url) {
      return;
    }

    // If WaveSurfer doesn't exist, create it first
    if (!wavesurfer.value) {
      initWaveform();
      // Wait for initialization to complete using nextTick instead of arbitrary delay
      nextTick(() => {
        if (wavesurfer.value) {
          loadAudioDirect(url);
        }
      });
      return;
    }

    loadAudioDirect(url);
  };

  // Load new audio into existing WaveSurfer instance (no recreation)
  const loadAudioDirect = (url: string): void => {
    if (!url) {
      return;
    }

    console.log(`🎵 [${audioType.toUpperCase()}]: Loading new audio: ${url.substring(0, 50)}...`);

    // If WaveSurfer doesn't exist yet, initialize it first
    if (!wavesurfer.value) {
      if (!containerRef.value || !spectrogramContainerRef.value) {
        console.log('🎵 Containers not ready, deferring load...');
        return;
      }
      
      console.log(`🎵 [${audioType.toUpperCase()}]: Initializing WaveSurfer instance`);
      initWaveform();
      
      // Wait for initialization then load audio
      nextTick(() => {
        if (wavesurfer.value) {
          loadAudioIntoInstance(url);
        }
      });
    } else {
      // WaveSurfer exists, just load new audio
      loadAudioIntoInstance(url);
    }
  };

  // Utility function to fetch audio blob from URL
  const fetchAudioBlob = async (url: string): Promise<Blob | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.warn(`🎵 Failed to fetch audio blob from ${url}:`, error);
      return null;
    }
  };

  // Helper function to load audio into existing WaveSurfer instance
  const loadAudioIntoInstance = async (url: string): Promise<void> => {
    if (!wavesurfer.value) return;

    // Reset state for new audio
    isReady.value = false;
    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;

    console.log(`🎵 [${audioType.toUpperCase()}]: Loading audio into existing instance`);

    try {
      // Fetch the audio blob for volume normalization (non-blocking)
      fetchAudioBlob(url).then(blob => {
        currentAudioBlob = blob;
        // Update player info with blob if it exists
        if (playerInfo && blob) {
          (playerInfo as any).audioBlob = blob;
          audioManager.registerPlayer(playerId, audioType, wavesurfer.value);
        }
      }).catch(error => {
        console.warn('🎵 Failed to fetch audio blob for volume analysis:', error);
      });

      const loadPromise = wavesurfer.value.load(url);

      // Handle promise rejection for async errors
      if (loadPromise && typeof loadPromise.catch === 'function') {
        loadPromise.catch((asyncError: any) => {
          // Filter out expected spectrogram errors during loading
          if (asyncError?.message?.includes('Cannot read properties of undefined') ||
            asyncError?.message?.includes('length')) {
            console.log('🎵 Spectrogram data error during load (handled)');
            return;
          }
          console.error('🎵 Async load error:', asyncError);
        });
      }
    } catch (error) {
      console.error('🎵 Error loading audio:', error);
    }
  };

  const playPause = () => {
    if (wavesurfer.value && playerInfo) {
      if (wavesurfer.value.isPlaying()) {
        wavesurfer.value.pause();
      } else {
        audioManager.play(playerInfo);
      }
    }
  };

  const play = () => {
    if (wavesurfer.value && playerInfo) {
      return audioManager.play(playerInfo);
    }
    return false;
  };

  const stop = () => {
    if (wavesurfer.value && wavesurfer.value.isPlaying()) {
      wavesurfer.value.pause();
      wavesurfer.value.seekTo(0);
      currentTime.value = 0;
    }
  };

  const setVolume = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    volume.value = parseFloat(target.value);
    if (wavesurfer.value) {
      wavesurfer.value.setVolume(volume.value);
    }
  };

  const setPlaybackRate = (rate: number): void => {
    playbackRate.value = rate;
    if (wavesurfer.value) {
      wavesurfer.value.setPlaybackRate(rate);
    }
  };


  const destroyWaveform = () => {
    if (wavesurfer.value) {
      try {
        wavesurfer.value.destroy();
      } catch (error) {
        // Silent handling of destroy errors
      }
      wavesurfer.value = null;
      isReady.value = false;
      isPlaying.value = false;
      currentTime.value = 0;
      duration.value = 0;
    }
    // Clear container contents
    if (containerRef.value) {
      containerRef.value.innerHTML = '';
    }
    if (spectrogramContainerRef.value) {
      spectrogramContainerRef.value.innerHTML = '';
    }
  };

  // VAD segments visualization functions
  const addVadSegments = (segments: Array<{ startTime: number, endTime: number, type: string }>) => {
    console.log(`🎯 [${audioType.toUpperCase()}]: VAD segments visualization disabled (regions plugin API incompatible)`);
    // Regions plugin API incompatible with WaveSurfer 7.x - disabling for now
    return;
  };

  const clearVadSegments = () => {
    // Regions plugin API disabled for WaveSurfer 7.x compatibility
    return;
  };

  // Watch for VAD segments changes
  watch(vadSegments, (newSegments) => {
    if (newSegments && newSegments.length > 0 && isReady.value) {
      console.log(`🎯 [${audioType.toUpperCase()}]: VAD segments updated, adding to waveform:`, newSegments);
      addVadSegments(newSegments);
    } else {
      clearVadSegments();
    }
  }, { deep: true });

  // Note: onUnmounted is handled by parent component to avoid lifecycle issues

  return {
    wavesurfer,
    isReady,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    playerId,
    playerInfo: () => playerInfo,
    initWaveform,
    loadAudio,
    playPause,
    play,
    stop,
    setVolume,
    setPlaybackRate,
    destroyWaveform,
    addVadSegments,
    clearVadSegments,
  };
}
