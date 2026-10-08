import apiImpl from './api/customerService.js'
import mockImpl from './mock/customerService.js'

const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock'
export const customerService = isMock ? mockImpl : apiImpl
export default customerService
