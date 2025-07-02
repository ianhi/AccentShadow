<template>
  <div v-if="isVisible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>🎵 Load Demo Audio</h2>
        <button @click="$emit('close')" class="close-btn">✕</button>
      </div>
      
      <div class="modal-body">
        <p class="description">
          Choose a demo audio file to practice with. These samples include both target pronunciation and recording sets.
        </p>
        
        <!-- Language Selection -->
        <div class="language-section">
          <h3>Select Language</h3>
          <div class="language-grid">
            <button 
              v-for="language in availableLanguages" 
              :key="language.code"
              @click="selectedLanguage = language.code"
              :class="['language-btn', { active: selectedLanguage === language.code }]"
            >
              <span class="language-flag">{{ language.flag }}</span>
              <span class="language-name">{{ language.name }}</span>
            </button>
          </div>
        </div>
        
        <!-- Demo Selection -->
        <div v-if="selectedLanguage" class="demo-section">
          <h3>Select Demo Audio</h3>
          <div class="demo-grid">
            <button 
              v-for="demo in filteredDemos" 
              :key="demo.id"
              @click="selectedDemo = demo.id"
              :class="['demo-btn', { active: selectedDemo === demo.id }]"
            >
              <div class="demo-info">
                <span class="demo-title">{{ demo.title }}</span>
                <span class="demo-description">{{ demo.description }}</span>
                <span class="demo-level">{{ demo.level }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="$emit('close')" class="cancel-btn">
          Cancel
        </button>
        <button 
          @click="loadSelectedDemo" 
          :disabled="!selectedDemo"
          class="load-btn"
        >
          Load Demo
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'load-demo'])

// Demo data structure for future multi-language support
const selectedLanguage = ref('en')
const selectedDemo = ref(null)

// Available languages (ready for expansion)
const availableLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  // Future languages can be added here:
  // { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  // { code: 'fr', name: 'French', flag: '🇫🇷' },
  // { code: 'bn', name: 'Bengali', flag: '🇧🇩' },
]

// Demo audio data (currently English only, structured for expansion)
const demoData = [
  {
    id: 'en-basic-1',
    language: 'en',
    title: 'Basic Pronunciation',
    description: 'Simple words and phrases for beginners',
    level: 'Beginner',
    audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
  },
  {
    id: 'en-intermediate-1',
    language: 'en',
    title: 'Conversation Practice',
    description: 'Real conversation snippets for practice',
    level: 'Intermediate',
    audioUrl: 'https://file-examples.com/storage/fe68c16bb66c74aab2e8e43/2017/11/file_example_WAV_1MG.wav'
  },
  // Future demos can be added here for different languages
]

const filteredDemos = computed(() => {
  return demoData.filter(demo => demo.language === selectedLanguage.value)
})

const handleOverlayClick = () => {
  emit('close')
}

const loadSelectedDemo = () => {
  const demo = demoData.find(d => d.id === selectedDemo.value)
  if (demo) {
    emit('load-demo', {
      audioUrl: demo.audioUrl,
      title: demo.title,
      language: selectedLanguage.value,
      demoData: demo
    })
  }
}

// Reset selection when modal opens
const resetSelection = () => {
  selectedDemo.value = null
  selectedLanguage.value = 'en'
}

// Watch for modal visibility to reset
import { watch } from 'vue'
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    resetSelection()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  color: white;
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.description {
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.language-section,
.demo-section {
  margin-bottom: 24px;
}

.language-section h3,
.demo-section h3 {
  color: white;
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.language-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.language-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.language-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.language-btn.active {
  background: rgba(96, 165, 250, 0.3);
  border-color: #60a5fa;
}

.language-flag {
  font-size: 18px;
}

.language-name {
  font-weight: 500;
}

.demo-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-btn {
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.demo-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.demo-btn.active {
  background: rgba(96, 165, 250, 0.3);
  border-color: #60a5fa;
}

.demo-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.demo-title {
  font-weight: 600;
  font-size: 14px;
}

.demo-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.demo-level {
  color: #60a5fa;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.cancel-btn,
.load-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.load-btn {
  background: #60a5fa;
  color: white;
}

.load-btn:hover:not(:disabled) {
  background: #3b82f6;
  transform: translateY(-1px);
}

.load-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 16px;
  }
  
  .language-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-footer {
    flex-direction: column-reverse;
  }
  
  .cancel-btn,
  .load-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>