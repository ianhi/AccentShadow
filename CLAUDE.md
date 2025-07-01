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

## Core Architecture

### Frontend Stack

- **Vue 3.5.17 Composition API** - Modern reactive framework with full TypeScript support
- **TypeScript** - Complete type safety throughout the codebase
- **Vite 7.0.0** - Fast development build tool with HMR
- **Vue Router 4.5.1** - Client-side routing and navigation
- **Scoped CSS** - Component-level styling with CSS custom properties and dark mode support
- **WaveSurfer.js 7.9.8** - Advanced audio visualization with spectrogram support
- **@ricky0123/vad-web 0.0.19** - Voice Activity Detection (pinned version due to bugs in newer releases)
- **IndexedDB** - Local data persistence and offline storage
- **Web Audio API** - Advanced audio processing and effects
- **Vitest 2.1.8** - Fast unit testing framework with Vue Test Utils

### Component Architecture

The application follows a **component-driven architecture** with 33+ specialized components organized into logical groups:

#### Core Audio Components

- **`AudioVisualizationPanel.vue`** - Main waveform/spectrogram display with mobile responsiveness
- **`AudioColumn.vue`** - Individual audio player with integrated visualization
- **`CentralPlaybackControls.vue`** - Unified recording and playback controls
- **`AudioRecorder.vue`** - Voice recording with microphone device selection
- **`SpeedControl.vue`** - Playback speed adjustment (0.25x-2.0x)

#### Mobile-First Responsive Design

- **`MobileLayout.vue`** - Mobile-specific layout wrapper with touch optimization
- **`MobileBottomNav.vue`** - Tab-based mobile navigation system
- **`MainHeader.vue`** - Responsive header with adaptive controls

#### Recording Management System

- **`RecordingSetSidebar.vue`** - Recording set browser with search/filter capabilities
- **`RecordingSetsManager.vue`** - Recording set creation and management interface
- **`RecordingNavigation.vue`** - Navigation between recordings with smart controls
- **`FolderUpload.vue`** - Bulk folder import with drag-and-drop interface
- **`FileUploadManager.vue`** - Individual file upload handling

#### Settings & Configuration

- **`AppSettingsModal.vue`** - Global application settings with preferences
- **`VADSettingsModal.vue`** - Voice Activity Detection configuration
- **`MicrophoneSelector.vue`** - Audio input device selection and management

### Composable Architecture (18 Composables)

The application uses **18 specialized composables** following Vue 3 best practices:

#### Audio Management System

- **`useWaveform.ts`** - WaveSurfer.js integration with spectrograms and blob URL handling
- **`useAudioManager.ts`** - Centralized audio state management with event coordination
- **`useAudioRecorder.ts`** - Recording functionality with device selection and error handling
- **`useAudioProcessing.ts`** - Speech processing with VAD-based trimming and intelligent padding
- **`useVADProcessor.ts`** - Voice activity detection and intelligent silence trimming
- **`useAudioEffects.ts`** - **NEW**: Advanced audio effects (EQ, compression, gain control)

#### Data Management & Persistence

- **`useRecordingSets.ts`** - Recording set management with navigation and progress tracking
- **`useIndexedDB.ts`** - Local storage, offline persistence, and data synchronization
- **`useAppState.ts`** - Global application state management with reactive updates

#### Mobile & Responsive Design

- **`useMobileLayout.ts`** - Mobile-responsive layout management with breakpoint detection
- **`useViewport.ts`** - Viewport detection and responsive utility functions
- **`useMicrophoneDevices.ts`** - Microphone device enumeration and selection

#### Performance & Optimization

- **`usePreloader.ts`** - Background initialization of expensive resources (AudioContext, VAD)
- **`useTimeSync.ts`** - Synchronized audio playback timing across components
- **`useSmartAudioAlignment.ts`** - Intelligent audio alignment algorithms with fallbacks
- **`usePlaybackControls.ts`** - Centralized playback control logic with state management

#### Utility Composables

- **`useUtils.ts`** - Common utility functions and helpers
- **`useErrorHandler.ts`** - Centralized error handling and user feedback

## Technical Capabilities

### Advanced Audio Processing

