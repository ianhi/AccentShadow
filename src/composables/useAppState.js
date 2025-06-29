import { ref, provide, inject, computed } from 'vue'

// Symbols for provide/inject to avoid naming conflicts
const APP_STATE_KEY = Symbol('appState')

/**
 * Global app state composable
 * Provides shared state across the entire application using Vue's provide/inject
 */
export function useAppState() {
  // Core application state
  const globalPlaybackSpeed = ref(1)
  const isRecordingActive = ref(false)
  
  // General app settings
  const appSettings = ref({
    autoPlayTargetOnUpload: true  // Play target audio immediately after upload
  })
  
  const vadSettings = ref({
    padding: 0.2,
    threshold: 0.25,
    minSpeechDuration: 50,
    maxSilenceDuration: 500,
    maxTrimStart: 3.0,
    maxTrimEnd: 2.0
  })

  // Audio player refs - shared across components
  const targetAudioPlayerRef = ref(null)
  const userAudioPlayerRef = ref(null)
  
  // Main component ref for audio operations
  const audioVisualizationPanel = ref(null)

  // Computed helpers
  const hasTargetAudio = computed(() => 
    audioVisualizationPanel.value?.getTargetBlob() ? true : false
  )
  
  const hasUserAudio = computed(() => 
    audioVisualizationPanel.value?.getUserBlob() ? true : false
  )

  // Audio helper methods
  const getTargetBlob = () => audioVisualizationPanel.value?.getTargetBlob() || null
  const getUserBlob = () => audioVisualizationPanel.value?.getUserBlob() || null

  // State update methods
  const updateVadSettings = (newSettings) => {
    vadSettings.value = { ...vadSettings.value, ...newSettings }
  }

  const updateAppSettings = (newSettings) => {
    appSettings.value = { ...appSettings.value, ...newSettings }
  }

  const updatePlaybackSpeed = (newSpeed) => {
    globalPlaybackSpeed.value = newSpeed
  }

  const setRecordingActive = (active) => {
    isRecordingActive.value = active
  }

  const setTargetAudioPlayerRef = (ref) => {
    targetAudioPlayerRef.value = ref
  }

  const setUserAudioPlayerRef = (ref) => {
    userAudioPlayerRef.value = ref
  }

  const setAudioVisualizationPanel = (ref) => {
    audioVisualizationPanel.value = ref
  }

  // Create the state object
  const appState = {
    // Reactive state
    globalPlaybackSpeed,
    isRecordingActive,
    appSettings,
    vadSettings,
    targetAudioPlayerRef,
    userAudioPlayerRef,
    audioVisualizationPanel,
    
    // Computed properties
    hasTargetAudio,
    hasUserAudio,
    
    // Helper methods
    getTargetBlob,
    getUserBlob,
    
    // State update methods
    updateVadSettings,
    updateAppSettings,
    updatePlaybackSpeed,
    setRecordingActive,
    setTargetAudioPlayerRef,
    setUserAudioPlayerRef,
    setAudioVisualizationPanel
  }

  // Provide the state for child components
  provide(APP_STATE_KEY, appState)

  return appState
}

/**
 * Inject app state in child components
 * @returns {object} The app state object
 */
export function useAppStateInject() {
  const appState = inject(APP_STATE_KEY)
  
  if (!appState) {
    throw new Error('useAppStateInject must be used within a component that calls useAppState()')
  }
  
  return appState
}