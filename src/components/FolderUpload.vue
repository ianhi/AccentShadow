<template>
  <div class="folder-upload">
    <div class="upload-header">
      <h3>📁 Upload Audio Folder</h3>
      <button @click="closeModal" class="close-btn">✕</button>
    </div>

    <div v-if="!uploadedFiles.length" class="upload-area">
      <!-- Folder Upload -->
      <div 
        class="drop-zone"
        :class="{ 'drag-over': isDragOver }"
        @drop="handleDrop"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @click="triggerFileInput"
      >
        <div class="drop-content">
          <div class="drop-icon">📁</div>
          <div class="drop-text">
            <p><strong>Drop a folder here</strong> or click to browse</p>
            <p class="drop-subtext">All audio files (MP3, WAV, OGG, M4A) will be imported</p>
            <p class="drop-subtext">Include a CSV file for transcriptions and metadata</p>
          </div>
        </div>
      </div>
      
      <div class="upload-divider">
        <span>OR</span>
      </div>
      
      <!-- URL Import -->
      <div class="url-import">
        <h4>🌐 Import from URL</h4>
        <div class="url-input-group">
          <input 
            type="url" 
            v-model="importUrl" 
            placeholder="Enter Google Drive, Dropbox, or direct folder URL"
            class="url-input"
          />
          <button @click="importFromUrl" :disabled="!importUrl.trim() || isLoadingUrl" class="url-import-btn">
            {{ isLoadingUrl ? '⏳' : '📥' }} Import
          </button>
        </div>
        <p class="url-help">Supports: Public Google Drive folders, Dropbox shared folders, direct file URLs</p>
      </div>
      
      <input 
        ref="fileInput" 
        type="file" 
        webkitdirectory 
        multiple 
        @change="handleFileInput"
        style="display: none"
      />
    </div>

    <div v-else class="upload-preview">
      <div class="preview-header">
        <h4>📂 {{ folderName }} ({{ audioFiles.length }} audio files found)</h4>
        <button @click="resetUpload" class="reset-btn">🔄 Choose Different Folder</button>
      </div>

      <div class="preview-options">
        <label class="option-checkbox">
          <input type="checkbox" v-model="autoDetectCategories" />
          Auto-detect categories from folder structure
        </label>
        <label class="option-checkbox">
          <input type="checkbox" v-model="includeSubfolders" />
          Include files from subfolders
        </label>
        <div v-if="hasCSVFile" class="csv-info">
          📄 CSV file detected: {{ csvFiles[0]?.name }}
          <span v-if="csvData">({{ csvData.rows.length }} entries)</span>
        </div>
      </div>

      <div class="file-preview">
        <h5>Categories Preview:</h5>
        <div class="categories">
          <div v-for="(files, category) in categorizedFiles" :key="category" class="category">
            <div class="category-header">
              <span class="category-name">📂 {{ category }}</span>
              <span class="category-count">({{ files.length }} files)</span>
            </div>
            <div class="category-files">
              <div v-for="file in files.slice(0, 3)" :key="file.name" class="file-item">
                🎵 {{ file.displayName }}
              </div>
              <div v-if="files.length > 3" class="more-files">
                ... and {{ files.length - 3 }} more
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="import-options">
        <div class="set-name">
          <label>Recording Set Name:</label>
          <input 
            type="text" 
            v-model="setName" 
            placeholder="Enter a name for this recording set"
            class="name-input"
          />
        </div>
        
        <div class="language-select">
          <label>Language:</label>
          <select v-model="selectedLanguage" class="language-dropdown">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
            <option value="ar">Arabic</option>
            <option value="hi">Hindi</option>
            <option value="ru">Russian</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div class="import-actions">
        <button @click="importRecordings" :disabled="!setName.trim()" class="import-btn">
          ✅ Import {{ audioFiles.length }} Recording{{ audioFiles.length === 1 ? '' : 's' }}
        </button>
        <button @click="closeModal" class="cancel-btn">❌ Cancel</button>
      </div>
    </div>

    <div v-if="isImporting" class="importing-overlay">
      <div class="importing-content">
        <div class="spinner"></div>
        <p>Importing recordings...</p>
        <p class="progress">{{ importProgress.current }} / {{ importProgress.total }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRecordingSets } from '../composables/useRecordingSets';

const emit = defineEmits(['close', 'imported']);

const { createRecordingSet, processUploadedFiles } = useRecordingSets();

// Upload state
const uploadedFiles = ref([]);
const folderName = ref('');
const isDragOver = ref(false);
const fileInput = ref(null);

// Options
const autoDetectCategories = ref(true);
const includeSubfolders = ref(true);
const setName = ref('');
const selectedLanguage = ref('en');

// Import state
const isImporting = ref(false);
const importProgress = ref({ current: 0, total: 0 });

// Additional state for CSV support
const csvData = ref(null);
const hasCSVFile = ref(false);

// URL import state
const importUrl = ref('');
const isLoadingUrl = ref(false);

