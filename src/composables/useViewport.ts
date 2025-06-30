import { ref, onMounted, onUnmounted, computed } from 'vue'

export interface ViewportInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  width: number
  height: number
  orientation: 'portrait' | 'landscape'
}

export interface ViewportBreakpoints {
  mobile: number
  tablet: number
  desktop: number
}

const DEFAULT_BREAKPOINTS: ViewportBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200
}

export function useViewport(breakpoints: ViewportBreakpoints = DEFAULT_BREAKPOINTS) {
  const width = ref(0)
  const height = ref(0)

  const updateDimensions = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  const viewportInfo = computed<ViewportInfo>(() => {
    const w = width.value
    const h = height.value
    
    return {
      isMobile: w < breakpoints.mobile,
      isTablet: w >= breakpoints.mobile && w < breakpoints.tablet,
      isDesktop: w >= breakpoints.tablet,
      width: w,
      height: h,
      orientation: h > w ? 'portrait' : 'landscape'
    }
  })

  // Computed helpers for common use cases
  const isMobile = computed(() => viewportInfo.value.isMobile)
  const isTablet = computed(() => viewportInfo.value.isTablet)
  const isDesktop = computed(() => viewportInfo.value.isDesktop)
  const isPortrait = computed(() => viewportInfo.value.orientation === 'portrait')
  const isLandscape = computed(() => viewportInfo.value.orientation === 'landscape')

  // Mobile-specific checks
  const isMobilePortrait = computed(() => isMobile.value && isPortrait.value)
  const shouldUseMobileLayout = computed(() => isMobilePortrait.value)

  onMounted(() => {
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    window.addEventListener('orientationchange', updateDimensions)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateDimensions)
    window.removeEventListener('orientationchange', updateDimensions)
  })

  return {
    // Raw viewport info
    viewportInfo,
    width,
    height,
    
    // Device type checks
    isMobile,
    isTablet,
    isDesktop,
    
    // Orientation checks
    isPortrait,
    isLandscape,
    
    // Layout decision helpers
    isMobilePortrait,
    shouldUseMobileLayout,
    
    // Utility methods
    updateDimensions
  }
}