- **Voice Activity Detection** - Advanced VAD processing for precise silence trimming
- **Audio Effects System** - **NEW**: Comprehensive EQ, compression, and gain control
- **Smart Audio Alignment** - Intelligent alignment algorithms with multiple strategies
- **Audio Trimming** - Sophisticated silence removal with configurable thresholds
- **Format Support** - Comprehensive audio format support (MP3, WAV, OGG, M4A, FLAC, AAC, WMA)
- **Blob URL Management** - Efficient memory usage with automatic cleanup
- **Speed Control** - Variable playback (0.25x to 2.0x) with audio quality preservation
- **Auto-play** - Automatic playback after recording with retry logic and error handling

### Mobile-First Responsive Design

- **Adaptive Layouts** - Mobile-first design with desktop enhancements
- **Touch Optimization** - Touch-friendly controls and gesture support
- **Responsive Components** - Automatic layout adaptation based on viewport
- **Mobile Navigation** - Tab-based navigation optimized for mobile usage
- **Performance Optimization** - Efficient rendering on mobile devices

### Recording Management System

- **Multiple Sources** - Manual upload, folder import, online integration (planned)
- **Intelligent Organization** - Automatic category detection from folder structure
- **Advanced Progress Tracking** - Attempts, completion status, session analytics with real-time updates
- **Smart Navigation** - Next incomplete, review suggestions, random selection with context awareness
- **Session Management** - Comprehensive timer, completion tracking, performance metrics
- **Background Preloading** - Optimized resource initialization for better performance

### Data Persistence & State Management

- **IndexedDB Storage** - Offline-capable recording sets and progress data
- **Reactive State Management** - Vue 3 reactivity with centralized state coordination
- **Session Analytics** - Real-time statistics and performance tracking
- **Efficient Blob Management** - Memory-optimized cleanup and lifecycle management
- **Data Synchronization** - Consistent state across components with event coordination

## Current File Structure

### Complete Application Architecture (TypeScript)

```
src/
├── components/ (35+ Components - Component-Driven Architecture)
│   ├── AppSettingsModal.vue               # Global application settings
│   ├── AudioColumn.vue                    # Individual audio player with visualization
│   ├── AudioLoadingManager.vue            # Audio loading state management
│   ├── AudioPlayer.vue                    # Core audio player component
│   ├── AudioProcessingControls.vue        # Audio processing control interface
│   ├── AudioProcessingHandler.vue         # Audio processing logic handler
│   ├── AudioRecorder.vue                  # Voice recording with device selection
│   ├── AudioVisualizationPanel.vue        # Main waveform/spectrogram display
│   ├── CentralPlaybackControls.vue        # Unified recording/playback controls
│   ├── FileUploadManager.vue              # Individual file upload handling
│   ├── FolderUpload.vue                   # Bulk folder import interface
│   ├── MainHeader.vue                     # Responsive header component
│   ├── MicrophoneSelector.vue             # Audio input device selection
│   ├── MobileBottomNav.vue                # Tab-based mobile navigation
│   ├── MobileLayout.vue                   # Mobile-specific layout wrapper
│   ├── ModalManager.vue                   # Modal state management
│   ├── PlaybackButton.vue                 # Playback button component
│   ├── PlaybackController.vue             # Playback control logic
│   ├── PlaybackControls.vue               # Playback control interface
│   ├── RecordingActions.vue               # Recording action buttons
│   ├── RecordingList.vue                  # Recording list display
│   ├── RecordingListItem.vue              # Individual recording item
│   ├── RecordingManager.vue               # Recording management logic
│   ├── RecordingNavigation.vue            # Navigation between recordings
│   ├── RecordingSetSidebar.vue            # Recording set browser with search
│   ├── RecordingSetsManager.vue           # Recording set creation/management
│   ├── RecordingStateManager.vue          # Recording state management
│   ├── SavedRecordingsSection.vue         # Saved recordings section
│   ├── SessionStats.vue                   # Real-time session statistics
│   ├── SpeedControl.vue                   # Playback speed adjustment (0.25x-2.0x)
│   ├── TargetAudioControls.vue            # Target audio specific controls
│   ├── UrlInputModal.vue                  # URL input modal dialog
│   ├── VADSettingsModal.vue               # Voice Activity Detection config
│   └── icons/                             # Icon components directory
├── composables/ (18 Composables - Separation of Concerns)
│   ├── useAppState.ts                     # Global application state
│   ├── useAppUtilities.ts                 # Common utility functions
│   ├── useAudioEffects.ts                 # Audio effects (EQ, compression, gain)
│   ├── useAudioManager.ts                 # Centralized audio state management
│   ├── useAudioProcessing.ts              # Speech processing and alignment
│   ├── useAudioRecorder.ts                # Recording functionality
│   ├── useIndexedDB.ts                    # Local storage and persistence
│   ├── useMicrophoneDevices.ts            # Microphone device management
│   ├── useMobileLayout.ts                 # Mobile-responsive layout
│   ├── usePlaybackControls.ts             # Centralized playback logic
│   ├── usePreloader.ts                    # Background resource initialization
│   ├── useRecordingSets.ts                # Recording set management
│   ├── useSmartAudioAlignment.ts          # Intelligent alignment algorithms
│   ├── useTimeSync.ts                     # Synchronized audio playback
│   ├── useVADProcessor.ts                 # Voice activity detection
│   ├── useViewport.ts                     # Viewport detection utilities
│   └── useWaveform.ts                     # WaveSurfer.js integration
├── views/ (6 Main Views)
│   ├── AudioAlignmentTest.vue             # Audio alignment testing
│   ├── MobileDemoIndex.vue                # Mobile-specific demo interface
│   ├── PracticeView.vue                   # Main practice interface
│   ├── TestAudioVisualization.vue         # Audio visualization testing
│   ├── TestVADTrimming.vue                # VAD processing testing
│   └── VADTestView.vue                    # Additional VAD testing
├── router/
│   ├── index.d.ts                         # Router type definitions
│   └── index.ts                           # Vue Router configuration
├── assets/
│   ├── base.css                           # Base CSS styles
│   ├── logo.svg                           # Application logo
│   └── main.css                           # Main CSS with custom properties and theming
├── main.ts                                # Application entry point
└── shims-vue.d.ts                         # Vue TypeScript declarations
```

