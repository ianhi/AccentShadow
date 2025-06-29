<template>
  <div class="practice-view">
    <div class="main-content">
      <div class="main-header">
        <h1>AccentShadow</h1>
      </div>

      <SessionStats />
      <RecordingNavigation />
      
      <div class="visualization-container">
      <div class="audio-column">
        <div class="column-header">
          <h3>Target Audio</h3>
          <div class="target-controls">
            <div class="control-row">
              <div class="audio-display">
                <span v-if="!currentAudioSource" class="placeholder-text">
                  No audio selected
                </span>
                <span v-else class="current-source">
                  {{ currentAudioSource }}
                </span>
              </div>
              <button @click="triggerFileInput" class="action-btn file-btn">
                📁 Browse File
              </button>
              <button @click="showUrlModal = true" class="action-btn url-btn">
                🌐 Load URL
              </button>
            </div>
          </div>
        </div>
        <AudioPlayer 
          v-if="getTargetAudioUrl()" 
          ref="targetAudioPlayerRef" 
          :audioUrl="getTargetAudioUrl()" 
          :audioType="'target'"
          :debugInfo="targetDebugInfo"
          :key="getTargetAudioKey()"
        />
        <div v-else class="placeholder">
          {{ activeSet ? 'Select a recording from the set' : 'Please upload a target audio file or load from URL.' }}
        </div>
      </div>
      
      <div class="audio-column">
        <div class="column-header">
          <h3>User Recording</h3>
        </div>
        <AudioPlayer 
          v-if="currentRecording?.userRecording?.audioUrl || userAudioUrl" 
          ref="userAudioPlayerRef" 
          :audioUrl="currentRecording?.userRecording?.audioUrl || userAudioUrl" 
          :audioType="'user'"
          :isRecording="isRecordingActive"
          :debugInfo="userDebugInfo"
          :key="getUserAudioKey()"
        />
        <div v-else class="placeholder" :class="{ 'recording-placeholder': isRecordingActive }">
          <span v-if="isRecordingActive" class="recording-indicator-text">
            🔴 Recording in progress...
          </span>
          <span v-else>Record your audio.</span>
        </div>
      </div>
    </div>

    <div class="central-playback-controls">
      <h3>Recording & Playback Controls</h3>
      
      <!-- Main Controls Row: Recording + Playback -->
      <div class="main-controls-row">
        <!-- Recording Controls -->
        <div class="recording-controls">
          <AudioRecorder 
            @recorded="handleRecordedAudio" 
            @recording-started="handleRecordingStarted"
            @recording-stopped="handleRecordingStopped"
          />
        </div>
        
        <!-- Playback Controls -->
        <div class="playback-buttons">
          <button @click="playTarget" :disabled="!targetAudioUrl" class="playback-btn target-btn">
            <span class="btn-icon">🎯</span>
            <span>Play Target</span>
          </button>
          <button @click="playUser" :disabled="!userAudioUrl" class="playback-btn user-btn">
            <span class="btn-icon">🎤</span>
            <span>Play Recording</span>
          </button>
          <button @click="playOverlapping" :disabled="!targetAudioUrl || !userAudioUrl" class="playback-btn overlapping-btn">
            <span class="btn-icon">🔄</span>
            <span>Play Overlapping</span>
          </button>
          <button @click="playSequential" :disabled="!targetAudioUrl || !userAudioUrl" class="playback-btn sequential-btn">
            <span class="btn-icon">📋</span>
            <span>Play Sequential</span>
          </button>
          <button @click="stopAll" class="playback-btn stop-btn">
            <span class="btn-icon">⏹</span>
            <span>Stop All</span>
          </button>
        </div>
      </div>
      
      <!-- Speed Control Section -->
      <div class="speed-control-section" v-if="targetAudioUrl || userAudioUrl">
        <div class="speed-control">
          <span class="speed-label">⚡ Playback Speed:</span>
          <input 
            type="range" 
            min="0.25" 
            max="2" 
            step="0.25" 
            v-model="globalPlaybackSpeed" 
            @input="updatePlaybackSpeed"
            class="speed-slider"
          />
          <span class="speed-display">{{ globalPlaybackSpeed }}x</span>
        </div>
      </div>
    </div>

    <div class="bottom-controls">
      <div class="options-group">
        <label class="auto-play-toggle">
          <input type="checkbox" v-model="autoPlayBoth" />
          🔄 Auto-play both after recording
        </label>
        <div class="alignment-controls">
          <label class="trim-silence-toggle">
            <input type="checkbox" v-model="autoAlignEnabled" />
            {{ vadReady ? '✂️ Trim Silence (VAD)' : '✂️ Trim Silence' }}
          </label>
          <button @click="manualAlign" :disabled="!getTargetBlob() || !userAudioBlob || isProcessing" class="align-btn" :class="{ 'processing': isProcessing }">
            {{ isProcessing ? '🔄 Trimming...' : '✂️ Trim Now' }}
          </button>
          <button @click="showVADSettings = true" class="settings-btn" title="VAD Settings">
            ⚙️
          </button>
        </div>
        <label class="time-sync-toggle">
          <input type="checkbox" v-model="syncEnabled" />
          Sync time scales
        </label>
        <div class="sequential-delay-control">
          <label class="delay-label">📋 Sequential delay:</label>
          <input 
            type="range" 
            min="0" 
            max="2000" 
            step="100" 
            v-model="sequentialDelay" 
            class="delay-slider"
          />
          <span class="delay-display">{{ sequentialDelay }}ms</span>
        </div>
      </div>
      <button @click="saveRecording" :disabled="!getTargetBlob() || !userAudioBlob" class="save-btn">Save Recording</button>
      <button 
        v-if="currentRecording && userAudioBlob" 
        @click="markCurrentCompleted" 
        :disabled="currentRecording.userRecording.isCompleted"
        class="complete-btn"
      >
        {{ currentRecording.userRecording.isCompleted ? '✅ Completed' : '✓ Mark Complete' }}
      </button>
    </div>

    <div class="section">
      <h2>Saved Recordings</h2>
      <RecordingList @load-recording="loadSavedRecording" @delete-recording="deleteSavedRecording" />
    </div>
    </div>

    <!-- Recording Sets Manager -->
    <RecordingSetsManager />
    
    <!-- Hidden File Input -->
    <input 
      type="file" 
      accept="audio/*" 
      @change="handleFileSelection" 
      ref="hiddenFileInput"
      style="display: none;"
    />
    
    <!-- URL Input Modal -->
    <div v-if="showUrlModal" class="modal-overlay" @click="showUrlModal = false">
      <div class="modal-content" @click.stop>
        <h3>🌐 Load Audio from URL</h3>
        <input 
          type="url" 
          v-model="tempAudioUrl" 
          placeholder="Enter audio URL (e.g., https://example.com/audio.mp3)"
          class="url-input-modal"
          @keyup.enter="handleUrlLoad"
          ref="urlInputRef"
        />
        <div class="modal-actions">
          <button @click="showUrlModal = false" class="cancel-btn">Cancel</button>
          <button @click="handleUrlLoad" :disabled="!tempAudioUrl.trim()" class="load-btn">
            Load Audio
          </button>
        </div>
      </div>
    </div>
    
    <!-- VAD Settings Modal -->
    <VADSettingsModal 
      :isOpen="showVADSettings" 
      :settings="vadSettings" 
      @close="showVADSettings = false"
      @save="handleVADSettingsSave"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import AudioPlayer from '../components/AudioPlayer.vue';
