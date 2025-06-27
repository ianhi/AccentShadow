
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

  // Detect if we're on mobile device
  const isMobileDevice = () => {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

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

      // Create WaveSurfer with explicit configuration
      console.log('🎵 Creating WaveSurfer with container dimensions:', {
        width: containerRef.value.offsetWidth,
        height: containerRef.value.offsetHeight,
        clientWidth: containerRef.value.clientWidth,
        clientHeight: containerRef.value.clientHeight
      });
      
      // Get device-specific heights (restore original working values)
      const isMobile = isMobileDevice();
      
      // Use original working heights: desktop 60px waveform, mobile 40px
      const waveformHeight = isMobile ? 40 : 60;
      // Use original working heights: desktop 200px spectrogram, mobile 120px
      const spectrogramHeight = isMobile ? 120 : 200;
      
      wavesurfer.value = WaveSurfer.create({
        container: containerRef.value,
        waveColor: 'rgba(96, 165, 250, 0.8)', // Original semi-transparent blue
        progressColor: 'rgba(59, 130, 246, 0.9)', // Original slightly more opaque progress
        cursorColor: 'transparent', // Original setting
        backgroundColor: 'transparent',
        height: waveformHeight,
        normalize: true,
        barWidth: 2,
        barRadius: 3, // Original setting
        responsive: true, // Original setting
        interact: true, // Original setting
        fillParent: true, // Original setting
        // Remove backend specification to avoid media element issues
        mediaControls: false
      });
      
      console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: WaveSurfer created successfully`);
      
      // Re-enable spectrogram with working structure
      console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Creating spectrogram plugin`);
      
      try {
        const spectrogramPlugin = Spectrogram.create({
          container: spectrogramContainerRef.value,
          labels: true,
          splitChannels: false,
          height: spectrogramHeight,
          fftSamples: 512,
          windowFunc: 'hann'
        });
        
        console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Registering spectrogram plugin`);
        wavesurfer.value.registerPlugin(spectrogramPlugin);
        console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Spectrogram plugin registered successfully`);
      } catch (error) {
        console.error(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Error creating spectrogram:`, error);
        console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Continuing without spectrogram`);
      }
      
      console.log(`🎵 WaveSurfer created with ${isMobile ? 'mobile' : 'desktop'} heights: waveform ${waveformHeight}px, spectrogram ${spectrogramHeight}px`);

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
        
        // Enhanced debugging for waveform rendering
        if (containerRef.value) {
          const waveElements = containerRef.value.querySelectorAll('wave');
          const canvasElements = containerRef.value.querySelectorAll('canvas');
          const divElements = containerRef.value.querySelectorAll('div');
          const svgElements = containerRef.value.querySelectorAll('svg');
          
          console.log('🎵 Waveform DOM elements found:', {
            waveElements: waveElements.length,
            canvasElements: canvasElements.length,
            divElements: divElements.length,
            svgElements: svgElements.length,
            allChildren: Array.from(containerRef.value.children).map(child => ({
              tagName: child.tagName,
              className: child.className,
              style: child.style.cssText,
              id: child.id,
              innerHTML: child.innerHTML?.slice(0, 200)
            }))
          });
          
          // Check WaveSurfer internal state with more details
          console.log('🎵 WaveSurfer internal state:', {
            renderer: wavesurfer.value?.renderer,
            rendered: wavesurfer.value?.renderer?.rendered,
            width: wavesurfer.value?.renderer?.width,
            height: wavesurfer.value?.renderer?.height,
            options: wavesurfer.value?.options,
            getDecodedData: !!wavesurfer.value?.getDecodedData,
            isLoaded: !!wavesurfer.value?.getDecodedData()
          });
          
          // Check if audio buffer exists
          const decodedData = wavesurfer.value?.getDecodedData();
          if (decodedData) {
            console.log('🎵 Audio data available:', {
              duration: decodedData.duration,
              sampleRate: decodedData.sampleRate,
              numberOfChannels: decodedData.numberOfChannels,
              length: decodedData.length
            });
          } else {
            console.log('🎵 No audio data found');
          }
        }
        
        // Force manual resize and render for WaveSurfer v7+
        setTimeout(() => {
          if (wavesurfer.value) {
            console.log('🎵 Attempting manual resize and render');
            try {
              // Try different render/resize methods for v7+
              if (wavesurfer.value.renderer) {
                console.log('🎵 Found renderer, attempting render');
                
                // Force renderer dimensions
                const container = containerRef.value;
                if (container) {
                  const width = container.offsetWidth;
                  const height = container.offsetHeight;
                  console.log('🎵 Setting renderer dimensions:', { width, height });
                  
                  // Try gentle redraw methods that don't break WaveSurfer v7+
                  if (wavesurfer.value) {
                    console.log('🎵 Attempting gentle render methods');
                    
                    try {
                      // Method 1: Simple redraw (safest)
                      if (wavesurfer.value.redraw) {
                        wavesurfer.value.redraw();
                        console.log('🎵 Called redraw()');
                      }
                      
                      // Method 2: Set renderer size only
                      if (wavesurfer.value.renderer && wavesurfer.value.renderer.setSize) {
                        wavesurfer.value.renderer.setSize(width, height);
                        console.log('🎵 Set renderer size to:', { width, height });
                      }
                      
                      // Method 3: Check for alternative reRender
                      if (wavesurfer.value.reRender) {
                        wavesurfer.value.reRender();
                        console.log('🎵 Called reRender()');
                      }
                      
                      // Method 4: Force container style update only
                      if (wavesurfer.value.renderer && wavesurfer.value.renderer.container) {
                        console.log('🎵 Updating container style');
                        const rendererContainer = wavesurfer.value.renderer.container;
                        rendererContainer.style.width = width + 'px';
                        rendererContainer.style.height = height + 'px';
                      }
                      
                    } catch (renderError) {
                      console.error('🎵 Error during gentle render:', renderError);
                    }
                  }
                }
              }
            } catch (e) {
              console.log('🎵 Error during manual render:', e);
            }
          }
        }, 200);
        
        // Additional retry after longer delay for HMR stability
        setTimeout(() => {
          if (wavesurfer.value && containerRef.value) {
            console.log('🎵 Final retry - checking if waveform is visible');
            const container = containerRef.value;
            const hasWaveformContent = container.children.length > 0;
            console.log('🎵 Container has content:', hasWaveformContent);
            
            if (!hasWaveformContent) {
              console.log('🎵 No waveform content detected, forcing reload');
              const currentUrl = wavesurfer.value.options?.url;
              if (currentUrl) {
                console.log('🎵 Reloading audio to fix missing waveform');
                wavesurfer.value.load(currentUrl);
              }
            }
          }
        }, 1000);
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
    
    if (!url) {
      console.warn(`🎵 WAVEFORM [${audioType.toUpperCase()}]: Cannot load audio: no URL provided`);
      return;
    }
    
    // If WaveSurfer doesn't exist, create it first
    if (!wavesurfer.value) {
      console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: No WaveSurfer instance, initializing first`);
      initWaveform();
      
      // Wait for initialization then try loading again
      setTimeout(() => {
        if (wavesurfer.value) {
          loadAudioDirect(url);
        }
      }, 100);
      return;
    }
    
    // If WaveSurfer exists, load audio directly
    console.log(`🎵 WAVEFORM [${audioType.toUpperCase()}]: WaveSurfer exists, loading audio directly`);
    loadAudioDirect(url);
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
