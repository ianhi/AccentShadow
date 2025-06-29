import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TargetAudioControls from '../../src/components/TargetAudioControls.vue'

describe('TargetAudioControls', () => {
  it('renders placeholder text when no audio source is provided', () => {
    const wrapper = mount(TargetAudioControls)
    
    expect(wrapper.find('.placeholder-text').exists()).toBe(true)
    expect(wrapper.find('.placeholder-text').text()).toBe('No audio selected')
    expect(wrapper.find('.current-source').exists()).toBe(false)
  })

  it('displays current audio source when provided', () => {
    const audioSource = 'example-audio.mp3'
    const wrapper = mount(TargetAudioControls, {
      props: { currentAudioSource: audioSource }
    })
    
    expect(wrapper.find('.current-source').exists()).toBe(true)
    expect(wrapper.find('.current-source').text()).toBe(audioSource)
    expect(wrapper.find('.placeholder-text').exists()).toBe(false)
  })

  it('renders both action buttons', () => {
    const wrapper = mount(TargetAudioControls)
    
    const fileBtn = wrapper.find('.file-btn')
    const urlBtn = wrapper.find('.url-btn')
    
    expect(fileBtn.exists()).toBe(true)
    expect(urlBtn.exists()).toBe(true)
    expect(fileBtn.text()).toContain('Browse File')
    expect(urlBtn.text()).toContain('Load URL')
  })

  it('emits browse-file event when file button is clicked', async () => {
    const wrapper = mount(TargetAudioControls)
    
    await wrapper.find('.file-btn').trigger('click')
    
    expect(wrapper.emitted('browse-file')).toBeTruthy()
    expect(wrapper.emitted('browse-file')).toHaveLength(1)
  })

  it('emits load-url event when URL button is clicked', async () => {
    const wrapper = mount(TargetAudioControls)
    
    await wrapper.find('.url-btn').trigger('click')
    
    expect(wrapper.emitted('load-url')).toBeTruthy()
    expect(wrapper.emitted('load-url')).toHaveLength(1)
  })

  it('displays long filenames correctly', () => {
    const longFilename = 'this-is-a-very-long-audio-filename-that-might-break-layout.mp3'
    const wrapper = mount(TargetAudioControls, {
      props: { currentAudioSource: longFilename }
    })
    
    expect(wrapper.find('.current-source').text()).toBe(longFilename)
  })

  it('handles empty string as no audio source', () => {
    const wrapper = mount(TargetAudioControls, {
      props: { currentAudioSource: '' }
    })
    
    expect(wrapper.find('.placeholder-text').exists()).toBe(true)
    expect(wrapper.find('.current-source').exists()).toBe(false)
  })
})