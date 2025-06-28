/**
 * Integration tests comparing folder upload vs single file upload behavior
 * These tests define the expected behavior that both upload methods should achieve
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PracticeView from '../../src/views/PracticeView.vue';

// Mock composables
const mockProcessAudio = vi.fn();
const mockNormalizeAudioSilence = vi.fn();
const mockGetAudioDuration = vi.fn();
const mockInitVAD = vi.fn();

vi.mock('../../src/composables/useSmartAudioAlignment', () => ({
  useSmartAudioAlignment: () => ({
    processAudio: mockProcessAudio,
    normalizeAudioSilence: mockNormalizeAudioSilence,
    vadReady: { value: true },
    initVAD: mockInitVAD,
    isProcessing: { value: false }
  })
}));

vi.mock('../../src/composables/useRecordingSets', () => ({
  useRecordingSets: () => ({
    currentRecording: { value: null },
    activeSet: { value: null },
    setActiveSet: vi.fn(),
    markRecordingCompleted: vi.fn()
  })
}));

vi.mock('../../src/composables/useIndexedDB', () => ({
  useIndexedDB: () => ({
    initDB: vi.fn(),
    addRecording: vi.fn(),
    deleteRecording: vi.fn()
  })
}));

describe('Folder Upload vs Single File Upload Behavior', () => {
  let wrapper;

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
  const mockNormalizedBlob = new File(['normalized audio'], 'normalized.mp3', { type: 'audio/mpeg' });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup common mocks
    mockProcessAudio.mockResolvedValue(mockVADResult);
    mockNormalizeAudioSilence.mockResolvedValue(mockNormalizedBlob);
    mockGetAudioDuration.mockResolvedValue(3.0);
    
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    wrapper = mount(PracticeView, {
      global: {
        provide: {
          // Provide any required dependencies
        }
      }
    });
  });

  afterEach(() => {
    wrapper.unmount();
  });

  describe('Single File Upload Expected Behavior', () => {
    it('should process audio with VAD when file is uploaded', async () => {
      // Simulate file selection
      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockAudioFile],
        writable: false,
      });

      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Should process audio with VAD
      expect(mockProcessAudio).toHaveBeenCalledWith(mockAudioFile);
      
      // Should normalize audio with VAD boundaries
      expect(mockNormalizeAudioSilence).toHaveBeenCalledWith(
        mockVADResult.audioBlob,
        mockVADResult.vadBoundaries,
        200 // 200ms padding
      );
    });

    it('should populate debug info with processing results', async () => {
      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockAudioFile],
        writable: false,
      });

      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Should have targetDebugInfo populated
      expect(wrapper.vm.targetDebugInfo).toBeTruthy();
      expect(wrapper.vm.targetDebugInfo.rawDuration).toBe('3.000');
      expect(wrapper.vm.targetDebugInfo.finalDuration).toBe('3.000');
      expect(wrapper.vm.targetDebugInfo.trimmedAmount).toBe('0.000');
    });

    it('should cache processed audio for future use', async () => {
      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockAudioFile],
        writable: false,
      });

      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Should cache the processed audio
      expect(wrapper.vm.targetAudioProcessed).toBeTruthy();
      expect(wrapper.vm.targetAudioProcessed.processed).toBe(true);
      expect(wrapper.vm.targetAudioProcessed.vadBoundaries).toBeTruthy();
    });

    it('should set target audio URL and blob', async () => {
      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockAudioFile],
        writable: false,
      });

      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Should set target audio
      expect(wrapper.vm.targetAudioUrl).toBe('blob:mock-url');
      expect(wrapper.vm.targetAudioBlob).toBe(mockNormalizedBlob);
    });
  });

  describe('Folder Upload Expected Behavior', () => {
    const mockFolderRecording = {
      id: 'rec-1',
      name: 'Test Recording',
      audioUrl: 'blob:folder-url',
      audioBlob: mockAudioFile,
      metadata: {
        category: 'test',
        fileName: 'test.mp3'
      }
    };

    it('should process audio with VAD when recording becomes current', async () => {
      // Simulate setting current recording from folder
      wrapper.vm.currentRecording.value = mockFolderRecording;
      await wrapper.vm.$nextTick();

      // Should process audio with VAD (same as single file)
      expect(mockProcessAudio).toHaveBeenCalledWith(mockFolderRecording.audioBlob);
      
      // Should normalize audio with VAD boundaries (same as single file)
      expect(mockNormalizeAudioSilence).toHaveBeenCalledWith(
        mockVADResult.audioBlob,
        mockVADResult.vadBoundaries,
        200 // Same 200ms padding as single file
      );
    });

    it('should populate debug info identical to single file upload', async () => {
      // Simulate setting current recording from folder
      wrapper.vm.currentRecording.value = mockFolderRecording;
      await wrapper.vm.$nextTick();

      // Should have identical debug info structure
      expect(wrapper.vm.targetDebugInfo).toBeTruthy();
      expect(wrapper.vm.targetDebugInfo.rawDuration).toBe('3.000');
      expect(wrapper.vm.targetDebugInfo.finalDuration).toBe('3.000');
      expect(wrapper.vm.targetDebugInfo.trimmedAmount).toBe('0.000');
    });

    it('should cache processed audio identical to single file upload', async () => {
      // Simulate setting current recording from folder
      wrapper.vm.currentRecording.value = mockFolderRecording;
      await wrapper.vm.$nextTick();

      // Should have identical cache structure
      expect(wrapper.vm.targetAudioProcessed).toBeTruthy();
      expect(wrapper.vm.targetAudioProcessed.processed).toBe(true);
      expect(wrapper.vm.targetAudioProcessed.vadBoundaries).toBeTruthy();
      expect(wrapper.vm.targetAudioProcessed.audioBlob).toBe(mockNormalizedBlob);
    });

    it('should not override existing processed cache unnecessarily', async () => {
      // Set up existing cache
      wrapper.vm.targetAudioProcessed.value = mockVADResult;
      
      // Simulate setting same recording again
      wrapper.vm.currentRecording.value = mockFolderRecording;
      await wrapper.vm.$nextTick();

      // Should not reprocess if already cached for same recording
      // (This test ensures efficiency)
      expect(mockProcessAudio).not.toHaveBeenCalled();
    });

    it('should clear cache and debug info when no recording selected', async () => {
      // Set up initial state
      wrapper.vm.currentRecording.value = mockFolderRecording;
      await wrapper.vm.$nextTick();

      // Clear recording
      wrapper.vm.currentRecording.value = null;
      await wrapper.vm.$nextTick();

      // Should clear cache and debug info
      expect(wrapper.vm.targetDebugInfo).toBeNull();
      expect(wrapper.vm.targetAudioProcessed).toBeNull();
    });
  });

  describe('Audio Alignment Behavior Consistency', () => {
    const mockUserAudio = new File(['user audio'], 'user.mp3', { type: 'audio/mpeg' });
    const mockUserVADResult = {
      processed: true,
      vadBoundaries: {
        startTime: 0.2,
        endTime: 2.3,
        originalSpeechStart: 0.25,
        originalSpeechEnd: 2.25
      },
      audioBlob: mockUserAudio
    };

    beforeEach(() => {
      // Setup user audio processing
      mockProcessAudio.mockImplementation((audioBlob) => {
        if (audioBlob === mockUserAudio) {
          return Promise.resolve(mockUserVADResult);
        }
        return Promise.resolve(mockVADResult);
      });
    });

    it('should use cached target processing for alignment (single file)', async () => {
      // Simulate single file upload first
      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockAudioFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Clear the mock to track alignment calls
      mockProcessAudio.mockClear();

      // Simulate user recording
      wrapper.vm.userAudioBlob.value = mockUserAudio;
      await wrapper.vm.handleRecordedAudio(mockUserAudio);

      // Should use cached target processing, only process user audio
      expect(mockProcessAudio).toHaveBeenCalledTimes(1);
      expect(mockProcessAudio).toHaveBeenCalledWith(mockUserAudio);
    });

    it('should use cached target processing for alignment (folder upload)', async () => {
      // Simulate folder recording selection
      wrapper.vm.currentRecording.value = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      await wrapper.vm.$nextTick();

      // Clear the mock to track alignment calls
      mockProcessAudio.mockClear();

      // Simulate user recording
      wrapper.vm.userAudioBlob.value = mockUserAudio;
      await wrapper.vm.handleRecordedAudio(mockUserAudio);

      // Should use cached target processing, only process user audio
      expect(mockProcessAudio).toHaveBeenCalledTimes(1);
      expect(mockProcessAudio).toHaveBeenCalledWith(mockUserAudio);
    });

    it('should produce identical alignment results for both upload methods', async () => {
      const mockAlignedResults = {
        audio1Aligned: new File(['aligned target'], 'target.mp3', { type: 'audio/mpeg' }),
        audio2Aligned: new File(['aligned user'], 'user.mp3', { type: 'audio/mpeg' }),
        alignmentInfo: {
          method: 'end_padding',
          finalDuration: 2.5,
          paddingAdded: 0.2
        }
      };

      const mockAlignTwoAudios = vi.fn().mockResolvedValue(mockAlignedResults);
      wrapper.vm.alignTwoAudios = mockAlignTwoAudios;

      // Test single file upload alignment
      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockAudioFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      wrapper.vm.userAudioBlob.value = mockUserAudio;
      await wrapper.vm.handleRecordedAudio(mockUserAudio);

      const singleFileAlignment = mockAlignTwoAudios.mock.calls[0];

      // Reset and test folder upload alignment
      mockAlignTwoAudios.mockClear();
      wrapper.vm.currentRecording.value = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      await wrapper.vm.$nextTick();

      wrapper.vm.userAudioBlob.value = mockUserAudio;
      await wrapper.vm.handleRecordedAudio(mockUserAudio);

      const folderUploadAlignment = mockAlignTwoAudios.mock.calls[0];

      // Should call alignTwoAudios with identical parameters
      expect(singleFileAlignment).toEqual(folderUploadAlignment);
    });
  });

  describe('UI Consistency', () => {
    it('should display debug info for both upload methods', async () => {
      // Test single file upload
      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockAudioFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Should show debug info
      const debugInfoSingle = wrapper.find('[data-testid="target-debug-info"]');
      expect(debugInfoSingle.exists()).toBe(true);

      // Test folder upload
      wrapper.vm.currentRecording.value = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      await wrapper.vm.$nextTick();

      // Should show identical debug info structure
      const debugInfoFolder = wrapper.find('[data-testid="target-debug-info"]');
      expect(debugInfoFolder.exists()).toBe(true);
      expect(debugInfoFolder.text()).toContain('3.000'); // Duration
      expect(debugInfoFolder.text()).toContain('0.000'); // Trimmed
    });

    it('should enable alignment controls for both upload methods', async () => {
      // Test single file upload
      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockAudioFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      const alignBtn = wrapper.find('.align-btn');
      expect(alignBtn.attributes('disabled')).toBeUndefined();

      // Test folder upload
      wrapper.vm.currentRecording.value = {
        id: 'rec-1',
        name: 'Test Recording',
        audioBlob: mockAudioFile
      };
      await wrapper.vm.$nextTick();

      // Should enable alignment controls identically
      expect(alignBtn.attributes('disabled')).toBeUndefined();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should process each folder recording only once', async () => {
      const recording1 = {
        id: 'rec-1',
        name: 'Recording 1',
        audioBlob: mockAudioFile
      };

      // Set recording
      wrapper.vm.currentRecording.value = recording1;
      await wrapper.vm.$nextTick();

      expect(mockProcessAudio).toHaveBeenCalledTimes(1);

      // Switch to same recording again
      wrapper.vm.currentRecording.value = null;
      await wrapper.vm.$nextTick();
      wrapper.vm.currentRecording.value = recording1;
      await wrapper.vm.$nextTick();

      // Should not reprocess same recording
      expect(mockProcessAudio).toHaveBeenCalledTimes(1);
    });

    it('should clean up blob URLs properly for both upload methods', async () => {
      // This test ensures memory management is consistent
      
      // Test single file upload cleanup
      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, 'files', {
        value: [mockAudioFile],
        writable: false,
      });
      await fileInput.trigger('change');
      await wrapper.vm.$nextTick();

      // Simulate recording and alignment
      wrapper.vm.userAudioBlob.value = mockAudioFile;
      await wrapper.vm.handleRecordedAudio(mockAudioFile);

      // Wait for cleanup timeout
      await new Promise(resolve => setTimeout(resolve, 3100));

      // Should have called revokeObjectURL for cleanup
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});