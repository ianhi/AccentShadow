<template>
  <div class="practice-view">
    <div class="main-content">
      <div class="main-header">
        <h1>AccentShadow</h1>
      </div>

      <SessionStats />
      <RecordingNavigation />
      
      <div class="visualization-container">
      <div class="audio-column">
        <div class="column-header">
          <h3>Target Audio</h3>
          <div class="target-controls">
            <div class="control-row">
              <div class="audio-display">
                <span v-if="!currentAudioSource" class="placeholder-text">
                  No audio selected
                </span>
                <span v-else class="current-source">
                  {{ currentAudioSource }}
                </span>
              </div>
              <button @click="triggerFileInput" class="action-btn file-btn">
                📁 Browse File
              </button>
              <button @click="showUrlModal = true" class="action-btn url-btn">
                🌐 Load URL
              </button>
            </div>
          </div>
        </div>
        <AudioPlayer 
          v-if="getTargetAudioUrl()" 
          ref="targetAudioPlayerRef" 
          :audioUrl="getTargetAudioUrl()" 
          :audioType="'target'"
          :key="getTargetAudioKey()"
        />
        <div v-else class="placeholder">
          {{ activeSet ? 'Select a recording from the set' : 'Please upload a target audio file or load from URL.' }}
        </div>
      </div>
      
      <div class="audio-column">
        <div class="column-header">
          <h3>User Recording</h3>
          <div class="recording-controls">
            <AudioRecorder 
              @recorded="handleRecordedAudio" 
              @recording-started="handleRecordingStarted"
              @recording-stopped="handleRecordingStopped"
            />
          </div>
        </div>
        <AudioPlayer 
          v-if="currentRecording?.userRecording?.audioUrl || userAudioUrl" 
          ref="userAudioPlayerRef" 
          :audioUrl="currentRecording?.userRecording?.audioUrl || userAudioUrl" 
          :audioType="'user'"
          :isRecording="isRecordingActive"
          :key="getUserAudioKey()"
        />
        <div v-else class="placeholder" :class="{ 'recording-placeholder': isRecordingActive }">
          <span v-if="isRecordingActive" class="recording-indicator-text">
            🔴 Recording in progress...
          </span>
          <span v-else>Record your audio.</span>
        </div>
      </div>
    </div>

    <div class="central-playback-controls" v-if="targetAudioUrl || userAudioUrl">
      <h3>Quick Playback Controls</h3>
      <div class="playback-buttons">
        <button @click="playTarget" :disabled="!targetAudioUrl" class="playback-btn target-btn">
          <span class="btn-icon">🎯</span>
          <span>Play Target</span>
        </button>
        <button @click="playUser" :disabled="!userAudioUrl" class="playback-btn user-btn">
          <span class="btn-icon">🎤</span>
          <span>Play Recording</span>
        </button>
        <button @click="playBoth" :disabled="!targetAudioUrl || !userAudioUrl" class="playback-btn both-btn">
          <span class="btn-icon">🔄</span>
          <span>Play Both</span>
        </button>
        <button @click="stopAll" class="playback-btn stop-btn">
          <span class="btn-icon">⏹</span>
          <span>Stop All</span>
        </button>
      </div>
    </div>

    <div class="bottom-controls">
      <div class="options-group">
        <label class="auto-play-toggle">
          <input type="checkbox" v-model="autoPlayEnabled" />
          Auto-play after recording
        </label>
        <div class="alignment-controls">
          <label class="trim-silence-toggle">
            <input type="checkbox" v-model="autoAlignEnabled" />
            {{ vadReady ? '✂️ Trim Silence (VAD)' : '✂️ Trim Silence' }}
          </label>
          <button @click="manualAlign" :disabled="!getTargetBlob() || !userAudioBlob || isProcessing" class="align-btn" :class="{ 'processing': isProcessing }">
            {{ isProcessing ? '🔄 Trimming...' : '✂️ Trim Now' }}
          </button>
          <button @click="showVADSettings = true" class="settings-btn" title="VAD Settings">
            ⚙️
          </button>
        </div>
        <label class="time-sync-toggle">
          <input type="checkbox" v-model="syncEnabled" />
          Sync time scales
        </label>
      </div>
      <button @click="saveRecording" :disabled="!getTargetBlob() || !userAudioBlob" class="save-btn">Save Recording</button>
      <button 
        v-if="currentRecording && userAudioBlob" 
        @click="markCurrentCompleted" 
        :disabled="currentRecording.userRecording.isCompleted"
        class="complete-btn"
      >
        {{ currentRecording.userRecording.isCompleted ? '✅ Completed' : '✓ Mark Complete' }}
      </button>
    </div>

    <div class="section">
      <h2>Saved Recordings</h2>
      <RecordingList @load-recording="loadSavedRecording" @delete-recording="deleteSavedRecording" />
    </div>
    </div>

    <!-- Recording Sets Manager -->
    <RecordingSetsManager />
    
    <!-- Hidden File Input -->
    <input 
      type="file" 
      accept="audio/*" 
      @change="handleFileSelection" 
      ref="hiddenFileInput"
      style="display: none;"
    />
    
    <!-- URL Input Modal -->
    <div v-if="showUrlModal" class="modal-overlay" @click="showUrlModal = false">
      <div class="modal-content" @click.stop>
        <h3>🌐 Load Audio from URL</h3>
        <input 
          type="url" 
          v-model="tempAudioUrl" 
          placeholder="Enter audio URL (e.g., https://example.com/audio.mp3)"
          class="url-input-modal"
          @keyup.enter="handleUrlLoad"
          ref="urlInputRef"
        />
        <div class="modal-actions">
          <button @click="showUrlModal = false" class="cancel-btn">Cancel</button>
          <button @click="handleUrlLoad" :disabled="!tempAudioUrl.trim()" class="load-btn">
            Load Audio
          </button>
        </div>
      </div>
    </div>
    
    <!-- VAD Settings Modal -->
    <VADSettingsModal 
      :isOpen="showVADSettings" 
      :settings="vadSettings" 
      @close="showVADSettings = false"
      @save="handleVADSettingsSave"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import AudioPlayer from '../components/AudioPlayer.vue';
