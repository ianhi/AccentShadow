<template>
  <div 
    v-if="shouldShowDemoPrompt" 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    role="dialog"
    aria-labelledby="demo-prompt-title"
    aria-describedby="demo-prompt-description"
  >
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
      <!-- Header -->
      <div class="flex items-center mb-4">
        <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4">
          <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
          </svg>
        </div>
        <div>
          <h2 id="demo-prompt-title" class="text-xl font-semibold text-gray-900 dark:text-white">
            Welcome to AccentShadow!
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Get started with pronunciation practice
          </p>
        </div>
      </div>

      <!-- Content -->
      <div id="demo-prompt-description" class="mb-6">
        <p class="text-gray-700 dark:text-gray-300 mb-4">
          Would you like to load some sample recordings to try out AccentShadow's features? 
          This includes basic English pronunciation exercises perfect for getting started.
        </p>
        
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
          <h3 class="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Demo includes:
          </h3>
          <ul class="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Basic vocabulary practice</li>
            <li>• Pronunciation exercises</li>
            <li>• Audio visualization features</li>
            <li>• Progress tracking</li>
          </ul>
        </div>

        <!-- Error message -->
        <div v-if="demoLoadError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
          <p class="text-sm text-red-800 dark:text-red-200">
            <strong>Error loading demo:</strong> {{ demoLoadError }}
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3">
        <button
          @click="handleLoadDemo"
          :disabled="isLoadingDemo"
          class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          :aria-label="isLoadingDemo ? 'Loading demo data...' : 'Load demo recordings'"
        >
          <svg 
            v-if="isLoadingDemo" 
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isLoadingDemo ? 'Loading...' : 'Load Demo' }}
        </button>
        
        <button
          @click="handleDismiss"
          :disabled="isLoadingDemo"
          class="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50"
          aria-label="Skip demo and start with empty workspace"
        >
          Skip Demo
        </button>
      </div>

      <!-- Help text -->
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
        You can always upload your own audio files later
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDemoData } from '@/composables/useDemoData';

const {
  shouldShowDemoPrompt,
  isLoadingDemo,
  demoLoadError,
  loadDemoData,
  dismissDemoPrompt
} = useDemoData();

const handleLoadDemo = async (): Promise<void> => {
  const success = await loadDemoData();
  if (success) {
    console.log('✅ Demo data loaded successfully');
  }
};

const handleDismiss = (): void => {
  dismissDemoPrompt();
};
</script>