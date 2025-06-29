<template>
  <div class="practice-view">
    <div class="main-content">
      <div class="main-header">
        <h1>AccentShadow</h1>
      </div>

      <SessionStats />
      <RecordingNavigation />
      
      <!-- Audio Visualization Panel -->
      <AudioVisualizationPanel
        ref="audioVisualizationPanel"
        :currentRecording="currentRecording"
        :isRecording="isRecordingActive"
        :vadSettings="vadSettings"
        @browse-file="triggerFileInput"
        @load-url="showUrlModal = true"
        @show-vad-settings="showVADSettings = true"
        @target-audio-ref="handleTargetAudioPlayerRef"
        @user-audio-ref="handleUserAudioPlayerRef"
        @audio-processed="handleAudioProcessed"
        @trigger-auto-play="playOverlapping"
      />

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
        <PlaybackControls 
          :hasTargetAudio="!!getTargetBlob()"
          :hasUserAudio="!!getUserBlob()"
          @play-target="playTarget"
          @play-user="playUser"
          @play-overlapping="playOverlapping"
          @play-sequential="playSequential"
          @stop-all="stopAll"
        />
      </div>
      
      <!-- Speed Control Section -->
      <SpeedControl 
        :speed="globalPlaybackSpeed"
        :enabled="!!(getTargetBlob() || getUserBlob())"
        @speed-change="updatePlaybackSpeed"
      />
    </div>

    <!-- Audio Processing Controls -->
    <div class="audio-processing-controls">
      <div class="options-group">
        <label class="auto-play-toggle">
          <input type="checkbox" :checked="audioVisualizationPanel?.autoPlayBoth" @change="toggleAutoPlay" />
          🔄 Auto-play both after recording
        </label>
        <div class="alignment-controls">
          <label class="trim-silence-toggle">
            <input type="checkbox" :checked="audioVisualizationPanel?.autoAlignEnabled" @change="toggleAutoAlign" />
            {{ audioVisualizationPanel?.vadReady ? '✂️ Trim Silence (VAD)' : '✂️ Trim Silence' }}
          </label>
          <button @click="manualAlign" :disabled="!getTargetBlob() || !getUserBlob() || audioVisualizationPanel?.isProcessing" class="align-btn" :class="{ 'processing': audioVisualizationPanel?.isProcessing }">
            {{ audioVisualizationPanel?.isProcessing ? '🔄 Trimming...' : '✂️ Trim Now' }}
          </button>
          <button @click="showVADSettings = true" class="settings-btn" title="VAD Settings">
            ⚙️
          </button>
        </div>
        <div class="sequential-delay-control">
          <label class="delay-label">📋 Sequential delay:</label>
          <input 
            type="range" 
            min="0" 
            max="2000" 
            step="100" 
            :value="audioVisualizationPanel?.sequentialDelay || 0" 
            @input="updateSequentialDelay"
            class="delay-slider"
          />
          <span class="delay-display">{{ audioVisualizationPanel?.sequentialDelay || 0 }}ms</span>
        </div>
      </div>
    </div>

    <!-- Recording Set Actions -->
    <div class="recording-actions">
      <button @click="saveRecording" :disabled="!getTargetBlob() || !getUserBlob()" class="save-btn">Save Recording</button>
      <button 
        v-if="currentRecording && getUserBlob()" 
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
import AudioRecorder from '../components/AudioRecorder.vue';
import RecordingList from '../components/RecordingList.vue';
import RecordingNavigation from '../components/RecordingNavigation.vue';
import SessionStats from '../components/SessionStats.vue';
import RecordingSetsManager from '../components/RecordingSetsManager.vue';
import VADSettingsModal from '../components/VADSettingsModal.vue';
import PlaybackControls from '../components/PlaybackControls.vue';
import SpeedControl from '../components/SpeedControl.vue';
import AudioVisualizationPanel from '../components/AudioVisualizationPanel.vue';
import { useIndexedDB } from '../composables/useIndexedDB.ts';
import { useRecordingSets } from '../composables/useRecordingSets';
import { useTimeSync } from '../composables/useTimeSync.ts';
import { audioManager } from '../composables/useAudioManager.ts';

// UI state
const globalPlaybackSpeed = ref(1); // Global playback speed control
const showUrlModal = ref(false);
const tempAudioUrl = ref('');
const hiddenFileInput = ref(null);
const isRecordingActive = ref(false);
const showVADSettings = ref(false);
const vadSettings = ref({
  padding: 0.2,
  threshold: 0.25,
  minSpeechDuration: 50,
  maxSilenceDuration: 500,
  maxTrimStart: 3.0,
  maxTrimEnd: 2.0
});

// Component refs
const audioVisualizationPanel = ref(null);

// Audio player refs (handled by AudioVisualizationPanel)
const targetAudioPlayerRef = ref(null);
const userAudioPlayerRef = ref(null);

const { initDB, addRecording, deleteRecording } = useIndexedDB();
const { 
  activeSet, 
  currentRecording, 
  updateUserRecording,
  markRecordingCompleted 
} = useRecordingSets();

onMounted(async () => {
  await initDB();
});

