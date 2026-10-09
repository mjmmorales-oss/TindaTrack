import apiImpl from './api/customerService.js'
import mockImpl from './mock/customerService.js'

function getImpl() {
  return import.meta.env.MODE === 'test' || import.meta.env.VITE_DATA_SOURCE === 'mock'
    ? mockImpl
    : apiImpl
}

export const customerService = new Proxy({}, {
  get(_, prop) {
    const impl = getImpl()
    const val = impl[prop]
    return typeof val === 'function' ? val.bind(impl) : val
  },
})
export default customerService
