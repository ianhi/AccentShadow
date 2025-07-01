# AccentShadow - Pronunciation Practice App

## Project Overview

AccentShadow is a sophisticated Vue 3-based language learning pronunciation app that allows users to compare their recorded pronunciation with target audio files. The app features advanced audio visualization using WaveSurfer.js with spectrograms, mobile-first responsive design, comprehensive audio effects, and intelligent recording set management.

## Development Philosophy

### Idiomatic Vue 3 Development

This project emphasizes **idiomatic Vue 3 development practices** with strict adherence to:

- **Component-Driven Architecture** - Reusable, single-responsibility components
- **Props Down, Events Up** - Unidirectional data flow with proper event emission
- **Composition API** - Logical concern grouping with composables
- **Separation of Concerns** - Clear boundaries between UI, business logic, and data
- **TypeScript First** - Full type safety throughout the codebase
- **Reactive Design Patterns** - Leveraging Vue's reactivity system effectively

### Development Environment

**IMPORTANT**: A development server is **always running** in a separate terminal during active development. **Never start a dev server** - if MCP browser interaction is needed, request the port number.

**Build Quality Assurance**: Always verify that builds work and check for TypeScript errors regularly during development using `npm run build` and `npm run type-check`.

## Audio Processing & Cross-Browser Debugging

**IMPORTANT**: When working on audio-related issues, particularly:
- Audio alignment problems between browsers
- Speech detection inconsistencies  
- VAD (Voice Activity Detection) trimming issues
- Sample rate related bugs
- Timing differences in processed audio

**→ READ: [`AUDIO_SAMPLING_RATE_DEBUG.md`](./AUDIO_SAMPLING_RATE_DEBUG.md)**

This document contains a comprehensive technical deep-dive into the complex audio sampling rate issues we solved and the critical pre-padding solution implemented. It explains why Chrome and Firefox were processing audio differently and how our 320ms pre-padding strategy ensures consistent cross-browser behavior.

## Development Memories and Notes

- **Commit Workflow Reminder**: Please always ask me before making a commit

[Rest of the document remains unchanged...]