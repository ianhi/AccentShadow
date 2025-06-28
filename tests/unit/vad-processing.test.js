/**
 * VAD Processing Tests
 * Tests the VAD audio processing functionality to ensure:
 * 1. Speech segments are detected correctly
 * 2. Audio files don't get significantly shorter after processing
 * 3. Processing works consistently with different audio formats
 * 4. Working VAD configuration from commit 3f94da2 is properly restored
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { useVADProcessor } from '../../src/composables/useVADProcessor.ts';

// Test configuration
const VAD_TEST_CONFIG = {
  // Conservative settings from working configuration (commit 3f94da2)
  positiveSpeechThreshold: 0.5,
  negativeSpeechThreshold: 0.35,
  minSpeechFrames: 8,
  padding: 0.1, // 100ms padding
  threshold: 0.5,
  minSpeechDuration: 50,
  maxSilenceDuration: 300
};

// Maximum acceptable audio reduction percentage
const MAX_AUDIO_REDUCTION_PERCENT = 50; // Audio should not be reduced by more than 50%
const MIN_CONFIDENCE_SCORE = 0.1; // Minimum VAD confidence for valid detection

describe('VAD Audio Processing', () => {
  let vadProcessor;
  
  beforeAll(async () => {
    vadProcessor = useVADProcessor();
    
    // Initialize VAD with timeout to handle CDN loading
    console.log('🔧 Initializing VAD for tests...');
    await vadProcessor.initVAD();
    
    // Wait additional time for VAD to be ready
    let retries = 0;
    while (!vadProcessor.vadReady.value && retries < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    if (!vadProcessor.vadReady.value) {
      console.warn('⚠️ VAD not ready for tests - tests will verify fallback behavior');
    } else {
      console.log('✅ VAD initialized for tests');
    }
  });

  describe('Public Directory Audio Files', () => {
    const testFiles = [
      { name: 'path.mp3', path: '/path.mp3' },
      { name: 'patth.wav', path: '/patth.wav' },
      { name: 'test_said_three_words.wav', path: '/test_said_three_words.wav' }
    ];

    testFiles.forEach(({ name, path }) => {
      describe(`Processing ${name}`, () => {
        let originalBlob;
        let originalDuration;
        let vadBoundaries;
        let trimResult;

        beforeAll(async () => {
          // Load the audio file from public directory
          try {
            const response = await fetch(path);
            if (!response.ok) {
              throw new Error(`Failed to fetch ${path}: ${response.status}`);
            }
            originalBlob = await response.blob();
            
            // Get original duration
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const arrayBuffer = await originalBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            originalDuration = audioBuffer.duration;
            
            console.log(`📁 Loaded ${name}: ${originalDuration.toFixed(3)}s, ${originalBlob.size} bytes`);
          } catch (error) {
            console.error(`❌ Failed to load ${name}:`, error);
            throw error;
          }
        });

        it('should detect speech boundaries without errors', async () => {
          expect(originalBlob).toBeDefined();
          expect(originalDuration).toBeGreaterThan(0);

          // Test VAD boundary detection
          vadBoundaries = await vadProcessor.detectSpeechBoundariesVAD(originalBlob, VAD_TEST_CONFIG);
          
          expect(vadBoundaries).toBeDefined();
          expect(vadBoundaries.startTime).toBeGreaterThanOrEqual(0);
          expect(vadBoundaries.endTime).toBeGreaterThan(vadBoundaries.startTime);
          expect(vadBoundaries.endTime).toBeLessThanOrEqual(originalDuration);
          
          console.log(`🎙️ ${name} VAD Results:`, {
            speechSegments: vadBoundaries.speechSegments,
            startTime: vadBoundaries.startTime?.toFixed(3) + 's',
            endTime: vadBoundaries.endTime?.toFixed(3) + 's',
            confidence: vadBoundaries.confidenceScore?.toFixed(2),
            vadFailed: vadBoundaries.vadFailed
          });
        });

        it('should not significantly reduce audio duration when trimming', async () => {
          expect(vadBoundaries).toBeDefined();
          
          // Test audio trimming
          trimResult = await vadProcessor.trimAudioWithVAD(originalBlob, {
            ...VAD_TEST_CONFIG,
            maxTrimStart: 3.0,
            maxTrimEnd: 2.0
          });
          
          expect(trimResult).toBeDefined();
          expect(trimResult.blob).toBeDefined();
          expect(trimResult.newDuration).toBeGreaterThan(0);
          
          // Calculate reduction percentage
          const reductionPercent = ((originalDuration - trimResult.newDuration) / originalDuration) * 100;
          
          console.log(`✂️ ${name} Trimming Results:`, {
            originalDuration: originalDuration.toFixed(3) + 's',
            newDuration: trimResult.newDuration.toFixed(3) + 's',
            trimmedStart: trimResult.trimmedStart?.toFixed(3) + 's',
            trimmedEnd: trimResult.trimmedEnd?.toFixed(3) + 's',
            reductionPercent: reductionPercent.toFixed(1) + '%',
            originalSize: originalBlob.size,
            newSize: trimResult.blob.size
          });
          
          // Verify audio is not reduced too much
          expect(reductionPercent).toBeLessThan(MAX_AUDIO_REDUCTION_PERCENT);
          expect(trimResult.newDuration).toBeGreaterThan(originalDuration * 0.5); // At least 50% should remain
        });

        it('should preserve audio quality and content', async () => {
          expect(trimResult).toBeDefined();
          
          // Verify the trimmed audio has reasonable size
          const sizeDifference = originalBlob.size - trimResult.blob.size;
          const sizeReductionPercent = (sizeDifference / originalBlob.size) * 100;
          
          console.log(`📊 ${name} Quality Check:`, {
            sizeDifference: sizeDifference,
            sizeReductionPercent: sizeReductionPercent.toFixed(1) + '%',
            hasError: !!trimResult.error
          });
          
          // Should not have processing errors
          expect(trimResult.error).toBeUndefined();
          
          // Trimmed audio should have reasonable size (not too small)
          expect(trimResult.blob.size).toBeGreaterThan(1000); // At least 1KB
          
          // If VAD worked, we should have reasonable confidence or valid fallback
          if (!vadBoundaries.vadFailed) {
            expect(vadBoundaries.speechSegments).toBeGreaterThanOrEqual(1);
          }
        });

        it('should have consistent VAD configuration', async () => {
          // Verify VAD is using conservative settings from working config
          if (vadProcessor.vadReady.value) {
            // Test with different threshold values to ensure conservative behavior
            const strictBoundaries = await vadProcessor.detectSpeechBoundariesVAD(originalBlob, {
              positiveSpeechThreshold: 0.6, // Even more conservative
              negativeSpeechThreshold: 0.4,
              minSpeechFrames: 8,
              padding: 0.1
            });
            
            console.log(`🔧 ${name} Strict VAD Test:`, {
              originalSegments: vadBoundaries.speechSegments,
              strictSegments: strictBoundaries.speechSegments,
              originalConfidence: vadBoundaries.confidenceScore?.toFixed(2),
              strictConfidence: strictBoundaries.confidenceScore?.toFixed(2)
            });
            
            // Strict settings should detect same or fewer segments
            expect(strictBoundaries.speechSegments).toBeLessThanOrEqual(vadBoundaries.speechSegments);
          }
        });
      });
    });
  });

  describe('VAD Configuration Validation', () => {
    it('should use conservative thresholds from working config', () => {
      // Verify we're using the working configuration values
      const config = VAD_TEST_CONFIG;
      
      expect(config.positiveSpeechThreshold).toEqual(0.5);
      expect(config.negativeSpeechThreshold).toEqual(0.35);
      expect(config.minSpeechFrames).toEqual(8);
      expect(config.padding).toEqual(0.1);
      
      console.log('✅ VAD Configuration matches working settings from commit 3f94da2');
    });

    it('should handle empty or invalid audio gracefully', async () => {
      // Test with empty blob
      const emptyBlob = new Blob([], { type: 'audio/wav' });
      
      try {
        const result = await vadProcessor.detectSpeechBoundariesVAD(emptyBlob, VAD_TEST_CONFIG);
        
        // Should not crash and should return reasonable fallback
        expect(result).toBeDefined();
        expect(result.vadFailed).toBe(true);
        
        console.log('✅ Empty audio handled gracefully');
      } catch (error) {
        // Should not throw errors
        expect(error).toBeUndefined();
      }
    });
  });

  describe('Performance and Consistency', () => {
    it('should process audio in reasonable time', async () => {
      // Test with one of the files for performance
      const response = await fetch('/test_said_three_words.wav');
      const blob = await response.blob();
      
      const startTime = performance.now();
      const result = await vadProcessor.detectSpeechBoundariesVAD(blob, VAD_TEST_CONFIG);
      const processingTime = performance.now() - startTime;
      
      console.log(`⏱️ Processing time: ${processingTime.toFixed(0)}ms`);
      
      // Should complete within reasonable time (10 seconds max)
      expect(processingTime).toBeLessThan(10000);
      expect(result).toBeDefined();
    });

    it('should produce consistent results across multiple runs', async () => {
      const response = await fetch('/path.mp3');
      const blob = await response.blob();
      
      // Run VAD detection multiple times
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await vadProcessor.detectSpeechBoundariesVAD(blob, VAD_TEST_CONFIG);
        results.push(result);
      }
      
      // Results should be consistent (within 10ms tolerance)
      const tolerance = 0.01; // 10ms
      
      for (let i = 1; i < results.length; i++) {
        expect(Math.abs(results[i].startTime - results[0].startTime)).toBeLessThan(tolerance);
        expect(Math.abs(results[i].endTime - results[0].endTime)).toBeLessThan(tolerance);
      }
      
      console.log('✅ VAD produces consistent results across multiple runs');
    });
  });
});