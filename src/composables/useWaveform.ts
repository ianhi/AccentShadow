
import { ref, shallowRef, onUnmounted, type Ref } from 'vue';
import WaveSurfer from 'wavesurfer.js';
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.esm.js';
import { audioManager } from './useAudioManager';

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
  audioType: string = 'unknown'
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
        setTimeout(() => {
          if (containerRef.value && containerRef.value.offsetWidth > 0) {
            initWaveform();
          }
        }, 50);
        return;
      }

      // Get device-specific heights
      const isMobile = isMobileDevice();
      const waveformHeight = isMobile ? 40 : 60;
      const spectrogramHeight = isMobile ? 120 : 200;
      
      const instance = WaveSurfer.create({
        container: containerRef.value,
        waveColor: 'rgba(96, 165, 250, 0.8)', // Original semi-transparent blue
        progressColor: 'rgba(59, 130, 246, 0.9)', // Original slightly more opaque progress
        cursorColor: '#ff0000', // Red cursor/progress bar
        cursorWidth: 2, // 2px width for the progress cursor
        height: waveformHeight,
        normalize: true,
        barWidth: 2,
        barRadius: 3, // Original setting
        interact: true, // Original setting
        fillParent: true, // Original setting
        // Remove backend specification to avoid media element issues
        mediaControls: false
      });
      
      wavesurfer.value = instance;
      
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
        
        // Register with audio manager
        playerInfo = audioManager.registerPlayer(playerId, audioType, wavesurfer.value);
        
        isReady.value = true;
        duration.value = audioDuration;
        wavesurfer.value.setVolume(volume.value);
        
        // Force manual resize and render for WaveSurfer v7+
        setTimeout(() => {
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
        }, 200);
      });

      wavesurfer.value?.on('error', (error: any) => {
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
      setTimeout(() => {
        if (wavesurfer.value) {
          loadAudioDirect(url);
        }
      }, 100);
      return;
    }
    
    loadAudioDirect(url);
  };
  
  // Separate function for direct audio loading (no recreation)
  const loadAudioDirect = (url: string): void => {
    if (!wavesurfer.value || !url) {
      return;
    }
    
    isReady.value = false;
    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;
    
    try {
      wavesurfer.value.load(url);
    } catch (error) {
      console.error(`🎵 Error loading audio:`, error);
      // If loading fails, try recreating the instance
      destroyWaveform();
      setTimeout(() => {
        initWaveform();
        setTimeout(() => {
          if (wavesurfer.value) {
            loadAudioDirect(url);
          }
        }, 100);
      }, 50);
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
  };
}
