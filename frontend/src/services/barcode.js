import apiImpl from './api/barcodeService.js'
import mockImpl from './mock/barcodeService.js'

function getImpl() {
  return import.meta.env.MODE === 'test' || import.meta.env.VITE_DATA_SOURCE === 'mock'
    ? mockImpl
    : apiImpl
}

export const barcodeService = new Proxy({}, {
  get(_, prop) {
    const impl = getImpl()
    const val = impl[prop]
    return typeof val === 'function' ? val.bind(impl) : val
  },
})

export const lookupBarcode = (code) => barcodeService.lookupBarcode(code)

export default barcodeService
