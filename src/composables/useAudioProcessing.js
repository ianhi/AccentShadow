import { ref } from 'vue';
import { useVADProcessor } from './useVADProcessor.js';

export function useAudioProcessing() {
  const isProcessing = ref(false);
  const { trimAudioWithVAD, detectSpeechBoundariesVAD, vadReady, initVAD } = useVADProcessor();

  // Advanced silence detection with multiple algorithms
  const detectSilenceBoundaries = async (audioBlob, options = {}) => {
    const {
      energyThreshold = 0.01,
      spectralThreshold = 0.02,
      minSilenceDuration = 0.1, // 100ms minimum silence
      lookAheadTime = 0.2, // 200ms lookahead for better detection
      windowSize = 0.02 // 20ms windows
    } = options;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const windowSamples = Math.floor(sampleRate * windowSize);
      const minSilenceSamples = Math.floor(sampleRate * minSilenceDuration);
      const lookAheadSamples = Math.floor(sampleRate * lookAheadTime);
      
      let speechStart = null;
      let speechEnd = null;
      
      // Forward pass to find speech start
      for (let i = 0; i < channelData.length - windowSamples; i += windowSamples) {
        const energy = calculateWindowEnergy(channelData, i, windowSamples);
        const spectralChange = calculateSpectralChange(channelData, i, windowSamples, sampleRate);
        
        // Combined energy and spectral criteria
        if (energy > energyThreshold || spectralChange > spectralThreshold) {
          // Look ahead to confirm this isn't just noise
          let confirmedSpeech = false;
          const lookAheadEnd = Math.min(i + lookAheadSamples, channelData.length - windowSamples);
          
          for (let j = i; j < lookAheadEnd; j += windowSamples) {
            const lookAheadEnergy = calculateWindowEnergy(channelData, j, windowSamples);
            if (lookAheadEnergy > energyThreshold * 1.5) {
              confirmedSpeech = true;
              break;
            }
          }
          
          if (confirmedSpeech) {
            speechStart = Math.max(0, i - Math.floor(windowSamples / 2)); // Slight padding
            break;
          }
        }
      }
      
      // Backward pass to find speech end
      for (let i = channelData.length - windowSamples; i >= 0; i -= windowSamples) {
        const energy = calculateWindowEnergy(channelData, i, windowSamples);
        const spectralChange = calculateSpectralChange(channelData, i, windowSamples, sampleRate);
        
        if (energy > energyThreshold || spectralChange > spectralThreshold) {
          speechEnd = Math.min(channelData.length, i + windowSamples + Math.floor(windowSamples / 2));
          break;
        }
      }
      
      const startTime = speechStart ? speechStart / sampleRate : 0;
      const endTime = speechEnd ? speechEnd / sampleRate : audioBuffer.duration;
      
      console.log(`🔍 Speech boundaries detected: ${startTime.toFixed(3)}s - ${endTime.toFixed(3)}s`);
      
      return {
        startTime,
        endTime,
        startSample: speechStart || 0,
        endSample: speechEnd || channelData.length,
        silenceStart: startTime,
        silenceEnd: audioBuffer.duration - endTime
      };
    } catch (error) {
      console.error('Error detecting silence boundaries:', error);
      return {
        startTime: 0,
        endTime: 0,
        startSample: 0,
        endSample: 0,
        silenceStart: 0,
        silenceEnd: 0
      };
    }
  };

  // Helper function to calculate RMS energy for a window
  const calculateWindowEnergy = (channelData, startSample, windowSamples) => {
    let sum = 0;
    for (let i = startSample; i < startSample + windowSamples && i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    return Math.sqrt(sum / windowSamples);
  };

  // Helper function to calculate spectral change (simplified spectral centroid shift)
  const calculateSpectralChange = (channelData, startSample, windowSamples, sampleRate) => {
    if (startSample < windowSamples) return 0;
    
    const currentEnergy = calculateWindowEnergy(channelData, startSample, windowSamples);
    const previousEnergy = calculateWindowEnergy(channelData, startSample - windowSamples, windowSamples);
    
    return Math.abs(currentEnergy - previousEnergy);
  };

  // Legacy function for backward compatibility
  const detectSpeechOnset = async (audioBlob, threshold = 0.01) => {
    const boundaries = await detectSilenceBoundaries(audioBlob, { energyThreshold: threshold });
    return boundaries.startTime;
  };

  // Intelligent silence trimming with start and end trimming
  const trimSilence = async (audioBlob, options = {}) => {
    const {
      trimStart = true,
      trimEnd = true,
      maxTrimStart = 3.0, // Maximum 3 seconds from start
      maxTrimEnd = 2.0,   // Maximum 2 seconds from end
      padding = 0.05,     // 50ms padding to preserve natural speech
      trimAmount = null   // Legacy: specific amount to trim from start
    } = options;

    try {
      isProcessing.value = true;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Legacy mode: trim specific amount from start
      if (trimAmount !== null && trimAmount > 0) {
        return await legacyTrimSilence(audioBlob, trimAmount);
      }
      
      // Intelligent mode: detect and trim silence
      const boundaries = await detectSilenceBoundaries(audioBlob);
      const sampleRate = audioBuffer.sampleRate;
      const paddingSamples = Math.floor(padding * sampleRate);
      
      let startTrimSamples = 0;
      let endTrimSamples = 0;
      
      if (trimStart && boundaries.silenceStart > 0) {
        const maxStartTrimSamples = Math.floor(maxTrimStart * sampleRate);
        startTrimSamples = Math.min(
          Math.max(0, boundaries.startSample - paddingSamples),
          maxStartTrimSamples
        );
      }
      
      if (trimEnd && boundaries.silenceEnd > 0) {
        const maxEndTrimSamples = Math.floor(maxTrimEnd * sampleRate);
        endTrimSamples = Math.min(
          Math.max(0, audioBuffer.length - boundaries.endSample - paddingSamples),
          maxEndTrimSamples
        );
      }
      
      const newLength = audioBuffer.length - startTrimSamples - endTrimSamples;
      
      if (newLength <= sampleRate * 0.1) { // Don't trim if result would be less than 100ms
        console.warn('⚠️ Trimming would result in too short audio, skipping');
        isProcessing.value = false;
        return audioBlob;
      }
      
      // Create new buffer with trimmed audio
      const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        newLength,
        sampleRate
      );
      
      // Copy trimmed audio data
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const trimmedChannelData = trimmedBuffer.getChannelData(channel);
        
        for (let i = 0; i < newLength; i++) {
          trimmedChannelData[i] = channelData[i + startTrimSamples];
        }
      }
      
      const trimmedBlob = await bufferToBlob(trimmedBuffer);
      
      const startTrimTime = startTrimSamples / sampleRate;
      const endTrimTime = endTrimSamples / sampleRate;
      
      console.log(`✂️ Trimmed ${startTrimTime.toFixed(3)}s from start, ${endTrimTime.toFixed(3)}s from end`);
      
      isProcessing.value = false;
      return {
        blob: trimmedBlob,
        trimmedStart: startTrimTime,
        trimmedEnd: endTrimTime,
        originalDuration: audioBuffer.duration,
        newDuration: newLength / sampleRate
      };
      
    } catch (error) {
      console.error('Error trimming silence:', error);
      isProcessing.value = false;
      return { blob: audioBlob, trimmedStart: 0, trimmedEnd: 0 };
    }
  };

  // Legacy trimming function for backward compatibility
  const legacyTrimSilence = async (audioBlob, trimAmount) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const sampleRate = audioBuffer.sampleRate;
      const trimSamples = Math.floor(trimAmount * sampleRate);
      
      if (trimSamples <= 0 || trimSamples >= audioBuffer.length) {
        return audioBlob;
      }
      
      const trimmedLength = audioBuffer.length - trimSamples;
      const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        trimmedLength,
        sampleRate
      );
      
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const trimmedChannelData = trimmedBuffer.getChannelData(channel);
        
        for (let i = 0; i < trimmedLength; i++) {
          trimmedChannelData[i] = channelData[i + trimSamples];
        }
      }
      
      return await bufferToBlob(trimmedBuffer);
    } catch (error) {
      console.error('Error in legacy trim:', error);
      return audioBlob;
    }
  };

  // Convert AudioBuffer to Blob
  const bufferToBlob = async (audioBuffer) => {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineContext.destination);
    bufferSource.start();
    
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to WAV format
    const wavBlob = audioBufferToWav(renderedBuffer);
    return new Blob([wavBlob], { type: 'audio/wav' });
  };

  // Simple WAV encoder
  const audioBufferToWav = (buffer) => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };

  // Professional audio alignment using Silero VAD or enhanced energy detection
  const autoAlignRecordings = async (targetBlob, userBlob, options = {}) => {
    const {
      alignmentMode = 'smart', // 'smart', 'onset', 'duration'
      trimUserSilence = true,
      trimTargetSilence = false, // Usually we don't trim target audio
      maxTrimAmount = 3.0,
      preserveTargetTiming = true, // Keep target audio timing intact
      useVAD = true // Use professional VAD by default when available
    } = options;
    
    try {
      isProcessing.value = true;
      
      if (!targetBlob || !userBlob) {
        throw new Error('Both target and user audio blobs are required');
      }
      
      const vadAvailable = vadReady.value && useVAD;
      console.log(`🎧 Starting audio alignment (mode: ${alignmentMode}, VAD: ${vadAvailable})`);
      
      if (vadAvailable && alignmentMode === 'smart') {
        // Use professional VAD for smart alignment
        return await professionalVADAlignment(targetBlob, userBlob, options);
      } else {
        // Use enhanced energy-based alignment
        return await enhancedEnergyAlignment(targetBlob, userBlob, options);
      }
      
    } catch (error) {
      console.error('Error in audio alignment:', error);
      isProcessing.value = false;
      return {
        targetBlob: targetBlob || null,
        userBlob: userBlob || null,
        trimmedAmount: 0,
        userTrimInfo: { trimmedStart: 0, trimmedEnd: 0 },
        targetTrimInfo: { trimmedStart: 0, trimmedEnd: 0 },
        alignmentQuality: 0,
        error: error.message
      };
    }
  };
  
  // Professional VAD alignment method
  const professionalVADAlignment = async (targetBlob, userBlob, options) => {
    const { trimUserSilence = true, trimTargetSilence = false, maxTrimAmount = 3.0, preserveTargetTiming = true } = options;
    
    try {
      console.log('🤖 Using Silero VAD for professional speech detection');
      
      // Step 1: Analyze both audio files with VAD
      const [targetBoundaries, userBoundaries] = await Promise.all([
        detectSpeechBoundariesVAD(targetBlob),
        detectSpeechBoundariesVAD(userBlob)
      ]);
      
      console.log('VAD Target boundaries:', {
        start: targetBoundaries.startTime.toFixed(3),
        end: targetBoundaries.endTime.toFixed(3),
        confidence: targetBoundaries.confidenceScore ? (targetBoundaries.confidenceScore * 100).toFixed(1) + '%' : 'N/A'
      });
      
      console.log('VAD User boundaries:', {
        start: userBoundaries.startTime.toFixed(3),
        end: userBoundaries.endTime.toFixed(3),
        confidence: userBoundaries.confidenceScore ? (userBoundaries.confidenceScore * 100).toFixed(1) + '%' : 'N/A'
      });
      
      let alignedTargetBlob = targetBlob;
      let alignedUserBlob = userBlob;
      let targetTrimInfo = { trimmedStart: 0, trimmedEnd: 0 };
      let userTrimInfo = { trimmedStart: 0, trimmedEnd: 0 };
      
      // Step 2: Apply professional VAD trimming
      if (trimUserSilence) {
        const userTrimResult = await trimAudioWithVAD(userBlob, {
          padding: 0.05,
          maxTrimStart: maxTrimAmount,
          maxTrimEnd: 2.0
        });
        
        if (userTrimResult.blob && (userTrimResult.trimmedStart > 0.05 || userTrimResult.trimmedEnd > 0.05)) {
          alignedUserBlob = userTrimResult.blob;
          userTrimInfo = {
            trimmedStart: userTrimResult.trimmedStart,
            trimmedEnd: userTrimResult.trimmedEnd
          };
          console.log(`✂️ VAD trimmed user audio: start=${userTrimResult.trimmedStart.toFixed(3)}s, end=${userTrimResult.trimmedEnd.toFixed(3)}s`);
        }
      }
      
      // Optionally trim target with VAD
      if (trimTargetSilence && !preserveTargetTiming) {
        const targetTrimResult = await trimAudioWithVAD(targetBlob, {
          padding: 0.1, // More padding for target
          maxTrimStart: 1.0,
          maxTrimEnd: 1.0
        });
        
        if (targetTrimResult.blob && (targetTrimResult.trimmedStart > 0.05 || targetTrimResult.trimmedEnd > 0.05)) {
          alignedTargetBlob = targetTrimResult.blob;
          targetTrimInfo = {
            trimmedStart: targetTrimResult.trimmedStart,
            trimmedEnd: targetTrimResult.trimmedEnd
          };
          console.log(`✂️ VAD trimmed target audio: start=${targetTrimResult.trimmedStart.toFixed(3)}s, end=${targetTrimResult.trimmedEnd.toFixed(3)}s`);
        }
      }
      
      // Step 3: Calculate alignment quality score
      const alignmentQuality = calculateVADAlignmentQuality(targetBoundaries, userBoundaries, userTrimInfo);
      const totalTrimmed = userTrimInfo.trimmedStart + userTrimInfo.trimmedEnd + targetTrimInfo.trimmedStart + targetTrimInfo.trimmedEnd;
      
      console.log(`✅ Professional VAD alignment complete:`, {
        totalTrimmed: totalTrimmed.toFixed(3),
        userTrimmed: (userTrimInfo.trimmedStart + userTrimInfo.trimmedEnd).toFixed(3),
        targetTrimmed: (targetTrimInfo.trimmedStart + targetTrimInfo.trimmedEnd).toFixed(3),
        quality: alignmentQuality.toFixed(2)
      });
      
      isProcessing.value = false;
      
      return {
        targetBlob: alignedTargetBlob,
        userBlob: alignedUserBlob,
        trimmedAmount: totalTrimmed,
        userTrimInfo,
        targetTrimInfo,
        alignmentQuality,
        alignmentMode: 'smart',
        vadUsed: true,
        originalBoundaries: {
          target: targetBoundaries,
          user: userBoundaries
        }
      };
      
    } catch (vadError) {
      console.warn('⚠️ VAD alignment failed, falling back to energy method:', vadError.message);
      return await enhancedEnergyAlignment(targetBlob, userBlob, options);
    }
  };
  
  // Calculate alignment quality for VAD results
  const calculateVADAlignmentQuality = (targetBoundaries, userBoundaries, userTrimInfo) => {
    try {
      const targetSpeechDuration = targetBoundaries.endTime - targetBoundaries.startTime;
      const userSpeechDuration = userBoundaries.endTime - userBoundaries.startTime;
      
      // Adjust user speech duration for trimming
      const adjustedUserDuration = userSpeechDuration - userTrimInfo.trimmedStart - userTrimInfo.trimmedEnd;
      
      // Duration similarity
      const durationSimilarity = 1 - Math.min(1, Math.abs(targetSpeechDuration - adjustedUserDuration) / Math.max(targetSpeechDuration, adjustedUserDuration));
      
      // Onset alignment
      const onsetAlignment = 1 - Math.min(1, Math.abs(targetBoundaries.startTime - (userBoundaries.startTime - userTrimInfo.trimmedStart)) / 2.0);
      
      // VAD confidence factor (if available)
      const vadConfidence = targetBoundaries.confidenceScore && userBoundaries.confidenceScore ? 
        (targetBoundaries.confidenceScore + userBoundaries.confidenceScore) / 2 : 0.7;
      
      // Weighted combination with VAD confidence
      const quality = (durationSimilarity * 0.4) + (onsetAlignment * 0.3) + (vadConfidence * 0.3);
      
      return Math.max(0, Math.min(1, quality));
    } catch (error) {
      console.warn('Error calculating VAD alignment quality:', error);
      return 0.6; // Default good quality for VAD
    }
  };
  
  // Enhanced energy-based alignment method
  const enhancedEnergyAlignment = async (targetBlob, userBlob, options) => {
    const { alignmentMode = 'smart', trimUserSilence = true, maxTrimAmount = 3.0 } = options;
    
    // Use enhanced detectSilenceBoundaries and trimSilence functions
    const [targetBoundaries, userBoundaries] = await Promise.all([
      detectSilenceBoundaries(targetBlob),
      detectSilenceBoundaries(userBlob)
    ]);
    
    console.log('🔍 Target boundaries:', {
      start: targetBoundaries.startTime.toFixed(3),
      end: targetBoundaries.endTime.toFixed(3),
      silenceStart: targetBoundaries.silenceStart.toFixed(3),
      silenceEnd: targetBoundaries.silenceEnd.toFixed(3)
    });
    
    console.log('🔍 User boundaries:', {
      start: userBoundaries.startTime.toFixed(3),
      end: userBoundaries.endTime.toFixed(3),
      silenceStart: userBoundaries.silenceStart.toFixed(3),
      silenceEnd: userBoundaries.silenceEnd.toFixed(3)
    });
    
    let alignedUserBlob = userBlob;
    let userTrimInfo = { trimmedStart: 0, trimmedEnd: 0 };
    
    if (trimUserSilence && alignmentMode === 'smart') {
      const userTrimResult = await trimSilence(userBlob, {
        trimStart: true,
        trimEnd: true,
        maxTrimStart: maxTrimAmount,
        maxTrimEnd: 2.0,
        padding: 0.05
      });
      
      if (userTrimResult.blob) {
        alignedUserBlob = userTrimResult.blob;
        userTrimInfo = {
          trimmedStart: userTrimResult.trimmedStart || 0,
          trimmedEnd: userTrimResult.trimmedEnd || 0
        };
        console.log(`✂️ Enhanced trimming: start=${userTrimInfo.trimmedStart.toFixed(3)}s, end=${userTrimInfo.trimmedEnd.toFixed(3)}s`);
      }
    } else if (alignmentMode === 'onset') {
      // Onset mode: align speech start times
      const alignmentOffset = userBoundaries.startTime - targetBoundaries.startTime;
      
      if (alignmentOffset > 0 && alignmentOffset <= maxTrimAmount) {
        const trimResult = await trimSilence(userBlob, { trimAmount: alignmentOffset });
        alignedUserBlob = trimResult.blob || trimResult;
        userTrimInfo.trimmedStart = alignmentOffset;
        console.log(`⚡ Onset alignment: trimmed ${alignmentOffset.toFixed(3)}s`);
      }
    }
    
    const alignmentQuality = calculateAlignmentQuality(targetBoundaries, userBoundaries, userTrimInfo);
    const totalTrimmed = userTrimInfo.trimmedStart + userTrimInfo.trimmedEnd;
    
    console.log(`✅ Enhanced energy alignment complete:`, {
      mode: alignmentMode,
      totalTrimmed: totalTrimmed.toFixed(3),
      quality: alignmentQuality.toFixed(2)
    });
    
    isProcessing.value = false;
    
    return {
      targetBlob,
      userBlob: alignedUserBlob,
      trimmedAmount: totalTrimmed,
      userTrimInfo,
      targetTrimInfo: { trimmedStart: 0, trimmedEnd: 0 },
      alignmentQuality,
      alignmentMode,
      vadUsed: false,
      originalBoundaries: {
        target: targetBoundaries,
        user: userBoundaries
      }
    };
  };
  

  // Calculate alignment quality score (0-1, higher is better)
  const calculateAlignmentQuality = (targetBoundaries, userBoundaries, userTrimInfo) => {
    try {
      const targetSpeechDuration = targetBoundaries.endTime - targetBoundaries.startTime;
      const userSpeechDuration = userBoundaries.endTime - userBoundaries.startTime;
      
      // Adjust user speech duration for trimming
      const adjustedUserDuration = userSpeechDuration - userTrimInfo.trimmedStart - userTrimInfo.trimmedEnd;
      
      // Calculate duration similarity (closer durations = better alignment)
      const durationSimilarity = 1 - Math.min(1, Math.abs(targetSpeechDuration - adjustedUserDuration) / Math.max(targetSpeechDuration, adjustedUserDuration));
      
      // Calculate onset alignment (less initial silence = better alignment)
      const onsetAlignment = 1 - Math.min(1, Math.abs(targetBoundaries.startTime - (userBoundaries.startTime - userTrimInfo.trimmedStart)) / 2.0);
      
      // Weighted combination
      const quality = (durationSimilarity * 0.6) + (onsetAlignment * 0.4);
      
      return Math.max(0, Math.min(1, quality));
    } catch (error) {
      console.warn('Error calculating alignment quality:', error);
      return 0.5; // Default moderate quality
    }
  };

  return {
    isProcessing,
    detectSpeechOnset, // Legacy compatibility
    detectSilenceBoundaries,
    trimSilence,
    autoAlignRecordings,
    calculateAlignmentQuality,
    // Professional VAD methods
    trimAudioWithVAD,
    detectSpeechBoundariesVAD,
    vadReady,
    initVAD
  };
}