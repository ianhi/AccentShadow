<template>
  <div class="test-page">
    <h1>Audio Visualization Debug Tests</h1>
    <p>Using: <code>public/patth.wav</code></p>
    
    <!-- Test 1: Basic WaveSurfer Only -->
    <div class="test-section">
      <h2>Test 1: Basic WaveSurfer (No Spectrogram)</h2>
      <button @click="test1()" :disabled="test1Loading">
        {{ test1Loading ? 'Loading...' : 'Load Basic Waveform' }}
      </button>
      <div ref="test1Container" class="test-container"></div>
      <div class="status">Status: {{ test1Status }}</div>
    </div>

    <!-- Test 2: Spectrogram Only -->
    <div class="test-section">
      <h2>Test 2: Spectrogram Only</h2>
      <button @click="test2()" :disabled="test2Loading">
        {{ test2Loading ? 'Loading...' : 'Load Spectrogram Only' }}
      </button>
      <div class="test-container-wrapper">
        <div ref="test2Container" class="test-container transparent"></div>
        <div ref="test2Spectrogram" class="spectrogram-container"></div>
      </div>
      <div class="status">Status: {{ test2Status }}</div>
    </div>

    <!-- Test 3: Overlay Approach -->
    <div class="test-section">
      <h2>Test 3: Waveform + Spectrogram Overlay</h2>
      <button @click="test3()" :disabled="test3Loading">
        {{ test3Loading ? 'Loading...' : 'Load Overlay' }}
      </button>
      <div class="test-container-wrapper">
        <div ref="test3Container" class="test-container overlay"></div>
        <div ref="test3Spectrogram" class="spectrogram-container"></div>
      </div>
      <div class="status">Status: {{ test3Status }}</div>
    </div>

    <!-- Test 4: Different Spectrogram Config -->
    <div class="test-section">
      <h2>Test 4: Alternative Spectrogram Config</h2>
      <button @click="test4()" :disabled="test4Loading">
        {{ test4Loading ? 'Loading...' : 'Load Alternative Config' }}
      </button>
      <div class="test-container-wrapper">
        <div ref="test4Container" class="test-container overlay"></div>
        <div ref="test4Spectrogram" class="spectrogram-container"></div>
      </div>
      <div class="status">Status: {{ test4Status }}</div>
    </div>

    <!-- Test 5: Simple Positioned Overlay -->
    <div class="test-section">
      <h2>Test 5: Simple Positioned Overlay (Debug)</h2>
      <button @click="test5()" :disabled="test5Loading">
        {{ test5Loading ? 'Loading...' : 'Load Simple Overlay' }}
      </button>
      <div class="test-container-wrapper">
        <!-- Spectrogram background -->
        <div ref="test5Spectrogram" class="spectrogram-container"></div>
        <!-- Waveform overlay with visible border -->
        <div ref="test5Container" class="test-container simple-overlay"></div>
      </div>
      <div class="status">Status: {{ test5Status }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import WaveSurfer from 'wavesurfer.js';
import Spectrogram from 'wavesurfer.js/dist/plugins/spectrogram.esm.js';

// Test 1: Basic WaveSurfer
const test1Container = ref(null);
const test1Loading = ref(false);
const test1Status = ref('Not started');
let test1WaveSurfer = null;

// Test 2: Spectrogram Only
const test2Container = ref(null);
const test2Spectrogram = ref(null);
const test2Loading = ref(false);
const test2Status = ref('Not started');
let test2WaveSurfer = null;

// Test 3: Overlay
const test3Container = ref(null);
const test3Spectrogram = ref(null);
const test3Loading = ref(false);
const test3Status = ref('Not started');
let test3WaveSurfer = null;

// Test 4: Alternative config
const test4Container = ref(null);
const test4Spectrogram = ref(null);
const test4Loading = ref(false);
const test4Status = ref('Not started');
let test4WaveSurfer = null;

// Test 5: Simple positioned overlay
const test5Container = ref(null);
const test5Spectrogram = ref(null);
const test5Loading = ref(false);
const test5Status = ref('Not started');
let test5WaveSurfer = null;

const AUDIO_URL = '/patth.wav';

const test1 = async () => {
  test1Loading.value = true;
  test1Status.value = 'Creating basic WaveSurfer...';
  
  try {
    console.log('🔧 Test 1: Creating basic WaveSurfer');
    
    if (test1WaveSurfer) {
      test1WaveSurfer.destroy();
    }
    
    test1WaveSurfer = WaveSurfer.create({
      container: test1Container.value,
      waveColor: '#60a5fa',
      progressColor: '#3b82f6',
      height: 80,
      normalize: true,
      backend: 'WebAudio'
    });
    
    test1Status.value = 'Loading audio...';
    console.log('🔧 Test 1: Loading audio', AUDIO_URL);
    
    test1WaveSurfer.on('ready', () => {
      test1Status.value = `✅ Success! Duration: ${test1WaveSurfer.getDuration()}s`;
      console.log('🔧 Test 1: Ready!', test1WaveSurfer.getDuration());
    });
    
    test1WaveSurfer.on('error', (error) => {
      test1Status.value = `❌ Error: ${error.message}`;
      console.error('🔧 Test 1: Error', error);
    });
    
    await test1WaveSurfer.load(AUDIO_URL);
    
  } catch (error) {
    test1Status.value = `❌ Exception: ${error.message}`;
    console.error('🔧 Test 1: Exception', error);
  } finally {
    test1Loading.value = false;
  }
};

const test2 = async () => {
  test2Loading.value = true;
  test2Status.value = 'Creating WaveSurfer with spectrogram only...';
  
  try {
    console.log('🔧 Test 2: Creating WaveSurfer with spectrogram');
    
    if (test2WaveSurfer) {
      test2WaveSurfer.destroy();
    }
    
    test2WaveSurfer = WaveSurfer.create({
      container: test2Container.value,
      waveColor: 'transparent', // Hide waveform
      progressColor: 'transparent',
      height: 80,
      normalize: true,
      backend: 'WebAudio'
    });
    
    // Register spectrogram plugin
    const spectrogramPlugin = test2WaveSurfer.registerPlugin(
      Spectrogram.create({
        container: test2Spectrogram.value,
        labels: true,
        height: 200,
        fftSamples: 512,
        windowFunc: 'hann',
      })
    );
    
    test2Status.value = 'Loading audio...';
    console.log('🔧 Test 2: Loading audio', AUDIO_URL);
    
    test2WaveSurfer.on('ready', () => {
      test2Status.value = `✅ Success! Duration: ${test2WaveSurfer.getDuration()}s`;
      console.log('🔧 Test 2: Ready!', test2WaveSurfer.getDuration());
    });
    
    test2WaveSurfer.on('error', (error) => {
      test2Status.value = `❌ Error: ${error.message}`;
      console.error('🔧 Test 2: Error', error);
    });
    
    await test2WaveSurfer.load(AUDIO_URL);
    
  } catch (error) {
    test2Status.value = `❌ Exception: ${error.message}`;
    console.error('🔧 Test 2: Exception', error);
  } finally {
    test2Loading.value = false;
  }
};

const test3 = async () => {
  test3Loading.value = true;
  test3Status.value = 'Creating overlay visualization...';
  
  try {
    console.log('🔧 Test 3: Creating overlay visualization');
    
    if (test3WaveSurfer) {
      test3WaveSurfer.destroy();
    }
    
    test3WaveSurfer = WaveSurfer.create({
      container: test3Container.value,
      waveColor: 'rgba(96, 165, 250, 0.8)',
      progressColor: 'rgba(59, 130, 246, 0.9)',
      height: 56, // Match smaller container height (60px - 4px border)
      normalize: true,
      backend: 'WebAudio'
    });
    
    // Register spectrogram plugin
    const spectrogramPlugin = test3WaveSurfer.registerPlugin(
      Spectrogram.create({
        container: test3Spectrogram.value,
        labels: true,
        height: 200,
        fftSamples: 512,
        windowFunc: 'hann',
      })
    );
    
    test3Status.value = 'Loading audio...';
    console.log('🔧 Test 3: Loading audio', AUDIO_URL);
    
    test3WaveSurfer.on('ready', () => {
      test3Status.value = `✅ Success! Duration: ${test3WaveSurfer.getDuration()}s`;
      console.log('🔧 Test 3: Ready!', test3WaveSurfer.getDuration());
      
      // Debug overlay positioning
      console.log('🔧 Test 3: Container dimensions:', {
        waveform: {
          width: test3Container.value.offsetWidth,
          height: test3Container.value.offsetHeight,
          position: getComputedStyle(test3Container.value).position,
          zIndex: getComputedStyle(test3Container.value).zIndex
        },
        spectrogram: {
          width: test3Spectrogram.value.offsetWidth,
          height: test3Spectrogram.value.offsetHeight,
          position: getComputedStyle(test3Spectrogram.value).position,
          zIndex: getComputedStyle(test3Spectrogram.value).zIndex
        }
      });
      
      // Check if waveform elements exist
      const waveformElements = test3Container.value.children;
      console.log('🔧 Test 3: Waveform container children:', waveformElements.length, Array.from(waveformElements));
    });
    
    test3WaveSurfer.on('error', (error) => {
      test3Status.value = `❌ Error: ${error.message}`;
      console.error('🔧 Test 3: Error', error);
    });
    
    await test3WaveSurfer.load(AUDIO_URL);
    
  } catch (error) {
    test3Status.value = `❌ Exception: ${error.message}`;
    console.error('🔧 Test 3: Exception', error);
  } finally {
    test3Loading.value = false;
  }
};

const test4 = async () => {
  test4Loading.value = true;
  test4Status.value = 'Creating alternative config...';
  
  try {
    console.log('🔧 Test 4: Creating alternative spectrogram config');
    
    if (test4WaveSurfer) {
      test4WaveSurfer.destroy();
    }
    
    test4WaveSurfer = WaveSurfer.create({
      container: test4Container.value,
      waveColor: 'rgba(96, 165, 250, 0.8)',
      progressColor: 'rgba(59, 130, 246, 0.9)',
      height: 56, // Match smaller container height
      normalize: true,
      backend: 'WebAudio',
      fillParent: true
    });
    
    // Try different spectrogram config
    const spectrogramPlugin = test4WaveSurfer.registerPlugin(
      Spectrogram.create({
        container: test4Spectrogram.value,
        labels: false, // Try without labels
        splitChannels: false, // Explicitly set this
        height: 200,
        fftSamples: 256, // Try smaller FFT
        windowFunc: 'hann',
      })
    );
    
    test4Status.value = 'Loading audio...';
    console.log('🔧 Test 4: Loading audio', AUDIO_URL);
    
    test4WaveSurfer.on('ready', () => {
      test4Status.value = `✅ Success! Duration: ${test4WaveSurfer.getDuration()}s`;
      console.log('🔧 Test 4: Ready!', test4WaveSurfer.getDuration());
    });
    
    test4WaveSurfer.on('error', (error) => {
      test4Status.value = `❌ Error: ${error.message}`;
      console.error('🔧 Test 4: Error', error);
    });
    
    await test4WaveSurfer.load(AUDIO_URL);
    
  } catch (error) {
    test4Status.value = `❌ Exception: ${error.message}`;
    console.error('🔧 Test 4: Exception', error);
  } finally {
    test4Loading.value = false;
  }
};

const test5 = async () => {
  test5Loading.value = true;
  test5Status.value = 'Creating simple positioned overlay...';
  
  try {
    console.log('🔧 Test 5: Creating simple positioned overlay');
    
    if (test5WaveSurfer) {
      test5WaveSurfer.destroy();
    }
    
    // Create spectrogram first
    test5WaveSurfer = WaveSurfer.create({
      container: test5Spectrogram.value, // Put everything in spectrogram container first
      waveColor: 'transparent',
      progressColor: 'transparent',
      height: 200,
      normalize: true,
      backend: 'WebAudio'
    });
    
    // Register spectrogram plugin
    const spectrogramPlugin = test5WaveSurfer.registerPlugin(
      Spectrogram.create({
        container: test5Spectrogram.value,
        labels: true,
        height: 200,
        fftSamples: 256,
        windowFunc: 'hann',
      })
    );
    
    test5Status.value = 'Loading audio...';
    console.log('🔧 Test 5: Loading audio', AUDIO_URL);
    
    test5WaveSurfer.on('ready', () => {
      console.log('🔧 Test 5: Spectrogram ready, creating overlay waveform');
      
      // Now create a separate WaveSurfer for just the waveform overlay
      const overlayWaveform = WaveSurfer.create({
        container: test5Container.value,
        waveColor: 'rgba(96, 165, 250, 0.8)',
        progressColor: 'rgba(59, 130, 246, 0.9)',
        height: 56, // Match container height
        normalize: true,
        backend: 'WebAudio'
      });
      
      overlayWaveform.load(AUDIO_URL);
      
      test5Status.value = `✅ Success! Duration: ${test5WaveSurfer.getDuration()}s (Dual WaveSurfer)`;
      console.log('🔧 Test 5: Both ready!');
    });
    
    test5WaveSurfer.on('error', (error) => {
      test5Status.value = `❌ Error: ${error.message}`;
      console.error('🔧 Test 5: Error', error);
    });
    
    await test5WaveSurfer.load(AUDIO_URL);
    
  } catch (error) {
    test5Status.value = `❌ Exception: ${error.message}`;
    console.error('🔧 Test 5: Exception', error);
  } finally {
    test5Loading.value = false;
  }
};

onUnmounted(() => {
  if (test1WaveSurfer) test1WaveSurfer.destroy();
  if (test2WaveSurfer) test2WaveSurfer.destroy();
  if (test3WaveSurfer) test3WaveSurfer.destroy();
  if (test4WaveSurfer) test4WaveSurfer.destroy();
  if (test5WaveSurfer) test5WaveSurfer.destroy();
});
</script>

<style scoped>
.test-page {
  padding: 20px;
  padding-bottom: 100px; /* Extra bottom padding */
  max-width: 1000px;
  margin: 0 auto;
  background-color: #1a1a1a;
  color: #f3f4f6;
  min-height: 100vh; /* Ensure full viewport height */
  overflow-y: auto; /* Enable vertical scrolling */
}

.test-section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #444;
  border-radius: 8px;
  background-color: #2a2a2a;
}

