import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlaybackControls from '../../src/components/PlaybackControls.vue'

describe('PlaybackControls', () => {
  it('renders all playback buttons', () => {
    const wrapper = mount(PlaybackControls)
    
    expect(wrapper.find('.target-btn').text()).toContain('Play Target')
    expect(wrapper.find('.user-btn').text()).toContain('Play Recording')
    expect(wrapper.find('.overlapping-btn').text()).toContain('Play Overlapping')
    expect(wrapper.find('.sequential-btn').text()).toContain('Play Sequential')
    expect(wrapper.find('.stop-btn').text()).toContain('Stop All')
  })

  it('disables target button when hasTargetAudio is false', () => {
    const wrapper = mount(PlaybackControls, {
      props: { hasTargetAudio: false, hasUserAudio: true }
    })
    
    expect(wrapper.find('.target-btn').element.disabled).toBe(true)
    expect(wrapper.find('.user-btn').element.disabled).toBe(false)
  })

  it('disables user button when hasUserAudio is false', () => {
    const wrapper = mount(PlaybackControls, {
      props: { hasTargetAudio: true, hasUserAudio: false }
    })
    
    expect(wrapper.find('.target-btn').element.disabled).toBe(false)
    expect(wrapper.find('.user-btn').element.disabled).toBe(true)
  })

  it('disables overlapping and sequential buttons when either audio is missing', () => {
    const wrapper = mount(PlaybackControls, {
      props: { hasTargetAudio: false, hasUserAudio: true }
    })
    
    expect(wrapper.find('.overlapping-btn').element.disabled).toBe(true)
    expect(wrapper.find('.sequential-btn').element.disabled).toBe(true)
  })

  it('enables overlapping and sequential buttons when both audios are present', () => {
    const wrapper = mount(PlaybackControls, {
      props: { hasTargetAudio: true, hasUserAudio: true }
    })
    
    expect(wrapper.find('.overlapping-btn').element.disabled).toBe(false)
    expect(wrapper.find('.sequential-btn').element.disabled).toBe(false)
  })

  it('stop button is never disabled', () => {
    const wrapper = mount(PlaybackControls, {
      props: { hasTargetAudio: false, hasUserAudio: false }
    })
    
    expect(wrapper.find('.stop-btn').element.disabled).toBe(false)
  })

  it('emits correct events when buttons are clicked', async () => {
    const wrapper = mount(PlaybackControls, {
      props: { hasTargetAudio: true, hasUserAudio: true }
    })
    
    await wrapper.find('.target-btn').trigger('click')
    expect(wrapper.emitted('play-target')).toBeTruthy()
    
    await wrapper.find('.user-btn').trigger('click')
    expect(wrapper.emitted('play-user')).toBeTruthy()
    
    await wrapper.find('.overlapping-btn').trigger('click')
    expect(wrapper.emitted('play-overlapping')).toBeTruthy()
    
    await wrapper.find('.sequential-btn').trigger('click')
    expect(wrapper.emitted('play-sequential')).toBeTruthy()
    
    await wrapper.find('.stop-btn').trigger('click')
    expect(wrapper.emitted('stop-all')).toBeTruthy()
  })
})