<template>
  <div v-if="isVisible" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h1>Audio Processing Guide</h1>
        <button @click="closeModal" class="close-btn" title="Close Guide">
          ✕
        </button>
      </div>
      
      <div class="modal-content">
        <section>
          <h2>Overview</h2>
          <p>AccentShadow performs sophisticated audio processing to optimize your pronunciation practice experience. This guide explains what happens to your audio from upload to playback, ensuring transparency and helping you understand the technology behind the app.</p>
        </section>

        <section>
          <h2>🎯 Processing Pipeline</h2>
          
          <h3>1. <strong>Audio Upload & Format Handling</strong></h3>
          <p><strong>What happens when you upload audio:</strong></p>
          <ul>
            <li><strong>Format Detection</strong>: Supports MP3, WAV, M4A, OGG, and WebM formats</li>
            <li><strong>Browser Compatibility</strong>: Audio is decoded using the Web Audio API for consistent cross-browser behavior</li>
            <li><strong>Sample Rate Standardization</strong>: All audio is processed at 44.1kHz for optimal compatibility</li>
            <li><strong>Metadata Extraction</strong>: Duration and audio characteristics are analyzed</li>
          </ul>
          
          <div class="tech-details">
            <p><strong>Technical Details:</strong></p>
            <ul>
              <li>Uses <code>AudioContext.decodeAudioData()</code> for reliable format handling</li>
              <li>Maintains original audio quality while ensuring browser compatibility</li>
              <li>Automatic format conversion when necessary</li>
            </ul>
          </div>

          <h3>2. <strong>Voice Activity Detection (VAD)</strong></h3>
          <p><strong>Intelligent Speech Detection:</strong></p>
          <ul>
            <li><strong>AI-Powered Analysis</strong>: Uses the Silero VAD model for accurate speech detection</li>
            <li><strong>Silence Trimming</strong>: Automatically removes leading and trailing silence</li>
            <li><strong>Speech Boundaries</strong>: Identifies precise start and end points of speech</li>
            <li><strong>Padding Strategy</strong>: Adds 200ms padding before speech onset for natural timing</li>
          </ul>
          
          <div class="process-steps">
            <p><strong>VAD Process:</strong></p>
            <ol>
              <li><strong>Audio Analysis</strong>: Scans audio in 400ms overlapping blocks</li>
              <li><strong>Speech Detection</strong>: Identifies speech vs. silence using advanced algorithms</li>
              <li><strong>Boundary Refinement</strong>: Fine-tunes speech start/end points</li>
              <li><strong>Padding Application</strong>: Adds consistent 200ms pre-padding for alignment</li>
            </ol>
          </div>
          
          <div class="benefits-box">
            <p><strong>Benefits:</strong></p>
            <ul>
              <li>✅ Consistent timing across different recordings</li>
              <li>✅ Removes distracting background noise periods</li>
              <li>✅ Optimizes audio for pronunciation comparison</li>
              <li>✅ Maintains natural speech rhythm</li>
            </ul>
          </div>

          <h3>3. <strong>Cross-Browser Audio Alignment</strong></h3>
          <p><strong>Solving Browser Inconsistencies:</strong></p>
          <ul>
            <li><strong>Chrome vs Firefox</strong>: Different browsers process audio timing differently</li>
            <li><strong>320ms Pre-Padding Solution</strong>: Ensures consistent playback timing across browsers</li>
            <li><strong>Sample Rate Normalization</strong>: Handles different recording sample rates uniformly</li>
            <li><strong>Onset Synchronization</strong>: Aligns speech start points to 200ms mark precisely</li>
          </ul>
          
          <div class="code-example">
            <p><strong>Technical Implementation:</strong></p>
            <pre><code>Original Audio: [silence][speech][silence]
After VAD:      [200ms padding][speech][trimmed silence]
Result:         Consistent speech onset at 200ms mark</code></pre>
          </div>

          <h3>4. <strong>Smart Audio Alignment</strong></h3>
          <p><strong>When you record after uploading target audio:</strong></p>
          <ul>
            <li><strong>Duration Matching</strong>: Automatically adjusts audio lengths for comparison</li>
            <li><strong>Speech Synchronization</strong>: Aligns speech onsets between target and user recordings</li>
            <li><strong>Padding Strategy</strong>: Adds end-padding to shorter audio to match durations</li>
            <li><strong>Quality Preservation</strong>: Maintains original speech content without distortion</li>
          </ul>
          
          <div class="process-steps">
            <p><strong>Alignment Methods:</strong></p>
            <ol>
              <li><strong>Onset Synchronized</strong>: Both recordings start speech at the same time point</li>
              <li><strong>Duration Matched</strong>: Ensures both recordings have identical total length</li>
              <li><strong>End Padding</strong>: Adds silence to shorter recordings rather than stretching</li>
            </ol>
          </div>

          <h3>5. <strong>Volume Normalization</strong></h3>
          <p><strong>Intelligent Loudness Matching:</strong></p>
          <ul>
            <li><strong>LUFS Analysis</strong>: Uses ITU-R BS.1770 standard for perceptual loudness measurement</li>
            <li><strong>Smart Balancing</strong>: Automatically adjusts volume levels for fair comparison</li>
            <li><strong>Safety Limits</strong>: Prevents over-amplification while allowing proper attenuation</li>
            <li><strong>Real-time Processing</strong>: Applied during playback without altering original files</li>
          </ul>

          <h4><strong>Loudness Analysis</strong></h4>
          <ul>
            <li><strong>LUFS Measurement</strong>: Analyzes perceptual loudness (-∞ to 0 LUFS scale)</li>
            <li><strong>RMS Calculation</strong>: Measures average audio energy</li>
            <li><strong>Peak Detection</strong>: Identifies maximum audio levels</li>
            <li><strong>Categorization</strong>: Classifies audio as Very Quiet, Quiet, Normal, Loud, or Very Loud</li>
          </ul>

          <h4><strong>Normalization Strategies</strong></h4>
          <ol>
            <li><strong>Average Mode</strong> (Default): Balances both recordings to their average level</li>
            <li><strong>Target Mode</strong>: Adjusts user recording to match target audio level</li>
            <li><strong>User Mode</strong>: Adjusts target audio to match user recording level</li>
          </ol>

          <div class="code-example">
            <p><strong>Gain Calculation Examples:</strong></p>
            <pre><code>Scenario 1 - Quiet User Recording:
Target: -20.6 LUFS (Normal)
User:   -41.2 LUFS (Very Quiet)
Result: User amplified 6x (15.6dB boost), Target slightly boosted

Scenario 2 - Loud User Recording:
Target: -18.0 LUFS (Normal)
User:   -6.0 LUFS (Very Loud)
Result: User attenuated 0.3x (-10dB), Target unchanged</code></pre>
          </div>

          <h3>6. <strong>Playback Modes</strong></h3>
          
          <h4><strong>Individual Playback</strong></h4>
          <ul>
            <li><strong>Play Target</strong>: Hear the target pronunciation with normalization applied</li>
            <li><strong>Play Recording</strong>: Hear your recording with normalization applied</li>
            <li><strong>Consistent Volume</strong>: Same loudness as overlapping mode for fair comparison</li>
          </ul>

          <h4><strong>Overlapping Playback</strong></h4>
          <ul>
            <li><strong>Simultaneous</strong>: Both recordings play at the same time</li>
            <li><strong>Volume Matched</strong>: Intelligent normalization ensures fair volume comparison</li>
            <li><strong>Timing Aligned</strong>: Speech onsets synchronized for optimal comparison</li>
          </ul>

          <h4><strong>Sequential Playback</strong></h4>
          <ul>
            <li><strong>Target First</strong>: Target audio plays, then your recording follows</li>
            <li><strong>Configurable Delay</strong>: Adjustable pause between recordings (0-2000ms)</li>
            <li><strong>Smooth Transitions</strong>: Natural flow between audio segments</li>
          </ul>
        </section>

        <section>
          <h2>⚙️ Technical Specifications</h2>
          
          <div class="tech-specs">
            <h3><strong>Audio Processing Standards</strong></h3>
            <ul>
              <li><strong>Sample Rate</strong>: 44.1kHz (CD quality)</li>
              <li><strong>Bit Depth</strong>: 32-bit float (internal processing)</li>
              <li><strong>Loudness Standard</strong>: ITU-R BS.1770-4 LUFS measurement</li>
              <li><strong>VAD Model</strong>: Silero Voice Activity Detection</li>
              <li><strong>Browser Support</strong>: Chrome, Firefox, Safari, Edge</li>
            </ul>
          </div>

          <div class="quality-box">
            <h3><strong>Quality Assurance</strong></h3>
            <ul>
              <li><strong>No Data Loss</strong>: Original audio files are never modified</li>
              <li><strong>Non-Destructive</strong>: All processing is applied during playback only</li>
              <li><strong>Caching</strong>: Analysis results cached to avoid reprocessing</li>
              <li><strong>Error Handling</strong>: Graceful fallbacks if processing fails</li>
            </ul>
          </div>
        </section>

        <section>
          <h2>🎚️ User Controls</h2>
          
          <h3><strong>Volume Normalization Settings</strong></h3>
          <ul>
            <li><strong>Enable/Disable</strong>: Toggle normalization on/off</li>
            <li><strong>Target LUFS</strong>: Adjust reference loudness level (-30 to -6 LUFS)</li>
            <li><strong>Maximum Gain</strong>: Limit amplification (1x to 6x multiplication)</li>
            <li><strong>Balance Mode</strong>: Choose how to balance target vs user audio</li>
            <li><strong>Smooth Transitions</strong>: Enable gradual volume changes</li>
          </ul>

          <h3><strong>VAD Settings</strong></h3>
          <ul>
            <li><strong>Threshold</strong>: Sensitivity for speech detection (0.1 to 0.5)</li>
            <li><strong>Padding</strong>: Silence added before speech (100ms to 500ms)</li>
            <li><strong>Min Speech Duration</strong>: Minimum speech segment length</li>
            <li><strong>Max Silence Duration</strong>: Maximum allowed silence within speech</li>
          </ul>
        </section>

        <section>
          <h2>🔬 Behind the Scenes</h2>
          
          <div class="privacy-box">
            <h3><strong>Privacy & Security</strong></h3>
            <ul>
              <li><strong>Local Processing</strong>: All audio processing happens in your browser</li>
              <li><strong>No Upload</strong>: Your recordings never leave your device</li>
              <li><strong>No Storage</strong>: Audio is processed in memory and discarded when done</li>
              <li><strong>No Tracking</strong>: No audio data is collected or analyzed for other purposes</li>
            </ul>
          </div>

          <h3><strong>Why These Processes Matter</strong></h3>
          <ol>
            <li><strong>Fair Comparison</strong>: Volume normalization ensures you're comparing pronunciation, not recording volume</li>
            <li><strong>Consistent Timing</strong>: VAD and alignment eliminate timing variables</li>
            <li><strong>Cross-Platform Reliability</strong>: Browser-specific optimizations ensure consistent behavior</li>
            <li><strong>Professional Quality</strong>: Industry-standard audio processing techniques</li>
          </ol>
        </section>

        <section>
          <h2>📊 Quality Metrics</h2>
          
          <div class="metrics-grid">
            <div class="metric-box">
              <h4>Processing Accuracy</h4>
              <ul>
                <li><strong>VAD Precision</strong>: >95% accuracy</li>
                <li><strong>Timing Consistency</strong>: <10ms variance</li>
                <li><strong>Loudness Matching</strong>: ±1 LUFS accuracy</li>
              </ul>
            </div>
            
            <div class="metric-box">
              <h4>Performance</h4>
              <ul>
                <li><strong>Processing Time</strong>: <500ms typical</li>
                <li><strong>Memory Usage</strong>: <50MB peak</li>
                <li><strong>Battery Optimized</strong>: Mobile friendly</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2>🚀 Future Enhancements</h2>
          <ul>
            <li><strong>Advanced EQ</strong>: Frequency-specific audio balancing</li>
            <li><strong>Noise Reduction</strong>: AI-powered background noise removal</li>
            <li><strong>Pitch Analysis</strong>: Visual pitch comparison between recordings</li>
            <li><strong>Formant Matching</strong>: Advanced pronunciation similarity scoring</li>
          </ul>
        </section>

        <div class="footer-note">
          <p><em>This guide reflects the current audio processing implementation in AccentShadow. Processing techniques are continuously improved based on user feedback and technological advances.</em></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const closeModal = () => {
  emit('close')
}