.test-section h2 {
  margin-top: 0;
  color: #60a5fa;
}

.test-container-wrapper {
  position: relative;
  width: 100%;
  height: 260px; /* Increased height to accommodate waveform above spectrogram */
  background-color: #1a1a1a;
  border: 1px solid #555;
  border-radius: 4px;
  margin: 10px 0;
}

.test-container {
  width: 100%;
  height: 80px;
  background-color: #1a1a1a;
  border: 1px solid #555;
  border-radius: 4px;
  margin: 10px 0;
}

.test-container.transparent {
  background-color: transparent;
}

.test-container.overlay {
  position: absolute;
  top: 0; /* Position at very top */
  left: 0;
  height: 60px; /* Waveform height */
  background-color: rgba(0, 0, 0, 0.2); /* Semi-transparent background */
  z-index: 2;
  border: 2px solid #60a5fa; /* Debug border to see container */
  margin: 0;
  pointer-events: none; /* Don't block spectrogram clicks */
}

.spectrogram-container {
  position: absolute;
  top: 60px; /* Position below waveform */
  left: 0;
  width: 100%;
  height: 200px; /* Fixed height for spectrogram */
  z-index: 1;
}

.test-container.simple-overlay {
  position: absolute;
  top: 0; /* Position at very top */
  left: 0;
  height: 60px; /* Match other overlay heights */
  background-color: rgba(0, 0, 0, 0.1);
  z-index: 3;
  border: 2px solid #ef4444; /* Red border for visibility */
  margin: 0;
}

.status {
  margin-top: 10px;
  padding: 8px;
  background-color: #1a1a1a;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
}

button {
  padding: 10px 20px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 10px;
}

button:hover:not(:disabled) {
  background-color: #2563eb;
}

button:disabled {
  background-color: #6b7280;
  cursor: not-allowed;
}

code {
  background-color: #374151;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