import AudioRecorder from '../components/AudioRecorder.vue';
import RecordingList from '../components/RecordingList.vue';
import RecordingNavigation from '../components/RecordingNavigation.vue';
import SessionStats from '../components/SessionStats.vue';
import RecordingSetsManager from '../components/RecordingSetsManager.vue';
import VADSettingsModal from '../components/VADSettingsModal.vue';
import { useIndexedDB } from '../composables/useIndexedDB';
import { useAudioProcessing } from '../composables/useAudioProcessing';
import { useVADProcessor } from '../composables/useVADProcessor';
import { useRecordingSets } from '../composables/useRecordingSets';
import { useTimeSync } from '../composables/useTimeSync';
import { audioManager } from '../composables/useAudioManager';

const targetAudioUrl = ref(null);
const targetAudioBlob = ref(null);
const userAudioUrl = ref(null);
const userAudioBlob = ref(null);
const autoPlayEnabled = ref(true);
const autoAlignEnabled = ref(true); // Enable robust VAD trimming by default
// Always use VAD-based trimming when enabled
const currentAudioSource = ref('');
const showUrlModal = ref(false);
const tempAudioUrl = ref('');
const hiddenFileInput = ref(null);
const isRecordingActive = ref(false);
const showVADSettings = ref(false);
const vadSettings = ref({
  padding: 0.2,
  threshold: 0.25,
  minSpeechDuration: 50,
  maxSilenceDuration: 500,
  maxTrimStart: 3.0,
  maxTrimEnd: 2.0
});

const { initDB, addRecording, deleteRecording } = useIndexedDB();
const { isProcessing, autoAlignRecordings, vadReady, initVAD } = useAudioProcessing();
const { trimAudioWithVAD } = useVADProcessor();
const { 
  activeSet, 
  currentRecording, 
  updateUserRecording,
  markRecordingCompleted 
} = useRecordingSets();
const { syncEnabled, toggleSync } = useTimeSync();

