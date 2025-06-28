import { ref, onMounted, type Ref } from 'vue';

// Type definitions
interface MicrophoneDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

interface UseMicrophoneDevicesReturn {
  availableDevices: Ref<MicrophoneDevice[]>;
  selectedDeviceId: Ref<string | null>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  getAvailableDevices: () => Promise<void>;
  getMediaStream: (deviceId?: string | null) => Promise<MediaStream>;
  setSelectedDevice: (deviceId: string) => void;
  getSelectedDevice: () => MicrophoneDevice | undefined;
}

export function useMicrophoneDevices(): UseMicrophoneDevicesReturn {
  const availableDevices: Ref<MicrophoneDevice[]> = ref([]);
  const selectedDeviceId: Ref<string | null> = ref(null);
  const isLoading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);

  // Get list of available microphone devices
  const getAvailableDevices = async (): Promise<void> => {
    try {
      isLoading.value = true;
      error.value = null;

      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream: MediaStream) => {
          // Stop the stream immediately, we just needed permission
          stream.getTracks().forEach(track => track.stop());
        });

      const devices: MediaDeviceInfo[] = await navigator.mediaDevices.enumerateDevices();
      const audioInputs: MediaDeviceInfo[] = devices.filter(device => device.kind === 'audioinput');
      
      availableDevices.value = audioInputs.map((device: MediaDeviceInfo): MicrophoneDevice => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${device.deviceId.slice(0, 8)}...`,
        groupId: device.groupId
      }));

      // Set default device if none selected
      if (!selectedDeviceId.value && audioInputs.length > 0) {
        selectedDeviceId.value = audioInputs[0].deviceId;
      }

      console.log('🎤 Available microphones:', availableDevices.value);
      
    } catch (err: unknown) {
      console.error('Error getting microphone devices:', err);
      error.value = 'Could not access microphone devices. Please ensure microphone permissions are granted.';
    } finally {
      isLoading.value = false;
    }
  };

  // Get media stream with selected device
  const getMediaStream = async (deviceId: string | null = null): Promise<MediaStream> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true
      };
      
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: unknown) {
      console.error('Error getting media stream:', err);
      throw new Error('Could not access the selected microphone');
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
  const setupDeviceChangeListener = (): void => {
    navigator.mediaDevices.addEventListener('devicechange', () => {
      console.log('🎤 Microphone devices changed, refreshing list...');
      getAvailableDevices();
    });
  };

  onMounted(() => {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
      getAvailableDevices();
      setupDeviceChangeListener();
    } else {
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