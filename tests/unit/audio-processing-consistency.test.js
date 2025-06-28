/**
 * Unit tests for ensuring consistent audio processing between single file uploads and folder uploads
 * These tests define the expected behavior and help us implement it correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref } from 'vue';

// Test the specific functions we want to implement for consistency
describe('Audio Processing Consistency', () => {
  // Mock audio processing functions
  const mockProcessAudio = vi.fn();
  const mockNormalizeAudioSilence = vi.fn();
  const mockGetAudioDuration = vi.fn();

  // Mock Vue refs
  const targetDebugInfo = ref(null);
  const targetAudioProcessed = ref(null);
  const currentRecording = ref(null);

  // Test data
  const mockAudioFile = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
  const mockVADResult = {
    processed: true,
    vadBoundaries: {
      startTime: 0.1,
      endTime: 2.5,
      originalSpeechStart: 0.15,
      originalSpeechEnd: 2.45
    },
    audioBlob: mockAudioFile
  };
  const mockNormalizedBlob = new File(['normalized'], 'normalized.mp3', { type: 'audio/mpeg' });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset refs
    targetDebugInfo.value = null;
    targetAudioProcessed.value = null;
    currentRecording.value = null;

    // Setup mocks
    mockProcessAudio.mockResolvedValue(mockVADResult);
    mockNormalizeAudioSilence.mockResolvedValue(mockNormalizedBlob);
    mockGetAudioDuration.mockResolvedValue(3.0);
  });

  // Declare functions in outer scope so they can be shared
  const processSingleFileUpload = async (file) => {
      // Get raw duration
      const rawDuration = await mockGetAudioDuration(file);
      
      // Initial debug info
      targetDebugInfo.value = {
        rawDuration: rawDuration.toFixed(3),
        finalDuration: rawDuration.toFixed(3),
        trimmedAmount: '0.000'
      };
      
      // Process audio with VAD
      const targetProcessed = await mockProcessAudio(file);
      
      if (targetProcessed.processed && targetProcessed.vadBoundaries) {
        // Normalize audio with consistent padding
        const normalizedBlob = await mockNormalizeAudioSilence(
          targetProcessed.audioBlob,
          targetProcessed.vadBoundaries,
          200 // 200ms padding
        );
        
        // Cache the processed audio
        targetAudioProcessed.value = {
          ...targetProcessed,
          audioBlob: normalizedBlob
        };
        
        // Update debug info with normalized duration
        const finalDuration = await mockGetAudioDuration(normalizedBlob);
        targetDebugInfo.value = {
          rawDuration: rawDuration.toFixed(3),
          finalDuration: finalDuration.toFixed(3),
          trimmedAmount: (rawDuration - finalDuration).toFixed(3)
        };
        
        return {
          success: true,
          normalizedBlob,
          debugInfo: targetDebugInfo.value,
          cached: targetAudioProcessed.value
        };
      }
      
      return { success: false };
    };

  const processFolderRecording = async (recording) => {
      if (!recording || !recording.audioBlob) {
        targetDebugInfo.value = null;
        targetAudioProcessed.value = null;
        return { success: false };
      }
      
      // Get raw duration (same as single file)
      const rawDuration = await mockGetAudioDuration(recording.audioBlob);
      
      // Process audio with VAD (same as single file)
      const targetProcessed = await mockProcessAudio(recording.audioBlob);
      
      if (targetProcessed.processed && targetProcessed.vadBoundaries) {
        // Normalize audio with consistent padding (same as single file)
        const normalizedBlob = await mockNormalizeAudioSilence(
          targetProcessed.audioBlob,
          targetProcessed.vadBoundaries,
          200 // Same 200ms padding as single file
        );
        
        // Cache the processed audio (same structure as single file)
        targetAudioProcessed.value = {
          ...targetProcessed,
          audioBlob: normalizedBlob
        };
        
        // Update debug info (same structure as single file)
        const finalDuration = await mockGetAudioDuration(normalizedBlob);
        targetDebugInfo.value = {
          rawDuration: rawDuration.toFixed(3),
          finalDuration: finalDuration.toFixed(3),
          trimmedAmount: (rawDuration - finalDuration).toFixed(3)
        };
        
        return {
          success: true,
          normalizedBlob,
          debugInfo: targetDebugInfo.value,
          cached: targetAudioProcessed.value
        };
      } else {
        // Fallback (same as single file)
        targetAudioProcessed.value = null;
        targetDebugInfo.value = {
          rawDuration: rawDuration.toFixed(3),
          finalDuration: rawDuration.toFixed(3),
          trimmedAmount: '0.000'
        };
        
        return { success: false, debugInfo: targetDebugInfo.value };
      }
    };

  describe('Single File Upload Processing', () => {
    it('should process audio with VAD and create debug info', async () => {
      const result = await processSingleFileUpload(mockAudioFile);
      
      expect(result.success).toBe(true);
      expect(mockProcessAudio).toHaveBeenCalledWith(mockAudioFile);
      expect(mockNormalizeAudioSilence).toHaveBeenCalledWith(
        mockVADResult.audioBlob,
        mockVADResult.vadBoundaries,
        200
      );
      
      expect(targetDebugInfo.value).toEqual({
        rawDuration: '3.000',
        finalDuration: '3.000', 
        trimmedAmount: '0.000'
      });
    });

    it('should cache processed audio for reuse', async () => {
      const result = await processSingleFileUpload(mockAudioFile);
      
      expect(targetAudioProcessed.value).toBeTruthy();
      expect(targetAudioProcessed.value.processed).toBe(true);
      expect(targetAudioProcessed.value.vadBoundaries).toBeTruthy();
      expect(targetAudioProcessed.value.audioBlob).toBe(mockNormalizedBlob);
    });
  });

  describe('Folder Upload Processing', () => {
    // Function is declared in outer scope

    it('should process folder recording identically to single file upload', async () => {
      const mockRecording = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      
      const result = await processFolderRecording(mockRecording);
      
      // Should process exactly the same way as single file
      expect(result.success).toBe(true);
      expect(mockProcessAudio).toHaveBeenCalledWith(mockAudioFile);
      expect(mockNormalizeAudioSilence).toHaveBeenCalledWith(
        mockVADResult.audioBlob,
        mockVADResult.vadBoundaries,
        200 // Same padding
      );
      
      // Should have identical debug info structure
      expect(targetDebugInfo.value).toEqual({
        rawDuration: '3.000',
        finalDuration: '3.000',
        trimmedAmount: '0.000'
      });
    });

    it('should create identical cache structure to single file upload', async () => {
      const mockRecording = {
        id: 'rec-1',
        name: 'Test Recording', 
        audioBlob: mockAudioFile
      };
      
      await processFolderRecording(mockRecording);
      
      // Should have identical cache structure
      expect(targetAudioProcessed.value).toBeTruthy();
      expect(targetAudioProcessed.value.processed).toBe(true);
      expect(targetAudioProcessed.value.vadBoundaries).toBeTruthy();
      expect(targetAudioProcessed.value.audioBlob).toBe(mockNormalizedBlob);
    });

    it('should clear cache when no recording provided', async () => {
      const result = await processFolderRecording(null);
      
      expect(result.success).toBe(false);
      expect(targetDebugInfo.value).toBeNull();
      expect(targetAudioProcessed.value).toBeNull();
    });

    it('should handle VAD processing failure gracefully', async () => {
      // Mock VAD failure
      mockProcessAudio.mockResolvedValueOnce({
        processed: false,
        vadBoundaries: null
      });
      
      const mockRecording = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      
      const result = await processFolderRecording(mockRecording);
      
      expect(result.success).toBe(false);
      expect(targetAudioProcessed.value).toBeNull();
      expect(targetDebugInfo.value).toEqual({
        rawDuration: '3.000',
        finalDuration: '3.000',
        trimmedAmount: '0.000'
      });
    });
  });

  describe('Processing Consistency', () => {
    it('should produce identical results for same audio file', async () => {
      // Process as single file
      const singleFileResult = await processSingleFileUpload(mockAudioFile);
      
      // Reset state
      targetDebugInfo.value = null;
      targetAudioProcessed.value = null;
      vi.clearAllMocks();
      
      // Reset mocks with same responses
      mockProcessAudio.mockResolvedValue(mockVADResult);
      mockNormalizeAudioSilence.mockResolvedValue(mockNormalizedBlob);
      mockGetAudioDuration.mockResolvedValue(3.0);
      
      // Process as folder recording
      const mockRecording = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      const folderResult = await processFolderRecording(mockRecording);
      
      // Results should be identical
      expect(folderResult.success).toBe(singleFileResult.success);
      expect(folderResult.debugInfo).toEqual(singleFileResult.debugInfo);
      expect(folderResult.cached).toEqual(singleFileResult.cached);
    });

    it('should call processing functions with identical parameters', async () => {
      const calls1 = [];
      const calls2 = [];
      
      // Track single file calls
      mockProcessAudio.mockImplementation((...args) => {
        calls1.push(['processAudio', ...args]);
        return Promise.resolve(mockVADResult);
      });
      mockNormalizeAudioSilence.mockImplementation((...args) => {
        calls1.push(['normalizeAudioSilence', ...args]);
        return Promise.resolve(mockNormalizedBlob);
      });
      
      await processSingleFileUpload(mockAudioFile);
      
      // Reset and track folder calls
      vi.clearAllMocks();
      mockProcessAudio.mockImplementation((...args) => {
        calls2.push(['processAudio', ...args]);
        return Promise.resolve(mockVADResult);
      });
      mockNormalizeAudioSilence.mockImplementation((...args) => {
        calls2.push(['normalizeAudioSilence', ...args]);
        return Promise.resolve(mockNormalizedBlob);
      });
      
      const mockRecording = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      await processFolderRecording(mockRecording);
      
      // Function calls should be identical
      expect(calls2).toEqual(calls1);
    });
  });

  describe('Watcher Implementation', () => {
    // This tests the watcher logic we need to implement
    const createRecordingWatcher = () => {
      let previousRecording = null;
      
      return async (newRecording) => {
        // Only process if recording changed and has audio
        if (newRecording && newRecording !== previousRecording && newRecording.audioBlob) {
          previousRecording = newRecording;
          return await processFolderRecording(newRecording);
        } else if (!newRecording) {
          previousRecording = null;
          return await processFolderRecording(null);
        }
        
        return { success: false, reason: 'no_change' };
      };
    };

    it('should only process when recording actually changes', async () => {
      const watcher = createRecordingWatcher();
      
      const mockRecording = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      
      // First time should process
      const result1 = await watcher(mockRecording);
      expect(result1.success).toBe(true);
      expect(mockProcessAudio).toHaveBeenCalledTimes(1);
      
      // Same recording should not reprocess
      vi.clearAllMocks();
      const result2 = await watcher(mockRecording);
      expect(result2.reason).toBe('no_change');
      expect(mockProcessAudio).not.toHaveBeenCalled();
      
      // Different recording should process
      const mockRecording2 = {
        id: 'rec-2',
        name: 'Different Recording',
        audioBlob: mockAudioFile
      };
      const result3 = await watcher(mockRecording2);
      expect(result3.success).toBe(true);
      expect(mockProcessAudio).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when recording becomes null', async () => {
      const watcher = createRecordingWatcher();
      
      const mockRecording = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      
      // Set recording
      await watcher(mockRecording);
      expect(targetAudioProcessed.value).toBeTruthy();
      
      // Clear recording
      await watcher(null);
      expect(targetDebugInfo.value).toBeNull();
      expect(targetAudioProcessed.value).toBeNull();
    });
  });
});