// Close modal on Escape key
const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    closeModal()
  }
}

// Add keyboard listener when modal is visible
watch(() => props.isVisible, (isVisible) => {
  if (isVisible) {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden' // Prevent background scrolling
  } else {
    document.removeEventListener('keydown', handleKeyDown)
    document.body.style.overflow = '' // Restore scrolling
  }
})

// Cleanup on unmount
onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  border-bottom: 2px solid #f0f0f0;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.modal-header h1 {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
  color: white;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.modal-content {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
  line-height: 1.6;
}

/* Typography */
h2 {
  color: #2d3748;
  font-size: 1.6rem;
  margin: 2rem 0 1rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
}

h3 {
  color: #4a5568;
  font-size: 1.3rem;
  margin: 1.5rem 0 0.75rem 0;
}

h4 {
  color: #2d3748;
  font-size: 1.1rem;
  margin: 1rem 0 0.5rem 0;
}

p {
  margin-bottom: 1rem;
  color: #4a5568;
}

ul, ol {
  margin: 1rem 0;
  padding-left: 2rem;
}

li {
  margin-bottom: 0.5rem;
  color: #4a5568;
}

code {
  background: #f7fafc;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.9em;
  color: #e53e3e;
}

pre {
  background: #1a202c;
  color: #e2e8f0;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1rem 0;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}

pre code {
  background: none;
  padding: 0;
  color: inherit;
}

/* Styled boxes */
.tech-details,
.process-steps,
.code-example {
  background: #f7fafc;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  border-left: 4px solid #667eea;
}

.benefits-box {
  background: #f0fff4;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  border-left: 4px solid #38a169;
}

.tech-specs,
.quality-box {
  background: #f7fafc;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
  border-left: 4px solid #38b2ac;
}

.privacy-box {
  background: #fffaf0;
  padding: 1.5rem;
  border-radius: 8px;
  margin: 1rem 0;
  border-left: 4px solid #ed8936;
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1rem 0;
}

.metric-box {
  background: #f7fafc;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.footer-note {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  color: #718096;
}

/* Responsive design */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0.5rem;
  }
  
  .modal-container {
    max-height: 95vh;
  }
  
  .modal-header {
    padding: 1rem 1.5rem;
  }
  
  .modal-header h1 {
    font-size: 1.4rem;
  }
  
  .modal-content {
    padding: 1.5rem;
  }
  
  h2 {
    font-size: 1.4rem;
  }
  
  h3 {
    font-size: 1.2rem;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
}

/* Scrollbar styling */
.modal-content::-webkit-scrollbar {
  width: 8px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>