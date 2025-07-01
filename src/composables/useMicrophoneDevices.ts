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
  isInitialized: ref(false)
};

export function useMicrophoneDevices() {
  // Return the shared global state instead of creating new instances
  const { availableDevices, selectedDeviceId, isLoading, error, isInitialized } = globalMicrophoneState;

  // Get list of available microphone devices
  const getAvailableDevices = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          // Stop the stream immediately, we just needed permission
          stream.getTracks().forEach(track => track.stop());
        });

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

      console.log('🎤 Available microphones (initialized once):', availableDevices.value);
      
    } catch (err) {
      console.error('Error getting microphone devices:', err);
      error.value = 'Could not access microphone devices. Please ensure microphone permissions are granted.';
    } finally {
      isLoading.value = false;
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
      console.log('🎤 Initializing microphone devices (first time)');
      isInitialized.value = true;
      getAvailableDevices();
      setupDeviceChangeListener();
    } else if (isInitialized.value) {
      console.log('🎤 Microphone devices already initialized, skipping');
    } else if (!navigator.mediaDevices?.enumerateDevices) {
      error.value = 'Device enumeration not supported in this browser';
    }
  });

  return {
    availableDevices,
    selectedDeviceId,
    isLoading,
    error,
    getAvailableDevices,
    getMediaStream,
    setSelectedDevice,
    getSelectedDevice
  };
}