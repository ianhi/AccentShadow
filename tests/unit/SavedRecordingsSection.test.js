import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SavedRecordingsSection from '../../src/components/SavedRecordingsSection.vue'

// Mock the RecordingList component
const MockRecordingList = {
  name: 'RecordingList',
  template: '<div class="mock-recording-list">Recording List</div>',
  emits: ['load-recording', 'delete-recording']
}

describe('SavedRecordingsSection', () => {
  const createWrapper = () => {
    return mount(SavedRecordingsSection, {
      global: {
        components: {
          RecordingList: MockRecordingList
        }
      }
    })
  }

  it('renders with correct structure', () => {
    const wrapper = createWrapper()
    
    expect(wrapper.find('.saved-recordings-section').exists()).toBe(true)
    expect(wrapper.find('h2').text()).toBe('Saved Recordings')
    expect(wrapper.findComponent(MockRecordingList).exists()).toBe(true)
  })

  it('emits load-recording event when RecordingList emits it', async () => {
    const wrapper = createWrapper()
    
    const recordingList = wrapper.findComponent(MockRecordingList)
    const mockRecording = { id: '1', name: 'Test Recording' }
    
    await recordingList.vm.$emit('load-recording', mockRecording)
    
    expect(wrapper.emitted('load-recording')).toBeTruthy()
    expect(wrapper.emitted('load-recording')[0]).toEqual([mockRecording])
  })

  it('emits delete-recording event when RecordingList emits it', async () => {
    const wrapper = createWrapper()
    
    const recordingList = wrapper.findComponent(MockRecordingList)
    const recordingId = 'test-id-123'
    
    await recordingList.vm.$emit('delete-recording', recordingId)
    
    expect(wrapper.emitted('delete-recording')).toBeTruthy()
    expect(wrapper.emitted('delete-recording')[0]).toEqual([recordingId])
  })

  it('applies correct CSS classes and styling', () => {
    const wrapper = createWrapper()
    
    const section = wrapper.find('.saved-recordings-section')
    expect(section.exists()).toBe(true)
    
    const heading = wrapper.find('h2')
    expect(heading.exists()).toBe(true)
    expect(heading.text()).toBe('Saved Recordings')
  })
})