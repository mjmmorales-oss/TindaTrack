import apiImpl from './api/settingsService.js'
import mockImpl from './mock/settingsService.js'

const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock'
export const settingsService = isMock ? mockImpl : apiImpl
export default settingsService
