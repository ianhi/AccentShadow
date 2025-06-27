<script setup lang="ts">
import { ref } from 'vue'
import PracticeView from './views/PracticeView.vue'
import TestAudioVisualization from './views/TestAudioVisualization.vue'
import TestVADTrimming from './views/TestVADTrimming.vue'

const currentView = ref('main')
</script>

<template>
  <div>
    <div class="view-switcher">
      <button @click="currentView = 'main'" :class="{ active: currentView === 'main' }">
        Main App
      </button>
      <button @click="currentView = 'debug'" :class="{ active: currentView === 'debug' }">
        Audio Debug
      </button>
      <button @click="currentView = 'vad'" :class="{ active: currentView === 'vad' }">
        VAD Debug
      </button>
    </div>
    
    <PracticeView v-if="currentView === 'main'" />
    <TestAudioVisualization v-else-if="currentView === 'debug'" />
    <TestVADTrimming v-else-if="currentView === 'vad'" />
  </div>
</template>

<style scoped>
.view-switcher {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.view-switcher button {
  padding: 8px 16px;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  background-color: white;
  color: #3b82f6;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.view-switcher button:hover {
  background-color: #3b82f6;
  color: white;
}

.view-switcher button.active {
  background-color: #3b82f6;
  color: white;
}
</style>