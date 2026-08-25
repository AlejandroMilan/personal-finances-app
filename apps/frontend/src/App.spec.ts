import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { mountOptions } from './test-utils/vuetify';
import router from './router';
import App from './App.vue';

const mountAuthenticatedApp = () =>
  mount(App, {
    ...mountOptions,
    global: {
      ...mountOptions.global,
      plugins: [mountOptions.global.plugins?.[0], router],
      stubs: { RouterView: true },
    },
  });

describe('App navigation', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    localStorage.clear();
    localStorage.setItem('auth-token', 'token');
    localStorage.setItem(
      'auth-user',
      JSON.stringify({ id: 'u1', fullName: 'Ada Lovelace', email: 'ada@example.com' }),
    );
    document.body.innerHTML = '';
    await router.push('/home');
  });

  it('shows the protected Budgets destination in the authenticated navigation', () => {
    const wrapper = mountAuthenticatedApp();
    const budgetLink = wrapper.find('a[href="/budgets"]');

    expect(budgetLink.exists()).toBe(true);
    expect(budgetLink.text()).toContain('Budgets');
  });

  it('navigates to the dedicated budgets page from the navigation item', async () => {
    const wrapper = mountAuthenticatedApp();
    const budgetLink = wrapper.find('a[href="/budgets"]');

    expect(budgetLink.attributes('href')).toBe('/budgets');
    await router.push(budgetLink.attributes('href') as string);
    await flushPromises();

    expect(router.currentRoute.value.name).toBe('budgets');
  });
});
