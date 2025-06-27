
<template>
  <div class="recording-list">
    <p v-if="recordings.length === 0">No recordings saved yet.</p>
    <ul v-else>
      <RecordingListItem
        v-for="recording in recordings"
        :key="recording.id"
        :recording="recording"
        @load="$emit('load-recording', recording)"
        @delete="handleDelete(recording.id)"
      />
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import RecordingListItem from './RecordingListItem.vue';
import { useIndexedDB } from '../composables/useIndexedDB';

const emit = defineEmits(['load-recording', 'delete-recording']);

const recordings = ref([]);
const { getRecordings, deleteRecording } = useIndexedDB();

const fetchRecordings = async () => {
  recordings.value = await getRecordings();
};

onMounted(() => {
  fetchRecordings();
});

const handleDelete = async (id) => {
  await deleteRecording(id);
  await fetchRecordings(); // Refresh list after deletion
  emit('delete-recording', id);
};

// Expose fetchRecordings to parent for manual refresh if needed
defineExpose({
  fetchRecordings,
});
</script>

<style scoped>
.recording-list ul {
  list-style: none;
  padding: 0;
}
</style>
