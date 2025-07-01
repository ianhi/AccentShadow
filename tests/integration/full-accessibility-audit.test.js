import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import App from '../../src/App.vue';
import axe from 'axe-core';
import { describe, it, expect, beforeEach } from 'vitest';

// Import all the views
import PracticeView from '../../src/views/PracticeView.vue';
import TestVADTrimming from '../../src/views/TestVADTrimming.vue';
import MobileDemoIndex from '../../src/views/MobileDemoIndex.vue';
import AudioAlignmentTest from '../../src/views/AudioAlignmentTest.vue';

const routes = [
  { path: '/', name: 'practice', component: PracticeView },
  { path: '/test-vad', name: 'test-vad', component: TestVADTrimming },
  { path: '/mobile-demo', name: 'mobile-demo', component: MobileDemoIndex },
  { path: '/alignment-test', name: 'alignment-test', component: AudioAlignmentTest },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

describe('Full Accessibility Audit', () => {
  let wrapper;

  beforeEach(async () => {
    wrapper = mount(App, {
        attachTo: document.body,
        global: {
            plugins: [router],
        },
    });
    await router.isReady();
  });

  routes.forEach(route => {
    it(`should have no accessibility violations on ${route.name} view`, async () => {
      await router.push(route.path);
      // Wait for the component to render completely
      await wrapper.vm.$nextTick();

      const results = await axe.run(wrapper.element);

      if (results.violations.length > 0) {
        console.log(`Accessibility violations found on ${route.name}:`);
        console.log(JSON.stringify(results.violations, null, 2));
      }

      expect(results.violations.length).toBe(0);
    });
  });
});