import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { usePlaybackControls } from '../../src/composables/usePlaybackControls'

describe('usePlaybackControls', () => {
  let mockAppState
  let mockTargetAudioElement
  let mockUserAudioElement

  beforeEach(() => {
    // Create mock audio elements that behave like real DOM audio elements
    mockTargetAudioElement = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      currentTime: 0,
      playbackRate: 1
    }

    mockUserAudioElement = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      currentTime: 0,
      playbackRate: 1
    }

    // Create mock Vue component refs that have audioElement property
    const mockTargetPlayerRef = {
      audioElement: mockTargetAudioElement
    }

    const mockUserPlayerRef = {
      audioElement: mockUserAudioElement
    }

    mockAppState = {
      targetAudioPlayerRef: ref(mockTargetPlayerRef),
      userAudioPlayerRef: ref(mockUserPlayerRef),
      globalPlaybackSpeed: ref(1),
      updatePlaybackSpeed: vi.fn((speed) => {
        mockAppState.globalPlaybackSpeed.value = speed
      })
    }
  })

  describe('stopAll', () => {
    it('should call pause and reset currentTime on audio elements', () => {
      const { stopAll } = usePlaybackControls(mockAppState)

      stopAll()

      expect(mockTargetAudioElement.pause).toHaveBeenCalled()
      expect(mockTargetAudioElement.currentTime).toBe(0)
      expect(mockUserAudioElement.pause).toHaveBeenCalled()
      expect(mockUserAudioElement.currentTime).toBe(0)
    })

    it('should handle missing audio player refs gracefully', () => {
      const appStateWithNullRefs = {
        ...mockAppState,
        targetAudioPlayerRef: ref(null),
        userAudioPlayerRef: ref(null)
      }

      const { stopAll } = usePlaybackControls(appStateWithNullRefs)

      // Should not throw an error
      expect(() => stopAll()).not.toThrow()
    })

    it('should handle audio player refs without audioElement property', () => {
      const appStateWithInvalidRefs = {
        ...mockAppState,
        targetAudioPlayerRef: ref({}), // Missing audioElement
        userAudioPlayerRef: ref({})    // Missing audioElement
      }

      const { stopAll } = usePlaybackControls(appStateWithInvalidRefs)

      // Should not throw an error
      expect(() => stopAll()).not.toThrow()
    })
  })

  describe('playTarget', () => {
    it('should call play on target audio element with correct playback rate', async () => {
      mockAppState.globalPlaybackSpeed.value = 1.5
      const { playTarget } = usePlaybackControls(mockAppState)

      await playTarget()

      expect(mockTargetAudioElement.playbackRate).toBe(1.5)
      expect(mockTargetAudioElement.play).toHaveBeenCalled()
    })

    it('should handle missing target audio player gracefully', async () => {
      const appStateWithNullTarget = {
        ...mockAppState,
        targetAudioPlayerRef: ref(null)
      }

      const { playTarget } = usePlaybackControls(appStateWithNullTarget)

      // Should not throw an error
      await expect(playTarget()).resolves.not.toThrow()
    })
  })

  describe('playOverlapping', () => {
    it('should play both audio elements without stopping when no previous playback', async () => {
      const { playOverlapping } = usePlaybackControls(mockAppState)

      await playOverlapping()

      // Should NOT have paused (no previous playback), but should play both
      expect(mockTargetAudioElement.pause).not.toHaveBeenCalled()
      expect(mockUserAudioElement.pause).not.toHaveBeenCalled()
      expect(mockTargetAudioElement.play).toHaveBeenCalled()
      expect(mockUserAudioElement.play).toHaveBeenCalled()
    })

    it('should stop previous playback when switching between different playback types', async () => {
      const { playTarget, playOverlapping } = usePlaybackControls(mockAppState)

      // Start target playback first
      await playTarget()
      
      // Reset mock calls to check what happens next
      mockTargetAudioElement.pause.mockClear()
      mockUserAudioElement.pause.mockClear()
      mockTargetAudioElement.play.mockClear()
      mockUserAudioElement.play.mockClear()

      // Now play overlapping - should stop previous target playback
      await playOverlapping()

      // Should have stopped previous playback, then started new one
      expect(mockTargetAudioElement.pause).toHaveBeenCalled()
      expect(mockUserAudioElement.pause).toHaveBeenCalled()
      expect(mockTargetAudioElement.play).toHaveBeenCalled()
      expect(mockUserAudioElement.play).toHaveBeenCalled()
    })

    it('should set correct playback rate on both elements', async () => {
      mockAppState.globalPlaybackSpeed.value = 0.75
      const { playOverlapping } = usePlaybackControls(mockAppState)

      await playOverlapping()

      expect(mockTargetAudioElement.playbackRate).toBe(0.75)
      expect(mockUserAudioElement.playbackRate).toBe(0.75)
    })

    it('should handle missing audio players gracefully', async () => {
      const appStateWithNullRefs = {
        ...mockAppState,
        targetAudioPlayerRef: ref(null),
        userAudioPlayerRef: ref(null)
      }

      const { playOverlapping } = usePlaybackControls(appStateWithNullRefs)

      // Should not throw an error
      await expect(playOverlapping()).resolves.not.toThrow()
    })
  })

  describe('updatePlaybackSpeed', () => {
    it('should update global speed and apply to both audio elements', () => {
      const { updatePlaybackSpeed } = usePlaybackControls(mockAppState)

      updatePlaybackSpeed(2.0)

      expect(mockAppState.updatePlaybackSpeed).toHaveBeenCalledWith(2.0)
      expect(mockTargetAudioElement.playbackRate).toBe(2.0)
      expect(mockUserAudioElement.playbackRate).toBe(2.0)
    })

    it('should handle missing audio elements gracefully', () => {
      const appStateWithNullRefs = {
        ...mockAppState,
        targetAudioPlayerRef: ref(null),
        userAudioPlayerRef: ref(null)
      }

      const { updatePlaybackSpeed } = usePlaybackControls(appStateWithNullRefs)

      // Should not throw an error
      expect(() => updatePlaybackSpeed(1.5)).not.toThrow()
      expect(mockAppState.updatePlaybackSpeed).toHaveBeenCalledWith(1.5)
    })
  })
})