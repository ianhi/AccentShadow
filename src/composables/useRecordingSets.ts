import { ref, computed } from 'vue';

interface RecordingMetadata {
  speaker?: string;
  difficulty?: string;
  category?: string;
  duration?: number;
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  [key: string]: any;
}

interface UserRecording {
  audioUrl: string | null;
  audioBlob: Blob | null;
  attempts: number;
  lastPracticed: string | null;
  isCompleted: boolean;
}

interface Recording {
  id: string;
  name: string;
  translation: string;
  audioUrl: string;
  audioBlob: Blob;
  metadata: RecordingMetadata;
  userRecording: UserRecording;
}

interface Progress {
  completed: number;
  total: number;
  percentage: number;
}

interface RecordingSet {
  id: string;
  name: string;
  source: string;
  language: string;
  createdAt: string;
  recordings: Recording[];
  currentIndex: number;
  progress: Progress;
}

interface InputRecording {
  name?: string;
  translation?: string;
  audioUrl: string;
  audioBlob: Blob;
  metadata?: Partial<RecordingMetadata>;
}

interface SessionState {
  startTime: number | null;
  totalTime: number;
  recordingsCompleted: number;
  totalAttempts: number;
  averageAttempts: number;
  isActive: boolean;
}

// Global state for recording sets
const recordingSets = ref<RecordingSet[]>([]);
const activeSetId = ref<string | null>(null);
const currentRecordingIndex = ref(0);

// Generate unique IDs
const generateId = (): string => crypto.randomUUID();

// Create a new recording set
const createRecordingSet = (name: string, source: string = 'manual', language: string = 'en', recordings: InputRecording[] = []): RecordingSet => {
  const newSet = {
    id: generateId(),
    name,
    source, // 'manual', 'upload', 'tatoeba', 'forvo'
    language,
    createdAt: new Date().toISOString(),
    recordings: recordings.map(recording => ({
      id: generateId(),
      name: recording.name || 'Untitled',
      translation: recording.translation || '',
      audioUrl: recording.audioUrl,
      audioBlob: recording.audioBlob,
      metadata: {
        speaker: recording.metadata?.speaker || '',
        difficulty: recording.metadata?.difficulty || 'beginner',
        category: recording.metadata?.category || 'general',
        duration: recording.metadata?.duration || 0,
        ...recording.metadata
      },
      userRecording: {
        audioUrl: null,
        audioBlob: null,
        attempts: 0,
        lastPracticed: null,
        isCompleted: false
      }
    })),
    currentIndex: 0,
    progress: {
      completed: 0,
      total: recordings.length,
      percentage: 0
    }
};

  recordingSets.value.push(newSet);
  return newSet;
};

// Get active recording set
const activeSet = computed(() => {
  return recordingSets.value.find(set => set.id === activeSetId.value) || null;
});

// Get current recording from active set
const currentRecording = computed(() => {
  if (!activeSet.value || !activeSet.value.recordings.length) return null;
  const index = Math.min(currentRecordingIndex.value, activeSet.value.recordings.length - 1);
  return activeSet.value.recordings[index] || null;
});

// Navigation functions
const setActiveSet = (setId: string | null): void => {
  // End current session if switching sets
  if (activeSetId.value !== setId && sessionState.value.isActive) {
    endSession();
  }
  
  activeSetId.value = setId;
  currentRecordingIndex.value = 0;
  
  const set = activeSet.value;
  if (set) {
    set.currentIndex = 0;
    startSession(); // Start new session when activating a set
    console.log('📁 Activated recording set:', set.name, `(${set.recordings.length} recordings)`);
  }
};

const goToRecording = (index: number): void => {
  if (!activeSet.value) return;
  
  const maxIndex = activeSet.value.recordings.length - 1;
  const newIndex = Math.max(0, Math.min(index, maxIndex));
  
  currentRecordingIndex.value = newIndex;
  activeSet.value.currentIndex = newIndex;
  
  console.log('📍 Navigated to recording:', newIndex + 1, 'of', activeSet.value.recordings.length);
};

const nextRecording = (): boolean => {
  if (!activeSet.value) return false;
  
  const nextIndex = currentRecordingIndex.value + 1;
  if (nextIndex < activeSet.value.recordings.length) {
    goToRecording(nextIndex);
    return true;
  }
  return false; // No more recordings
};

const previousRecording = (): boolean => {
  if (!activeSet.value) return false;
  
  const prevIndex = currentRecordingIndex.value - 1;
  if (prevIndex >= 0) {
    goToRecording(prevIndex);
    return true;
  }
  return false; // At first recording
};


// Progress tracking
const updateProgress = (): void => {
  if (!activeSet.value) return;
  
  const completed = activeSet.value.recordings.filter(r => r.userRecording.isCompleted).length;
  const total = activeSet.value.recordings.length;
  
  activeSet.value.progress = {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
};
};

