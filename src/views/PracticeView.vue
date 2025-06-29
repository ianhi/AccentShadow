<template>
  <div class="practice-view">
    <div class="main-content">
      <MainHeader />

      <SessionStats />
      <RecordingNavigation />
      
      <!-- Audio Visualization Panel -->
      <AudioVisualizationPanel
        :ref="setAudioVisualizationPanel"
        :currentRecording="currentRecording"
        :isRecording="isRecordingActive"
        :vadSettings="vadSettings"
        @browse-file="triggerFileInput"
        @load-url="showUrlModalHandler"
        @show-vad-settings="showVADSettings"
        @target-audio-ref="handleTargetAudioPlayerRef"
        @user-audio-ref="handleUserAudioPlayerRef"
        @audio-processed="handleAudioProcessed"
        @trigger-auto-play="playOverlapping"
      />

      <!-- Central Playback Controls -->
      <CentralPlaybackControls
        @recorded="handleRecordedAudio"
        @recording-started="handleRecordingStarted"
        @recording-stopped="handleRecordingStopped"
        @play-target="playTarget"
        @play-user="playUser"
        @play-overlapping="playOverlapping"
        @play-sequential="playSequentialWithDelay"
        @stop-all="stopAll"
        @speed-change="handleSpeedChange"
      />

      <!-- Audio Processing Controls -->
      <AudioProcessingControls
        :autoPlayBoth="audioVisualizationPanel?.autoPlayBoth || false"
        :autoAlignEnabled="audioVisualizationPanel?.autoAlignEnabled || false"
        :vadReady="audioVisualizationPanel?.vadReady || false"
        :isProcessing="audioVisualizationPanel?.isProcessing || false"
        :sequentialDelay="audioVisualizationPanel?.sequentialDelay || 0"
        @toggle-auto-play="toggleAutoPlay"
        @toggle-auto-align="toggleAutoAlign"
        @manual-align="manualAlign"
        @show-vad-settings="showVADSettings"
        @update-sequential-delay="updateSequentialDelay"
      />

      <!-- Recording Actions -->
      <RecordingActions
        :currentRecording="currentRecording"
        @save-recording="handleSaveRecording"
        @mark-completed="handleMarkCompleted"
      />

      <!-- Saved Recordings Section -->
      <SavedRecordingsSection
        @load-recording="handleLoadRecording"
        @delete-recording="handleDeleteRecording"
      />

      <!-- Recording Sets Manager -->
      <RecordingSetsManager />
    </div>

    <!-- URL Input Modal -->
    <div v-if="showUrlModal" class="modal-overlay" @click="closeUrlModal">
      <div class="modal-content" @click.stop>
        <h3>🌐 Load Audio from URL</h3>
        <input 
          v-model="urlToLoad"
          type="url" 
          placeholder="Enter audio URL..."
          class="url-input"
          @keyup.enter="handleUrlSubmit"
        />
        <div class="modal-actions">
          <button @click="handleUrlSubmit" class="load-btn" :disabled="!urlToLoad.trim()">
            Load Audio
          </button>
          <button @click="closeUrlModal" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>

    <!-- VAD Settings Modal -->
    <div v-if="showVadModal" class="modal-overlay" @click="closeVadModal">
      <div class="modal-content" @click.stop>
        <h3>🎛️ VAD Settings</h3>
        <div class="vad-settings">
          <div class="setting-group">
            <label>Padding (seconds): {{ vadSettings.padding }}</label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1"
              :value="vadSettings.padding"
              @input="vadSettings.padding = parseFloat($event.target.value)"
            />
          </div>
          <div class="setting-group">
            <label>Threshold: {{ vadSettings.threshold }}</label>
            <input 
              type="range" 
              min="0.1" 
              max="1" 
              step="0.05"
              :value="vadSettings.threshold"
              @input="vadSettings.threshold = parseFloat($event.target.value)"
            />
          </div>
        </div>
        <div class="modal-actions">
          <button @click="handleVADSettingsSave(vadSettings)" class="save-btn">
            Save Settings
          </button>
          <button @click="closeVadModal" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
    
    <!-- Recording Manager -->
    <RecordingManager
      ref="recordingManager"
      @recording-saved="handleRecordingSaved"
      @recording-deleted="handleRecordingDeleted"
      @recording-loaded="handleRecordingLoaded"
      @recording-completed="handleRecordingCompleted"
      @operation-error="handleOperationError"
    />
    
    <!-- Recording State Manager -->
    <RecordingStateManager
      ref="recordingStateManager"
      @recording-started="handleRecordingStarted"
      @recording-stopped="handleRecordingStopped"
      @recording-completed="handleRecordedAudio"
      @state-changed="handleRecordingStateChanged"
    />
    
    <!-- Audio Processing Handler -->
    <AudioProcessingHandler
      ref="audioProcessingHandler"
      :audioVisualizationPanel="audioVisualizationPanel"
      @auto-play-toggled="handleAutoPlayToggled"
      @auto-align-toggled="handleAutoAlignToggled"
      @manual-align-triggered="handleManualAlignTriggered"
      @sequential-delay-updated="handleSequentialDelayUpdated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import RecordingNavigation from '../components/RecordingNavigation.vue';
