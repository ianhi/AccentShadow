# Development Roadmap

This document outlines the development plan for the EchoLingo application, starting with the Minimum Viable Product (MVP) and detailing potential future enhancements.

## Phase 1: Minimum Viable Product (MVP)

The goal of the MVP is to deliver the core user experience. All features must be fully functional and polished.

1.  **Project Setup:**
    - Initialize a new Vue 3 + Vite project.
    - Install and configure Tailwind CSS.

2.  **Core Component Development:**
    - Build the `AudioPlayer` component.
    - Integrate `wavesurfer.js` to display a basic waveform.
    - Build the `AudioRecorder` component using the `MediaRecorder` API.

3.  **Main View Implementation:**
    - Assemble the `PracticeView` with slots for the target and user audio players.
    - Implement the logic for loading a local audio file as the target.
    - Wire up the recorder to output its recording to the user audio player.

4.  **Visualization:**
    - Add the `wavesurfer.js` spectrogram plugin to both audio players.
    - Style the visualizations to match the design.

5.  **Local Persistence:**
    - Implement the `useIndexedDB.js` composable.
    - Create the `RecordingList` component to display saved recordings.
    - Add functionality to save, load, and delete recordings.

6.  **Styling & Responsiveness:**
    - Apply the final UI styling based on the `DESIGN.md`.
    - Ensure the layout is fully responsive and usable on mobile devices.

## Phase 2: Future Enhancements

These features can be developed after the MVP is complete and stable.

- **Advanced Playback Controls:**
  - Add controls for slowing down playback speed (0.75x, 0.5x) without changing pitch.
  - Implement A-B loop functionality to repeat a specific section of the audio.

- **Improved Visualizations:**
  - Add a pitch contour overlay on the spectrogram to better visualize intonation.
  - Allow users to zoom in on the timeline for more detailed analysis.

- **Pre-loaded Content:**
  - Add the ability to load pre-defined practice packs (e.g., "Common English Phrases") from a local JSON file.

- **Cloud Sync (Optional Login):**
  - Integrate a secure authentication provider (e.g., Firebase Auth, OAuth with Google).
  - Allow users to back up and sync their recordings to a cloud storage service (e.g., Google Drive, Firebase Storage).
  - This would be an opt-in feature, preserving the local-first nature of the app for those who prefer it.

- **Sharing:**
  - Implement a feature to generate a unique, shareable link to a recording pair (would require a backend service to host the audio).
