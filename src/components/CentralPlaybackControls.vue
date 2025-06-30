<template>
  <div class="central-playback-controls" :class="{ 'mobile-compact': shouldUseMobileLayout }">
    <h3 v-if="!shouldUseMobileLayout">Recording & Playback Controls</h3>
    
    <!-- Mobile Compact Layout -->
    <div v-if="shouldUseMobileLayout" class="mobile-controls-grid">
      <!-- Combined Control Row: Recording + Playback -->
      <div class="mobile-combined-controls">
        <div class="mobile-recording">
          <AudioRecorder 
            @recorded="$emit('recorded', $event)" 
            @recording-started="$emit('recording-started')"
            @recording-stopped="$emit('recording-stopped')"
          />
        </div>
        
        <div class="mobile-playback-row">
          <PlaybackControls 
            :hasTargetAudio="hasTargetAudio"
            :hasUserAudio="hasUserAudio"
            @play-target="$emit('play-target')"
            @play-user="$emit('play-user')"
            @play-overlapping="$emit('play-overlapping')"
            @play-sequential="$emit('play-sequential')"
            @stop-all="$emit('stop-all')"
            :compact="true"
          />
        </div>
      </div>
      
      <!-- Speed Control Compact -->
      <div class="mobile-speed-control">
        <SpeedControl 
          :speed="globalPlaybackSpeed"
          :enabled="hasTargetAudio || hasUserAudio"
          @speed-change="$emit('speed-change', $event)"
          :compact="true"
        />
      </div>
    </div>
    
    <!-- Desktop Layout -->
    <template v-else>
      <!-- Main Controls Row: Recording + Playback -->
      <div class="main-controls-row">
        <!-- Recording Controls -->
        <div class="recording-controls">
          <AudioRecorder 
            @recorded="$emit('recorded', $event)" 
            @recording-started="$emit('recording-started')"
            @recording-stopped="$emit('recording-stopped')"
          />
        </div>
        
        <!-- Playback Controls -->
        <PlaybackControls 
          :hasTargetAudio="hasTargetAudio"
          :hasUserAudio="hasUserAudio"
          @play-target="$emit('play-target')"
          @play-user="$emit('play-user')"
          @play-overlapping="$emit('play-overlapping')"
          @play-sequential="$emit('play-sequential')"
          @stop-all="$emit('stop-all')"
        />
      </div>
      
      <!-- Speed Control Section -->
      <SpeedControl 
        :speed="globalPlaybackSpeed"
        :enabled="hasTargetAudio || hasUserAudio"
        @speed-change="$emit('speed-change', $event)"
      />
    </template>
  </div>
</template>

<script setup>
import AudioRecorder from './AudioRecorder.vue'
import PlaybackControls from './PlaybackControls.vue'
import SpeedControl from './SpeedControl.vue'
import { useAppStateInject } from '../composables/useAppState'
import { useViewport } from '../composables/useViewport'

// Use app state directly instead of props for shared state
const { hasTargetAudio, hasUserAudio, globalPlaybackSpeed } = useAppStateInject()
const { shouldUseMobileLayout } = useViewport()

// Only emit events that still need to go to parent
defineEmits([
  'recorded',
  'recording-started',
  'recording-stopped',
  'play-target',
  'play-user',
  'play-overlapping',
  'play-sequential',
  'stop-all',
  'speed-change'
])
</script>

<style scoped>
.central-playback-controls {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: 20px 0;
}

.central-playback-controls h3 {
  margin: 0 0 16px 0;
  color: white;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.main-controls-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.recording-controls {
  flex: 1;
  min-width: 200px;
}

/* Mobile compact layout */
.mobile-compact {
  padding: 12px;
  margin: 8px 0;
}

.mobile-controls-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.mobile-combined-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  position: relative;
}

.mobile-combined-controls .mobile-recording {
  position: relative;
}

.mobile-recording {
  display: flex;
  justify-content: center;
}

.mobile-playback-row {
  display: flex;
  justify-content: center;
}

.mobile-speed-control {
  display: flex;
  justify-content: center;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .central-playback-controls {
    padding: 16px;
  }
  
  .main-controls-row {
    flex-direction: column;
    gap: 16px;
  }
}
</style>