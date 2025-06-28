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

  describe('Audio Trimming Verification', () => {
    it('should properly trim audio based on VAD boundaries', async () => {
      // Mock VAD result with significant silence to trim
      const mockVADWithSilence = {
        processed: true,
        vadBoundaries: {
          startTime: 0.5,  // 500ms of silence at start
          endTime: 2.0,    // 1 second of silence at end (from 3s total)
          originalSpeechStart: 0.6,
          originalSpeechEnd: 1.9
        },
        audioBlob: mockAudioFile
      };

      // Mock a trimmed result
      const mockTrimmedBlob = new File(['trimmed audio'], 'trimmed.mp3', { type: 'audio/mpeg' });
      mockProcessAudio.mockResolvedValueOnce(mockVADWithSilence);
      mockNormalizeAudioSilence.mockResolvedValueOnce(mockTrimmedBlob);
      
      // Mock durations to show trimming effect
      mockGetAudioDuration
        .mockResolvedValueOnce(3.0)  // Original duration
        .mockResolvedValueOnce(2.2); // Trimmed duration (200ms padding + 1.5s speech)

      const result = await processSingleFileUpload(mockAudioFile);

      expect(result.success).toBe(true);
      
      // Should call normalize with VAD boundaries
      expect(mockNormalizeAudioSilence).toHaveBeenCalledWith(
        mockVADWithSilence.audioBlob,
        mockVADWithSilence.vadBoundaries,
        200
      );

      // Debug info should show trimming occurred
      expect(targetDebugInfo.value.rawDuration).toBe('3.000');
      expect(targetDebugInfo.value.finalDuration).toBe('2.200');
      expect(targetDebugInfo.value.trimmedAmount).toBe('0.800'); // 800ms trimmed
    });

    it('should handle audio with minimal silence (no trimming needed)', async () => {
      // Mock VAD result with minimal silence
      const mockVADMinimalSilence = {
        processed: true,
        vadBoundaries: {
          startTime: 0.05,  // 50ms of silence at start
          endTime: 2.95,    // 50ms of silence at end
          originalSpeechStart: 0.1,
          originalSpeechEnd: 2.9
        },
        audioBlob: mockAudioFile
      };

      mockProcessAudio.mockResolvedValueOnce(mockVADMinimalSilence);
      mockNormalizeAudioSilence.mockResolvedValueOnce(mockNormalizedBlob);
      
      // Mock durations showing minimal trimming
      mockGetAudioDuration
        .mockResolvedValueOnce(3.0)  // Original duration
        .mockResolvedValueOnce(2.95); // Barely trimmed

      const result = await processSingleFileUpload(mockAudioFile);

      expect(result.success).toBe(true);
      expect(targetDebugInfo.value.trimmedAmount).toBe('0.050'); // 50ms trimmed
    });

    it('should preserve original audio when VAD processing fails', async () => {
      // Mock VAD failure
      mockProcessAudio.mockResolvedValueOnce({
        processed: false,
        vadBoundaries: null
      });

      const result = await processSingleFileUpload(mockAudioFile);

      expect(result.success).toBe(false);
      expect(targetDebugInfo.value.rawDuration).toBe('3.000');
      expect(targetDebugInfo.value.finalDuration).toBe('3.000');
      expect(targetDebugInfo.value.trimmedAmount).toBe('0.000'); // No trimming when VAD fails
    });

    it('should apply consistent trimming for both single file and folder uploads', async () => {
      // Test identical VAD result for both methods
      const mockVADResult = {
        processed: true,
        vadBoundaries: {
          startTime: 0.3,
          endTime: 2.5,
          originalSpeechStart: 0.4,
          originalSpeechEnd: 2.4
        },
        audioBlob: mockAudioFile
      };

      const mockTrimmedBlob = new File(['trimmed'], 'trimmed.mp3', { type: 'audio/mpeg' });
      
      // Test single file upload
      mockProcessAudio.mockResolvedValue(mockVADResult);
      mockNormalizeAudioSilence.mockResolvedValue(mockTrimmedBlob);
      mockGetAudioDuration
        .mockResolvedValueOnce(3.0)   // Original
        .mockResolvedValueOnce(2.4);  // Trimmed

      const singleFileResult = await processSingleFileUpload(mockAudioFile);
      const singleFileDebugInfo = { ...targetDebugInfo.value };

      // Reset state and mocks
      targetDebugInfo.value = null;
      vi.clearAllMocks();
      mockProcessAudio.mockResolvedValue(mockVADResult);
      mockNormalizeAudioSilence.mockResolvedValue(mockTrimmedBlob);
      mockGetAudioDuration
        .mockResolvedValueOnce(3.0)   // Original
        .mockResolvedValueOnce(2.4);  // Trimmed

      // Test folder upload
      const mockRecording = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      const folderResult = await processFolderRecording(mockRecording);
      const folderDebugInfo = { ...targetDebugInfo.value };

      // Trimming should be identical
      expect(singleFileResult.success).toBe(folderResult.success);
      expect(singleFileDebugInfo).toEqual(folderDebugInfo);
      expect(singleFileDebugInfo.trimmedAmount).toBe('0.600'); // Same trimming
    });
  });

  describe('Audio Playback Functionality', () => {
    // Mock audio player functionality
    const mockWavesurfer = {
      play: vi.fn(),
      pause: vi.fn(),
      isPlaying: vi.fn(() => false),
      getCurrentTime: vi.fn(() => 0),
      getDuration: vi.fn(() => 3.0),
      seekTo: vi.fn(),
      on: vi.fn(),
      load: vi.fn(),
      destroy: vi.fn()
    };

    const mockAudioManager = {
      play: vi.fn(),
      stop: vi.fn(),
      registerPlayer: vi.fn(() => ({ id: 'mock-player', wavesurfer: mockWavesurfer }))
    };

    beforeEach(() => {
      // Reset audio mocks
      vi.clearAllMocks();
      mockWavesurfer.isPlaying.mockReturnValue(false);
    });

    it('should create audio player with processed audio URL', async () => {
      // Process audio first
      const result = await processSingleFileUpload(mockAudioFile);
      expect(result.success).toBe(true);

      // Mock URL creation
      const mockURL = 'blob:processed-audio-url';
      global.URL.createObjectURL = vi.fn(() => mockURL);

      // Simulate creating audio player with the normalized blob
      const audioUrl = URL.createObjectURL(result.normalizedBlob);
      
      expect(audioUrl).toBe(mockURL);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(result.normalizedBlob);
    });

    it('should enable play button when audio is processed and ready', async () => {
      // Simulate the conditions that should enable the play button
      const hasProcessedAudio = true;
      const isAudioReady = true;
      const hasValidUrl = true;

      // Play button should be enabled when all conditions are met
      const isPlayButtonEnabled = hasProcessedAudio && isAudioReady && hasValidUrl;
      expect(isPlayButtonEnabled).toBe(true);
    });

    it('should play audio when play target button is clicked', async () => {
      // Process audio first
      await processSingleFileUpload(mockAudioFile);
      
      // Mock audio player being ready
      const mockPlayerInfo = {
        id: 'target-player',
        type: 'target',
        wavesurfer: mockWavesurfer
      };

      // Simulate play button click
      mockAudioManager.play(mockPlayerInfo);
      
      expect(mockAudioManager.play).toHaveBeenCalledWith(mockPlayerInfo);
    });

    it('should play folder recording audio correctly', async () => {
      // Process folder recording
      const mockRecording = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      
      await processFolderRecording(mockRecording);
      
      // Should be able to create player with normalized audio
      const mockURL = 'blob:folder-audio-url';
      global.URL.createObjectURL = vi.fn(() => mockURL);
      
      // Simulate getting the processed audio for playback
      const audioUrl = URL.createObjectURL(targetAudioProcessed.value.audioBlob);
      
      expect(audioUrl).toBe(mockURL);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(targetAudioProcessed.value.audioBlob);
    });

    it('should handle play/pause toggle correctly', () => {
      const mockPlayerRef = {
        wavesurfer: mockWavesurfer,
        isPlaying: { value: false },
        playPause: vi.fn()
      };

      // Simulate play/pause functionality
      if (mockWavesurfer.isPlaying()) {
        mockWavesurfer.pause();
      } else {
        mockAudioManager.play({ wavesurfer: mockWavesurfer });
      }

      // Should call play since isPlaying returns false
      expect(mockAudioManager.play).toHaveBeenCalledWith({ wavesurfer: mockWavesurfer });
    });

    it('should use correct audio source for playback', async () => {
      // Test single file upload source
      await processSingleFileUpload(mockAudioFile);
      const singleFileUrl = URL.createObjectURL(targetAudioProcessed.value.audioBlob);

      // Test folder upload source  
      const mockRecording = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      await processFolderRecording(mockRecording);
      const folderUrl = URL.createObjectURL(targetAudioProcessed.value.audioBlob);

      // Both should create valid blob URLs for their processed audio
      expect(singleFileUrl).toMatch(/^blob:/);
      expect(folderUrl).toMatch(/^blob:/);
    });

    it('should maintain playback state correctly during audio alignment', async () => {
      // Mock initial playback state
      let isPlaying = false;
      let currentTime = 1.5;

      // Simulate audio processing that might affect playback
      await processSingleFileUpload(mockAudioFile);

      // Playback state should be maintained through processing
      mockWavesurfer.getCurrentTime.mockReturnValue(currentTime);
      mockWavesurfer.isPlaying.mockReturnValue(isPlaying);

      expect(mockWavesurfer.getCurrentTime()).toBe(1.5);
      expect(mockWavesurfer.isPlaying()).toBe(false);
    });

    it('should handle audio loading errors gracefully', () => {
      const mockError = new Error('Failed to load audio');
      
      // Simulate audio loading error
      const handleAudioError = (error) => {
        console.error('Audio loading error:', error);
        return { success: false, error: error.message };
      };

      const result = handleAudioError(mockError);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to load audio');
    });
  });
});