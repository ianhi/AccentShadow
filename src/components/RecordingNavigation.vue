<template>
  <div class="recording-navigation" v-if="activeSet">
    <div class="nav-header">
      <div class="current-recording">
        <h3>{{ currentRecording?.name || 'No recording selected' }}</h3>
        <div class="recording-info">
          <span class="recording-counter">{{ currentIndex + 1 }} / {{ activeSet.recordings.length }}</span>
          <span class="recording-category" v-if="currentRecording?.metadata?.category">
            📂 {{ currentRecording.metadata.category }}
          </span>
        </div>
      </div>
      
      <div class="progress-info">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :style="{ width: activeSet.progress.percentage + '%' }"
          ></div>
        </div>
        <span class="progress-text">{{ activeSet.progress.completed }}/{{ activeSet.progress.total }} completed</span>
      </div>
    </div>

    <div class="nav-controls">
      <div class="nav-buttons">
        <button 
          @click="previousRecording" 
          :disabled="currentIndex === 0"
          class="nav-btn prev-btn"
          title="Previous recording"
        >
          ◀ Previous
        </button>
        
        <button 
          @click="nextRecording" 
          :disabled="currentIndex >= activeSet.recordings.length - 1"
          class="nav-btn next-btn"
          title="Next recording"
        >
          Next ▶
        </button>
        
        <button 
          @click="randomRecording"
          :disabled="activeSet.recordings.length <= 1"
          class="nav-btn random-btn"
          title="Random recording"
        >
          🔀 Random
        </button>
        
        <button 
          @click="showRecordingList = !showRecordingList"
          class="nav-btn list-btn"
          title="Show recording list"
        >
          📋 {{ showRecordingList ? 'Hide' : 'Show' }} List
        </button>
      </div>

      <div class="completion-controls">
        <button 
          @click="markCompleted"
          :disabled="!currentRecording || currentRecording.userRecording.isCompleted"
          class="completion-btn"
          :class="{ 'completed': currentRecording?.userRecording.isCompleted }"
        >
          {{ currentRecording?.userRecording.isCompleted ? '✅ Completed' : '✓ Mark Complete' }}
        </button>
        
        <div class="attempts-info" v-if="currentRecording">
          🎤 {{ currentRecording.userRecording.attempts }} attempts
        </div>
      </div>
    </div>

    <div v-if="showRecordingList" class="recording-list">
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
        <div 
          v-for="(recording, index) in filteredRecordings" 
          :key="recording.id"
          class="list-item"
          :class="{ 
            'active': index === currentIndex,
            'completed': recording.userRecording.isCompleted,
            'attempted': recording.userRecording.attempts > 0
          }"
          @click="goToRecording(index)"
        >
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

const {
  activeSet,
  currentRecording,
  currentRecordingIndex,
  nextRecording,
  previousRecording,
  randomRecording,
  goToRecording,
  markRecordingCompleted
} = useRecordingSets();

// Component state
const showRecordingList = ref(false);
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
const markCompleted = () => {
  if (currentRecording.value && !currentRecording.value.userRecording.isCompleted) {
    markRecordingCompleted();
    console.log('✅ Marked current recording as completed');
  }
};
</script>

<style scoped>
.recording-navigation {
  background-color: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.current-recording h3 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 20px;
  font-weight: 600;
}

.recording-info {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 14px;
  color: #6b7280;
}

.recording-counter {
  font-weight: 600;
  color: #3b82f6;
}

.recording-category {
  background-color: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.progress-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.progress-bar {
  width: 120px;
  height: 6px;
  background-color: #e5e7eb;
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
  color: #6b7280;
  font-weight: 500;
}

.nav-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.nav-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.nav-btn {
  padding: 8px 16px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  color: #3b82f6;
  background-color: #f8fafc;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.random-btn:hover:not(:disabled) {
  border-color: #8b5cf6;
  color: #8b5cf6;
}

.list-btn:hover:not(:disabled) {
  border-color: #059669;
  color: #059669;
}

.completion-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.completion-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.2s;
  background-color: #10b981;
  color: white;
}

.completion-btn.completed {
  background-color: #6b7280;
  cursor: default;
}

.completion-btn:hover:not(:disabled):not(.completed) {
  background-color: #059669;
}

.completion-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.attempts-info {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.recording-list {
  margin-top: 20px;
  border-top: 1px solid #e5e7eb;
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
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.filter-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  background-color: white;
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
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: white;
}

.list-item:hover {
  border-color: #3b82f6;
  background-color: #f8fafc;
}

.list-item.active {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.list-item.completed {
  background-color: #f0fdf4;
}

.list-item.attempted:not(.completed) {
  background-color: #fefce8;
}

.item-main {
  flex: 1;
}

.item-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 14px;
  margin-bottom: 2px;
}

.item-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
}

.item-category {
  background-color: #f3f4f6;
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
  color: #d1d5db;
}

@media (max-width: 768px) {
  .nav-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .progress-info {
    align-items: stretch;
  }
  
  .progress-bar {
    width: 100%;
  }
  
  .nav-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .nav-buttons {
    justify-content: center;
  }
  
  .completion-controls {
    justify-content: center;
  }
}
</style>