onMounted(async () => {
  await initDB();
  // Initialize VAD model for professional audio processing
  console.log('🤖 Initializing professional VAD model...');
  try {
    await initVAD();
    if (vadReady.value) {
      console.log('✅ Professional VAD ready for use');
    } else {
      console.log('ℹ️ VAD not available, will use enhanced energy detection');
      console.log('🔍 VAD Status:', { vadReady: vadReady.value, secureContext: window.isSecureContext });
    }
  } catch (error) {
    console.warn('⚠️ VAD initialization failed:', error.message);
    console.error('🔍 VAD Error details:', error);
  }
});

const urlInputRef = ref(null);

const triggerFileInput = () => {
  hiddenFileInput.value?.click();
};

const handleVADSettingsSave = (newSettings) => {
  vadSettings.value = { ...newSettings };
  console.log('🔧 VAD settings updated:', vadSettings.value);
};

const handleFileSelection = (event) => {
  const file = event.target.files[0];
  if (file) {
    targetAudioBlob.value = file;
    targetAudioUrl.value = URL.createObjectURL(file);
    currentAudioSource.value = file.name;
    console.log('Target Audio File:', file.name);
    // Reset the input so the same file can be selected again if needed
    event.target.value = '';
  }
};

const handleUrlLoad = async () => {
  const url = tempAudioUrl.value.trim();
  if (!url) return;
  
  console.log('Loading audio from URL:', url);
  
  try {
    // Validate URL format
    new URL(url);
    
    // Fetch the audio file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Convert to blob
    const blob = await response.blob();
    
    // Validate it's an audio file
    if (!blob.type.startsWith('audio/')) {
      throw new Error('URL does not point to an audio file');
    }
    
    targetAudioBlob.value = blob;
    targetAudioUrl.value = URL.createObjectURL(blob);
    currentAudioSource.value = url;
    showUrlModal.value = false;
    tempAudioUrl.value = '';
    console.log('Successfully loaded audio from URL');
    
  } catch (error) {
    console.error('Error loading audio from URL:', error);
    alert(`Failed to load audio from URL: ${error.message}`);
  }
};

// Auto-focus when URL modal opens
watch(showUrlModal, (newValue) => {
  if (newValue) {
    nextTick(() => {
      urlInputRef.value?.focus();
    });
  }
});

const userAudioPlayerRef = ref(null);
const targetAudioPlayerRef = ref(null);

const handleRecordingStarted = () => {
  console.log('🎤 PracticeView: Recording started');
  isRecordingActive.value = true;
  // Stop all audio when recording starts
  audioManager.emergencyStop('Recording started');
};

const handleRecordingStopped = () => {
  console.log('🎤 PracticeView: Recording stopped');
  isRecordingActive.value = false;
};

