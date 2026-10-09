import apiImpl from './api/categoryService.js'
import mockImpl from './mock/categoryService.js'

function getImpl() {
  return import.meta.env.MODE === 'test' || import.meta.env.VITE_DATA_SOURCE === 'mock'
    ? mockImpl
    : apiImpl
}

export const categoryService = new Proxy({}, {
  get(_, prop) {
    const impl = getImpl()
    const val = impl[prop]
    return typeof val === 'function' ? val.bind(impl) : val
  },
})
export default categoryService
