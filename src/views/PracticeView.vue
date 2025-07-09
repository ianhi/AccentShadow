<template>
  <div class="practice-view" :class="{ 'mobile-layout': shouldUseMobileLayout }">
    <div class="main-content">
      <MainHeader @open-settings="openAppSettingsModal" @open-guide="openAudioProcessingGuide" />
      
      <!-- Unified Audio Controls - Always visible -->
      <UnifiedAudioControls 
        :currentAudioSource="currentAudioSource"
        :availableDevices="availableDevices"
        :selectedDeviceId="selectedDeviceId"
        :isRecording="isRecordingActive"
        @browse-file="triggerFileInput"
        @load-url="showUrlModalHandler"
        @load-demo="handleLoadDemo"
        @device-change="handleMicrophoneDeviceChange"
      />
      
      <!-- Audio Visualization Panel - Always visible -->
      <AudioVisualizationPanel
        :ref="setAudioVisualizationPanel"
        :currentRecording="currentRecording"
        :isRecording="isRecordingActive"
        :vadSettings="vadSettings"
        :appSettings="appSettings"
        @target-audio-ref="handleTargetAudioPlayerRef"
        @user-audio-ref="handleUserAudioPlayerRef"
        @audio-processed="handleAudioProcessed"
        @trigger-auto-play="playOverlapping"
      />

      <!-- Central Playback Controls - Always visible, sticky on mobile -->
      <div class="playback-controls-container" :class="{ 'sticky-controls': shouldUseMobileLayout }">
        <CentralPlaybackControls
          :selectedDeviceId="selectedDeviceId"
          :availableDevices="availableDevices"
          @recorded="handleRecordedAudio"
          @recording-started="handleRecordingStarted"
          @recording-stopped="handleRecordingStopped"
          @play-target="playTarget"
          @play-user="playUser"
          @play-overlapping="playOverlapping"
          @play-sequential="playSequentialWithDelay"
          @stop-all="stopAll"
          @speed-change="handleSpeedChange"
          @device-change="handleMicrophoneDeviceChange"
        />
      </div>

      <!-- Session Stats - Hidden on mobile unless toggled -->
      <SessionStats v-if="!shouldUseMobileLayout || showStatsOnMobile" />

      <!-- Desktop-only components -->
      <template v-if="!shouldUseMobileLayout">
        <!-- Recording Actions -->
        <RecordingActions
          :currentRecording="currentRecording"
          @mark-completed="handleMarkCompleted"
        />
      </template>
    </div>




    <!-- URL Input Modal -->
    <div v-if="showUrlModal" class="modal-overlay" @click="unlockScroll(); closeUrlModal()">
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
          <button @click="unlockScroll(); closeUrlModal()" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>

    
    <!-- Recording Manager -->
    <RecordingManager
      ref="recordingManager"
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
    
    <!-- App Settings Modal -->
    <AppSettingsModal
      :isOpen="showAppSettingsModal"
      :settings="appSettings"
      @close="closeAppSettingsModal"
      @save="handleAppSettingsSave"
      @save-effects="handleAppEffectsSave"
      @open-vad-settings="openVadSettingsFromApp"
      @manual-trim="manualAlign"
    />
    
    <!-- Audio Processing Guide Modal -->
    <AudioProcessingGuideModal
      :isVisible="showAudioProcessingGuide"
      @close="closeAudioProcessingGuide"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue';
import UnifiedAudioControls from '../components/UnifiedAudioControls.vue';
import SessionStats from '../components/SessionStats.vue';
import AudioVisualizationPanel from '../components/AudioVisualizationPanel.vue';
import MainHeader from '../components/MainHeader.vue';
import CentralPlaybackControls from '../components/CentralPlaybackControls.vue';
import RecordingActions from '../components/RecordingActions.vue';
import RecordingManager from '../components/RecordingManager.vue';
import RecordingStateManager from '../components/RecordingStateManager.vue';
import AudioProcessingHandler from '../components/AudioProcessingHandler.vue';
import AppSettingsModal from '../components/AppSettingsModal.vue';
import AudioProcessingGuideModal from '../components/AudioProcessingGuideModal.vue';
import MicrophoneSelector from '../components/MicrophoneSelector.vue';
import { useRecordingSets } from '../composables/useRecordingSets';
import { useAppState, type VADSettings } from '../composables/useAppState';
import { useAppUtilities } from '../composables/useAppUtilities';
import { usePlaybackControls } from '../composables/usePlaybackControls';
import { useViewport } from '../composables/useViewport';
import { useMicrophoneDevices } from '../composables/useMicrophoneDevices.ts';
import { useAudioEffects } from '../composables/useAudioEffects';
import { useDemoData } from '../composables/useDemoData';
import { useModalScrollLock } from '../composables/useModalScrollLock';

