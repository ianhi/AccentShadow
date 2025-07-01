<template>
  <div class="recording-sets-manager">
    <!-- Header -->
    <div class="manager-header">
      <h3>📚 Recording Sets ({{ recordingSets.length }})</h3>
      <span v-if="activeSet" class="current-set">Current: {{ activeSet.name }}</span>
    </div>

    <!-- Content -->
    <div class="manager-content">
      
      <!-- Action Buttons -->
      <div class="action-buttons">
        <button @click="loadDemoData" :disabled="isLoadingDemo" class="action-btn demo-btn">
          {{ isLoadingDemo ? '⏳' : '🎯' }} {{ isLoadingDemo ? 'Loading...' : 'Load Demo' }}
        </button>
        <button @click="showFolderUpload = true" class="action-btn upload-btn">
          📁 Upload Folder
        </button>
        <button @click="showOnlineImport = true" class="action-btn online-btn">
          🌐 Online Sources
        </button>
      </div>

      <!-- Search and Filter -->
      <div class="search-filter" v-if="recordingSets.length > 0">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="🔍 Search recording sets..."
          class="search-input"
        />
        <select v-model="languageFilter" class="language-filter">
          <option value="">All Languages</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="zh">Chinese</option>
          <option value="other">Other</option>
        </select>
      </div>

      <!-- Recording Sets Grid -->
      <div v-if="filteredSets.length > 0" class="sets-grid">
        <div 
          v-for="set in filteredSets" 
          :key="set.id"
          class="set-card"
          :class="{ 'active': set.id === activeSetId }"
          @click="selectSet(set.id)"
        >
          <div class="set-header">
            <div class="set-name">{{ set.name }}</div>
            <button @click.stop="deleteSet(set.id)" class="delete-btn" title="Delete Set">
              🗑️
            </button>
          </div>
          
          <div class="set-meta">
            <span class="language-badge">{{ getLanguageName(set.language) }}</span>
            <span class="source-badge">{{ getSourceIcon(set.source) }}</span>
            <span class="count">{{ set.recordings.length }} recordings</span>
          </div>
          
          <div class="set-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: set.progress.percentage + '%' }"
              ></div>
            </div>
            <div class="progress-text">{{ set.progress.completed }}/{{ set.progress.total }}</div>
          </div>

          <div v-if="set.id === activeSetId" class="current-recording">
            Current: {{ currentRecording ? currentRecording.name : 'None selected' }}
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="recordingSets.length === 0" class="empty-state">
        <div class="empty-icon">📂</div>
        <p>No recording sets yet.</p>
        <p class="empty-hint">Try "🎯 Load Demo" for sample recordings, or use "📁 Upload Folder" with your own audio files!</p>
      </div>

      <!-- No Search Results -->
      <div v-else class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No sets match your search.</p>
      </div>

    </div>

    <!-- Folder Upload Modal -->
    <FolderUpload 
      v-if="showFolderUpload" 
      @close="showFolderUpload = false"
      @imported="handleFolderImported"
    />

    <!-- Online Import Modal (Placeholder) -->
    <div v-if="showOnlineImport" class="modal-overlay">
      <div class="modal-content">
        <h3>🌐 Online Sources</h3>
        <p>Coming soon! Integration with Tatoeba, Forvo, and other sources.</p>
        <button @click="showOnlineImport = false" class="close-modal-btn">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRecordingSets } from '../composables/useRecordingSets';
import { useDemoData } from '../composables/useDemoData';
import FolderUpload from './FolderUpload.vue';

const {
  recordingSets,
  activeSetId,
  activeSet,
  currentRecording,
  setActiveSet,
  deleteRecordingSet,
  getSetStatistics
} = useRecordingSets();

const {
  isLoadingDemo,
  loadDemoData: loadDemo
} = useDemoData();

// Component state
const searchQuery = ref('');
const languageFilter = ref('');
const showFolderUpload = ref(false);
const showOnlineImport = ref(false);

// Computed properties
const filteredSets = computed(() => {
  let filtered = recordingSets.value;

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(set => 
      set.name.toLowerCase().includes(query) ||
      set.recordings.some(r => r.name.toLowerCase().includes(query))
    );
  }

  // Filter by language
  if (languageFilter.value) {
    filtered = filtered.filter(set => set.language === languageFilter.value);
  }

  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
});

