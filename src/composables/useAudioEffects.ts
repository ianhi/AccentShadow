import { ref, computed, watch, onMounted } from 'vue'
import { usePreloader } from './usePreloader'

// Effect configuration interfaces
interface NoiseSuppressionConfig {
  enabled: boolean
  // MediaTrackConstraints level (for recording)
  constraintLevel: boolean
  // Note: WebAudio noise suppression would require additional implementation
}

interface DynamicsCompressorConfig {
  enabled: boolean
  threshold: number      // -100 to 0 dB
  knee: number          // 0 to 40 dB  
  ratio: number         // 1 to 20
  attack: number        // 0 to 1 seconds
  release: number       // 0 to 1 seconds
}

interface GainConfig {
  enabled: boolean
  gain: number          // 0 to 2 (linear gain multiplier)
}

interface EQConfig {
  enabled: boolean
  lowGain: number       // -40 to 40 dB
  midGain: number       // -40 to 40 dB  
  highGain: number      // -40 to 40 dB
}

interface AudioEffectsConfig {
  // Recording-time constraints (applied during getUserMedia)
  recordingConstraints: {
    noiseSuppression: boolean
    echoCancellation: boolean
    autoGainControl: boolean
  }
  
  // Post-processing effects (applied to recorded audio)
  postProcessing: {
    noiseSuppression: NoiseSuppressionConfig
    compression: DynamicsCompressorConfig
    gain: GainConfig
    eq: EQConfig
  }
  
  // Processing targets
  targets: {
    applyToTarget: boolean    // Apply effects to target audio playback
    applyToUser: boolean      // Apply effects to user audio playback
    applyToVAD: boolean       // Apply minimal effects to VAD input (usually false for compression/eq)
  }
}

interface BrowserCapabilities {
  mediaConstraints: {
    noiseSuppression: boolean
    echoCancellation: boolean
    autoGainControl: boolean
  }
  webAudio: {
    dynamicsCompressor: boolean
    biquadFilter: boolean
    gainNode: boolean
    audioWorklet: boolean
  }
  performance: {
    supportsWebWorkers: boolean
    supportsOfflineAudioContext: boolean
  }
}

interface EffectChainResult {
  processedBlob: Blob
  processingTimeMs: number
  effectsApplied: string[]
}

/**
 * Centralized audio effects management system
 * Handles both real-time recording constraints and post-processing effects
 */
