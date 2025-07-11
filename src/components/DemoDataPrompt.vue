<template>
  <div 
    v-if="shouldShowDemoPrompt" 
    class="modal-overlay"
    role="dialog"
    aria-labelledby="demo-prompt-title"
    aria-describedby="demo-prompt-description"
  >
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header">
        <div class="icon-wrapper">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
          </svg>
        </div>
        <div class="header-text">
          <h2 id="demo-prompt-title">
            Welcome to AccentShadow!
          </h2>
          <p class="subtitle">
            Get started with pronunciation practice
          </p>
        </div>
      </div>

      <!-- Content -->
      <div id="demo-prompt-description" class="modal-body">
        <p class="intro-text">
          Would you like to load some sample recordings to try out AccentShadow's features? 
          This includes basic pronunciation exercises perfect for getting started.
        </p>
        
        <div class="feature-box">
          <h3 class="feature-title">
            Demo includes:
          </h3>
          <ul class="feature-list">
            <li>• Basic vocabulary practice</li>
            <li>• Pronunciation exercises</li>
            <li>• Audio visualization features</li>
            <li>• Progress tracking</li>
          </ul>
        </div>

        <!-- Language Selection -->
        <div class="language-selection">
          <h3 class="selection-title">Choose a language:</h3>
          <div class="language-cards">
            <LanguageCard
              name="Bangla"
              flag="🇧🇩"
              :demoCount="3"
              :loading="isLoadingDemo && selectedLanguage === 'bn'"
              @click="selectedLanguage = 'bn'; handleLoadDemo()"
            />
            
            <LanguageCard
              name="English"
              flag="🇺🇸"
              :demoCount="0"
              :disabled="true"
            />
          </div>
        </div>

        <!-- Error message -->
        <div v-if="demoLoadError" class="error-box">
          <p class="error-text">
            <strong>Error loading demo:</strong> {{ demoLoadError }}
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="modal-actions">
        <button
          @click="handleDismiss"
          :disabled="isLoadingDemo"
          class="skip-btn"
          aria-label="Skip demo and start with empty workspace"
        >
          Skip Demo
        </button>
      </div>

      <!-- Help text -->
      <p class="help-text">
        You can always upload your own audio files later
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useDemoData } from '@/composables/useDemoData';
import LanguageCard from '@/components/LanguageCard.vue';

const {
  shouldShowDemoPrompt,
  isLoadingDemo,
  demoLoadError,
  loadDemoData,
  dismissDemoPrompt
} = useDemoData();

const selectedLanguage = ref<string>('');

const handleLoadDemo = async (): Promise<void> => {
  console.log('🎯 Starting demo data load...');
  const success = await loadDemoData();
  
  if (success) {
    console.log('✅ Demo data loaded successfully, modal should close');
    // The modal should close automatically via shouldShowDemoPrompt computed property
    // But let's add a safety check
    setTimeout(() => {
      if (shouldShowDemoPrompt.value) {
        console.warn('⚠️ Modal did not close automatically, forcing close');
        dismissDemoPrompt();
      }
    }, 500);
  } else {
    console.error('❌ Demo data loading failed');
  }
};

const handleDismiss = async (): Promise<void> => {
  await dismissDemoPrompt();
};
</script>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

/* Modal Content with Glass-morphism */
.modal-content {
  background: rgba(26, 26, 26, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  color: #ffffff;
  width: 100%;
  max-width: 500px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Header Section */
.modal-header {
  display: flex;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  background: rgba(96, 165, 250, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
}

.icon {
  width: 24px;
  height: 24px;
  color: #60a5fa;
}

.header-text h2 {
  margin: 0;
  color: #60a5fa;
  font-size: 1.5em;
  font-weight: 600;
}

.subtitle {
  color: #9ca3af;
  font-size: 0.9em;
  margin: 4px 0 0 0;
}

/* Body Section */
.modal-body {
  padding: 24px;
  flex: 1;
}

.intro-text {
  color: #e5e7eb;
  margin: 0 0 20px 0;
  line-height: 1.6;
  font-size: 0.95em;
}

/* Feature Box */
.feature-box {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.feature-title {
  color: #60a5fa;
  font-size: 1em;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  color: #93c5fd;
  font-size: 0.9em;
}

.feature-list li {
  margin-bottom: 8px;
  line-height: 1.4;
}

.feature-list li:last-child {
  margin-bottom: 0;
}

/* Error Box */
.error-box {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.error-text {
  color: #fca5a5;
  font-size: 0.9em;
  margin: 0;
}

.error-text strong {
  color: #f87171;
}

/* Language Selection */
.language-selection {
  margin: 24px 0;
}

.selection-title {
  color: #e5e7eb;
  font-size: 1em;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.language-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}


/* Action Buttons */
.modal-actions {
  display: flex;
  justify-content: center;
  padding: 0 24px 24px;
}

.skip-btn {
  padding: 10px 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #e5e7eb;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.95em;
  transition: all 0.2s;
  min-height: 44px;
}

.skip-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.skip-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

.spinner-track {
  opacity: 0.25;
}

.spinner-fill {
  opacity: 0.75;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Help Text */
.help-text {
  text-align: center;
  color: #9ca3af;
  font-size: 0.75em;
  margin: 0;
  padding: 0 24px 20px;
}

/* Responsive Design */
@media (max-width: 640px) {
  .modal-overlay {
    padding: 0.5rem;
  }

  .modal-content {
    max-width: 100%;
    max-height: 90vh;
  }

  .language-cards {
    grid-template-columns: 1fr;
  }

  .skip-btn {
    width: 100%;
  }
}
</style>