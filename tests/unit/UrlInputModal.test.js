import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UrlInputModal from '../../src/components/UrlInputModal.vue'

describe('UrlInputModal', () => {
  const createWrapper = (props = {}) => {
    return mount(UrlInputModal, {
      props: { isOpen: false, url: '', ...props }
    })
  }

  it('does not render when isOpen is false', () => {
    const wrapper = createWrapper({ isOpen: false })
    
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('renders when isOpen is true', () => {
    const wrapper = createWrapper({ isOpen: true })
    
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('.modal-content').exists()).toBe(true)
    expect(wrapper.find('h3').text()).toBe('🌐 Load Audio from URL')
    expect(wrapper.find('.url-input-modal').exists()).toBe(true)
  })

  it('syncs with url prop', async () => {
    const wrapper = createWrapper({ isOpen: true, url: 'https://example.com/audio.mp3' })
    
    const input = wrapper.find('.url-input-modal')
    expect(input.element.value).toBe('https://example.com/audio.mp3')
  })

  it('emits close when overlay clicked', async () => {
    const wrapper = createWrapper({ isOpen: true })
    
    await wrapper.find('.modal-overlay').trigger('click')
    
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('does not emit close when modal content clicked', async () => {
    const wrapper = createWrapper({ isOpen: true })
    
    await wrapper.find('.modal-content').trigger('click')
    
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('emits close when cancel button clicked', async () => {
    const wrapper = createWrapper({ isOpen: true })
    
    await wrapper.find('.cancel-btn').trigger('click')
    
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits load-url when load button clicked with valid URL', async () => {
    const wrapper = createWrapper({ isOpen: true })
    
    const input = wrapper.find('.url-input-modal')
    await input.setValue('https://example.com/audio.mp3')
    
    await wrapper.find('.load-btn').trigger('click')
    
    expect(wrapper.emitted('load-url')).toBeTruthy()
    expect(wrapper.emitted('load-url')[0]).toEqual(['https://example.com/audio.mp3'])
  })

  it('emits load-url when Enter key pressed', async () => {
    const wrapper = createWrapper({ isOpen: true })
    
    const input = wrapper.find('.url-input-modal')
    await input.setValue('https://example.com/audio.mp3')
    await input.trigger('keyup.enter')
    
    expect(wrapper.emitted('load-url')).toBeTruthy()
    expect(wrapper.emitted('load-url')[0]).toEqual(['https://example.com/audio.mp3'])
  })

  it('disables load button when URL is empty', () => {
    const wrapper = createWrapper({ isOpen: true, url: '' })
    
    const loadBtn = wrapper.find('.load-btn')
    expect(loadBtn.element.disabled).toBe(true)
  })

  it('enables load button when URL is provided', async () => {
    const wrapper = createWrapper({ isOpen: true })
    
    const input = wrapper.find('.url-input-modal')
    await input.setValue('https://example.com/audio.mp3')
    
    const loadBtn = wrapper.find('.load-btn')
    expect(loadBtn.element.disabled).toBe(false)
  })

  it('does not emit load-url when URL is empty', async () => {
    const wrapper = createWrapper({ isOpen: true })
    
    await wrapper.find('.load-btn').trigger('click')
    
    expect(wrapper.emitted('load-url')).toBeFalsy()
  })
})