import AudioRecorder from '../components/AudioRecorder.vue';
import RecordingList from '../components/RecordingList.vue';
import RecordingNavigation from '../components/RecordingNavigation.vue';
import SessionStats from '../components/SessionStats.vue';
import RecordingSetsManager from '../components/RecordingSetsManager.vue';
import VADSettingsModal from '../components/VADSettingsModal.vue';
import { useIndexedDB } from '../composables/useIndexedDB.ts';
import { useSmartAudioAlignment } from '../composables/useSmartAudioAlignment';
import { useRecordingSets } from '../composables/useRecordingSets';
import { useTimeSync } from '../composables/useTimeSync.ts';
import { audioManager } from '../composables/useAudioManager.ts';

const targetAudioUrl = ref(null);
const targetAudioBlob = ref(null);
const userAudioUrl = ref(null);
const userAudioBlob = ref(null);
const autoAlignEnabled = ref(true); // Enable robust VAD trimming by default
const globalPlaybackSpeed = ref(1); // Global playback speed control
// Always use VAD-based trimming when enabled
const currentAudioSource = ref('');
const showUrlModal = ref(false);
const tempAudioUrl = ref('');
const hiddenFileInput = ref(null);
const isRecordingActive = ref(false);
const autoPlayBoth = ref(true); // Auto-play both audios after recording
const sequentialDelay = ref(0); // Sequential playback delay in milliseconds
const showVADSettings = ref(false);
const vadSettings = ref({
  padding: 0.2,
  threshold: 0.25,
  minSpeechDuration: 50,
  maxSilenceDuration: 500,
  maxTrimStart: 3.0,
  maxTrimEnd: 2.0
});

// Cache for target audio VAD processing to avoid reprocessing on each recording
const targetAudioProcessed = ref(null);

// Debug info for audio processing
const targetDebugInfo = ref(null);
const userDebugInfo = ref(null);

const { initDB, addRecording, deleteRecording } = useIndexedDB();
const { 
  isProcessing,
  vadReady,
  initVAD,
  processAudio,
  normalizeAudioSilence,
  alignTwoAudios
} = useSmartAudioAlignment();
const { 
  activeSet, 
  currentRecording, 
  updateUserRecording,
  markRecordingCompleted 
} = useRecordingSets();
const { syncEnabled, toggleSync } = useTimeSync();

onMounted(async () => {
  await initDB();
  // Initialize VAD model for professional audio processing
  try {
    await initVAD();
    if (vadReady.value) {
    } else {
    }
  } catch (error) {
    console.warn('⚠️ VAD initialization failed:', error.message);
    console.error('🔍 VAD Error details:', error);
  }
});

const urlInputRef = ref(null);

const triggerFileInput = () => {
  hiddenFileInput.value?.click();
};

const handleVADSettingsSave = (newSettings) => {
  vadSettings.value = { ...newSettings };
};

