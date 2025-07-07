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

// Browser detection utility
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return {
    isMobile: /mobile|android|iphone|ipad/.test(userAgent),
    isChrome: /chrome/.test(userAgent) && /google inc/.test(navigator.vendor.toLowerCase()),
    isFirefox: /firefox/.test(userAgent),
    isIOS: /iphone|ipad|ipod/.test(userAgent),
    userAgent
  };
};

// Permission API helper
const checkPermissionAPI = async (browser: ReturnType<typeof getBrowserInfo>): Promise<PermissionState | null> => {
  // Skip on mobile Chrome where it's unreliable
  if (browser.isMobile && browser.isChrome) return null;
  
  if ('permissions' in navigator) {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log('🎤 Permission API result:', permission.state);
      return permission.state;
    } catch (e) {
      console.log('⚠️ Permissions API failed:', e);
    }
  }
  return null;
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

      const browser = getBrowserInfo();
      console.log('🎤 Requesting microphone permission', browser);
      
      // Debug: Check environment and permissions policy
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isSecureContext = window.isSecureContext;
        const permissionsPolicyMeta = document.querySelector('meta[http-equiv="Permissions-Policy"]');
        
        const debugInfo = {
          hostname: window.location.hostname,
          isLocalhost,
          isSecureContext,
          protocol: window.location.protocol,
          permissionsPolicyMeta: permissionsPolicyMeta?.getAttribute('content'),
          featurePolicyMeta: document.querySelector('meta[http-equiv="Feature-Policy"]')?.getAttribute('content'),
          url: window.location.href
        };
        
        console.log('🔍 Environment debug:');
        console.log('  - hostname:', debugInfo.hostname);
        console.log('  - isSecureContext:', debugInfo.isSecureContext);
        console.log('  - protocol:', debugInfo.protocol);
        console.log('  - permissionsPolicyMeta:', debugInfo.permissionsPolicyMeta);
        console.log('  - featurePolicyMeta:', debugInfo.featurePolicyMeta);
        console.log('  - url:', debugInfo.url);
        
        // Check if Cloudflare Worker is actually setting headers
        fetch(window.location.href, { method: 'HEAD' })
          .then(response => {
            console.log('🔍 HTTP Headers check:');
            console.log('  - X-Worker-Debug:', response.headers.get('X-Worker-Debug'));
            console.log('  - Permissions-Policy:', response.headers.get('Permissions-Policy'));
            console.log('  - Feature-Policy:', response.headers.get('Feature-Policy'));
          })
          .catch(e => console.log('  - Header check failed:', e));
        
        // Try to add iframe with allow attribute as workaround test
        try {
          const testIframe = document.createElement('iframe');
          testIframe.allow = 'microphone';
          testIframe.style.display = 'none';
          document.body.appendChild(testIframe);
          console.log('🔍 Added iframe with microphone allow attribute as test');
          setTimeout(() => {
            document.body.removeChild(testIframe);
          }, 1000);
        } catch (e) {
          console.log('🔍 Iframe test failed:', e);
        }
      }
      
      // Check if permission was previously denied
      const permissionState = await checkPermissionAPI(browser);
      if (permissionState === 'denied') {
        console.log('🚫 Microphone permission is permanently denied');
        hasPermission.value = false;
        error.value = 'PERMISSION_DENIED_PERMANENT';
        return false;
      }
      
      // Small delay for mobile to ensure proper user interaction context
      if (browser.isMobile) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Request permission with mobile-optimized constraints
      const constraints = {
        audio: browser.isMobile ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : true
      };
      
      console.log('🎤 Requesting getUserMedia with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      hasPermission.value = true;
      console.log('✅ Microphone permission granted');
      
      // Store permission hint for mobile browsers
      if (browser.isMobile) {
        localStorage.setItem('mic_permission_granted', 'true');
      }
      
      // Small delay for mobile Firefox before device enumeration
      if (browser.isMobile && browser.isFirefox) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      await getAvailableDevices();
      return true;
      
    } catch (err) {
      console.error('❌ Microphone permission denied:', err);
      hasPermission.value = false;
      
      const browser = getBrowserInfo();
      
      if (err instanceof Error && err.name === 'NotAllowedError') {
        // Determine if this is a permanent denial
        const permissionState = await checkPermissionAPI(browser);
        const isPermanentDenial = permissionState === 'denied';
        
        // Mobile Chrome: always treat as temporary to allow retry
        if (browser.isMobile && browser.isChrome) {
          error.value = 'PERMISSION_DENIED_TEMPORARY';
          console.log('🎤 Mobile Chrome: Treating as temporary denial');
        } else {
          error.value = isPermanentDenial ? 'PERMISSION_DENIED_PERMANENT' : 'PERMISSION_DENIED_TEMPORARY';
        }
      } else if (err instanceof Error && err.name === 'NotFoundError') {
        error.value = 'NO_MICROPHONE_FOUND';
      } else if (err instanceof Error && err.name === 'AbortError') {
        error.value = 'PERMISSION_DENIED_TEMPORARY';
        console.log('🎤 Permission dialog was dismissed');
      } else {
        error.value = 'UNKNOWN_ERROR';
        console.log('🎤 Unknown error:', err);
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

  // Check if microphone permission was previously granted
  const checkExistingPermission = async (): Promise<boolean> => {
    try {
      const browser = getBrowserInfo();
      
      // Use Permissions API to check permission status without triggering dialog
      const permissionState = await checkPermissionAPI(browser);
      
      if (permissionState === 'granted') {
        console.log('🎤 Existing microphone permission detected');
        hasPermission.value = true;
        permissionRequested.value = true;
        
        // Small delay for mobile Firefox before enumerating
        if (browser.isMobile && browser.isFirefox) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await getAvailableDevices();
        return true;
      } else if (permissionState === 'denied') {
        hasPermission.value = false;
        permissionRequested.value = true;
        error.value = 'PERMISSION_DENIED_PERMANENT';
        return false;
      }
      
      // Fallback: Check device labels to detect permission
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      const hasLabels = audioInputs.some(device => device.label && device.label !== '');
      
      if (hasLabels) {
        console.log('🎤 Detected existing permission via device labels');
        hasPermission.value = true;
        permissionRequested.value = true;
        availableDevices.value = audioInputs.map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}...`,
          groupId: device.groupId
        }));
        
        if (!selectedDeviceId.value && audioInputs.length > 0) {
          selectedDeviceId.value = audioInputs[0].deviceId;
        }
        
        return true;
      }
      
      // Mobile browsers: check localStorage hint and retry
      if (browser.isMobile && localStorage.getItem('mic_permission_granted') === 'true') {
        console.log('🎤 Found permission hint, retrying...');
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          testStream.getTracks().forEach(track => track.stop());
          hasPermission.value = true;
          permissionRequested.value = true;
          await getAvailableDevices();
          return true;
        } catch (e) {
          localStorage.removeItem('mic_permission_granted');
        }
      }
      
      return false;
    } catch (error) {
      console.log('🎤 Could not check existing permission:', error);
      return false;
    }
  };

  // Listen for device changes
  const setupDeviceChangeListener = () => {
    navigator.mediaDevices.addEventListener('devicechange', () => {
      console.log('🎤 Microphone devices changed, refreshing list...');
      getAvailableDevices();
    });
  };

  onMounted(async () => {
    // Only initialize once globally
    if (!isInitialized.value && typeof navigator.mediaDevices?.enumerateDevices === 'function') {
      console.log('🎤 Initializing microphone system (permission-aware)');
      isInitialized.value = true;
      setupDeviceChangeListener();
      
      // Check if permission was previously granted
      console.log('🎤 Checking for existing microphone permission...');
      const hasExistingPermission = await checkExistingPermission();
      
      if (hasExistingPermission) {
        console.log('✅ Existing microphone permission detected and restored');
      } else {
        console.log('🎤 No existing permission - waiting for user interaction');
      }
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
    checkExistingPermission,
    getAvailableDevices,
    getMediaStream,
    setSelectedDevice,
    getSelectedDevice
  };
}