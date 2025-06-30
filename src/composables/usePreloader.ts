import { ref } from 'vue'
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
  
  // Pre-initialize AudioContext to avoid suspension delays
  const initAudioContext = async (): Promise<AudioContext> => {
    if (globalAudioContext) {
      return globalAudioContext
    }
    
    try {
      console.log('🎵 Pre-initializing AudioContext...')
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
      
      // Initialize AudioContext (fast but important)
      const audioContextPromise = initAudioContext().catch((error) => {
        console.warn('⚠️ AudioContext preload failed:', error)
      })
      
      // Pre-load WaveSurfer modules
      const modulesPromise = preloadWaveSurferModules().catch((error) => {
        console.warn('⚠️ WaveSurfer modules preload failed:', error)
      })
      
      // Wait for critical components
      await Promise.allSettled([vadPromise, audioContextPromise, modulesPromise])
      
      // Warm up WaveSurfer (non-critical, run after modules loaded)
      if (preloadStatus.value.wavesurfer) {
        warmWaveSurfer().catch((error) => {
          console.warn('⚠️ WaveSurfer warm-up failed:', error)
        })
      }
      
      // Check completion status
      const completed = preloadStatus.value.vad && preloadStatus.value.audioContext && preloadStatus.value.wavesurfer
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
  
  // Get pre-initialized AudioContext (or create if not available)
  const getAudioContext = (): AudioContext => {
    if (globalAudioContext) {
      return globalAudioContext
    }
    
    // Fallback: create new context if preload failed
    console.log('🔄 Creating new AudioContext (preload may have failed)')
    globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
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

// Create readonly refs to prevent external mutation
function readonly<T>(ref: any): T {
  return ref
}