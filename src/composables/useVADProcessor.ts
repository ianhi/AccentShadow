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
        // Ultra-sensitive settings to catch all speech content
        positiveSpeechThreshold: 0.01,  // Extremely sensitive
        negativeSpeechThreshold: 0.005, // Almost zero threshold
        redemptionFrames: 128,           // Very large gap allowance
        frameSamples: 1536,              // Default frame size for v4 model
        minSpeechFrames: 1,              // Minimum possible
        preSpeechPadFrames: 16,          // Lots of context
        positiveSpeechPadFrames: 16      // Lots of context
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
      
      // Simplify VAD usage following the official documentation pattern
      console.log('🔄 Original audio properties:', {
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration.toFixed(3) + 's',
        numberOfChannels: audioBuffer.numberOfChannels,
        length: audioBuffer.length
      });
      
      // Get audio data as Float32Array (VAD expects mono)
      const audioData = audioBuffer.getChannelData(0);
      const nativeSampleRate = audioBuffer.sampleRate;
      
      console.log(`📊 Processing ${audioData.length} samples at ${nativeSampleRate}Hz using simplified VAD approach`);
      
      // Debug audio data to ensure it's valid
      let maxAmplitude = 0;
      let minAmplitude = 0;
      let avgAmplitude = 0;
      let nonZeroSamples = 0;
      
      for (let i = 0; i < Math.min(audioData.length, 10000); i++) {
        const sample = audioData[i];
        maxAmplitude = Math.max(maxAmplitude, sample);
        minAmplitude = Math.min(minAmplitude, sample);
        avgAmplitude += Math.abs(sample);
        if (Math.abs(sample) > 0.0001) nonZeroSamples++;
      }
      avgAmplitude /= Math.min(audioData.length, 10000);
      
      console.log('🔊 Audio data check:', {
        dataType: audioData.constructor.name,
        length: audioData.length,
        maxAmplitude: maxAmplitude.toFixed(6),
        minAmplitude: minAmplitude.toFixed(6),
        avgAmplitude: avgAmplitude.toFixed(6),
        nonZeroSamples: nonZeroSamples,
        hasContent: maxAmplitude > 0.001
      });
      
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
        sampleRate: nativeSampleRate,
        maxAmplitude: Math.max(...Array.from(audioData.slice(0, 1000))), // Sample first 1000 points to avoid memory issues
        minAmplitude: Math.min(...Array.from(audioData.slice(0, 1000))), // Sample first 1000 points to avoid memory issues
        rmsLevel: Math.sqrt(audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length),
        hasNonZeroSamples: audioData.some(val => Math.abs(val) > 0.001),
        averageAmplitude: Array.from(audioData).reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length
      });
      
      // Create VAD instance using simplified approach from documentation
      console.log('🎛️ Creating simplified VAD instance following documentation pattern');
      
      // Use reasonable settings for balanced detection
      const vadConfig = {
        positiveSpeechThreshold: Math.min(positiveSpeechThreshold, 0.5), // Balanced detection
        negativeSpeechThreshold: Math.min(negativeSpeechThreshold, 0.35), // Good continuation
        redemptionFrames: 24,            // Standard gap allowance
        frameSamples: 1536,              // Default frame size
        minSpeechFrames: 6,              // Reasonable minimum
        preSpeechPadFrames: 4,           // Small padding
        positiveSpeechPadFrames: 4       // Small padding
      };
      
      console.log('🔧 VAD CONFIG (simplified approach):', vadConfig);
      
      let runtimeVADInstance = null;
      try {
        runtimeVADInstance = await (window as any).vad.NonRealTimeVAD.new(vadConfig);
        console.log('✅ Simplified VAD instance created successfully');
      } catch (error) {
        console.warn('⚠️ Failed to create VAD instance, using default:', error);
        runtimeVADInstance = vadInstance;
      }
      
      // Use simplified VAD processing following documentation pattern
      console.log('🎯 Starting simplified VAD processing (start/end in milliseconds)...');
      let iterationCount = 0;
      
      try {
        // Following the documentation: myvad.run(audioFileData, nativeSampleRate)
        // Returns: {audio, start, end} where start/end are in MILLISECONDS
        const vadIterator = runtimeVADInstance.run(audioData, nativeSampleRate);
        
        for await (const {audio, start, end} of vadIterator) {
          iterationCount++;
          console.log(`🔍 VAD iteration ${iterationCount}, raw values:`, {start, end});
          
          if (typeof start === 'undefined' || typeof end === 'undefined') {
            console.warn('⚠️ Invalid segment returned by VAD:', {start, end});
            continue;
          }
          
          // According to documentation, start/end are already in MILLISECONDS
          const startTimeSeconds = start / 1000; // Convert milliseconds to seconds
          const endTimeSeconds = end / 1000;     // Convert milliseconds to seconds
          
          speechSegments.push({
            startTime: startTimeSeconds,
            endTime: endTimeSeconds,
            audioLength: audio ? audio.length : 0
          });
          
          console.log(`🎙 Speech segment detected: ${start}ms - ${end}ms (${startTimeSeconds.toFixed(3)}s - ${endTimeSeconds.toFixed(3)}s)`);
        }
      } catch (iterError) {
        console.error('❌ Error during VAD iteration:', iterError);
      }
      
      console.log(`🎯 VAD iteration complete. Total iterations: ${iterationCount}, segments found: ${speechSegments.length}`);
      
      // Determine overall speech boundaries
      let overallStart = null;
      let overallEnd = null;
      let confidenceScore = 0;
      let originalSpeechStart = null;
      let originalSpeechEnd = null;
      
      if (speechSegments.length > 0) {
        // Don't filter out early segments - we need all detected speech
        console.log(`🎯 KEEPING ALL ${speechSegments.length} detected segments (no filtering)`);
        let filteredSegments = speechSegments; // Keep everything
        
        // Merge nearby segments with a larger gap to connect speech parts
        const mergedSegments = mergeNearbySegments(filteredSegments, 0.5); // Merge segments within 500ms
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
            totalDuration: audioBuffer.duration.toFixed(3) + 's',
            expectedSilenceStart: '~0.150s',
            expectedSpeechStart: '~0.200s'
          }
        });
        
        // Calculate confidence based on speech coverage
        const totalSpeechDuration = speechSegments.reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0);
        const totalDuration = audioBuffer.duration; // Use original audio duration
        confidenceScore = Math.min(1, totalSpeechDuration / (totalDuration * 0.8)); // Expect ~80% to be speech
        
        // Store original speech boundaries before padding
        originalSpeechStart = overallStart;
        originalSpeechEnd = overallEnd;
        
        // Apply conservative padding to preserve natural speech endings
        const generousPadding = Math.max(padding, 0.1); // At least 100ms padding
        overallStart = Math.max(0, overallStart - generousPadding);
        overallEnd = Math.min(audioBuffer.duration, overallEnd + generousPadding); // Use original duration
        
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
