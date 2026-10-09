import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Ensure mock data source for tests
import.meta.env.VITE_DATA_SOURCE = 'mock'

// localStorage & sessionStorage stub
const createStorageMock = () => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((i) => Object.keys(store)[i] ?? null),
  }
}

const storageMock = createStorageMock()
Object.defineProperty(window, 'localStorage', {
  value: storageMock,
  writable: true,
})
Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
})
Object.defineProperty(window, 'sessionStorage', {
  value: createStorageMock(),
  writable: true,
})
Object.defineProperty(globalThis, 'sessionStorage', {
  value: createStorageMock(),
  writable: true,
})

// matchMedia stub
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ResizeObserver stub
window.ResizeObserver = globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// IntersectionObserver stub
window.IntersectionObserver = globalThis.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// scrollIntoView stub
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// window.print stub
window.print = vi.fn()

// Mock navigator.clipboard
if (!navigator.clipboard) {
  navigator.clipboard = {
    writeText: vi.fn().mockResolvedValue(),
  }
}
