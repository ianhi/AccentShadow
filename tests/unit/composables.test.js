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
            play: vi.fn(),
            pause: vi.fn(),
            isPlaying: vi.fn(() => false),
            on: vi.fn(),
            un: vi.fn()
          },
          isReady: true
        },
        {
          id: 'player2',
          type: 'user',
          wavesurfer: {
            play: vi.fn(),
            pause: vi.fn(),
            isPlaying: vi.fn(() => false),
            on: vi.fn(),
            un: vi.fn()
          },
          isReady: true
        }
      ];

      await playSequential(mockPlayers, [0, 100]);

      // Both players should have been called
      expect(mockPlayers[0].wavesurfer.play).toHaveBeenCalled();
      expect(mockPlayers[1].wavesurfer.play).toHaveBeenCalled();
    });
  });

  describe('useVADProcessor', () => {
    beforeEach(() => {
      // Mock VAD global
      global.window.vad = {
        NonRealTimeVAD: {
          new: vi.fn(() => Promise.resolve({
            run: vi.fn(function* () {
              yield { audio: new Float32Array(1000), start: 1000, end: 8000 };
            })
          }))
        }
      };
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
    });
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
    it('should manage recording sets correctly', async () => {
      const { useRecordingSets } = await import('../../src/composables/useRecordingSets.js');
      const { sets, addSet, deleteSet } = useRecordingSets();

      const initialSetCount = sets.value.length;

      // Add a new set
      const newSet = {
        id: 'test-set',
        name: 'Test Set',
        recordings: [],
        source: 'manual'
      };

      addSet(newSet);
      expect(sets.value.length).toBe(initialSetCount + 1);

      // Delete the set
      deleteSet('test-set');
      expect(sets.value.length).toBe(initialSetCount);
    });

    it('should handle current recording navigation', async () => {
      const { useRecordingSets } = await import('../../src/composables/useRecordingSets.js');
      const { 
        activeSet, 
        currentRecording, 
        nextRecording, 
        previousRecording 
      } = useRecordingSets();

      // Create a test set with multiple recordings
      const testSet = {
        id: 'nav-test',
        name: 'Navigation Test',
        recordings: [
          { id: 'rec1', name: 'Recording 1' },
          { id: 'rec2', name: 'Recording 2' },
          { id: 'rec3', name: 'Recording 3' }
        ],
        currentIndex: 0
      };

      activeSet.value = testSet;
      
      expect(currentRecording.value.id).toBe('rec1');

      nextRecording();
      expect(currentRecording.value.id).toBe('rec2');

      previousRecording();
      expect(currentRecording.value.id).toBe('rec1');
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  it('should handle missing audio context gracefully', async () => {
    // Temporarily remove AudioContext
    const originalAudioContext = global.AudioContext;
    global.AudioContext = undefined;
    global.webkitAudioContext = undefined;

    const { useVADProcessor } = await import('../../src/composables/useVADProcessor.js');
    const { detectSpeechBoundariesVAD } = useVADProcessor();

    const mockBlob = new Blob(['test'], { type: 'audio/webm' });
    const result = await detectSpeechBoundariesVAD(mockBlob);

    // Should fallback gracefully
    expect(result).toBeDefined();

    // Restore
    global.AudioContext = originalAudioContext;
    global.webkitAudioContext = originalAudioContext;
  });

  it('should handle corrupt audio data', async () => {
    // Mock decodeAudioData to reject
    global.AudioContext = vi.fn(() => ({
      decodeAudioData: vi.fn(() => Promise.reject(new Error('Invalid audio data'))),
      close: vi.fn()
    }));

    const { useVADProcessor } = await import('../../src/composables/useVADProcessor.js');
    const { detectSpeechBoundariesVAD } = useVADProcessor();

    const corruptBlob = new Blob(['invalid'], { type: 'audio/webm' });
    const result = await detectSpeechBoundariesVAD(corruptBlob);

    // Should return error state rather than throwing
    expect(result).toBeDefined();
    expect(result.confidenceScore).toBe(0.5); // Fallback
  });

  it('should handle very short audio clips', async () => {
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
  });
});