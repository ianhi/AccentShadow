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
        @load-url="showUrlModal"
        @show-vad-settings="showVADSettings"
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
        @show-vad-settings="showVADSettings"
        @update-sequential-delay="updateSequentialDelay"
      />

      <!-- Recording Actions -->
      <RecordingActions
        :hasTargetAudio="!!getTargetBlob()"
        :hasUserAudio="!!getUserBlob()"
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
    
    <!-- File Upload Manager -->
    <FileUploadManager
      ref="fileUploadManager"
      @file-selected="handleFileSelected"
    />
    
    <!-- Audio Loading Manager -->
    <AudioLoadingManager
      ref="audioLoadingManager"
      @audio-loaded="handleAudioLoaded"
      @loading-error="handleLoadingError"
    />
    
    <!-- Modal Manager -->
    <ModalManager
      ref="modalManager"
      :vadSettings="vadSettings"
      @url-load-requested="handleUrlLoadRequested"
      @vad-settings-saved="handleVADSettingsSave"
    />
    
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
    
    <!-- Playback Controller -->
    <PlaybackController
      ref="playbackController"
      :targetAudioPlayerRef="targetAudioPlayerRef"
      :userAudioPlayerRef="userAudioPlayerRef"
      :sequentialDelay="audioVisualizationPanel?.sequentialDelay || 0"
      :globalPlaybackSpeed="globalPlaybackSpeed"
      @playback-speed-updated="handlePlaybackSpeedUpdated"
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
import FileUploadManager from '../components/FileUploadManager.vue';
import AudioLoadingManager from '../components/AudioLoadingManager.vue';
import ModalManager from '../components/ModalManager.vue';
import RecordingManager from '../components/RecordingManager.vue';
import RecordingStateManager from '../components/RecordingStateManager.vue';
import PlaybackController from '../components/PlaybackController.vue';
import AudioProcessingHandler from '../components/AudioProcessingHandler.vue';
import { useIndexedDB } from '../composables/useIndexedDB.ts';
import { useRecordingSets } from '../composables/useRecordingSets';

// Core state and refs
const globalPlaybackSpeed = ref(1)
const isRecordingActive = ref(false)
const vadSettings = ref({
  padding: 0.2,
  threshold: 0.25,
  minSpeechDuration: 50,
  maxSilenceDuration: 500,
  maxTrimStart: 3.0,
  maxTrimEnd: 2.0
})

// Component refs
const audioVisualizationPanel = ref(null)
const fileUploadManager = ref(null)
const audioLoadingManager = ref(null)
const modalManager = ref(null)
const recordingManager = ref(null)
const recordingStateManager = ref(null)
const playbackController = ref(null)
const audioProcessingHandler = ref(null)

// Audio player refs (handled by AudioVisualizationPanel)
const targetAudioPlayerRef = ref(null)
const userAudioPlayerRef = ref(null)

// Core composables
const { initDB } = useIndexedDB()
const { currentRecording, updateUserRecording } = useRecordingSets()

onMounted(async () => {
  await initDB()
})

// Helper functions that delegate to AudioVisualizationPanel
const getTargetBlob = () => audioVisualizationPanel.value?.getTargetBlob() || null
const getUserBlob = () => audioVisualizationPanel.value?.getUserBlob() || null

// Audio Visualization Panel event handlers
const handleTargetAudioPlayerRef = (ref) => {
  targetAudioPlayerRef.value = ref
}

const handleUserAudioPlayerRef = (ref) => {
  userAudioPlayerRef.value = ref
}

const handleAudioProcessed = (data) => {
  console.log('Audio processed:', data)
}

// File Upload Manager event handlers
const triggerFileInput = () => fileUploadManager.value?.triggerFileInput()

const handleFileSelected = async ({ file, source }) => {
  if (audioVisualizationPanel.value) {
    await audioVisualizationPanel.value.setTargetAudio(file, source)
  }
}

// Audio Loading Manager event handlers
const handleUrlLoadRequested = (url) => {
  audioLoadingManager.value?.loadAudioFromUrl(url)
}

const handleAudioLoaded = async ({ blob, source }) => {
  if (audioVisualizationPanel.value) {
    await audioVisualizationPanel.value.setTargetAudio(blob, source)
  }
}

const handleLoadingError = ({ message }) => {
  alert(message)
}

// Modal Manager event handlers
const showUrlModal = () => modalManager.value?.showUrlModal()
const showVADSettings = () => modalManager.value?.showVadModal()

const handleVADSettingsSave = (newSettings) => {
  vadSettings.value = { ...newSettings }
}

// Recording Manager event handlers
const handleSaveRecording = () => {
  const targetBlob = getTargetBlob()
  const userBlob = getUserBlob()
  recordingManager.value?.saveRecording(targetBlob, userBlob)
}

const handleMarkCompleted = () => {
  recordingManager.value?.markCurrentCompleted(currentRecording.value)
}

const handleLoadRecording = (recording) => {
  recordingManager.value?.loadSavedRecording(recording)
}

const handleDeleteRecording = (id) => {
  recordingManager.value?.deleteSavedRecording(id)
}

const handleRecordingSaved = () => {
  alert('Recording saved!')
}

const handleRecordingDeleted = () => {
  console.log('Recording deleted successfully')
}

const handleRecordingLoaded = (recording) => {
  console.log('Recording loaded:', recording)
}

const handleRecordingCompleted = (recording) => {
  console.log('Recording marked as completed:', recording)
}

const handleOperationError = ({ message }) => {
  alert(message)
}

// Recording State Manager event handlers
const handleRecordingStarted = () => {
  isRecordingActive.value = true
  console.log('Recording started in PracticeView')
}

const handleRecordingStopped = () => {
  isRecordingActive.value = false
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

const handleRecordingStateChanged = ({ isRecording }) => {
  console.log('Recording state changed:', isRecording)
}

// Playback Controller event handlers
const playTarget = () => playbackController.value?.playTarget()
const playUser = () => playbackController.value?.playUser()
const playOverlapping = () => playbackController.value?.playOverlapping()
const playSequential = () => playbackController.value?.playSequential()
const stopAll = () => playbackController.value?.stopAll()
const updatePlaybackSpeed = (newSpeed) => playbackController.value?.updatePlaybackSpeed(newSpeed)

const handlePlaybackSpeedUpdated = (newSpeed) => {
  globalPlaybackSpeed.value = newSpeed
}

// Audio Processing Handler event handlers
const toggleAutoPlay = (event) => audioProcessingHandler.value?.toggleAutoPlay(event)
const toggleAutoAlign = (event) => audioProcessingHandler.value?.toggleAutoAlign(event)
const manualAlign = () => audioProcessingHandler.value?.manualAlign()
const updateSequentialDelay = (event) => audioProcessingHandler.value?.updateSequentialDelay(event)

const handleAutoPlayToggled = (value) => {
  console.log('Auto-play toggled:', value)
}

const handleAutoAlignToggled = (value) => {
  console.log('Auto-align toggled:', value)
}

const handleManualAlignTriggered = () => {
  console.log('Manual alignment triggered')
}

const handleSequentialDelayUpdated = (value) => {
  console.log('Sequential delay updated:', value)
}

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

/* Mobile responsive */
@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }
}
</style>