// Unified function to set and process target audio from any source
const setTargetAudio = async (audioBlob, source = {}) => {
  if (!audioBlob) {
    console.warn('🎯 setTargetAudio: No audio blob provided');
    // Clear everything
    const oldTargetUrl = targetAudioUrl.value;
    targetDebugInfo.value = null;
    targetAudioProcessed.value = null;
    targetAudioUrl.value = null;
    targetAudioBlob.value = null;
    
    // Cleanup old blob URL
    if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
      setTimeout(() => {
        URL.revokeObjectURL(oldTargetUrl);
      }, 3000);
    }
    return;
  }

  try {
    const sourceType = source.source || 'manual';
    
    if (sourceType === 'folder') {
    }
    
    // Store old URL for cleanup
    const oldTargetUrl = targetAudioUrl.value;
    
    // Get raw duration for debugging
    const rawDuration = await getAudioDuration(audioBlob);
    
    // Initial debug info
    targetDebugInfo.value = {
      rawDuration: rawDuration.toFixed(3),
      finalDuration: rawDuration.toFixed(3),
      trimmedAmount: '0.000'
    };
    
    // Process target audio with VAD using exact aggressive settings from tuner
    const targetProcessed = await processAudio(audioBlob, {
      positiveSpeechThreshold: 0.3,  // Exact tuner setting
      negativeSpeechThreshold: 0.2,  // Exact tuner setting
      minSpeechFrames: 3,            // Exact tuner setting
      redemptionFrames: 32,          // Exact tuner setting
      padding: 0.05                  // Exact tuner setting (50ms padding)
    });
    
    if (targetProcessed.processed && targetProcessed.vadBoundaries) {
      
      // Normalize target audio to have consistent padding
      const normalizedBlob = await normalizeAudioSilence(
        targetProcessed.audioBlob,
        targetProcessed.vadBoundaries,
        vadSettings.value.padding * 1000 // Convert to milliseconds
      );
      
      // Update state with processed audio
      targetAudioBlob.value = normalizedBlob;
      targetAudioUrl.value = URL.createObjectURL(normalizedBlob);
      
      // Cache the processed target audio for future recordings
      targetAudioProcessed.value = {
        ...targetProcessed,
        audioBlob: normalizedBlob
      };
      
      // Update debug info with normalized duration
      const finalDuration = await getAudioDuration(normalizedBlob);
      targetDebugInfo.value = {
        rawDuration: rawDuration.toFixed(3),
        finalDuration: finalDuration.toFixed(3),
        trimmedAmount: (rawDuration - finalDuration).toFixed(3)
      };
      
      
      if (sourceType === 'folder') {
        console.log('✅ FOLDER AUDIO PROCESSING: Successfully completed VAD processing', {
          rawDuration: rawDuration.toFixed(3) + 's',
          finalDuration: finalDuration.toFixed(3) + 's',
          trimmedAmount: (rawDuration - finalDuration).toFixed(3) + 's',
          fileName: source.fileName
        });
      }
    } else {
      console.log('📏 Target VAD processing failed - using original audio');
      
      // Use original audio when VAD processing fails
      targetAudioBlob.value = audioBlob;
      targetAudioUrl.value = URL.createObjectURL(audioBlob);
      
      // Clear cache since processing failed
      targetAudioProcessed.value = null;
      
      // Keep basic debug info
      targetDebugInfo.value = {
        rawDuration: rawDuration.toFixed(3),
        finalDuration: rawDuration.toFixed(3),
        trimmedAmount: '0.000'
      };
    }
    
    // Cleanup old blob URL after delay to ensure audio player has loaded
    setTimeout(() => {
      if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldTargetUrl);
      }
    }, 3000);
    
    // Update current audio source display
    if (source.name) {
      currentAudioSource.value = source.name;
    } else if (source.fileName) {
      currentAudioSource.value = source.fileName;
    } else if (source.url) {
      currentAudioSource.value = source.url;
    }
    
  } catch (error) {
    console.error('Error processing target audio:', error);
    
    // Fallback to original audio on error
    const oldTargetUrl = targetAudioUrl.value;
    targetAudioBlob.value = audioBlob;
    targetAudioUrl.value = URL.createObjectURL(audioBlob);
    targetAudioProcessed.value = null;
    
    try {
      const rawDuration = await getAudioDuration(audioBlob);
      targetDebugInfo.value = {
        rawDuration: rawDuration.toFixed(3),
        finalDuration: rawDuration.toFixed(3),
        trimmedAmount: '0.000'
      };
    } catch (durationError) {
      targetDebugInfo.value = null;
    }
    
    // Cleanup old blob URL
    setTimeout(() => {
      if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldTargetUrl);
      }
    }, 3000);
  }
};

const handleFileSelection = async (event) => {
  const file = event.target.files[0];
  if (file) {
    await setTargetAudio(file, { name: file.name, fileName: file.name });
    
    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
  }
};

const handleUrlLoad = async () => {
  const url = tempAudioUrl.value.trim();
  if (!url) return;
  
  
  try {
    // Validate URL format
    new URL(url);
    
    // Fetch the audio file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Convert to blob
    const blob = await response.blob();
    
    // Validate it's an audio file
    if (!blob.type.startsWith('audio/')) {
      throw new Error('URL does not point to an audio file');
    }
    
    // Use unified processing
    await setTargetAudio(blob, { url: url, name: url });
    
    showUrlModal.value = false;
    tempAudioUrl.value = '';
    
  } catch (error) {
    console.error('Error loading audio from URL:', error);
    alert(`Failed to load audio from URL: ${error.message}`);
  }
};

// Auto-focus when URL modal opens
watch(showUrlModal, (newValue) => {
  if (newValue) {
    nextTick(() => {
      urlInputRef.value?.focus();
    });
  }
});

// Process recordings when they become current (unified processing for all sources)
watch(currentRecording, async (newRecording, oldRecording) => {

  // Only process if we're switching to a new recording that has audio
  if (newRecording && newRecording !== oldRecording && newRecording.audioBlob) {

    try {
      await setTargetAudio(newRecording.audioBlob, {
        name: newRecording.name,
        fileName: newRecording.metadata?.fileName,
        source: 'folder'
      });
      console.log('✅ FOLDER PROCESSING: Successfully processed folder recording');
    } catch (error) {
      console.error('❌ FOLDER PROCESSING: Failed to process folder recording:', error);
    }
  } else if (!newRecording) {
    console.log('🗑️ FOLDER PROCESSING: Clearing target audio (no recording selected)');
    // Clear when no recording is selected
    await setTargetAudio(null);
  } else {
    console.log('⏸️ FOLDER PROCESSING: Skipping processing', {
      reason: !newRecording ? 'no recording' : 
              newRecording === oldRecording ? 'same recording' : 
              !newRecording.audioBlob ? 'no audio blob' : 
              'unknown'
    });
  }
  // Note: if newRecording === oldRecording, we don't reprocess (efficiency)
});

const userAudioPlayerRef = ref(null);
const targetAudioPlayerRef = ref(null);

const handleRecordingStarted = () => {
  console.log('🎤 PracticeView: Recording started');
  isRecordingActive.value = true;
  // Stop all audio when recording starts
  audioManager.emergencyStop('Recording started');
};

const handleRecordingStopped = () => {
  console.log('🎤 PracticeView: Recording stopped');
  isRecordingActive.value = false;
};

