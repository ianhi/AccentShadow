import { mount } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import App from '../../src/App.vue';
import axe from 'axe-core';
import { describe, it, expect } from 'vitest';

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div></div>' } },
    { path: '/alignment-test', component: { template: '<div></div>' } },
    { path: '/mobile-demo', component: { template: '<div></div>' } },
  ],
});

describe('Accessibility Audit', () => {
  it('should have no accessibility violations on the main app page', async () => {
    const wrapper = mount(App, {
      attachTo: document.body,
      global: {
        plugins: [router],
      },
    });

    // Wait for the component to render completely
    await wrapper.vm.$nextTick();

    const results = await axe.run(wrapper.element);

    if (results.violations.length > 0) {
      console.log('Accessibility violations found:');
      console.log(results.violations);
    }

    expect(results.violations.length).toBe(0);
  });
});
