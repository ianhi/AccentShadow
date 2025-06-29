import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AudioVisualizationPanel from '../../src/components/AudioVisualizationPanel.vue'

// Mock child components
const MockAudioColumn = {
  name: 'AudioColumn',
  template: '<div class="mock-audio-column">{{ title }}</div>',
  props: ['title', 'audioUrl', 'audioType', 'audioKey', 'debugInfo', 'isRecording', 'placeholderClass'],
  emits: ['audio-player-ref']
}

const MockTargetAudioControls = {
  name: 'TargetAudioControls',
  template: '<div class="mock-target-controls">Target Controls</div>',
  props: ['currentAudioSource'],
  emits: ['browse-file', 'load-url']
}

// Mock composables
vi.mock('../../src/composables/useSmartAudioAlignment', () => ({
  useSmartAudioAlignment: () => ({
    isProcessing: { value: false },
    vadReady: { value: true },
    processAudio: vi.fn(),
    normalizeAudioSilence: vi.fn(),
    alignTwoAudios: vi.fn()
  })
}))

vi.mock('../../src/composables/useTimeSync.ts', () => ({
  useTimeSync: () => ({
    syncEnabled: { value: false }
  })
}))

vi.mock('../../src/composables/useAudioManager.ts', () => ({
  audioManager: {
    emergencyStop: vi.fn()
  }
}))

