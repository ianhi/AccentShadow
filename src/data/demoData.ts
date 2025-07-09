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
    name: "পথ (Path)",
    translation: "Path - A route or way",
    audioUrl: "/language-learning/accent-shadow/path.mp3",
    metadata: {
      speaker: "Demo Speaker",
      difficulty: "beginner",
      category: "vocabulary",
      language: "bn",
      description: "Practice pronouncing the Bengali word 'পথ' (path)"
    }
  },
  {
    name: "পাঠ (Patth)",
    translation: "Lesson or reading",
    audioUrl: "/language-learning/accent-shadow/patth.wav",
    metadata: {
      speaker: "Demo Speaker", 
      difficulty: "beginner",
      category: "pronunciation",
      language: "bn",
      description: "Practice pronouncing 'পাঠ' with aspiration"
    }
  },
  {
    name: "তিনটি শব্দ",
    translation: "Three words - a phrase practice",
    audioUrl: "/language-learning/accent-shadow/test_said_three_words.wav",
    metadata: {
      speaker: "Demo Speaker",
      difficulty: "intermediate", 
      category: "phrases",
      language: "bn",
      description: "Practice pronouncing a Bengali phrase"
    }
  }
];

// Demo sets configuration
export const demoSets: DemoSet[] = [
  {
    id: "demo-bangla-basics",
    name: "Bangla Pronunciation Basics",
    description: "Get started with basic Bangla pronunciation practice. Perfect for trying out AccentShadow's features!",
    language: "bn",
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