const handleRecordedAudio = async (blob) => {
  console.log('🎤 PracticeView: Received recorded audio blob, size:', blob?.size);
  
  // Validate audio blob
  if (!blob || blob.size === 0) {
    console.warn('🎤 PracticeView: Empty or invalid audio blob received, skipping processing');
    return;
  }
  
  console.log('🎤 Original blob URL:', URL.createObjectURL(blob));
  
  userAudioBlob.value = blob;
  userAudioUrl.value = URL.createObjectURL(blob);
  console.log('🎤 Initial User Audio URL created:', userAudioUrl.value);
  
  // Update the current recording if we have an active set
  if (currentRecording.value && blob) {
    updateUserRecording(blob, userAudioUrl.value);
  }
  
  // Smart VAD-based audio trimming
  if (autoAlignEnabled.value) {
    try {
      console.log('🎧 Starting VAD-based audio trimming with settings:', vadSettings.value);
      const result = await trimAudioWithVAD(blob, {
        padding: vadSettings.value.padding,
        threshold: vadSettings.value.threshold,
        minSpeechDuration: vadSettings.value.minSpeechDuration,
        maxSilenceDuration: vadSettings.value.maxSilenceDuration,
        maxTrimStart: vadSettings.value.maxTrimStart,
        maxTrimEnd: vadSettings.value.maxTrimEnd
      });
      
      if (result.blob && result.blob !== blob) {
        const userTrimmed = result.trimmedStart + result.trimmedEnd;
        console.log(`✂️ AUTO-ALIGN: Trimmed ${userTrimmed.toFixed(3)}s from user recording (start: ${result.trimmedStart.toFixed(3)}s, end: ${result.trimmedEnd.toFixed(3)}s)`);
        console.log(`🎯 AUTO-ALIGN: Original duration: ${result.originalDuration?.toFixed(3)}s, New duration: ${result.newDuration?.toFixed(3)}s`);
        console.log(`🔍 AUTO-ALIGN: Original blob size: ${blob.size}, trimmed blob size: ${result.blob.size}`);
        
        // Clean up old blob URL to prevent memory leaks
        if (userAudioUrl.value && userAudioUrl.value.startsWith('blob:')) {
          const oldUrl = userAudioUrl.value;
          console.log('🗑️ AUTO-ALIGN: Revoking old URL:', oldUrl.slice(0, 50) + '...');
          URL.revokeObjectURL(userAudioUrl.value);
        }
        
        console.log('📝 AUTO-ALIGN: Before update - userAudioBlob size:', userAudioBlob.value?.size);
        console.log('📝 AUTO-ALIGN: Before update - userAudioUrl:', userAudioUrl.value?.slice(0, 50) + '...');
        
        userAudioBlob.value = result.blob;
        userAudioUrl.value = URL.createObjectURL(result.blob);
        
        console.log('📝 AUTO-ALIGN: After update - userAudioBlob size:', userAudioBlob.value?.size);
        console.log('📝 AUTO-ALIGN: After update - userAudioUrl:', userAudioUrl.value?.slice(0, 50) + '...');
        console.log('🎵 AUTO-ALIGN: New user audio URL after trimming:', userAudioUrl.value);
        
        // Force AudioPlayer to refresh by triggering reactive update
        await nextTick();
        console.log('⏭️ AUTO-ALIGN: nextTick completed, AudioPlayer should refresh');
      } else {
        console.log('📏 AUTO-ALIGN: No significant silence detected - keeping original recording');
      }
    } catch (error) {
      console.error('Error during smart alignment:', error);
    }
  } else if (targetBlob) {
    // Even without auto-align, apply basic silence trimming to user recording
    try {
      console.log('🎧 Applying basic silence trimming...');
      const { detectSilenceBoundaries, trimSilence } = useAudioProcessing();
      
      const boundaries = await detectSilenceBoundaries(blob);
      if (boundaries.silenceStart > 0.2 || boundaries.silenceEnd > 0.2) {
        const trimResult = await trimSilence(blob, {
          trimStart: true,
          trimEnd: true,
          maxTrimStart: 2.0,
          maxTrimEnd: 1.5,
          padding: 0.05
        });
        
        if (trimResult.blob && (trimResult.trimmedStart > 0.1 || trimResult.trimmedEnd > 0.1)) {
          // Clean up old blob URL to prevent memory leaks
          if (userAudioUrl.value && userAudioUrl.value.startsWith('blob:')) {
            URL.revokeObjectURL(userAudioUrl.value);
          }
          
          userAudioBlob.value = trimResult.blob;
          userAudioUrl.value = URL.createObjectURL(trimResult.blob);
          
          console.log('🎵 Updated user audio URL after basic trimming:', userAudioUrl.value.slice(0, 50) + '...');
          
          // Force AudioPlayer to refresh
          await nextTick();
          
          const totalTrimmed = trimResult.trimmedStart + trimResult.trimmedEnd;
          console.log(`✂️ Auto-trimmed ${totalTrimmed.toFixed(3)}s of silence`);
        }
      }
    } catch (error) {
      console.warn('Error during basic trimming:', error);
    }
  }
  
  // Auto-play sequence: target first, then user recording
  if (autoPlayEnabled.value) {
    console.log('🎵 Auto-play is enabled, starting sequential playback...');
    
    const startSequentialPlayback = async () => {
      try {
        // First, play the target audio if available
        if (targetAudioPlayerRef.value && targetAudioPlayerRef.value.isReady) {
          console.log('🎵 Step 1: Playing target audio');
          await playAudioAndWait(targetAudioPlayerRef.value);
          
          // Small pause between target and user recording
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Then, play the user recording
        if (userAudioPlayerRef.value && userAudioPlayerRef.value.isReady) {
          console.log('🎵 Step 2: Playing user recording');
          await playAudioAndWait(userAudioPlayerRef.value);
        }
        
        console.log('🎵 Sequential playback completed');
      } catch (error) {
        console.error('🎵 Error during sequential playback:', error);
      }
    };
    
    // Wait for both players to be ready, then start sequence
    const waitAndPlay = (attempts = 0) => {
      const maxAttempts = 15; // 3 seconds of retries
      
      if (attempts >= maxAttempts) {
        console.warn('🎵 Auto-play failed: Max attempts reached');
        return;
      }
      
      const targetReady = !getTargetAudioUrl() || (targetAudioPlayerRef.value && targetAudioPlayerRef.value.isReady);
      const userReady = userAudioPlayerRef.value && userAudioPlayerRef.value.isReady;
      
      if (targetReady && userReady) {
        console.log('🎵 Both players ready, starting sequential playback');
        startManagedSequentialPlayback();
      } else {
        console.log(`🎵 Waiting for players to be ready... attempt ${attempts + 1}/${maxAttempts}`);
        setTimeout(() => waitAndPlay(attempts + 1), 200);
      }
    };
    
    setTimeout(() => waitAndPlay(0), 300);
  } else {
    console.log('🎵 Auto-play is disabled');
  }
};

// Enhanced manual alignment with user feedback
const manualAlign = async () => {
  const targetBlob = getTargetBlob();
  if (!targetBlob || !userAudioBlob.value) return;
  
  try {
    console.log('🔄 Manual alignment triggered with VAD settings:', vadSettings.value);
    
    // Use the new VAD trimming with user settings
    const result = await trimAudioWithVAD(userAudioBlob.value, {
      padding: vadSettings.value.padding,
      maxTrimStart: vadSettings.value.maxTrimStart,
      maxTrimEnd: vadSettings.value.maxTrimEnd
    });
    
    if (result.blob && result.blob !== userAudioBlob.value) {
      const userTrimmed = result.trimmedStart + result.trimmedEnd;
      console.log(`✂️ Manually trimmed ${userTrimmed.toFixed(3)}s from user recording`);
      console.log(`🎯 Original duration: ${result.originalDuration?.toFixed(3)}s, New duration: ${result.newDuration?.toFixed(3)}s`);
      
      // Clean up old blob URL to prevent memory leaks
      if (userAudioUrl.value && userAudioUrl.value.startsWith('blob:')) {
        URL.revokeObjectURL(userAudioUrl.value);
      }
      
      userAudioBlob.value = result.blob;
      userAudioUrl.value = URL.createObjectURL(result.blob);
      
      console.log('🎵 Updated user audio URL after manual trimming:', userAudioUrl.value.slice(0, 50) + '...');
      
      // Force AudioPlayer to refresh
      await nextTick();
      
      // Show detailed feedback
      showAlignmentFeedback(result, true);
    } else {
      console.log('📏 No significant improvements possible');
      alert('No significant silence detected to trim. Recording is already well-aligned!');
    }
  } catch (error) {
    console.error('Error during manual alignment:', error);
    alert('Error during alignment. Please try recording again.');
  }
};

// Show alignment feedback to user
const showAlignmentFeedback = (result, isManual = false) => {
  const userTrimmed = result.userTrimInfo.trimmedStart + result.userTrimInfo.trimmedEnd;
  const quality = (result.alignmentQuality * 100).toFixed(1);
  
  if (userTrimmed > 0.1) {
    const message = isManual 
      ? `✅ Manual alignment complete!\n✂️ Trimmed ${userTrimmed.toFixed(2)}s of silence\n🎯 Alignment quality: ${quality}%`
      : `✨ Audio automatically optimized!\n✂️ Removed ${userTrimmed.toFixed(2)}s of silence\n🎯 Alignment quality: ${quality}%`;
    
    // Only show alert for manual alignment or significant improvements
    if (isManual || userTrimmed > 0.5 || result.alignmentQuality > 0.8) {
      setTimeout(() => alert(message), 500); // Delay to avoid interfering with auto-play
    }
  }
};

// Central playback control functions
const playTarget = () => {
  console.log('🎯 Playing target audio');
  if (targetAudioPlayerRef.value && targetAudioPlayerRef.value.playPause) {
    targetAudioPlayerRef.value.playPause();
  }
};

const playUser = () => {
  console.log('🎤 Playing user recording');
  if (userAudioPlayerRef.value && userAudioPlayerRef.value.playPause) {
    userAudioPlayerRef.value.playPause();
  }
};

const playBoth = async () => {
  console.log('🔄 Playing both audio tracks sequentially');
  await startManagedSequentialPlayback();
};

const stopAll = () => {
  console.log('🛑 Stopping all audio');
  audioManager.stopAll();
};

// Helper function to play audio and wait for it to finish
const playAudioAndWait = (playerRef) => {
  return new Promise((resolve) => {
    if (!playerRef || !playerRef.isReady) {
      resolve();
      return;
    }
    
    // Listen for the audio to finish
    const originalOnFinish = playerRef.wavesurfer?.on;
    if (originalOnFinish) {
      const cleanup = playerRef.wavesurfer.on('finish', () => {
        cleanup();
        resolve();
      });
      
      // Start playing
      playerRef.playPause();
      
      // Fallback timeout in case finish event doesn't fire
      setTimeout(() => {
        cleanup();
        resolve();
      }, 10000); // 10 second max
    } else {
      // Fallback if we can't listen to events
      playerRef.playPause();
      setTimeout(resolve, 2000); // 2 second default
    }
  });
};


// Helper function to get target blob from current recording or manual upload
const getTargetBlob = () => {
  return currentRecording.value?.audioBlob || targetAudioBlob.value;
};

// Helper function to get target audio URL with proper fallback
const getTargetAudioUrl = () => {
  return currentRecording.value?.audioUrl || targetAudioUrl.value;
};

// Helper function to create a unique key for AudioPlayer re-rendering
const getTargetAudioKey = () => {
  if (currentRecording.value) {
    return `recording-${currentRecording.value.id}`;
  }
  return `manual-${targetAudioUrl.value ? targetAudioUrl.value.slice(-10) : 'none'}`;
};

// Helper function to create unique key for user AudioPlayer (forces re-render when URL changes)
const getUserAudioKey = () => {
  const url = currentRecording.value?.userRecording?.audioUrl || userAudioUrl.value;
  if (url) {
    // Use the full URL hash to ensure uniqueness when URL changes
    const urlHash = url.split('//')[1] || url; // Remove protocol for shorter key
    const uniqueKey = `user-${urlHash}`;
    console.log('🔑 USER AUDIO KEY: Generated key:', uniqueKey, 'for URL:', url.slice(0, 50) + '...');
    return uniqueKey;
  }
  console.log('🔑 USER AUDIO KEY: No URL, returning default key');
  return 'user-none';
};

const markCurrentCompleted = () => {
  if (currentRecording.value && !currentRecording.value.userRecording.isCompleted) {
    markRecordingCompleted();
    console.log('✅ Marked current recording as completed via button');
  }
};

const saveRecording = async () => {
  const targetBlob = getTargetBlob();
  if (targetBlob && userAudioBlob.value) {
    try {
      await addRecording(targetBlob, userAudioBlob.value);
      alert('Recording saved!');
      // Optionally clear current recordings or refresh list
      targetAudioUrl.value = null;
      targetAudioBlob.value = null;
      userAudioUrl.value = null;
      userAudioBlob.value = null;
      console.log('Recording saved and cleared.');
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Failed to save recording.');
    }
  }
};

const loadSavedRecording = (recording) => {
  targetAudioBlob.value = recording.targetAudio;
  targetAudioUrl.value = URL.createObjectURL(recording.targetAudio);
  userAudioBlob.value = recording.userAudio;
  userAudioUrl.value = URL.createObjectURL(recording.userAudio);
  console.log('Loaded Target Audio URL:', targetAudioUrl.value);
  console.log('Loaded User Audio URL:', userAudioUrl.value);
};

const deleteSavedRecording = async (id) => {
  try {
    await deleteRecording(id);
    alert('Recording deleted!');
    // Refresh the list in RecordingList component
    console.log('Recording deleted:', id);
  } catch (error) {
    console.error('Error deleting recording:', error);
    alert('Failed to delete recording.');
  }
};

// New managed sequential playback function
const startManagedSequentialPlayback = async () => {
  const players = [];
  const delays = [];
  
  // Add target player if available
  if (targetAudioPlayerRef.value && targetAudioPlayerRef.value.isReady && targetAudioPlayerRef.value.playerInfo && targetAudioPlayerRef.value.playerInfo()) {
    players.push(targetAudioPlayerRef.value.playerInfo());
    delays.push(0); // No delay for first player
  }
  
  // Add user player if available  
  if (userAudioPlayerRef.value && userAudioPlayerRef.value.isReady && userAudioPlayerRef.value.playerInfo && userAudioPlayerRef.value.playerInfo()) {
    players.push(userAudioPlayerRef.value.playerInfo());
    delays.push(500); // 500ms delay between target and user
  }
  
  if (players.length > 0) {
    await audioManager.playSequential(players, delays);
    console.log('🎵 Sequential playback completed');
  } else {
    console.warn('🎵 No players available for sequential playback');
  }
};

</script>

<style scoped>
.practice-view {
  min-height: 100vh;
  font-family: sans-serif;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
}

.main-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

h1 {
  color: #333;
  margin: 0;
  font-size: 22px;
}


.column-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
  min-height: 80px; /* Fixed height to ensure alignment */
}

