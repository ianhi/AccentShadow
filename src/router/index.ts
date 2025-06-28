import { createRouter, createWebHistory } from 'vue-router'
import PracticeView from '../views/PracticeView.vue'
import TestVADTrimming from '../views/TestVADTrimming.vue'
import MobileDemoIndex from '../views/MobileDemoIndex.vue'
import MobileTestA from '../views/MobileTestA.vue'
import MobileTestB from '../views/MobileTestB.vue'
import MobileTestC from '../views/MobileTestC.vue'
import MobileTestD from '../views/MobileTestD.vue'
import AudioAlignmentTest from '../views/AudioAlignmentTest.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'practice',
      component: PracticeView
    },
    {
      path: '/test-vad',
      name: 'test-vad',
      component: TestVADTrimming
    },
    {
      path: '/mobile-demo',
      name: 'mobile-demo',
      component: MobileDemoIndex
    },
    {
      path: '/mobile-test-a',
      name: 'mobile-test-a',
      component: MobileTestA
    },
    {
      path: '/mobile-test-b',
      name: 'mobile-test-b',
      component: MobileTestB
    },
    {
      path: '/mobile-test-c',
      name: 'mobile-test-c',
      component: MobileTestC
    },
    {
      path: '/mobile-test-d',
      name: 'mobile-test-d',
      component: MobileTestD
    },
    {
      path: '/alignment-test',
      name: 'alignment-test',
      component: AudioAlignmentTest
    }
  ]
})

export default router