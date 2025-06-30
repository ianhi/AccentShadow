import { ref } from 'vue';
import { useVADProcessor } from './useVADProcessor';

interface VADOptions {
  threshold?: number;
  minSpeechDuration?: number;
  maxSilenceDuration?: number;
  padding?: number;
  [key: string]: any;
}

interface ProcessAudioResult {
  audioBlob: Blob;
  vadBoundaries: any;
  processed: boolean;
}

interface AudioWithBoundaries {
  audioBlob: Blob;
  vadBoundaries: any;
  alreadyNormalized?: boolean;
}

interface AlignmentResult {
  audio1Aligned: Blob;
  audio2Aligned: Blob;
  alignmentInfo: {
    paddingAdded: number;
    finalDuration: number;
    method: string;
    error?: string;
  };
}

export function useSmartAudioAlignment() {
  const isProcessing = ref(false);
  const { detectSpeechBoundariesVAD, vadReady, initVAD } = useVADProcessor();
  
  // Settings - can be made configurable later (keep higher for length balancing)
  const defaultPaddingMs = ref(200); // Keep 200ms for alignment to balance different length audios
  
  /**
   * Process single audio: run VAD and store boundaries with raw audio
   * @param {Blob} audioBlob - Raw audio blob
   * @param {Object} vadOptions - Optional VAD configuration options
   * @returns {Object} - { audioBlob, vadBoundaries, processed: boolean }
   */
  const processAudio = async (audioBlob: Blob, vadOptions: VADOptions = {}): Promise<ProcessAudioResult> => {
    try {
      isProcessing.value = true;
      console.log('🎙️ Processing audio with VAD...', vadOptions.threshold ? `(threshold: ${vadOptions.threshold})` : '(default settings)');
      
      // Run VAD analysis with provided options
      const vadBoundaries = await detectSpeechBoundariesVAD(audioBlob, vadOptions);
      
      if (!vadBoundaries || vadBoundaries.error || vadBoundaries.vadFailed) {
        console.warn('⚠️ VAD processing failed, keeping original audio');
        return {
          audioBlob,
          vadBoundaries: vadBoundaries?.vadFailed ? vadBoundaries : null,
          processed: false
        };
      }
      
      console.log('✅ VAD processing complete:', {
        speechStart: vadBoundaries.startTime?.toFixed(3),
        speechEnd: vadBoundaries.endTime?.toFixed(3),
        silenceStart: vadBoundaries.silenceStart?.toFixed(3),
        silenceEnd: vadBoundaries.silenceEnd?.toFixed(3)
      });
      
      return {
        audioBlob,
        vadBoundaries,
        processed: true
      };
      
    } catch (error) {
      console.error('❌ Error processing audio:', error);
      return {
        audioBlob,
        vadBoundaries: null,
        processed: false
      };
    } finally {
      isProcessing.value = false;
    }
  };
  
  /**
   * Normalize single audio to have exact padding before and after speech
   * @param {Blob} audioBlob - Raw audio blob
   * @param {Object} vadBoundaries - VAD speech boundaries
   * @param {number} paddingMs - Desired padding in milliseconds (default: 200)
   * @returns {Promise<Blob>} - Normalized audio blob
   */
  const normalizeAudioSilence = async (audioBlob: Blob, vadBoundaries: any, paddingMs: number | null = null): Promise<Blob> => {
    const padding = paddingMs || defaultPaddingMs.value;
    
    console.log('🔍 normalizeAudioSilence called with:', {
      hasVadBoundaries: !!vadBoundaries,
      vadBoundaries: vadBoundaries,
      startTime: vadBoundaries?.startTime,
      endTime: vadBoundaries?.endTime,
      paddingMs: padding
    });
    
    if (!vadBoundaries || vadBoundaries.startTime === undefined || vadBoundaries.endTime === undefined) {
      console.log('📄 No valid VAD boundaries available, returning original audio', {
        hasVadBoundaries: !!vadBoundaries,
        startTime: vadBoundaries?.startTime,
        endTime: vadBoundaries?.endTime
      });
      return audioBlob;
    }
    
    try {
      isProcessing.value = true;
      console.log(`🔧 Normalizing audio with ${padding}ms padding...`);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const sampleRate = audioBuffer.sampleRate;
      const paddingSamples = Math.floor((padding / 1000) * sampleRate);
      
      // Use original speech boundaries (before VAD padding) for accurate trimming
      const speechStart = vadBoundaries.originalSpeechStart !== undefined 
        ? vadBoundaries.originalSpeechStart 
        : vadBoundaries.startTime;
      const speechEnd = vadBoundaries.originalSpeechEnd !== undefined 
        ? vadBoundaries.originalSpeechEnd 
        : vadBoundaries.endTime;
      
      // Calculate speech boundaries in samples
      const speechStartSample = Math.floor(speechStart * sampleRate);
      const speechEndSample = Math.floor(speechEnd * sampleRate);
      const speechDurationSamples = speechEndSample - speechStartSample;
      
      // Calculate new buffer length: padding + speech + padding
      const newLength = paddingSamples + speechDurationSamples + paddingSamples;
      const newBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, newLength, sampleRate);
      
      console.log('📏 Audio normalization details:', {
        originalDuration: audioBuffer.duration.toFixed(3) + 's',
        vadPaddedStart: vadBoundaries.startTime.toFixed(3) + 's',
        vadPaddedEnd: vadBoundaries.endTime.toFixed(3) + 's',
        originalSpeechStart: speechStart.toFixed(3) + 's',
        originalSpeechEnd: speechEnd.toFixed(3) + 's',
        speechDuration: (speechDurationSamples / sampleRate).toFixed(3) + 's',
        paddingMs: padding + 'ms',
        newDuration: (newLength / sampleRate).toFixed(3) + 's'
      });
      
      // Copy audio data for each channel
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const newData = newBuffer.getChannelData(channel);
        
        // Add silence padding at the start
        for (let i = 0; i < paddingSamples; i++) {
          newData[i] = 0;
        }
        
        // Copy speech portion
        for (let i = 0; i < speechDurationSamples; i++) {
          if (speechStartSample + i < originalData.length) {
            newData[paddingSamples + i] = originalData[speechStartSample + i];
          } else {
            newData[paddingSamples + i] = 0; // Safety fallback
          }
        }
        
        // Add silence padding at the end
        for (let i = paddingSamples + speechDurationSamples; i < newLength; i++) {
          newData[i] = 0;
        }
      }
      
      console.log('✅ Audio normalization complete');
      return audioBufferToBlob(newBuffer);
      
    } catch (error) {
      console.error('❌ Error normalizing audio:', error);
      return audioBlob; // Return original on error
    } finally {
      isProcessing.value = false;
    }
  };
  
  /**
   * Align two audios by normalizing both and padding shorter one to match length
   * @param {Object} audio1 - { audioBlob, vadBoundaries }
   * @param {Object} audio2 - { audioBlob, vadBoundaries }  
   * @param {number} paddingMs - Desired padding in milliseconds (default: 200)
   * @returns {Promise<Object>} - { audio1Aligned, audio2Aligned, alignmentInfo }
   */
  const alignTwoAudios = async (audio1: AudioWithBoundaries, audio2: AudioWithBoundaries, paddingMs: number | null = null): Promise<AlignmentResult> => {
    const padding = paddingMs || defaultPaddingMs.value;
    
    try {
      isProcessing.value = true;
      console.log('🔄 Aligning two audios...');
      
      // First normalize both audios to have consistent padding
      // Skip normalization if audio is already normalized (e.g., target audio that was already processed)
      console.log('🔧 Alignment normalization check:', {
        audio1AlreadyNormalized: !!audio1.alreadyNormalized,
        audio2AlreadyNormalized: !!audio2.alreadyNormalized
      });
      
      const normalized1 = audio1.alreadyNormalized 
        ? audio1.audioBlob 
        : await normalizeAudioSilence(audio1.audioBlob, audio1.vadBoundaries, padding);
      
      const normalized2 = audio2.alreadyNormalized 
        ? audio2.audioBlob 
        : await normalizeAudioSilence(audio2.audioBlob, audio2.vadBoundaries, padding);
      
      if (audio1.alreadyNormalized) {
        console.log('🎯 ✅ SKIP: Audio1 normalization skipped (already normalized - prevents double trimming)');
      } else {
        console.log('🎯 🔄 PROCESS: Audio1 being normalized (recalculating padding from original)');
      }
      if (audio2.alreadyNormalized) {
        console.log('🎯 ✅ SKIP: Audio2 normalization skipped (already normalized - prevents double trimming)');
      } else {
        console.log('🎯 🔄 PROCESS: Audio2 being normalized (fresh padding calculation)');
      }
      
      // Get durations of normalized audios
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const buffer1 = await audioContext.decodeAudioData(await normalized1.arrayBuffer());
      const buffer2 = await audioContext.decodeAudioData(await normalized2.arrayBuffer());
      
      const duration1 = buffer1.duration;
      const duration2 = buffer2.duration;
      
      console.log('⚖️ Comparing normalized durations:', {
        audio1: duration1.toFixed(3) + 's',
        audio2: duration2.toFixed(3) + 's',
        difference: Math.abs(duration1 - duration2).toFixed(3) + 's'
      });
      
      // If they're already very close (within 10ms), no need to pad
      if (Math.abs(duration1 - duration2) < 0.01) {
        console.log('✅ Audios already aligned, no padding needed');
        return {
          audio1Aligned: normalized1,
          audio2Aligned: normalized2,
          alignmentInfo: {
            paddingAdded: 0,
            finalDuration: duration1,
            method: 'already_aligned'
          }
        };
      }
      
      // Determine which audio needs padding
      let shorterAudio: Blob, longerAudio: Blob, shorterBuffer: AudioBuffer, targetDuration: number;
      let audio1Final: Blob = normalized1;
      let audio2Final: Blob = normalized2;
      
      if (duration1 < duration2) {
        shorterAudio = normalized1;
        longerAudio = normalized2;
        shorterBuffer = buffer1;
        targetDuration = duration2;
        audio2Final = normalized2;
      } else {
        shorterAudio = normalized2;
        longerAudio = normalized1;
        shorterBuffer = buffer2;
        targetDuration = duration1;
        audio1Final = normalized1;
      }
      
      // Pad the shorter audio at the end
      const paddingNeeded = targetDuration - shorterBuffer.duration;
      const paddedAudio = await padAudioAtEnd(shorterAudio, paddingNeeded);
      
      if (duration1 < duration2) {
        audio1Final = paddedAudio;
      } else {
        audio2Final = paddedAudio;
      }
      
      console.log('✅ Audio alignment complete:', {
        paddingAdded: paddingNeeded.toFixed(3) + 's',
        finalDuration: targetDuration.toFixed(3) + 's'
      });
      
      return {
        audio1Aligned: audio1Final,
        audio2Aligned: audio2Final,
        alignmentInfo: {
          paddingAdded: paddingNeeded,
          finalDuration: targetDuration,
          method: 'end_padding'
        }
      };
      
    } catch (error) {
      console.error('❌ Error aligning audios:', error);
      // Return originals on error
      return {
        audio1Aligned: audio1.audioBlob,
        audio2Aligned: audio2.audioBlob,
        alignmentInfo: {
          paddingAdded: 0,
          finalDuration: 0,
          error: (error as Error).message,
          method: 'error_fallback'
        }
      };
    } finally {
      isProcessing.value = false;
    }
  };
  
  /**
   * Add silence padding to the end of an audio
   * @param {Blob} audioBlob - Audio to pad
   * @param {number} paddingSeconds - Seconds of silence to add
   * @returns {Promise<Blob>} - Padded audio blob
   */
  const padAudioAtEnd = async (audioBlob: Blob, paddingSeconds: number): Promise<Blob> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const sampleRate = audioBuffer.sampleRate;
    const paddingSamples = Math.floor(paddingSeconds * sampleRate);
    const newLength = audioBuffer.length + paddingSamples;
    
    const newBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, newLength, sampleRate);
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel);
      const newData = newBuffer.getChannelData(channel);
      
      // Copy original audio
      for (let i = 0; i < audioBuffer.length; i++) {
        newData[i] = originalData[i];
      }
      
      // Add silence padding
      for (let i = audioBuffer.length; i < newLength; i++) {
        newData[i] = 0;
      }
    }
    
    return audioBufferToBlob(newBuffer);
  };
  
  /**
   * Convert AudioBuffer to WAV Blob
   * @param {AudioBuffer} audioBuffer 
   * @returns {Blob}
   */
  const audioBufferToBlob = (audioBuffer: AudioBuffer): Blob => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string): void => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };
  
  return {
    isProcessing,
    defaultPaddingMs,
    vadReady,
    initVAD,
    
    // Main functions
    processAudio,
    normalizeAudioSilence,
    alignTwoAudios,
    
    // Utility functions
    padAudioAtEnd,
    audioBufferToBlob
  };
}