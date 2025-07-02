/**
 * Demo data loading composable for AccentShadow
 * Handles first-time user detection and demo data loading
 */

import { ref, computed } from 'vue';
import { useRecordingSets } from './useRecordingSets';
import { getDefaultDemoSet, validateDemoAudio, type DemoRecording } from '@/data/demoData';

// Local storage keys
const STORAGE_KEYS = {
  FIRST_VISIT: 'accentshadow_first_visit',
  DEMO_LOADED: 'accentshadow_demo_loaded',
  USER_PREFERENCES: 'accentshadow_user_preferences'
} as const;

// State
const isFirstVisit = ref<boolean>(false);
const isDemoLoaded = ref<boolean>(false);
const isLoadingDemo = ref<boolean>(false);
const demoLoadError = ref<string | null>(null);
const showDemoPrompt = ref<boolean>(false);

// Initialize first visit detection
const initializeFirstVisitDetection = (): void => {
  const hasVisited = localStorage.getItem(STORAGE_KEYS.FIRST_VISIT);
  const hasDemoLoaded = localStorage.getItem(STORAGE_KEYS.DEMO_LOADED);
  
  isFirstVisit.value = !hasVisited;
  isDemoLoaded.value = !!hasDemoLoaded;
  
  // Show demo prompt for first-time users who haven't loaded demo yet
  showDemoPrompt.value = isFirstVisit.value && !isDemoLoaded.value;
  
  console.log('👋 First visit detection:', {
    isFirstVisit: isFirstVisit.value,
    isDemoLoaded: isDemoLoaded.value,
    showPrompt: showDemoPrompt.value
  });
};

// Mark user as having visited
const markAsVisited = (): void => {
  localStorage.setItem(STORAGE_KEYS.FIRST_VISIT, 'true');
  isFirstVisit.value = false;
};

// Request microphone permission after user interaction
const requestMicrophonePermissionAfterDemo = async (): Promise<void> => {
  try {
    console.log('🎤 Checking and requesting microphone permission after demo interaction');
    
    // Check if microphone permission was previously granted without triggering initialization
    let hasExistingPermission = false;
    try {
      // Use Permissions API to check permission status without triggering dialog
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('🎤 Existing microphone permission status:', permission.state);
        
        if (permission.state === 'granted') {
          console.log('✅ Existing microphone permission detected');
          hasExistingPermission = true;
        }
      }
      
      // Fallback: Try to enumerate devices to check for permission
      if (!hasExistingPermission) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        // Check if any device has a proper label (indicates permission granted)
        const hasLabels = audioInputs.some(device => device.label && device.label !== '');
        
        if (hasLabels) {
          console.log('🎤 Detected existing microphone permission via device labels');
          hasExistingPermission = true;
        }
      }
    } catch (error) {
      console.log('🎤 Could not check existing permission:', error);
    }
    
    // If we already have permission, no need to request again
    if (hasExistingPermission) {
      console.log('✅ Existing microphone permission restored');
      return;
    }
    
    // Request new permission using basic getUserMedia
    try {
      console.log('🎤 Requesting new microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      console.log('✅ Microphone permission granted successfully after demo');
    } catch (permissionError) {
      console.log('⚠️ Microphone permission request failed (user may have denied):', permissionError);
      // Don't throw - just log and continue
    }
    
  } catch (error) {
    console.log('⚠️ Microphone permission request failed:', error);
    // Don't block the demo flow if microphone permission fails
  }
};