const urlInputRef = ref(null);

const triggerFileInput = () => {
  hiddenFileInput.value?.click();
};

const handleVADSettingsSave = (newSettings) => {
  vadSettings.value = { ...newSettings };
};

// Handle events from AudioVisualizationPanel
const handleTargetAudioPlayerRef = (ref) => {
  targetAudioPlayerRef.value = ref;
};

const handleUserAudioPlayerRef = (ref) => {
  userAudioPlayerRef.value = ref;
};

const handleAudioProcessed = (data) => {
  // Handle any additional processing when audio is processed
  console.log('Audio processed:', data);
};

// Simplified delegation to AudioVisualizationPanel (kept for compatibility)
const setTargetAudio = async (audioBlob, source = {}) => {
  if (audioVisualizationPanel.value) {
    return audioVisualizationPanel.value.setTargetAudio(audioBlob, source);
  }
};

const handleFileSelection = async (event) => {
  const file = event.target.files[0];
  if (file && audioVisualizationPanel.value) {
    await audioVisualizationPanel.value.setTargetAudio(file, { name: file.name, fileName: file.name });
    
    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
  }
};

const handleUrlLoad = async () => {
  const url = tempAudioUrl.value.trim();
  if (!url || !audioVisualizationPanel.value) return;
  
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
    
    // Use AudioVisualizationPanel for processing
    await audioVisualizationPanel.value.setTargetAudio(blob, { url: url, name: url });
    
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
  
  // Delegate audio processing to AudioVisualizationPanel
  if (audioVisualizationPanel.value) {
    await audioVisualizationPanel.value.processUserAudio(blob);
  }
  
  // Update the current recording if we have an active set
  if (currentRecording.value && blob) {
    const userUrl = audioVisualizationPanel.value?.getUserUrl();
    if (userUrl) {
      updateUserRecording(blob, userUrl);
    }
  }
  
  // Auto-play functionality - delegate to panel's auto-play settings
  const shouldAutoPlay = audioVisualizationPanel.value?.autoPlayBoth;
  if (shouldAutoPlay) {
    console.log('🎵 Auto-play delegated to AudioVisualizationPanel');
    // Auto-play logic is now handled by the panel itself
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

// Simplified helper functions that delegate to AudioVisualizationPanel
const getTargetBlob = () => {
  return audioVisualizationPanel.value?.getTargetBlob() || null;
};

const getUserBlob = () => {
  return audioVisualizationPanel.value?.getUserBlob() || null;
};

// Process recordings when they become current (unified processing for all sources)
watch(currentRecording, async (newRecording, oldRecording) => {
  // Only process if we're switching to a new recording that has audio
  if (newRecording && newRecording !== oldRecording && newRecording.audioBlob && audioVisualizationPanel.value) {
    try {
      await audioVisualizationPanel.value.setTargetAudio(newRecording.audioBlob, {
        name: newRecording.name,
        fileName: newRecording.metadata?.fileName,
        source: 'folder'
      });
      console.log('✅ FOLDER PROCESSING: Successfully processed folder recording');
    } catch (error) {
      console.error('❌ FOLDER PROCESSING: Failed to process folder recording:', error);
    }
  } else if (!newRecording && audioVisualizationPanel.value) {
    console.log('🗑️ FOLDER PROCESSING: Clearing target audio (no recording selected)');
    await audioVisualizationPanel.value.setTargetAudio(null);
  }
});

// Playback control functions (delegate to audio players)
const playTarget = () => {
  if (targetAudioPlayerRef.value) {
    audioManager.emergencyStop('Playing target audio');
    targetAudioPlayerRef.value.play();
  }
};

const playUser = () => {
  if (userAudioPlayerRef.value) {
    audioManager.emergencyStop('Playing user audio');
    userAudioPlayerRef.value.play();
  }
};

const playOverlapping = async () => {
  audioManager.emergencyStop('Playing overlapping audio');
  
  const targetPlayer = targetAudioPlayerRef.value;
  const userPlayer = userAudioPlayerRef.value;
  
  if (targetPlayer && userPlayer) {
    try {
      // Play both simultaneously
      await Promise.all([
        targetPlayer.play(),
        userPlayer.play()
      ]);
    } catch (error) {
      console.error('Error playing overlapping audio:', error);
    }
  } else if (targetPlayer) {
    targetPlayer.play();
  } else if (userPlayer) {
    userPlayer.play();
  }
};

const playSequential = async () => {
  audioManager.emergencyStop('Playing sequential audio');
  
  const targetPlayer = targetAudioPlayerRef.value;
  const userPlayer = userAudioPlayerRef.value;
  const delay = audioVisualizationPanel.value?.sequentialDelay || 0;
  
  if (targetPlayer) {
    targetPlayer.play();
    
    if (userPlayer && delay > 0) {
      setTimeout(() => {
        userPlayer.play();
      }, delay);
    } else if (userPlayer) {
      // Play immediately after target finishes
      targetPlayer.wavesurfer?.on('finish', () => {
        userPlayer.play();
      });
    }
  } else if (userPlayer) {
    userPlayer.play();
  }
};

const stopAll = () => {
  audioManager.emergencyStop('Manual stop all');
};

const updatePlaybackSpeed = (newSpeed) => {
  globalPlaybackSpeed.value = newSpeed;
  
  // Update both players if they exist
  if (targetAudioPlayerRef.value) {
    targetAudioPlayerRef.value.setPlaybackRate(newSpeed);
  }
  if (userAudioPlayerRef.value) {
    userAudioPlayerRef.value.setPlaybackRate(newSpeed);
  }
};

// Recording management functions
const markCurrentCompleted = () => {
  if (currentRecording.value && !currentRecording.value.userRecording.isCompleted) {
    markRecordingCompleted();
    console.log('✅ Marked current recording as completed via button');
  }
};

const saveRecording = async () => {
  const targetBlob = getTargetBlob();
  const userBlob = getUserBlob();
  
  if (targetBlob && userBlob) {
    try {
      await addRecording(targetBlob, userBlob);
      alert('Recording saved!');
      console.log('Recording saved and cleared.');
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Failed to save recording.');
    }
  }
};

const loadSavedRecording = (recording) => {
  // Load saved recording logic would go here
  console.log('Loading saved recording:', recording);
};

const deleteSavedRecording = async (id) => {
  try {
    await deleteRecording(id);
    console.log('Recording deleted:', id);
  } catch (error) {
    console.error('Error deleting recording:', error);
    alert('Failed to delete recording.');
  }
};

// Audio processing control handlers
const toggleAutoPlay = (event) => {
  if (audioVisualizationPanel.value) {
    audioVisualizationPanel.value.autoPlayBoth = event.target.checked;
  }
};

const toggleAutoAlign = (event) => {
  if (audioVisualizationPanel.value) {
    audioVisualizationPanel.value.autoAlignEnabled = event.target.checked;
  }
};

const manualAlign = () => {
  if (audioVisualizationPanel.value) {
    audioVisualizationPanel.value.manualAlign();
  }
};

const updateSequentialDelay = (event) => {
  if (audioVisualizationPanel.value) {
    audioVisualizationPanel.value.sequentialDelay = parseInt(event.target.value);
  }
};
</script>

<style scoped>
.practice-view {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white;
}

.main-content {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.main-header {
  text-align: center;
  margin-bottom: 24px;
}

.main-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(45deg, #00d2ff, #3a7bd5);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: none;
  margin: 0;
}

.central-playback-controls {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: 20px 0;
}

.central-playback-controls h3 {
  margin: 0 0 16px 0;
  color: white;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.main-controls-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.recording-controls {
  flex: 1;
  min-width: 200px;
}

.audio-processing-controls {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: 20px 0;
}

.options-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auto-play-toggle,
.trim-silence-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  user-select: none;
}

.auto-play-toggle input,
.trim-silence-toggle input {
  margin: 0;
}

.alignment-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.align-btn,
.settings-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.align-btn:hover:not(:disabled),
.settings-btn:hover {
  background: rgba(37, 99, 235, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.align-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.align-btn.processing {
  background: rgba(245, 158, 11, 0.9);
  cursor: not-allowed;
}

.settings-btn {
  padding: 8px 12px;
  min-width: 40px;
}

.sequential-delay-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.delay-label {
  color: white;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.delay-slider {
  flex: 1;
  min-width: 120px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  appearance: none;
}

.delay-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.delay-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3B82F6;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.delay-display {
  color: white;
  font-size: 14px;
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

.recording-actions {
  display: flex;
  gap: 12px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.save-btn,
.complete-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.save-btn {
  background: rgba(34, 197, 94, 0.9);
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: rgba(21, 128, 61, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.complete-btn {
  background: rgba(59, 130, 246, 0.9);
  color: white;
}

.complete-btn:hover:not(:disabled) {
  background: rgba(37, 99, 235, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.complete-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.section {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: 20px 0;
}

.section h2 {
  margin: 0 0 16px 0;
  color: white;
  font-size: 20px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: rgba(255, 255, 255, 0.15);
  padding: 24px;
  border-radius: 16px;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  min-width: 400px;
  max-width: 90vw;
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: white;
  font-size: 20px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.url-input-modal {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 14px;
  backdrop-filter: blur(10px);
  margin-bottom: 16px;
}

.url-input-modal::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.url-input-modal:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn,
.load-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cancel-btn {
  background: rgba(107, 114, 128, 0.9);
  color: white;
}

.cancel-btn:hover {
  background: rgba(75, 85, 99, 0.9);
  transform: translateY(-1px);
}

.load-btn {
  background: rgba(59, 130, 246, 0.9);
  color: white;
}

.load-btn:hover:not(:disabled) {
  background: rgba(37, 99, 235, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.load-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }
  
  .main-header h1 {
    font-size: 2rem;
  }
  
  .main-controls-row {
    flex-direction: column;
    gap: 16px;
  }
  
  .recording-actions {
    flex-direction: column;
  }
  
  .modal-content {
    min-width: 300px;
    padding: 20px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .cancel-btn,
  .load-btn {
    width: 100%;
  }
}
</style>
