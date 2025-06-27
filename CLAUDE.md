# EchoLingo - Pronunciation Practice App

## Project Overview

EchoLingo is a Vue 3-based language learning pronunciation app that allows users to compare their recorded pronunciation with target audio files. The app features advanced audio visualization using WaveSurfer.js with spectrograms, speed control, speech alignment, and comprehensive recording set management.

## Core Architecture

### Frontend Stack
- **Vue 3 Composition API** - Modern reactive framework
- **Vite** - Fast development build tool
- **WaveSurfer.js** - Audio visualization and playback
- **IndexedDB** - Local data persistence
- **Web Audio API** - Advanced audio processing

### Key Components

#### Audio Visualization (`useWaveform.js`)
- WaveSurfer.js integration with spectrogram plugin
- Handles blob URLs and remote audio sources
- Speed control (0.25x to 2.0x playback)
- Visual waveform and spectrogram display
- Fixed colormap issue (arrays instead of CSS strings)
- Enhanced debugging with emoji-prefixed logs

#### Recording Set Management (`useRecordingSets.js`)
- Core data model for managing multiple recordings
- Support for different sources: manual, upload, online (planned)
- Progress tracking and session management
- Navigation functions (next, previous, random)
- Session analytics with real-time statistics

#### Folder Upload System (`FolderUpload.vue`)
- Drag-and-drop folder upload interface
- Automatic category detection from folder structure
- Audio file filtering and validation
- Import preview with customization options
- Progress tracking during import

#### Practice Interface (`PracticeView.vue`)
- Side-by-side audio comparison
- Recording navigation controls
- Session statistics and progress tracking
- Integration with recording sets
- Central playback controls for easy access

## Technical Capabilities

### Audio Processing
- **Speech Onset Detection** - RMS energy analysis for automatic alignment
- **Audio Trimming** - Remove silence from recordings
- **Format Support** - MP3, WAV, OGG, M4A, FLAC, AAC, WMA
- **Blob URL Management** - Efficient memory usage for audio data
- **Speed Control** - Variable playback (0.25x to 2.0x)
- **Auto-play** - Automatic playback after recording completion

### Recording Management
- **Multiple Sources** - Manual upload, folder import, online integration (planned)
- **Category Organization** - Automatic detection from folder structure
- **Progress Tracking** - Attempts, completion status, session analytics
- **Smart Navigation** - Next incomplete, review suggestions, random selection
- **Session Management** - Real-time timer, completion tracking, performance metrics

### Data Persistence
- **IndexedDB Storage** - Recording sets and progress data
- **Session Management** - Real-time statistics and performance tracking
- **Blob Management** - Efficient cleanup and memory management

## Current File Structure

```
src/
├── components/
│   ├── AudioPlayer.vue          # Reusable audio player with waveform
│   ├── AudioRecorder.vue        # Recording interface
│   ├── FolderUpload.vue         # Folder upload modal with preview
│   ├── RecordingNavigation.vue  # Navigation controls for recording sets
│   ├── RecordingSetSidebar.vue  # Sidebar for managing recording sets
│   └── SessionStats.vue         # Real-time session statistics
├── composables/
│   ├── useWaveform.js          # WaveSurfer.js integration
│   ├── useRecordingSets.js     # Recording set management
│   ├── useAudioProcessing.js   # Speech processing and alignment
│   └── useIndexedDB.js         # Data persistence
├── views/
│   └── PracticeView.vue        # Main practice interface
└── assets/                     # Static assets
```

## Key Features Implemented

### ✅ Core Functionality
1. **Audio Practice** - Side-by-side waveform/spectrogram comparison
2. **Speed Control** - Variable playback speed (0.25x-2.0x) for target audio
3. **Auto-play** - Automatic playback after recording with retry logic
4. **Speech Alignment** - RMS-based silence trimming and alignment
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

### ✅ UI/UX Improvements
1. **Responsive Design** - Desktop and mobile layouts
2. **Visual Polish** - Modern card-based design with proper contrast
3. **Organized Layout** - Logical grouping of controls by function
4. **Error Handling** - Graceful fallbacks and user feedback
5. **Performance** - Optimized blob URL management and component lifecycle

## Recent Bug Fixes & Improvements

### Fixed Layout Issues (Latest)
- **Reduced sidebar width** from 320px to 280px for better space utilization
- **Optimized padding and spacing** throughout the interface
- **Enhanced responsive design** for mobile and desktop
- **Improved component rendering** with proper flex properties

### Fixed Audio Issues
- **Duplicate loadAudio function** - Removed console error causing SyntaxError
- **Waveform display** - Enhanced blob URL handling for folder-uploaded audio
- **Enhanced debugging** - Added comprehensive logging for audio loading
- **Better error reporting** - Improved WaveSurfer error handling

### Fixed Recording System
- **Blob URL Management** - Prevented NetworkError from premature URL revocation
- **Recording Container Error** - Added availability checks for HMR stability
- **Auto-play Reliability** - Enhanced retry logic with detailed debugging
- **Alignment Processing** - Improved error handling and fallback behavior

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
- **API Integration** - Connect to Tatoeba sentence database (https://tatoeba.org/en/api_v0/search)
- **Language Filtering** - Support for multiple target languages
- **Search Interface** - Allow users to search for specific phrases
- **Batch Import** - Select multiple sentences for practice
- **Metadata Preservation** - Speaker info, difficulty ratings
- **Implementation**: Create `useTatoebaAPI.js` composable and `TatoebaImport.vue` component

#### 1.2 Forvo Integration
- **Pronunciation Dictionary** - Connect to Forvo API (https://api.forvo.com/v1/)
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
- **Audio Effects** - EQ, filters for hearing training
- **Custom Algorithms** - User-defined alignment settings
- **Plugin System** - Third-party integrations

## Implementation Priorities

### Immediate (Next 1-2 weeks)
1. **Fix folder upload modal height** - Reduce vertical space usage
2. **Polish UI consistency** - Ensure all components follow design system
3. **Enhanced error handling** - Better user feedback on failures
4. **Mobile responsiveness** - Test and fix any mobile issues

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
- **TypeScript Migration** - Add type safety throughout codebase
- **Component Testing** - Unit tests for all Vue components
- **E2E Testing** - Automated user flow testing with Playwright
- **Documentation** - Comprehensive JSDoc comments

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
- [ ] Speech alignment (auto and manual)
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