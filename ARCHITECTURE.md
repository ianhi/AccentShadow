# Architecture Document

This document details the technical architecture, folder structure, state management, and data persistence strategy for the EchoLingo application.

## 1. Folder Structure

A standard Vite + Vue 3 project structure will be used:

```
/
├── public/
│   └── (static assets)
├── src/
│   ├── assets/
│   │   └── (css, fonts, images)
│   ├── components/
│   │   ├── AudioPlayer.vue
│   │   ├── AudioRecorder.vue
│   │   ├── RecordingList.vue
│   │   └── RecordingListItem.vue
│   ├── composables/
│   │   ├── useAudioRecorder.js  // Logic for MediaRecorder API
│   │   ├── useWaveform.js       // Logic for wavesurfer.js integration
│   │   └── useIndexedDB.js      // Logic for database interactions
│   ├── views/
│   │   └── PracticeView.vue
│   ├── App.vue
│   └── main.js
├── index.html
├── package.json
└── vite.config.js
```

## 2. State Management

For the initial version, a complex state management library like Pinia or Vuex is not necessary. We will use Vue 3's built-in reactivity and Composition API for state management.

- **Local Component State:** UI state (e.g., "is playing", "is recording") will be managed within the relevant components.
- **Shared State:** A simple global store will be created using the Composition API for state that needs to be shared across the application, such as the list of saved recordings. This can be a `ref` or `reactive` object exported from a JavaScript file (e.g., `src/store.js`).

## 3. Data Flow & Logic

### Recording a New Phrase

1.  **Load Target:** The user provides a target audio file via a file input (`<input type="file">`).
2.  **Display Target:** The file is loaded as a URL (`URL.createObjectURL()`) and passed as a prop to the "Target" `AudioPlayer.vue` instance.
3.  **Initiate Recording:** The user clicks the "Record" button in the `AudioRecorder.vue` component. The `useAudioRecorder.js` composable is invoked, which starts the `MediaRecorder` stream.
4.  **Stop Recording:** The user clicks "Stop." The `MediaRecorder` finalizes the audio into a `Blob`.
5.  **Display User Recording:** The new `Blob` is converted to an object URL and passed to the "User" `AudioPlayer.vue` instance.
6.  **Save to DB:** The target audio `Blob` and the user's recording `Blob` are saved as a pair into `IndexedDB` via the `useIndexedDB.js` composable.

## 4. Audio Processing & Visualization

- **`wavesurfer.js` Integration:** The `useWaveform.js` composable will encapsulate the logic for creating, configuring, and destroying `wavesurfer.js` instances. This keeps the `AudioPlayer.vue` component clean and focused on presentation.
- **Spectrogram:** `wavesurfer.js` has a spectrogram plugin that will be used to generate the visualizations. The plugin will be configured to match the application's color scheme.

## 5. Data Persistence

- **`IndexedDB`:** We will use `IndexedDB` to store user recordings because it is well-suited for storing larger data blobs, such as audio files, directly in the browser. This is superior to `localStorage`, which is meant for small amounts of string data.
- **`useIndexedDB.js` Composable:** This file will contain all the logic for interacting with the database, including:
  - `initDB()`: To create the database and object store.
  - `addRecording(targetBlob, userBlob)`: To save a new pair of recordings.
  - `getRecordings()`: To retrieve all saved recordings.
  - `deleteRecording(id)`: To remove a recording.
