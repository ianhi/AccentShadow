<template>
  <div v-if="isVisible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>🎵 Select Demo Language</h2>
        <button @click="$emit('close')" class="close-btn">✕</button>
      </div>
      
      <div class="modal-body">
        <p class="description">
          Choose a language to load demo audio files for practice.
        </p>
        
        <!-- Language Cards -->
        <div class="language-cards">
          <LanguageCard
            v-for="lang in languagesWithDemos" 
            :key="lang.code"
            :name="lang.name"
            :flag="lang.flag"
            :demoCount="lang.demoCount"
            :loading="isLoadingDemo && selectedLanguage === lang.code"
            @click="selectedLanguage = lang.code; loadLanguageDemos(lang.code)"
          />
          
          <LanguageCard
            v-for="lang in comingSoonLanguages"
            :key="lang.code"
            :name="lang.name"
            :flag="lang.flag"
            :demoCount="0"
            :disabled="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { demoRecordings, getDefaultDemoSet } from '@/data/demoData'
import { useDemoData } from '@/composables/useDemoData'
import LanguageCard from '@/components/LanguageCard.vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'load-demo', 'load-demo-set'])

// Get demo data composable for recording set creation
const { loadDemoData, isLoadingDemo } = useDemoData()

// Selected language for loading state
const selectedLanguage = ref('')

// All possible languages
const allLanguages = [
  { code: 'bn', name: 'Bangla', flag: '🇧🇩' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
]

// Get demo counts by language
const demoCounts = computed(() => {
  const counts = {}
  demoRecordings.forEach(recording => {
    const lang = recording.metadata.language
    counts[lang] = (counts[lang] || 0) + 1
  })
  return counts
})

// Languages that have demos
const languagesWithDemos = computed(() => {
  return allLanguages.filter(lang => demoCounts.value[lang.code] > 0)
    .map(lang => ({
      ...lang,
      demoCount: demoCounts.value[lang.code]
    }))
})

// Languages coming soon (no demos yet)
const comingSoonLanguages = computed(() => {
  return allLanguages.filter(lang => !demoCounts.value[lang.code])
})

const handleOverlayClick = () => {
  emit('close')
}

const loadLanguageDemos = async (languageCode) => {
  try {
    // For now, we'll load all demos as a recording set
    // In the future, we could filter by language
    await loadDemoData()
    emit('close')
  } catch (error) {
    console.error('Failed to load demo set:', error)
  }
}

// Reset when modal closes
watch(() => props.isVisible, (newVal) => {
  if (!newVal && isLoadingDemo.value) {
    // Cancel any ongoing loading if modal is closed
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
  text-align: center;
}

.language-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
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
  .modal-body {
    padding: 16px;
  }
  
  .language-cards {
    grid-template-columns: 1fr;
  }
}
</style>