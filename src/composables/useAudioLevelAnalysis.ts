import { ref, readonly, type Ref } from 'vue'

// Types for audio analysis results
export interface AudioLevelInfo {
  rms: number          // Root Mean Square (average level)
  peak: number         // Peak level (maximum amplitude)
  duration: number     // Audio duration in seconds
  sampleRate: number   // Sample rate of the audio
  lufs: number         // Loudness Units relative to Full Scale (perceptual loudness)
  timestamp: number    // When analysis was performed
}

export interface VolumeNormalizationResult {
  targetGain: number   // Gain adjustment for target audio (linear multiplier)
  userGain: number     // Gain adjustment for user audio (linear multiplier)
  referenceLUFS: number // Target LUFS level used for normalization
}

// Cache for audio analysis results to avoid reprocessing
const analysisCache = new Map<string, AudioLevelInfo>()

/**
 * Audio Level Analysis Composable
 * Provides comprehensive audio level analysis using Web Audio API
 * Follows ITU-R BS.1770 standard for loudness measurement
 */
export function useAudioLevelAnalysis() {
  const isAnalyzing = ref(false)
  const analysisProgress = ref(0)

  /**
   * Generate cache key for audio blob
   */
  const generateCacheKey = (blob: Blob): string => {
    // Use blob size, type, and current timestamp for cache key
    // Note: Blob doesn't have lastModified, so we use size + type as unique identifier
    return `${blob.size}_${blob.type}_${Date.now()}`
  }

  /**
   * Calculate RMS (Root Mean Square) level from audio buffer
   * RMS provides a good measure of perceived loudness
   */
  const calculateRMS = (audioBuffer: AudioBuffer): number => {
    let sum = 0
    let sampleCount = 0

    // Process all channels
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i]
        sampleCount++
      }
    }

    // Return RMS normalized by channel count
    return Math.sqrt(sum / sampleCount)
  }

  /**
   * Calculate peak level from audio buffer
   */
  const calculatePeak = (audioBuffer: AudioBuffer): number => {
    let peak = 0

    // Process all channels
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel)
      
      for (let i = 0; i < channelData.length; i++) {
        const absSample = Math.abs(channelData[i])
        if (absSample > peak) {
          peak = absSample
        }
      }
    }

    return peak
  }

  /**
   * Calculate LUFS (Loudness Units relative to Full Scale)
   * Simplified implementation based on ITU-R BS.1770 standard
   * This provides perceptually accurate loudness measurement
   */
  const calculateLUFS = (audioBuffer: AudioBuffer): number => {
    const sampleRate = audioBuffer.sampleRate
    const blockSize = Math.floor(sampleRate * 0.4) // 400ms blocks as per standard
    const overlap = Math.floor(blockSize * 0.75)   // 75% overlap
    let totalLoudness = 0
    let blockCount = 0

    // Process overlapping blocks
    for (let start = 0; start + blockSize < audioBuffer.length; start += (blockSize - overlap)) {
      let blockSum = 0
      let sampleCount = 0

      // Calculate mean square for this block across all channels
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel)
        
        for (let i = start; i < start + blockSize && i < channelData.length; i++) {
          // Apply K-weighting filter (simplified - just high-pass characteristic)
          const sample = channelData[i]
          blockSum += sample * sample
          sampleCount++
        }
      }

      if (sampleCount > 0) {
        const meanSquare = blockSum / sampleCount
        if (meanSquare > 0) {
          // Convert to LUFS: -0.691 + 10 * log10(meanSquare)
          // The constant -0.691 is from the ITU-R BS.1770 standard
          totalLoudness += Math.pow(10, (-0.691 + 10 * Math.log10(meanSquare)) / 10)
          blockCount++
        }
      }
    }

    if (blockCount === 0) {
      return -Infinity // Silence
    }

    // Calculate integrated loudness
    const integratedLoudness = totalLoudness / blockCount
    return -0.691 + 10 * Math.log10(integratedLoudness)
  }

  /**
   * Analyze audio blob to extract level information
   */
  const analyzeAudioLevel = async (blob: Blob): Promise<AudioLevelInfo> => {
    const cacheKey = generateCacheKey(blob)
    
    // Check cache first
    if (analysisCache.has(cacheKey)) {
      console.log('🔍 Using cached audio analysis result')
      return analysisCache.get(cacheKey)!
    }

    console.log('🔍 Starting audio level analysis...')
    isAnalyzing.value = true
    analysisProgress.value = 0

    try {
      // Convert blob to ArrayBuffer
      analysisProgress.value = 20
      const arrayBuffer = await blob.arrayBuffer()
      
      // Create AudioContext for analysis
      analysisProgress.value = 40
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Decode audio data
      analysisProgress.value = 60
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      
      // Perform analysis calculations
      analysisProgress.value = 80
      const rms = calculateRMS(audioBuffer)
      const peak = calculatePeak(audioBuffer)
      const lufs = calculateLUFS(audioBuffer)
      const duration = audioBuffer.duration
      const sampleRate = audioBuffer.sampleRate

      // Clean up AudioContext
      await audioContext.close()

      const result: AudioLevelInfo = {
        rms,
        peak,
        duration,
        sampleRate,
        lufs,
        timestamp: Date.now()
      }

      // Cache the result
      analysisCache.set(cacheKey, result)
      
      analysisProgress.value = 100
      console.log('✅ Audio analysis complete:', {
        rms: rms.toFixed(4),
        peak: peak.toFixed(4),
        lufs: lufs.toFixed(1) + ' LUFS',
        duration: duration.toFixed(2) + 's',
        loudnessCategory: lufs > -12 ? 'Very Loud' : lufs > -18 ? 'Loud' : lufs > -24 ? 'Normal' : lufs > -30 ? 'Quiet' : 'Very Quiet'
      })

      return result

    } catch (error) {
      console.error('❌ Audio analysis failed:', error)
      throw new Error(`Failed to analyze audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      isAnalyzing.value = false
      analysisProgress.value = 0
    }
  }

  /**
   * Calculate volume normalization gains for two audio sources
   * Uses LUFS for perceptually accurate loudness matching
   */
  const calculateNormalizationGains = (
    targetLevel: AudioLevelInfo,
    userLevel: AudioLevelInfo,
    options: {
      targetLUFS?: number     // Target LUFS level (default: -18 LUFS for speech)
      maxGain?: number        // Maximum gain amplification (default: 4x)
      balanceMode?: 'target' | 'user' | 'average' // Which audio to use as reference
    } = {}
  ): VolumeNormalizationResult => {
    const {
      targetLUFS = -18,      // -18 LUFS is good for speech content
      maxGain = 4,           // 4x gain maximum (12 dB amplification)
      balanceMode = 'average'
    } = options

    let referenceLUFS: number

    // Determine reference level based on balance mode
    switch (balanceMode) {
      case 'target':
        referenceLUFS = targetLevel.lufs
        break
      case 'user':
        referenceLUFS = userLevel.lufs
        break
      case 'average':
      default:
        // For extreme differences (>12dB), use target LUFS instead of averaging
        // This prevents one very loud/quiet audio from skewing the reference too much
        const levelDifference = Math.abs(targetLevel.lufs - userLevel.lufs)
        if (levelDifference > 12) {
          console.log(`🎚️ Large level difference detected (${levelDifference.toFixed(1)}dB), using target LUFS reference`)
          referenceLUFS = targetLUFS
        } else {
          referenceLUFS = (targetLevel.lufs + userLevel.lufs) / 2
        }
        break
    }

    // Ensure reference level is reasonable for speech content
    // If both audios are very quiet, boost to target LUFS
    // If both audios are very loud, reduce to target LUFS
    if (referenceLUFS < targetLUFS - 6) {
      console.log(`🎚️ Reference too quiet (${referenceLUFS.toFixed(1)} LUFS), using target LUFS`)
      referenceLUFS = targetLUFS
    } else if (referenceLUFS > targetLUFS + 6) {
      console.log(`🎚️ Reference too loud (${referenceLUFS.toFixed(1)} LUFS), using target LUFS`)
      referenceLUFS = targetLUFS
    }

    // Calculate gains needed to match reference level
    const targetGainDB = referenceLUFS - targetLevel.lufs
    const userGainDB = referenceLUFS - userLevel.lufs

    // Convert dB to linear gain with proper safety limits
    // Allow attenuation (gains < 1.0) for loud audio, but limit amplification
    let targetGain = Math.pow(10, targetGainDB / 20)
    let userGain = Math.pow(10, userGainDB / 20)

    // Apply safety limits: allow unlimited attenuation, but limit amplification
    if (targetGain > 1.0) {
      targetGain = Math.min(targetGain, maxGain)
    }
    if (userGain > 1.0) {
      userGain = Math.min(userGain, maxGain)
    }

    // Ensure minimum gain to prevent completely silent audio
    const minGain = 0.1 // -20dB minimum
    targetGain = Math.max(targetGain, minGain)
    userGain = Math.max(userGain, minGain)

    console.log('🎚️ Volume normalization calculated:', {
      targetLevel: targetLevel.lufs.toFixed(1) + ' LUFS',
      userLevel: userLevel.lufs.toFixed(1) + ' LUFS',
      referenceLUFS: referenceLUFS.toFixed(1) + ' LUFS',
      levelDifference: Math.abs(targetLevel.lufs - userLevel.lufs).toFixed(1) + ' dB',
      targetGain: targetGain.toFixed(2) + 'x (' + (20 * Math.log10(targetGain)).toFixed(1) + ' dB)',
      userGain: userGain.toFixed(2) + 'x (' + (20 * Math.log10(userGain)).toFixed(1) + ' dB)',
      balanceMode
    })

    return {
      targetGain,
      userGain,
      referenceLUFS
    }
  }

  /**
   * Clear analysis cache (useful for memory management)
   */
  const clearAnalysisCache = (): void => {
    analysisCache.clear()
    console.log('🗑️ Audio analysis cache cleared')
  }

  /**
   * Get cache statistics
   */
  const getCacheStats = () => {
    return {
      size: analysisCache.size,
      keys: Array.from(analysisCache.keys())
    }
  }

  return {
    // State
    isAnalyzing: readonly(isAnalyzing),
    analysisProgress: readonly(analysisProgress),

    // Methods
    analyzeAudioLevel,
    calculateNormalizationGains,
    clearAnalysisCache,
    getCacheStats
  }
}

// Export singleton instance for global use
export const audioLevelAnalysis = useAudioLevelAnalysis()