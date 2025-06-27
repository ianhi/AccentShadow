
<template>
  <li class="recording-list-item">
    <span>Recorded on: {{ new Date(recording.timestamp).toLocaleString() }}</span>
    <div class="actions">
      <button @click="$emit('load', recording)">Load</button>
      <button @click="$emit('delete', recording.id)" class="delete-button">Delete</button>
    </div>
  </li>
</template>

<script setup>
const props = defineProps({
  recording: Object,
});

const emit = defineEmits(['load', 'delete']);
</script>

<style scoped>
.recording-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}

.recording-list-item:last-child {
  border-bottom: none;
}

.actions button {
  margin-left: 10px;
  padding: 8px 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  background-color: #3B82F6;
  color: white;
}

.actions .delete-button {
  background-color: #EF4444;
}
</style>
