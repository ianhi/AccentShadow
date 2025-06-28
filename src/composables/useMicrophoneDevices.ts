import { ref, onMounted } from 'vue';

export function useMicrophoneDevices() {
  const availableDevices = ref([]);
  const selectedDeviceId = ref(null);
  const isLoading = ref(false);
  const error = ref(null);

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

      console.log('🎤 Available microphones:', availableDevices.value);
      
    } catch (err) {
      console.error('Error getting microphone devices:', err);
      error.value = 'Could not access microphone devices. Please ensure microphone permissions are granted.';
    } finally {
      isLoading.value = false;
    }
  };

  // Get media stream with selected device
  const getMediaStream = async (deviceId = null) => {
    try {
      const constraints = {
        audio: deviceId ? { deviceId: { exact: deviceId } } : true
      };
      
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      console.error('Error getting media stream:', err);
      throw new Error('Could not access the selected microphone');
    }
  };

  // Set selected device
  const setSelectedDevice = (deviceId) => {
    selectedDeviceId.value = deviceId;
    console.log('🎤 Selected microphone device:', deviceId);
  };

  // Get currently selected device info
  const getSelectedDevice = () => {
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
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
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