const markRecordingCompleted = (recordingId: string | null = null): void => {
  const recording = recordingId 
    ? activeSet.value?.recordings.find(r => r.id === recordingId)
    : currentRecording.value;
    
  if (recording && !recording.userRecording.isCompleted) {
    recording.userRecording.isCompleted = true;
    recording.userRecording.lastPracticed = new Date().toISOString();
    updateProgress();
    updateSessionStats();
    console.log('✅ Marked recording as completed:', recording.name);
  }
};

const updateUserRecording = (audioBlob: Blob, audioUrl: string): void => {
  if (!currentRecording.value) return;
  
  const userRec = currentRecording.value.userRecording;
  userRec.audioBlob = audioBlob;
  userRec.audioUrl = audioUrl;
  userRec.attempts += 1;
  userRec.lastPracticed = new Date().toISOString();
  
  updateSessionStats();
  console.log('🎤 Updated user recording, attempts:', userRec.attempts);
};

// Delete recording set
const deleteRecordingSet = (setId: string): boolean => {
  const index = recordingSets.value.findIndex(set => set.id === setId);
  if (index !== -1) {
    const deletedSet = recordingSets.value.splice(index, 1)[0];
    
    // Clean up blob URLs
    deletedSet.recordings.forEach(recording => {
      if (recording.audioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(recording.audioUrl);
      }
      if (recording.userRecording.audioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(recording.userRecording.audioUrl);
      }
    });
    
    // If this was the active set, clear it
    if (activeSetId.value === setId) {
      activeSetId.value = null;
      currentRecordingIndex.value = 0;
    }
    
    console.log('🗑️ Deleted recording set:', deletedSet.name);
    return true;
  }
  return false;
};

// Folder processing utilities
const categorizeFromPath = (filePath: string): string => {
  const pathParts = filePath.split('/');
  if (pathParts.length > 1) {
    // Use the parent directory as category
    return pathParts[pathParts.length - 2];
  }
  return 'general';
};

const extractNameFromFile = (fileName: string): string => {
  // Remove file extension and clean up the name
  return fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
};

const processUploadedFiles = (files: File[], options: any = {}): InputRecording[] => {
  console.log('📁 Processing uploaded files:', files.length);
  
  // Extract options with defaults
  const {
    trimSilence = false,
    // Other trimming options can be passed through but won't be used in this function
    // This maintains separation of concerns - we just store the intent here
    ...otherOptions
  } = options;
  
  // Filter audio files
  const audioFiles = files.filter(file => {
    const isAudio = file.type.startsWith('audio/') || 
                   /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i.test(file.name);
    if (!isAudio) {
      console.log('⚠️ Skipping non-audio file:', file.name);
    }
    return isAudio;
  });
  
  if (audioFiles.length === 0) {
    throw new Error('No audio files found in the uploaded folder');
  }
  
  // Process files into recordings
  const recordings = audioFiles.map(file => {
    const category = file.webkitRelativePath ? categorizeFromPath(file.webkitRelativePath) : 'general';
    const name = extractNameFromFile(file.name);
    const audioUrl = URL.createObjectURL(file);
    
    const recording: InputRecording = {
      name,
      audioUrl,
      audioBlob: file,
      metadata: {
        category,
        fileName: file.name,
        fileSize: file.size,
        filePath: file.webkitRelativePath || file.name,
        // Store trimming options for later processing
        ...(trimSilence && { trimmingOptions: { trimSilence, ...otherOptions } })
      }
  };
    
    return recording;
  });
  
  console.log('✅ Processed audio files:', recordings.length);
  console.log(trimSilence ? '🔧 Trimming will be applied during audio processing' : '📋 No trimming requested');
  return recordings;
};

// Session management
const sessionState = ref<SessionState>({
  startTime: null,
  totalTime: 0,
  recordingsCompleted: 0,
  totalAttempts: 0,
  averageAttempts: 0,
  isActive: false
});

const startSession = (): void => {
  sessionState.value = {
    startTime: Date.now(),
    totalTime: 0,
    recordingsCompleted: 0,
    totalAttempts: 0,
    averageAttempts: 0,
    isActive: true
};
  console.log('📊 Practice session started');
};

const endSession = (): void => {
  if (sessionState.value.isActive && sessionState.value.startTime) {
    sessionState.value.totalTime = Date.now() - sessionState.value.startTime;
    sessionState.value.isActive = false;
    
    if (sessionState.value.recordingsCompleted > 0) {
      sessionState.value.averageAttempts = Math.round(
        (sessionState.value.totalAttempts / sessionState.value.recordingsCompleted) * 10
      ) / 10;
    }
    
    console.log('📊 Practice session ended:', {
      duration: Math.round(sessionState.value.totalTime / 1000) + 's',
      completed: sessionState.value.recordingsCompleted,
      attempts: sessionState.value.totalAttempts,
      avgAttempts: sessionState.value.averageAttempts
    });
  }
};

