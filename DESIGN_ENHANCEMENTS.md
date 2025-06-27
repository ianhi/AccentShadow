# Design Enhancements: Multiple Recording Sources & Management

## Overview
Two major feature requests that share a common design pattern:
1. **Online Recording Integration** - Fetch recordings from Tatoeba, Forvo, Rhinospike
2. **Bulk Upload** - Upload entire folders of recordings

Both require solving the **Multiple Recording Management** design challenge.

## Core Design Challenge: Multiple Recording Navigation

### The Problem
Currently, the app handles one target recording at a time. We need to design for:
- Navigating through multiple recordings
- Maintaining context between recordings  
- Providing clear progress indication
- Allowing random access to specific recordings
- Handling different sources (online vs. uploaded folders)

### Design Solutions

#### 1. Recording Queue/Playlist Approach
```
┌─────────────────────────────────────────┐
│ 📁 Current Set: "Japanese Basics" (25) │
├─────────────────────────────────────────┤
│ ◀ [2/25] ▶  こんにちは - Hello          │
│ ⚡ Quick Jump: [1][2][3]...[25]         │
└─────────────────────────────────────────┘
```

**Pros:**
- Linear progression natural for learning
- Clear progress tracking
- Easy to implement

**Cons:**
- May feel rigid
- Hard to compare non-adjacent recordings

#### 2. Tabbed/Card Interface
```
┌─Tab1─┬─Tab2─┬─Tab3─┬─[+]─┐
│ こんにちは │ ありがとう │ さようなら │
├──────────────────────────┤
│   Target Audio Display   │
│   User Recording Area    │
└──────────────────────────┘
```

**Pros:**
- Familiar UI pattern
- Easy comparison between recordings
- Non-linear access

**Cons:**
- Limited space for many recordings
- Tab overflow issues

#### 3. Sidebar + Main Area (Recommended)
```
┌─Recordings──┬─────────────────────────┐
│ 🔍 Filter   │ Target: こんにちは      │
│ ├─Japanese   │ ┌─────────────────────┐ │
│ │ ✓ Hello    │ │   Waveform/Spec     │ │
│ │ • Thanks   │ │                     │ │
│ │ • Goodbye  │ └─────────────────────┘ │
│ ├─Spanish    │                         │
│ │ • Hola     │ User Recording:         │
│ │ • Gracias  │ ┌─────────────────────┐ │
│ └─English    │ │   Waveform/Spec     │ │
│              │ └─────────────────────┘ │
└──────────────┴─────────────────────────┘
```

**Pros:**
- Scales to many recordings
- Allows categorization/filtering
- Maintains context of current recording
- Space for metadata (language, difficulty, etc.)

**Cons:**
- More complex layout
- Requires responsive design

## Feature 1: Online Recording Integration

### Data Sources

#### Tatoeba (sentences with audio)
- **API**: `https://tatoeba.org/en/api_v0/search`
- **Language filtering**: Built-in language codes
- **Audio format**: MP3
- **Metadata**: Sentence text, language, contributor

#### Forvo (pronunciation dictionary)
- **API**: `https://api.forvo.com/v1/`
- **Language filtering**: Language codes (en, es, ja, etc.)
- **Audio format**: MP3
- **Metadata**: Word, phonetic, gender, country

#### Rhinospike (user recordings)
- **API**: Limited/unofficial
- **Alternative**: Web scraping (complex)
- **Challenge**: Rate limiting, terms of service

### Implementation Strategy

#### Phase 1: Tatoeba Integration
```javascript
// Example API integration
async function fetchTatoebaRecordings(language, limit = 20) {
  const response = await fetch(
    `https://tatoeba.org/en/api_v0/search?from=${language}&has_audio=true&limit=${limit}`
  );
  return response.json();
}
```

#### Phase 2: Forvo Integration
```javascript
async function fetchForvoRecordings(language, searchTerm) {
  const response = await fetch(
    `https://api.forvo.com/v1/word-pronunciations/word/${searchTerm}/language/${language}?key=${API_KEY}`
  );
  return response.json();
}
```

### UI Design for Online Sources

```
┌─Online Sources─────────────────────────┐
│ Service: [Tatoeba ▼] Language: [JP ▼] │
│ Search: [________] [🔍 Fetch]          │
│                                        │
│ Results (15 found):                    │
│ ○ こんにちは (Hello) - Native F       │
│ ○ ありがとう (Thank you) - Native M   │
│ ○ おはよう (Good morning) - Native F   │
│                                        │
│ [📥 Add Selected] [📥 Add All]         │
└────────────────────────────────────────┘
```

## Feature 2: Bulk Folder Upload

### Technical Implementation

#### HTML5 Directory Upload
```javascript
// Enable folder upload
<input type="file" webkitdirectory multiple />

// Process uploaded folder
function handleFolderUpload(event) {
  const files = Array.from(event.target.files);
  const audioFiles = files.filter(file => 
    file.type.startsWith('audio/') || 
    /\.(mp3|wav|ogg|m4a)$/i.test(file.name)
  );
  
  return audioFiles.map(file => ({
    name: file.name,
    path: file.webkitRelativePath,
    blob: file,
    url: URL.createObjectURL(file)
  }));
}
```

#### Folder Structure Recognition
```
📁 Japanese Practice/
├── 📁 Greetings/
│   ├── 🎵 hello.mp3
│   ├── 🎵 goodbye.mp3
│   └── 🎵 thanks.mp3
├── 📁 Numbers/
│   ├── 🎵 one.mp3
│   └── 🎵 two.mp3
└── 🎵 random.mp3