// Convert demo recording to input recording format
const convertDemoRecording = async (demoRec: DemoRecording): Promise<any> => {
  try {
    // Validate audio file exists
    const isValid = await validateDemoAudio(demoRec.audioUrl);
    if (!isValid) {
      throw new Error(`Audio file not found: ${demoRec.audioUrl}`);
    }
    
    // Fetch audio file and convert to blob
    const response = await fetch(demoRec.audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    
    const audioBlob = await response.blob();
    
    return {
      name: demoRec.name,
      translation: demoRec.translation,
      audioUrl: demoRec.audioUrl, // Keep original URL for reference
      audioBlob,
      metadata: {
        ...demoRec.metadata,
        isDemo: true,
        originalUrl: demoRec.audioUrl
      }
    };
  } catch (error) {
    console.error('❌ Failed to convert demo recording:', demoRec.name, error);
    throw error;
  }
};

// Load demo data
const loadDemoData = async (): Promise<boolean> => {
  const { createRecordingSet, setActiveSet } = useRecordingSets();
  
  isLoadingDemo.value = true;
  demoLoadError.value = null;
  
  try {
    const demoSet = getDefaultDemoSet();
    console.log('📦 Loading demo set:', demoSet.name);
    
    // Convert demo recordings to input format
    const inputRecordings = [];
    for (const demoRec of demoSet.recordings) {
      try {
        const inputRec = await convertDemoRecording(demoRec);
        inputRecordings.push(inputRec);
      } catch (error) {
        console.warn('⚠️ Skipping invalid demo recording:', demoRec.name, error);
        // Continue with other recordings even if one fails
      }
    }
    
    if (inputRecordings.length === 0) {
      throw new Error('No valid demo recordings could be loaded');
    }
    
    // Create recording set
    const recordingSet = createRecordingSet(
      demoSet.name,
      'demo',
      demoSet.language,
      inputRecordings
    );
    
    // Set as active set
    setActiveSet(recordingSet.id);
    
    // Mark demo as loaded
    localStorage.setItem(STORAGE_KEYS.DEMO_LOADED, 'true');
    isDemoLoaded.value = true;
    showDemoPrompt.value = false;
    
    // Mark as visited
    markAsVisited();
    
    console.log('✅ Demo data loaded successfully:', {
      setName: recordingSet.name,
      recordingsCount: inputRecordings.length,
      setId: recordingSet.id
    });
    
    // Request microphone permission after successful demo load
    await requestMicrophonePermissionAfterDemo();
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to load demo data:', error);
    demoLoadError.value = error instanceof Error ? error.message : 'Failed to load demo data';
    return false;
  } finally {
    isLoadingDemo.value = false;
  }
};

// Dismiss demo prompt
const dismissDemoPrompt = async (): Promise<void> => {
  showDemoPrompt.value = false;
  markAsVisited();
  
  // Store user preference to not show demo again
  const preferences = {
    demoPromptDismissed: true,
    dismissedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
  
  console.log('👋 Demo prompt dismissed by user');
  
  // Request microphone permission after user dismisses demo
  await requestMicrophonePermissionAfterDemo();
};

// Reset demo state (for testing/development)
const resetDemoState = (): void => {
  // Clear localStorage
  localStorage.removeItem(STORAGE_KEYS.FIRST_VISIT);
  localStorage.removeItem(STORAGE_KEYS.DEMO_LOADED);
  localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
  
  // Reset demo state
  isFirstVisit.value = true;
  isDemoLoaded.value = false;
  showDemoPrompt.value = true;
  demoLoadError.value = null;
  
  // Clear all recording sets to ensure hasUserData becomes false
  const { recordingSets, deleteRecordingSet } = useRecordingSets();
  const setsToDelete = [...recordingSets.value]; // Create a copy to avoid mutation during iteration
  setsToDelete.forEach(set => {
    deleteRecordingSet(set.id);
  });
  
  console.log('🔄 Demo state reset - cleared recording sets and localStorage');
};

// Check if user has any recording sets
const hasUserData = computed(() => {
  const { recordingSets } = useRecordingSets();
  return recordingSets.value.length > 0;
});

// Should show demo prompt
const shouldShowDemoPrompt = computed(() => {
  return showDemoPrompt.value && !hasUserData.value;
});

// Check if we should proactively request microphone permissions for returning users
const shouldRequestMicrophonePermission = computed(() => {
  // Request permission for returning users who haven't seen the demo prompt
  return !isFirstVisit.value && !showDemoPrompt.value;
});

// Proactive permission request for returning users (call from user interaction)
const requestMicrophonePermissionForReturningUser = async (): Promise<void> => {
  if (shouldRequestMicrophonePermission.value) {
    console.log('🎤 Requesting microphone permission for returning user');
    await requestMicrophonePermissionAfterDemo();
  }
};

export function useDemoData() {
  return {
    // State
    isFirstVisit,
    isDemoLoaded,
    isLoadingDemo,
    demoLoadError,
    showDemoPrompt,
    shouldShowDemoPrompt,
    shouldRequestMicrophonePermission,
    hasUserData,
    
    // Actions
    initializeFirstVisitDetection,
    loadDemoData,
    dismissDemoPrompt,
    markAsVisited,
    resetDemoState,
    requestMicrophonePermissionForReturningUser
  };
}