// Methods
const selectSet = (setId) => {
  setActiveSet(setId);
  console.log('📁 Selected recording set:', setId);
};

const deleteSet = (setId) => {
  const set = recordingSets.value.find(s => s.id === setId);
  if (set && confirm(`Delete "${set.name}" and all its recordings?`)) {
    deleteRecordingSet(setId);
  }
};

const handleFolderImported = (recordingSet) => {
  console.log('✅ Recording set imported:', recordingSet.name);
  showFolderUpload.value = false;
  // Auto-select the newly imported set
  setActiveSet(recordingSet.id);
};

const loadDemoData = async () => {
  const success = await loadDemo();
  if (success) {
    console.log('✅ Demo data loaded from RecordingSetsManager');
  }
};

const getLanguageName = (code) => {
  const languages = {
    'en': 'English',
    'es': 'Spanish', 
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'ru': 'Russian'
  };
  return languages[code] || code.toUpperCase();
};

const getSourceIcon = (source) => {
  const icons = {
    'manual': '✋',
    'upload': '📁',
    'demo': '🎯',
    'tatoeba': '📝',
    'forvo': '🔊',
    'rhinospike': '🦏'
  };
  return icons[source] || '📄';
};
</script>

<style scoped>
.recording-sets-manager {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  margin: 20px 0;
  overflow: hidden;
}

.manager-header {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.manager-header h3 {
  margin: 0;
  font-size: 18px;
  color: white;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.current-set {
  color: rgba(59, 130, 246, 0.9);
  font-weight: 500;
  font-size: 14px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.manager-content {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

/* Custom scrollbar styling for dark theme */
.manager-content::-webkit-scrollbar {
  width: 8px;
}

.manager-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.manager-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.manager-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  justify-content: center;
}

.action-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.upload-btn {
  background: rgba(59, 130, 246, 0.9);
  color: white;
}

.upload-btn:hover {
  background: rgba(37, 99, 235, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.online-btn {
  background: rgba(16, 185, 129, 0.9);
  color: white;
}

.online-btn:hover {
  background: rgba(5, 150, 105, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.demo-btn {
  background: rgba(168, 85, 247, 0.9);
  color: white;
}

.demo-btn:hover:not(:disabled) {
  background: rgba(147, 51, 234, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
}

.demo-btn:disabled {
  background: rgba(168, 85, 247, 0.5);
  cursor: not-allowed;
  transform: none;
}

.search-filter {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  backdrop-filter: blur(10px);
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.search-input:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.language-filter {
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.language-filter:focus {
  outline: none;
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.language-filter option {
  background: #1a1a2e;
  color: white;
}

.sets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.set-card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  backdrop-filter: blur(10px);
}

.set-card:hover {
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  transform: translateY(-1px);
}

.set-card.active {
  border-color: rgba(59, 130, 246, 0.8);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.1);
}

.set-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.set-name {
  font-weight: 600;
  color: white;
  font-size: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: rgba(220, 38, 38, 0.2);
  color: rgba(248, 113, 113, 0.9);
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.set-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(220, 38, 38, 0.3);
  transform: scale(1.1);
}

.set-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.language-badge,
.source-badge {
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.language-badge {
  color: rgba(59, 130, 246, 0.9);
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

.count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}

.set-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: rgba(16, 185, 129, 0.8);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  white-space: nowrap;
}

.current-recording {
  font-size: 12px;
  color: rgba(59, 130, 246, 0.9);
  font-weight: 500;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
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
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  max-width: 400px;
  margin: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.modal-content p {
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.close-modal-btn {
  margin-top: 16px;
  padding: 10px 20px;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  backdrop-filter: blur(10px);
  transition: all 0.2s;
}

.close-modal-btn:hover {
  background: rgba(37, 99, 235, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

@media (max-width: 768px) {
  .recording-sets-manager {
    width: 95vw;
    bottom: 10px;
  }
  
  .sets-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .search-filter {
    flex-direction: column;
  }
  
  .manager-content {
    padding: 16px;
  }
}
</style>