// Computed properties
const audioFiles = computed(() => {
  return uploadedFiles.value.filter(file => {
    const isAudio = file.type.startsWith('audio/') || 
                   /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i.test(file.name);
    
    // Filter by subfolder preference
    if (!includeSubfolders.value && file.webkitRelativePath) {
      const pathParts = file.webkitRelativePath.split('/');
      return pathParts.length <= 2; // Only root level files
    }
    
    return isAudio;
  });
});

const csvFiles = computed(() => {
  return uploadedFiles.value.filter(file => 
    file.type === 'text/csv' || /\.csv$/i.test(file.name)
  );
});

const categorizedFiles = computed(() => {
  const categories = {};
  
  audioFiles.value.forEach(file => {
    let category = 'Uncategorized';
    
    if (autoDetectCategories.value && file.webkitRelativePath) {
      const pathParts = file.webkitRelativePath.split('/');
      if (pathParts.length > 1) {
        category = pathParts[pathParts.length - 2]; // Parent directory
      }
    }
    
    if (!categories[category]) {
      categories[category] = [];
    }
    
    categories[category].push({
      ...file,
      displayName: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    });
  });
  
  return categories;
});

// CSV parsing function
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return null;
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/["/]/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/["/]/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  
  return { headers, rows };
};

// Watch for folder name changes and process CSV files
watch(uploadedFiles, async (files) => {
  if (files.length > 0 && files[0].webkitRelativePath) {
    const pathParts = files[0].webkitRelativePath.split('/');
    folderName.value = pathParts[0];
    
    // Auto-generate set name from folder name
    if (!setName.value) {
      setName.value = folderName.value.replace(/[-_]/g, ' ');
    }
  }
  
  // Process CSV files if found
  const csvFile = csvFiles.value[0];
  if (csvFile) {
    hasCSVFile.value = true;
    try {
      const text = await csvFile.text();
      csvData.value = parseCSV(text);
      console.log('📄 CSV data loaded:', csvData.value);
    } catch (error) {
      console.error('❌ Error parsing CSV:', error);
      csvData.value = null;
    }
  } else {
    hasCSVFile.value = false;
    csvData.value = null;
  }
});

// Event handlers
const handleDrop = (event) => {
  event.preventDefault();
  isDragOver.value = false;
  
  const items = Array.from(event.dataTransfer.items);
  const files = [];
  
  items.forEach(item => {
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        processEntry(entry, files);
      }
    }
  });
  
  // Fallback to regular files if directory access isn't available
  if (files.length === 0) {
    uploadedFiles.value = Array.from(event.dataTransfer.files);
  }
};

const processEntry = (entry, files) => {
  if (entry.isFile) {
    entry.file(file => {
      if (file.webkitRelativePath || file.name) {
        files.push(file);
        uploadedFiles.value = [...files];
      }
    });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    reader.readEntries(entries => {
      entries.forEach(childEntry => processEntry(childEntry, files));
    });
  }
};

const handleFileInput = (event) => {
  uploadedFiles.value = Array.from(event.target.files);
};

const triggerFileInput = () => {
  fileInput.value.click();
};

const resetUpload = () => {
  uploadedFiles.value = [];
  folderName.value = '';
  setName.value = '';
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const closeModal = () => {
  emit('close');
};

// URL import functionality
const importFromUrl = async () => {
  if (!importUrl.value.trim()) return;
  
  isLoadingUrl.value = true;
  try {
    // Convert Google Drive share URLs to direct access format
    let processedUrl = importUrl.value;
    
    // Handle Google Drive folder URLs
    const driveMatch = processedUrl.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9-_]+)/);
    if (driveMatch) {
      // Note: This would require API integration for full functionality
      // For now, show a helpful message
      alert('🚧 Google Drive integration requires additional setup. Please download the folder and upload manually for now.');
      isLoadingUrl.value = false;
      return;
    }
    
    // For direct URLs, try to fetch the content
    // This is a basic implementation - real implementation would need CORS proxy
    console.log('🌐 Attempting to import from URL:', processedUrl);
    alert('🚧 URL import is not yet implemented. Please download files manually and upload.');
    
  } catch (error) {
    console.error('❌ URL import failed:', error);
    alert('❌ Failed to import from URL. Please check the URL and try again.');
  } finally {
    isLoadingUrl.value = false;
  }
};

