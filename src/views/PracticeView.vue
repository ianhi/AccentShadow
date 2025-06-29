<template>
  <div class="practice-view">
    <div class="main-content">
      <MainHeader />

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

      <!-- Central Playback Controls -->
      <CentralPlaybackControls
        :hasTargetAudio="!!getTargetBlob()"
        :hasUserAudio="!!getUserBlob()"
        :speed="globalPlaybackSpeed"
        @recorded="handleRecordedAudio"
        @recording-started="handleRecordingStarted"
        @recording-stopped="handleRecordingStopped"
        @play-target="playTarget"
        @play-user="playUser"
        @play-overlapping="playOverlapping"
        @play-sequential="playSequential"
        @stop-all="stopAll"
        @speed-change="updatePlaybackSpeed"
      />

      <!-- Audio Processing Controls -->
      <AudioProcessingControls
        :autoPlayBoth="audioVisualizationPanel?.autoPlayBoth || false"
        :autoAlignEnabled="audioVisualizationPanel?.autoAlignEnabled || false"
        :vadReady="audioVisualizationPanel?.vadReady || false"
        :hasTargetAudio="!!getTargetBlob()"
        :hasUserAudio="!!getUserBlob()"
        :isProcessing="audioVisualizationPanel?.isProcessing || false"
        :sequentialDelay="audioVisualizationPanel?.sequentialDelay || 0"
        @toggle-auto-play="toggleAutoPlay"
        @toggle-auto-align="toggleAutoAlign"
        @manual-align="manualAlign"
        @show-vad-settings="showVADSettings = true"
        @update-sequential-delay="updateSequentialDelay"
      />

      <!-- Recording Actions -->
      <RecordingActions
        :hasTargetAudio="!!getTargetBlob()"
        :hasUserAudio="!!getUserBlob()"
        :currentRecording="currentRecording"
        @save-recording="saveRecording"
        @mark-completed="markCurrentCompleted"
      />

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
    <UrlInputModal
      :isOpen="showUrlModal"
      :url="tempAudioUrl"
      @close="showUrlModal = false"
      @load-url="handleUrlLoad"
    />
    
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
import { ref, onMounted, watch } from 'vue';
import RecordingList from '../components/RecordingList.vue';
import RecordingNavigation from '../components/RecordingNavigation.vue';
import SessionStats from '../components/SessionStats.vue';
import RecordingSetsManager from '../components/RecordingSetsManager.vue';
import VADSettingsModal from '../components/VADSettingsModal.vue';
import AudioVisualizationPanel from '../components/AudioVisualizationPanel.vue';
import MainHeader from '../components/MainHeader.vue';
import CentralPlaybackControls from '../components/CentralPlaybackControls.vue';
import AudioProcessingControls from '../components/AudioProcessingControls.vue';
import RecordingActions from '../components/RecordingActions.vue';
import UrlInputModal from '../components/UrlInputModal.vue';
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

const handleUrlLoad = async (url) => {
  if (typeof url === 'string') {
    // Called from UrlInputModal with URL as parameter
    tempAudioUrl.value = url
  } else {
    // Fallback to existing logic (shouldn't happen with new modal)
    url = tempAudioUrl.value.trim()
  }
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

// URL modal auto-focus is now handled by UrlInputModal component

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

// URL modal logic moved to UrlInputModal component

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

/* Component-specific styles moved to individual components */

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

/* Modal styles moved to UrlInputModal component */

/* Mobile responsive */
@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }
}
</style>
