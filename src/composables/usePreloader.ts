import { ref, readonly } from 'vue'
import { useVADProcessor } from './useVADProcessor'

interface PreloadStatus {
  vad: boolean
  audioContext: boolean
  wavesurfer: boolean
  complete: boolean
}

// Global preload state
const preloadStatus = ref<PreloadStatus>({
  vad: false,
  audioContext: false,
  wavesurfer: false,
  complete: false
})

const isPreloading = ref(false)
let globalAudioContext: AudioContext | null = null

/**
 * Background preloader for performance-critical components
 * Initializes VAD, AudioContext, and WaveSurfer dependencies early
 */
export function usePreloader() {
  
  // Pre-initialize AudioContext only after user gesture to avoid browser warnings
  const initAudioContext = async (): Promise<AudioContext> => {
    if (globalAudioContext) {
      return globalAudioContext
    }
    
    try {
      console.log('🎵 Pre-initializing AudioContext (deferred until user interaction)...')
      
      // Don't create AudioContext immediately - browsers require user gesture
      // This will be called lazily when actually needed by audio components
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Resume context if suspended (common on mobile)
      if (audioContext.state === 'suspended') {
        console.log('🎵 Resuming suspended AudioContext...')
        await audioContext.resume()
      }
      
      globalAudioContext = audioContext
      preloadStatus.value.audioContext = true
      console.log('✅ AudioContext pre-initialized successfully:', audioContext.state)
      
      return audioContext
    } catch (error) {
      console.warn('⚠️ AudioContext pre-initialization failed:', error)
      throw error
    }
  }
  
  // Pre-load WaveSurfer and Spectrogram modules
  const preloadWaveSurferModules = async (): Promise<void> => {
    try {
      console.log('📦 Pre-loading WaveSurfer modules...')
      
      // Dynamically import WaveSurfer to trigger module loading
      const [WaveSurfer, Spectrogram] = await Promise.all([
        import('wavesurfer.js'),
        import('wavesurfer.js/dist/plugins/spectrogram.esm.js')
      ])
      
      // Verify modules loaded correctly
      if (WaveSurfer.default && Spectrogram.default) {
        preloadStatus.value.wavesurfer = true
        console.log('✅ WaveSurfer modules pre-loaded successfully')
      } else {
        throw new Error('WaveSurfer modules not properly loaded')
      }
    } catch (error) {
      console.warn('⚠️ WaveSurfer module pre-loading failed:', error)
      throw error
    }
  }
  
  // Create offscreen container for testing/warming up
  const createOffscreenContainer = (): HTMLElement => {
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '-9999px'
    container.style.width = '300px'
    container.style.height = '60px'
    container.style.opacity = '0'
    container.style.pointerEvents = 'none'
    document.body.appendChild(container)
    return container
  }
  
  // Warm up WaveSurfer creation to cache initialization overhead
  const warmWaveSurfer = async (): Promise<void> => {
    try {
      console.log('🔥 Warming up WaveSurfer initialization...')
      
      // Ensure modules are loaded first
      const [WaveSurfer, Spectrogram] = await Promise.all([
        import('wavesurfer.js'),
        import('wavesurfer.js/dist/plugins/spectrogram.esm.js')
      ])
      
      // Create offscreen containers
      const waveContainer = createOffscreenContainer()
      const spectroContainer = createOffscreenContainer()
      
      // Create a test WaveSurfer instance to warm up the creation process
      const testInstance = WaveSurfer.default.create({
        container: waveContainer,
        waveColor: 'rgba(96, 165, 250, 0.8)',
        progressColor: 'rgba(59, 130, 246, 0.9)',
        cursorColor: '#ff0000',
        cursorWidth: 2,
        height: 60,
        normalize: true,
        barWidth: 2,
        barRadius: 3,
        interact: true,
        fillParent: true,
        mediaControls: false
      })
      
      // Create spectrogram plugin to warm up plugin system
      const spectrogramPlugin = Spectrogram.default.create({
        container: spectroContainer,
        labels: true,
        splitChannels: false,
        height: 200,
        fftSamples: 512,
        windowFunc: 'hann'
      })
      
      testInstance.registerPlugin(spectrogramPlugin)
      
      // Cleanup immediately after warming
      setTimeout(() => {
        try {
          testInstance.destroy()
          document.body.removeChild(waveContainer)
          document.body.removeChild(spectroContainer)
          console.log('🧹 WaveSurfer warm-up cleanup completed')
        } catch (error) {
          console.warn('⚠️ WaveSurfer warm-up cleanup failed:', error)
        }
      }, 100)
      
      console.log('✅ WaveSurfer warm-up completed successfully')
    } catch (error) {
      console.warn('⚠️ WaveSurfer warm-up failed:', error)
      // Don't throw - this is an optimization, not critical
    }
  }
  
  // Master preload function - runs all optimizations
  const preloadAll = async (): Promise<void> => {
    if (isPreloading.value) {
      console.log('⏳ Preloading already in progress...')
      return
    }
    
    isPreloading.value = true
    console.log('🚀 Starting comprehensive background preloading...')
    
    try {
      // Initialize VAD (most critical)
      const { initVAD, vadReady } = useVADProcessor()
      const vadPromise = initVAD().then(() => {
        preloadStatus.value.vad = vadReady.value
        console.log('✅ VAD preload complete')
      }).catch((error) => {
        console.warn('⚠️ VAD preload failed:', error)
      })
      
      // Skip AudioContext preload - will be initialized on first user interaction
      // This prevents browser warnings about auto-playing audio contexts
      console.log('⏭️ Skipping AudioContext preload (will initialize on user interaction)')
      
      // Pre-load WaveSurfer modules
      const modulesPromise = preloadWaveSurferModules().catch((error) => {
        console.warn('⚠️ WaveSurfer modules preload failed:', error)
      })
      
      // Wait for critical components (excluding AudioContext which requires user gesture)
      await Promise.allSettled([vadPromise, modulesPromise])
      
      // Warm up WaveSurfer (non-critical, run after modules loaded)
      if (preloadStatus.value.wavesurfer) {
        warmWaveSurfer().catch((error) => {
          console.warn('⚠️ WaveSurfer warm-up failed:', error)
        })
      }
      
      // Check completion status (AudioContext will be marked ready when first accessed)
      const completed = preloadStatus.value.vad && preloadStatus.value.wavesurfer
      preloadStatus.value.complete = completed
      
      console.log('🎉 Background preloading completed:', {
        vad: preloadStatus.value.vad,
        audioContext: preloadStatus.value.audioContext,
        wavesurfer: preloadStatus.value.wavesurfer,
        overall: completed ? 'SUCCESS' : 'PARTIAL'
      })
      
    } catch (error) {
      console.error('❌ Critical preloading error:', error)
    } finally {
      isPreloading.value = false
    }
  }
  
  // Get AudioContext (created on-demand with user gesture)
  const getAudioContext = (): AudioContext => {
    if (globalAudioContext) {
      return globalAudioContext
    }
    
    // Create AudioContext on first use (after user interaction)
    console.log('🔄 Creating AudioContext on first use (user interaction detected)')
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    preloadStatus.value.audioContext = true
    return globalAudioContext
  }
  
  return {
    preloadStatus: readonly(preloadStatus),
    isPreloading: readonly(isPreloading),
    preloadAll,
    initAudioContext,
    getAudioContext,
    warmWaveSurfer
  }
}