// IMPORTANT: Initialize global app state FIRST to provide it to all child components
const {
  globalPlaybackSpeed,
  isRecordingActive,
  appSettings,
  vadSettings,
  targetAudioPlayerRef,
  userAudioPlayerRef,
  audioVisualizationPanel,
  hasTargetAudio,
  hasUserAudio,
  getTargetBlob,
  getUserBlob,
  updateVadSettings,
  updateAppSettings,
  updatePlaybackSpeed,
  setRecordingActive,
  setTargetAudioPlayerRef,
  setUserAudioPlayerRef,
  setAudioVisualizationPanel
} = useAppState()

// Core composables
const { currentRecording, updateUserRecording } = useRecordingSets()
const { updateConfig: updateEffectsConfig } = useAudioEffects()
const { shouldRequestMicrophonePermission, requestMicrophonePermissionForReturningUser, loadDemoData, isLoadingDemo } = useDemoData()

// Mobile layout detection
const { shouldUseMobileLayout } = useViewport()

// Microphone devices for mobile settings
const { availableDevices, selectedDeviceId, setSelectedDevice } = useMicrophoneDevices()

// Modal scroll lock
const { lockScroll, unlockScroll } = useModalScrollLock()

// Mobile layout state
const showStatsOnMobile = ref(false)


// Audio source state for unified controls
const currentAudioSource = ref('')

// Update currentAudioSource when audio is loaded
const updateAudioSource = (source: any) => {
  if (source && source.name) {
    currentAudioSource.value = source.name
  } else {
    currentAudioSource.value = ''
  }
}


// Since we're in the same component that provides the state, pass it directly
// to avoid provide/inject within the same component (which doesn't work in Vue setup)
const appStateForComposables = {
  audioVisualizationPanel,
  appSettings,
  updateAppSettings,
  vadSettings,
  updateVadSettings,
  targetAudioPlayerRef,
  userAudioPlayerRef,
  globalPlaybackSpeed,
  updatePlaybackSpeed,
  isRecordingActive,
  hasTargetAudio,
  hasUserAudio,
  getTargetBlob,
  getUserBlob,
  setRecordingActive,
  setTargetAudioPlayerRef,
  setUserAudioPlayerRef,
  setAudioVisualizationPanel
}

// Consolidated utilities - pass app state directly since we're in the provider component
const {
  showUrlModal,
  showVadModal,
  showAppSettingsModal,
  showAudioProcessingGuide,
  urlToLoad,
  triggerFileInput: triggerFileInputOriginal,
  loadAudioFromUrl: loadAudioFromUrlOriginal,
  openUrlModal,
  closeUrlModal,
  handleUrlSubmit: handleUrlSubmitOriginal,
  openVadModal,
  closeVadModal,
  handleVadSettingsSave: handleVadSettingsSaveUtil,
  openAppSettingsModal,
  closeAppSettingsModal,
  handleAppSettingsSave,
  openAudioProcessingGuide,
  closeAudioProcessingGuide,
  cleanup
} = useAppUtilities(appStateForComposables)

// Wrap file input to track single file loads
const triggerFileInput = () => {
  // Create a custom file input to intercept the file name
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'audio/*'
  input.style.display = 'none'
  
  input.addEventListener('change', async (event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file && audioVisualizationPanel.value) {
      try {
        currentAudioSource.value = file.name
        await audioVisualizationPanel.value.setTargetAudio?.(file, {
          name: file.name,
          fileName: file.name,
          source: 'file'
        })
        console.log('✅ File loaded successfully:', file.name)
      } catch (error) {
        console.error('❌ Failed to load file:', error)
        currentAudioSource.value = ''
        alert('Failed to load audio file: ' + (error as Error).message)
      }
    }
    // Clear the input
    target.value = ''
    document.body.removeChild(input)
  })
  
  document.body.appendChild(input)
  input.click()
}

