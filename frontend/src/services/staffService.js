import apiImpl from './api/staffService.js'
import mockImpl from './mock/staffService.js'

const isMock = import.meta.env.VITE_DATA_SOURCE === 'mock'
export const staffService = isMock ? mockImpl : apiImpl
export default staffService