### Root Level Files & Testing

```
/
├── tests/ (Comprehensive Testing Structure)
│   ├── unit/                              # Unit tests for components & composables
│   │   ├── AudioColumn.test.js
│   │   ├── AudioProcessingControls.test.js
│   │   ├── AudioVisualizationPanel.test.js
│   │   ├── FolderUpload.test.js
│   │   ├── MicrophoneSelector.test.js
│   │   ├── PlaybackControls.test.js
│   │   ├── SavedRecordingsSection.test.js
│   │   ├── SpeedControl.test.js
│   │   ├── TargetAudioControls.test.js
│   │   ├── UrlInputModal.test.js
│   │   ├── audio-processing-consistency.test.js
│   │   ├── composables.test.js
│   │   ├── usePlaybackControls.test.js
│   │   └── vad-processing.test.js
│   ├── integration/                       # Integration tests
│   │   ├── audio-playback.test.js
│   │   ├── folder-vs-single-upload.test.js
│   │   └── vad-integration.test.js
│   ├── e2e/                               # End-to-end tests
│   │   └── folder-upload-playback.spec.js
│   ├── folder-audio-processing.test.js
│   ├── folder-watch-integration.test.js
│   └── setup.js
├── public/                                # Static assets & debug files
│   ├── debug-patth.html
│   ├── favicon.ico
│   ├── path.mp3
│   ├── patth.wav
│   ├── simple-vad-test-backup.html
│   ├── simple-vad-test-typescript-logic.html
│   ├── simple-vad-test.html
│   ├── test_said_three_words.wav
│   ├── vad-bug-report.html
│   ├── vad-diagnostic.html
│   └── vad-test.html
├── Configuration Files
│   ├── package.json                       # Dependencies and scripts
│   ├── vite.config.ts                     # Vite configuration
│   ├── vitest.config.js                   # Vitest testing configuration
│   ├── tsconfig.json                      # TypeScript configuration
│   ├── tsconfig.app.json                  # App-specific TypeScript config
│   ├── tsconfig.node.json                 # Node-specific TypeScript config
│   └── env.d.ts                           # Environment type definitions
└── Documentation Files
    ├── CLAUDE.md                          # Main project documentation
    ├── CLAUDE.local.md                    # Local development notes
    ├── ARCHITECTURE.md                    # System architecture
    ├── DESIGN.md                          # Design specifications
    ├── DESIGN_ENHANCEMENTS.md             # Design improvements
    ├── MOBILE_DESIGN_DOCUMENT.md          # Mobile design guide
    ├── PROGRESS.md                        # Development progress
    ├── README.md                          # Project overview
    ├── ROADMAP.md                         # Future development plans
    └── TATOEBA_API_RESEARCH.md            # API integration research
```