// Wrap URL loading to track single file loads
const loadAudioFromUrl = async (url: string) => {
  try {
    const fileName = url.split('/').pop() || 'Remote Audio'
    currentAudioSource.value = fileName
    await loadAudioFromUrlOriginal(url)
  } catch (error) {
    currentAudioSource.value = ''
    throw error
  }
}

// Wrap URL submit handler
const handleUrlSubmit = async () => {
  await handleUrlSubmitOriginal()
  unlockScroll()
}

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
const recordingManager = ref<any>(null)
const recordingStateManager = ref<any>(null)
const audioProcessingHandler = ref<any>(null)

onMounted(async () => {
  // App initialization
  
  // Check if we should request microphone permission for returning users
  // This happens when users have visited before and won't see the demo modal
  if (shouldRequestMicrophonePermission.value) {
    // Add a small delay to let the UI initialize first
    setTimeout(async () => {
      try {
        console.log('🎤 Checking microphone permissions for returning user...');
        await requestMicrophonePermissionForReturningUser();
      } catch (error) {
        console.log('⚠️ Failed to check microphone permissions for returning user:', error);
        // Silently handle failure - user can still manually trigger permissions later
      }
    }, 1000);
  }
})

// Audio Visualization Panel event handlers
const handleTargetAudioPlayerRef = (ref: HTMLAudioElement | null) => {
  setTargetAudioPlayerRef(ref)
}

const handleUserAudioPlayerRef = (ref: HTMLAudioElement | null) => {
  setUserAudioPlayerRef(ref)
}

const handleAudioProcessed = async (data: { source?: { name: string } }) => {
  console.log('Audio processed:', data)
  // Update audio source if provided
  if (data && data.source) {
    updateAudioSource(data.source)
  }
  // Auto-play is now handled automatically by AudioPlayer when wavesurfer is ready
}

// Simplified event handlers using utilities
const showUrlModalHandler = () => {
  lockScroll()
  openUrlModal()
}

const handleLoadDemo = async () => {
  if (isLoadingDemo.value) {
    console.log('🔄 Demo already loading, skipping duplicate request')
    return
  }
  
  console.log('🎯 Loading demo data from main app...')
  const success = await loadDemoData()
  
  if (success) {
    console.log('✅ Demo data loaded successfully from main app')
  } else {
    console.error('❌ Demo data loading failed from main app')
    // Could show an error notification here
  }
}

const showVADSettings = () => openVadModal()

const handleVADSettingsSave = (newSettings: VADSettings) => {
  handleVadSettingsSaveUtil(newSettings)
}

const handleAppEffectsSave = (newEffectsConfig: Record<string, unknown>) => {
  console.log('🎚️ Saving audio effects configuration:', newEffectsConfig)
  updateEffectsConfig(newEffectsConfig)
}


