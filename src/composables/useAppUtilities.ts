import { ref, type Ref } from 'vue'
import { useAppStateInject, type AppState, type VADSettings } from './useAppState'


// Import from useAppState to ensure consistency
import type { AudioVisualizationPanel as ImportedAudioVisualizationPanel } from './useAppState'

interface LocalAppState {
  audioVisualizationPanel: Ref<ImportedAudioVisualizationPanel | null>;
  vadSettings: Ref<VADSettings>;
  updateVadSettings: (newSettings: Partial<VADSettings>) => void;
  updateAppSettings?: (newSettings: any) => void;
}

/**
 * Consolidated app utilities composable
 * Replaces FileUploadManager, AudioLoadingManager, and ModalManager components
 * with a single, more efficient utility system
 */
export function useAppUtilities(providedAppState: AppState | null = null) {
  // Use provided app state if available, otherwise try to inject, otherwise create local state
  let appState: AppState | LocalAppState
  
  if (providedAppState) {
    appState = providedAppState
  } else {
    try {
      appState = useAppStateInject()
    } catch (error) {
      // If no app state is available, create local refs
      console.warn('useAppUtilities: No app state available, using local state')
      appState = {
        audioVisualizationPanel: ref<ImportedAudioVisualizationPanel | null>(null),
        vadSettings: ref<VADSettings>({
          padding: 0.2,
          threshold: 0.25,
          minSpeechDuration: 50,
          maxSilenceDuration: 500,
          maxTrimStart: 3.0,
          maxTrimEnd: 2.0
        }),
        updateVadSettings: (newSettings: Partial<VADSettings>) => {
          (appState as LocalAppState).vadSettings.value = { ...(appState as LocalAppState).vadSettings.value, ...newSettings }
        }
      }
    }
  }
  
  const { audioVisualizationPanel, vadSettings, updateVadSettings } = appState

  // Modal states
  const showUrlModal = ref<boolean>(false)
  const showVadModal = ref<boolean>(false)
  const showAppSettingsModal = ref<boolean>(false)
  const showAudioProcessingGuide = ref<boolean>(false)
  const urlToLoad = ref<string>('')

  // File input ref for triggering file selection
  const fileInputRef = ref<HTMLInputElement | null>(null)

  // Create hidden file input element on first use
  const createFileInput = (): HTMLInputElement => {
    if (!fileInputRef.value) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'audio/*'
      input.style.display = 'none'
      input.addEventListener('change', handleFileInputChange)
      document.body.appendChild(input)
      fileInputRef.value = input
    }
    return fileInputRef.value
  }

  // File handling
  const triggerFileInput = (): void => {
    const input = createFileInput()
    input.click()
  }

  const handleFileInputChange = async (event: Event): Promise<void> => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file && audioVisualizationPanel.value) {
      try {
        await audioVisualizationPanel.value.setTargetAudio?.(file, {
          name: file.name,
          fileName: file.name,
          source: 'file'
        })
        console.log('✅ File loaded successfully:', file.name)
      } catch (error) {
        console.error('❌ Failed to load file:', error)
        alert('Failed to load audio file: ' + (error as Error).message)
      }
    }
    // Clear the input for future selections
    target.value = ''
  }

  // URL loading
  const loadAudioFromUrl = async (url: string): Promise<void> => {
    if (!url || !audioVisualizationPanel.value) return

    try {
      console.log('🌐 Loading audio from URL:', url)
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const blob = await response.blob()
      
      // Validate it's an audio file
      if (!blob.type.startsWith('audio/')) {
        throw new Error('URL does not point to an audio file')
      }

      await audioVisualizationPanel.value.setTargetAudio?.(blob, {
        name: url.split('/').pop() || 'Remote Audio',
        fileName: url.split('/').pop() || 'remote-audio',
        source: 'url'
      })

      console.log('✅ URL audio loaded successfully')
    } catch (error) {
      console.error('❌ Failed to load audio from URL:', error)
      alert(`Failed to load audio from URL: ${(error as Error).message}`)
    }
  }

  // Modal management
  const openUrlModal = (): void => {
    showUrlModal.value = true
    urlToLoad.value = ''
  }

  const closeUrlModal = (): void => {
    showUrlModal.value = false
    urlToLoad.value = ''
  }

  const handleUrlSubmit = async (): Promise<void> => {
    if (urlToLoad.value.trim()) {
      await loadAudioFromUrl(urlToLoad.value.trim())
      closeUrlModal()
    }
  }

  const openVadModal = (): void => {
    showVadModal.value = true
  }

  const closeVadModal = (): void => {
    showVadModal.value = false
  }

  const handleVadSettingsSave = (newSettings: Partial<VADSettings>): void => {
    updateVadSettings(newSettings)
    closeVadModal()
  }

  const openAppSettingsModal = (): void => {
    showAppSettingsModal.value = true
  }

  const closeAppSettingsModal = (): void => {
    showAppSettingsModal.value = false
  }

  const handleAppSettingsSave = (newSettings: any): void => {
    if ('updateAppSettings' in appState && appState.updateAppSettings) {
      appState.updateAppSettings(newSettings)
    }
    closeAppSettingsModal()
  }

  const openAudioProcessingGuide = (): void => {
    showAudioProcessingGuide.value = true
  }

  const closeAudioProcessingGuide = (): void => {
    showAudioProcessingGuide.value = false
  }


  // Cleanup on unmount
  const cleanup = (): void => {
    if (fileInputRef.value) {
      document.body.removeChild(fileInputRef.value)
      fileInputRef.value = null
    }
  }

  return {
    // Modal states
    showUrlModal,
    showVadModal,
    showAppSettingsModal,
    showAudioProcessingGuide,
    urlToLoad,

    // File handling
    triggerFileInput,
    
    // URL loading
    loadAudioFromUrl,
    
    // Modal management
    openUrlModal,
    closeUrlModal,
    handleUrlSubmit,
    openVadModal,
    closeVadModal,
    handleVadSettingsSave,
    openAppSettingsModal,
    closeAppSettingsModal,
    handleAppSettingsSave,
    openAudioProcessingGuide,
    closeAudioProcessingGuide,
    
    // Cleanup
    cleanup
  }
}