const handleRecordedAudio = async (blob) => {
  
  // Validate audio blob
  if (!blob || blob.size === 0) {
    console.warn('🎤 PracticeView: Empty or invalid audio blob received, skipping processing');
    return;
  }
  
  
  userAudioBlob.value = blob;
  userAudioUrl.value = URL.createObjectURL(blob);
  
  // Store raw duration for debugging
  const rawUserDuration = await getAudioDuration(blob);
  userDebugInfo.value = {
    rawDuration: rawUserDuration.toFixed(3),
    finalDuration: rawUserDuration.toFixed(3),
    trimmedAmount: '0.000'
  };
  
  // Update the current recording if we have an active set
  if (currentRecording.value && blob) {
    updateUserRecording(blob, userAudioUrl.value);
  }
  
  // Smart VAD-based audio processing with normalized padding
  if (autoAlignEnabled.value) {
    try {
      console.log('🎧 Starting smart VAD-based audio processing...');
      
      // Process the recorded audio with VAD to get speech boundaries
      // Use more lenient settings for user recordings (microphone audio)
      const userProcessed = await processAudio(blob, {
        threshold: 0.3,           // More sensitive for user recordings
        minSpeechDuration: 30,    // Shorter minimum speech duration
        maxSilenceDuration: 500,  // Allow longer silence gaps
        padding: 0.1
      });
      
      if (userProcessed.processed && userProcessed.vadBoundaries) {
        console.log('🎯 User audio VAD analysis complete:', {
          speechStart: userProcessed.vadBoundaries.originalSpeechStart?.toFixed(3) + 's',
          speechEnd: userProcessed.vadBoundaries.originalSpeechEnd?.toFixed(3) + 's',
          paddedStart: userProcessed.vadBoundaries.startTime?.toFixed(3) + 's',
          paddedEnd: userProcessed.vadBoundaries.endTime?.toFixed(3) + 's'
        });
        
        // If we have both target and user audio, align them together for matching lengths
        if (targetAudioBlob.value) {
          console.log('🔄 Both target and user audio available - performing smart alignment...', {
            hasTargetBlob: !!targetAudioBlob.value,
            hasTargetProcessed: !!targetAudioProcessed.value,
            targetBlobSize: targetAudioBlob.value?.size,
            hasUserBlob: !!blob,
            userBlobSize: blob?.size
          });
          
          try {
            // Use cached target processing if available, otherwise process target audio
            let targetProcessed;
            if (targetAudioProcessed.value) {
              console.log('🎯 Using cached target audio VAD processing for alignment');
              targetProcessed = targetAudioProcessed.value;
              
              // IMPORTANT: Mark that target audio is already normalized to prevent re-processing
              // The target was already trimmed and normalized during upload
              targetProcessed = {
                ...targetProcessed,
                audioBlob: targetAudioBlob.value, // Use the current (trimmed) target audio blob
                alreadyNormalized: true // Flag to skip normalization in alignTwoAudios
              };
              console.log('🎯 Target audio already normalized, will skip re-normalization during alignment');
            } else {
              console.log('🎯 No cached target processing - processing target audio for alignment');
              targetProcessed = await processAudio(targetAudioBlob.value);
              // Cache the processed target for future recordings
              if (targetProcessed.processed) {
                targetAudioProcessed.value = targetProcessed;
                console.log('🎯 Cached target audio processing for future use');
              } else {
                console.warn('🎯 Target audio VAD processing failed during alignment');
              }
            }
            
            if (targetProcessed.processed && userProcessed.processed) {
              // Align both audios using smart alignment
              const alignmentResult = await alignTwoAudios(
                targetProcessed,
                userProcessed,
                vadSettings.value.padding * 1000 // Convert to milliseconds
              );
              
              console.log('✅ Smart two-audio alignment complete:', {
                method: alignmentResult.alignmentInfo.method,
                finalDuration: alignmentResult.alignmentInfo.finalDuration?.toFixed(3) + 's',
                paddingAdded: alignmentResult.alignmentInfo.paddingAdded?.toFixed(3) + 's'
              });
              
              // Store old URLs for cleanup after new audio is loaded
              const oldUserUrl = userAudioUrl.value;
              const oldTargetUrl = targetAudioUrl.value;
              
              // Always update target audio with aligned result (consistent with manual alignment)
              console.log('🎯 Updating target audio with aligned result');
              targetAudioBlob.value = alignmentResult.audio1Aligned;
              targetAudioUrl.value = URL.createObjectURL(alignmentResult.audio1Aligned);
              
              // Always update user audio with aligned result
              userAudioBlob.value = alignmentResult.audio2Aligned;
              userAudioUrl.value = URL.createObjectURL(alignmentResult.audio2Aligned);
              
              // Update debug info for user audio
              const finalUserDuration = await getAudioDuration(alignmentResult.audio2Aligned);
              userDebugInfo.value = {
                rawDuration: rawUserDuration.toFixed(3),
                finalDuration: finalUserDuration.toFixed(3),
                trimmedAmount: (rawUserDuration - finalUserDuration).toFixed(3)
              };
              
              console.log('🎵 SMART-ALIGN: Audio alignment complete', {
                targetUpdated: true,
                userUpdated: true
              });
              
              // Cleanup old blob URLs after a delay to ensure new audio is loaded
              setTimeout(() => {
                if (oldUserUrl && oldUserUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(oldUserUrl);
                }
                if (oldTargetUrl && oldTargetUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(oldTargetUrl);
                }
              }, 3000); // 3 second delay to ensure audio players have loaded
            } else {
              // Fallback to individual normalization
              const normalizedBlob = await normalizeAudioSilence(
                userProcessed.audioBlob,
                userProcessed.vadBoundaries,
                vadSettings.value.padding * 1000
              );
              
              // Store old URL for later cleanup
              const oldUserUrl = userAudioUrl.value;
              
              userAudioBlob.value = normalizedBlob;
              userAudioUrl.value = URL.createObjectURL(normalizedBlob);
              
              // Cleanup old blob URL after delay
              setTimeout(() => {
                if (oldUserUrl && oldUserUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(oldUserUrl);
                }
              }, 3000);
              
              // Update debug info for user audio
              const finalUserDuration = await getAudioDuration(normalizedBlob);
              userDebugInfo.value = {
                rawDuration: rawUserDuration.toFixed(3),
                finalDuration: finalUserDuration.toFixed(3),
                trimmedAmount: (rawUserDuration - finalUserDuration).toFixed(3)
              };
              
              console.log('🎵 SMART-ALIGN: User audio normalized individually (target processing failed)');
            }
          } catch (alignmentError) {
            console.error('Error during smart alignment:', alignmentError);
            // Fallback to individual normalization
            const normalizedBlob = await normalizeAudioSilence(
              userProcessed.audioBlob,
              userProcessed.vadBoundaries,
              vadSettings.value.padding * 1000
            );
            
            // Store old URL for later cleanup
            const oldUserUrl = userAudioUrl.value;
            
            userAudioBlob.value = normalizedBlob;
            userAudioUrl.value = URL.createObjectURL(normalizedBlob);
            
            // Cleanup old blob URL after delay
            setTimeout(() => {
              if (oldUserUrl && oldUserUrl.startsWith('blob:')) {
                URL.revokeObjectURL(oldUserUrl);
              }
            }, 3000);
            
            // Update debug info for user audio
            const finalUserDuration = await getAudioDuration(normalizedBlob);
            userDebugInfo.value = {
              rawDuration: rawUserDuration.toFixed(3),
              finalDuration: finalUserDuration.toFixed(3),
              trimmedAmount: (rawUserDuration - finalUserDuration).toFixed(3)
            };
          }
        } else {
          // No target audio - just normalize user audio individually
          const normalizedBlob = await normalizeAudioSilence(
            userProcessed.audioBlob,
            userProcessed.vadBoundaries,
            vadSettings.value.padding * 1000 // Convert to milliseconds
          );
          
          // Store old URL for later cleanup
          const oldUserUrl = userAudioUrl.value;
          
          userAudioBlob.value = normalizedBlob;
          userAudioUrl.value = URL.createObjectURL(normalizedBlob);
          
          // Cleanup old blob URL after delay
          setTimeout(() => {
            if (oldUserUrl && oldUserUrl.startsWith('blob:')) {
              URL.revokeObjectURL(oldUserUrl);
            }
          }, 3000);
          
          // Update debug info for user audio
          const finalUserDuration = await getAudioDuration(normalizedBlob);
          userDebugInfo.value = {
            rawDuration: rawUserDuration.toFixed(3),
            finalDuration: finalUserDuration.toFixed(3),
            trimmedAmount: (rawUserDuration - finalUserDuration).toFixed(3)
          };
          
          console.log('🎵 SMART-ALIGN: User audio normalized individually (no target audio)');
        }
        
        // Force AudioPlayer to refresh by triggering reactive update
        await nextTick();
      } else {
        console.log('📏 SMART-ALIGN: VAD processing failed - keeping original recording');
        // Keep the original debug info since no processing was done
      }
    } catch (error) {
      console.error('Error during smart VAD processing:', error);
    }
  }
  
  // Auto-play both audios simultaneously after recording
  if (autoPlayBoth.value) {
    console.log('🎵 Auto-play both is enabled, preparing simultaneous playback...');
    
    // Wait for both players to be ready, then play both
    const waitAndPlay = (attempts = 0) => {
      const maxAttempts = 15; // 3 seconds of retries
      
      if (attempts >= maxAttempts) {
        console.warn('🎵 Auto-play failed: Max attempts reached');
        return;
      }
      
      const targetReady = !getTargetAudioUrl() || (targetAudioPlayerRef.value && targetAudioPlayerRef.value.isReady);
      const userReady = userAudioPlayerRef.value && userAudioPlayerRef.value.isReady;
      
      if (targetReady && userReady) {
        console.log('🎵 Both players ready, starting overlapping playback');
        playOverlapping();
      } else {
        console.log(`🎵 Waiting for players to be ready... attempt ${attempts + 1}/${maxAttempts}`, {
          targetReady,
          userReady,
          hasTarget: !!getTargetAudioUrl(),
          targetPlayerRef: !!targetAudioPlayerRef.value,
          userPlayerRef: !!userAudioPlayerRef.value
        });
        setTimeout(() => waitAndPlay(attempts + 1), 200);
      }
    };
    
    setTimeout(() => waitAndPlay(0), 1000); // Longer delay to ensure both players are fully ready
  } else {
    console.log('🎵 Auto-play both is disabled');
  }
};

