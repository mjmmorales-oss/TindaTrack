import apiImpl from './api/scannerService.js'
import mockImpl from './mock/scannerService.js'

function getImpl() {
  return import.meta.env.MODE === 'test' || import.meta.env.VITE_DATA_SOURCE === 'mock'
    ? mockImpl
    : apiImpl
}

export const scannerService = new Proxy({}, {
  get(_, prop) {
    const impl = getImpl()
    const val = impl[prop]
    return typeof val === 'function' ? val.bind(impl) : val
  },
})

export const createScannerSession = (data) => scannerService.createScannerSession(data)
export const getScannerSession = (id) => scannerService.getScannerSession(id)
export const listScannerEvents = (id, after) => scannerService.listScannerEvents(id, after)
export const endScannerSession = (id) => scannerService.endScannerSession(id)
export const getUnknownBarcodes = () => scannerService.getUnknownBarcodes()
export const pairScanner = (data) => scannerService.pairScanner(data)
export const sendScan = (data) => scannerService.sendScan(data)
export const scannerHeartbeat = () => scannerService.scannerHeartbeat()

export default scannerService
