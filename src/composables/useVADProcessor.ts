import { ref } from 'vue';


interface VADOptions {
  positiveSpeechThreshold?: number;
  negativeSpeechThreshold?: number;
  minSpeechFrames?: number;
  padding?: number;
  threshold?: number;
  minSpeechDuration?: number;
  maxSilenceDuration?: number;
}

interface VADBoundaries {
  startTime: number;
  endTime: number;
  startSample: number;
  endSample: number;
  originalSpeechStart: number;
  originalSpeechEnd: number;
  silenceStart: number;
  silenceEnd: number;
  speechSegments: number;
  confidenceScore: number;
  vadFailed?: boolean;
  error?: string;
}

interface TrimOptions {
  padding?: number;
  maxTrimStart?: number;
  maxTrimEnd?: number;
}

export function useVADProcessor() {
  const isProcessing = ref(false);
  const vadReady = ref(false);
  
  // Initialize VAD model
  let vadInstance: any = null;
  
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
      while (!(window as any).vad && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      if (!(window as any).vad) {
        throw new Error('VAD library not loaded from CDN');
      }
      
      console.log('🔍 VAD global object available:', (window as any).vad);
      console.log('🔍 Available VAD methods:', Object.keys((window as any).vad));
      
      console.log('📦 Creating VAD instance...');
      
      vadInstance = await (window as any).vad.NonRealTimeVAD.new({
        // Balanced settings - sensitive enough to detect silence but not over-trim
        positiveSpeechThreshold: 0.4,   // Moderately sensitive for better silence detection
        negativeSpeechThreshold: 0.25,  // Lower threshold for better speech continuation
        redemptionFrames: 24,            // Balanced gap allowance (~768ms)
        frameSamples: 1536,              // Default frame size for v4 model
        minSpeechFrames: 6,              // Reduced minimum frames for better detection
        preSpeechPadFrames: 4,           // Reasonable context before speech starts
        positiveSpeechPadFrames: 4       // Reasonable context after speech ends
      });
      
      vadReady.value = true;
      console.log('✅ Silero VAD model ready');
      
    } catch (error) {
      console.warn('⚠️ VAD initialization failed, will use fallback detection:', (error as Error).message);
      vadReady.value = false;
      vadInstance = null;
      
      // Don't throw error - just continue with fallback
      return;
    }
  };

  // Professional speech boundary detection using Silero VAD
  const detectSpeechBoundariesVAD = async (audioBlob: Blob, options: VADOptions = {}): Promise<VADBoundaries> => {
    const {
      positiveSpeechThreshold: providedPositiveThreshold,
      negativeSpeechThreshold: providedNegativeThreshold,
      minSpeechFrames = 1, // Allow minimum possible speech frames
      padding = 0.1, // 100ms padding
      threshold = 0.5, // VAD sensitivity - this maps to positiveSpeechThreshold
      minSpeechDuration = 50, // Minimum speech segment in ms
      maxSilenceDuration = 300 // Maximum silence gap in ms
    } = options;
    
    // Map threshold to positiveSpeechThreshold if not explicitly provided
    const positiveSpeechThreshold = providedPositiveThreshold !== undefined ? providedPositiveThreshold : threshold;
    const negativeSpeechThreshold = providedNegativeThreshold !== undefined ? providedNegativeThreshold : Math.max(0.1, threshold * 0.7);

    try {
      isProcessing.value = true;
      
      if (!vadReady.value || !vadInstance) {
        await initVAD();
        
        // If VAD still not ready after init attempt, return original audio
        if (!vadReady.value || !vadInstance) {
          console.log('🔄 VAD not available - using original audio without trimming');
          
          // Return original audio boundaries (no trimming)
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          return {
            startTime: 0,
            endTime: audioBuffer.duration,
            startSample: 0,
            endSample: audioBuffer.length,
            
            // Original speech boundaries (no VAD detection available)
            originalSpeechStart: 0,
            originalSpeechEnd: audioBuffer.duration,
            
            silenceStart: 0,
            silenceEnd: 0,
            speechSegments: 0,
            confidenceScore: 0,
            vadFailed: true  // Indicate VAD was not available
          };
        }
      }

      console.log('🔍 Analyzing audio with Silero VAD...');
      
      // Convert audio blob to AudioBuffer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Resample to 16kHz for VAD (Silero VAD expects 16kHz)
      const targetSampleRate = 16000;
      console.log('🔄 Original audio properties:', {
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration.toFixed(3) + 's',
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });
      
      let resampledBuffer = audioBuffer;
      
      if (audioBuffer.sampleRate !== targetSampleRate) {
        console.log(`🔄 Resampling from ${audioBuffer.sampleRate}Hz to ${targetSampleRate}Hz...`);
        resampledBuffer = await resampleAudioBuffer(audioBuffer, targetSampleRate);
        console.log('🔄 Resampled audio properties:', {
          sampleRate: resampledBuffer.sampleRate,
          duration: resampledBuffer.duration.toFixed(3) + 's',
          length: resampledBuffer.length
        });
      } else {
        console.log('🔄 No resampling needed - already at 16kHz');
      }
      
      // Get audio data as Float32Array (VAD expects mono)
      const audioData = resampledBuffer.getChannelData(0);
      
      console.log(`📊 Processing ${audioData.length} samples at ${targetSampleRate}Hz`);
      
      // Configure VAD parameters
      console.log('🔧 VAD CONFIGURATION:', {
        threshold,
        minSpeechDuration,
        maxSilenceDuration,
        padding,
        positiveSpeechThreshold,
        negativeSpeechThreshold,
        minSpeechFrames
      });
      
      // Use NonRealTimeVAD to get speech segments - create instance with runtime options
      const speechSegments = [];
      
      console.log('🔍 Audio data analysis:', {
        length: audioData.length,
        sampleRate: resampledBuffer.sampleRate,
        maxAmplitude: Math.max(...Array.from(audioData.slice(0, 1000))), // Sample first 1000 points to avoid memory issues
        minAmplitude: Math.min(...Array.from(audioData.slice(0, 1000))), // Sample first 1000 points to avoid memory issues
        rmsLevel: Math.sqrt(audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length),
        hasNonZeroSamples: audioData.some(val => Math.abs(val) > 0.001),
        averageAmplitude: Array.from(audioData).reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length
      });
      
      // Create a VAD instance with the provided runtime options
      console.log('🎛️ Creating VAD instance with runtime options');
      
      // Balanced settings - allow for more sensitive detection when requested
      const vadConfig = {
        positiveSpeechThreshold: Math.max(positiveSpeechThreshold, 0.3), // Allow more sensitive detection
        negativeSpeechThreshold: Math.max(negativeSpeechThreshold, 0.2), // Allow lower continuation threshold
        redemptionFrames: 24,            // Balanced gap allowance
        frameSamples: 1536,              // Default frame size for v4 model
        minSpeechFrames: Math.max(minSpeechFrames, 4), // Allow shorter speech segments
        preSpeechPadFrames: 4,           // Conservative context before speech
        positiveSpeechPadFrames: 4       // Conservative context after speech
      };
      
      console.log('🔧 ACTUAL VAD INSTANCE CONFIG:', vadConfig);
      
      let runtimeVADInstance = null;
      try {
        runtimeVADInstance = await (window as any).vad.NonRealTimeVAD.new(vadConfig);
        console.log('✅ Runtime VAD instance created with custom settings');
      } catch (error) {
        console.warn('⚠️ Failed to create runtime VAD instance, using default:', error);
        runtimeVADInstance = vadInstance;
      }
      
      // Use runtime VAD instance with provided settings
      for await (const { audio, start, end } of runtimeVADInstance.run(audioData, resampledBuffer.sampleRate)) {
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
        overallStart = Math.min(...mergedSegments.map((s: any) => s.startTime));
        overallEnd = Math.max(...mergedSegments.map((s: any) => s.endTime));
        
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
        
        // Apply conservative padding to preserve natural speech endings
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
        console.warn('⚠️ No speech segments detected by VAD - using original audio without trimming');
        
        // Return original audio boundaries (no trimming)
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        return {
          startTime: 0,
          endTime: audioBuffer.duration,
          startSample: 0,
          endSample: audioBuffer.length,
          
          // Original speech boundaries (no VAD detection available)
          originalSpeechStart: 0,
          originalSpeechEnd: audioBuffer.duration,
          
          silenceStart: 0,
          silenceEnd: 0,
          speechSegments: 0,
          confidenceScore: 0,
          vadFailed: true  // Indicate VAD failed to detect speech
        };
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
      
      // Return original audio boundaries when VAD fails (no trimming)
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        console.log('🔄 VAD failed - using original audio without processing');
        return {
          startTime: 0,
          endTime: audioBuffer.duration,
          startSample: 0,
          endSample: audioBuffer.length,
          
          // Original speech boundaries (no VAD detection available)
          originalSpeechStart: 0,
          originalSpeechEnd: audioBuffer.duration,
          
          silenceStart: 0,
          silenceEnd: 0,
          speechSegments: 0,
          confidenceScore: 0,
          vadFailed: true  // Indicate VAD processing failed
        };
      } catch (decodeError) {
        console.error('❌ Failed to decode audio for fallback:', decodeError as Error);
        return {
          startTime: 0,
          endTime: 0,
          startSample: 0,
          endSample: 0,
          
          // Original speech boundaries (completely failed)
          originalSpeechStart: 0,
          originalSpeechEnd: 0,
          
          silenceStart: 0,
          silenceEnd: 0,
          speechSegments: 0,
          confidenceScore: 0,
          vadFailed: true,  // Indicate complete VAD failure
          error: (error as Error).message
        };
      }
    }
  };

  // Merge nearby segments to create more realistic speech boundaries
  const mergeNearbySegments = (segments: any[], maxGapSeconds = 0.1) => {
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
  const resampleAudioBuffer = async (audioBuffer: AudioBuffer, targetSampleRate: number): Promise<AudioBuffer> => {
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


  // Trim audio based on VAD boundaries and return new AudioBuffer + Blob
  const trimAudioWithVAD = async (audioBlob: Blob, options: TrimOptions = {}) => {
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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const sampleRate = audioBuffer.sampleRate;
      const paddingSamples = Math.floor(padding * sampleRate);
      
      // VAD returns times in seconds - convert directly to original sample rate samples
      // No complex sample rate conversion needed since boundaries use time values
      const adjustedStartSample = Math.floor(boundaries.startTime * sampleRate);
      const adjustedEndSample = Math.floor(boundaries.endTime * sampleRate);
      
      console.log('🔄 AUDIO TRIMMING BOUNDARIES:', {
        originalSampleRate: sampleRate,
        vadBoundaries: {
          startTime: boundaries.startTime?.toFixed(3) + 's',
          endTime: boundaries.endTime?.toFixed(3) + 's'
        },
        adjustedBoundaries: {
          startSample: adjustedStartSample,
          endSample: adjustedEndSample,
          startTime: (adjustedStartSample / sampleRate).toFixed(3) + 's',
          endTime: (adjustedEndSample / sampleRate).toFixed(3) + 's'
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
      console.error('❌ VAD trimming failed:', error as Error);
      isProcessing.value = false;
      return {
        blob: audioBlob,
        trimmedStart: 0,
        trimmedEnd: 0,
        originalDuration: 0,
        newDuration: 0,
        error: (error as Error).message
      };
    }
  };

  // Convert AudioBuffer to Blob (WAV format)
  const audioBufferToBlob = async (audioBuffer: AudioBuffer): Promise<Blob> => {
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
    const writeString = (offset: number, string: string) => {
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