// Enhanced manual alignment with smart VAD processing
const manualAlign = async () => {
  const targetBlob = getTargetBlob();
  if (!targetBlob || !userAudioBlob.value) return;
  
  try {
    console.log('🔄 Manual smart alignment triggered with VAD settings:', vadSettings.value);
    
    // Use cached target processing if available, otherwise process target audio
    let targetProcessed;
    if (targetAudioProcessed.value) {
      console.log('🎯 Using cached target audio VAD processing for manual alignment');
      targetProcessed = targetAudioProcessed.value;
    } else {
      console.log('🎯 Processing target audio VAD for manual alignment');
      targetProcessed = await processAudio(targetBlob);
    }
    
    // Process user audio
    const userProcessed = await processAudio(userAudioBlob.value);
    
    if (targetProcessed.processed && userProcessed.processed) {
      console.log('🎯 Both audios processed, performing smart alignment...');
      
      // Align both audios using the new smart alignment
      const alignmentResult = await alignTwoAudios(
        targetProcessed,
        userProcessed,
        vadSettings.value.padding * 1000 // Convert to milliseconds
      );
      
      console.log('✅ Smart alignment complete:', {
        method: alignmentResult.alignmentInfo.method,
        finalDuration: alignmentResult.alignmentInfo.finalDuration?.toFixed(3) + 's',
        paddingAdded: alignmentResult.alignmentInfo.paddingAdded?.toFixed(3) + 's'
      });
      
      // Clean up old blob URLs to prevent memory leaks
      if (targetAudioUrl.value && targetAudioUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(targetAudioUrl.value);
      }
      if (userAudioUrl.value && userAudioUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(userAudioUrl.value);
      }
      
      // Update both target and user audio with aligned results
      targetAudioBlob.value = alignmentResult.audio1Aligned;
      targetAudioUrl.value = URL.createObjectURL(alignmentResult.audio1Aligned);
      
      userAudioBlob.value = alignmentResult.audio2Aligned;
      userAudioUrl.value = URL.createObjectURL(alignmentResult.audio2Aligned);
      
      console.log('🎵 Updated audio URLs after smart alignment:', {
        target: targetAudioUrl.value.slice(0, 50) + '...',
        user: userAudioUrl.value.slice(0, 50) + '...'
      });
      
      // Force AudioPlayer to refresh
      await nextTick();
      
      // Show detailed feedback
      alert(`Smart alignment complete!\nMethod: ${alignmentResult.alignmentInfo.method}\nFinal duration: ${alignmentResult.alignmentInfo.finalDuration?.toFixed(3)}s`);
    } else {
      console.log('📏 Smart alignment failed - VAD processing unsuccessful');
      alert('VAD processing failed. Using original recordings.');
    }
  } catch (error) {
    console.error('Error during manual alignment:', error);
    alert('Error during alignment. Please try recording again.');
  }
};