describe('AudioVisualizationPanel', () => {
  let wrapper
  
  const defaultProps = {
    currentRecording: null,
    isRecording: false,
    vadSettings: {
      padding: 0.2,
      threshold: 0.25,
      minSpeechDuration: 50,
      maxSilenceDuration: 500,
      maxTrimStart: 3.0,
      maxTrimEnd: 2.0
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createWrapper = (props = {}) => {
    return mount(AudioVisualizationPanel, {
      props: { ...defaultProps, ...props },
      global: {
        components: {
          AudioColumn: MockAudioColumn,
          TargetAudioControls: MockTargetAudioControls
        }
      }
    })
  }

  it('renders with default props', () => {
    wrapper = createWrapper()
    
    expect(wrapper.find('.audio-visualization-panel').exists()).toBe(true)
    expect(wrapper.find('.target-controls-section').exists()).toBe(true)
    expect(wrapper.find('.visualization-container').exists()).toBe(true)
  })

  it('renders target audio controls section with correct title', () => {
    wrapper = createWrapper()
    
    const targetSection = wrapper.find('.target-controls-section')
    expect(targetSection.exists()).toBe(true)
    expect(targetSection.find('h3').text()).toBe('📁 Load Target Audio')
    expect(targetSection.findComponent(MockTargetAudioControls).exists()).toBe(true)
  })

  it('renders both audio columns in visualization container', () => {
    wrapper = createWrapper()
    
    const columns = wrapper.findAllComponents(MockAudioColumn)
    expect(columns).toHaveLength(2)
    
    // Check target audio column
    expect(columns[0].props('title')).toBe('Target Audio')
    expect(columns[0].props('audioType')).toBe('target')
    
    // Check user recording column
    expect(columns[1].props('title')).toBe('User Recording')
    expect(columns[1].props('audioType')).toBe('user')
  })

  it('passes recording state to user audio column', () => {
    wrapper = createWrapper({ isRecording: true })
    
    const userColumn = wrapper.findAllComponents(MockAudioColumn)[1]
    expect(userColumn.props('isRecording')).toBe(true)
  })

  it('renders audio visualization without bottom controls (moved to parent)', () => {
    wrapper = createWrapper()
    
    // These controls are now in PracticeView, not in AudioVisualizationPanel
    expect(wrapper.find('.bottom-controls').exists()).toBe(false)
    expect(wrapper.find('.auto-play-toggle').exists()).toBe(false)
    expect(wrapper.find('.trim-silence-toggle').exists()).toBe(false)
    expect(wrapper.find('.align-btn').exists()).toBe(false)
    expect(wrapper.find('.settings-btn').exists()).toBe(false)
    expect(wrapper.find('.sequential-delay-control').exists()).toBe(false)
  })

  it('emits browse-file event when target controls emit it', async () => {
    wrapper = createWrapper()
    
    const targetControls = wrapper.findComponent(MockTargetAudioControls)
    await targetControls.vm.$emit('browse-file')
    
    expect(wrapper.emitted('browse-file')).toBeTruthy()
  })

  it('emits load-url event when target controls emit it', async () => {
    wrapper = createWrapper()
    
    const targetControls = wrapper.findComponent(MockTargetAudioControls)
    await targetControls.vm.$emit('load-url')
    
    expect(wrapper.emitted('load-url')).toBeTruthy()
  })

  it('does not emit show-vad-settings directly (handled by parent)', async () => {
    wrapper = createWrapper()
    
    // VAD settings button is now in the parent component
    expect(wrapper.find('.settings-btn').exists()).toBe(false)
  })

  it('shows correct placeholder for target audio when no recording', () => {
    wrapper = createWrapper({ currentRecording: null })
    
    const targetColumn = wrapper.findAllComponents(MockAudioColumn)[0]
    // The placeholder content is passed via slot, so we check the props
    expect(wrapper.text()).toContain('Please upload a target audio file or load from URL.')
  })

  it('shows correct placeholder for target audio when recording exists', () => {
    const mockRecording = { id: '1', name: 'Test Recording' }
    wrapper = createWrapper({ currentRecording: mockRecording })
    
    expect(wrapper.text()).toContain('Select a recording from the set')
  })

  it('shows recording indicator for user audio when recording', () => {
    wrapper = createWrapper({ isRecording: true })
    
    expect(wrapper.text()).toContain('🔴 Recording in progress...')
  })

  it('shows default placeholder for user audio when not recording', () => {
    wrapper = createWrapper({ isRecording: false })
    
    expect(wrapper.text()).toContain('Record your audio.')
  })

  it('handles audio player refs from target column', async () => {
    wrapper = createWrapper()
    
    const mockRef = { play: vi.fn(), pause: vi.fn() }
    const targetColumn = wrapper.findAllComponents(MockAudioColumn)[0]
    
    await targetColumn.vm.$emit('audio-player-ref', mockRef)
    
    expect(wrapper.emitted('target-audio-ref')).toBeTruthy()
    expect(wrapper.emitted('target-audio-ref')[0]).toEqual([mockRef])
  })

  it('handles audio player refs from user column', async () => {
    wrapper = createWrapper()
    
    const mockRef = { play: vi.fn(), pause: vi.fn() }
    const userColumn = wrapper.findAllComponents(MockAudioColumn)[1]
    
    await userColumn.vm.$emit('audio-player-ref', mockRef)
    
    expect(wrapper.emitted('user-audio-ref')).toBeTruthy()
    expect(wrapper.emitted('user-audio-ref')[0]).toEqual([mockRef])
  })

  it('does not contain VAD controls (moved to parent)', () => {
    wrapper = createWrapper()
    
    // VAD controls are now in PracticeView, not AudioVisualizationPanel
    expect(wrapper.find('.trim-silence-toggle').exists()).toBe(false)
  })

  it('passes current audio source to target controls', async () => {
    wrapper = createWrapper()
    
    // Set audio source via component's internal state
    wrapper.vm.currentAudioSource = 'test-audio.mp3'
    await wrapper.vm.$nextTick() // Wait for reactivity to update
    
    const targetControls = wrapper.findComponent(MockTargetAudioControls)
    expect(targetControls.props('currentAudioSource')).toBe('test-audio.mp3')
  })

  it('exposes expected methods via defineExpose', () => {
    wrapper = createWrapper()
    
    // Check that key methods are exposed
    expect(typeof wrapper.vm.setTargetAudio).toBe('function')
    expect(typeof wrapper.vm.processUserAudio).toBe('function')
    expect(typeof wrapper.vm.manualAlign).toBe('function')
    expect(typeof wrapper.vm.getTargetBlob).toBe('function')
    expect(typeof wrapper.vm.getUserBlob).toBe('function')
    expect(typeof wrapper.vm.getTargetUrl).toBe('function')
    expect(typeof wrapper.vm.getUserUrl).toBe('function')
  })

  it('applies responsive styles on mobile screens', () => {
    wrapper = createWrapper()
    
    const panel = wrapper.find('.audio-visualization-panel')
    expect(panel.exists()).toBe(true)
    
    // Check that CSS classes exist for responsive behavior
    const visualizationContainer = wrapper.find('.visualization-container')
    expect(visualizationContainer.exists()).toBe(true)
  })
})