const handleMarkCompleted = () => {
  recordingManager.value?.markCurrentCompleted?.(currentRecording.value)
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

const handleRecordedAudio = async (blob: Blob) => {
  // Delegate audio processing to AudioVisualizationPanel
  if (audioVisualizationPanel.value) {
    await audioVisualizationPanel.value.processUserAudio?.(blob)
  }
  
  // Update the current recording if we have an active set
  if (currentRecording.value && blob) {
    // getUserUrl method doesn't exist, use blob directly for now
    updateUserRecording(blob, URL.createObjectURL(blob))
  }
}


// Playback event handlers - now direct calls to composable  
const playSequentialWithDelay = () => {
  const delay = appSettings.value.sequentialDelay || 0
  playSequential(delay)
}

const handleSpeedChange = (newSpeed: number) => {
  updatePlaybackSpeedDirect(newSpeed)
}

// Manual align function - keep this as it's still needed for the "Trim Now" button
const manualAlign = () => audioProcessingHandler.value?.manualAlign?.()

// Recording Manager event handlers that are still needed for components
const handleRecordingCompleted = (recording: any) => console.log('Recording marked as completed:', recording)
const handleOperationError = ({ message }: { message: string }) => alert(message)
const handleRecordingStateChanged = ({ isRecording }: { isRecording: boolean }) => console.log('Recording state changed:', isRecording)

// Audio Processing Handler event handlers - simplified logging
const handleAutoPlayToggled = (value: boolean) => console.log('Auto-play toggled:', value)
const handleAutoAlignToggled = (value: boolean) => console.log('Auto-align toggled:', value)
const handleManualAlignTriggered = () => console.log('Manual alignment triggered')
const handleSequentialDelayUpdated = (value: number) => console.log('Sequential delay updated:', value)



const handleMicrophoneChange = (deviceId: string) => {
  setSelectedDevice(deviceId)
}

const handleMicrophoneDeviceChange = (deviceId: string) => {
  console.log('🎙️ Microphone device changed from AudioVisualizationPanel:', deviceId);
  setSelectedDevice(deviceId);
}

// Open VAD settings from the unified app settings modal
const openVadSettingsFromApp = () => {
  openVadModal()
}

// Watch for recording changes to load target audio
watch(currentRecording, async (newRecording, oldRecording) => {
  if (newRecording && newRecording !== oldRecording && newRecording.audioBlob && audioVisualizationPanel.value) {
    try {
      // Clear single file info when loading from recording set
      currentAudioSource.value = ''
      
      // Add delay for demo recordings to give user time to orient
      const isDemo = newRecording.metadata?.isDemo === true
      if (isDemo) {
        console.log('🎯 Demo recording detected, adding 500ms delay before loading')
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      await audioVisualizationPanel.value.setTargetAudio?.(newRecording.audioBlob, {
        name: newRecording.name,
        fileName: newRecording.metadata?.fileName,
        source: 'folder'
      })
      console.log('✅ Successfully processed recording')
    } catch (error) {
      console.error('❌ Failed to process recording:', error)
    }
  } else if (!newRecording && audioVisualizationPanel.value) {
    console.log('🗑️ Clearing target audio (no recording selected)')
    currentAudioSource.value = ''
    await audioVisualizationPanel.value.setTargetAudio?.(null)
  }
})
</script>

<style scoped>
.practice-view {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white;
  overflow-x: hidden;
}

.main-content {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

/* Component-specific styles moved to individual components */

.section {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: 20px 0;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
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
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
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

/* Mobile Layout Styles */
.mobile-layout .main-content {
  padding-bottom: 20px;
}

.sticky-controls {
  position: sticky;
  bottom: 20px;
  z-index: 50;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  margin: 12px 0;
}

/* Mobile Modal */
.mobile-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mobile-modal {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
}

.modal-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.mobile-settings-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mobile-microphone-section {
  background: rgba(255, 255, 255, 0.05);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mobile-microphone-section h4 {
  margin: 0 0 12px 0;
  color: white;
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 4px;
  min-width: 32px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* Animations */
.slide-left-enter-active, .slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from, .slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .practice-view {
    padding: 0;
  }
  
  .main-content {
    padding: 8px;
    max-width: 100%;
  }
  
  .modal-overlay {
    padding: 20px;
  }
  
  .modal-content {
    max-width: 100%;
    width: 100%;
    margin: 0;
    padding: 20px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  /* Prevent horizontal scroll on mobile */
  .section {
    width: 100%;
    box-sizing: border-box;
    margin: 8px 0;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 6px;
  }
  
  .modal-overlay {
    padding: 10px;
  }
  
  .modal-content {
    padding: 16px;
  }
  
  .section {
    padding: 12px;
    margin: 6px 0;
  }
}

/* Portrait-specific mobile styles */
@media (max-width: 768px) and (orientation: portrait) {
  .mobile-layout .main-content {
    padding: 6px;
    padding-bottom: 60px;
  }
  
  .sticky-controls {
    margin: 6px 0;
    bottom: 55px;
  }
}

/* Landscape mobile optimizations */
@media (max-width: 768px) and (orientation: landscape) {
  .modal-content {
    max-height: 85vh;
  }
  
  .modal-body {
    max-height: 60vh;
  }
}

/* Prevent horizontal scrolling on all screen sizes */
* {
  max-width: 100%;
  box-sizing: border-box;
}

/* Ensure no content overflows container */
.practice-view, .main-content, .section {
  overflow-x: hidden;
}
</style>