// Central playback control functions
const playTarget = () => {
  console.log('🎯 Playing target audio');
  if (targetAudioPlayerRef.value && targetAudioPlayerRef.value.playPause) {
    targetAudioPlayerRef.value.playPause();
  }
};

const playUser = () => {
  console.log('🎤 Playing user recording');
  if (userAudioPlayerRef.value && userAudioPlayerRef.value.playPause) {
    userAudioPlayerRef.value.playPause();
  }
};

const playOverlapping = async () => {
  console.log('🔄 Playing both audio tracks overlapping (simultaneously)');
  
  // Stop any current playback first
  stopAll();
  
  // Wait a bit longer for stop to complete and players to stabilize
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Bypass audio manager and play both WaveSurfer instances directly
  let targetPlayed = false;
  let userPlayed = false;
  
  // More thorough checking for target audio
  if (targetAudioPlayerRef.value?.isReady) {
    console.log('🎯 Starting target audio playback directly');
    try {
      const wavesurfer = targetAudioPlayerRef.value.wavesurfer;
      console.log('🎯 Target wavesurfer details:', {
        hasWavesurfer: !!wavesurfer,
        hasValue: !!wavesurfer?.value,
        isPlaying: wavesurfer?.value?.isPlaying?.(),
        isReady: targetAudioPlayerRef.value.isReady
      });
      
      if (wavesurfer?.value && typeof wavesurfer.value.play === 'function') {
        await wavesurfer.value.seekTo(0); // Start from beginning
        await wavesurfer.value.play();
        targetPlayed = true;
        console.log('🎯 Target audio started successfully');
      } else if (wavesurfer && typeof wavesurfer.play === 'function') {
        // Try direct access if .value doesn't work
        await wavesurfer.seekTo(0);
        await wavesurfer.play();
        targetPlayed = true;
        console.log('🎯 Target audio started successfully (direct access)');
      } else {
        console.warn('🎯 Target wavesurfer not available or missing play method');
      }
    } catch (e) {
      console.error('🎯 Error playing target:', e);
    }
  } else {
    console.warn('🎯 Target audio not ready:', {
      hasRef: !!targetAudioPlayerRef.value,
      isReady: targetAudioPlayerRef.value?.isReady
    });
  }
  
  // More thorough checking for user audio
  if (userAudioPlayerRef.value?.isReady) {
    console.log('🎤 Starting user audio playback directly');
    try {
      const wavesurfer = userAudioPlayerRef.value.wavesurfer;
      console.log('🎤 User wavesurfer details:', {
        hasWavesurfer: !!wavesurfer,
        hasValue: !!wavesurfer?.value,
        isPlaying: wavesurfer?.value?.isPlaying?.(),
        isReady: userAudioPlayerRef.value.isReady
      });
      
      if (wavesurfer?.value && typeof wavesurfer.value.play === 'function') {
        await wavesurfer.value.seekTo(0); // Start from beginning
        await wavesurfer.value.play();
        userPlayed = true;
        console.log('🎤 User audio started successfully');
      } else if (wavesurfer && typeof wavesurfer.play === 'function') {
        // Try direct access if .value doesn't work
        await wavesurfer.seekTo(0);
        await wavesurfer.play();
        userPlayed = true;
        console.log('🎤 User audio started successfully (direct access)');
      } else {
        console.warn('🎤 User wavesurfer not available or missing play method');
      }
    } catch (e) {
      console.error('🎤 Error playing user:', e);
    }
  } else {
    console.warn('🎤 User audio not ready:', {
      hasRef: !!userAudioPlayerRef.value,
      isReady: userAudioPlayerRef.value?.isReady
    });
  }
  
  if (targetPlayed || userPlayed) {
    console.log('🎵 Successfully started overlapping playback:', { target: targetPlayed, user: userPlayed });
  } else {
    console.warn('🎵 Failed to start any audio playback');
  }
};

const playSequential = async () => {
  console.log('📋 Playing audio tracks sequentially (target then user)');
  
  // Stop any current playback first
  stopAll();
  
  // Wait for stop to complete
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Prepare player info for audio manager sequential playback
  const players = [];
  
  // Add target player if ready
  if (targetAudioPlayerRef.value?.isReady && targetAudioUrl.value) {
    const wavesurfer = targetAudioPlayerRef.value.wavesurfer?.value || targetAudioPlayerRef.value.wavesurfer;
    const targetPlayerInfo = {
      id: targetAudioPlayerRef.value.playerId || 'target-player',
      type: 'target',
      wavesurfer: wavesurfer,
      isReady: true // We already checked isReady above
    };
    players.push(targetPlayerInfo);
    console.log('📋 Added target player to sequence');
  }
  
  // Add user player if ready
  if (userAudioPlayerRef.value?.isReady && userAudioUrl.value) {
    const wavesurfer = userAudioPlayerRef.value.wavesurfer?.value || userAudioPlayerRef.value.wavesurfer;
    const userPlayerInfo = {
      id: userAudioPlayerRef.value.playerId || 'user-player', 
      type: 'user',
      wavesurfer: wavesurfer,
      isReady: true // We already checked isReady above
    };
    players.push(userPlayerInfo);
    console.log('📋 Added user player to sequence');
  }
  
  if (players.length === 0) {
    console.warn('📋 No players available for sequential playback');
    return;
  }
  
  console.log(`📋 Starting sequential playback with ${players.length} players`);
  
  // Use audio manager for sequential playback with configurable delay between tracks
  try {
    await audioManager.playSequential(players, [0, sequentialDelay.value]); // Configurable delay between target and user
    console.log('📋 Sequential playback completed');
  } catch (error) {
    console.error('📋 Error during sequential playback:', error);
  }
};

const stopAll = () => {
  console.log('🛑 Stopping all audio');
  audioManager.stopAll();
};