.column-header h3 {
  margin: 0;
  color: #1f2937;
  font-weight: 600;
  font-size: 18px;
}

.target-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  min-height: 48px; /* Ensure consistent height */
}

.recording-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  min-height: 48px; /* Ensure consistent height */
}

.control-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.audio-display {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background-color: #f9fafb;
  font-size: 14px;
  color: #374151;
  min-height: 20px;
  display: flex;
  align-items: center;
}

.placeholder-text {
  color: #9ca3af;
  font-style: italic;
}

.current-source {
  color: #374151;
  font-weight: 500;
  word-break: break-all;
}


.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  min-width: 400px;
  max-width: 90vw;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.url-input-modal {
  width: 100%;
  padding: 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
}

.url-input-modal:focus {
  outline: none;
  border-color: #3b82f6;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn {
  padding: 8px 16px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background-color: white;
  color: #374151;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background-color: #f3f4f6;
}

.load-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.load-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.load-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.action-btn {
  padding: 8px 12px;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  background-color: white;
  color: #3b82f6;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: 500;
}

.action-btn:hover {
  background-color: #3b82f6;
  color: white;
}

.file-btn {
  border-color: #059669;
  color: #059669;
}

.file-btn:hover {
  background-color: #059669;
  color: white;
}

.url-btn {
  border-color: #7c3aed;
  color: #7c3aed;
}

