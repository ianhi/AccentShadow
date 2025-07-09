<template>
  <div class="unified-audio-controls" :class="{ 'mobile-layout': shouldUseMobileLayout }">

    <div class="recording-info-row">
      <template v-if="currentRecording">
        <span class="info-label">File Name</span>
        <span class="recording-name">{{ currentRecording.name }}</span>
        <span class="recording-counter">{{ currentIndex + 1 }} / {{ activeSet?.recordings.length || 0 }}</span>
        <span class="attempts-info">🎤 {{ currentRecording.userRecording.attempts }} attempts</span>
        <div class="progress-section" v-if="activeSet">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: activeSet.progress.percentage + '%' }"></div>
          </div>
          <span class="progress-text">{{ activeSet.progress.completed }}/{{ activeSet.progress.total }}</span>
        </div>
      </template>

      <template v-else-if="currentAudioSource">
        <span class="info-label">File</span>
        <span class="recording-name">{{ currentAudioSource }}</span>
        <span class="source-type">📁 Single file</span>
      </template>

      <template v-else>
        <span class="info-label">Status</span>
        <span class="no-audio-text">No audio selected</span>
      </template>
      
      <div class="audio-loading-group">
        <AudioLoadButtons @browse-file="$emit('browse-file')" @upload-folder="triggerFolderUpload" 
          @load-url="$emit('load-url')" @open-sets="showRecordingSetsModal = true" />
      </div>
    </div>

    <div class="navigation-section">
      <div class="controls-row">
      <button @click="previousRecording" :disabled="!activeSet || currentIndex === 0" class="nav-btn prev-btn"
        title="Previous recording">
        ◀ Previous
      </button>

      <button @click="nextRecording" :disabled="!activeSet || currentIndex >= (activeSet.recordings.length - 1)"
        class="nav-btn next-btn" title="Next recording">
        Next ▶
      </button>


      <button 
        @click="showRecordingList = !showRecordingList" 
        :disabled="!activeSet || !activeSet.recordings.length"
        class="nav-btn list-btn" 
        title="Show recording list"
      >
        📋 {{ showRecordingList ? 'Hide' : 'Show' }} List
      </button>

      <button @click="toggleCompleted" :disabled="!currentRecording" class="nav-btn completion-btn"
        :class="{ 'completed': currentRecording?.userRecording.isCompleted }" title="Toggle completion status">
        {{ currentRecording?.userRecording.isCompleted ? '✅ Completed' : '✓ Mark Complete' }}
      </button>

      <div class="microphone-wrapper">
        <div class="microphone-separator"></div>
        <MicrophoneSelector :availableDevices="availableDevices" :selectedDeviceId="selectedDeviceId"
          :disabled="isRecording" @device-change="handleDeviceChange"
          :class="{ 'mobile-microphone': shouldUseMobileLayout }" />
      </div>
    </div>
  </div>

    <!-- Recording Sets Modal -->
    <RecordingSetsModal :isVisible="showRecordingSetsModal" @close="showRecordingSetsModal = false" />

    <!-- Recording List (Expandable) -->
    <div v-if="showRecordingList && activeSet" class="recording-list">
      <div class="list-header">
        <h4>All Recordings</h4>
        <div class="list-filters">
          <select v-model="listFilter" class="filter-select">
            <option value="all">All</option>
            <option value="incomplete">Incomplete</option>
            <option value="completed">Completed</option>
            <option value="attempted">Attempted</option>
          </select>
        </div>
      </div>

      <div class="list-items">
        <div v-for="(recording, index) in filteredRecordings" :key="recording.id" class="list-item" :class="{
          'active': index === currentIndex,
          'completed': recording.userRecording.isCompleted,
          'attempted': recording.userRecording.attempts > 0
        }" @click="goToRecording(index)">
          <div class="item-main">
            <div class="item-name">{{ recording.name }}</div>
            <div class="item-meta">
              <span class="item-category">{{ recording.metadata.category }}</span>
              <span class="item-attempts" v-if="recording.userRecording.attempts > 0">
                {{ recording.userRecording.attempts }} attempts
              </span>
            </div>
          </div>

          <div class="item-status">
            <span v-if="recording.userRecording.isCompleted" class="status-completed">✅</span>
            <span v-else-if="recording.userRecording.attempts > 0" class="status-attempted">🎤</span>
            <span v-else class="status-new">○</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRecordingSets } from '../composables/useRecordingSets';
