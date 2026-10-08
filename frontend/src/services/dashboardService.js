import apiImpl from './api/dashboardService.js'
import mockImpl from './mock/dashboardService.js'

const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock'
export const dashboardService = isMock ? mockImpl : apiImpl
export default dashboardService
