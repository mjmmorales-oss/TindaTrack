import zxingWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import {
  BarcodeDetector as PonyfillBarcodeDetector,
  prepareZXingModule,
} from 'barcode-detector/ponyfill'

let modulePrepared = false

function ensureZXingModule() {
  if (modulePrepared) return
  try {
    prepareZXingModule({
      overrides: {
        locateFile: (path, prefix) => {
          if (path && path.endsWith('.wasm')) {
            return zxingWasmUrl
          }
          return prefix + path
        },
      },
    })
    modulePrepared = true
  } catch {
    // Already prepared or running in non-browser context
    modulePrepared = true
  }
}

export const SUPPORTED_BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'qr_code',
]

/**
 * Creates a BarcodeDetector instance preferring the native window.BarcodeDetector
 * when available and supporting ean_13, falling back to the ZXing WebAssembly ponyfill.
 *
 * @param {string[]} [formats=SUPPORTED_BARCODE_FORMATS]
 * @returns {Promise<any>}
 */
export async function createBarcodeDetector(formats = SUPPORTED_BARCODE_FORMATS) {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats()
      if (Array.isArray(supported) && supported.includes('ean_13')) {
        const matched = formats.filter((f) => supported.includes(f))
        return new window.BarcodeDetector({
          formats: matched.length > 0 ? matched : supported,
        })
      }
    } catch {
      // Fallback to ponyfill if native detector throws
    }
  }

  ensureZXingModule()
  return new PonyfillBarcodeDetector({ formats })
}