const importRecordings = async () => {
  if (!setName.value.trim() || !audioFiles.value.length) return;
  
  try {
    isImporting.value = true;
    importProgress.value = { current: 0, total: audioFiles.value.length };
    
    console.log('📁 Starting import of', audioFiles.value.length, 'files');
    
    // Process files with progress tracking
    const recordings = [];
    for (let i = 0; i < audioFiles.value.length; i++) {
      const file = audioFiles.value[i];
      importProgress.value.current = i + 1;
      
      // Determine category
      let category = 'general';
      if (autoDetectCategories.value && file.webkitRelativePath) {
        const pathParts = file.webkitRelativePath.split('/');
        if (pathParts.length > 1) {
          category = pathParts[pathParts.length - 2];
        }
      }
      
      // Extract name
      const name = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      
      // Check for CSV data match
      let csvMatch = null;
      if (csvData.value) {
        // Try to match by filename, name, or path
        csvMatch = csvData.value.rows.find(row => {
          const rowFilename = row.filename || row.file || row.name || '';
          return rowFilename.toLowerCase().includes(file.name.toLowerCase().replace(/\.[^/.]+$/, '')) ||
                 file.name.toLowerCase().includes(rowFilename.toLowerCase());
        });
      }
      
      recordings.push({
        name: csvMatch?.transcription || csvMatch?.text || csvMatch?.sentence || name,
        translation: csvMatch?.translation || csvMatch?.meaning || '',
        audioUrl: URL.createObjectURL(file),
        audioBlob: file,
        metadata: {
          category: csvMatch?.category || category,
          fileName: file.name,
          fileSize: file.size,
          filePath: file.webkitRelativePath || file.name,
          speaker: csvMatch?.speaker || csvMatch?.voice || '',
          difficulty: csvMatch?.difficulty || csvMatch?.level || '',
          notes: csvMatch?.notes || csvMatch?.comment || '',
          // Include any additional CSV fields
          ...csvMatch
        }
      });
      
      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Create the recording set
    const recordingSet = createRecordingSet(
      setName.value.trim(),
      'upload',
      selectedLanguage.value,
      recordings
    );
    
    console.log('✅ Successfully imported recording set:', recordingSet.name);
    
    // Emit success
    emit('imported', recordingSet);
    
    // Close modal after short delay
    setTimeout(() => {
      closeModal();
    }, 500);
    
  } catch (error) {
    console.error('❌ Error importing recordings:', error);
    alert(`Failed to import recordings: ${error.message}`);
  } finally {
    isImporting.value = false;
  }
};
</script>

<style scoped>
.folder-upload {
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

.folder-upload > div {
  background: white;
  border-radius: 12px;
  padding: 20px;
  max-width: 600px;
  max-height: 70vh;
  overflow-y: auto;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  margin: 10px;
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e5e7eb;
}

.upload-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
}

.close-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.drop-zone {
  border: 3px dashed #d1d5db;
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #f9fafb;
}

.drop-zone:hover,
.drop-zone.drag-over {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.drop-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.drop-text p {
  margin: 8px 0;
  color: #374151;
}

.drop-subtext {
  font-size: 14px;
  color: #6b7280;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.preview-header h4 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
}

.reset-btn {
  padding: 6px 12px;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #374151;
}

.reset-btn:hover {
  background-color: #e5e7eb;
}

.preview-options {
  margin-bottom: 15px;
  padding: 12px;
  background-color: #f8fafc;
  border-radius: 8px;
}

.option-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
}

.option-checkbox:last-child {
  margin-bottom: 0;
}

.file-preview {
  margin-bottom: 15px;
}

.file-preview h5 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-size: 16px;
}

.categories {
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background-color: white;
}

.category {
  border-bottom: 1px solid #f3f4f6;
}

.category:last-child {
  border-bottom: none;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8fafc;
  font-weight: 600;
  color: #374151;
}

.category-count {
  font-size: 12px;
  color: #6b7280;
  font-weight: normal;
}

.category-files {
  padding: 8px 16px;
}

.file-item {
  padding: 4px 0;
  font-size: 14px;
  color: #4b5563;
}

.more-files {
  padding: 4px 0;
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

.import-options {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
  margin-bottom: 18px;
}

.set-name label,
.language-select label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.name-input,
.language-dropdown {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
}

.name-input:focus,
.language-dropdown:focus {
  outline: none;
  border-color: #3b82f6;
}

.import-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.import-btn,
.cancel-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.import-btn {
  background-color: #3b82f6;
  color: white;
}

.import-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.import-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.cancel-btn {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.cancel-btn:hover {
  background-color: #e5e7eb;
}

.importing-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.importing-content {
  text-align: center;
  color: #374151;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.progress {
  font-size: 14px;
  color: #6b7280;
  margin-top: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* URL Import Styles */
.upload-divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
  text-align: center;
}

.upload-divider::before,
.upload-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #d1d5db;
}

.upload-divider span {
  padding: 0 16px;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
}

.url-import {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
}

.url-import h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 16px;
  font-weight: 600;
}

.url-input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.url-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.url-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.url-import-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.url-import-btn:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.url-import-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.url-help {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

/* CSV Info Styles */
.csv-info {
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 12px;
  font-size: 14px;
  color: #0369a1;
}

@media (max-width: 768px) {
  .import-options {
    grid-template-columns: 1fr;
  }
  
  .import-actions {
    flex-direction: column;
  }
  
  .drop-zone {
    padding: 40px 16px;
  }
  
  .drop-icon {
    font-size: 36px;
  }
}
</style>