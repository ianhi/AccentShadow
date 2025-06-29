<template>
  <div class="modal-manager">
    <!-- URL Input Modal -->
    <UrlInputModal
      :isOpen="urlModalState.isOpen"
      :url="urlModalState.tempUrl"
      @close="closeUrlModal"
      @load-url="handleUrlLoad"
    />
    
    <!-- VAD Settings Modal -->
    <VADSettingsModal 
      :isOpen="vadModalState.isOpen"
      :settings="vadModalState.settings" 
      @close="closeVadModal"
      @save="handleVadSettingsSave"
    />
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import UrlInputModal from './UrlInputModal.vue'
import VADSettingsModal from './VADSettingsModal.vue'

const props = defineProps({
  vadSettings: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'url-load-requested',
  'vad-settings-saved'
])

// Modal state management
const urlModalState = reactive({
  isOpen: false,
  tempUrl: ''
})

const vadModalState = reactive({
  isOpen: false,
  settings: props.vadSettings
})

// URL Modal functions
const showUrlModal = () => {
  urlModalState.isOpen = true
  urlModalState.tempUrl = ''
}

const closeUrlModal = () => {
  urlModalState.isOpen = false
  urlModalState.tempUrl = ''
}

const handleUrlLoad = (url) => {
  urlModalState.tempUrl = url
  emit('url-load-requested', url)
  closeUrlModal()
}

// VAD Modal functions
const showVadModal = () => {
  vadModalState.isOpen = true
  vadModalState.settings = { ...props.vadSettings }
}

const closeVadModal = () => {
  vadModalState.isOpen = false
}

const handleVadSettingsSave = (newSettings) => {
  emit('vad-settings-saved', newSettings)
  closeVadModal()
}

// Expose modal control functions
defineExpose({
  showUrlModal,
  closeUrlModal,
  showVadModal,
  closeVadModal
})
</script>

<style scoped>
.modal-manager {
  /* This component manages modals but has no visible container */
}
</style>