import { ref, computed, watch } from 'vue';

// Global time synchronization state
const targetDuration = ref(0);
const userDuration = ref(0);
const syncEnabled = ref(true);

export function useTimeSync() {
  
  const maxDuration = computed(() => {
    const max = Math.max(targetDuration.value, userDuration.value);
    return max > 0 ? max : 1; // Only use 1 second fallback if no audio loaded
  });

  // Watch for sync changes
  watch(syncEnabled, (newValue) => {
    console.log('🕒 syncEnabled changed to:', newValue);
    console.log('🕒 Current state:');
    console.log('  - Target:', targetDuration.value + 's', '→', targetWidthPercent.value);
    console.log('  - User:', userDuration.value + 's', '→', userWidthPercent.value);
  });

  // Calculate proportional widths (0-1 range)
  const targetWidthRatio = computed(() => {
    if (!syncEnabled.value) return 1;
    
    // If only target audio exists, use full width
    if (targetDuration.value && !userDuration.value) return 1;
    
    // If no target audio, return 0
    if (!targetDuration.value) return 0;
    
    // If target is the longer audio, it gets 100%
    if (targetDuration.value >= userDuration.value) return 1;
    
    // If target is shorter, calculate ratio relative to user duration
    return targetDuration.value / userDuration.value;
  });

  const userWidthRatio = computed(() => {
    if (!syncEnabled.value) return 1;
    
    // If only user audio exists, use full width
    if (userDuration.value && !targetDuration.value) return 1;
    
    // If no user audio, return 0
    if (!userDuration.value) return 0;
    
    // If user is the longer audio, it gets 100%
    if (userDuration.value >= targetDuration.value) return 1;
    
    // If user is shorter, calculate ratio relative to target duration
    return userDuration.value / targetDuration.value;
  });

  // Convert to percentage strings for CSS
  const targetWidthPercent = computed(() => {
    const ratio = targetWidthRatio.value;
    if (ratio === 0) return '0%';
    if (ratio === 1) return '100%';
    return `${Math.max(ratio * 100, 20)}%`; // Minimum 20% width for visibility
  });

  const userWidthPercent = computed(() => {
    const ratio = userWidthRatio.value;
    if (ratio === 0) return '0%';
    if (ratio === 1) return '100%';
    return `${Math.max(ratio * 100, 20)}%`; // Minimum 20% width for visibility
  });

  const setTargetDuration = (duration: number): void => {
    targetDuration.value = duration;
    console.log('🕒 Target duration set:', duration, 'seconds');
    console.log('🕒 Audio lengths - Target:', targetDuration.value + 's', 'User:', userDuration.value + 's', 'Max:', maxDuration.value + 's');
    console.log('🕒 Target calculations - Ratio:', targetWidthRatio.value, 'Width:', targetWidthPercent.value);
    console.log('🕒 User calculations - Ratio:', userWidthRatio.value, 'Width:', userWidthPercent.value);
    console.log('🕒 Sync enabled:', syncEnabled.value);
  };

  const setUserDuration = (duration: number): void => {
    userDuration.value = duration;
    console.log('🕒 User duration set:', duration, 'seconds');
    console.log('🕒 Audio lengths - Target:', targetDuration.value + 's', 'User:', userDuration.value + 's', 'Max:', maxDuration.value + 's');
    console.log('🕒 Target calculations - Ratio:', targetWidthRatio.value, 'Width:', targetWidthPercent.value);
    console.log('🕒 User calculations - Ratio:', userWidthRatio.value, 'Width:', userWidthPercent.value);
    console.log('🕒 Sync enabled:', syncEnabled.value);
  };

  const toggleSync = () => {
    syncEnabled.value = !syncEnabled.value;
    console.log('🕒 Time sync toggled:', syncEnabled.value);
    console.log('🕒 Current state after toggle:');
    console.log('  - Target:', targetDuration.value + 's', '→', targetWidthPercent.value);
    console.log('  - User:', userDuration.value + 's', '→', userWidthPercent.value);
    console.log('  - Max:', maxDuration.value + 's');
  };

  const resetDurations = () => {
    targetDuration.value = 0;
    userDuration.value = 0;
    console.log('🕒 Durations reset');
  };

  return {
    targetDuration,
    userDuration,
    maxDuration,
    syncEnabled,
    targetWidthRatio,
    userWidthRatio,
    targetWidthPercent,
    userWidthPercent,
    setTargetDuration,
    setUserDuration,
    toggleSync,
    resetDurations,
  };
}