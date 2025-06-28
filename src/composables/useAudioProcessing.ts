import { ref } from 'vue';
import { useVADProcessor } from './useVADProcessor';

interface ProcessingOptions {
  trimSilence?: boolean;
  padding?: number;
  maxTrimStart?: number;
  maxTrimEnd?: number;
  returnSilenceInfo?: boolean;
  [key: string]: any;
}

interface SilenceInfo {
  originalSilenceStart: number;
  originalSilenceEnd: number;
  trimmedStart: number;
  trimmedEnd: number;
  finalSilenceStart: number;
  finalSilenceEnd: number;
}

interface ProcessingResult {
  blob: Blob;
  boundaries: any;
  silenceInfo?: SilenceInfo;
  vadUsed: boolean;
  processingTime?: number;
  error?: string;
}

export function useAudioProcessing() {
  const isProcessing = ref(false);
  const { trimAudioWithVAD, detectSpeechBoundariesVAD, vadReady, initVAD } = useVADProcessor();

  // Main VAD-based processing function with silence tracking
  const processAudio = async (audioBlob: Blob, options: ProcessingOptions = {}): Promise<ProcessingResult> => {
    const {
      trimSilence = true,
      padding = 0.15, // 150ms padding (aggressive settings from tuner)
      threshold = 0.4, // Balanced threshold for better silence detection
      maxTrimStart = 3.0,
      maxTrimEnd = 2.0,
      returnSilenceInfo = true
    } = options;

    try {
      isProcessing.value = true;
      
      // Get RAW speech boundaries using VAD (no padding applied here)
      const vadOptions = {
        ...options,
        threshold
        // padding removed - detectSpeechBoundariesVAD now only does detection
      };
      const boundaries = await detectSpeechBoundariesVAD(audioBlob, vadOptions);
      
      let processedBlob = audioBlob;
      let silenceInfo = {
        originalSilenceStart: boundaries.silenceStart,
        originalSilenceEnd: boundaries.silenceEnd,
        trimmedStart: 0,
        trimmedEnd: 0,
        finalSilenceStart: boundaries.silenceStart,
        finalSilenceEnd: boundaries.silenceEnd
      };

      // Apply VAD-based trimming if requested
      if (trimSilence && (boundaries.silenceStart > 0.1 || boundaries.silenceEnd > 0.1)) {
        const trimResult = await trimAudioWithVAD(audioBlob, {
          padding, // Apply padding during trimming phase
          maxTrimStart,
          maxTrimEnd,
          boundaries // Pass the RAW boundaries - padding will be applied in trimming
        });
        
        if (trimResult.blob && (trimResult.trimmedStart > 0.05 || trimResult.trimmedEnd > 0.05)) {
          processedBlob = trimResult.blob;
          silenceInfo.trimmedStart = trimResult.trimmedStart;
          silenceInfo.trimmedEnd = trimResult.trimmedEnd;
          
          // Update final silence amounts after trimming
          silenceInfo.finalSilenceStart = Math.max(0, boundaries.silenceStart - trimResult.trimmedStart);
          silenceInfo.finalSilenceEnd = Math.max(0, boundaries.silenceEnd - trimResult.trimmedEnd);
          
          console.log(`✂️ VAD processed: trimmed ${trimResult.trimmedStart.toFixed(3)}s from start, ${trimResult.trimmedEnd.toFixed(3)}s from end`);
        }
      }

      isProcessing.value = false;
      
      return {
        blob: processedBlob,
        boundaries,
        silenceInfo: returnSilenceInfo ? silenceInfo : undefined,
        vadUsed: vadReady.value,
        processingTime: Date.now()
      };
      
    } catch (error) {
      console.error('Error processing audio:', error);
      isProcessing.value = false;
      return {
        blob: audioBlob,
        boundaries: null,
        silenceInfo: returnSilenceInfo ? {
          originalSilenceStart: 0,
          originalSilenceEnd: 0,
          trimmedStart: 0,
          trimmedEnd: 0,
          finalSilenceStart: 0,
          finalSilenceEnd: 0
        } : undefined,
        vadUsed: false,
        error: (error as Error).message
      };
    }
  };

  // Align two audio recordings using VAD-based processing
  const alignRecordings = async (targetBlob: Blob, userBlob: Blob, options: ProcessingOptions = {}) => {
    const {
      trimUserSilence = true,
      trimTargetSilence = false,
      preserveTargetTiming = true,
      syncSilencePadding = true, // New option to sync padding based on target
      ...vadOptions
    } = options;

    try {
      isProcessing.value = true;
      
      if (!targetBlob || !userBlob) {
        throw new Error('Both target and user audio required');
      }

      console.log('🎧 Starting VAD-based audio alignment');
      
      // Process both audio files to get silence information
      const [targetResult, userResult] = await Promise.all([
        processAudio(targetBlob, { trimSilence: trimTargetSilence && !preserveTargetTiming, ...vadOptions }),
        processAudio(userBlob, { trimSilence: false, ...vadOptions }) // Don't trim user yet
      ]);

      let alignedTargetBlob = targetResult.blob;
      let alignedUserBlob = userResult.blob;
      let userTrimInfo = { trimmedStart: 0, trimmedEnd: 0 };
      let targetTrimInfo = { trimmedStart: 0, trimmedEnd: 0 };

      // Extract silence information
      const targetSilence = targetResult.silenceInfo;
      const userSilence = userResult.silenceInfo;

      // Apply user trimming with potential silence synchronization
      if (trimUserSilence && userResult.boundaries) {
        let trimOptions = { ...vadOptions };
        
        // Sync padding to match target silence characteristics if requested
        if (syncSilencePadding && targetSilence && preserveTargetTiming) {
          // Use target's silence pattern to inform user trimming
          const targetStartSilence = targetSilence.originalSilenceStart;
          const targetEndSilence = targetSilence.originalSilenceEnd;
          
          // Adjust padding to preserve similar silence structure
          if (targetStartSilence < 0.2) {
            trimOptions.padding = Math.min((trimOptions.padding as number) || 0.15, targetStartSilence + 0.05);
          }
          
          console.log(`🔄 Syncing user padding to target silence pattern: ${(trimOptions.padding as number).toFixed(3)}s`);
        }

        const userTrimResult = await trimAudioWithVAD(userBlob, trimOptions);
        
        if (userTrimResult.blob && (userTrimResult.trimmedStart > 0.05 || userTrimResult.trimmedEnd > 0.05)) {
          alignedUserBlob = userTrimResult.blob;
          userTrimInfo = {
            trimmedStart: userTrimResult.trimmedStart,
            trimmedEnd: userTrimResult.trimmedEnd
          };
        }
      }

      // Calculate alignment quality based on silence patterns
      const alignmentQuality = calculateVADAlignmentQuality(targetResult.boundaries, userResult.boundaries, userTrimInfo);
      
      console.log(`✅ VAD alignment complete:`, {
        targetSilence: targetSilence ? `${targetSilence.originalSilenceStart.toFixed(3)}s - ${targetSilence.originalSilenceEnd.toFixed(3)}s` : 'N/A',
        userTrimmed: `${userTrimInfo.trimmedStart.toFixed(3)}s - ${userTrimInfo.trimmedEnd.toFixed(3)}s`,
        quality: alignmentQuality.toFixed(2),
        vadUsed: targetResult.vadUsed && userResult.vadUsed
      });

      isProcessing.value = false;
      
      return {
        targetBlob: alignedTargetBlob,
        userBlob: alignedUserBlob,
        userTrimInfo,
        targetTrimInfo,
        alignmentQuality,
        vadUsed: targetResult.vadUsed && userResult.vadUsed,
        silenceInfo: {
          target: targetSilence,
          user: userSilence
        },
        originalBoundaries: {
          target: targetResult.boundaries,
          user: userResult.boundaries
        }
      };
      
    } catch (error) {
      console.error('Error in audio alignment:', error);
      isProcessing.value = false;
      
      return {
        targetBlob: targetBlob || null,
        userBlob: userBlob || null,
        userTrimInfo: { trimmedStart: 0, trimmedEnd: 0 },
        targetTrimInfo: { trimmedStart: 0, trimmedEnd: 0 },
        alignmentQuality: 0,
        vadUsed: false,
        error: (error as Error).message
      };
    }
  };

  // Calculate alignment quality for VAD results
  const calculateVADAlignmentQuality = (targetBoundaries: any, userBoundaries: any, userTrimInfo: any): number => {
    try {
      if (!targetBoundaries || !userBoundaries) return 0.3;
      
      const targetSpeechDuration = targetBoundaries.endTime - targetBoundaries.startTime;
      const userSpeechDuration = userBoundaries.endTime - userBoundaries.startTime;
      
      // Adjust user speech duration for trimming
      const adjustedUserDuration = userSpeechDuration - userTrimInfo.trimmedStart - userTrimInfo.trimmedEnd;
      
      // Duration similarity (0-1, higher is better)
      const durationSimilarity = 1 - Math.min(1, Math.abs(targetSpeechDuration - adjustedUserDuration) / Math.max(targetSpeechDuration, adjustedUserDuration));
      
      // Onset alignment quality (0-1, higher is better)
      const onsetAlignment = 1 - Math.min(1, Math.abs(targetBoundaries.startTime - (userBoundaries.startTime - userTrimInfo.trimmedStart)) / 2.0);
      
      // VAD confidence factor
      const vadConfidence = (targetBoundaries.confidenceScore || 0.7) * (userBoundaries.confidenceScore || 0.7);
      
      // Weighted combination
      const quality = (durationSimilarity * 0.4) + (onsetAlignment * 0.3) + (vadConfidence * 0.3);
      
      return Math.max(0, Math.min(1, quality));
      
    } catch (error) {
      console.warn('Error calculating VAD alignment quality:', error);
      return 0.6; // Default reasonable quality for VAD
    }
  };

  // Legacy compatibility function for backward compatibility
  const detectSpeechOnset = async (audioBlob: Blob, threshold: number = 0.01): Promise<number> => {
    const result = await processAudio(audioBlob, { trimSilence: false });
    return result.boundaries ? result.boundaries.startTime : 0;
  };

  // Legacy compatibility function
  const trimSilence = async (audioBlob: Blob, options: ProcessingOptions = {}) => {
    const result = await processAudio(audioBlob, { 
      trimSilence: true,
      ...options
    });
    
    if (result.silenceInfo) {
      return {
        blob: result.blob,
        trimmedStart: result.silenceInfo.trimmedStart,
        trimmedEnd: result.silenceInfo.trimmedEnd,
        originalDuration: result.boundaries ? result.boundaries.endTime : 0,
        newDuration: result.boundaries ? (result.boundaries.endTime - result.silenceInfo.trimmedStart - result.silenceInfo.trimmedEnd) : 0
      };
    }
    
    return { blob: result.blob, trimmedStart: 0, trimmedEnd: 0 };
  };

  // Legacy compatibility function
  const autoAlignRecordings = async (targetBlob: Blob, userBlob: Blob, options: ProcessingOptions = {}) => {
    return await alignRecordings(targetBlob, userBlob, options);
  };

  return {
    isProcessing,
    
    // Main VAD-based functions
    processAudio,
    alignRecordings,
    calculateVADAlignmentQuality,
    
    // VAD processor functions
    trimAudioWithVAD,
    detectSpeechBoundariesVAD,
    vadReady,
    initVAD,
    
    // Legacy compatibility functions
    detectSpeechOnset,
    trimSilence,
    autoAlignRecordings
  };
}