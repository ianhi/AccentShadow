import { ref } from 'vue'
import { useAppStateInject } from './useAppState'

/**
 * Consolidated app utilities composable
 * Replaces FileUploadManager, AudioLoadingManager, and ModalManager components
 * with a single, more efficient utility system
 */
export function useAppUtilities(providedAppState = null) {
  // Use provided app state if available, otherwise try to inject, otherwise create local state
  let appState
  
  if (providedAppState) {
    appState = providedAppState
  } else {
    try {
      appState = useAppStateInject()
    } catch (error) {
      // If no app state is available, create local refs
      console.warn('useAppUtilities: No app state available, using local state')
      appState = {
        audioVisualizationPanel: ref(null),
        vadSettings: ref({
          padding: 0.2,
          threshold: 0.25,
          minSpeechDuration: 50,
          maxSilenceDuration: 500,
          maxTrimStart: 3.0,
          maxTrimEnd: 2.0
        }),
        updateVadSettings: (newSettings) => {
          appState.vadSettings.value = { ...appState.vadSettings.value, ...newSettings }
        }
      }
    }
  }
  
  const { audioVisualizationPanel, vadSettings, updateVadSettings } = appState

  // Modal states
  const showUrlModal = ref(false)
  const showVadModal = ref(false)
  const urlToLoad = ref('')

  // File input ref for triggering file selection
  const fileInputRef = ref(null)

  // Create hidden file input element on first use
  const createFileInput = () => {
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
  const triggerFileInput = () => {
    const input = createFileInput()
    input.click()
  }

  const handleFileInputChange = async (event) => {
    const file = event.target.files?.[0]
    if (file && audioVisualizationPanel.value) {
      try {
        await audioVisualizationPanel.value.setTargetAudio(file, {
          name: file.name,
          fileName: file.name,
          source: 'file'
        })
        console.log('✅ File loaded successfully:', file.name)
      } catch (error) {
        console.error('❌ Failed to load file:', error)
        alert('Failed to load audio file: ' + error.message)
      }
    }
    // Clear the input for future selections
    event.target.value = ''
  }

  // URL loading
  const loadAudioFromUrl = async (url) => {
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

      await audioVisualizationPanel.value.setTargetAudio(blob, {
        name: url.split('/').pop() || 'Remote Audio',
        fileName: url.split('/').pop() || 'remote-audio',
        source: 'url'
      })

      console.log('✅ URL audio loaded successfully')
    } catch (error) {
      console.error('❌ Failed to load audio from URL:', error)
      alert(`Failed to load audio from URL: ${error.message}`)
    }
  }

  // Modal management
  const openUrlModal = () => {
    showUrlModal.value = true
    urlToLoad.value = ''
  }

  const closeUrlModal = () => {
    showUrlModal.value = false
    urlToLoad.value = ''
  }

  const handleUrlSubmit = async () => {
    if (urlToLoad.value.trim()) {
      await loadAudioFromUrl(urlToLoad.value.trim())
      closeUrlModal()
    }
  }

  const openVadModal = () => {
    showVadModal.value = true
  }

  const closeVadModal = () => {
    showVadModal.value = false
  }

  const handleVadSettingsSave = (newSettings) => {
    updateVadSettings(newSettings)
    closeVadModal()
  }

  // Recording management utilities
  const saveRecording = async (targetBlob, userBlob) => {
    if (!targetBlob || !userBlob) {
      alert('Need both target and user audio to save')
      return
    }

    try {
      // Create a recording object
      const recording = {
        id: `recording_${Date.now()}`,
        targetBlob,
        userBlob,
        timestamp: new Date().toISOString(),
        name: `Recording ${new Date().toLocaleTimeString()}`
      }

      // Save to localStorage for now (could be IndexedDB in the future)
      const savedRecordings = JSON.parse(localStorage.getItem('savedRecordings') || '[]')
      savedRecordings.push({
        ...recording,
        // Convert blobs to base64 for storage
        targetData: await blobToBase64(targetBlob),
        userData: await blobToBase64(userBlob)
      })
      localStorage.setItem('savedRecordings', JSON.stringify(savedRecordings))

      console.log('✅ Recording saved successfully')
      return recording
    } catch (error) {
      console.error('❌ Failed to save recording:', error)
      throw error
    }
  }

  const loadSavedRecording = async (recording) => {
    if (!audioVisualizationPanel.value) return

    try {
      // Convert base64 back to blobs
      const targetBlob = base64ToBlob(recording.targetData)
      const userBlob = base64ToBlob(recording.userData)

      await audioVisualizationPanel.value.setTargetAudio(targetBlob, {
        name: recording.name,
        source: 'saved'
      })
      
      await audioVisualizationPanel.value.processUserAudio(userBlob)

      console.log('✅ Saved recording loaded successfully')
    } catch (error) {
      console.error('❌ Failed to load saved recording:', error)
      alert('Failed to load saved recording: ' + error.message)
    }
  }

  const deleteSavedRecording = (recordingId) => {
    try {
      const savedRecordings = JSON.parse(localStorage.getItem('savedRecordings') || '[]')
      const filtered = savedRecordings.filter(r => r.id !== recordingId)
      localStorage.setItem('savedRecordings', JSON.stringify(filtered))
      console.log('✅ Recording deleted successfully')
    } catch (error) {
      console.error('❌ Failed to delete recording:', error)
    }
  }

  // Utility functions
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const base64ToBlob = (base64) => {
    const [header, data] = base64.split(',')
    const mimeMatch = header.match(/data:([^;]+)/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'audio/wav'
    
    const byteCharacters = atob(data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  // Cleanup on unmount
  const cleanup = () => {
    if (fileInputRef.value) {
      document.body.removeChild(fileInputRef.value)
      fileInputRef.value = null
    }
  }

  return {
    // Modal states
    showUrlModal,
    showVadModal,
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
    
    // Recording management
    saveRecording,
    loadSavedRecording,
    deleteSavedRecording,
    
    // Cleanup
    cleanup
  }
}