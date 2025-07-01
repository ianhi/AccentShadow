import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import './assets/main.css'

// Global error handler for uncaught promise rejections (like spectrogram errors)
window.addEventListener('unhandledrejection', (event) => {
  // Handle specific WaveSurfer/spectrogram errors silently
  if (event.reason?.message?.includes('Cannot read properties of undefined') &&
      (event.reason?.stack?.includes('spectrogram') || 
       event.reason?.stack?.includes('wavesurfer'))) {
    console.log('🎵 Handled spectrogram error silently:', event.reason.message);
    event.preventDefault(); // Prevent the error from appearing in console
    return;
  }
  
  // Let other errors bubble up normally
  console.error('Unhandled promise rejection:', event.reason);
});

const app = createApp(App)

app.use(router)

app.mount('#app')