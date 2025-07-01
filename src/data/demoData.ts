/**
 * Demo data configuration for AccentShadow
 * Provides sample recordings for first-time users
 */

export interface DemoRecording {
  name: string;
  translation: string;
  audioUrl: string;
  metadata: {
    speaker: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    category: string;
    language: string;
    description?: string;
  };
}

export interface DemoSet {
  id: string;
  name: string;
  description: string;
  language: string;
  recordings: DemoRecording[];
}

// Demo recordings using existing public audio files
export const demoRecordings: DemoRecording[] = [
  {
    name: "Path",
    translation: "A route or track between one place and another",
    audioUrl: "/path.mp3",
    metadata: {
      speaker: "Demo Speaker",
      difficulty: "beginner",
      category: "vocabulary",
      language: "en",
      description: "Practice pronouncing the word 'path'"
    }
  },
  {
    name: "Patth",
    translation: "Alternative pronunciation practice",
    audioUrl: "/patth.wav",
    metadata: {
      speaker: "Demo Speaker", 
      difficulty: "beginner",
      category: "pronunciation",
      language: "en",
      description: "Practice with different pronunciation patterns"
    }
  },
  {
    name: "Three Words",
    translation: "A phrase with three distinct words",
    audioUrl: "/test_said_three_words.wav",
    metadata: {
      speaker: "Demo Speaker",
      difficulty: "intermediate", 
      category: "phrases",
      language: "en",
      description: "Practice pronouncing a short phrase"
    }
  }
];

// Demo sets configuration
export const demoSets: DemoSet[] = [
  {
    id: "demo-english-basics",
    name: "English Pronunciation Basics",
    description: "Get started with basic English pronunciation practice. Perfect for trying out AccentShadow's features!",
    language: "en",
    recordings: demoRecordings
  }
];

// Default demo set
export const getDefaultDemoSet = (): DemoSet => demoSets[0];

// Check if audio file exists (for validation)
export const validateDemoAudio = async (audioUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(audioUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// Get available demo sets
export const getAvailableDemoSets = (): DemoSet[] => demoSets;

// Find demo set by ID
export const getDemoSetById = (id: string): DemoSet | null => {
  return demoSets.find(set => set.id === id) || null;
};