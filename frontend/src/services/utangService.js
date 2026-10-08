import apiImpl from './api/utangService.js'
import mockImpl from './mock/utangService.js'

const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock'
export const utangService = isMock ? mockImpl : apiImpl
export default utangService
