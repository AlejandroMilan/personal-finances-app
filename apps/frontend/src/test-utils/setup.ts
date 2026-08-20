import { vi } from 'vitest';

// jsdom no implementa estas APIs y Vuetify las usa al montar overlays y layouts.
global.ResizeObserver = class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'visualViewport', {
  writable: true,
  value: {
    width: 1024,
    height: 768,
    scale: 1,
    offsetLeft: 0,
    offsetTop: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

global.CSS = { supports: () => false } as unknown as typeof CSS;
