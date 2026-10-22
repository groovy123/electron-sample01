/**
 * Vitest 実行前のグローバルセットアップ。
 * Vuetify コンポーネントが依存する ResizeObserver / matchMedia を jsdom 用にスタブする。
 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}

if (typeof window.matchMedia === 'undefined') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    }) as unknown as MediaQueryList
}

// v-menu などのオーバーレイが参照する visualViewport を jsdom 用にスタブする
if (typeof window.visualViewport === 'undefined' || window.visualViewport === null) {
  Object.defineProperty(window, 'visualViewport', {
    value: {
      width: 1024,
      height: 768,
      offsetLeft: 0,
      offsetTop: 0,
      scale: 1,
      addEventListener: () => {},
      removeEventListener: () => {}
    },
    configurable: true
  })
}
