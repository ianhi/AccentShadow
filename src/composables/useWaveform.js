
import { ref, shallowRef, onUnmounted } from 'vue';
import WaveSurfer from 'wavesurfer.js';
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.esm.js';
import { audioManager } from './useAudioManager.js';

export function useWaveform(containerRef, spectrogramContainerRef, audioId = null, audioType = 'unknown') {
  const wavesurfer = shallowRef(null);
  const isReady = ref(false);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const volume = ref(0.5);
  const playbackRate = ref(1.0);
  const playerId = audioId || `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let playerInfo = null;

  const initWaveform = () => {
    console.log('🎵 initWaveform called');
    
    // Destroy existing instance if it exists
    if (wavesurfer.value) {
      console.log('🎵 Destroying existing WaveSurfer instance');
      destroyWaveform();
    }
    
    if (containerRef.value && spectrogramContainerRef.value) {
      console.log('🎵 Both containers available:', {
        waveform: !!containerRef.value,
        spectrogram: !!spectrogramContainerRef.value,
        waveformDimensions: {
          width: containerRef.value.offsetWidth,
          height: containerRef.value.offsetHeight
        }
      });
      
      // Check if containers have proper dimensions
      if (containerRef.value.offsetWidth === 0 || containerRef.value.offsetHeight === 0) {
        console.warn('🎵 Container has zero dimensions, waiting for layout...');
        setTimeout(() => {
          if (containerRef.value && containerRef.value.offsetWidth > 0) {
            initWaveform();
          }
        }, 50);
        return;
      }

      // Create WaveSurfer with waveform above spectrogram (Test 3 approach)
      wavesurfer.value = WaveSurfer.create({
        container: containerRef.value,
        waveColor: 'rgba(96, 165, 250, 0.8)', // Semi-transparent blue
        progressColor: 'rgba(59, 130, 246, 0.9)', // Slightly more opaque progress
        cursorColor: 'transparent',
        barWidth: 2,
        barRadius: 3,
        responsive: true,
        height: 60, // Match container height
        normalize: true,
        interact: true, // Allow interaction
        fillParent: true,
        backend: 'WebAudio', // Ensure we have proper audio analysis
      });
      // Register spectrogram plugin with Test 3 settings
      console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Creating spectrogram plugin for container:`, spectrogramContainerRef.value?.id);
      
      const spectrogramPlugin = Spectrogram.create({
        container: spectrogramContainerRef.value,
        labels: true, // Enable labels like Test 3
        splitChannels: false,
        height: 200, // Full height for spectrogram background
        fftSamples: 512,
        windowFunc: 'hann',
      });
      
      console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Registering spectrogram plugin`);
      wavesurfer.value.registerPlugin(spectrogramPlugin);
      console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Spectrogram plugin registered successfully`);
      
      console.log('🎵 WaveSurfer created with waveform height 60px, spectrogram height 200px');

      console.log('🎵 WaveSurfer created with overlay configuration');

      wavesurfer.value.on('ready', () => {
        const audioDuration = wavesurfer.value.getDuration();
        console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: WaveSurfer ready! Duration: ${audioDuration.toFixed(3)}s`);
        
        // Log audio buffer info if available
        if (wavesurfer.value.backend && wavesurfer.value.backend.buffer) {
          const buffer = wavesurfer.value.backend.buffer;
          console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Audio buffer - duration: ${buffer.duration.toFixed(3)}s, sampleRate: ${buffer.sampleRate}Hz, channels: ${buffer.numberOfChannels}`);
        }
        
        // Register with audio manager
        playerInfo = audioManager.registerPlayer(playerId, audioType, wavesurfer.value);
        console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Registered with audio manager`);
        
        console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Container dimensions after ready:`, {
          waveform: {
            width: containerRef.value?.offsetWidth,
            height: containerRef.value?.offsetHeight
          },
          spectrogram: {
            width: spectrogramContainerRef.value?.offsetWidth,
            height: spectrogramContainerRef.value?.offsetHeight
          }
        });
        
        isReady.value = true;
        duration.value = audioDuration;
        wavesurfer.value.setVolume(volume.value);
        
        console.log('🎵 Checking plugin setup:', {
          plugins: wavesurfer.value.plugins,
          spectrogramPlugin: wavesurfer.value.plugins?.find(p => p.constructor.name === 'SpectrogramPlugin')
        });
        
        // Debug waveform rendering
        console.log('🎵 WaveSurfer DOM structure after ready:', {
          container: containerRef.value,
          containerChildren: containerRef.value?.children.length,
          spectrogramContainer: spectrogramContainerRef.value,
          spectrogramChildren: spectrogramContainerRef.value?.children.length,
          drawerExists: !!wavesurfer.value.drawer,
          drawerWrapper: wavesurfer.value.drawer?.wrapper,
          drawerWrapperDisplay: wavesurfer.value.drawer?.wrapper ? getComputedStyle(wavesurfer.value.drawer.wrapper).display : 'none'
        });
        
        // Check if waveform elements are being created
        if (containerRef.value) {
          const waveElements = containerRef.value.querySelectorAll('wave');
          const canvasElements = containerRef.value.querySelectorAll('canvas');
          console.log('🎵 Waveform DOM elements found:', {
            waveElements: waveElements.length,
            canvasElements: canvasElements.length,
            allChildren: Array.from(containerRef.value.children).map(child => ({
              tagName: child.tagName,
              className: child.className,
              style: child.style.cssText
            }))
          });
        }
        
        // Force redraw after ready with debug
        setTimeout(() => {
          if (wavesurfer.value) {
            console.log('🎵 Forcing redraw for overlay setup');
            try {
              if (wavesurfer.value.drawer && wavesurfer.value.drawer.drawBuffer) {
                wavesurfer.value.drawer.drawBuffer();
                console.log('🎵 drawBuffer called successfully');
              }
            } catch (e) {
              console.log('🎵 Error during redraw:', e);
            }
          }
        }, 200);
      });

      wavesurfer.value.on('error', (error) => {
        console.error('🎵 WaveSurfer error:', error);
        console.error('🎵 Error details:', {
          type: typeof error,
          message: error?.message,
          stack: error?.stack
        });
        // Reset state on error
        isReady.value = false;
        isPlaying.value = false;
      });

      wavesurfer.value.on('play', () => {
        isPlaying.value = true;
        console.log(`🎵 WaveSurfer playing: ${playerId} (${audioType})`);
      });

      wavesurfer.value.on('pause', () => {
        isPlaying.value = false;
        console.log(`🎵 WaveSurfer paused: ${playerId} (${audioType})`);
      });

      wavesurfer.value.on('timeupdate', () => {
        currentTime.value = wavesurfer.value.getCurrentTime();
      });

      wavesurfer.value.on('finish', () => {
        isPlaying.value = false;
        currentTime.value = 0;
        console.log(`🎵 WaveSurfer finished: ${playerId} (${audioType})`);
      });
    } else {
      console.warn('🎵 Containers not available:', {
        containerRef: !!containerRef.value,
        spectrogramContainerRef: !!spectrogramContainerRef.value
      });
    }
  };

  const loadAudio = (url) => {
    console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: loadAudio called with URL:`, url ? url.slice(0, 50) + '...' : 'null');
    console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: WaveSurfer instance exists:`, !!wavesurfer.value);
    console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Container dimensions before load:`, {
      waveform: containerRef.value ? {
        width: containerRef.value.offsetWidth,
        height: containerRef.value.offsetHeight,
        display: getComputedStyle(containerRef.value).display
      } : 'null',
      spectrogram: spectrogramContainerRef.value ? {
        width: spectrogramContainerRef.value.offsetWidth,
        height: spectrogramContainerRef.value.offsetHeight,
        display: getComputedStyle(spectrogramContainerRef.value).display
      } : 'null'
    });
    
    if (!url) {
      console.warn(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Cannot load audio: no URL provided`);
      return;
    }
    
    // Always destroy and recreate for any audio loading to ensure spectrogram updates
    console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Destroying existing instance for fresh reload`);
    destroyWaveform();
    
    // Use longer timeout for clean recreation
    setTimeout(() => {
      if (!containerRef.value || !spectrogramContainerRef.value) {
        console.error(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Cannot initialize: containers not available after timeout`);
        return;
      }
      
      console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Reinitializing WaveSurfer`);
      initWaveform();
      
      // Wait for initialization then load audio
      setTimeout(() => {
        if (wavesurfer.value) {
          console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Loading audio after recreation`);
          loadAudioDirect(url);
        } else {
          console.error(`🎵 WAVEFORM [${audioType.toUpperCase()}]: WaveSurfer failed to initialize after recreation`);
          // Retry once more with longer delay
          setTimeout(() => {
            if (!wavesurfer.value) {
              console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Retrying initialization one more time`);
              initWaveform();
              setTimeout(() => {
                if (wavesurfer.value) {
                  loadAudioDirect(url);
                } else {
                  console.error(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Failed to initialize after final retry`);
                }
              }, 100);
            }
          }, 300);
        }
      }, 200);
    }, 300);
  };
  
  // Separate function for direct audio loading (no recreation)
  const loadAudioDirect = (url) => {
    console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: loadAudioDirect called`);
    
    if (!wavesurfer.value || !url) {
      console.warn(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Cannot load - wavesurfer: ${!!wavesurfer.value}, url: ${!!url}`);
      return;
    }
    
    console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Resetting state before load`);
    isReady.value = false;
    isPlaying.value = false;
    currentTime.value = 0;
    duration.value = 0;
    
    try {
      // Log URL type for debugging
      if (url.startsWith('blob:')) {
        console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Loading blob URL audio`);
      } else if (url.startsWith('http')) {
        console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Loading remote URL audio`);
      } else {
        console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Loading local/data URL audio`);
      }
      
      console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Calling wavesurfer.load() with URL: ${url.slice(0, 50)}...`);
      wavesurfer.value.load(url);
      console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: wavesurfer.load() completed synchronously`);
    } catch (error) {
      console.error(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Error loading audio:`, error);
      // If loading fails, try recreating the instance
      console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Load failed, recreating WaveSurfer instance`);
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
    console.log(`🎵 Play/Pause toggled for ${playerId} (${audioType})`);
    if (wavesurfer.value && playerInfo) {
      if (wavesurfer.value.isPlaying()) {
        // If currently playing, just pause this instance
        wavesurfer.value.pause();
      } else {
        // Use audio manager to play (will stop others)
        audioManager.play(playerInfo);
      }
    }
  };
  
  // New method for direct play through audio manager
  const play = () => {
    console.log(`🎵 Direct play requested for ${playerId} (${audioType})`);
    if (wavesurfer.value && playerInfo) {
      return audioManager.play(playerInfo);
    }
    return false;
  };
  
  // New method for stopping audio
  const stop = () => {
    console.log(`🎵 Stop requested for ${playerId} (${audioType})`);
    if (wavesurfer.value && wavesurfer.value.isPlaying()) {
      wavesurfer.value.pause();
      wavesurfer.value.seekTo(0);
      currentTime.value = 0;
    }
  };

  const setVolume = (event) => {
    volume.value = parseFloat(event.target.value);
    console.log('Setting volume to:', volume.value);
    if (wavesurfer.value) {
      wavesurfer.value.setVolume(volume.value);
    }
  };

  const setPlaybackRate = (rate) => {
    playbackRate.value = rate;
    console.log('Setting playback rate to:', rate);
    if (wavesurfer.value) {
      wavesurfer.value.setPlaybackRate(rate);
    }
  };


  const destroyWaveform = () => {
    console.log('🎵 Destroying waveform and cleaning up');
    if (wavesurfer.value) {
      try {
        wavesurfer.value.destroy();
      } catch (error) {
        console.warn('🎵 Error during WaveSurfer destroy:', error);
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

  onUnmounted(() => {
    destroyWaveform();
  });

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
