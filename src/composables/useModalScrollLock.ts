import { ref, onMounted, onUnmounted } from 'vue'

export function useModalScrollLock() {
  const isModalOpen = ref(false)
  let originalBodyOverflow = ''
  let originalBodyPosition = ''
  let originalBodyTop = ''
  let originalBodyWidth = ''
  let scrollTop = 0

  const lockScroll = () => {
    if (isModalOpen.value) return
    
    // Store current scroll position
    scrollTop = window.pageYOffset || document.documentElement.scrollTop
    
    // Store original body styles
    originalBodyOverflow = document.body.style.overflow
    originalBodyPosition = document.body.style.position
    originalBodyTop = document.body.style.top
    originalBodyWidth = document.body.style.width
    
    // Apply modal-open class for additional styling
    document.body.classList.add('modal-open')
    
    // Lock scroll by fixing body position
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollTop}px`
    document.body.style.width = '100%'
    
    isModalOpen.value = true
  }

  const unlockScroll = () => {
    if (!isModalOpen.value) return
    
    // Remove modal-open class
    document.body.classList.remove('modal-open')
    
    // Restore original body styles
    document.body.style.overflow = originalBodyOverflow
    document.body.style.position = originalBodyPosition
    document.body.style.top = originalBodyTop
    document.body.style.width = originalBodyWidth
    
    // Restore scroll position
    window.scrollTo(0, scrollTop)
    
    isModalOpen.value = false
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (isModalOpen.value) {
      unlockScroll()
    }
  })

  return {
    isModalOpen,
    lockScroll,
    unlockScroll
  }
}