const updateSessionStats = (): void => {
  if (!sessionState.value.isActive || !activeSet.value) return;
  
  // Count completed recordings in current session
  const completedCount = activeSet.value.recordings.filter(r => 
    r.userRecording.isCompleted && 
    r.userRecording.lastPracticed && 
    sessionState.value.startTime &&
    new Date(r.userRecording.lastPracticed).getTime() > sessionState.value.startTime
  ).length;
  
  // Count total attempts in current session
  const totalAttempts = activeSet.value.recordings.reduce((sum, r) => {
    if (r.userRecording.lastPracticed && 
        sessionState.value.startTime &&
        new Date(r.userRecording.lastPracticed).getTime() > sessionState.value.startTime) {
      return sum + r.userRecording.attempts;
    }
    return sum;
  }, 0);
  
  sessionState.value.recordingsCompleted = completedCount;
  sessionState.value.totalAttempts = totalAttempts;
  
  if (completedCount > 0) {
    sessionState.value.averageAttempts = Math.round((totalAttempts / completedCount) * 10) / 10;
  }
};

// Statistics
const getSetStatistics = (setId: string): { totalRecordings: number; completed: number; attempted: number; totalAttempts: number; categories: string[]; averageAttempts: number } | null => {
  const set = recordingSets.value.find(s => s.id === setId);
  if (!set) return null;
  
  const stats = {
    totalRecordings: set.recordings.length,
    completed: set.recordings.filter(r => r.userRecording.isCompleted).length,
    attempted: set.recordings.filter(r => r.userRecording.attempts > 0).length,
    totalAttempts: set.recordings.reduce((sum, r) => sum + r.userRecording.attempts, 0),
    categories: [...new Set(set.recordings.map(r => r.metadata.category).filter((cat): cat is string => typeof cat === 'string'))],
    averageAttempts: 0
};
  
  if (stats.attempted > 0) {
    stats.averageAttempts = Math.round((stats.totalAttempts / stats.attempted) * 10) / 10;
  }
  
  return stats;
};

// Auto-suggestions for review
const getReviewSuggestions = (): Recording[] => {
  if (!activeSet.value) return [];
  
  // Find recordings that need more practice
  return activeSet.value.recordings.filter(recording => {
    const userRec = recording.userRecording;
    
    // Suggest review if:
    // 1. High number of attempts but not completed
    // 2. Completed but with many attempts (> 3)
    // 3. Not practiced recently (> 24 hours ago)
    
    if (!userRec.isCompleted && userRec.attempts >= 3) {
      return true;
    }
    
    if (userRec.isCompleted && userRec.attempts > 3) {
      return true;
    }
    
    if (userRec.lastPracticed) {
      const daysSinceLastPractice = (Date.now() - new Date(userRec.lastPracticed).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastPractice > 1) {
        return true;
      }
    }
    
    return false;
  }).sort((a, b) => {
    // Sort by attempts descending (most difficult first)
    return b.userRecording.attempts - a.userRecording.attempts;
  });
};

// Auto-navigation features
const goToNextIncomplete = (): boolean => {
  if (!activeSet.value) return false;
  
  // Find next incomplete recording starting from current position
  const recordings = activeSet.value.recordings;
  const startIndex = currentRecordingIndex.value + 1;
  
  for (let i = 0; i < recordings.length; i++) {
    const index = (startIndex + i) % recordings.length;
    if (!recordings[index].userRecording.isCompleted) {
      goToRecording(index);
      return true;
    }
  }
  
  return false; // All recordings completed
};

const goToReviewRecording = (): boolean => {
  const suggestions = getReviewSuggestions();
  if (suggestions.length > 0 && activeSet.value) {
    const recording = suggestions[0];
    const index = activeSet.value.recordings.findIndex(r => r.id === recording.id);
    if (index !== -1) {
      goToRecording(index);
      return true;
    }
  }
  return false;
};

export function useRecordingSets() {
  return {
    recordingSets,
    activeSet,
    currentRecording,
    activeSetId,
    currentRecordingIndex,
    createRecordingSet,
    setActiveSet,
    deleteRecordingSet,
    goToRecording,
    nextRecording,
    previousRecording,
    updateProgress,
    markRecordingCompleted,
    updateUserRecording,
    getSetStatistics,
    generateId,
    sessionState,
    startSession,
    endSession,
    updateSessionStats,
    getReviewSuggestions,
    goToNextIncomplete,
    goToReviewRecording,
    processUploadedFiles
  };
}