<template>
  <div class="recording-sets-sidebar">
    <div class="sidebar-header">
      <h2>📚 Recording Sets</h2>
      <div class="header-actions">
        <button @click="showOnlineImport = true" class="add-btn" title="Add from Online Sources">
          🌐
        </button>
      </div>
    </div>

    <div class="search-filter">
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

    <div class="sets-list">
      <div v-if="filteredSets.length === 0" class="empty-state">
        <div class="empty-icon">📂</div>
        <p v-if="recordingSets.length === 0">No recording sets yet.</p>
        <p v-else>No sets match your search.</p>
        <p v-if="recordingSets.length === 0" class="empty-hint">
          Use the "📁 Upload Folder" button in the main area to get started.
        </p>
      </div>

      <div 
        v-for="set in filteredSets" 
        :key="set.id"
        class="set-item"
        :class="{ 'active': set.id === activeSetId }"
        @click="selectSet(set.id)"
      >
        <div class="set-main">
          <div class="set-info">
            <div class="set-name">{{ set.name }}</div>
            <div class="set-meta">
              <span class="language-badge">{{ getLanguageName(set.language) }}</span>
              <span class="source-badge">{{ getSourceIcon(set.source) }}</span>
              <span class="count">{{ set.recordings.length }} recordings</span>
            </div>
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
        </div>

        <div v-if="set.id === activeSetId" class="set-details">
          <div class="current-recording">
            <span class="current-label">Current:</span>
            <span class="current-name">
              {{ currentRecording ? currentRecording.name : 'None selected' }}
            </span>
          </div>
          
          <div class="set-stats">
            <div class="stat">
              <span class="stat-label">Attempted:</span>
              <span class="stat-value">{{ getSetStats(set.id)?.attempted || 0 }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Avg Attempts:</span>
              <span class="stat-value">{{ getSetStats(set.id)?.averageAttempts || 0 }}</span>
            </div>
          </div>

          <div class="set-categories" v-if="getSetStats(set.id)?.categories.length > 1">
            <span class="categories-label">Categories:</span>
            <div class="categories-list">
              <span 
                v-for="category in getSetStats(set.id)?.categories" 
                :key="category"
                class="category-tag"
              >
                {{ category }}
              </span>
            </div>
          </div>
        </div>

        <div class="set-actions">
          <button @click.stop="deleteSet(set.id)" class="delete-btn" title="Delete Set">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="quick-stats">
        <div class="stat-item">
          <span class="stat-number">{{ recordingSets.length }}</span>
          <span class="stat-label">Sets</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ totalRecordings }}</span>
          <span class="stat-label">Recordings</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ totalCompleted }}</span>
          <span class="stat-label">Completed</span>
        </div>
      </div>
    </div>

    <!-- Modals -->
    
    <div v-if="showOnlineImport" class="modal-placeholder">
      <div class="modal-content">
        <h3>🌐 Online Sources</h3>
        <p>Coming soon! Integration with Tatoeba, Forvo, and other sources.</p>
        <button @click="showOnlineImport = false">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRecordingSets } from '../composables/useRecordingSets';

const {
  recordingSets,
  activeSetId,
  currentRecording,
  setActiveSet,
  deleteRecordingSet,
  getSetStatistics
} = useRecordingSets();

// Component state
const searchQuery = ref('');
const languageFilter = ref('');
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

const totalRecordings = computed(() => {
  return recordingSets.value.reduce((sum, set) => sum + set.recordings.length, 0);
});

const totalCompleted = computed(() => {
  return recordingSets.value.reduce((sum, set) => sum + set.progress.completed, 0);
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

const getSetStats = (setId) => {
  return getSetStatistics(setId);
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
    'tatoeba': '📝',
    'forvo': '🔊',
    'rhinospike': '🦏'
  };
  return icons[source] || '📄';
};

</script>

<style scoped>
.recording-sets-sidebar {
  width: 280px;
  max-height: 80vh;
  background-color: #f8fafc;
  border-right: 2px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  border-radius: 0 8px 8px 0;
}

.sidebar-header {
  padding: 16px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 18px;
  color: #1f2937;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.add-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background-color: #3b82f6;
  color: white;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.add-btn:hover {
  background-color: #2563eb;
}

.search-filter {
  padding: 12px 16px;
  background-color: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 12px;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.language-filter {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 12px;
  background-color: white;
}

.sets-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  min-height: 120px;
  max-height: 50vh;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-hint {
  margin-top: 16px;
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
  text-align: center;
}

.set-item {
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.set-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.set-item.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.set-main {
  padding: 16px;
}

.set-info {
  margin-bottom: 12px;
}

.set-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
  margin-bottom: 4px;
}

.set-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #6b7280;
  flex-wrap: wrap;
}

.language-badge,
.source-badge {
  background-color: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

.language-badge {
  color: #3b82f6;
  background-color: #eff6ff;
}

.count {
  font-weight: 500;
}

.set-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
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
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
}

.set-details {
  padding: 0 16px 16px;
  border-top: 1px solid #f3f4f6;
  background-color: #f8fafc;
}

.current-recording {
  padding: 8px 0;
  font-size: 12px;
}

.current-label {
  color: #6b7280;
  font-weight: 500;
}

.current-name {
  color: #1f2937;
  font-weight: 600;
  margin-left: 4px;
}

.set-stats {
  display: flex;
  gap: 16px;
  margin: 8px 0;
}

.stat {
  font-size: 11px;
}

.stat-label {
  color: #6b7280;
}

.stat-value {
  color: #1f2937;
  font-weight: 600;
  margin-left: 4px;
}

.set-categories {
  margin-top: 8px;
}

.categories-label {
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}

.categories-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

.category-tag {
  background-color: #e0e7ff;
  color: #3730a3;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

.set-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.set-item:hover .set-actions {
  opacity: 1;
}

.delete-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background-color: #fee2e2;
  color: #dc2626;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  background-color: #fecaca;
}

.sidebar-footer {
  padding: 12px 16px;
  background-color: white;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.quick-stats {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modal-placeholder {
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
  border-radius: 8px;
  text-align: center;
  max-width: 400px;
}

.modal-content h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
}

.modal-content button {
  margin-top: 16px;
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .recording-sets-sidebar {
    width: 100%;
    height: auto;
    max-height: 50vh;
  }
  
  .set-meta {
    flex-wrap: wrap;
  }
}
</style>