import SessionStats from '../components/SessionStats.vue';
import RecordingSetsManager from '../components/RecordingSetsManager.vue';
import AudioVisualizationPanel from '../components/AudioVisualizationPanel.vue';
import MainHeader from '../components/MainHeader.vue';
import CentralPlaybackControls from '../components/CentralPlaybackControls.vue';
import AudioProcessingControls from '../components/AudioProcessingControls.vue';
import RecordingActions from '../components/RecordingActions.vue';
import SavedRecordingsSection from '../components/SavedRecordingsSection.vue';
import RecordingManager from '../components/RecordingManager.vue';
import RecordingStateManager from '../components/RecordingStateManager.vue';
import AudioProcessingHandler from '../components/AudioProcessingHandler.vue';
import { useIndexedDB } from '../composables/useIndexedDB.ts';
import { useRecordingSets } from '../composables/useRecordingSets';
import { useAppState } from '../composables/useAppState';
import { useAppUtilities } from '../composables/useAppUtilities';
import { usePlaybackControls } from '../composables/usePlaybackControls';

// IMPORTANT: Initialize global app state FIRST to provide it to all child components
const {
  globalPlaybackSpeed,
  isRecordingActive,
  vadSettings,
  targetAudioPlayerRef,
  userAudioPlayerRef,
  audioVisualizationPanel,
  hasTargetAudio,
  hasUserAudio,
  getTargetBlob,
  getUserBlob,
  updateVadSettings,
  updatePlaybackSpeed,
  setRecordingActive,
  setTargetAudioPlayerRef,
  setUserAudioPlayerRef,
  setAudioVisualizationPanel
} = useAppState()

// Core composables
const { initDB } = useIndexedDB()
const { currentRecording, updateUserRecording } = useRecordingSets()

// Since we're in the same component that provides the state, pass it directly
// to avoid provide/inject within the same component (which doesn't work in Vue setup)
const appStateForComposables = {
  audioVisualizationPanel,
  vadSettings,
  updateVadSettings,
  targetAudioPlayerRef,
  userAudioPlayerRef,
  globalPlaybackSpeed,
  updatePlaybackSpeed
}

// Consolidated utilities - pass app state directly since we're in the provider component
const {
  showUrlModal,
  showVadModal,
  urlToLoad,
  triggerFileInput,
  loadAudioFromUrl,
  openUrlModal,
  closeUrlModal,
  handleUrlSubmit,
  openVadModal,
  closeVadModal,
  handleVadSettingsSave: handleVadSettingsSaveUtil,
  saveRecording: saveRecordingUtil,
  loadSavedRecording,
  deleteSavedRecording,
  cleanup
} = useAppUtilities(appStateForComposables)

// Consolidated playback controls - pass app state directly
const {
  playTarget,
  playUser,
  playOverlapping,
  playSequential,
  stopAll,
  updatePlaybackSpeed: updatePlaybackSpeedDirect
} = usePlaybackControls(appStateForComposables)

// Remaining component refs (will be further consolidated)
const recordingManager = ref(null)
const recordingStateManager = ref(null)
const audioProcessingHandler = ref(null)

onMounted(async () => {
  await initDB()
})

// Audio Visualization Panel event handlers
const handleTargetAudioPlayerRef = (ref) => {
  setTargetAudioPlayerRef(ref)
}

const handleUserAudioPlayerRef = (ref) => {
  setUserAudioPlayerRef(ref)
}

const handleAudioProcessed = (data) => {
  console.log('Audio processed:', data)
}

// Simplified event handlers using utilities
const showUrlModalHandler = () => openUrlModal()
const showVADSettings = () => openVadModal()

const handleVADSettingsSave = (newSettings) => {
  handleVadSettingsSaveUtil(newSettings)
}

// Recording Manager event handlers - simplified using utilities
const handleSaveRecording = async () => {
  const targetBlob = getTargetBlob()
  const userBlob = getUserBlob()
  
  try {
    await saveRecordingUtil(targetBlob, userBlob)
    alert('Recording saved!')
  } catch (error) {
    alert('Failed to save recording: ' + error.message)
  }
}

