<template>
  <div class="session-stats" v-if="sessionState.isActive">
    <div class="stats-header">
      <h4>📊 Current Session</h4>
      <div class="session-timer">
        {{ formatTime(elapsedTime) }}
      </div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">{{ sessionState.recordingsCompleted }}</div>
        <div class="stat-label">Completed</div>
      </div>
      
      <div class="stat-item">
        <div class="stat-value">{{ sessionState.totalAttempts }}</div>
        <div class="stat-label">Total Attempts</div>
      </div>
      
      <div class="stat-item">
        <div class="stat-value">{{ sessionState.averageAttempts || 0 }}</div>
        <div class="stat-label">Avg per Recording</div>
      </div>
      
      <div class="stat-item" v-if="activeSet">
        <div class="stat-value">{{ completionRate }}%</div>
        <div class="stat-label">Set Progress</div>
      </div>
    </div>
    
    <div class="session-actions">
      <button @click="endCurrentSession" class="end-session-btn">
        ⏹ End Session
      </button>
    </div>
  </div>
  
  <div class="session-stats inactive" v-else-if="lastSessionStats">
    <div class="stats-header">
      <h4>📋 Last Session Summary</h4>
      <button @click="clearLastSession" class="clear-btn">✕</button>
    </div>
    
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">{{ lastSessionStats.recordingsCompleted }}</div>
        <div class="stat-label">Completed</div>
      </div>
      
      <div class="stat-item">
        <div class="stat-value">{{ formatTime(lastSessionStats.totalTime) }}</div>
        <div class="stat-label">Duration</div>
      </div>
      
      <div class="stat-item">
        <div class="stat-value">{{ lastSessionStats.averageAttempts }}</div>
        <div class="stat-label">Avg Attempts</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRecordingSets } from '../composables/useRecordingSets';

const { 
  sessionState, 
  activeSet, 
  endSession 
} = useRecordingSets();

// Types
interface LastSessionStats {
  recordingsCompleted: number;
  totalTime: number;
  averageAttempts: number;
  endedAt: string;
}

// Component state
const lastSessionStats = ref<LastSessionStats | null>(null);
const currentTime = ref(Date.now());
let timerInterval: number | null = null;

// Reactive elapsed time computation
const elapsedTime = computed(() => {
  if (!sessionState.value.isActive || !sessionState.value.startTime) return 0;
  return currentTime.value - sessionState.value.startTime;
});

// Computed properties
const completionRate = computed(() => {
  if (!activeSet.value || activeSet.value.recordings.length === 0) return 0;
  return Math.round((activeSet.value.progress.completed / activeSet.value.recordings.length) * 100);
});

// Reactive timer management
const startTimer = () => {
  if (timerInterval) return; // Already running
  
  // Update current time every second for reactive elapsed time calculation
  timerInterval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000);
  
  console.log('📊 Session timer started (reactive)');
};

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    console.log('📊 Session timer stopped');
  }
};

// Watch session state reactively instead of manual polling
watch(() => sessionState.value.isActive, (isActive) => {
  if (isActive) {
    startTimer();
  } else {
    stopTimer();
  }
}, { immediate: true });

const formatTime = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

const endCurrentSession = () => {
  // Store the session stats before ending
  if (sessionState.value.startTime) {
    lastSessionStats.value = {
      recordingsCompleted: sessionState.value.recordingsCompleted,
      totalTime: Date.now() - sessionState.value.startTime,
      averageAttempts: sessionState.value.averageAttempts,
      endedAt: new Date().toISOString()
    };
  }
  
  endSession();
  console.log('📊 Session ended manually by user');
};

const clearLastSession = () => {
  lastSessionStats.value = null;
};

// Lifecycle - cleanup timer on unmount
onUnmounted(() => {
  stopTimer();
});
</script>

<style scoped>
.session-stats {
  background-color: white;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.session-stats.inactive {
  border-color: #d1d5db;
  background-color: #f9fafb;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e7eb;
}

.stats-header h4 {
  margin: 0;
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.session-timer {
  background-color: #3b82f6;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  font-family: monospace;
}

.clear-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 14px;
}

.clear-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.inactive .stat-value {
  color: #6b7280;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.session-actions {
  display: flex;
  justify-content: center;
}

.end-session-btn {
  padding: 8px 16px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.end-session-btn:hover {
  background-color: #dc2626;
}

@media (max-width: 768px) {
  .session-stats {
    padding: 10px;
    margin-bottom: 12px;
  }
  
  .stats-header {
    margin-bottom: 8px;
    padding-bottom: 6px;
  }
  
  .stats-grid {
    margin-bottom: 8px;
  }
}

@media (max-width: 480px) {
  .session-stats {
    padding: 8px;
    margin-bottom: 8px;
  }
  
  .stats-header {
    margin-bottom: 6px;
    padding-bottom: 4px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 6px;
  }
  
  .stat-value {
    font-size: 18px;
    margin-bottom: 2px;
  }
  
  .session-timer {
    font-size: 11px;
    padding: 2px 6px;
  }
}
</style>