## Key Features Implemented

### ✅ Core Functionality

1. **Audio Practice** - Side-by-side waveform/spectrogram comparison
2. **Speed Control** - Variable playback speed (0.25x-2.0x) for target audio
3. **Auto-play** - Automatic playback after recording with retry logic
4. **VAD Processing** - Voice Activity Detection for intelligent silence trimming and padding
5. **URL Loading** - Load audio from remote URLs with validation
6. **Central Playback** - Unified controls (Play Target, Play Recording, Play Both, Stop All)

### ✅ Recording Set Management

1. **Folder Upload** - Bulk import with drag-and-drop interface
2. **Category Detection** - Automatic organization from folder structure
3. **Recording Sets** - Multi-recording management system
4. **Navigation Controls** - Previous, next, random, jump-to-recording
5. **Progress Tracking** - Completion status and attempt counting
6. **Session Management** - Real-time statistics and analytics
7. **Sidebar Navigation** - Recording set browser with search and filters

### ✅ Mobile-First Responsive Design

1. **Mobile-First Architecture** - Dedicated mobile components and layouts
2. **Adaptive Responsive Design** - Automatic layout adaptation for all screen sizes
3. **Touch-Optimized Controls** - Mobile-friendly interface with gesture support
4. **Tab-Based Mobile Navigation** - Intuitive mobile navigation patterns
5. **Performance Optimization** - Mobile-specific performance enhancements

### ✅ Advanced Audio Effects System

1. **Comprehensive EQ System** - Multi-band equalizer with presets
2. **Dynamic Range Compression** - Professional audio compression controls
3. **Gain Control** - Precise audio level adjustment
4. **Real-time Processing** - Live audio effects during playback
5. **Effect Presets** - Pre-configured settings for different use cases

### ✅ UI/UX Excellence

1. **Component-Driven Design** - Reusable, consistent UI components
2. **Scoped CSS Architecture** - Component-level styling with semantic theming system
3. **Visual Polish** - Modern design with proper contrast and accessibility
4. **Organized Layout** - Logical grouping of controls by function
5. **Error Handling** - Graceful fallbacks with user-friendly feedback
6. **Performance** - Optimized rendering and component lifecycle management

## Current Development Status

### ✅ Recently Completed Features

- **Mobile-First Architecture** - Complete mobile layout system with responsive components
- **Advanced Audio Effects** - Comprehensive EQ, compression, and gain control system
- **VAD Processing Integration** - Voice Activity Detection for intelligent audio trimming
- **TypeScript Migration** - Full type safety implementation across entire codebase
- **Comprehensive Testing** - 33+ test files with Vitest and Vue Test Utils
- **Component Architecture** - 33+ specialized components with proper separation of concerns

### ✅ Stable Audio System

- **Blob URL Management** - Efficient memory management with proper cleanup
- **Waveform Visualization** - Robust WaveSurfer.js integration with spectrograms
- **Multi-Device Recording** - Microphone device selection and management
- **Background Preloading** - Optimized resource initialization for better performance
- **Error Resilience** - Comprehensive error handling and graceful fallbacks

## Data Models

### Recording Set Structure

```javascript
{
  id: 'uuid',
  name: 'Japanese Basics',
  source: 'upload' | 'manual' | 'tatoeba' | 'forvo',
  language: 'ja',
  createdAt: '2024-01-01T00:00:00Z',
  recordings: [
    {
      id: 'uuid',
      name: 'こんにちは',
      translation: 'Hello',
      audioUrl: 'blob:...',
      audioBlob: Blob,
      metadata: {
        category: 'greetings',
        speaker: 'Native Female',
        difficulty: 'beginner',
        fileName: 'hello.mp3',
        fileSize: 123456,
        filePath: 'greetings/hello.mp3'
      },
      userRecording: {
        audioUrl: 'blob:...',
        audioBlob: Blob,
        attempts: 3,
        lastPracticed: '2024-01-01T12:00:00Z',
        isCompleted: false
      }
    }
  ],
  currentIndex: 0,
  progress: {
    completed: 2,
    total: 25,
    percentage: 8
  }
}
```