import { useViewport } from '../composables/useViewport';
import AudioLoadButtons from './AudioLoadButtons.vue';
import MicrophoneSelector from './MicrophoneSelector.vue';
import RecordingSetsModal from './RecordingSetsModal.vue';

// Props
const props = defineProps({
  currentAudioSource: {
    type: String,
    default: ''
  },
  availableDevices: {
    type: Array,
    default: () => []
  },
  selectedDeviceId: {
    type: String,
    default: null
  },
  isRecording: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['browse-file', 'load-url', 'device-change']);

// Composables
const { shouldUseMobileLayout } = useViewport();
const {
  activeSet,
  currentRecording,
  currentRecordingIndex,
  nextRecording,
  previousRecording,
  goToRecording,
  markRecordingCompleted,
  setActiveSet,
  createRecordingSet
} = useRecordingSets();

// Component state
const showRecordingList = ref(false);
const showRecordingSetsModal = ref(false);
const listFilter = ref('all');

// Computed properties
const currentIndex = computed(() => currentRecordingIndex.value);

const filteredRecordings = computed(() => {
  if (!activeSet.value) return [];

  let recordings = activeSet.value.recordings;

  switch (listFilter.value) {
    case 'completed':
      return recordings.filter(r => r.userRecording.isCompleted);
    case 'incomplete':
      return recordings.filter(r => !r.userRecording.isCompleted);
    case 'attempted':
      return recordings.filter(r => r.userRecording.attempts > 0);
    default:
      return recordings;
  }
});

// Methods
const toggleCompleted = () => {
  if (!currentRecording.value) return;

  const wasCompleted = currentRecording.value.userRecording.isCompleted;
  
  // Toggle the completion status
  currentRecording.value.userRecording.isCompleted = !currentRecording.value.userRecording.isCompleted;

  if (currentRecording.value.userRecording.isCompleted) {
    currentRecording.value.userRecording.lastPracticed = new Date().toISOString();
    console.log('✅ Marked recording as completed:', currentRecording.value.name);
    
    // Auto-advance to next recording when marking as complete (not when unmarking)
    if (!wasCompleted && activeSet.value && currentIndex.value < (activeSet.value.recordings.length - 1)) {
      console.log('🎯 Auto-advancing to next recording...');
      setTimeout(() => {
        nextRecording();
      }, 200); // Quick delay to let user see the completion status change
    }
  } else {
    console.log('↩️ Unmarked recording as completed:', currentRecording.value.name);
  }

  // Update progress for the active set
  if (activeSet.value) {
    const completed = activeSet.value.recordings.filter(r => r.userRecording.isCompleted).length;
    const total = activeSet.value.recordings.length;
    activeSet.value.progress = {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }
};

const handleDeviceChange = (deviceId) => {
  emit('device-change', deviceId);
};

const triggerFolderUpload = () => {
  // Create a folder input element
  const input = document.createElement('input');
  input.type = 'file';
  input.webkitdirectory = true;
  input.multiple = true;
  input.style.display = 'none';
  
  input.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    try {
      // Process the files and create a recording set
      const folderName = files[0].webkitRelativePath.split('/')[0];
      const audioFiles = files.filter(file => {
        const isAudio = file.type.startsWith('audio/') || 
                       /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i.test(file.name);
        return isAudio;
      });
      
      if (audioFiles.length === 0) {
        alert('No audio files found in the selected folder.');
        return;
      }
      
      console.log(`📁 Processing ${audioFiles.length} audio files from folder: ${folderName}`);
      
      // Create recordings array
      const recordings = [];
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const pathParts = file.webkitRelativePath.split('/');
        const category = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'general';
        const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        
        recordings.push({
          name: name,
          translation: '',
          audioUrl: URL.createObjectURL(file),
          audioBlob: file,
          metadata: {
            category: category,
            fileName: file.name,
            fileSize: file.size,
            filePath: file.webkitRelativePath || file.name
          }
        });
      }
      
      // Create the recording set
      const recordingSet = createRecordingSet(
        folderName.replace(/[-_]/g, ' '),
        'upload',
        'en',
        recordings
      );
      
      console.log('✅ Recording set created:', recordingSet.name);
      // Auto-select the newly imported set
      setActiveSet(recordingSet.id);
      
    } catch (error) {
      console.error('❌ Error processing folder:', error);
      alert(`Failed to process folder: ${error.message}`);
    }
    
    // Clean up
    document.body.removeChild(input);
  });
  
  document.body.appendChild(input);
  input.click();
};
</script>

<style scoped>
.unified-audio-controls {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
  color: white;
}

