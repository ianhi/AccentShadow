import { ref } from 'vue';
import { usePreloader } from './usePreloader';


interface VADOptions {
  positiveSpeechThreshold?: number;
  negativeSpeechThreshold?: number;
  minSpeechFrames?: number;
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
  speechSegmentsList?: Array<{startTime: number, endTime: number, audioLength?: number}>;
  confidenceScore: number;
  vadFailed?: boolean;
  error?: string;
}

interface TrimOptions {
  padding?: number;
  maxTrimStart?: number;
  maxTrimEnd?: number;
  boundaries?: VADBoundaries;
}

export function useVADProcessor() {
  const isProcessing = ref(false);
  const vadReady = ref(false);

  // Get preloader for optimized AudioContext
  const { getAudioContext } = usePreloader();

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

      // Wait for global VAD library to be available using Promise-based approach
      console.log('📦 Waiting for VAD library from CDN...');

      await new Promise<void>((resolve, reject) => {
        const maxWaitTime = 5000; // 5 seconds timeout
        const startTime = Date.now();

        const checkVAD = () => {
          if ((window as any).vad) {
            resolve();
            return;
          }

          if (Date.now() - startTime > maxWaitTime) {
            reject(new Error('VAD library not loaded from CDN within timeout'));
            return;
          }

          // Use requestAnimationFrame for better performance than setTimeout
          requestAnimationFrame(checkVAD);
        };

        checkVAD();
      });

      console.log('🔍 VAD global object available:', (window as any).vad);
      console.log('🔍 Available VAD methods:', Object.keys((window as any).vad));

      console.log('📦 Creating VAD instance...');

      vadInstance = await (window as any).vad.NonRealTimeVAD.new({
        // Aggressive settings based on tuner results - reliable speech detection
        positiveSpeechThreshold: 0.3,   // Aggressive default from tuner
        negativeSpeechThreshold: 0.2,   // Aggressive default from tuner
        redemptionFrames: 32,            // Standard gap allowance
        frameSamples: 512,              // Default frame size for v4 model
        minSpeechFrames: 3,              // Aggressive default from tuner
        preSpeechPadFrames: 4,           // Balanced context
        positiveSpeechPadFrames: 4       // Balanced context
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

  // Professional speech boundary detection using Silero VAD - DETECTION ONLY, NO PADDING/TRIMMING
  const detectSpeechBoundariesVAD = async (audioBlob: Blob, options: VADOptions = {}): Promise<VADBoundaries> => {
    const {
      positiveSpeechThreshold: providedPositiveThreshold,
      negativeSpeechThreshold: providedNegativeThreshold,
      minSpeechFrames = 3, // Aggressive default from tuner
      threshold = 0.5, // VAD sensitivity - this maps to positiveSpeechThreshold
      minSpeechDuration = 50, // Minimum speech segment in ms
      maxSilenceDuration = 300 // Maximum silence gap in ms
    } = options;

    // Use explicit settings if provided, otherwise use aggressive defaults
    const positiveSpeechThreshold = providedPositiveThreshold !== undefined ? providedPositiveThreshold : 0.3;
    const negativeSpeechThreshold = providedNegativeThreshold !== undefined ? providedNegativeThreshold : 0.2;

    try {
      isProcessing.value = true;

      if (!vadReady.value || !vadInstance) {
        console.log('🔄 VAD not ready, attempting initialization...')
        await initVAD();

        // If VAD still not ready after init attempt, return original audio
        if (!vadReady.value || !vadInstance) {
          console.log('🔄 VAD not available - using original audio without trimming');

          // Return original audio boundaries (no trimming)
          const audioContext = getAudioContext();
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
      } else {
        console.log('🚀 VAD already ready (likely from preload) - proceeding with analysis')
      }

      console.log('🔍 Analyzing audio with Silero VAD...');

      // Convert audio blob to AudioBuffer - use preloaded context if available
      const audioContext = getAudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // // Simplify VAD usage following the official documentation pattern
      // console.log('🔄 Original audio properties:', {
      //   sampleRate: audioBuffer.sampleRate,
      //   duration: audioBuffer.duration.toFixed(3) + 's',
      //   numberOfChannels: audioBuffer.numberOfChannels,
      //   length: audioBuffer.length
      // });
      //
      // Get audio data as Float32Array (VAD expects mono)
      const originalAudioData = audioBuffer.getChannelData(0);
      const nativeSampleRate = audioBuffer.sampleRate;
      
      // CRITICAL FIX: Pre-padding strategy for consistent VAD processing
      // 
      // Problem: MP3 files and files with minimal leading silence cause VAD to aggressively 
      // trim speech onset, leading to misalignment. Different browsers also decode audio
      // at different sample rates (Chrome: 16kHz, Firefox: 44.1kHz).
      //
      // Solution: Add consistent 320ms silence before ALL audio sent to VAD, then adjust
      // the detected boundaries afterward. This ensures VAD has identical context regardless
      // of original file characteristics or browser differences.
      //
      // See AUDIO_SAMPLING_RATE_DEBUG.md for complete technical explanation.
      const prePaddingMs = 320; // 320ms = 100 frames at VAD's internal 16kHz rate
      const prePaddingSamples = Math.floor((prePaddingMs / 1000) * nativeSampleRate);
      
      // Create padded audio data with silence at the start
      const paddedLength = originalAudioData.length + prePaddingSamples;
      const audioData = new Float32Array(paddedLength);
      
      // Fill with silence at the start
      for (let i = 0; i < prePaddingSamples; i++) {
        audioData[i] = 0;
      }
      
      // Copy original audio after the padding
      for (let i = 0; i < originalAudioData.length; i++) {
        audioData[prePaddingSamples + i] = originalAudioData[i];
      }
      
      console.log(`🛡️ VAD: Applied ${prePaddingMs}ms pre-padding (${(originalAudioData.length / nativeSampleRate).toFixed(2)}s -> ${(audioData.length / nativeSampleRate).toFixed(2)}s)`);

      // Use NonRealTimeVAD to get speech segments - create instance with runtime options
      const speechSegments = [];

      // Create VAD instance

      // Use passed parameters with proper defaults that preserve speech
      // VAD internally resamples to 16kHz, so frameSamples=512 gives consistent 32ms frames
      const vadConfig = {
        positiveSpeechThreshold: positiveSpeechThreshold,  // From parameters or 0.3 default
        negativeSpeechThreshold: negativeSpeechThreshold,  // From parameters or 0.2 default
        redemptionFrames: (options as any).redemptionFrames || 32,  // Use user setting or default
        frameSamples: (options as any).frameSamples || 512,         // Standard for VAD v5 model (32ms at 16kHz)
        minSpeechFrames: minSpeechFrames,                           // From parameters or aggressive default
        preSpeechPadFrames: (options as any).preSpeechPadFrames || 8,     // More conservative padding
        positiveSpeechPadFrames: (options as any).positiveSpeechPadFrames || 8  // More conservative padding
      };


      let runtimeVADInstance = null;
      try {
        runtimeVADInstance = await (window as any).vad.NonRealTimeVAD.new(vadConfig);
      } catch (error) {
        console.warn('⚠️ Failed to create VAD instance, using default:', error);
        runtimeVADInstance = vadInstance;
      }

      let iterationCount = 0;

      try {
        // Following the documentation: myvad.run(audioFileData, nativeSampleRate)
        // Returns: {audio, start, end} where start/end are in MILLISECONDS
        const vadIterator = runtimeVADInstance.run(audioData, nativeSampleRate);

        for await (const { audio, start, end } of vadIterator) {
          iterationCount++;

          if (typeof start === 'undefined' || typeof end === 'undefined') {
            console.warn('⚠️ Invalid VAD segment:', { start, end });
            continue;
          }

          // Adjust detected boundaries to account for our pre-padding
          // VAD detected speech at 'start' in the padded audio, but we need the position
          // in the original audio, so we subtract our 320ms offset
          const adjustedStartMs = Math.max(0, start - prePaddingMs);
          const adjustedEndMs = Math.max(0, end - prePaddingMs);
          
          const startTimeSeconds = adjustedStartMs / 1000;
          const endTimeSeconds = adjustedEndMs / 1000;

          speechSegments.push({
            startTime: startTimeSeconds,
            endTime: endTimeSeconds,
            audioLength: audio ? audio.length : 0
          });

          console.log(`🎙 Speech detected: ${adjustedStartMs}ms - ${adjustedEndMs}ms`);
        }
      } catch (iterError) {
        console.error('❌ Error during VAD iteration:', iterError);
      }

      // Determine overall speech boundaries
      let overallStart = null;
      let overallEnd = null;
      let confidenceScore = 0;
      let originalSpeechStart = null;
      let originalSpeechEnd = null;

      if (speechSegments.length > 0) {
        // Merge nearby segments with a larger gap to connect speech parts
        const mergedSegments = mergeNearbySegments(speechSegments, 0.5);

        // Find earliest start and latest end from merged segments
        const rawStart = Math.min(...mergedSegments.map((s: any) => s.startTime));
        const rawEnd = Math.max(...mergedSegments.map((s: any) => s.endTime));
        
        // Use the raw VAD boundaries directly - no additional safety buffer needed
        // The alignment composable already adds 200ms padding during normalization
        overallStart = Math.max(0, rawStart);
        overallEnd = Math.min(audioBuffer.duration, rawEnd);
        
        console.log(`🎯 VAD: Speech detected ${overallStart.toFixed(3)}s - ${overallEnd.toFixed(3)}s (${(overallEnd - overallStart).toFixed(3)}s duration)`);


        // Calculate confidence based on speech coverage
        const totalSpeechDuration = speechSegments.reduce((sum, seg) => sum + (seg.endTime - seg.startTime), 0);
        const totalDuration = audioBuffer.duration; // Use original audio duration
        confidenceScore = Math.min(1, totalSpeechDuration / (totalDuration * 0.8)); // Expect ~80% to be speech

        // Store original speech boundaries (SAFETY BUFFERED but no user padding applied yet)
        originalSpeechStart = overallStart;
        originalSpeechEnd = overallEnd;

        console.log(`🔍 RAW SPEECH BOUNDARIES DETECTED:`, {
          speechStart: overallStart.toFixed(3) + 's',
          speechEnd: overallEnd.toFixed(3) + 's',
          speechDuration: (overallEnd - overallStart).toFixed(3) + 's',
          silenceBefore: overallStart.toFixed(3) + 's',
          silenceAfter: (audioBuffer.duration - overallEnd).toFixed(3) + 's'
        });
      } else {
        console.warn('⚠️ No speech segments detected by VAD - using original audio without trimming');

        // Return original audio boundaries (no trimming)
        const audioContext = getAudioContext();
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

      // Return RAW speech boundaries - no padding applied
      const result = {
        startTime: overallStart,  // Raw speech start time
        endTime: overallEnd,      // Raw speech end time
        startSample: Math.floor(overallStart * audioBuffer.sampleRate),
        endSample: Math.floor(overallEnd * audioBuffer.sampleRate),

        // These are the same as startTime/endTime since no padding is applied
        originalSpeechStart: originalSpeechStart,
        originalSpeechEnd: originalSpeechEnd,

        // Amount of silence detected
        silenceStart: overallStart,  // Silence before speech
        silenceEnd: audioBuffer.duration - overallEnd,  // Silence after speech
        speechSegments: speechSegments.length,
        speechSegmentsList: speechSegments, // Include the detailed segments for visualization
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
        const audioContext = getAudioContext();
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
  const trimAudioWithVAD = async (audioBlob: Blob, options: TrimOptions & { boundaries?: any } = {}) => {
    const {
      padding = 0.15, // 150ms padding to preserve natural speech
      maxTrimStart = 3.0,
      maxTrimEnd = 2.0,
      boundaries: providedBoundaries
    } = options;

    try {
      isProcessing.value = true;

      // Use provided boundaries or calculate new ones
      const vadOptions: VADOptions = {
        threshold: (options as any).threshold,
        minSpeechDuration: (options as any).minSpeechDuration,
        maxSilenceDuration: (options as any).maxSilenceDuration,
        positiveSpeechThreshold: (options as any).positiveSpeechThreshold,
        negativeSpeechThreshold: (options as any).negativeSpeechThreshold,
        minSpeechFrames: (options as any).minSpeechFrames
      };
      const boundaries = providedBoundaries || await detectSpeechBoundariesVAD(audioBlob, vadOptions);

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
      const audioContext = getAudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const sampleRate = audioBuffer.sampleRate;
      const paddingSamples = Math.floor(padding * sampleRate);

      // Apply padding to raw boundaries before converting to samples
      const paddedStartTime = Math.max(0, boundaries.startTime - padding);
      const paddedEndTime = Math.min(audioBuffer.duration, boundaries.endTime + padding);

      // Convert padded times to samples
      const adjustedStartSample = Math.floor(paddedStartTime * sampleRate);
      const adjustedEndSample = Math.floor(paddedEndTime * sampleRate);

      console.log('🔄 AUDIO TRIMMING WITH PADDING:', {
        originalSampleRate: sampleRate,
        rawSpeechBoundaries: {
          startTime: boundaries.startTime?.toFixed(3) + 's',
          endTime: boundaries.endTime?.toFixed(3) + 's'
        },
        paddingApplied: padding.toFixed(3) + 's',
        paddedBoundaries: {
          startTime: paddedStartTime.toFixed(3) + 's',
          endTime: paddedEndTime.toFixed(3) + 's',
          startSample: adjustedStartSample,
          endSample: adjustedEndSample
        }
      });

      // Calculate trim points with padding and limits
      const maxStartTrimSamples = Math.floor(maxTrimStart * sampleRate);
      const maxEndTrimSamples = Math.floor(maxTrimEnd * sampleRate);

      const startTrimSamples = Math.min(
        Math.max(0, adjustedStartSample),
        maxStartTrimSamples
      );

      const endTrimSamples = Math.min(
        Math.max(0, audioBuffer.length - adjustedEndSample),
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