.url-btn:hover {
  background-color: #7c3aed;
  color: white;
}


.bottom-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin: 20px 0;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  flex-wrap: wrap;
}

.auto-play-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  user-select: none;
}

.auto-play-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.options-group {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
}

.auto-align-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  user-select: none;
}

.auto-align-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.time-sync-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  user-select: none;
}

.time-sync-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.align-btn {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background-color: #f59e0b;
  color: white;
  transition: background-color 0.2s;
}

.align-btn:hover:not(:disabled) {
  background-color: #d97706;
}

.align-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.save-btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background-color: #3B82F6;
  color: white;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.save-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.save-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.complete-btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background-color: #10b981;
  color: white;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.complete-btn:hover:not(:disabled) {
  background-color: #059669;
}

.complete-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.central-playback-controls {
  background-color: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  text-align: center;
}

.central-playback-controls h3 {
  margin: 0 0 15px 0;
  color: #1e293b;
  font-size: 18px;
  font-weight: 600;
}

.playback-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  max-width: 600px;
  margin: 0 auto;
}

.playback-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px 12px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  min-height: 70px;
  min-width: 110px;
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
}

@media (max-width: 640px) {
  .playback-btn {
    min-width: 100px;
    font-size: 12px;
    padding: 12px 8px;
    gap: 6px;
  }
  
  .playback-btn .btn-icon {
    font-size: 18px;
  }
}

