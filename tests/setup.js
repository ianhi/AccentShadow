/**
 * Test setup file for Vitest
 * Configures global mocks and utilities needed for testing
 */

import { vi } from 'vitest';

// Mock IndexedDB
const mockIDBRequest = {
  onsuccess: null,
  onerror: null,
  result: null,
  readyState: 'done'
};

const mockIDBObjectStore = {
  add: vi.fn(() => mockIDBRequest),
  get: vi.fn(() => mockIDBRequest),
  put: vi.fn(() => mockIDBRequest),
  delete: vi.fn(() => mockIDBRequest),
  getAll: vi.fn(() => mockIDBRequest),
  createIndex: vi.fn(),
  index: vi.fn(() => mockIDBObjectStore)
};

const mockIDBTransaction = {
  objectStore: vi.fn(() => mockIDBObjectStore),
  oncomplete: null,
  onerror: null,
  abort: vi.fn()
};

const mockIDBDatabase = {
  transaction: vi.fn(() => mockIDBTransaction),
  createObjectStore: vi.fn(() => mockIDBObjectStore),
  close: vi.fn(),
  version: 1
};

const mockIDBOpenRequest = {
  ...mockIDBRequest,
  onupgradeneeded: null,
  onblocked: null,
  result: mockIDBDatabase
};

global.indexedDB = {
  open: vi.fn(() => mockIDBOpenRequest),
  deleteDatabase: vi.fn(() => mockIDBRequest)
};

// Mock Web Audio API
const mockAudioBuffer = {
  numberOfChannels: 1,
  sampleRate: 44100,
  length: 44100,
  duration: 1.0,
  getChannelData: vi.fn(() => new Float32Array(44100))
};

const mockAudioContext = {
  createBuffer: vi.fn(() => mockAudioBuffer),
  decodeAudioData: vi.fn(() => Promise.resolve(mockAudioBuffer)),
  createBufferSource: vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 }
  })),
  destination: {},
  close: vi.fn(),
  resume: vi.fn(() => Promise.resolve()),
  suspend: vi.fn(() => Promise.resolve()),
  state: 'running'
};

global.AudioContext = vi.fn(() => mockAudioContext);
global.webkitAudioContext = global.AudioContext;

// Mock OfflineAudioContext
global.OfflineAudioContext = vi.fn(() => ({
  ...mockAudioContext,
  startRendering: vi.fn(() => Promise.resolve(mockAudioBuffer))
}));

// Mock Blob and URL
global.Blob = vi.fn((content, options) => ({
  size: content?.[0]?.length || 1000,
  type: options?.type || 'application/octet-stream',
  arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(1000))),
  slice: vi.fn()
}));

global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url-' + Date.now()),
  revokeObjectURL: vi.fn()
};

// Mock fetch
global.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(1000)),
  blob: () => Promise.resolve(new Blob(['test']))
}));

// Mock MediaDevices
global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getUserMedia: vi.fn(() => Promise.resolve({
      getTracks: () => [{
        stop: vi.fn(),
        kind: 'audio',
        enabled: true
      }]
    })),
    enumerateDevices: vi.fn(() => Promise.resolve([
      {
        kind: 'audioinput',
        deviceId: 'default',
        label: 'Default Microphone',
        groupId: 'group1'
      }
    ])),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
};

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  state: 'inactive',
  ondataavailable: null,
  onstop: null,
  onerror: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};
global.localStorage = localStorageMock;

// Mock window properties
Object.defineProperty(window, 'isSecureContext', {
  writable: true,
  value: true
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Suppress console warnings in tests unless explicitly testing them
const originalConsoleWarn = console.warn;
console.warn = vi.fn((message, ...args) => {
  if (typeof message === 'string' && (
    message.includes('[Vue warn]') ||
    message.includes('WaveSurfer') ||
    message.includes('VAD')
  )) {
    return; // Suppress known warnings
  }
  originalConsoleWarn(message, ...args);
});

// Mock common browser APIs that might be missing in jsdom
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Set up default window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Add global test utilities
global.testUtils = {
  mockAudioBuffer,
  mockAudioContext,
  createMockBlob: (content = 'test', type = 'audio/webm') => 
    new Blob([content], { type }),
  
  createMockStream: () => ({
    getTracks: () => [{
      stop: vi.fn(),
      kind: 'audio',
      enabled: true
    }]
  }),

  flushPromises: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  waitFor: (condition, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }
};