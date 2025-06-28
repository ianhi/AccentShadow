<template>
  <div class="vad-test-view">
    <div class="test-header">
      <h1>VAD Processing Test</h1>
      <p>Testing VAD processing with "test_said_three_words.wav"</p>
    </div>

    <div class="test-controls">
      <button @click="runTest" :disabled="isProcessing" class="test-btn">
        {{ isProcessing ? 'Processing...' : 'Run VAD Test' }}
      </button>
      <button @click="clearResults" class="clear-btn">Clear Results</button>
    </div>

    <div class="vad-settings">
      <h3>VAD Settings</h3>
      <div class="settings-grid">
        <div class="setting">
          <label>Threshold:</label>
          <input type="range" min="0.1" max="0.9" step="0.1" v-model="vadSettings.threshold" />
          <span>{{ vadSettings.threshold }}</span>
        </div>
        <div class="setting">
          <label>Min Speech Duration (ms):</label>
          <input type="range" min="10" max="200" step="10" v-model="vadSettings.minSpeechDuration" />
          <span>{{ vadSettings.minSpeechDuration }}</span>
        </div>
        <div class="setting">
          <label>Max Silence Duration (ms):</label>
          <input type="range" min="100" max="1000" step="50" v-model="vadSettings.maxSilenceDuration" />
          <span>{{ vadSettings.maxSilenceDuration }}</span>
        </div>
        <div class="setting">
          <label>Padding (s):</label>
          <input type="range" min="0.0" max="0.5" step="0.05" v-model="vadSettings.padding" />
          <span>{{ vadSettings.padding }}</span>
        </div>
      </div>
    </div>

    <div class="test-results" v-if="testResults.length > 0">
      <h3>Test Results</h3>
      <div class="results-grid">
        <div v-for="(result, index) in testResults" :key="index" class="result-card">
          <h4>{{ result.testName }}</h4>
          <div class="result-info">
            <p><strong>Settings:</strong> {{ JSON.stringify(result.settings) }}</p>
            <p><strong>Original Duration:</strong> {{ result.originalDuration }}s</p>
            <p><strong>Processed:</strong> {{ result.processed ? 'Yes' : 'No' }}</p>
            <div v-if="result.processed">
              <p><strong>Speech Detected:</strong> {{ result.speechStart }}s - {{ result.speechEnd }}s</p>
              <p><strong>Duration:</strong> {{ (result.speechEnd - result.speechStart).toFixed(3) }}s</p>
              <p><strong>Padded:</strong> {{ result.paddedStart }}s - {{ result.paddedEnd }}s</p>
              <p><strong>Final Duration:</strong> {{ result.finalDuration }}s</p>
              <p><strong>Trimmed:</strong> {{ result.trimmedAmount }}s</p>
            </div>
            <div v-else>
              <p><strong>Reason:</strong> {{ result.failureReason }}</p>
            </div>
          </div>
          
          <!-- Audio player for each result -->
          <div v-if="result.processedBlob" class="audio-preview">
            <p><strong>Processed Audio:</strong></p>
            <audio :src="result.processedUrl" controls></audio>
          </div>
        </div>
      </div>
    </div>

    <div class="console-logs" v-if="consoleLogs.length > 0">
      <h3>Console Logs</h3>
      <div class="logs-container">
        <div v-for="(log, index) in consoleLogs" :key="index" class="log-entry" :class="log.type">
          <span class="timestamp">{{ log.timestamp }}</span>
          <span class="message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSmartAudioAlignment } from '../composables/useSmartAudioAlignment';

const isProcessing = ref(false);
const testResults = ref([]);
const consoleLogs = ref([]);

const vadSettings = ref({
  threshold: 0.5,
  minSpeechDuration: 50,
  maxSilenceDuration: 300,
  padding: 0.1
});

const { processAudio, normalizeAudioSilence, vadReady, initVAD } = useSmartAudioAlignment();

// Capture console logs
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

const addLog = (type, message) => {
  consoleLogs.value.push({
    type,
    message: String(message),
    timestamp: new Date().toLocaleTimeString()
  });
};

onMounted(async () => {
  // Override console methods to capture logs
  console.log = (...args) => {
    originalConsoleLog(...args);
    addLog('log', args.join(' '));
  };
  console.warn = (...args) => {
    originalConsoleWarn(...args);
    addLog('warn', args.join(' '));
  };
  console.error = (...args) => {
    originalConsoleError(...args);
    addLog('error', args.join(' '));
  };

  // Initialize VAD
  console.log('🎯 Initializing VAD for testing...');
  await initVAD();
  console.log('✅ VAD ready:', vadReady.value);
});