.playback-btn .btn-icon {
  font-size: 24px;
}

.target-btn {
  background-color: #3b82f6;
  color: white;
}

.target-btn:hover:not(:disabled) {
  background-color: #2563eb;
  transform: translateY(-2px);
}

.user-btn {
  background-color: #10b981;
  color: white;
}

.user-btn:hover:not(:disabled) {
  background-color: #059669;
  transform: translateY(-2px);
}

.both-btn {
  background-color: #8b5cf6;
  color: white;
}

.both-btn:hover:not(:disabled) {
  background-color: #7c3aed;
  transform: translateY(-2px);
}

.stop-btn {
  background-color: #ef4444;
  color: white;
}

.stop-btn:hover:not(:disabled) {
  background-color: #dc2626;
  transform: translateY(-2px);
}

.playback-btn:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
  transform: none;
}

.visualization-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
  align-items: start;
}

.audio-column {
  background-color: #1a1a1a; /* Darker background to match visualization */
  border: 1px solid #444;
  border-radius: 8px;
  padding: 12px;
  min-width: 0;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}


.placeholder {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
  border: 2px dashed #555;
  border-radius: 8px;
  font-size: 14px;
  background-color: #1a1a1a;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  transition: all 0.3s ease;
}

.recording-placeholder {
  background-color: #1a1a1a;
  border-color: #ef4444;
  color: #ef4444;
}

