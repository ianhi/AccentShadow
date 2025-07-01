import { ref } from 'vue'

interface ErrorInfo {
  title: string
  message: string
  details?: string
  showReload?: boolean
}

// Global state for error modal
const errorModal = {
  isVisible: ref(false),
  title: ref(''),
  message: ref(''),
  details: ref(''),
  showReload: ref(false)
}

export function useErrorModal() {
  
  const showError = (errorInfo: ErrorInfo) => {
    errorModal.title.value = errorInfo.title
    errorModal.message.value = errorInfo.message
    errorModal.details.value = errorInfo.details || ''
    errorModal.showReload.value = errorInfo.showReload || false
    errorModal.isVisible.value = true
    
    console.error('🚨 Error Modal:', errorInfo)
  }
  
  const hideError = () => {
    errorModal.isVisible.value = false
    // Clear after animation
    setTimeout(() => {
      errorModal.title.value = ''
      errorModal.message.value = ''
      errorModal.details.value = ''
      errorModal.showReload.value = false
    }, 300)
  }
  
  // Convenience methods for common error types
  const showRecordingError = (deviceName: string, error: Error | string) => {
    showError({
      title: 'Recording Failed',
      message: `Failed to start recording with microphone: "${deviceName}".

Please try:
• Selecting a different microphone
• Checking microphone permissions  
• Refreshing the page`,
      details: `Error: ${error instanceof Error ? error.message : error}`,
      showReload: true
    })
  }
  
  const showPermissionError = () => {
    showError({
      title: 'Permission Required',
      message: `Microphone access is required for recording.

Please:
• Allow microphone access when prompted
• Check browser settings
• Reload the page to try again`,
      showReload: true
    })
  }
  
  const showNetworkError = (error: Error | string) => {
    showError({
      title: 'Network Error',
      message: `A network error occurred while loading audio or data.

Please check your internet connection and try again.`,
      details: `Error: ${error instanceof Error ? error.message : error}`,
      showReload: true
    })
  }
  
  return {
    // State
    isVisible: errorModal.isVisible,
    title: errorModal.title,
    message: errorModal.message,
    details: errorModal.details,
    showReload: errorModal.showReload,
    
    // Actions
    showError,
    hideError,
    showRecordingError,
    showPermissionError,
    showNetworkError
  }
}