/* Recording Info Row */
.recording-info-row {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
  min-width: 0;
}

/* Navigation Section */
.navigation-section {
  display: flex;
  flex-direction: column;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.audio-loading-group {
  display: flex;
  align-items: center;
  margin-left: auto;
  min-width: 0;
  flex-shrink: 1;
}

.nav-btn {
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: white;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  border-color: #60a5fa;
  background: rgba(96, 165, 250, 0.2);
  transform: translateY(-1px);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.random-btn:hover:not(:disabled) {
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.2);
}

.list-btn:hover:not(:disabled) {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.2);
}

.completion-btn {
  border-color: #10b981 !important;
  background: rgba(16, 185, 129, 0.1) !important;
}

.completion-btn:hover:not(:disabled) {
  border-color: #10b981 !important;
  background: rgba(16, 185, 129, 0.2) !important;
}

.completion-btn.completed {
  background: rgba(16, 185, 129, 0.3) !important;
  color: #10b981 !important;
}

.microphone-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.microphone-separator {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.recording-name {
  font-weight: 600;
  color: white;
  flex: 1;
}

.recording-counter {
  font-weight: 600;
  color: #60a5fa;
}

.attempts-info {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.source-type {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.info-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  min-width: 60px;
}

.no-audio-text {
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.progress-bar {
  width: 100px;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #10b981;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  white-space: nowrap;
}

/* Recording List */
.recording-list {
  margin-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.list-header h4 {
  margin: 0;
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.filter-select {
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  backdrop-filter: blur(10px);
}

.list-items {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.05);
}

.list-item:hover {
  border-color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
}

.list-item.active {
  border-color: #60a5fa;
  background: rgba(96, 165, 250, 0.2);
}

.list-item.completed {
  background: rgba(16, 185, 129, 0.1);
}

.list-item.attempted:not(.completed) {
  background: rgba(245, 158, 11, 0.1);
}

.item-main {
  flex: 1;
}

.item-name {
  font-weight: 500;
  color: white;
  font-size: 14px;
  margin-bottom: 2px;
}

.item-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.item-category {
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 6px;
  border-radius: 3px;
}

.item-status {
  font-size: 16px;
}

.status-completed {
  color: #10b981;
}

.status-attempted {
  color: #f59e0b;
}

.status-new {
  color: rgba(255, 255, 255, 0.4);
}

/* Large screens - handle button overflow gracefully */
@media (max-width: 1400px) and (min-width: 1025px) {
  .recording-info-row {
    gap: 12px;
  }
  
  .audio-loading-group {
    flex-shrink: 1;
    min-width: 0;
  }
}

/* Medium screens - adjust layout before full mobile */
@media (max-width: 1024px) and (min-width: 769px) {
  .recording-info-row {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .audio-loading-group {
    width: 100%;
    margin-left: 0;
    margin-top: 8px;
    justify-content: center;
  }
  
  .recording-name {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* Mobile Layout */
@media (max-width: 768px) {
  .unified-audio-controls {
    padding: 6px;
    margin-bottom: 8px;
  }

  .recording-info-row {
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px 0;
    margin-bottom: 8px;
  }

  .recording-name {
    width: 100%;
    font-size: 13px;
  }

  .progress-section {
    width: 100%;
    margin-left: 0;
  }

  .progress-bar {
    flex: 1;
  }

  .audio-loading-group {
    width: 100%;
    margin-left: 0;
    margin-bottom: 8px;
    display: flex;
    justify-content: center;
  }

  .navigation-section {
    margin-top: 0;
  }

  .controls-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: auto;
    gap: 4px;
    align-items: stretch;
  }

  .nav-btn {
    font-size: 0;
    padding: 10px;
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-btn::before {
    font-size: 16px;
  }

  .prev-btn {
    grid-column: 1;
    grid-row: 1;
  }

  .prev-btn::before {
    content: "◀";
  }

  .next-btn {
    grid-column: 2;
    grid-row: 1;
  }

  .next-btn::before {
    content: "▶";
  }

  .list-btn {
    grid-column: 3;
    grid-row: 1;
  }

  .list-btn::before {
    content: "📋";
  }

  .completion-btn {
    grid-column: 4;
    grid-row: 1;
    font-size: 0;
    padding: 12px;
  }

  .completion-btn::before {
    content: "✓";
    font-size: 16px;
  }

  .completion-btn.completed::before {
    content: "✅";
  }

  .microphone-wrapper {
    display: none;
  }

  .microphone-separator {
    display: none;
  }
}
</style>
