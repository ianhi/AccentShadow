import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AudioColumn from '../../src/components/AudioColumn.vue'

// Mock AudioPlayer component
const MockAudioPlayer = {
  name: 'AudioPlayer',
  template: '<div class="mock-audio-player">Audio Player</div>',
  props: ['audioUrl', 'audioType', 'isRecording', 'debugInfo']
}

describe('AudioColumn', () => {
  const defaultProps = {
    title: 'Test Audio',
    audioType: 'target'
  }

  it('renders with required props', () => {
    const wrapper = mount(AudioColumn, {
      props: defaultProps,
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    expect(wrapper.find('h3').text()).toBe('Test Audio')
    expect(wrapper.find('.audio-column').exists()).toBe(true)
    expect(wrapper.find('.column-header').exists()).toBe(true)
  })

  it('validates audioType prop correctly', () => {
    // Valid audioType should work
    expect(() => {
      mount(AudioColumn, {
        props: { ...defaultProps, audioType: 'target' },
        global: { components: { AudioPlayer: MockAudioPlayer } }
      })
    }).not.toThrow()

    expect(() => {
      mount(AudioColumn, {
        props: { ...defaultProps, audioType: 'user' },
        global: { components: { AudioPlayer: MockAudioPlayer } }
      })
    }).not.toThrow()
  })

  it('renders AudioPlayer when audioUrl is provided', () => {
    const wrapper = mount(AudioColumn, {
      props: {
        ...defaultProps,
        audioUrl: 'test-audio.mp3',
        audioKey: 'test-key'
      },
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    expect(wrapper.findComponent(MockAudioPlayer).exists()).toBe(true)
    expect(wrapper.find('.placeholder').exists()).toBe(false)
  })

  it('renders placeholder when no audioUrl is provided', () => {
    const wrapper = mount(AudioColumn, {
      props: defaultProps,
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    expect(wrapper.findComponent(MockAudioPlayer).exists()).toBe(false)
    expect(wrapper.find('.placeholder').exists()).toBe(true)
    expect(wrapper.find('.placeholder').text()).toBe('No audio available')
  })

  it('displays custom default placeholder text', () => {
    const customPlaceholder = 'Please upload an audio file'
    const wrapper = mount(AudioColumn, {
      props: {
        ...defaultProps,
        defaultPlaceholder: customPlaceholder
      },
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    expect(wrapper.find('.placeholder').text()).toBe(customPlaceholder)
  })

  it('applies custom placeholder class', () => {
    const wrapper = mount(AudioColumn, {
      props: {
        ...defaultProps,
        placeholderClass: 'recording-placeholder'
      },
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    expect(wrapper.find('.placeholder').classes()).toContain('recording-placeholder')
  })

  it('applies multiple placeholder classes', () => {
    const wrapper = mount(AudioColumn, {
      props: {
        ...defaultProps,
        placeholderClass: ['recording-placeholder', 'custom-class']
      },
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    const placeholder = wrapper.find('.placeholder')
    expect(placeholder.classes()).toContain('recording-placeholder')
    expect(placeholder.classes()).toContain('custom-class')
  })

  it('renders controls slot content', () => {
    const wrapper = mount(AudioColumn, {
      props: defaultProps,
      slots: {
        controls: '<div class="test-controls">Test Controls</div>'
      },
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    expect(wrapper.find('.test-controls').exists()).toBe(true)
    expect(wrapper.find('.test-controls').text()).toBe('Test Controls')
  })

  it('renders custom placeholder slot content', () => {
    const wrapper = mount(AudioColumn, {
      props: defaultProps,
      slots: {
        placeholder: '<div class="custom-placeholder">Custom Placeholder</div>'
      },
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    expect(wrapper.find('.custom-placeholder').exists()).toBe(true)
    expect(wrapper.find('.custom-placeholder').text()).toBe('Custom Placeholder')
  })

  it('passes correct props to AudioPlayer', () => {
    const props = {
      ...defaultProps,
      audioUrl: 'test-audio.mp3',
      audioType: 'user',
      audioKey: 'test-key',
      isRecording: true,
      debugInfo: { test: 'data' }
    }
    
    const wrapper = mount(AudioColumn, {
      props,
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    const audioPlayer = wrapper.findComponent(MockAudioPlayer)
    expect(audioPlayer.props('audioUrl')).toBe('test-audio.mp3')
    expect(audioPlayer.props('audioType')).toBe('user')
    expect(audioPlayer.props('isRecording')).toBe(true)
    expect(audioPlayer.props('debugInfo')).toEqual({ test: 'data' })
  })

  it('emits audio-player-ref when setAudioPlayerRef is called with valid ref', async () => {
    const wrapper = mount(AudioColumn, {
      props: defaultProps,
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    // Test the setAudioPlayerRef method directly
    const mockRef = { play: vi.fn(), pause: vi.fn() }
    await wrapper.vm.setAudioPlayerRef(mockRef)
    
    expect(wrapper.emitted('audio-player-ref')).toBeTruthy()
    expect(wrapper.emitted('audio-player-ref')[0]).toEqual([mockRef])
  })

  it('does not emit audio-player-ref when ref is null', async () => {
    const wrapper = mount(AudioColumn, {
      props: defaultProps,
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    await wrapper.vm.setAudioPlayerRef(null)
    
    expect(wrapper.emitted('audio-player-ref')).toBeFalsy()
  })

  it('handles boolean placeholder class', () => {
    const wrapper = mount(AudioColumn, {
      props: {
        ...defaultProps,
        placeholderClass: { 'recording-placeholder': true, 'inactive': false }
      },
      global: {
        components: {
          AudioPlayer: MockAudioPlayer
        }
      }
    })
    
    const placeholder = wrapper.find('.placeholder')
    expect(placeholder.classes()).toContain('recording-placeholder')
    expect(placeholder.classes()).not.toContain('inactive')
  })
})