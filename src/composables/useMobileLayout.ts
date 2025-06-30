import { ref, computed } from 'vue'
import { useViewport } from './useViewport'

export type MobileTab = 'sets' | 'saved' | 'settings'

export interface MobileLayoutState {
  activeTab: MobileTab | null
  showSidebar: boolean
  showModal: boolean
  modalContent: string | null
}

export function useMobileLayout() {
  const { shouldUseMobileLayout } = useViewport()
  
  // Mobile layout state
  const activeTab = ref<MobileTab | null>(null)
  const showSidebar = ref(false)
  const showModal = ref(false)
  const modalContent = ref<string | null>(null)
  
  // Computed layout state
  const layoutState = computed<MobileLayoutState>(() => ({
    activeTab: activeTab.value,
    showSidebar: showSidebar.value,
    showModal: showModal.value,
    modalContent: modalContent.value
  }))

  // Tab navigation methods
  const openTab = (tab: MobileTab) => {
    activeTab.value = tab
    
    switch (tab) {
      case 'sets':
        showSidebar.value = true
        break
      case 'saved':
        showModal.value = true
        modalContent.value = 'saved-recordings'
        break
      case 'settings':
        showModal.value = true
        modalContent.value = 'settings'
        break
    }
  }

  const closeTab = () => {
    activeTab.value = null
    showSidebar.value = false
    showModal.value = false
    modalContent.value = null
  }

  // Sidebar methods
  const toggleSidebar = () => {
    if (showSidebar.value) {
      closeSidebar()
    } else {
      openTab('sets')
    }
  }

  const closeSidebar = () => {
    showSidebar.value = false
    if (activeTab.value === 'sets') {
      activeTab.value = null
    }
  }

  // Modal methods
  const openModal = (content: string) => {
    showModal.value = true
    modalContent.value = content
  }

  const closeModal = () => {
    showModal.value = false
    modalContent.value = null
    if (activeTab.value === 'saved' || activeTab.value === 'settings') {
      activeTab.value = null
    }
  }

  // Component visibility helpers for mobile layout
  const shouldShowComponent = (componentName: string): boolean => {
    if (!shouldUseMobileLayout.value) {
      // Desktop: show all components
      return true
    }
    
    // Mobile: only show core components
    const mobileVisibleComponents = [
      'MainHeader',
      'AudioVisualizationPanel', 
      'CentralPlaybackControls',
      'MobileBottomNav'
    ]
    
    return mobileVisibleComponents.includes(componentName)
  }

  const shouldShowInModal = (componentName: string): boolean => {
    if (!shouldUseMobileLayout.value) return false
    
    const modalComponents = [
      'SavedRecordingsSection',
      'AudioProcessingControls',
      'SessionStats'
    ]
    
    return modalComponents.includes(componentName)
  }

  const shouldShowInSidebar = (componentName: string): boolean => {
    if (!shouldUseMobileLayout.value) return false
    
    return componentName === 'RecordingSetsManager'
  }

  return {
    // State
    layoutState,
    activeTab,
    showSidebar,
    showModal,
    modalContent,
    
    // Computed
    shouldUseMobileLayout,
    
    // Tab navigation
    openTab,
    closeTab,
    
    // Sidebar methods
    toggleSidebar,
    closeSidebar,
    
    // Modal methods
    openModal,
    closeModal,
    
    // Component visibility helpers
    shouldShowComponent,
    shouldShowInModal,
    shouldShowInSidebar
  }
}