.recording-indicator-text {
  font-weight: 600;
  animation: pulse 1.5s infinite;
}

.section {
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

h2 {
  color: #555;
  margin-top: 0;
  margin-bottom: 15px;
}

button {
  padding: 10px 20px;
  background-color: #3B82F6;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
}

button:disabled {
  background-color: #999;
  cursor: not-allowed;
}

/* Medium screens */
@media (max-width: 900px) {
  .playback-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

/* Small screens */
@media (max-width: 768px) {
  .practice-view {
    flex-direction: column;
    height: auto;
  }
  
  .main-content {
    max-width: 100%;
    padding: 15px;
  }
  
  .visualization-container {
    grid-template-columns: 1fr;
  }
  
  .column-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .column-header h3 {
    text-align: center;
  }
  
  .bottom-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .options-group {
    justify-content: center;
  }
  
  .playback-buttons {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    max-width: 100%;
  }
  
  .playback-btn {
    min-height: 60px;
    padding: 10px 8px;
    font-size: 12px;
  }
  
  .playback-btn .btn-icon {
    font-size: 20px;
  }
  
  .control-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .audio-display {
    order: 1;
  }
  
  .action-btn {
    order: 2;
  }
  
  .modal-content {
    min-width: 300px;
    margin: 20px;
  }
}

/* Enhanced Alignment Controls */
.alignment-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Removed alignment-mode-select styles - now using simple trim silence toggle */

.align-btn {
  padding: 8px 16px;
  border: 2px solid #8b5cf6;
  border-radius: 6px;
  background-color: white;
  color: #8b5cf6;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.align-btn:hover:not(:disabled) {
  background-color: #8b5cf6;
  color: white;
  transform: translateY(-1px);
}

.align-btn:disabled {
  background-color: #f9fafb;
  border-color: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
}

.align-btn.processing {
  background-color: #f59e0b;
  border-color: #f59e0b;
  color: white;
  animation: pulse 1.5s infinite;
}

.settings-btn {
  background: #6b7280;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  margin-left: 8px;
}

.settings-btn:hover {
  background: #4b5563;
  transform: scale(1.05);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.auto-align-toggle {
  font-weight: 500;
  color: #374151;
}
</style>