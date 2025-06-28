import { ref } from 'vue';


export function useVADProcessor() {
  const isProcessing = ref(false);
  const vadReady = ref(false);
  
  // Initialize VAD model
  let vadInstance = null;
  
  const initVAD = async () => {
    try {
      console.log('🎙 Initializing Silero VAD model...');
      
      // Check if we're in a secure context (required for some VAD features)
      if (!window.isSecureContext) {
        console.warn('⚠️ VAD requires secure context (HTTPS), falling back to basic detection');
        vadReady.value = false;
        return;
      }
      
      // Wait for global VAD library to be available
      console.log('📦 Waiting for VAD library from CDN...');
      
      // Poll for the global vad object
      let retries = 0;
      while (!window.vad && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      if (!window.vad) {
        throw new Error('VAD library not loaded from CDN');
      }
      
      console.log('🔍 VAD global object available:', window.vad);
      console.log('🔍 Available VAD methods:', Object.keys(window.vad));
      
      console.log('📦 Creating VAD instance...');
      
      vadInstance = await window.vad.NonRealTimeVAD.new({
        // Use default v4 model - more stable and reliable
        positiveSpeechThreshold: 0.5,   // Increased from 0.25 - less sensitive to noise
        negativeSpeechThreshold: 0.35,  // Increased from 0.15 - more hysteresis 
        redemptionFrames: 24,            // Increased from 12 - allow larger gaps (~768ms)
        frameSamples: 1536,              // Default frame size for v4 model
        minSpeechFrames: 8,              // Increased from 2 - minimum 8 frames (~256ms) for speech
        preSpeechPadFrames: 4,           // Increased from 2 - more context before speech
        positiveSpeechPadFrames: 4       // Increased from 2 - more context after speech  
      });
      
      vadReady.value = true;
      console.log('✅ Silero VAD model ready');
      
    } catch (error) {
      console.warn('⚠️ VAD initialization failed, will use fallback detection:', error.message);
      vadReady.value = false;
      vadInstance = null;
      
      // Don't throw error - just continue with fallback
      return;
    }
  };

  // Professional speech boundary detection using Silero VAD
  const detectSpeechBoundariesVAD = async (audioBlob, options = {}) => {
    const {
      positiveSpeechThreshold = 0.5,
      negativeSpeechThreshold = 0.35,
      minSpeechFrames = 3,
      padding = 0.1, // 100ms padding
      threshold = 0.5, // VAD sensitivity
      minSpeechDuration = 50, // Minimum speech segment in ms
      maxSilenceDuration = 300 // Maximum silence gap in ms
    } = options;

    try {
      isProcessing.value = true;
      
      if (!vadReady.value || !vadInstance) {
        await initVAD();
        
        // If VAD still not ready after init attempt, use fallback
        if (!vadReady.value || !vadInstance) {
          console.log('🔄 VAD not available, using fallback energy detection');
          return await fallbackEnergyDetection(audioBlob);
        }
      }

      console.log('🔍 Analyzing audio with Silero VAD...');
      
      // Convert audio blob to AudioBuffer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Resample to 16kHz for VAD (Silero VAD expects 16kHz)
      const targetSampleRate = 16000;
      let resampledBuffer = audioBuffer;
      
      if (audioBuffer.sampleRate !== targetSampleRate) {
        resampledBuffer = await resampleAudioBuffer(audioBuffer, targetSampleRate);
      }
      
      // Get audio data as Float32Array (VAD expects mono)
      const audioData = resampledBuffer.getChannelData(0);
      
      console.log(`📊 Processing ${audioData.length} samples at ${targetSampleRate}Hz`);
      
      // Configure VAD parameters
      console.log('🔧 VAD CONFIGURATION:', {
        threshold,
        minSpeechDuration,
        maxSilenceDuration,
        padding
      });
      
      // Use NonRealTimeVAD to get speech segments - let it use the instance configuration
      const speechSegments = [];
      
      console.log('🎛️ Using VAD instance with optimized settings (v4 model)');
      
      // Use instance configuration without runtime overrides
      for await (const { audio, start, end } of vadInstance.run(audioData, resampledBuffer.sampleRate)) {
        // Convert frame indices to seconds
        const startTimeSeconds = start / resampledBuffer.sampleRate;
        const endTimeSeconds = end / resampledBuffer.sampleRate;
        
        speechSegments.push({
          startTime: startTimeSeconds,
          endTime: endTimeSeconds,
          audioLength: audio.length
        });
        console.log(`🎙 Speech segment detected: ${startTimeSeconds.toFixed(3)}s - ${endTimeSeconds.toFixed(3)}s`);
      }
      
      // Determine overall speech boundaries
      let overallStart = null;
      let overallEnd = null;
      let confidenceScore = 0;
      let originalSpeechStart = null;
      let originalSpeechEnd = null;
      
      if (speechSegments.length > 0) {
        // Filter out very early false positives (likely noise/artifacts)
        const minValidStartTime = 0.05; // Ignore speech detected in first 50ms
        let filteredSegments = speechSegments.filter(s => s.startTime >= minValidStartTime);
        
        if (filteredSegments.length === 0) {
          // If all segments were filtered out, use original segments
          console.log(`⚠️ All segments were early - using original segments`);
          filteredSegments = speechSegments;
        } else {
          console.log(`🧹 FILTERED OUT ${speechSegments.length - filteredSegments.length} early false positive segments`);
        }
        
        // Merge nearby short segments to create more reasonable speech boundaries
        const mergedSegments = mergeNearbySegments(filteredSegments, 0.1); // Merge segments within 100ms
        console.log(`🔗 MERGED ${filteredSegments.length} segments into ${mergedSegments.length} merged segments`);
        
        // Find earliest start and latest end from merged segments
        overallStart = Math.min(...mergedSegments.map(s => s.startTime));
        overallEnd = Math.max(...mergedSegments.map(s => s.endTime));
        
        console.log(`🔍 VAD SEGMENTS ANALYSIS:`, {
          totalSegments: speechSegments.length,
          segments: speechSegments.map((s, i) => ({
            index: i,
            start: s.startTime.toFixed(3) + 's',
            end: s.endTime.toFixed(3) + 's',
            duration: (s.endTime - s.startTime).toFixed(3) + 's'
          })),
          overallEnvelope: {
            start: overallStart.toFixed(3) + 's',
            end: overallEnd.toFixed(3) + 's',
            span: (overallEnd - overallStart).toFixed(3) + 's'
          },
          audioFileInfo: {
            totalDuration: resampledBuffer.duration.toFixed(3) + 's',
            expectedSilenceStart: '~0.150s',
            expectedSpeechStart: '~0.200s'
          }
        });
        
        // Calculate confidence based on speech coverage
        const totalSpeechDuration = speechSegments.reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0);
        const totalDuration = resampledBuffer.duration;
        confidenceScore = Math.min(1, totalSpeechDuration / (totalDuration * 0.8)); // Expect ~80% to be speech
        
        // Store original speech boundaries before padding
        originalSpeechStart = overallStart;
        originalSpeechEnd = overallEnd;
        
        // Apply generous padding to preserve natural speech endings
        const generousPadding = Math.max(padding, 0.1); // At least 100ms padding
        overallStart = Math.max(0, overallStart - generousPadding);
        overallEnd = Math.min(resampledBuffer.duration, overallEnd + generousPadding);
        
        console.log(`📏 PADDING APPLIED:`, {
          originalStart: (overallStart + generousPadding).toFixed(3) + 's',
          originalEnd: (overallEnd - generousPadding).toFixed(3) + 's',
          paddingAmount: generousPadding.toFixed(3) + 's',
          finalStart: overallStart.toFixed(3) + 's',
          finalEnd: overallEnd.toFixed(3) + 's'
        });
      } else {
        console.warn('⚠️ No speech segments detected by VAD');
        // Fallback to energy-based detection
        return await fallbackEnergyDetection(audioBlob);
      }
      
      // VAD returns times in seconds relative to the original audio duration
      // No scaling needed - use times directly
      const result = {
        startTime: overallStart,
        endTime: overallEnd, 
        startSample: Math.floor(overallStart * audioBuffer.sampleRate),
        endSample: Math.floor(overallEnd * audioBuffer.sampleRate),
        
        // Original speech boundaries (before padding applied)
        originalSpeechStart: originalSpeechStart,
        originalSpeechEnd: originalSpeechEnd,
        
        silenceStart: overallStart,
        silenceEnd: audioBuffer.duration - overallEnd,
        speechSegments: speechSegments.length,
        confidenceScore
      };
      
      console.log(`🎯 Silero VAD Analysis Complete:`, {
        segments: speechSegments.length,
        startTime: result.startTime.toFixed(3),
        endTime: result.endTime.toFixed(3),
        silenceStart: result.silenceStart.toFixed(3),
        silenceEnd: result.silenceEnd.toFixed(3),
        confidence: (result.confidenceScore * 100).toFixed(1) + '%'
      });
      
      isProcessing.value = false;
      return result;
      
    } catch (error) {
      console.error('❌ Silero VAD analysis failed:', error);
      isProcessing.value = false;
      
      // Fallback to energy-based detection
      return await fallbackEnergyDetection(audioBlob);
    }
  };

  // Merge nearby segments to create more realistic speech boundaries
  const mergeNearbySegments = (segments, maxGapSeconds = 0.1) => {
    if (segments.length <= 1) return segments;
    
    // Sort segments by start time
    const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);
    const mergedSegments = [];
    
    let currentSegment = { ...sortedSegments[0] };
    
    for (let i = 1; i < sortedSegments.length; i++) {
      const nextSegment = sortedSegments[i];
      const gap = nextSegment.startTime - currentSegment.endTime;
      
      // If gap is small enough, merge the segments
      if (gap <= maxGapSeconds) {
        currentSegment.endTime = Math.max(currentSegment.endTime, nextSegment.endTime);
        currentSegment.audioLength += nextSegment.audioLength;
        console.log(`🔗 Merged segment ${nextSegment.startTime.toFixed(3)}s-${nextSegment.endTime.toFixed(3)}s into ${currentSegment.startTime.toFixed(3)}s-${currentSegment.endTime.toFixed(3)}s (gap: ${(gap * 1000).toFixed(0)}ms)`);
      } else {
        // Gap too large, finalize current segment and start new one
        mergedSegments.push(currentSegment);
        currentSegment = { ...nextSegment };
      }
    }
    
    // Add the final segment
    mergedSegments.push(currentSegment);
    
    return mergedSegments;
  };

  // Resample audio buffer to target sample rate
  const resampleAudioBuffer = async (audioBuffer, targetSampleRate) => {
    if (audioBuffer.sampleRate === targetSampleRate) {
      return audioBuffer;
    }
    
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );
    
    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineContext.destination);
    bufferSource.start();
    
    return await offlineContext.startRendering();
  };

  // Fallback energy-based detection
  const fallbackEnergyDetection = async (audioBlob) => {
    console.log('🔄 Using fallback energy-based detection');
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const windowSize = Math.floor(sampleRate * 0.02); // 20ms windows
      const threshold = 0.01;
      
      let speechStart = null;
      let speechEnd = null;
      
      // Forward pass
      for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
        let sum = 0;
        for (let j = i; j < i + windowSize; j++) {
          sum += channelData[j] * channelData[j];
        }
        const rms = Math.sqrt(sum / windowSize);
        
        if (rms > threshold && speechStart === null) {
          speechStart = i / sampleRate;
          break;
        }
      }
      
      // Backward pass
      for (let i = channelData.length - windowSize; i >= 0; i -= windowSize) {
        let sum = 0;
        for (let j = i; j < i + windowSize && j < channelData.length; j++) {
          sum += channelData[j] * channelData[j];
        }
        const rms = Math.sqrt(sum / windowSize);
        
        if (rms > threshold && speechEnd === null) {
          speechEnd = (i + windowSize) / sampleRate;
          break;
        }
      }
      
      return {
        startTime: speechStart || 0,
        endTime: speechEnd || audioBuffer.duration,
        startSample: Math.floor((speechStart || 0) * sampleRate),
        endSample: Math.floor((speechEnd || audioBuffer.duration) * sampleRate),
        
        // Original speech boundaries (before padding applied) - fallback to detected values
        originalSpeechStart: speechStart || 0,
        originalSpeechEnd: speechEnd || audioBuffer.duration,
        
        silenceStart: speechStart || 0,
        silenceEnd: audioBuffer.duration - (speechEnd || audioBuffer.duration),
        confidenceScore: 0.5 // Fallback confidence
      };
    } catch (error) {
      console.error('❌ Fallback detection failed:', error);
      return {
        startTime: 0,
        endTime: 0,
        startSample: 0,
        endSample: 0,
        
        // Original speech boundaries (before padding applied) - fallback to zero
        originalSpeechStart: 0,
        originalSpeechEnd: 0,
        
        silenceStart: 0,
        silenceEnd: 0,
        confidenceScore: 0
      };
    }
  };

  // Trim audio based on VAD boundaries and return new AudioBuffer + Blob
  const trimAudioWithVAD = async (audioBlob, options = {}) => {
    const {
      padding = 0.15, // 150ms padding to preserve natural speech
      maxTrimStart = 3.0,
      maxTrimEnd = 2.0
    } = options;

    try {
      isProcessing.value = true;
      
      // Get speech boundaries using VAD
      const boundaries = await detectSpeechBoundariesVAD(audioBlob, options);
      
      if (boundaries.silenceStart < 0.1 && boundaries.silenceEnd < 0.1) {
        console.log('📄 No significant silence detected, keeping original');
        isProcessing.value = false;
        return {
          blob: audioBlob,
          trimmedStart: 0,
          trimmedEnd: 0,
          originalDuration: 0,
          newDuration: 0,
          boundaries
        };
      }
      
      // Process the actual audio trimming
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const sampleRate = audioBuffer.sampleRate;
      const paddingSamples = Math.floor(padding * sampleRate);
      
      // Convert VAD boundaries from 16kHz to actual sample rate
      const vadSampleRate = 16000; // VAD always processes at 16kHz
      const sampleRateRatio = sampleRate / vadSampleRate;
      
      const adjustedStartSample = Math.floor(boundaries.startSample * sampleRateRatio);
      const adjustedEndSample = Math.floor(boundaries.endSample * sampleRateRatio);
      
      console.log('🔄 SAMPLE RATE CONVERSION:', {
        vadSampleRate,
        actualSampleRate: sampleRate,
        ratio: sampleRateRatio,
        vadBoundaries: {
          startSample: boundaries.startSample,
          endSample: boundaries.endSample,
          startTime: boundaries.startSample / vadSampleRate,
          endTime: boundaries.endSample / vadSampleRate
        },
        adjustedBoundaries: {
          startSample: adjustedStartSample,
          endSample: adjustedEndSample,
          startTime: adjustedStartSample / sampleRate,
          endTime: adjustedEndSample / sampleRate
        }
      });
      
      // Calculate trim points with padding and limits
      const maxStartTrimSamples = Math.floor(maxTrimStart * sampleRate);
      const maxEndTrimSamples = Math.floor(maxTrimEnd * sampleRate);
      
      const startTrimSamples = Math.min(
        Math.max(0, adjustedStartSample - paddingSamples),
        maxStartTrimSamples
      );
      
      const endTrimSamples = Math.min(
        Math.max(0, audioBuffer.length - adjustedEndSample - paddingSamples),
        maxEndTrimSamples
      );
      
      const newLength = audioBuffer.length - startTrimSamples - endTrimSamples;
      
      if (newLength <= sampleRate * 0.05) {  // Reduced from 0.1s to 0.05s minimum
        console.warn('⚠️ Trimming would result in too short audio, keeping original');
        isProcessing.value = false;
        return {
          blob: audioBlob,
          trimmedStart: 0,
          trimmedEnd: 0,
          originalDuration: audioBuffer.duration,
          newDuration: audioBuffer.duration,
          boundaries
        };
      }
      
      // Debug the trimming calculation
      console.log('🔍 TRIMMING DEBUG:', {
        originalLength: audioBuffer.length,
        originalDuration: audioBuffer.duration,
        sampleRate: sampleRate,
        boundaries: {
          startSample: adjustedStartSample,
          endSample: adjustedEndSample,
          startTime: adjustedStartSample / sampleRate,
          endTime: adjustedEndSample / sampleRate
        },
        trimCalculation: {
          paddingSamples,
          maxStartTrimSamples,
          maxEndTrimSamples,
          startTrimSamples,
          endTrimSamples,
          newLength,
          trimStartTime: startTrimSamples / sampleRate,
          trimEndTime: endTrimSamples / sampleRate,
          newDuration: newLength / sampleRate
        },
        audioRange: {
          keepFrom: startTrimSamples,
          keepTo: audioBuffer.length - endTrimSamples,
          keepLength: (audioBuffer.length - endTrimSamples) - startTrimSamples
        }
      });
      
      // Verify we're keeping the speech portion
      const keepFrom = startTrimSamples;
      const keepTo = audioBuffer.length - endTrimSamples;
      const speechStart = adjustedStartSample;
      const speechEnd = adjustedEndSample;
      
      if (speechStart < keepFrom || speechEnd > keepTo) {
        console.warn('⚠️ WARNING: Trimming might remove speech!', {
          speechRange: [speechStart, speechEnd],
          keepRange: [keepFrom, keepTo],
          speechInRange: speechStart >= keepFrom && speechEnd <= keepTo
        });
      }
      
      // Create trimmed buffer
      const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        newLength,
        sampleRate
      );
      
      // Copy trimmed audio data with bounds checking
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const trimmedChannelData = trimmedBuffer.getChannelData(channel);
        
        for (let i = 0; i < newLength; i++) {
          const sourceIndex = i + startTrimSamples;
          if (sourceIndex < audioBuffer.length) {
            trimmedChannelData[i] = channelData[sourceIndex];
          } else {
            trimmedChannelData[i] = 0; // Safety fallback
          }
        }
      }
      
      // Verify the trimmed buffer has audio content
      let hasNonZeroSamples = false;
      let maxAmplitude = 0;
      for (let channel = 0; channel < trimmedBuffer.numberOfChannels; channel++) {
        const channelData = trimmedBuffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
          const amplitude = Math.abs(channelData[i]);
          if (amplitude > 0.001) { // Threshold for non-silence
            hasNonZeroSamples = true;
          }
          maxAmplitude = Math.max(maxAmplitude, amplitude);
        }
      }
      
      console.log('🔍 TRIMMED AUDIO ANALYSIS:', {
        hasNonZeroSamples,
        maxAmplitude: maxAmplitude.toFixed(6),
        sampleCount: trimmedBuffer.length,
        duration: trimmedBuffer.duration,
        isEmpty: !hasNonZeroSamples
      });
      
      // Convert back to blob
      const trimmedBlob = await audioBufferToBlob(trimmedBuffer);
      
      const startTrimTime = startTrimSamples / sampleRate;
      const endTrimTime = endTrimSamples / sampleRate;
      
      console.log(`✂️ VAD TRIMMING: Professional VAD trimming complete:`, {
        startTrimmed: startTrimTime.toFixed(3),
        endTrimmed: endTrimTime.toFixed(3),
        confidence: boundaries.confidenceScore ? (boundaries.confidenceScore * 100).toFixed(1) + '%' : 'N/A',
        originalDuration: audioBuffer.duration.toFixed(3),
        newDuration: (newLength / sampleRate).toFixed(3),
        originalSize: audioBlob.size,
        trimmedSize: trimmedBlob.size,
        sizeDifference: audioBlob.size - trimmedBlob.size
      });
      
      isProcessing.value = false;
      
      return {
        blob: trimmedBlob,
        trimmedStart: startTrimTime,
        trimmedEnd: endTrimTime,
        originalDuration: audioBuffer.duration,
        newDuration: newLength / sampleRate,
        boundaries
      };
      
    } catch (error) {
      console.error('❌ VAD trimming failed:', error);
      isProcessing.value = false;
      return {
        blob: audioBlob,
        trimmedStart: 0,
        trimmedEnd: 0,
        originalDuration: 0,
        newDuration: 0,
        error: error.message
      };
    }
  };

  // Convert AudioBuffer to Blob (WAV format)
  const audioBufferToBlob = async (audioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const bytesPerSample = 2; // 16-bit PCM
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    // Write WAV header
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
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Convert and write audio samples
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  return {
    isProcessing,
    vadReady,
    initVAD,
    detectSpeechBoundariesVAD,
    trimAudioWithVAD,
    audioBufferToBlob
  };
}