→ Creates categories:
- Greetings (3 recordings)  
- Numbers (2 recordings)
- Uncategorized (1 recording)
```

### UI Design for Folder Upload

```
┌─Folder Upload──────────────────────────┐
│ [📁 Select Folder] or drag & drop      │
│                                        │
│ 📁 Uploaded: "Japanese Practice"       │
│ ├── 📂 Greetings (3 files)            │
│ ├── 📂 Numbers (2 files)              │
│ └── 📂 Uncategorized (1 file)         │
│                                        │
│ ☑ Auto-detect categories from folders │
│ ☑ Include subfolders                  │
│                                        │
│ [✅ Import All] [❌ Cancel]             │
└────────────────────────────────────────┘
```

## Unified Recording Management System

### Data Model
```javascript
// Recording Set Structure
const recordingSet = {
  id: 'uuid',
  name: 'Japanese Basics',
  source: 'tatoeba' | 'forvo' | 'upload' | 'manual',
  language: 'ja',
  recordings: [
    {
      id: 'uuid',
      name: 'こんにちは',
      translation: 'Hello',
      audioUrl: 'blob:...',
      audioBlob: Blob,
      metadata: {
        speaker: 'Native Female',
        difficulty: 'beginner',
        category: 'greetings'
      },
      userRecording: {
        audioUrl: 'blob:...',
        audioBlob: Blob,
        attempts: 3,
        lastPracticed: Date
      }
    }
  ],
  currentIndex: 0,
  progress: {
    completed: 2,
    total: 25,
    percentage: 8
  }
};
```

### Navigation Controls

#### Sidebar Design
```
┌─Recording Sets─────────────────────────┐
│ 🔍 [Search/Filter____________]         │
│                                        │
│ 📁 Japanese Basics (25) ●             │
│   🎯 Current → こんにちは              │
│   ✅ Practiced (2)                     │
│   ⏸ Remaining (22)                    │
│                                        │
│ 📁 Spanish Greetings (10)             │
│ 📁 English Pronunciation (15)         │
│                                        │
│ [➕ Add from Online]                   │
│ [📁 Upload Folder]                     │
└────────────────────────────────────────┘
```

#### Progress Controls
```
┌─Current Recording──────────────────────┐
│ [2/25] こんにちは → Hello              │
│ ◀ Prev │ ▶ Next │ 🔀 Random │ 📋 List │
│ ████████▒▒▒▒▒▒▒▒▒▒ 32% Complete       │
└────────────────────────────────────────┘
```

### State Management

#### Practice Session State
```javascript
const practiceSession = {
  activeSet: 'uuid',
  currentRecording: 'uuid',
  playbackMode: 'linear' | 'random' | 'review',
  autoAdvance: boolean,
  reviewQueue: [], // Recordings that need more practice
  sessionStats: {
    recordingsCompleted: 5,
    totalTime: 1200, // seconds
    averageAttempts: 2.3
  }
};
```

## User Workflows

### Workflow 1: Online Source Integration
1. User clicks "Add from Online"
2. Selects service (Tatoeba) and language (Japanese)
3. Searches for "greetings" or leaves blank for popular phrases
4. Reviews results with play preview
5. Selects desired recordings
6. System creates new recording set
7. User begins practice session

### Workflow 2: Folder Upload
1. User clicks "Upload Folder" 
2. Selects folder containing audio files
3. System analyzes structure and detects categories
4. User reviews import preview
5. Confirms import with options (category detection, etc.)
6. System creates recording set with proper organization
7. User begins practice session

### Workflow 3: Practice Session
1. User selects recording set from sidebar
2. System loads first unpracticed recording
3. User practices with current tools (alignment, speed control)
4. User can navigate: Next, Previous, Random, or jump to specific recording
5. System tracks progress and suggests review of difficult recordings
6. Session data persists for later continuation

## Technical Considerations

### Performance
- **Lazy loading**: Only load audio when needed
- **Caching**: Cache frequently accessed recordings
- **Pagination**: For large recording sets (100+ items)
- **Background preloading**: Load next recording while practicing current

### Storage
- **IndexedDB**: Store recording sets and progress
- **Blob management**: Efficient memory usage for audio data
- **Cleanup**: Remove unused blob URLs

### Error Handling
- **Network failures**: Graceful handling of API timeouts
- **Invalid files**: Skip non-audio files in folder uploads
- **CORS issues**: Proxy or warning for restricted URLs

### Accessibility
- **Keyboard navigation**: Arrow keys for prev/next
- **Screen readers**: Proper ARIA labels for progress
- **Visual indicators**: Clear state for completed/remaining

## Implementation Priority

### Phase 1: Core Infrastructure
1. Recording set data model
2. Basic sidebar navigation
3. Progress tracking
4. Folder upload functionality

### Phase 2: Online Integration  
1. Tatoeba API integration
2. Language filtering
3. Search and preview
4. Batch import

### Phase 3: Advanced Features
1. Forvo integration
2. Random/review modes
3. Advanced progress analytics
4. Export/import of recording sets

### Phase 4: Polish
1. Drag-and-drop reordering
2. Custom categories
3. Spaced repetition algorithms
4. Social features (sharing sets)

This design provides a scalable foundation for handling multiple recordings from various sources while maintaining the core pronunciation practice functionality.