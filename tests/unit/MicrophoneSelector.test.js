import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MicrophoneSelector from '../../src/components/MicrophoneSelector.vue'

describe('MicrophoneSelector', () => {
  const mockDevices = [
    { deviceId: 'default', label: 'Default Microphone' },
    { deviceId: 'device1', label: 'External USB Microphone' },
    { deviceId: 'device2', label: 'Bluetooth Headset' }
  ]

  it('renders when multiple devices are available and not disabled', () => {
    const wrapper = mount(MicrophoneSelector, {
      props: { 
        availableDevices: mockDevices, 
        selectedDeviceId: 'default',
        disabled: false 
      }
    })
    
    expect(wrapper.find('.microphone-selection').exists()).toBe(true)
    expect(wrapper.find('.mic-label').text()).toContain('Microphone')
    expect(wrapper.find('.mic-dropdown').exists()).toBe(true)
  })

  it('does not render when only one device is available', () => {
    const wrapper = mount(MicrophoneSelector, {
      props: { 
        availableDevices: [mockDevices[0]],
        disabled: false 
      }
    })
    
    expect(wrapper.find('.microphone-selection').exists()).toBe(false)
  })

  it('does not render when disabled', () => {
    const wrapper = mount(MicrophoneSelector, {
      props: { 
        availableDevices: mockDevices,
        disabled: true 
      }
    })
    
    expect(wrapper.find('.microphone-selection').exists()).toBe(false)
  })

  it('does not render when no devices are available', () => {
    const wrapper = mount(MicrophoneSelector, {
      props: { 
        availableDevices: [],
        disabled: false 
      }
    })
    
    expect(wrapper.find('.microphone-selection').exists()).toBe(false)
  })

  it('displays all available devices as options', () => {
    const wrapper = mount(MicrophoneSelector, {
      props: { 
        availableDevices: mockDevices,
        selectedDeviceId: 'default'
      }
    })
    
    const options = wrapper.findAll('option')
    expect(options).toHaveLength(3)
    expect(options[0].text()).toBe('Default Microphone')
    expect(options[1].text()).toBe('External USB Microphone')
    expect(options[2].text()).toBe('Bluetooth Headset')
  })

  it('shows the correct selected device', () => {
    const wrapper = mount(MicrophoneSelector, {
      props: { 
        availableDevices: mockDevices,
        selectedDeviceId: 'device1'
      }
    })
    
    expect(wrapper.find('.mic-dropdown').element.value).toBe('device1')
  })

  it('emits device-change event when selection changes', async () => {
    const wrapper = mount(MicrophoneSelector, {
      props: { 
        availableDevices: mockDevices,
        selectedDeviceId: 'default'
      }
    })
    
    const dropdown = wrapper.find('.mic-dropdown')
    await dropdown.setValue('device2')
    
    expect(wrapper.emitted('device-change')).toBeTruthy()
    expect(wrapper.emitted('device-change')[0]).toEqual(['device2'])
  })

  it('handles disabled state correctly', () => {
    // Test enabled state
    const enabledWrapper = mount(MicrophoneSelector, {
      props: { 
        availableDevices: mockDevices,
        selectedDeviceId: 'default',
        disabled: false
      }
    })
    
    expect(enabledWrapper.find('.microphone-selection').exists()).toBe(true)
    expect(enabledWrapper.find('.mic-dropdown').element.disabled).toBe(false)
    
    // Test disabled state - component should not render
    const disabledWrapper = mount(MicrophoneSelector, {
      props: { 
        availableDevices: mockDevices,
        selectedDeviceId: 'default',
        disabled: true
      }
    })
    
    expect(disabledWrapper.find('.microphone-selection').exists()).toBe(false)
  })

  it('handles empty device labels gracefully', () => {
    const devicesWithEmptyLabel = [
      { deviceId: 'default', label: 'Default Microphone' },
      { deviceId: 'device1', label: '' },
      { deviceId: 'device2', label: 'Bluetooth Headset' }
    ]
    
    const wrapper = mount(MicrophoneSelector, {
      props: { 
        availableDevices: devicesWithEmptyLabel,
        selectedDeviceId: 'default'
      }
    })
    
    const options = wrapper.findAll('option')
    expect(options).toHaveLength(3)
    expect(options[1].text()).toBe('') // Empty label should render as empty
  })

  it('uses default values when no props provided', () => {
    const wrapper = mount(MicrophoneSelector)
    
    // Should not render with default empty devices array
    expect(wrapper.find('.microphone-selection').exists()).toBe(false)
  })
})