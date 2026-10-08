import apiImpl from './api/reportService.js'
import mockImpl from './mock/reportService.js'

const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock'
export const reportService = isMock ? mockImpl : apiImpl
export default reportService