export function useAudioEffects() {
  const { getAudioContext } = usePreloader()
  
  // Browser capability detection
  const capabilities = ref<BrowserCapabilities | null>(null)
  
  // Default effects configuration
  const defaultConfig: AudioEffectsConfig = {
    recordingConstraints: {
      noiseSuppression: true,   // Enable by default if supported
      echoCancellation: true,   // Usually beneficial
      autoGainControl: true     // Enable AGC for better noise handling
    },
    postProcessing: {
      noiseSuppression: {
        enabled: false,  // Disable until WebAudio implementation ready
        constraintLevel: true
      },
      compression: {
        enabled: false,
        threshold: -24,    // dB
        knee: 30,         // dB
        ratio: 12,        // 12:1 compression
        attack: 0.003,    // 3ms
        release: 0.25     // 250ms
      },
      gain: {
        enabled: false,
        gain: 1.0        // Unity gain by default
      },
      eq: {
        enabled: false,
        lowGain: 0,      // dB
        midGain: 0,      // dB  
        highGain: 0      // dB
      }
    },
    targets: {
      applyToTarget: true,
      applyToUser: true,
      applyToVAD: false    // Keep VAD processing minimal for accuracy
    }
  }
  
  // Current effects configuration (will be persisted to IndexedDB)
  const effectsConfig = ref<AudioEffectsConfig>({ ...defaultConfig })
  
  // Processing state
  const isProcessing = ref(false)
  const lastProcessingTime = ref(0)
  
  /**
   * Detect browser capabilities for audio effects
   */
  const detectCapabilities = (): BrowserCapabilities => {
    console.log('🔍 Detecting browser audio capabilities...')
    
    // Media constraints capabilities
    const supportedConstraints = navigator.mediaDevices?.getSupportedConstraints?.() ?? {}
    
    const caps: BrowserCapabilities = {
      mediaConstraints: {
        noiseSuppression: 'noiseSuppression' in supportedConstraints,
        echoCancellation: 'echoCancellation' in supportedConstraints,
        autoGainControl: 'autoGainControl' in supportedConstraints
      },
      webAudio: {
        dynamicsCompressor: 'DynamicsCompressorNode' in window,
        biquadFilter: 'BiquadFilterNode' in window,
        gainNode: 'GainNode' in window,
        audioWorklet: 'AudioWorklet' in window
      },
      performance: {
        supportsWebWorkers: 'Worker' in window,
        supportsOfflineAudioContext: 'OfflineAudioContext' in window
      }
    }
    
    console.log('✅ Browser capabilities detected:', caps)
    
    // Safari-specific warnings
    if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
      if (!caps.mediaConstraints.noiseSuppression) {
        console.warn('⚠️ Safari: Noise suppression not supported in MediaTrackConstraints')
      }
    }
    
    return caps
  }
  
  /**
   * Get media constraints for recording based on current config and capabilities
   */
  const getRecordingConstraints = (): MediaTrackConstraints => {
    if (!capabilities.value) {
      capabilities.value = detectCapabilities()
    }
    
    const constraints: MediaTrackConstraints = {
      sampleRate: 48000,  // High quality for processing
      channelCount: 1,    // Mono for speech
    }
    
    // Apply supported constraints
    const { recordingConstraints } = effectsConfig.value
    const { mediaConstraints } = capabilities.value
    
    if (recordingConstraints.noiseSuppression && mediaConstraints.noiseSuppression) {
      // Use aggressive noise suppression for better performance in noisy environments
      constraints.noiseSuppression = { ideal: true }
    }
    
    if (recordingConstraints.echoCancellation && mediaConstraints.echoCancellation) {
      // Use aggressive echo cancellation 
      constraints.echoCancellation = { ideal: true }
    }
    
    if (recordingConstraints.autoGainControl && mediaConstraints.autoGainControl) {
      // Enable AGC for better level control in noisy environments
      constraints.autoGainControl = { ideal: true }
    }
    
    console.log('🎙️ Recording constraints:', constraints)
    return constraints
  }
  
  /**
   * Apply post-processing effects chain to audio blob
   */
  const processAudioBlob = async (
    audioBlob: Blob, 
    forVAD: boolean = false
  ): Promise<EffectChainResult> => {
    const startTime = performance.now()
    const effectsApplied: string[] = []
    
    try {
      isProcessing.value = true
      
      // Determine which effects to apply
      const config = effectsConfig.value.postProcessing
      const shouldApplyFullEffects = !forVAD || effectsConfig.value.targets.applyToVAD
      
      console.log(`🎛️ Processing audio blob (forVAD: ${forVAD}, fullEffects: ${shouldApplyFullEffects})`)
      
      // Early return if no effects enabled
      const hasEnabledEffects = shouldApplyFullEffects && (
        config.compression.enabled || 
        config.gain.enabled || 
        config.eq.enabled
      )
      
      if (!hasEnabledEffects) {
        console.log('⚡ No effects enabled, returning original audio')
        return {
          processedBlob: audioBlob,
          processingTimeMs: performance.now() - startTime,
          effectsApplied: ['none']
        }
      }
      
      // Create audio processing chain
      const audioContext = getAudioContext()
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Create offline context for processing
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      )
      
      // Create source node
      const sourceNode = offlineContext.createBufferSource()
      sourceNode.buffer = audioBuffer
      
      let currentNode: AudioNode = sourceNode
      
      // Apply effects chain in optimal order
      
      // 1. EQ (frequency shaping before compression)
      if (config.eq.enabled && shouldApplyFullEffects) {
        currentNode = await applyEQ(offlineContext, currentNode, config.eq)
        effectsApplied.push('eq')
      }
      
      // 2. Compression (dynamic range control)
      if (config.compression.enabled && shouldApplyFullEffects) {
        currentNode = await applyCompression(offlineContext, currentNode, config.compression)
        effectsApplied.push('compression')
      }
      
      // 3. Gain (final level adjustment)
      if (config.gain.enabled) {
        currentNode = await applyGain(offlineContext, currentNode, config.gain)
        effectsApplied.push('gain')
      }
      
      // Connect to destination and render
      currentNode.connect(offlineContext.destination)
      sourceNode.start(0)
      
      const processedBuffer = await offlineContext.startRendering()
      const processedBlob = await audioBufferToBlob(processedBuffer)
      
      const processingTime = performance.now() - startTime
      lastProcessingTime.value = processingTime
      
      console.log(`✅ Audio processing complete: ${effectsApplied.join(', ')} (${processingTime.toFixed(1)}ms)`)
      
      return {
        processedBlob,
        processingTimeMs: processingTime,
        effectsApplied
      }
      
    } catch (error) {
      console.error('❌ Audio processing failed:', error)
      
      // Return original audio on error
      return {
        processedBlob: audioBlob,
        processingTimeMs: performance.now() - startTime,
        effectsApplied: ['error_fallback']
      }
    } finally {
      isProcessing.value = false
    }
  }
  
  /**
   * Apply EQ using BiquadFilter nodes
   */
  const applyEQ = async (
    context: OfflineAudioContext, 
    inputNode: AudioNode, 
    config: EQConfig
  ): Promise<AudioNode> => {
    console.log('🎚️ Applying EQ:', config)
    
    // Low frequency filter (bass)
    const lowFilter = context.createBiquadFilter()
    lowFilter.type = 'lowshelf'
    lowFilter.frequency.setValueAtTime(320, context.currentTime)
    lowFilter.gain.setValueAtTime(config.lowGain, context.currentTime)
    
    // Mid frequency filter 
    const midFilter = context.createBiquadFilter()
    midFilter.type = 'peaking'
    midFilter.frequency.setValueAtTime(1000, context.currentTime)
    midFilter.Q.setValueAtTime(1, context.currentTime)
    midFilter.gain.setValueAtTime(config.midGain, context.currentTime)
    
    // High frequency filter (treble)
    const highFilter = context.createBiquadFilter()
    highFilter.type = 'highshelf'
    highFilter.frequency.setValueAtTime(3200, context.currentTime)
    highFilter.gain.setValueAtTime(config.highGain, context.currentTime)
    
    // Chain filters
    inputNode.connect(lowFilter)
    lowFilter.connect(midFilter)
    midFilter.connect(highFilter)
    
    return highFilter
  }
  
  /**
   * Apply dynamic range compression
   */
  const applyCompression = async (
    context: OfflineAudioContext,
    inputNode: AudioNode,
    config: DynamicsCompressorConfig
  ): Promise<AudioNode> => {
    console.log('🗜️ Applying compression:', config)
    
    const compressor = context.createDynamicsCompressor()
    
    // Set compressor parameters
    compressor.threshold.setValueAtTime(config.threshold, context.currentTime)
    compressor.knee.setValueAtTime(config.knee, context.currentTime)
    compressor.ratio.setValueAtTime(config.ratio, context.currentTime)
    compressor.attack.setValueAtTime(config.attack, context.currentTime)
    compressor.release.setValueAtTime(config.release, context.currentTime)
    
    inputNode.connect(compressor)
    return compressor
  }
  
  /**
   * Apply gain adjustment
   */
  const applyGain = async (
    context: OfflineAudioContext,
    inputNode: AudioNode,
    config: GainConfig
  ): Promise<AudioNode> => {
    console.log('🔊 Applying gain:', config)
    
    const gainNode = context.createGain()
    gainNode.gain.setValueAtTime(config.gain, context.currentTime)
    
    inputNode.connect(gainNode)
    return gainNode
  }
  
  /**
   * Convert AudioBuffer to WAV Blob
   */
  const audioBufferToBlob = (audioBuffer: AudioBuffer): Blob => {
    const numberOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const length = audioBuffer.length
    
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(buffer)
    
    // WAV header
    const writeString = (offset: number, string: string): void => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * numberOfChannels * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * numberOfChannels * 2, true)
    
    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
        offset += 2
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' })
  }
  
  /**
   * Load effects configuration from localStorage
   */
  const loadConfigFromStorage = (): void => {
    try {
      const storedConfigJson = localStorage.getItem('audioEffectsConfig')
      if (storedConfigJson) {
        const storedConfig = JSON.parse(storedConfigJson)
        // Merge stored config with defaults to handle new settings
        effectsConfig.value = { ...defaultConfig, ...storedConfig }
        console.log('🔧 Effects config loaded from localStorage:', effectsConfig.value)
      } else {
        console.log('🔧 No stored effects config found, using defaults')
      }
    } catch (error) {
      console.warn('⚠️ Failed to load effects config from localStorage:', error)
      effectsConfig.value = { ...defaultConfig }
    }
  }

  /**
   * Save effects configuration to localStorage
   */
  const saveConfigToStorage = (config: AudioEffectsConfig): void => {
    try {
      localStorage.setItem('audioEffectsConfig', JSON.stringify(config))
      console.log('✅ Effects config saved to localStorage')
    } catch (error) {
      console.error('❌ Failed to save effects config to localStorage:', error)
    }
  }

  /**
   * Update effects configuration
   */
  const updateConfig = (newConfig: Partial<AudioEffectsConfig>) => {
    effectsConfig.value = { ...effectsConfig.value, ...newConfig }
    saveConfigToStorage(effectsConfig.value)
    console.log('🔧 Effects config updated and saved:', effectsConfig.value)
  }
  
  /**
   * Reset to default configuration
   */
  const resetToDefaults = () => {
    effectsConfig.value = { ...defaultConfig }
    saveConfigToStorage(effectsConfig.value)
    console.log('🔄 Effects config reset to defaults and saved')
  }
  
  // Initialize capabilities and load configuration
  const initializeEffects = () => {
    if (!capabilities.value) {
      capabilities.value = detectCapabilities()
    }
    loadConfigFromStorage()
  }

  // Auto-initialize on first use
  initializeEffects()
  
  // Computed properties for easy access
  const isSupported = computed(() => capabilities.value?.webAudio.dynamicsCompressor ?? false)
  const canUseNoiseSuppression = computed(() => 
    capabilities.value?.mediaConstraints.noiseSuppression ?? false
  )
  
  return {
    // State
    effectsConfig,
    capabilities,
    isProcessing,
    lastProcessingTime,
    
    // Computed
    isSupported,
    canUseNoiseSuppression,
    
    // Core functions
    processAudioBlob,
    getRecordingConstraints,
    
    // Configuration
    updateConfig,
    resetToDefaults,
    loadConfigFromStorage,
    saveConfigToStorage,
    
    // Utilities
    detectCapabilities
  }
}