const handleMarkCompleted = () => {
  recordingManager.value?.markCurrentCompleted(currentRecording.value)
}

const handleLoadRecording = async (recording) => {
  try {
    await loadSavedRecording(recording)
  } catch (error) {
    console.error('Failed to load recording:', error)
  }
}

const handleDeleteRecording = (id) => {
  try {
    deleteSavedRecording(id)
    console.log('Recording deleted successfully')
  } catch (error) {
    console.error('Failed to delete recording:', error)
  }
}

// Recording State Manager event handlers
const handleRecordingStarted = () => {
  setRecordingActive(true)
  console.log('Recording started in PracticeView')
}

const handleRecordingStopped = () => {
  setRecordingActive(false)
  console.log('Recording stopped in PracticeView')
}

const handleRecordedAudio = async (blob) => {
  // Delegate audio processing to AudioVisualizationPanel
  if (audioVisualizationPanel.value) {
    await audioVisualizationPanel.value.processUserAudio(blob)
  }
  
  // Update the current recording if we have an active set
  if (currentRecording.value && blob) {
    const userUrl = audioVisualizationPanel.value?.getUserUrl()
    if (userUrl) {
      updateUserRecording(blob, userUrl)
    }
  }
}


// Playback event handlers - now direct calls to composable  
const playSequentialWithDelay = () => {
  const delay = audioVisualizationPanel.value?.sequentialDelay || 0
  playSequential(delay)
}

const handleSpeedChange = (newSpeed) => {
  updatePlaybackSpeedDirect(newSpeed)
}

// Audio Processing Handler event handlers
const toggleAutoPlay = (event) => audioProcessingHandler.value?.toggleAutoPlay(event)
const toggleAutoAlign = (event) => audioProcessingHandler.value?.toggleAutoAlign(event)
const manualAlign = () => audioProcessingHandler.value?.manualAlign()
const updateSequentialDelay = (event) => audioProcessingHandler.value?.updateSequentialDelay(event)

// Recording Manager event handlers that are still needed for components
const handleRecordingSaved = () => console.log('Recording saved successfully')
const handleRecordingDeleted = () => console.log('Recording deleted successfully')
const handleRecordingLoaded = (recording) => console.log('Recording loaded:', recording)
const handleRecordingCompleted = (recording) => console.log('Recording marked as completed:', recording)
const handleOperationError = ({ message }) => alert(message)
const handleRecordingStateChanged = ({ isRecording }) => console.log('Recording state changed:', isRecording)

// Audio Processing Handler event handlers - simplified logging
const handleAutoPlayToggled = (value) => console.log('Auto-play toggled:', value)
const handleAutoAlignToggled = (value) => console.log('Auto-align toggled:', value)
const handleManualAlignTriggered = () => console.log('Manual alignment triggered')
const handleSequentialDelayUpdated = (value) => console.log('Sequential delay updated:', value)

// Watch for recording changes to load target audio
watch(currentRecording, async (newRecording, oldRecording) => {
  if (newRecording && newRecording !== oldRecording && newRecording.audioBlob && audioVisualizationPanel.value) {
    try {
      await audioVisualizationPanel.value.setTargetAudio(newRecording.audioBlob, {
        name: newRecording.name,
        fileName: newRecording.metadata?.fileName,
        source: 'folder'
      })
      console.log('✅ FOLDER PROCESSING: Successfully processed folder recording')
    } catch (error) {
      console.error('❌ FOLDER PROCESSING: Failed to process folder recording:', error)
    }
  } else if (!newRecording && audioVisualizationPanel.value) {
    console.log('🗑️ FOLDER PROCESSING: Clearing target audio (no recording selected)')
    await audioVisualizationPanel.value.setTargetAudio(null)
  }
})
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

/* Modal styles */
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
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  max-width: 400px;
  margin: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.url-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  backdrop-filter: blur(10px);
  margin-bottom: 16px;
}

.url-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.url-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.vad-settings {
  text-align: left;
  margin-bottom: 16px;
}

.setting-group {
  margin-bottom: 12px;
}

.setting-group label {
  display: block;
  color: white;
  font-size: 14px;
  margin-bottom: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.setting-group input[type="range"] {
  width: 100%;
  margin: 4px 0;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.load-btn, .save-btn {
  background: rgba(59, 130, 246, 0.9);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 500;
  backdrop-filter: blur(10px);
  transition: all 0.2s;
}

.load-btn:hover, .save-btn:hover {
  background: rgba(37, 99, 235, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.load-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 500;
  backdrop-filter: blur(10px);
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }
  
  .modal-content {
    max-width: 90vw;
    margin: 20px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}
</style>