// Update playback speed for both audio players
const updatePlaybackSpeed = () => {
  console.log('⚡ Updating global playback speed to:', globalPlaybackSpeed.value + 'x');
  
  // Update target audio player speed
  if (targetAudioPlayerRef.value && targetAudioPlayerRef.value.setPlaybackRate) {
    targetAudioPlayerRef.value.setPlaybackRate(globalPlaybackSpeed.value);
  }
  
  // Update user audio player speed
  if (userAudioPlayerRef.value && userAudioPlayerRef.value.setPlaybackRate) {
    userAudioPlayerRef.value.setPlaybackRate(globalPlaybackSpeed.value);
  }
};

// Helper function to play audio and wait for it to finish
const playAudioAndWait = (playerRef) => {
  return new Promise((resolve) => {
    if (!playerRef || !playerRef.isReady) {
      resolve();
      return;
    }
    
    // Listen for the audio to finish
    const originalOnFinish = playerRef.wavesurfer?.on;
    if (originalOnFinish) {
      const cleanup = playerRef.wavesurfer.on('finish', () => {
        cleanup();
        resolve();
      });
      
      // Start playing
      playerRef.playPause();
      
      // Fallback timeout in case finish event doesn't fire
      setTimeout(() => {
        cleanup();
        resolve();
      }, 10000); // 10 second max
    } else {
      // Fallback if we can't listen to events
      playerRef.playPause();
      setTimeout(resolve, 2000); // 2 second default
    }
  });
};


// Helper function to get target blob from current recording or manual upload
const getTargetBlob = () => {
  return currentRecording.value?.audioBlob || targetAudioBlob.value;
};

// Helper function to get audio duration
const getAudioDuration = async (audioBlob) => {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });
    
    audio.src = url;
  });
};

// Helper function to get target audio URL with proper fallback
const getTargetAudioUrl = () => {
  return currentRecording.value?.audioUrl || targetAudioUrl.value;
};

// Helper function to create a unique key for AudioPlayer re-rendering
const getTargetAudioKey = () => {
  if (currentRecording.value) {
    return `recording-${currentRecording.value.id}`;
  }
  return `manual-${targetAudioUrl.value ? targetAudioUrl.value.slice(-10) : 'none'}`;
};

// Helper function to create unique key for user AudioPlayer (forces re-render when URL changes)
const getUserAudioKey = () => {
  const url = currentRecording.value?.userRecording?.audioUrl || userAudioUrl.value;
  if (url) {
    // Use the full URL hash to ensure uniqueness when URL changes
    const urlHash = url.split('//')[1] || url; // Remove protocol for shorter key
    const uniqueKey = `user-${urlHash}`;
    return uniqueKey;
  }
  console.log('🔑 USER AUDIO KEY: No URL, returning default key');
  return 'user-none';
};

const markCurrentCompleted = () => {
  if (currentRecording.value && !currentRecording.value.userRecording.isCompleted) {
    markRecordingCompleted();
    console.log('✅ Marked current recording as completed via button');
  }
};

const saveRecording = async () => {
  const targetBlob = getTargetBlob();
  if (targetBlob && userAudioBlob.value) {
    try {
      await addRecording(targetBlob, userAudioBlob.value);
      alert('Recording saved!');
      // Optionally clear current recordings or refresh list
      targetAudioUrl.value = null;
      targetAudioBlob.value = null;
      userAudioUrl.value = null;
      userAudioBlob.value = null;
      console.log('Recording saved and cleared.');
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Failed to save recording.');
    }
  }
};

const loadSavedRecording = (recording) => {
  targetAudioBlob.value = recording.targetAudio;
  targetAudioUrl.value = URL.createObjectURL(recording.targetAudio);
  userAudioBlob.value = recording.userAudio;
  userAudioUrl.value = URL.createObjectURL(recording.userAudio);
  console.log('Loaded Target Audio URL:', targetAudioUrl.value);
  console.log('Loaded User Audio URL:', userAudioUrl.value);
};

const deleteSavedRecording = async (id) => {
  try {
    await deleteRecording(id);
    alert('Recording deleted!');
    // Refresh the list in RecordingList component
    console.log('Recording deleted:', id);
  } catch (error) {
    console.error('Error deleting recording:', error);
    alert('Failed to delete recording.');
  }
};

// New managed sequential playback function
const startManagedSequentialPlayback = async () => {
  const players = [];
  const delays = [];
  
  // Add target player if available
  if (targetAudioPlayerRef.value && targetAudioPlayerRef.value.isReady && targetAudioPlayerRef.value.playerInfo && targetAudioPlayerRef.value.playerInfo()) {
    players.push(targetAudioPlayerRef.value.playerInfo());
    delays.push(0); // No delay for first player
  }
  
  // Add user player if available  
  if (userAudioPlayerRef.value && userAudioPlayerRef.value.isReady && userAudioPlayerRef.value.playerInfo && userAudioPlayerRef.value.playerInfo()) {
    players.push(userAudioPlayerRef.value.playerInfo());
    delays.push(500); // 500ms delay between target and user
  }
  
  if (players.length > 0) {
    await audioManager.playSequential(players, delays);
    console.log('🎵 Sequential playback completed');
  } else {
    console.warn('🎵 No players available for sequential playback');
  }
};

</script>

<style scoped>
.practice-view {
  min-height: 100vh;
  font-family: sans-serif;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
}

.main-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

h1 {
  color: #333;
  margin: 0;
  font-size: 22px;
}


.column-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
  min-height: 80px; /* Fixed height to ensure alignment */
}

.column-header h3 {
  margin: 0;
  color: #1f2937;
  font-weight: 600;
  font-size: 18px;
  text-shadow: none; /* Ensure good contrast */
}

.target-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  min-height: 48px; /* Ensure consistent height */
}

.recording-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  min-height: 48px; /* Ensure consistent height */
}

.control-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.audio-display {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background-color: #f9fafb;
  font-size: 14px;
  color: #374151;
  min-height: 20px;
  display: flex;
  align-items: center;
}

.placeholder-text {
  color: #9ca3af;
  font-style: italic;
}

.current-source {
  color: #374151;
  font-weight: 500;
  word-break: break-all;
}


.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  min-width: 400px;
  max-width: 90vw;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.url-input-modal {
  width: 100%;
  padding: 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
}

