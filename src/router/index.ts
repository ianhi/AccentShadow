import { createRouter, createWebHistory } from 'vue-router'
import PracticeView from '../views/PracticeView.vue'
import TestVADTrimming from '../views/TestVADTrimming.vue'
import MobileDemoIndex from '../views/MobileDemoIndex.vue'
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
      path: '/alignment-test',
      name: 'alignment-test',
      component: AudioAlignmentTest
    }
  ]
})

export default router