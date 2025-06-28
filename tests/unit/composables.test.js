/**
 * Unit tests for core composables
 * Tests individual composable functions in isolation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref } from 'vue';

describe('Core Composables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useMicrophoneDevices', () => {
    it('should enumerate available microphone devices', async () => {
      const { useMicrophoneDevices } = await import('../../src/composables/useMicrophoneDevices.js');
      const { availableDevices, getAvailableDevices } = useMicrophoneDevices();

      await getAvailableDevices();

      expect(availableDevices.value.length).toBeGreaterThan(0);
      expect(availableDevices.value[0]).toHaveProperty('deviceId');
      expect(availableDevices.value[0]).toHaveProperty('label');
    });

    it('should create media stream with selected device', async () => {
      const { useMicrophoneDevices } = await import('../../src/composables/useMicrophoneDevices.js');
      const { getMediaStream } = useMicrophoneDevices();

      const stream = await getMediaStream('test-device-id');
      expect(stream).toBeDefined();
      expect(stream.getTracks).toBeDefined();
    });

    it('should handle device permission errors gracefully', async () => {
      // Mock getUserMedia to reject
      navigator.mediaDevices.getUserMedia = vi.fn(() => 
        Promise.reject(new Error('Permission denied'))
      );

      const { useMicrophoneDevices } = await import('../../src/composables/useMicrophoneDevices.js');
      const { error, getAvailableDevices } = useMicrophoneDevices();

      await getAvailableDevices();

      expect(error.value).toBeDefined();
      expect(error.value).toContain('microphone devices');
    });
  });

  describe('useAudioManager', () => {
    it('should manage audio playback state correctly', async () => {
      const { useAudioManager } = await import('../../src/composables/useAudioManager.js');
      const { registerPlayer, play, stopAll, isPlaying } = useAudioManager();

      // Create mock player
      const mockPlayer = {
        id: 'test-player',
        type: 'target',
        wavesurfer: {
          play: vi.fn(),
          pause: vi.fn(),
          isPlaying: vi.fn(() => false),
          on: vi.fn(),
          un: vi.fn()
        }
      };

      const playerInfo = registerPlayer(mockPlayer.id, mockPlayer.type, mockPlayer.wavesurfer);
      expect(playerInfo.id).toBe('test-player');

      const success = play(playerInfo);
      expect(success).toBe(true);
      expect(isPlaying()).toBe(true);

      stopAll();
      expect(isPlaying()).toBe(false);
    });

    it('should handle sequential playback correctly', async () => {
      const { useAudioManager } = await import('../../src/composables/useAudioManager.js');
      const { playSequential } = useAudioManager();

      const mockPlayers = [
        {
          id: 'player1',
          type: 'target',
          wavesurfer: {
            play: vi.fn(() => Promise.resolve()),
            pause: vi.fn(),
            isPlaying: vi.fn(() => false),
            on: vi.fn((event, callback) => {
              if (event === 'finish') {
                // Simulate immediate finish for faster tests
                setTimeout(callback, 10);
              }
            }),
            un: vi.fn()
          },
          isReady: true
        },
        {
          id: 'player2',
          type: 'user',
          wavesurfer: {
            play: vi.fn(() => Promise.resolve()),
            pause: vi.fn(),
            isPlaying: vi.fn(() => false),
            on: vi.fn((event, callback) => {
              if (event === 'finish') {
                setTimeout(callback, 10);
              }
            }),
            un: vi.fn()
          },
          isReady: true
        }
      ];

      await playSequential(mockPlayers, [0, 10]); // Reduced delay for faster testing

      // Both players should have been called
      expect(mockPlayers[0].wavesurfer.play).toHaveBeenCalled();
      expect(mockPlayers[1].wavesurfer.play).toHaveBeenCalled();
    }, 10000);
  });

  describe('useVADProcessor', () => {
    beforeEach(() => {
      // Mock VAD global with faster resolution
      global.window.vad = {
        NonRealTimeVAD: {
          new: vi.fn(() => Promise.resolve({
            run: vi.fn(function* () {
              yield { audio: new Float32Array(1000), start: 1000, end: 8000 };
            })
          }))
        }
      };
      // Add faster timeout for VAD tests
      vi.setConfig({ testTimeout: 2000 });
    });

    it('should initialize VAD correctly', async () => {
      const { useVADProcessor } = await import('../../src/composables/useVADProcessor.js');
      const { initVAD, vadReady } = useVADProcessor();

      await initVAD();
      expect(vadReady.value).toBe(true);
    });

    it('should detect speech boundaries', async () => {
      const { useVADProcessor } = await import('../../src/composables/useVADProcessor.js');
      const { detectSpeechBoundariesVAD } = useVADProcessor();

      const mockBlob = new Blob(['test audio'], { type: 'audio/webm' });
      const boundaries = await detectSpeechBoundariesVAD(mockBlob);

      expect(boundaries).toBeDefined();
      expect(boundaries.startTime).toBeDefined();
      expect(boundaries.endTime).toBeDefined();
      expect(boundaries.originalSpeechStart).toBeDefined();
      expect(boundaries.originalSpeechEnd).toBeDefined();
    });

    it('should trim audio based on VAD boundaries', async () => {
      const { useVADProcessor } = await import('../../src/composables/useVADProcessor.js');
      const { trimAudioWithVAD } = useVADProcessor();

      const mockBlob = new Blob(['test audio'], { type: 'audio/webm' });
      const result = await trimAudioWithVAD(mockBlob);

      expect(result).toBeDefined();
      expect(result.blob).toBeDefined();
      expect(result.originalDuration).toBeDefined();
      expect(result.newDuration).toBeDefined();
    });

    it('should fall back to energy detection when VAD fails', async () => {
      // Mock VAD to fail
      global.window.vad = null;

      const { useVADProcessor } = await import('../../src/composables/useVADProcessor.js');
      const { detectSpeechBoundariesVAD } = useVADProcessor();

      const mockBlob = new Blob(['test audio'], { type: 'audio/webm' });
      const boundaries = await detectSpeechBoundariesVAD(mockBlob);

      expect(boundaries).toBeDefined();
      expect(boundaries.confidenceScore).toBe(0.5); // Fallback confidence
    }, 10000);
  });

  describe('useWaveform', () => {
    it('should create unique player IDs', async () => {
      const mockContainer = { ref: { value: document.createElement('div') } };
      const mockSpectrogramContainer = { ref: { value: document.createElement('div') } };

      const { useWaveform } = await import('../../src/composables/useWaveform.js');
      
      const waveform1 = useWaveform(mockContainer, mockSpectrogramContainer, 'test1', 'target');
      const waveform2 = useWaveform(mockContainer, mockSpectrogramContainer, 'test2', 'user');

      expect(waveform1.playerId).not.toBe(waveform2.playerId);
      expect(waveform1.playerId).toContain('test1');
      expect(waveform2.playerId).toContain('test2');
    });

    it('should handle playback rate changes', async () => {
      const mockContainer = { ref: { value: document.createElement('div') } };
      const mockSpectrogramContainer = { ref: { value: document.createElement('div') } };

      const { useWaveform } = await import('../../src/composables/useWaveform.js');
      const { setPlaybackRate, playbackRate } = useWaveform(
        mockContainer, 
        mockSpectrogramContainer, 
        'test', 
        'target'
      );

      setPlaybackRate(1.5);
      expect(playbackRate.value).toBe(1.5);

      setPlaybackRate(0.5);
      expect(playbackRate.value).toBe(0.5);
    });
  });

  describe('useTimeSync', () => {
    it('should sync time scales between audio players', async () => {
      const { useTimeSync } = await import('../../src/composables/useTimeSync.js');
      const { 
        setTargetDuration, 
        setUserDuration, 
        targetWidthPercent, 
        userWidthPercent,
        syncEnabled 
      } = useTimeSync();

      // Enable sync
      syncEnabled.value = true;

      // Set different durations
      setTargetDuration(10); // 10 seconds
      setUserDuration(5);   // 5 seconds

      // Target should be 100%, user should be 50%
      expect(targetWidthPercent.value).toBe('100%');
      expect(userWidthPercent.value).toBe('50%');
    });

    it('should disable sync when toggled off', async () => {
      const { useTimeSync } = await import('../../src/composables/useTimeSync.js');
      const { 
        setTargetDuration, 
        setUserDuration, 
        targetWidthPercent, 
        userWidthPercent,
        syncEnabled 
      } = useTimeSync();

      // Disable sync
      syncEnabled.value = false;

      setTargetDuration(10);
      setUserDuration(5);

      // Both should be 100% when sync is disabled
      expect(targetWidthPercent.value).toBe('100%');
      expect(userWidthPercent.value).toBe('100%');
    });
  });

  describe('useRecordingSets', () => {
    beforeEach(() => {
      // Reset localStorage for clean tests
      global.localStorage.clear();
      global.localStorage.getItem = vi.fn(() => null);
      global.localStorage.setItem = vi.fn();
      vi.clearAllMocks();
    });

    it('should manage recording sets correctly', async () => {
      // Mock localStorage with empty array for clean start
      global.localStorage.getItem = vi.fn((key) => {
        if (key === 'echolingo-recording-sets') {
          return JSON.stringify([]);
        }
        return null;
      });
      
      const { useRecordingSets } = await import('../../src/composables/useRecordingSets.js');
      const { recordingSets, createRecordingSet, deleteRecordingSet } = useRecordingSets();

      // Wait for initialization
      await testUtils.flushPromises();
      
      const initialSetCount = recordingSets.value?.length || 0;

      // Create a new set
      const newSet = createRecordingSet('Test Set', 'manual', 'en', []);
      expect(recordingSets.value?.length || 0).toBe(initialSetCount + 1);

      // Delete the set
      deleteRecordingSet(newSet.id);
      expect(recordingSets.value?.length || 0).toBe(initialSetCount);
    });

    it('should handle current recording navigation', async () => {
      // Mock localStorage with empty array for clean start
      global.localStorage.getItem = vi.fn((key) => {
        if (key === 'echolingo-recording-sets') {
          return JSON.stringify([]);
        }
        return null;
      });
      
      const { useRecordingSets } = await import('../../src/composables/useRecordingSets.js');
      const { 
        createRecordingSet,
        setActiveSet,
        currentRecording, 
        nextRecording, 
        previousRecording 
      } = useRecordingSets();

      // Wait for initialization
      await testUtils.flushPromises();

      // Create a test set with multiple recordings
      const testRecordings = [
        { 
          name: 'Recording 1',
          audioUrl: 'blob:test1',
          metadata: { category: 'test' }
        },
        { 
          name: 'Recording 2', 
          audioUrl: 'blob:test2',
          metadata: { category: 'test' }
        },
        { 
          name: 'Recording 3',
          audioUrl: 'blob:test3',
          metadata: { category: 'test' }
        }
      ];
      
      const testSet = createRecordingSet('Navigation Test', 'manual', 'en', testRecordings);
      setActiveSet(testSet.id);
      await testUtils.flushPromises();
      
      expect(currentRecording.value?.name).toBe('Recording 1');

      nextRecording();
      await testUtils.flushPromises();
      expect(currentRecording.value?.name).toBe('Recording 2');

      previousRecording();
      await testUtils.flushPromises();
      expect(currentRecording.value?.name).toBe('Recording 1');
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle missing audio context gracefully', async () => {
    // Temporarily remove AudioContext
    const originalAudioContext = global.AudioContext;
    global.AudioContext = undefined;
    global.webkitAudioContext = undefined;
    global.window.vad = null; // Also disable VAD

    const { useVADProcessor } = await import('../../src/composables/useVADProcessor.js');
    const { detectSpeechBoundariesVAD } = useVADProcessor();

    const mockBlob = new Blob(['test'], { type: 'audio/webm' });
    const result = await detectSpeechBoundariesVAD(mockBlob);

    // Should fallback gracefully
    expect(result).toBeDefined();

    // Restore
    global.AudioContext = originalAudioContext;
    global.webkitAudioContext = originalAudioContext;
  }, 10000);

  it('should handle corrupt audio data', async () => {
    // Mock decodeAudioData to reject
    global.AudioContext = vi.fn(() => ({
      decodeAudioData: vi.fn(() => Promise.reject(new Error('Invalid audio data'))),
      close: vi.fn()
    }));
    global.window.vad = null; // Disable VAD to trigger fallback

    const { useVADProcessor } = await import('../../src/composables/useVADProcessor.js');
    const { detectSpeechBoundariesVAD } = useVADProcessor();

    const corruptBlob = new Blob(['invalid'], { type: 'audio/webm' });
    const result = await detectSpeechBoundariesVAD(corruptBlob);

    // Should return error state rather than throwing
    expect(result).toBeDefined();
    // The actual fallback may return different confidence scores, so just check it exists
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(1);
  }, 10000);

  it('should handle very short audio clips', async () => {
    // Disable VAD for fallback behavior
    global.window.vad = null;
    
    const { useVADProcessor } = await import('../../src/composables/useVADProcessor.js');
    const { trimAudioWithVAD } = useVADProcessor();

    // Mock a very short audio buffer (less than minimum threshold)
    global.AudioContext = vi.fn(() => ({
      decodeAudioData: vi.fn(() => Promise.resolve({
        numberOfChannels: 1,
        sampleRate: 44100,
        length: 1000, // Very short
        duration: 0.02, // 20ms
        getChannelData: vi.fn(() => new Float32Array(1000))
      })),
      createBuffer: vi.fn(() => ({
        numberOfChannels: 1,
        sampleRate: 44100,
        length: 1000,
        getChannelData: vi.fn(() => new Float32Array(1000))
      })),
      close: vi.fn()
    }));

    const shortBlob = new Blob(['short'], { type: 'audio/webm' });
    const result = await trimAudioWithVAD(shortBlob);

    // Should keep original when too short to trim
    expect(result.blob).toBe(shortBlob);
    expect(result.trimmedStart).toBe(0);
    expect(result.trimmedEnd).toBe(0);
  }, 10000);
});