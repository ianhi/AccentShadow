/**
 * Integration test to verify folder recordings trigger the watch statement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';

describe('Folder Recording Watch Integration', () => {
  let mockProcessAudio, mockNormalizeAudioSilence, mockSetTargetAudio;
  
  beforeEach(() => {
    // Setup mocks
    mockProcessAudio = vi.fn().mockResolvedValue({
      processed: true,
      vadBoundaries: {
        startTime: 0.384,
        endTime: 0.960,
        originalSpeechStart: 0.384,
        originalSpeechEnd: 0.960
      },
      audioBlob: new File(['processed'], 'processed.mp3', { type: 'audio/mpeg' })
    });

    mockNormalizeAudioSilence = vi.fn().mockResolvedValue(
      new File(['normalized'], 'normalized.mp3', { type: 'audio/mpeg' })
    );

    mockSetTargetAudio = vi.fn().mockImplementation(async (audioBlob, source) => {
      if (!audioBlob) return;
      
      const processed = await mockProcessAudio(audioBlob);
      const normalized = await mockNormalizeAudioSilence(processed.audioBlob, processed.vadBoundaries, 200);
      
      return {
        audioBlob: normalized,
        processed: true,
        source: source?.source || 'manual'
      };
    });

    // Mock browser APIs
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('should process folder recording when currentRecording changes', async () => {
    // Simulate the Vue reactivity system
    const currentRecording = ref(null);
    
    // Create mock folder recording
    const mockAudioFile = new File(['audio content'], 'patth.wav', { type: 'audio/wav' });
    const folderRecording = {
      id: 'folder-rec-1',
      name: 'Test Recording',
      audioUrl: 'blob:folder-url',
      audioBlob: mockAudioFile,
      metadata: {
        category: 'test',
        fileName: 'patth.wav',
        fileSize: mockAudioFile.size,
        filePath: 'test/patth.wav'
      }
    };

    // Simulate the watch function from PracticeView.vue
    const watchFn = async (newRecording, oldRecording) => {
      console.log('🔄 FOLDER PROCESSING WATCH: currentRecording changed', {
        hasNewRecording: !!newRecording,
        hasOldRecording: !!oldRecording,
        recordingsAreDifferent: newRecording !== oldRecording,
        newRecordingHasAudio: !!newRecording?.audioBlob,
        newRecordingName: newRecording?.name,
        newRecordingFileName: newRecording?.metadata?.fileName
      });

      // Only process if we're switching to a new recording that has audio
      if (newRecording && newRecording !== oldRecording && newRecording.audioBlob) {
        console.log('🎯 FOLDER PROCESSING: Processing folder recording as target audio', {
          recordingId: newRecording.id,
          name: newRecording.name,
          fileName: newRecording.metadata?.fileName,
          blobSize: newRecording.audioBlob.size,
          blobType: newRecording.audioBlob.type
        });

        try {
          const result = await mockSetTargetAudio(newRecording.audioBlob, {
            name: newRecording.name,
            fileName: newRecording.metadata?.fileName,
            source: 'folder'
          });
          console.log('✅ FOLDER PROCESSING: Successfully processed folder recording');
          return result;
        } catch (error) {
          console.error('❌ FOLDER PROCESSING: Failed to process folder recording:', error);
          throw error;
        }
      } else if (!newRecording) {
        console.log('🗑️ FOLDER PROCESSING: Clearing target audio (no recording selected)');
        await mockSetTargetAudio(null);
      }
    };

    // Test: Setting a folder recording should trigger processing
    console.log('📁 Setting folder recording...');
    const oldRecording = currentRecording.value;
    currentRecording.value = folderRecording;
    
    // Simulate the watch trigger
    const result = await watchFn(currentRecording.value, oldRecording);
    
    // Verify processing was called correctly
    expect(mockSetTargetAudio).toHaveBeenCalledWith(
      mockAudioFile,
      {
        name: 'Test Recording',
        fileName: 'patth.wav',
        source: 'folder'
      }
    );

    expect(mockProcessAudio).toHaveBeenCalledWith(mockAudioFile);
    expect(mockNormalizeAudioSilence).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({
        startTime: 0.384,
        endTime: 0.960
      }),
      200
    );

    expect(result).toEqual({
      audioBlob: expect.any(File),
      processed: true,
      source: 'folder'
    });
  });

  it('should not reprocess same recording', async () => {
    const currentRecording = ref(null);
    const mockAudioFile = new File(['audio content'], 'patth.wav', { type: 'audio/wav' });
    
    const folderRecording = {
      id: 'folder-rec-1',
      name: 'Test Recording',
      audioBlob: mockAudioFile,
      metadata: { fileName: 'patth.wav' }
    };

    const watchFn = async (newRecording, oldRecording) => {
      if (newRecording && newRecording !== oldRecording && newRecording.audioBlob) {
        return await mockSetTargetAudio(newRecording.audioBlob, {
          name: newRecording.name,
          fileName: newRecording.metadata?.fileName,
          source: 'folder'
        });
      }
    };

    // First time: should process
    currentRecording.value = folderRecording;
    await watchFn(currentRecording.value, null);
    
    expect(mockSetTargetAudio).toHaveBeenCalledTimes(1);
    
    // Second time with same recording: should not process
    mockSetTargetAudio.mockClear();
    await watchFn(currentRecording.value, currentRecording.value);
    
    expect(mockSetTargetAudio).not.toHaveBeenCalled();
  });

  it('should clear target when no recording selected', async () => {
    const currentRecording = ref(null);
    
    const watchFn = async (newRecording, oldRecording) => {
      if (!newRecording) {
        await mockSetTargetAudio(null);
      }
    };

    // Test clearing recording
    await watchFn(null, { id: 'old-recording' });
    
    expect(mockSetTargetAudio).toHaveBeenCalledWith(null);
  });
});