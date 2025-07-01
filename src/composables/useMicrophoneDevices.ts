import { ref, onMounted } from 'vue';
import { useAudioEffects } from './useAudioEffects';

interface MicrophoneDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

// Global singleton state - shared across all component instances
const globalMicrophoneState = {
  availableDevices: ref<MicrophoneDevice[]>([]),
  selectedDeviceId: ref<string | null>(null),
  isLoading: ref(false),
  error: ref<string | null>(null),
  isInitialized: ref(false),
  hasPermission: ref(false),
  permissionRequested: ref(false)
};

export function useMicrophoneDevices() {
  // Return the shared global state instead of creating new instances
  const { availableDevices, selectedDeviceId, isLoading, error, isInitialized, hasPermission, permissionRequested } = globalMicrophoneState;

  // Request microphone permission (must be called from user interaction)
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      isLoading.value = true;
      error.value = null;
      permissionRequested.value = true;

      console.log('🎤 Requesting microphone permission (user interaction)');
      
      // Request permission to get device labels
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      hasPermission.value = true;
      console.log('✅ Microphone permission granted');
      
      // Now get the available devices
      await getAvailableDevices();
      
      return true;
    } catch (err) {
      console.error('❌ Microphone permission denied:', err);
      hasPermission.value = false;
      
      if (err instanceof Error && err.name === 'NotAllowedError') {
        error.value = 'Microphone access denied. Please allow microphone access to record audio.';
      } else if (err instanceof Error && err.name === 'NotFoundError') {
        error.value = 'No microphone found. Please connect a microphone and try again.';
      } else {
        error.value = 'Could not access microphone. Please check your browser settings.';
      }
      
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // Get list of available microphone devices (only call after permission granted)
  const getAvailableDevices = async () => {
    try {
      if (!hasPermission.value) {
        console.log('🎤 No permission yet, skipping device enumeration');
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      availableDevices.value = audioInputs.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${device.deviceId.slice(0, 8)}...`,
        groupId: device.groupId
      }));

      // Set default device if none selected
      if (!selectedDeviceId.value && audioInputs.length > 0) {
        selectedDeviceId.value = audioInputs[0].deviceId;
      }

      console.log('🎤 Available microphones:', availableDevices.value);
      
    } catch (err) {
      console.error('Error enumerating microphone devices:', err);
      error.value = 'Could not list microphone devices.';
    }
  };

  // Get media stream with selected device and audio effects recording constraints
  const getMediaStream = async (deviceId: string | null = null): Promise<MediaStream> => {
    try {
      // Get recording constraints from audio effects configuration
      const { getRecordingConstraints } = useAudioEffects();
      const effectsConstraints = getRecordingConstraints();
      
      // Build audio constraints combining device selection with effects settings
      const audioConstraints: MediaTrackConstraints = {
        ...(deviceId && { deviceId: { exact: deviceId } }),
        ...effectsConstraints
      };
      
      const constraints = { audio: audioConstraints };
      
      console.log('🎤 Using enhanced recording constraints:', constraints);
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error('Error getting media stream:', err);
      
      // Fallback to basic constraints if enhanced constraints fail
      try {
        console.log('🎤 Falling back to basic recording constraints...');
        const basicConstraints = {
          audio: deviceId ? { deviceId: { exact: deviceId } } : true
        };
        return await navigator.mediaDevices.getUserMedia(basicConstraints);
      } catch (fallbackErr) {
        console.error('Fallback recording constraints also failed:', fallbackErr);
        throw new Error('Could not access the selected microphone');
      }
    }
  };

  // Set selected device
  const setSelectedDevice = (deviceId: string): void => {
    selectedDeviceId.value = deviceId;
    console.log('🎤 Selected microphone device:', deviceId);
  };

  // Get currently selected device info
  const getSelectedDevice = (): MicrophoneDevice | undefined => {
    return availableDevices.value.find(device => device.deviceId === selectedDeviceId.value);
  };

  // Listen for device changes
  const setupDeviceChangeListener = () => {
    navigator.mediaDevices.addEventListener('devicechange', () => {
      console.log('🎤 Microphone devices changed, refreshing list...');
      getAvailableDevices();
    });
  };

  onMounted(() => {
    // Only initialize once globally
    if (!isInitialized.value && typeof navigator.mediaDevices?.enumerateDevices === 'function') {
      console.log('🎤 Initializing microphone system (permission-aware)');
      isInitialized.value = true;
      setupDeviceChangeListener();
      
      // Don't request permission automatically - wait for user interaction
      console.log('🎤 Microphone system ready, waiting for user permission request');
    } else if (isInitialized.value) {
      console.log('🎤 Microphone system already initialized, skipping');
    } else if (!navigator.mediaDevices?.enumerateDevices) {
      error.value = 'Device enumeration not supported in this browser';
    }
  });

  return {
    availableDevices,
    selectedDeviceId,
    isLoading,
    error,
    hasPermission,
    permissionRequested,
    requestMicrophonePermission,
    getAvailableDevices,
    getMediaStream,
    setSelectedDevice,
    getSelectedDevice
  };
}