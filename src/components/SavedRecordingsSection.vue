<template>
  <div class="saved-recordings-section">
    <h2>Saved Recordings</h2>
    <RecordingList 
      @load-recording="$emit('load-recording', $event)" 
      @delete-recording="$emit('delete-recording', $event)" 
    />
  </div>
</template>

<script setup>
import RecordingList from './RecordingList.vue'

defineEmits(['load-recording', 'delete-recording'])
</script>

<style scoped>
.saved-recordings-section {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: 20px 0;
}

.saved-recordings-section h2 {
  margin: 0 0 16px 0;
  color: white;
  font-size: 20px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* Mobile responsive */
@media (max-width: 768px) {
  .saved-recordings-section {
    padding: 16px;
    margin: 16px 0;
  }
  
  .saved-recordings-section h2 {
    font-size: 18px;
  }
}
</style>