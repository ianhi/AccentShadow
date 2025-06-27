# Design Document

This document outlines the design principles, user experience (UX), user interface (UI), and component architecture for the EchoLingo application.

## 1. UI/UX Philosophy

- **Clean & Minimalist:** The interface will be uncluttered, focusing the user's attention on the core task: listening, recording, and comparing.
- **Intuitive:** Controls for recording and playback will be immediately understandable, using standard icons and clear labels.
- **Feedback-Driven:** The user will always have clear feedback on the application's state (e.g., "Recording...", "Saved", "Now Playing...").
- **Mobile-First & Responsive:** The design will prioritize a seamless experience on smaller screens and scale gracefully to larger desktop views.

## 2. Visual Language

- **Color Palette:**
  - **Primary:** A calming but clear blue (`#3B82F6`) for interactive elements like buttons and links.
  - **Secondary/Accent:** A vibrant green (`#10B981`) for success states and the record button. A red (`#EF4444`) for the stop/delete actions.
  - **Neutral:** A range of grays (`#1F2937` to `#F3F4F6`) for text, backgrounds, and borders.
- **Typography:** A clean, readable sans-serif font like **Inter** or **Lato**, available from a service like Google Fonts.
- **Icons:** A consistent icon set (e.g., Feather Icons or FontAwesome) for actions like play, pause, record, stop, and delete.

## 3. Layout & Wireframes

The application will be a Single Page Application (SPA).

- **Main View:**
  - **Top Section:** "Target Audio" area. It will contain an audio player with a waveform/spectrogram visualization for the source recording.
  - **Middle Section:** "Your Recording" area. This section will house the record button. Once a recording is made, it will display an audio player for the user's recording, also with a visualization.
  - **Bottom Section:** A simple list or grid of previously saved recording pairs.

## 4. Component Breakdown

The application will be built using a modular, component-based architecture.

- `App.vue`: The root component, managing the main layout.
- `PracticeView.vue`: The main view containing the core user experience.
- `AudioPlayer.vue`: A reusable component responsible for:
  - Displaying the audio waveform/spectrogram (using `wavesurfer.js`).
  - Providing playback controls (play/pause, volume, timeline).
  - Props: `audioUrl`, `visualizationType`.
- `AudioRecorder.vue`: A component that handles the user recording logic.
  - Manages the `MediaRecorder` API.
  - Displays the "Record" and "Stop" buttons.
  - Shows recording status (e.g., a pulsing red light, a timer).
  - Emits the recorded audio data (as a Blob) when complete.
- `RecordingList.vue`: A component to display the list of saved recordings.
  - Manages loading and displaying items from `IndexedDB`.
- `RecordingListItem.vue`: Represents a single saved recording in the list, with buttons to load it into the main view or delete it.