const loadTestAudio = async () => {
  try {
    const response = await fetch('/test_said_three_words.wav');
    if (!response.ok) {
      throw new Error(`Failed to load test audio: ${response.status}`);
    }
    const blob = await response.blob();
    console.log('🎵 Loaded test audio:', blob.size, 'bytes');
    return blob;
  } catch (error) {
    console.error('❌ Error loading test audio:', error);
    throw error;
  }
};

const getAudioDuration = (audioBlob) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);
    
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    };
    
    audio.onerror = () => {
      resolve(0);
      URL.revokeObjectURL(url);
    };
    
    audio.src = url;
  });
};

const runSingleTest = async (testName, audioBlob, settings) => {
  console.log(`🧪 Running test: ${testName}`);
  
  const originalDuration = await getAudioDuration(audioBlob);
  
  try {
    const processed = await processAudio(audioBlob, settings);
    
    if (processed.processed && processed.vadBoundaries) {
      // Normalize the audio
      const normalizedBlob = await normalizeAudioSilence(
        processed.audioBlob,
        processed.vadBoundaries,
        200 // 200ms padding
      );
      
      const finalDuration = await getAudioDuration(normalizedBlob);
      const trimmedAmount = originalDuration - finalDuration;
      
      return {
        testName,
        settings,
        originalDuration: originalDuration.toFixed(3),
        processed: true,
        speechStart: processed.vadBoundaries.originalSpeechStart,
        speechEnd: processed.vadBoundaries.originalSpeechEnd,
        paddedStart: processed.vadBoundaries.startTime,
        paddedEnd: processed.vadBoundaries.endTime,
        finalDuration: finalDuration.toFixed(3),
        trimmedAmount: trimmedAmount.toFixed(3),
        processedBlob: normalizedBlob,
        processedUrl: URL.createObjectURL(normalizedBlob)
      };
    } else {
      return {
        testName,
        settings,
        originalDuration: originalDuration.toFixed(3),
        processed: false,
        failureReason: 'VAD processing failed'
      };
    }
  } catch (error) {
    console.error(`❌ Test ${testName} failed:`, error);
    return {
      testName,
      settings,
      originalDuration: originalDuration.toFixed(3),
      processed: false,
      failureReason: error.message
    };
  }
};

const runTest = async () => {
  if (isProcessing.value) return;
  
  isProcessing.value = true;
  consoleLogs.value = [];
  
  try {
    const audioBlob = await loadTestAudio();
    
    // Test with multiple different settings
    const testConfigs = [
      {
        name: 'Conservative (Target Audio)',
        settings: {
          threshold: 0.5,
          minSpeechDuration: 50,
          maxSilenceDuration: 300,
          padding: 0.1
        }
      },
      {
        name: 'Lenient (User Audio)',
        settings: {
          threshold: 0.3,
          minSpeechDuration: 30,
          maxSilenceDuration: 500,
          padding: 0.1
        }
      },
      {
        name: 'Very Sensitive',
        settings: {
          threshold: 0.2,
          minSpeechDuration: 20,
          maxSilenceDuration: 800,
          padding: 0.15
        }
      },
      {
        name: 'Custom Settings',
        settings: vadSettings.value
      }
    ];
    
    const results = [];
    for (const config of testConfigs) {
      const result = await runSingleTest(config.name, audioBlob, config.settings);
      results.push(result);
      
      // Small delay between tests to make logs clearer
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    testResults.value = results;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    isProcessing.value = false;
  }
};

const clearResults = () => {
  testResults.value = [];
  consoleLogs.value = [];
};
</script>

<style scoped>
.vad-test-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.test-header {
  text-align: center;
  margin-bottom: 30px;
}

.test-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 30px;
}

.test-btn, .clear-btn {
  padding: 10px 20px;
  font-size: 16px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.test-btn {
  background: #007bff;
  color: white;
}

.test-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.clear-btn {
  background: #6c757d;
  color: white;
}

.vad-settings {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.setting {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting label {
  min-width: 150px;
  font-weight: bold;
}

.setting input[type="range"] {
  flex: 1;
}

.setting span {
  min-width: 50px;
  text-align: right;
  font-family: monospace;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.result-card {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
}

.result-card h4 {
  margin: 0 0 10px 0;
  color: #495057;
}

.result-info p {
  margin: 5px 0;
  font-size: 14px;
}

.audio-preview {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #dee2e6;
}

.audio-preview audio {
  width: 100%;
}

.console-logs {
  margin-top: 30px;
}

.logs-container {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
}

.log-entry {
  margin: 2px 0;
  padding: 2px 5px;
  border-radius: 3px;
}

.log-entry.warn {
  background: #fff3cd;
  color: #856404;
}

.log-entry.error {
  background: #f8d7da;
  color: #721c24;
}

.timestamp {
  color: #6c757d;
  margin-right: 10px;
}
</style>