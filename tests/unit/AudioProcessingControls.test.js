import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AudioProcessingControls from '../../src/components/AudioProcessingControls.vue'

describe('AudioProcessingControls', () => {
  const defaultProps = {
    autoPlayBoth: true,
    autoAlignEnabled: true,
    vadReady: true,
    hasTargetAudio: false,
    hasUserAudio: false,
    isProcessing: false,
    sequentialDelay: 0
  }

  const createWrapper = (props = {}) => {
    return mount(AudioProcessingControls, {
      props: { ...defaultProps, ...props }
    })
  }

  it('renders with default props', () => {
    const wrapper = createWrapper()
    
    expect(wrapper.find('.audio-processing-controls').exists()).toBe(true)
    expect(wrapper.find('.auto-play-toggle').exists()).toBe(true)
    expect(wrapper.find('.trim-silence-toggle').exists()).toBe(true)
    expect(wrapper.find('.align-btn').exists()).toBe(true)
    expect(wrapper.find('.settings-btn').exists()).toBe(true)
    expect(wrapper.find('.sequential-delay-control').exists()).toBe(true)
  })

  it('displays correct checkbox states', () => {
    const wrapper = createWrapper({
      autoPlayBoth: false,
      autoAlignEnabled: false
    })
    
    const autoPlayCheckbox = wrapper.find('.auto-play-toggle input')
    const autoAlignCheckbox = wrapper.find('.trim-silence-toggle input')
    
    expect(autoPlayCheckbox.element.checked).toBe(false)
    expect(autoAlignCheckbox.element.checked).toBe(false)
  })

  it('shows VAD ready status in trim silence label', () => {
    const wrapper = createWrapper({ vadReady: true })
    
    const trimLabel = wrapper.find('.trim-silence-toggle')
    expect(trimLabel.text()).toContain('✂️ Trim Silence (VAD)')
  })

  it('shows fallback trim silence label when VAD not ready', () => {
    const wrapper = createWrapper({ vadReady: false })
    
    const trimLabel = wrapper.find('.trim-silence-toggle')
    expect(trimLabel.text()).toContain('✂️ Trim Silence')
    expect(trimLabel.text()).not.toContain('(VAD)')
  })

  it('disables align button when no audio available', () => {
    const wrapper = createWrapper({
      hasTargetAudio: false,
      hasUserAudio: false
    })
    
    const alignBtn = wrapper.find('.align-btn')
    expect(alignBtn.element.disabled).toBe(true)
  })

  it('enables align button when both audios available', () => {
    const wrapper = createWrapper({
      hasTargetAudio: true,
      hasUserAudio: true
    })
    
    const alignBtn = wrapper.find('.align-btn')
    expect(alignBtn.element.disabled).toBe(false)
  })

  it('shows processing state on align button', () => {
    const wrapper = createWrapper({ isProcessing: true })
    
    const alignBtn = wrapper.find('.align-btn')
    expect(alignBtn.text()).toContain('🔄 Trimming...')
    expect(alignBtn.classes()).toContain('processing')
  })

  it('shows default state on align button', () => {
    const wrapper = createWrapper({ isProcessing: false })
    
    const alignBtn = wrapper.find('.align-btn')
    expect(alignBtn.text()).toContain('✂️ Trim Now')
    expect(alignBtn.classes()).not.toContain('processing')
  })

  it('displays sequential delay value', () => {
    const wrapper = createWrapper({ sequentialDelay: 500 })
    
    const delayDisplay = wrapper.find('.delay-display')
    const delaySlider = wrapper.find('.delay-slider')
    
    expect(delayDisplay.text()).toBe('500ms')
    expect(delaySlider.element.value).toBe('500')
  })

  it('emits toggle-auto-play when checkbox changes', async () => {
    const wrapper = createWrapper()
    
    const autoPlayCheckbox = wrapper.find('.auto-play-toggle input')
    await autoPlayCheckbox.trigger('change')
    
    expect(wrapper.emitted('toggle-auto-play')).toBeTruthy()
  })

  it('emits toggle-auto-align when checkbox changes', async () => {
    const wrapper = createWrapper()
    
    const autoAlignCheckbox = wrapper.find('.trim-silence-toggle input')
    await autoAlignCheckbox.trigger('change')
    
    expect(wrapper.emitted('toggle-auto-align')).toBeTruthy()
  })

  it('emits manual-align when button clicked', async () => {
    const wrapper = createWrapper({
      hasTargetAudio: true,
      hasUserAudio: true
    })
    
    const alignBtn = wrapper.find('.align-btn')
    await alignBtn.trigger('click')
    
    expect(wrapper.emitted('manual-align')).toBeTruthy()
  })

  it('emits show-vad-settings when settings button clicked', async () => {
    const wrapper = createWrapper()
    
    const settingsBtn = wrapper.find('.settings-btn')
    await settingsBtn.trigger('click')
    
    expect(wrapper.emitted('show-vad-settings')).toBeTruthy()
  })

  it('emits update-sequential-delay when slider changes', async () => {
    const wrapper = createWrapper()
    
    const delaySlider = wrapper.find('.delay-slider')
    await delaySlider.trigger('input')
    
    expect(wrapper.emitted('update-sequential-delay')).toBeTruthy()
  })

  it('applies responsive styles', () => {
    const wrapper = createWrapper()
    
    expect(wrapper.find('.alignment-controls').exists()).toBe(true)
    expect(wrapper.find('.sequential-delay-control').exists()).toBe(true)
  })
})