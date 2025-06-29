import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpeedControl from '../../src/components/SpeedControl.vue'

describe('SpeedControl', () => {
  it('renders speed control when enabled is true', () => {
    const wrapper = mount(SpeedControl, {
      props: { enabled: true, speed: 1.0 }
    })
    
    expect(wrapper.find('.speed-control-section').exists()).toBe(true)
    expect(wrapper.find('.speed-label').text()).toContain('Playback Speed')
    expect(wrapper.find('.speed-display').text()).toBe('1x')
    expect(wrapper.find('.speed-slider').element.disabled).toBe(false)
  })

  it('renders but disables control when enabled is false', () => {
    const wrapper = mount(SpeedControl, {
      props: { enabled: false }
    })
    
    expect(wrapper.find('.speed-control-section').exists()).toBe(true)
    expect(wrapper.find('.speed-slider').element.disabled).toBe(true)
    expect(wrapper.find('.speed-label').classes()).toContain('disabled')
    expect(wrapper.find('.speed-display').classes()).toContain('disabled')
  })

  it('displays the correct speed value', () => {
    const wrapper = mount(SpeedControl, {
      props: { speed: 1.5 }
    })
    
    expect(wrapper.find('.speed-display').text()).toBe('1.5x')
    expect(wrapper.find('.speed-slider').element.value).toBe('1.5')
  })

  it('handles different speed values correctly', () => {
    const testCases = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]
    
    testCases.forEach(speed => {
      const wrapper = mount(SpeedControl, {
        props: { speed }
      })
      
      expect(wrapper.find('.speed-display').text()).toBe(`${speed}x`)
      expect(wrapper.find('.speed-slider').element.value).toBe(speed.toString())
    })
  })

  it('emits speed-change event when slider is moved', async () => {
    const wrapper = mount(SpeedControl, {
      props: { speed: 1.0 }
    })
    
    const slider = wrapper.find('.speed-slider')
    slider.element.value = '1.5'
    await slider.trigger('input')
    
    expect(wrapper.emitted('speed-change')).toBeTruthy()
    expect(wrapper.emitted('speed-change')[0]).toEqual([1.5])
  })

  it('has correct slider attributes', () => {
    const wrapper = mount(SpeedControl)
    const slider = wrapper.find('.speed-slider')
    
    expect(slider.attributes('min')).toBe('0.25')
    expect(slider.attributes('max')).toBe('2')
    expect(slider.attributes('step')).toBe('0.25')
    expect(slider.attributes('type')).toBe('range')
  })

  it('emits multiple speed changes correctly', async () => {
    const wrapper = mount(SpeedControl)
    const slider = wrapper.find('.speed-slider')
    
    // First change
    slider.element.value = '0.5'
    await slider.trigger('input')
    
    // Second change
    slider.element.value = '2'
    await slider.trigger('input')
    
    expect(wrapper.emitted('speed-change')).toHaveLength(2)
    expect(wrapper.emitted('speed-change')[0]).toEqual([0.5])
    expect(wrapper.emitted('speed-change')[1]).toEqual([2])
  })

  it('does not emit speed-change when disabled', async () => {
    const wrapper = mount(SpeedControl, {
      props: { enabled: false }
    })
    
    const slider = wrapper.find('.speed-slider')
    slider.element.value = '1.5'
    await slider.trigger('input')
    
    expect(wrapper.emitted('speed-change')).toBeFalsy()
  })

  it('uses default values correctly', () => {
    const wrapper = mount(SpeedControl)
    
    expect(wrapper.find('.speed-control-section').exists()).toBe(true)
    expect(wrapper.find('.speed-display').text()).toBe('1x')
    expect(wrapper.find('.speed-slider').element.value).toBe('1')
    expect(wrapper.find('.speed-slider').element.disabled).toBe(false)
  })
})