import apiImpl from './api/categoryService.js'
import mockImpl from './mock/categoryService.js'

const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock'
export const categoryService = isMock ? mockImpl : apiImpl
export default categoryService
