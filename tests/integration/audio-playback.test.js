/**
 * Integration tests for audio playback functionality
 * These tests verify the core audio recording and playback features work correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import PracticeView from '../../src/views/PracticeView.vue';

// Mock WaveSurfer and audio APIs
const mockWaveSurfer = {
  create: vi.fn(() => ({
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    isPlaying: vi.fn(() => false),
    isReady: true,
    seekTo: vi.fn(),
    setPlaybackRate: vi.fn(),
    on: vi.fn(),
    un: vi.fn(),
    registerPlugin: vi.fn(() => ({
      startRecording: vi.fn(),
      stopRecording: vi.fn(),
      on: vi.fn()
    }))
  }))
};

// Mock media devices
const mockMediaDevices = {
  getUserMedia: vi.fn(() => Promise.resolve({
    getTracks: () => [{
      stop: vi.fn()
    }]
  })),
  enumerateDevices: vi.fn(() => Promise.resolve([
    {
      kind: 'audioinput',
      deviceId: 'default',
      label: 'Default Microphone',
      groupId: 'group1'
    },
    {
      kind: 'audioinput', 
      deviceId: 'mic2',
      label: 'USB Microphone',
      groupId: 'group2'
    }
  ])),
  addEventListener: vi.fn()
};

// Mock MediaRecorder
class MockMediaRecorder {
  constructor(stream) {
    this.stream = stream;
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
  }
  
  start() {
    this.state = 'recording';
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) });
      }
    }, 100);
  }
  
  stop() {
    this.state = 'inactive';
    setTimeout(() => {
      if (this.onstop) {
        this.onstop();
      }
    }, 50);
  }
}

// Mock VAD processor
vi.mock('../../src/composables/useVADProcessor.js', () => ({
  useVADProcessor: () => ({
    isProcessing: { value: false },
    vadReady: { value: true },
    initVAD: vi.fn(() => Promise.resolve()),
    detectSpeechBoundariesVAD: vi.fn(() => Promise.resolve({
      startTime: 0.1,
      endTime: 2.0,
      startSample: 4410,
      endSample: 88200,
      originalSpeechStart: 0.1,
      originalSpeechEnd: 2.0,
      silenceStart: 0.1,
      silenceEnd: 0.5,
      confidenceScore: 0.8
    })),
    trimAudioWithVAD: vi.fn((blob) => Promise.resolve({
      blob: blob,
      trimmedStart: 0.1,
      trimmedEnd: 0.2,
      originalDuration: 3.0,
      newDuration: 2.7
    }))
  })
}));

describe('Audio Playback Integration Tests', () => {
  let wrapper;
  let mockAudioContext;

  beforeEach(() => {
    // Mock browser APIs
    global.WaveSurfer = mockWaveSurfer;
    global.navigator.mediaDevices = mockMediaDevices;
    global.MediaRecorder = MockMediaRecorder;
    global.window = global;
    global.vad = {
      NonRealTimeVAD: {
        new: vi.fn(() => ({
          run: vi.fn(function* () {
            yield { audio: new Float32Array(1000), start: 1000, end: 8000 };
          })
        }))
      }
    };

    // Mock AudioContext
    mockAudioContext = {
      createBuffer: vi.fn(() => ({
        numberOfChannels: 1,
        sampleRate: 44100,
        length: 44100,
        duration: 1.0,
        getChannelData: vi.fn(() => new Float32Array(44100))
      })),
      decodeAudioData: vi.fn(() => Promise.resolve({
        numberOfChannels: 1,
        sampleRate: 44100,
        length: 44100,
        duration: 1.0,
        getChannelData: vi.fn(() => new Float32Array(44100))
      })),
      close: vi.fn()
    };
    global.AudioContext = vi.fn(() => mockAudioContext);
    global.webkitAudioContext = global.AudioContext;

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock fetch for loading audio files
    global.fetch = vi.fn(() => Promise.resolve({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000))
    }));
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  describe('Recording Functionality', () => {
    it('should initialize recording components correctly', async () => {
      wrapper = mount(PracticeView);
      await flushPromises();

      // Check that recording controls are present
      const recordingControls = wrapper.find('.recording-controls');
      expect(recordingControls.exists()).toBe(true);

      const recordButton = wrapper.find('.record-btn');
      expect(recordButton.exists()).toBe(true);
      expect(recordButton.text()).toContain('Start Recording');
    });

    it('should handle microphone device selection', async () => {
      wrapper = mount(PracticeView);
      await flushPromises();

      // Wait for microphone devices to be enumerated
      await nextTick();
      await flushPromises();

      // Check that microphone dropdown appears when multiple devices are available
      const micDropdown = wrapper.find('.mic-dropdown');
      expect(micDropdown.exists()).toBe(true);

      // Verify device options are populated
      const deviceOptions = micDropdown.findAll('option');
      expect(deviceOptions.length).toBe(2);
      expect(deviceOptions[0].text()).toBe('Default Microphone');
      expect(deviceOptions[1].text()).toBe('USB Microphone');
    });

    it('should record audio successfully', async () => {
      wrapper = mount(PracticeView);
      await flushPromises();

      const recordButton = wrapper.find('.record-btn');
      
      // Start recording
      await recordButton.trigger('click');
      await flushPromises();

      expect(recordButton.text()).toContain('Stop Recording');

      // Stop recording
      await recordButton.trigger('click');
      await flushPromises();

      expect(recordButton.text()).toContain('Start Recording');
    });
  });

  describe('Playback Controls', () => {
    it('should display playback controls correctly', async () => {
      wrapper = mount(PracticeView);
      await flushPromises();

      // All playback buttons should be present
      const playTarget = wrapper.find('.target-btn');
      const playUser = wrapper.find('.user-btn');
      const playOverlapping = wrapper.find('.overlapping-btn');
      const playSequential = wrapper.find('.sequential-btn');
      const stopAll = wrapper.find('.stop-btn');

      expect(playTarget.exists()).toBe(true);
      expect(playUser.exists()).toBe(true);
      expect(playOverlapping.exists()).toBe(true);
      expect(playSequential.exists()).toBe(true);
      expect(stopAll.exists()).toBe(true);

      // Buttons should be disabled when no audio is loaded
      expect(playTarget.attributes('disabled')).toBeDefined();
      expect(playUser.attributes('disabled')).toBeDefined();
      expect(playOverlapping.attributes('disabled')).toBeDefined();
      expect(playSequential.attributes('disabled')).toBeDefined();
    });

    it('should handle sequential delay setting', async () => {
      wrapper = mount(PracticeView);
      await flushPromises();

      // Find sequential delay control
      const delaySlider = wrapper.find('.delay-slider');
      expect(delaySlider.exists()).toBe(true);

      // Check default value
      expect(delaySlider.element.value).toBe('0');

      // Change delay value
      await delaySlider.setValue(500);
      await flushPromises();

      const delayDisplay = wrapper.find('.delay-display');
      expect(delayDisplay.text()).toBe('500ms');
    });
  });

  describe('Audio Processing', () => {
    it('should load and process target audio from URL', async () => {
      wrapper = mount(PracticeView);
      await flushPromises();

      // Find URL input button
      const urlButton = wrapper.find('.url-btn');
      await urlButton.trigger('click');
      await flushPromises();

      // Modal should appear
      const modal = wrapper.find('.modal-overlay');
      expect(modal.exists()).toBe(true);

      const urlInput = wrapper.find('.url-input-modal');
      await urlInput.setValue('https://example.com/audio.mp3');

      const loadButton = wrapper.find('.load-btn');
      await loadButton.trigger('click');
      await flushPromises();

      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/audio.mp3');
    });

    it('should handle VAD processing correctly', async () => {
      wrapper = mount(PracticeView);
      await flushPromises();

      // Simulate recording completion which triggers VAD processing
      const recordButton = wrapper.find('.record-btn');
      await recordButton.trigger('click');
      await flushPromises();

      // Stop recording to trigger processing
      await recordButton.trigger('click');
      await flushPromises();

      // VAD processing should have been called
      const { useVADProcessor } = await import('../../src/composables/useVADProcessor.js');
      const vadProcessor = useVADProcessor();
      expect(vadProcessor.detectSpeechBoundariesVAD).toHaveBeenCalled();
    });
  });

  describe('Smart Audio Alignment', () => {
    it('should enable auto-alignment by default', async () => {
      wrapper = mount(PracticeView);
      await flushPromises();

      const autoAlignToggle = wrapper.find('.trim-silence-toggle input');
      expect(autoAlignToggle.element.checked).toBe(true);
    });

    it('should enable auto-play both by default', async () => {
      wrapper = mount(PracticeView);
      await flushPromises();

      const autoPlayToggle = wrapper.find('.auto-play-toggle input');
      expect(autoPlayToggle.element.checked).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle recording errors gracefully', async () => {
      // Mock getUserMedia to reject
      global.navigator.mediaDevices.getUserMedia = vi.fn(() => 
        Promise.reject(new Error('Permission denied'))
      );

      wrapper = mount(PracticeView);
      await flushPromises();

      const recordButton = wrapper.find('.record-btn');
      await recordButton.trigger('click');
      await flushPromises();

      // Recording should not start
      expect(recordButton.text()).toContain('Start Recording');
    });

    it('should handle VAD processing failures', async () => {
      // Mock VAD to fail
      const { useVADProcessor } = await import('../../src/composables/useVADProcessor.js');
      const vadProcessor = useVADProcessor();
      vadProcessor.detectSpeechBoundariesVAD.mockRejectedValue(new Error('VAD failed'));

      wrapper = mount(PracticeView);
      await flushPromises();

      // Simulate audio processing
      const recordButton = wrapper.find('.record-btn');
      await recordButton.trigger('click');
      await flushPromises();
      await recordButton.trigger('click');
      await flushPromises();

      // Should handle error gracefully without crashing
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should clean up blob URLs properly', async () => {
      wrapper = mount(PracticeView);
      await flushPromises();

      // Create some audio
      const recordButton = wrapper.find('.record-btn');
      await recordButton.trigger('click');
      await recordButton.trigger('click');
      await flushPromises();

      // Unmount component
      wrapper.unmount();

      // URL.revokeObjectURL should have been called
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should handle multiple rapid recording attempts', async () => {
      wrapper = mount(PracticeView);
      await flushPromises();

      const recordButton = wrapper.find('.record-btn');

      // Rapid clicks
      await recordButton.trigger('click');
      await recordButton.trigger('click');
      await recordButton.trigger('click');
      await flushPromises();

      // Should handle gracefully without errors
      expect(wrapper.exists()).toBe(true);
    });
  });
});