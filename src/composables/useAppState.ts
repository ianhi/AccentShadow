import { ref, provide, inject, computed, type Ref, type ComputedRef, type InjectionKey } from 'vue'
import { audioManager } from './useAudioManager'

// Types
export interface AppSettings {
  autoPlayTargetOnUpload: boolean;
  autoPlayBothAfterRecording: boolean;
  autoAlignEnabled: boolean;
  sequentialDelay: number;
  // Volume normalization settings
  volumeNormalizationEnabled: boolean;
  volumeNormalizationTargetLUFS: number;
  volumeNormalizationMaxGain: number;
  volumeNormalizationBalanceMode: 'target' | 'user' | 'average';
  volumeNormalizationSmoothTransitions: boolean;
}

export interface VADSettings {
  padding: number;
  threshold: number;
  minSpeechDuration: number;
  maxSilenceDuration: number;
  maxTrimStart: number;
  maxTrimEnd: number;
}

export interface AudioVisualizationPanel {
  getTargetBlob?: () => Blob | null;
  getUserBlob?: () => Blob | null;
  setTargetAudio?: (blob: Blob | null, metadata?: any) => Promise<void>;
  processUserAudio?: (blob: Blob) => Promise<void>;
}

export interface AudioPlayer {
  play?: () => void;
  stop?: () => void;
  isReady?: boolean;
}

export interface AppState {
  // Reactive state
  globalPlaybackSpeed: Ref<number>;
  isRecordingActive: Ref<boolean>;
  appSettings: Ref<AppSettings>;
  vadSettings: Ref<VADSettings>;
  targetAudioPlayerRef: Ref<AudioPlayer | null>;
  userAudioPlayerRef: Ref<AudioPlayer | null>;
  audioVisualizationPanel: Ref<AudioVisualizationPanel | null>;
  
  // Computed properties
  hasTargetAudio: ComputedRef<boolean>;
  hasUserAudio: ComputedRef<boolean>;
  
  // Helper methods
  getTargetBlob: () => Blob | null;
  getUserBlob: () => Blob | null;
  
  // State update methods
  updateVadSettings: (newSettings: Partial<VADSettings>) => void;
  updateAppSettings: (newSettings: Partial<AppSettings>) => void;
  updatePlaybackSpeed: (newSpeed: number) => void;
  setRecordingActive: (active: boolean) => void;
  setTargetAudioPlayerRef: (ref: AudioPlayer | null) => void;
  setUserAudioPlayerRef: (ref: AudioPlayer | null) => void;
  setAudioVisualizationPanel: (ref: AudioVisualizationPanel | null) => void;
}

// Symbols for provide/inject to avoid naming conflicts
const APP_STATE_KEY: InjectionKey<AppState> = Symbol('appState')

/**
 * Global app state composable
 * Provides shared state across the entire application using Vue's provide/inject
 */
export function useAppState(): AppState {
  // Core application state
  const globalPlaybackSpeed = ref<number>(1)
  const isRecordingActive = ref<boolean>(false)
  
  // General app settings
  const appSettings = ref<AppSettings>({
    autoPlayTargetOnUpload: true,  // Play target audio immediately after upload
    autoPlayBothAfterRecording: true,  // Play both audios after recording
    autoAlignEnabled: true,  // Automatic silence trimming with VAD
    sequentialDelay: 0,  // Delay between sequential audio playback (ms)
    // Volume normalization settings
    volumeNormalizationEnabled: true,  // Enable volume normalization for overlapping playback
    volumeNormalizationTargetLUFS: -18,  // Target LUFS level for speech content
    volumeNormalizationMaxGain: 6,  // Maximum gain amplification (6x = 15.6 dB) - increased for better handling
    volumeNormalizationBalanceMode: 'average',  // Balance mode: target, user, or average
    volumeNormalizationSmoothTransitions: true  // Enable smooth volume transitions
  })
  
  const vadSettings = ref<VADSettings>({
    padding: 0.2,
    threshold: 0.25,
    minSpeechDuration: 50,
    maxSilenceDuration: 500,
    maxTrimStart: 3.0,
    maxTrimEnd: 2.0
  })

  // Audio player refs - shared across components
  const targetAudioPlayerRef = ref<AudioPlayer | null>(null)
  const userAudioPlayerRef = ref<AudioPlayer | null>(null)
  
  // Main component ref for audio operations
  const audioVisualizationPanel = ref<AudioVisualizationPanel | null>(null)

  // Computed helpers
  const hasTargetAudio = computed(() => 
    audioVisualizationPanel.value?.getTargetBlob?.() ? true : false
  )
  
  const hasUserAudio = computed(() => 
    audioVisualizationPanel.value?.getUserBlob?.() ? true : false
  )

  // Audio helper methods
  const getTargetBlob = (): Blob | null => audioVisualizationPanel.value?.getTargetBlob?.() || null
  const getUserBlob = (): Blob | null => audioVisualizationPanel.value?.getUserBlob?.() || null

  // State update methods
  const updateVadSettings = (newSettings: Partial<VADSettings>): void => {
    vadSettings.value = { ...vadSettings.value, ...newSettings }
  }

  const updateAppSettings = (newSettings: Partial<AppSettings>): void => {
    appSettings.value = { ...appSettings.value, ...newSettings }
    
    // Sync volume normalization settings with audio manager
    if (newSettings.volumeNormalizationEnabled !== undefined ||
        newSettings.volumeNormalizationTargetLUFS !== undefined ||
        newSettings.volumeNormalizationMaxGain !== undefined ||
        newSettings.volumeNormalizationBalanceMode !== undefined ||
        newSettings.volumeNormalizationSmoothTransitions !== undefined) {
      
      audioManager.updateVolumeNormalizationConfig({
        enabled: appSettings.value.volumeNormalizationEnabled,
        targetLUFS: appSettings.value.volumeNormalizationTargetLUFS,
        maxGain: appSettings.value.volumeNormalizationMaxGain,
        balanceMode: appSettings.value.volumeNormalizationBalanceMode,
        smoothTransitions: appSettings.value.volumeNormalizationSmoothTransitions
      })
      
      console.log('🎚️ Volume normalization settings synced with audio manager')
    }
  }

  const updatePlaybackSpeed = (newSpeed: number): void => {
    globalPlaybackSpeed.value = newSpeed
  }

  const setRecordingActive = (active: boolean): void => {
    isRecordingActive.value = active
  }

  const setTargetAudioPlayerRef = (ref: AudioPlayer | null): void => {
    targetAudioPlayerRef.value = ref
  }

  const setUserAudioPlayerRef = (ref: AudioPlayer | null): void => {
    userAudioPlayerRef.value = ref
  }

  const setAudioVisualizationPanel = (ref: AudioVisualizationPanel | null): void => {
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
 * @returns The app state object
 */
export function useAppStateInject(): AppState {
  const appState = inject(APP_STATE_KEY)
  
  if (!appState) {
    throw new Error('useAppStateInject must be used within a component that calls useAppState()')
  }
  
  return appState
}