### Session Management

```javascript
{
  startTime: Date.now(),
  totalTime: 0,
  recordingsCompleted: 5,
  totalAttempts: 12,
  averageAttempts: 2.4,
  isActive: true
}
```

## Performance Optimizations

- **Lazy Loading** - Audio files loaded only when needed
- **Blob URL Management** - Proper cleanup to prevent memory leaks
- **Component Keys** - Force re-rendering when switching recordings
- **Responsive Canvas** - WaveSurfer adaptations for different screen sizes
- **Efficient State Management** - Minimal re-renders with Vue 3 reactivity

## Known Issues & Limitations

1. **Large File Handling** - Very large audio files may cause performance issues
2. **Mobile Recording** - Web Audio API limitations on some mobile browsers
3. **CORS Restrictions** - Some remote audio sources may be blocked
4. **Storage Limits** - IndexedDB has browser-specific size limits

## Next Steps and Roadmap

### Phase 1: Online Source Integration (High Priority)

**Objective**: Enable users to import recordings from online sources

#### 1.1 Tatoeba Integration

- **API Integration** - Connect to Tatoeba sentence database (<https://tatoeba.org/en/api_v0/search>)
- **Language Filtering** - Support for multiple target languages
- **Search Interface** - Allow users to search for specific phrases
- **Batch Import** - Select multiple sentences for practice
- **Metadata Preservation** - Speaker info, difficulty ratings
- **Implementation**: Create `useTatoebaAPI.js` composable and `TatoebaImport.vue` component

#### 1.2 Forvo Integration

- **Pronunciation Dictionary** - Connect to Forvo API (<https://api.forvo.com/v1/>)
- **Word-based Practice** - Individual word pronunciation
- **Speaker Selection** - Choose from multiple native speakers
- **Gender/Region Filters** - Practice with specific accents
- **Implementation**: Create `useForvoAPI.js` composable and `ForvoImport.vue` component

#### 1.3 Online Source UI

- **Source Selection Modal** - Replace placeholder in RecordingSetSidebar
- **Preview Interface** - Listen before importing
- **Auto-categorization** - Organize by language/difficulty
- **Progress Sync** - Track online vs local progress

### Phase 2: Advanced Practice Features (Medium Priority)

#### 2.1 Spaced Repetition System

- **Algorithm Implementation** - SM-2 or similar algorithm
- **Review Scheduling** - Optimal practice timing based on performance
- **Difficulty Adjustment** - Dynamic difficulty based on user attempts
- **Review Queue Management** - Prioritize challenging recordings
- **Implementation**: Enhance `useRecordingSets.js` with spaced repetition logic

#### 2.2 Advanced Audio Analysis

- **Pitch Analysis** - Compare pitch patterns with target using Web Audio API
- **Pronunciation Scoring** - Automated feedback system using audio similarity
- **Phoneme Recognition** - Break down pronunciation by sounds
- **Visual Feedback** - Highlight pronunciation differences in waveform
- **Implementation**: Create `useAudioAnalysis.js` composable

#### 2.3 Enhanced Session Management

- **Practice Goals** - Set daily/weekly targets
- **Achievement System** - Badges and milestones
- **Performance Analytics** - Detailed progress charts with Chart.js
- **Export/Import** - Share recording sets between devices

### Phase 3: Collaboration & Sharing (Medium Priority)

#### 3.1 Recording Set Sharing

- **Export Functionality** - Export recording sets as JSON files
- **Import Validation** - Validate and import shared recording sets
- **Community Hub** - Upload/download community sets (requires backend)
- **Rating System** - User feedback on recording quality
- **Language Tags** - Organize by language and level

#### 3.2 Social Features (Requires Backend)

- **Study Groups** - Collaborative practice sessions
- **Progress Sharing** - Compare with friends
- **Leaderboards** - Gamified learning experience
- **Peer Review** - Get feedback from other users

### Phase 4: Professional Features (Low Priority)

#### 4.1 Teacher/Student Mode

- **Class Management** - Organize students and assignments
- **Assignment Creation** - Teachers can create practice sets
- **Progress Monitoring** - Track student performance
- **Feedback System** - Teacher comments and ratings

#### 4.2 Advanced Customization

- **Theme System** - Customizable UI colors and layouts
- **✅ Audio Effects** - EQ, compression, and gain control (COMPLETED)
- **Custom Algorithms** - User-defined alignment settings
- **Plugin System** - Third-party integrations

## Implementation Priorities

### Immediate (Next 1-2 weeks)

1. **Online Source Integration** - Begin Tatoeba API implementation
2. **Audio Effects UI Polish** - Enhance audio effects control interface
3. **Performance Optimization** - Optimize large recording set handling
4. **Advanced VAD Configuration** - User-configurable VAD settings

### Short Term (2-4 weeks)

1. **Tatoeba API integration** - Core online source functionality
2. **Enhanced search/filtering** - Better recording organization in sidebar
3. **Performance optimization** - Handle larger recording sets efficiently
4. **Basic spaced repetition** - Simple review algorithm implementation

### Medium Term (1-3 months)

1. **Forvo API integration** - Second online source
2. **Advanced audio analysis** - Pronunciation scoring basics
3. **Recording set sharing** - Export/import functionality
4. **Enhanced session management** - Goal setting and analytics

### Long Term (3+ months)

1. **Advanced collaboration** - Real-time practice sessions
2. **Professional features** - Enterprise/education licensing
3. **Mobile app development** - React Native implementation
4. **Platform expansion** - Desktop apps, browser extensions

## Technical Debt & Refactoring Needs

### Code Quality

- **✅ TypeScript Implementation** - Complete type safety throughout codebase
- **✅ Component Testing** - Comprehensive unit tests with Vitest and Vue Test Utils (33 test files)
- **✅ Idiomatic Vue 3** - Props down, events up, proper separation of concerns
- **Component-Driven Architecture** - Single responsibility components with clear boundaries
- **E2E Testing** - Automated user flow testing with Playwright (planned)
- **Documentation** - Comprehensive JSDoc comments and architectural documentation

### Performance

- **Virtual Scrolling** - Handle large recording lists in sidebar
- **Web Workers** - Move audio processing off main thread
- **PWA Features** - Offline capability and app-like experience
- **Bundle Optimization** - Code splitting and lazy loading

### Architecture

- **State Management** - Consider Pinia for complex state management
- **API Layer** - Abstracted service layer for online sources
- **Plugin Architecture** - Extensible system for new features
- **Error Boundary** - Graceful error handling and recovery

## Testing Checklist

### Core Functionality

- [ ] Audio upload and waveform display
- [ ] Recording functionality with spectrogram
- [ ] Speed control (0.25x to 2.0x)
- [ ] Auto-play after recording
- [ ] VAD processing (automatic silence trimming and padding)
- [ ] URL loading with validation
- [ ] Central playback controls

### Recording Set Management

- [ ] Folder upload with drag-and-drop
- [ ] Category detection from folder structure
- [ ] Recording navigation (prev/next/random)
- [ ] Progress tracking and completion
- [ ] Session statistics
- [ ] Sidebar search and filtering

### UI/UX

- [ ] Responsive design on mobile/desktop
- [ ] Layout consistency across components
- [ ] Error handling and user feedback
- [ ] Performance with large recording sets
- [ ] Browser compatibility (Chrome, Firefox, Safari, Edge)

### Edge Cases

- [ ] Large file handling
- [ ] Network errors with remote URLs
- [ ] Browser storage limits
- [ ] HMR stability during development
- [ ] Blob URL cleanup and memory management

## Success Metrics

### User Engagement

- **Session Length** - Average practice time per session
- **Return Rate** - Users returning after first use
- **Recording Completion** - Percentage of recordings completed
- **Feature Usage** - Adoption of advanced features

### Technical Performance

- **Load Times** - Time to first audio playback
- **Error Rates** - Frequency of technical failures
- **Storage Efficiency** - Optimal use of browser storage
- **Cross-browser Compatibility** - Consistent experience

### Educational Effectiveness

- **Pronunciation Improvement** - Measured through scoring algorithms
- **Learning Retention** - Long-term pronunciation accuracy
- **User Satisfaction** - Feedback and rating scores
- **Community Growth** - Shared recording sets and engagement