.url-input-modal:focus {
  outline: none;
  border-color: #3b82f6;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn {
  padding: 8px 16px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background-color: white;
  color: #374151;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background-color: #f3f4f6;
}

.load-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.load-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.load-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.action-btn {
  padding: 8px 12px;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  background-color: white;
  color: #3b82f6;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: 500;
}

.action-btn:hover {
  background-color: #3b82f6;
  color: white;
}

.file-btn {
  border-color: #059669;
  color: #059669;
}

.file-btn:hover {
  background-color: #059669;
  color: white;
}

.url-btn {
  border-color: #7c3aed;
  color: #7c3aed;
}

.url-btn:hover {
  background-color: #7c3aed;
  color: white;
}


.bottom-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin: 20px 0;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  flex-wrap: wrap;
}

.auto-play-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  user-select: none;
}

.auto-play-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.options-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}

.auto-align-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  user-select: none;
}

.auto-align-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.time-sync-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  user-select: none;
}

.time-sync-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.sequential-delay-control {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
}

.delay-label {
  font-weight: 500;
  white-space: nowrap;
}

.delay-slider {
  width: 100px;
  height: 4px;
  border-radius: 2px;
  background: #e5e7eb;
  outline: none;
  cursor: pointer;
}

.delay-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.delay-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  border: none;
}

.delay-display {
  font-weight: 600;
  color: #3b82f6;
  min-width: 45px;
  text-align: right;
}

.align-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background-color: #f59e0b;
  color: white;
  transition: background-color 0.2s;
}

.align-btn:hover:not(:disabled) {
  background-color: #d97706;
}

.align-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.save-btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background-color: #3B82F6;
  color: white;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.save-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.save-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.complete-btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background-color: #10b981;
  color: white;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.complete-btn:hover:not(:disabled) {
  background-color: #059669;
}

.complete-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.central-playback-controls {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 16px;
  padding: 24px;
  margin: 20px 0;
  text-align: center;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.central-playback-controls h3 {
  margin: 0 0 20px 0;
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.main-controls-row {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
}

@media (min-width: 768px) {
  .main-controls-row {
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
  }
}

.recording-controls {
  flex-shrink: 0;
}

.playback-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  max-width: 800px;
  flex: 1;
}

.playback-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 12px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
  min-height: 80px;
  min-width: 120px;
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

@media (max-width: 640px) {
  .playback-btn {
    min-width: 100px;
    font-size: 12px;
    padding: 12px 8px;
    gap: 6px;
  }
  
  .playback-btn .btn-icon {
    font-size: 18px;
  }
}

.playback-btn .btn-icon {
  font-size: 24px;
}

.target-btn {
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.target-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

.user-btn {
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.user-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

.overlapping-btn {
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.overlapping-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

.sequential-btn {
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.sequential-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

.stop-btn {
  background-color: rgba(239, 68, 68, 0.8);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stop-btn:hover:not(:disabled) {
  background-color: rgba(239, 68, 68, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.playback-btn:disabled {
  background-color: rgba(148, 163, 184, 0.5);
  color: rgba(255, 255, 255, 0.5);
  cursor: not-allowed;
  transform: none;
  backdrop-filter: blur(5px);
}

.speed-control-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.speed-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  max-width: 400px;
  margin: 0 auto;
}

.speed-label {
  color: white;
  font-size: 16px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
}

.speed-slider {
  flex: 1;
  max-width: 200px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  cursor: pointer;
}

.speed-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.8);
}

.speed-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.8);
}

.speed-display {
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  width: 65px; /* Fixed width to prevent layout shifts */
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 12px;
  border-radius: 8px;
  backdrop-filter: blur(5px);
  flex-shrink: 0; /* Prevent shrinking */
}

.visualization-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
  align-items: start;
}

.audio-column {
  background-color: #ffffff; /* Light background for better text contrast */
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  min-width: 0;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}


.placeholder {
  padding: 40px;
  text-align: center;
  color: #6b7280;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background-color: #f9fafb;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  transition: all 0.3s ease;
}

.recording-placeholder {
  background-color: #fef2f2;
  border-color: #ef4444;
  color: #dc2626;
}

.recording-indicator-text {
  font-weight: 600;
  animation: pulse 1.5s infinite;
}

.section {
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

h2 {
  color: #374151;
  margin-top: 0;
  margin-bottom: 15px;
  font-weight: 600;
}

button {
  padding: 10px 20px;
  background-color: #3B82F6;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
}

button:disabled {
  background-color: #999;
  cursor: not-allowed;
}

/* Medium screens */
@media (max-width: 900px) {
  .playback-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

/* Small screens */
@media (max-width: 768px) {
  .practice-view {
    flex-direction: column;
    height: auto;
  }
  
  .main-content {
    max-width: 100%;
    padding: 15px;
  }
  
  .visualization-container {
    grid-template-columns: 1fr;
  }
  
  .column-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .column-header h3 {
    text-align: center;
  }
  
  .bottom-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .options-group {
    justify-content: center;
  }
  
  .playback-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    max-width: 100%;
  }
  
  .playback-btn {
    min-height: 60px;
    padding: 10px 8px;
    font-size: 12px;
  }
  
  .playback-btn .btn-icon {
    font-size: 20px;
  }
  
  .control-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .audio-display {
    order: 1;
  }
  
  .action-btn {
    order: 2;
  }
  
  .modal-content {
    min-width: 300px;
    margin: 20px;
  }
}

/* Enhanced Alignment Controls */
.alignment-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Removed alignment-mode-select styles - now using simple trim silence toggle */

.align-btn {
  padding: 8px 16px;
  border: 2px solid #8b5cf6;
  border-radius: 6px;
  background-color: white;
  color: #8b5cf6;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.align-btn:hover:not(:disabled) {
  background-color: #8b5cf6;
  color: white;
  transform: translateY(-1px);
}

.align-btn:disabled {
  background-color: #f9fafb;
  border-color: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}

.align-btn.processing {
  background-color: #f59e0b;
  border-color: #f59e0b;
  color: white;
  animation: pulse 1.5s infinite;
}

.settings-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  margin-left: 8px;
}

.settings-btn:hover {
  background: #4b5563;
  transform: scale(1.05);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.auto-align-toggle {
  font-weight: 500;
  color: #374151;
}
</style>