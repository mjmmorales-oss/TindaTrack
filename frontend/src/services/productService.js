import apiImpl from './api/productService.js'
import mockImpl from './mock/productService.js'

const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock'
export const productService = isMock ? mockImpl : apiImpl
export default productService
